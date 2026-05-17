import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  ADMIN_ESCROW_COOKIE_NAME,
  verifyAdminEscrowToken,
} from "@/lib/adminEscrowGate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SupportRoleValue = "USER" | "MODERATOR" | "ADMIN";
type EscrowBucket =
  | "disputed"
  | "refund_requested"
  | "nft_returned"
  | "released"
  | "refunded";

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function getBootstrapAdminWallets() {
  return (
    process.env.ADMIN_CREATE_WALLETS ||
    process.env.ADMIN_WALLETS ||
    process.env.NEXT_PUBLIC_ADMIN_CREATE_WALLETS ||
    process.env.NEXT_PUBLIC_ADMIN_WALLETS ||
    ""
  )
    .split(",")
    .map((x) => normAddr(x))
    .filter(Boolean);
}

async function getActor() {
  const session = await getServerSession(authOptions);

  const userId =
    (session as any)?.user?.id ||
    (session as any)?.userId ||
    null;

  const walletAddress = normAddr(
    (session as any)?.user?.walletAddress ||
      (session as any)?.walletAddress ||
      ""
  );

  return { userId, walletAddress };
}

async function getActorSupportRole(actor: {
  userId: string | null;
  walletAddress: string;
}): Promise<SupportRoleValue | null> {
  if (actor.userId) {
    const user = await prisma.user.findUnique({
      where: { id: actor.userId },
      select: { supportRole: true },
    });
    return (user?.supportRole as SupportRoleValue | undefined) || null;
  }

  if (actor.walletAddress) {
    const user = await prisma.user.findFirst({
      where: {
        walletAddress: {
          equals: actor.walletAddress,
          mode: "insensitive",
        },
      },
      select: { supportRole: true },
    });
    return (user?.supportRole as SupportRoleValue | undefined) || null;
  }

  return null;
}

async function getEscrowPanelRole(actor: {
  userId: string | null;
  walletAddress: string;
}): Promise<"MODERATOR" | "ADMIN" | null> {
  if (
    actor.walletAddress &&
    getBootstrapAdminWallets().includes(actor.walletAddress)
  ) {
    return "ADMIN";
  }

  const actorRole = await getActorSupportRole(actor);
  if (actorRole === "ADMIN") return "ADMIN";
  if (actorRole === "MODERATOR") return "MODERATOR";
  return null;
}

function tokenMatchesActor(
  token: {
    sub: string | null;
    wallet: string | null;
    role: "MODERATOR" | "ADMIN";
    exp: number;
  } | null,
  actor: { userId: string | null; walletAddress: string }
) {
  if (!token) return false;

  if (token.sub && actor.userId && token.sub === actor.userId) return true;
  if (
    token.wallet &&
    actor.walletAddress &&
    token.wallet === actor.walletAddress
  ) {
    return true;
  }

  return false;
}

function parseBucket(v?: string | null): EscrowBucket {
  const s = String(v || "").trim().toLowerCase();
  if (
    s === "disputed" ||
    s === "refund_requested" ||
    s === "nft_returned" ||
    s === "released" ||
    s === "refunded"
  ) {
    return s;
  }
  return "disputed";
}

function protectedScopeWhere() {
  return {
    OR: [
      { marketType: "PROTECTED" },
      { marketType: "DELIVERY" },
      {
        sourceType: "MARKETPLACE",
        marketplacePurchaseId: { not: null },
      },
    ],
  };
}

function whereForBucket(bucket: EscrowBucket) {
  if (bucket === "disputed") {
    return {
      OR: [
        { escrowStatus: "DISPUTED" },
        { deliveryStatus: "RETURN_REQUESTED" },
      ],
    };
  }

  if (bucket === "refund_requested") {
    return {
      refundRequestedAt: { not: null },
      escrowStatus: {
        notIn: ["REFUNDED", "RELEASED", "CANCELLED"],
      },
    };
  }

  if (bucket === "nft_returned") {
    return {
      nftReturnedAt: { not: null },
      escrowStatus: {
        notIn: ["REFUNDED", "RELEASED", "CANCELLED"],
      },
    };
  }

  if (bucket === "released") {
    return {
      OR: [{ escrowStatus: "RELEASED" }, { releasedAt: { not: null } }],
    };
  }

  return {
    OR: [{ escrowStatus: "REFUNDED" }, { refundedAt: { not: null } }],
  };
}

