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
type AdminListingAction = "remove" | "restore" | "disable_nft" | "enable_nft";

const REMOVAL_REASONS = new Set([
  "fake_product",
  "scam_risk",
  "prohibited_item",
  "empty_nft",
  "copyright_abuse",
  "unsafe_service",
  "spam",
  "other",
]);

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function clean(v: unknown, max = 500) {
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

async function getSupportRole(actor: {
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
  if (token.wallet && actor.walletAddress && token.wallet === actor.walletAddress) {
    return true;
  }
  return false;
}

async function requireSupport(req: Request) {
  const actor = await getActor();

  if (!actor.userId && !actor.walletAddress) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 }),
    };
  }

  const role = await getSupportRole(actor);
  if (!role) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 }),
    };
  }

  const cookieHeader = req.headers.get("cookie") || "";
  const rawToken = cookieHeader
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(`${ADMIN_ESCROW_COOKIE_NAME}=`))
    ?.slice(`${ADMIN_ESCROW_COOKIE_NAME}=`.length);

  const token = verifyAdminEscrowToken(rawToken || null);
  if (!tokenMatchesActor(token, actor)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "ADMIN_ESCROW_GATE_LOCKED" },
        { status: 401 }
      ),
    };
  }

  return { ok: true as const, actor, role };
}

function parseAction(v: unknown): AdminListingAction | null {
  const s = String(v || "").trim().toLowerCase();
  if (
    s === "remove" ||
    s === "restore" ||
    s === "disable_nft" ||
    s === "enable_nft"
  ) {
    return s;
  }
  return null;
}

function parseReason(v: unknown) {
  const s = clean(v, 80).toLowerCase();
  return REMOVAL_REASONS.has(s) ? s : "other";
}

function iso(v?: Date | null) {
  return v ? v.toISOString() : null;
}

function serializeListing(row: any) {
  return {
    id: row.id,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    cancelledAt: iso(row.cancelledAt),
    soldOutAt: iso(row.soldOutAt),
    chainId: row.chainId,
    contract: row.contract,
    tokenId: row.tokenId,
    status: row.status,
    adminHidden: Boolean(row.adminHidden),
    adminHiddenAt: iso(row.adminHiddenAt),
    adminHiddenByWallet: row.adminHiddenByWallet || null,
    adminHiddenReason: row.adminHiddenReason || null,
    adminHiddenNote: row.adminHiddenNote || null,
    marketType: row.marketType,
    marketplaceContract: row.marketplaceContract || null,
    marketplaceListingId: String(row.marketplaceListingId),
    paymentTokenAddress: row.paymentTokenAddress || null,
    paymentSymbol: row.paymentSymbol || (row.marketType === "PROTECTED" ? "USDC" : null),
    paymentDecimals: row.paymentDecimals ?? (row.marketType === "PROTECTED" ? 6 : null),
    sellerWallet: row.sellerWallet,
    amountRemaining: String(row.amountRemaining),
    pricePerUnitWei: String(row.pricePerUnitWei),
    nft: row.mint
      ? {
          id: row.mint.id,
          verified: Boolean(row.mint.verified),
          name: row.mint.name || row.mint.metaItem || null,
          image: row.mint.metaImage || row.mint.image || null,
          description: row.mint.metaDescription || null,
        }
      : null,
  };
}

