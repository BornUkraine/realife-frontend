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
  | "open"
  | "disputed"
  | "refund_requested"
  | "nft_returned"
  | "released"
  | "refunded"
  | "all";

type OrderScope = "protected" | "all";

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function clean(v?: string | null, max = 200) {
  return String(v || "").trim().slice(0, max);
}

function getEnvWallets(...names: string[]) {
  return names
    .flatMap((name) => String(process.env[name] || "").split(","))
    .map((x) => normAddr(x))
    .filter(Boolean);
}

function getBootstrapAdminWallets() {
  return getEnvWallets(
    "ADMIN_CREATE_WALLETS",
    "ADMIN_WALLETS",
    "NEXT_PUBLIC_ADMIN_CREATE_WALLETS",
    "NEXT_PUBLIC_ADMIN_WALLETS"
  );
}

function getBootstrapModeratorWallets() {
  return getEnvWallets("MODERATOR_WALLETS", "ADMIN_MODERATOR_WALLETS");
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

  if (
    actor.walletAddress &&
    getBootstrapModeratorWallets().includes(actor.walletAddress)
  ) {
    return "MODERATOR";
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
    s === "open" ||
    s === "disputed" ||
    s === "refund_requested" ||
    s === "nft_returned" ||
    s === "released" ||
    s === "refunded" ||
    s === "all"
  ) {
    return s;
  }
  return "open";
}

function parseScope(v?: string | null): OrderScope {
  const s = String(v || "").trim().toLowerCase();
  return s === "all" ? "all" : "protected";
}

function scopeWhere(scope: OrderScope) {
  if (scope === "all") return {};

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
  if (bucket === "all") return {};

  if (bucket === "open") {
    return {
      AND: [
        {
          escrowStatus: {
            notIn: ["RELEASED", "REFUNDED", "CANCELLED", "NOT_REQUIRED"],
          },
        },
        {
          OR: [
            { escrowStatus: { in: ["PENDING", "FUNDED", "DISPUTED"] } },
            {
              deliveryStatus: {
                in: [
                  "PENDING",
                  "READY_TO_SHIP",
                  "SHIPPED",
                  "DELIVERED",
                  "RETURN_REQUESTED",
                  "RETURNED",
                ],
              },
            },
            {
              serviceStatus: {
                in: [
                  "PENDING",
                  "IN_PROGRESS",
                  "SUBMITTED",
                  "REVISION_REQUESTED",
                  "COMPLETED",
                ],
              },
            },
            { refundRequestedAt: { not: null } },
            { nftReturnedAt: { not: null } },
          ],
        },
      ],
    };
  }

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

  if (bucket === "disputed") {
    return [{ disputedAt: "desc" as const }, { updatedAt: "desc" as const }];
  }

  return [{ updatedAt: "desc" as const }, { createdAt: "desc" as const }];
}

function iso(v?: Date | null) {
  return v ? v.toISOString() : null;
}

function serializeBigInt(v: unknown) {
  return v != null ? String(v) : null;
}

function serializeMessage(row: any) {
  return {
    id: row.id,
    senderUserId: row.senderUserId || null,
    senderWallet: row.senderWallet || null,
    senderRole: row.senderRole,
    body: row.body,
    isInternal: Boolean(row.isInternal),
    createdAt: iso(row.createdAt),
  };
}