function orderByForBucket(bucket: EscrowBucket) {
  if (bucket === "refund_requested") {
    return [{ refundRequestedAt: "desc" as const }, { updatedAt: "desc" as const }];
  }

  if (bucket === "nft_returned") {
    return [{ nftReturnedAt: "desc" as const }, { updatedAt: "desc" as const }];
  }

  if (bucket === "released") {
    return [{ releasedAt: "desc" as const }, { updatedAt: "desc" as const }];
  }

  if (bucket === "refunded") {
    return [{ refundedAt: "desc" as const }, { updatedAt: "desc" as const }];
  }

  return [{ disputedAt: "desc" as const }, { updatedAt: "desc" as const }];
}

function serializeOrder(row: any) {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    chainId: row.chainId,
    contract: row.contract,
    tokenId: row.tokenId,
    vertical: row.vertical,
    sourceType: row.sourceType || null,
    orderKind: row.orderKind || null,
    marketType: row.marketType || null,
    marketplaceContract: row.marketplaceContract || null,
    marketplaceListingId:
      row.marketplaceListingId != null ? String(row.marketplaceListingId) : null,
    marketplacePurchaseId:
      row.marketplacePurchaseId != null ? String(row.marketplacePurchaseId) : null,
    buyerWallet: row.buyerWallet,
    sellerWallet: row.sellerWallet,
    buyer: row.buyer
      ? {
          id: row.buyer.id,
          handle: row.buyer.handle || null,
          publicId: row.buyer.publicId || null,
        }
      : null,
    seller: row.seller
      ? {
          id: row.seller.id,
          handle: row.seller.handle || null,
          publicId: row.seller.publicId || null,
        }
      : null,
    amount: String(row.amount),
    unitPrice: String(row.unitPrice),
    totalPrice: String(row.totalPrice),
    paymentToken: row.paymentToken || null,
    fulfillmentType: row.fulfillmentType || null,
    category: row.category || null,
    subcategory: row.subcategory || null,
    escrowStatus: row.escrowStatus,
    deliveryStatus: row.deliveryStatus,
    serviceStatus: row.serviceStatus,

    // Protected quantity NFT lock state for admin escrow visibility.
    protectedNftLockStatus: row.protectedNftLockStatus || null,
    protectedNftPendingAmount:
      row.protectedNftPendingAmount != null ? String(row.protectedNftPendingAmount) : "0",
    protectedNftCompletedAmount:
      row.protectedNftCompletedAmount != null ? String(row.protectedNftCompletedAmount) : "0",
    protectedNftLockedAt: row.protectedNftLockedAt
      ? row.protectedNftLockedAt.toISOString()
      : null,
    protectedNftCompletedAt: row.protectedNftCompletedAt
      ? row.protectedNftCompletedAt.toISOString()
      : null,
    protectedNftUnlockedAt: row.protectedNftUnlockedAt
      ? row.protectedNftUnlockedAt.toISOString()
      : null,

    shippedAt: row.shippedAt ? row.shippedAt.toISOString() : null,
    deliveredAt: row.deliveredAt ? row.deliveredAt.toISOString() : null,
    confirmedAt: row.confirmedAt ? row.confirmedAt.toISOString() : null,
    releasedAt: row.releasedAt ? row.releasedAt.toISOString() : null,
    refundedAt: row.refundedAt ? row.refundedAt.toISOString() : null,
    disputedAt: row.disputedAt ? row.disputedAt.toISOString() : null,
    buyerConfirmedAt: row.buyerConfirmedAt
      ? row.buyerConfirmedAt.toISOString()
      : null,
    refundRequestedAt: row.refundRequestedAt
      ? row.refundRequestedAt.toISOString()
      : null,
    nftReturnedAt: row.nftReturnedAt ? row.nftReturnedAt.toISOString() : null,
    refundRejectedAt: row.refundRejectedAt
      ? row.refundRejectedAt.toISOString()
      : null,
    submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    trackingCode: row.trackingCode || null,
    trackingUrl: row.trackingUrl || null,
    carrier: row.carrier || null,
    buyTxHash: row.buyTxHash || null,
    escrowReleaseTxHash: row.escrowReleaseTxHash || null,
    escrowRefundTxHash: row.escrowRefundTxHash || null,
    noteBuyer: row.noteBuyer || null,
    noteSeller: row.noteSeller || null,
    adminNote: row.adminNote || null,
  };
}