async function getListing(id: string) {
  return prisma.listing.findUnique({
    where: { id },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      cancelledAt: true,
      soldOutAt: true,
      chainId: true,
      contract: true,
      tokenId: true,
      status: true,
      adminHidden: true,
      adminHiddenAt: true,
      adminHiddenByWallet: true,
      adminHiddenReason: true,
      adminHiddenNote: true,
      marketType: true,
      marketplaceContract: true,
      marketplaceListingId: true,
      paymentTokenAddress: true,
      paymentSymbol: true,
      paymentDecimals: true,
      sellerWallet: true,
      amountRemaining: true,
      pricePerUnitWei: true,
      mint: {
        select: {
          id: true,
          name: true,
          image: true,
          verified: true,
          metaImage: true,
          metaDescription: true,
          metaItem: true,
        },
      },
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSupport(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const listingId = String(id || "").trim();
    if (!listingId) {
      return NextResponse.json({ ok: false, error: "LISTING_ID_REQUIRED" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const action = parseAction(body?.action);
    const reason = parseReason(body?.reason);
    const note = clean(body?.note, 1500);
    const disableMint = Boolean(body?.disableMint);

    if (!action) {
      return NextResponse.json({ ok: false, error: "INVALID_ACTION" }, { status: 400 });
    }


    const before = await getListing(listingId);
    if (!before) {
      return NextResponse.json({ ok: false, error: "LISTING_NOT_FOUND" }, { status: 404 });
    }

    if ((action === "remove" || action === "disable_nft") && !note && reason === "other") {
      return NextResponse.json(
        { ok: false, error: "MODERATION_NOTE_REQUIRED" },
        { status: 400 }
      );
    }

    let updated: any = before;

    await prisma.$transaction(async (tx) => {
      if (action === "remove") {
        updated = await tx.listing.update({
          where: { id: listingId },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            adminHidden: true,
            adminHiddenAt: new Date(),
            adminHiddenByUserId: auth.actor.userId || null,
            adminHiddenByWallet: auth.actor.walletAddress || null,
            adminHiddenReason: reason,
            adminHiddenNote: note || null,
          },
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            cancelledAt: true,
            soldOutAt: true,
            chainId: true,
            contract: true,
            tokenId: true,
            status: true,
            adminHidden: true,
            adminHiddenAt: true,
            adminHiddenByWallet: true,
            adminHiddenReason: true,
            adminHiddenNote: true,
            marketType: true,
            marketplaceContract: true,
            marketplaceListingId: true,
            sellerWallet: true,
            amountRemaining: true,
            pricePerUnitWei: true,
            mint: {
              select: {
                id: true,
                name: true,
                image: true,
                verified: true,
                metaImage: true,
                metaDescription: true,
                metaItem: true,
              },
            },
          },
        });

        if (disableMint) {
          await tx.mint.updateMany({
            where: {
              chainId: before.chainId,
              contract: { equals: before.contract, mode: "insensitive" },
              tokenId: before.tokenId,
            },
            data: { verified: false },
          });
        }
      }

      if (action === "restore") {
        if (before.status === "SOLD_OUT" || before.amountRemaining <= 0n) {
          throw new Error("CANNOT_RESTORE_SOLD_OUT_LISTING");
        }

        updated = await tx.listing.update({
          where: { id: listingId },
          data: {
            status: "ACTIVE",
            cancelledAt: null,
            adminHidden: false,
            adminHiddenAt: null,
            adminHiddenByUserId: null,
            adminHiddenByWallet: null,
            adminHiddenReason: null,
            adminHiddenNote: null,
          },
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            cancelledAt: true,
            soldOutAt: true,
            chainId: true,
            contract: true,
            tokenId: true,
            status: true,
            adminHidden: true,
            adminHiddenAt: true,
            adminHiddenByWallet: true,
            adminHiddenReason: true,
            adminHiddenNote: true,
            marketType: true,
            marketplaceContract: true,
            marketplaceListingId: true,
            sellerWallet: true,
            amountRemaining: true,
            pricePerUnitWei: true,
            mint: {
              select: {
                id: true,
                name: true,
                image: true,
                verified: true,
                metaImage: true,
                metaDescription: true,
                metaItem: true,
              },
            },
          },
        });
      }

      if (action === "disable_nft") {
        await tx.mint.updateMany({
          where: {
            chainId: before.chainId,
            contract: { equals: before.contract, mode: "insensitive" },
            tokenId: before.tokenId,
          },
          data: { verified: false },
        });
      }

      if (action === "enable_nft") {
        await tx.mint.updateMany({
          where: {
            chainId: before.chainId,
            contract: { equals: before.contract, mode: "insensitive" },
            tokenId: before.tokenId,
          },
          data: { verified: true },
        });
      }

      await tx.adminActionLog.create({
        data: {
          adminUserId: auth.actor.userId || null,
          adminWallet: auth.actor.walletAddress || null,
          adminRole: auth.role,
          action: `listing.${action}`,
          targetType: "listing",
          targetId: listingId,
          reason,
          note: note || null,
          metadata: {
            before: {
              status: before.status,
              adminHidden: before.adminHidden,
              mintVerified: before.mint?.verified ?? null,
              chainId: before.chainId,
              contract: before.contract,
              tokenId: before.tokenId,
              marketplaceListingId: String(before.marketplaceListingId),
            },
            disableMint,
          },
        },
      });
    });

    const after = await getListing(listingId);

    return NextResponse.json({
      ok: true,
      role: auth.role,
      action,
      item: serializeListing(after || updated),
    });
  } catch (e: any) {
    if (e?.message === "CANNOT_RESTORE_SOLD_OUT_LISTING") {
      return NextResponse.json(
        { ok: false, error: "CANNOT_RESTORE_SOLD_OUT_LISTING" },
        { status: 400 }
      );
    }

    console.error("[API_ADMIN_SAFETY_LISTING_PATCH_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