function serializeOrder(row: any, mintMap: Map<string, any>, listingMap: Map<string, any>) {
  const key = `${row.chainId}:${normAddr(row.contract)}:${String(row.tokenId)}`;
  const mint = mintMap.get(key) || null;
  const listing = row.listingId ? listingMap.get(row.listingId) || null : null;

  return {
    id: row.id,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),

    chainId: row.chainId,
    contract: row.contract,
    tokenId: row.tokenId,

    vertical: row.vertical,
    sourceType: row.sourceType || null,
    orderKind: row.orderKind || null,
    marketType: row.marketType || null,
    marketplaceContract: row.marketplaceContract || null,
    marketplaceListingId: serializeBigInt(row.marketplaceListingId),
    marketplacePurchaseId: serializeBigInt(row.marketplacePurchaseId),
    listingId: row.listingId || null,
    tradeId: row.tradeId || null,

    buyerWallet: row.buyerWallet,
    sellerWallet: row.sellerWallet,
    buyer: row.buyer
      ? {
          id: row.buyer.id,
          handle: row.buyer.handle || null,
          publicId: row.buyer.publicId || null,
          walletAddress: row.buyer.walletAddress || null,
        }
      : null,
    seller: row.seller
      ? {
          id: row.seller.id,
          handle: row.seller.handle || null,
          publicId: row.seller.publicId || null,
          walletAddress: row.seller.walletAddress || null,
        }
      : null,

    amount: String(row.amount),
    unitPrice: String(row.unitPrice),
    totalPrice: String(row.totalPrice),
    paymentToken: row.paymentToken || null,

    deliveryRequired: Boolean(row.deliveryRequired),
    physicalItem: Boolean(row.physicalItem),
    officialItem: Boolean(row.officialItem),
    fulfillmentType: row.fulfillmentType || null,
    category: row.category || null,
    subcategory: row.subcategory || null,
    serviceCountry: row.serviceCountry || null,
    serviceCity: row.serviceCity || null,
    serviceArea: row.serviceArea || null,

    escrowStatus: row.escrowStatus,
    deliveryStatus: row.deliveryStatus,
    serviceStatus: row.serviceStatus,

    // Protected quantity NFT lock state for admin escrow visibility.
    protectedNftLockStatus: row.protectedNftLockStatus || null,
    protectedNftPendingAmount: serializeBigInt(row.protectedNftPendingAmount) || "0",
    protectedNftCompletedAmount: serializeBigInt(row.protectedNftCompletedAmount) || "0",
    protectedNftLockedAt: iso(row.protectedNftLockedAt),
    protectedNftCompletedAt: iso(row.protectedNftCompletedAt),
    protectedNftUnlockedAt: iso(row.protectedNftUnlockedAt),

    escrowFundedAt: iso(row.escrowFundedAt),
    shippedAt: iso(row.shippedAt),
    deliveredAt: iso(row.deliveredAt),
    confirmedAt: iso(row.confirmedAt),
    releasedAt: iso(row.releasedAt),
    refundedAt: iso(row.refundedAt),
    disputedAt: iso(row.disputedAt),
    cancelledAt: iso(row.cancelledAt),
    buyerConfirmedAt: iso(row.buyerConfirmedAt),
    refundRequestedAt: iso(row.refundRequestedAt),
    nftReturnedAt: iso(row.nftReturnedAt),
    refundRejectedAt: iso(row.refundRejectedAt),
    scheduledFor: iso(row.scheduledFor),
    workStartedAt: iso(row.workStartedAt),
    submittedAt: iso(row.submittedAt),
    revisionRequestedAt: iso(row.revisionRequestedAt),
    completedAt: iso(row.completedAt),

    shippingName: row.shippingName || null,
    shippingPhone: row.shippingPhone || null,
    shippingCountry: row.shippingCountry || null,
    shippingCity: row.shippingCity || null,
    shippingAddress: row.shippingAddress || null,
    shippingZip: row.shippingZip || null,
    trackingCode: row.trackingCode || null,
    trackingUrl: row.trackingUrl || null,
    carrier: row.carrier || null,

    buyTxHash: row.buyTxHash || null,
    escrowReleaseTxHash: row.escrowReleaseTxHash || null,
    escrowRefundTxHash: row.escrowRefundTxHash || null,

    noteBuyer: row.noteBuyer || null,
    noteSeller: row.noteSeller || null,
    adminNote: row.adminNote || null,

    messageCount: row._count?.deliveryMessages || 0,
    latestMessages: (row.deliveryMessages || []).slice().reverse().map(serializeMessage),

    nft: mint
      ? {
          id: mint.id,
          name: mint.name || mint.metaItem || null,
          image: mint.metaImage || mint.image || null,
          animation: mint.metaAnimation || null,
          mediaKind: mint.metaMediaKind || null,
          description: mint.metaDescription || null,
          verified: Boolean(mint.verified),
          category: mint.category || null,
          subcategory: mint.subcategory || null,
          fulfillmentType: mint.fulfillmentType || null,
          serviceCountry: mint.serviceCountry || null,
          serviceCity: mint.serviceCity || null,
          serviceArea: mint.serviceArea || null,
        }
      : null,

    listing: listing
      ? {
          id: listing.id,
          status: listing.status,
          amountRemaining: String(listing.amountRemaining),
          pricePerUnitWei: String(listing.pricePerUnitWei),
          createdAt: iso(listing.createdAt),
          cancelledAt: iso(listing.cancelledAt),
        }
      : null,
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
    listingId: true,
    tradeId: true,

    buyerWallet: true,
    sellerWallet: true,
    buyer: {
      select: {
        id: true,
        handle: true,
        publicId: true,
        walletAddress: true,
      },
    },
    seller: {
      select: {
        id: true,
        handle: true,
        publicId: true,
        walletAddress: true,
      },
    },

    amount: true,
    unitPrice: true,
    totalPrice: true,
    paymentToken: true,

    deliveryRequired: true,
    physicalItem: true,
    officialItem: true,
    fulfillmentType: true,
    category: true,
    subcategory: true,
    serviceCountry: true,
    serviceCity: true,
    serviceArea: true,

    escrowStatus: true,
    deliveryStatus: true,
    serviceStatus: true,
    protectedNftLockStatus: true,
    protectedNftPendingAmount: true,
    protectedNftCompletedAmount: true,
    protectedNftLockedAt: true,
    protectedNftCompletedAt: true,
    protectedNftUnlockedAt: true,
    escrowFundedAt: true,
    shippedAt: true,
    deliveredAt: true,
    confirmedAt: true,
    releasedAt: true,
    refundedAt: true,
    disputedAt: true,
    cancelledAt: true,
    buyerConfirmedAt: true,
    refundRequestedAt: true,
    nftReturnedAt: true,
    refundRejectedAt: true,
    scheduledFor: true,
    workStartedAt: true,
    submittedAt: true,
    revisionRequestedAt: true,
    completedAt: true,

    shippingName: true,
    shippingPhone: true,
    shippingCountry: true,
    shippingCity: true,
    shippingAddress: true,
    shippingZip: true,
    trackingCode: true,
    trackingUrl: true,
    carrier: true,

    buyTxHash: true,
    escrowReleaseTxHash: true,
    escrowRefundTxHash: true,
    noteBuyer: true,
    noteSeller: true,
    adminNote: true,

    _count: {
      select: {
        deliveryMessages: true,
      },
    },
    deliveryMessages: {
      orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }],
      take: 3,
      select: {
        id: true,
        senderUserId: true,
        senderWallet: true,
        senderRole: true,
        body: true,
        isInternal: true,
        createdAt: true,
      },
    },
  };
}

