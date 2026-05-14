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

type ListingStatusFilter = "active" | "cancelled" | "sold_out" | "all";

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

function parseStatus(v?: string | null): ListingStatusFilter {
  const s = String(v || "").trim().toLowerCase();
  if (s === "all" || s === "cancelled" || s === "sold_out") return s;
  return "active";
}

function statusWhere(status: ListingStatusFilter) {
  if (status === "all") return {};
  if (status === "cancelled") return { status: "CANCELLED" };
  if (status === "sold_out") return { status: "SOLD_OUT" };
  return { status: "ACTIVE" };
}

function searchWhere(q: string) {
  if (!q) return {};

  const maybeListingId = /^\d+$/.test(q) ? BigInt(q) : null;
  const or: any[] = [
    { id: { contains: q, mode: "insensitive" } },
    { contract: { contains: q, mode: "insensitive" } },
    { tokenId: { contains: q, mode: "insensitive" } },
    { sellerWallet: { contains: q, mode: "insensitive" } },
    { marketplaceContract: { contains: q, mode: "insensitive" } },
    { createdTxHash: { contains: q, mode: "insensitive" } },
    { category: { contains: q, mode: "insensitive" } },
    { subcategory: { contains: q, mode: "insensitive" } },
    { serviceCountry: { contains: q, mode: "insensitive" } },
    { serviceCity: { contains: q, mode: "insensitive" } },
    { serviceArea: { contains: q, mode: "insensitive" } },
    { mint: { is: { name: { contains: q, mode: "insensitive" } } } },
    { mint: { is: { metaDescription: { contains: q, mode: "insensitive" } } } },
    { mint: { is: { metaItem: { contains: q, mode: "insensitive" } } } },
    { mint: { is: { metaBrand: { contains: q, mode: "insensitive" } } } },
    { mint: { is: { metaProject: { contains: q, mode: "insensitive" } } } },
  ];

  if (maybeListingId != null) or.push({ marketplaceListingId: maybeListingId });

  return { OR: or };
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
    standard: row.standard,
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
    seller: row.seller
      ? {
          id: row.seller.id,
          handle: row.seller.handle || null,
          publicId: row.seller.publicId || null,
          walletAddress: row.seller.walletAddress || null,
          supportRole: row.seller.supportRole || null,
        }
      : null,

    pricePerUnitWei: String(row.pricePerUnitWei),
    amountTotal: String(row.amountTotal),
    amountRemaining: String(row.amountRemaining),

    deliveryEnabled: Boolean(row.deliveryEnabled),
    physicalItemIncluded: Boolean(row.physicalItemIncluded),
    officialItem: Boolean(row.officialItem),
    fulfillmentType: row.fulfillmentType || null,
    category: row.category || null,
    subcategory: row.subcategory || null,
    serviceCountry: row.serviceCountry || null,
    serviceCity: row.serviceCity || null,
    serviceArea: row.serviceArea || null,
    createdTxHash: row.createdTxHash || null,

    nft: row.mint
      ? {
          id: row.mint.id,
          name: row.mint.name || row.mint.metaItem || null,
          image: row.mint.metaImage || row.mint.image || null,
          animation: row.mint.metaAnimation || null,
          mediaKind: row.mint.metaMediaKind || null,
          description: row.mint.metaDescription || null,
          verified: Boolean(row.mint.verified),
          deliveryEnabled: Boolean(row.mint.deliveryEnabled),
          physicalItemIncluded: Boolean(row.mint.physicalItemIncluded),
          officialItem: Boolean(row.mint.officialItem),
          fulfillmentType: row.mint.fulfillmentType || null,
          category: row.mint.category || null,
          subcategory: row.mint.subcategory || null,
          serviceCountry: row.mint.serviceCountry || null,
          serviceCity: row.mint.serviceCity || null,
          serviceArea: row.mint.serviceArea || null,
          metaBrand: row.mint.metaBrand || null,
          metaProject: row.mint.metaProject || null,
        }
      : null,
  };
}

export async function GET(req: Request) {
  try {
    const auth = await requireSupport(req);
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const status = parseStatus(url.searchParams.get("status"));
    const q = clean(url.searchParams.get("q"), 160);
    const marketType = clean(url.searchParams.get("marketType"), 40).toUpperCase();
    const fulfillmentType = clean(url.searchParams.get("fulfillmentType"), 60).toUpperCase();
    const verifiedRaw = String(url.searchParams.get("verified") || "").trim().toLowerCase();
    const hiddenRaw = String(url.searchParams.get("hidden") || "").trim().toLowerCase();

    const takeRaw = Number(url.searchParams.get("take") || "48");
    const take = Number.isFinite(takeRaw)
      ? Math.max(1, Math.min(100, Math.floor(takeRaw)))
      : 48;

    const where: any = {
      AND: [
        statusWhere(status),
        searchWhere(q),
        marketType ? { marketType } : {},
        fulfillmentType ? { fulfillmentType } : {},
        verifiedRaw === "true"
          ? { mint: { is: { verified: true } } }
          : verifiedRaw === "false"
          ? { mint: { is: { verified: false } } }
          : {},
        hiddenRaw === "true"
          ? { adminHidden: true }
          : hiddenRaw === "false"
          ? { adminHidden: false }
          : {},
      ],
    };

    const [items, activeCount, cancelledCount, soldOutCount, hiddenCount, unverifiedCount] =
      await prisma.$transaction([
        prisma.listing.findMany({
          where,
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
          take,
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            cancelledAt: true,
            soldOutAt: true,
            chainId: true,
            contract: true,
            tokenId: true,
            standard: true,
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
            pricePerUnitWei: true,
            amountTotal: true,
            amountRemaining: true,
            deliveryEnabled: true,
            physicalItemIncluded: true,
            officialItem: true,
            fulfillmentType: true,
            category: true,
            subcategory: true,
            serviceCountry: true,
            serviceCity: true,
            serviceArea: true,
            createdTxHash: true,
            seller: {
              select: {
                id: true,
                handle: true,
                publicId: true,
                walletAddress: true,
                supportRole: true,
              },
            },
            mint: {
              select: {
                id: true,
                name: true,
                image: true,
                verified: true,
                deliveryEnabled: true,
                physicalItemIncluded: true,
                officialItem: true,
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
                metaBrand: true,
                metaProject: true,
              },
            },
          },
        }),
        prisma.listing.count({ where: { status: "ACTIVE" } }),
        prisma.listing.count({ where: { status: "CANCELLED" } }),
        prisma.listing.count({ where: { status: "SOLD_OUT" } }),
        prisma.listing.count({ where: { adminHidden: true } }),
        prisma.listing.count({ where: { mint: { is: { verified: false } } } }),
      ]);

    return NextResponse.json({
      ok: true,
      role: auth.role,
      status,
      q: q || null,
      summary: {
        active: activeCount,
        cancelled: cancelledCount,
        sold_out: soldOutCount,
        hidden: hiddenCount,
        unverified_nfts: unverifiedCount,
      },
      items: items.map(serializeListing),
    });
  } catch (e) {
    console.error("[API_ADMIN_SAFETY_LISTINGS_GET_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