function baseSelect() {
  return {
    id: true,
    createdAt: true,
    updatedAt: true,
    chainId: true,
    contract: true,
    tokenId: true,
    vertical: true,
    sourceType: true,
    orderKind: true,
    marketType: true,
    marketplaceContract: true,
    marketplaceListingId: true,
    marketplacePurchaseId: true,
    buyerWallet: true,
    sellerWallet: true,
    buyer: {
      select: {
        id: true,
        handle: true,
        publicId: true,
      },
    },
    seller: {
      select: {
        id: true,
        handle: true,
        publicId: true,
      },
    },
    amount: true,
    unitPrice: true,
    totalPrice: true,
    paymentToken: true,
    fulfillmentType: true,
    category: true,
    subcategory: true,
    escrowStatus: true,
    deliveryStatus: true,
    serviceStatus: true,
    protectedNftLockStatus: true,
    protectedNftPendingAmount: true,
    protectedNftCompletedAmount: true,
    protectedNftLockedAt: true,
    protectedNftCompletedAt: true,
    protectedNftUnlockedAt: true,
    shippedAt: true,
    deliveredAt: true,
    confirmedAt: true,
    releasedAt: true,
    refundedAt: true,
    disputedAt: true,
    buyerConfirmedAt: true,
    refundRequestedAt: true,
    nftReturnedAt: true,
    refundRejectedAt: true,
    submittedAt: true,
    completedAt: true,
    trackingCode: true,
    trackingUrl: true,
    carrier: true,
    buyTxHash: true,
    escrowReleaseTxHash: true,
    escrowRefundTxHash: true,
    noteBuyer: true,
    noteSeller: true,
    adminNote: true,
  };
}

export async function GET(req: Request) {
  try {
    const actor = await getActor();

    if (!actor.userId && !actor.walletAddress) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const role = await getEscrowPanelRole(actor);
    if (!role) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const cookieHeader = req.headers.get("cookie") || "";
    const rawToken = cookieHeader
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith(`${ADMIN_ESCROW_COOKIE_NAME}=`))
      ?.slice(`${ADMIN_ESCROW_COOKIE_NAME}=`.length);

    const token = verifyAdminEscrowToken(rawToken || null);

    if (!tokenMatchesActor(token, actor)) {
      return NextResponse.json(
        { ok: false, error: "ADMIN_ESCROW_GATE_LOCKED" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const bucket = parseBucket(url.searchParams.get("bucket"));
    const takeRaw = Number(url.searchParams.get("take") || "24");
    const take =
      Number.isFinite(takeRaw) && takeRaw > 0
        ? Math.max(1, Math.min(100, Math.floor(takeRaw)))
        : 24;

    const scope = protectedScopeWhere();

    const [items, disputedCount, refundRequestedCount, nftReturnedCount, releasedCount, refundedCount] =
      await prisma.$transaction([
        prisma.storeOrder.findMany({
          where: {
            AND: [scope as any, whereForBucket(bucket) as any],
          },
          orderBy: orderByForBucket(bucket),
          take,
          select: baseSelect() as any,
        }),
        prisma.storeOrder.count({
          where: {
            AND: [scope as any, whereForBucket("disputed") as any],
          },
        }),
        prisma.storeOrder.count({
          where: {
            AND: [scope as any, whereForBucket("refund_requested") as any],
          },
        }),
        prisma.storeOrder.count({
          where: {
            AND: [scope as any, whereForBucket("nft_returned") as any],
          },
        }),
        prisma.storeOrder.count({
          where: {
            AND: [scope as any, whereForBucket("released") as any],
          },
        }),
        prisma.storeOrder.count({
          where: {
            AND: [scope as any, whereForBucket("refunded") as any],
          },
        }),
      ]);

    return NextResponse.json({
      ok: true,
      role,
      bucket,
      summary: {
        disputed: disputedCount,
        refund_requested: refundRequestedCount,
        nft_returned: nftReturnedCount,
        released: releasedCount,
        refunded: refundedCount,
      },
      items: items.map(serializeOrder),
    });
  } catch (e) {
    console.error("[API_ADMIN_PROTECTED_ESCROW_ORDERS_GET_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}