function searchWhere(q: string) {
  if (!q) return {};

  const maybeNumber = /^\d+$/.test(q) ? BigInt(q) : null;
  const or: any[] = [
    { id: { contains: q, mode: "insensitive" } },
    { contract: { contains: q, mode: "insensitive" } },
    { tokenId: { contains: q, mode: "insensitive" } },
    { buyerWallet: { contains: q, mode: "insensitive" } },
    { sellerWallet: { contains: q, mode: "insensitive" } },
    { buyTxHash: { contains: q, mode: "insensitive" } },
    { escrowReleaseTxHash: { contains: q, mode: "insensitive" } },
    { escrowRefundTxHash: { contains: q, mode: "insensitive" } },
    { category: { contains: q, mode: "insensitive" } },
    { subcategory: { contains: q, mode: "insensitive" } },
    { serviceCountry: { contains: q, mode: "insensitive" } },
    { serviceCity: { contains: q, mode: "insensitive" } },
  ];

  if (maybeNumber != null) {
    or.push({ marketplaceListingId: maybeNumber });
    or.push({ marketplacePurchaseId: maybeNumber });
  }

  return { OR: or };
}

async function loadMintMap(rows: any[]) {
  const keys = rows.map((x) => ({
    chainId: x.chainId,
    contract: normAddr(x.contract),
    tokenId: String(x.tokenId),
  }));

  if (!keys.length) return new Map<string, any>();

  const mints = await prisma.mint.findMany({
    where: {
      OR: keys.map((x) => ({
        chainId: x.chainId,
        contract: { equals: x.contract, mode: "insensitive" },
        tokenId: x.tokenId,
      })),
    },
    select: {
      id: true,
      chainId: true,
      contract: true,
      tokenId: true,
      name: true,
      image: true,
      verified: true,
      fulfillmentType: true,
      category: true,
      subcategory: true,
      serviceCountry: true,
      serviceCity: true,
      serviceArea: true,
      metaImage: true,
      metaAnimation: true,
      metaMediaKind: true,
      metaDescription: true,
      metaItem: true,
    },
  });

  return new Map(
    mints.map((x) => [
      `${x.chainId}:${normAddr(x.contract)}:${String(x.tokenId)}`,
      x,
    ])
  );
}

async function loadListingMap(rows: any[]) {
  const ids = rows.map((x) => x.listingId).filter(Boolean);
  if (!ids.length) return new Map<string, any>();

  const listings = await prisma.listing.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      createdAt: true,
      status: true,
      cancelledAt: true,
      pricePerUnitWei: true,
      amountRemaining: true,
    },
  });

  return new Map(listings.map((x) => [x.id, x]));
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
    const scope = parseScope(url.searchParams.get("scope"));
    const q = clean(url.searchParams.get("q"), 160);

    const takeRaw = Number(url.searchParams.get("take") || "24");
    const take =
      Number.isFinite(takeRaw) && takeRaw > 0
        ? Math.max(1, Math.min(100, Math.floor(takeRaw)))
        : 24;

    const baseWhere = scopeWhere(scope);
    const currentWhere = {
      AND: [baseWhere as any, whereForBucket(bucket) as any, searchWhere(q) as any],
    };

    const [
      items,
      openCount,
      disputedCount,
      refundRequestedCount,
      nftReturnedCount,
      releasedCount,
      refundedCount,
      allCount,
    ] = await prisma.$transaction([
      prisma.storeOrder.findMany({
        where: currentWhere as any,
        orderBy: orderByForBucket(bucket),
        take,
        select: baseSelect() as any,
      }),
      prisma.storeOrder.count({
        where: { AND: [baseWhere as any, whereForBucket("open") as any] },
      }),
      prisma.storeOrder.count({
        where: { AND: [baseWhere as any, whereForBucket("disputed") as any] },
      }),
      prisma.storeOrder.count({
        where: { AND: [baseWhere as any, whereForBucket("refund_requested") as any] },
      }),
      prisma.storeOrder.count({
        where: { AND: [baseWhere as any, whereForBucket("nft_returned") as any] },
      }),
      prisma.storeOrder.count({
        where: { AND: [baseWhere as any, whereForBucket("released") as any] },
      }),
      prisma.storeOrder.count({
        where: { AND: [baseWhere as any, whereForBucket("refunded") as any] },
      }),
      prisma.storeOrder.count({ where: baseWhere as any }),
    ]);

    const [mintMap, listingMap] = await Promise.all([
      loadMintMap(items),
      loadListingMap(items),
    ]);

    return NextResponse.json({
      ok: true,
      role,
      bucket,
      scope,
      q: q || null,
      summary: {
        open: openCount,
        disputed: disputedCount,
        refund_requested: refundRequestedCount,
        nft_returned: nftReturnedCount,
        released: releasedCount,
        refunded: refundedCount,
        all: allCount,
      },
      items: items.map((x) => serializeOrder(x, mintMap, listingMap)),
    });
  } catch (e) {
    console.error("[API_ADMIN_PROTECTED_ESCROW_ORDERS_GET_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}
