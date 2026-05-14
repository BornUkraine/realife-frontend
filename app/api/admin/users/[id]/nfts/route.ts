import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_ESCROW_COOKIE_NAME,
  verifyAdminEscrowToken,
} from "@/lib/adminEscrowGate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SupportRoleValue = "USER" | "MODERATOR" | "ADMIN";
const INSENSITIVE = "insensitive" as const;

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function clean(v: unknown, max = 200) {
  return String(v || "").trim().slice(0, max);
}

function s(v: any) {
  return typeof v === "bigint" ? v.toString() : v == null ? null : String(v);
}

function iso(v?: Date | null) {
  return v ? v.toISOString() : null;
}

function short(v?: string | null, left = 8, right = 6) {
  const str = String(v || "");
  if (!str) return null;
  if (str.length <= left + right + 3) return str;
  return `${str.slice(0, left)}...${str.slice(-right)}`;
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
          mode: INSENSITIVE,
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
  if (actor.walletAddress && getBootstrapAdminWallets().includes(actor.walletAddress)) {
    return "ADMIN";
  }

  if (actor.walletAddress && getBootstrapModeratorWallets().includes(actor.walletAddress)) {
    return "MODERATOR";
  }

  const actorRole = await getActorSupportRole(actor);
  if (actorRole === "ADMIN") return "ADMIN";
  if (actorRole === "MODERATOR") return "MODERATOR";
  return null;
}

function tokenMatchesActor(
  token: { sub: string | null; wallet: string | null; role: "MODERATOR" | "ADMIN"; exp: number } | null,
  actor: { userId: string | null; walletAddress: string }
) {
  if (!token) return false;
  if (token.sub && actor.userId && token.sub === actor.userId) return true;
  if (token.wallet && actor.walletAddress && token.wallet === actor.walletAddress) return true;
  return false;
}

async function requirePanelAccess(req: Request) {
  const actor = await getActor();

  if (!actor.userId && !actor.walletAddress) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 }),
    };
  }

  const role = await getEscrowPanelRole(actor);
  if (!role) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 }),
    };
  }

  const rawCookie = req.headers
    .get("cookie")
    ?.split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${ADMIN_ESCROW_COOKIE_NAME}=`))
    ?.slice(ADMIN_ESCROW_COOKIE_NAME.length + 1);

  const token = verifyAdminEscrowToken(rawCookie || null);
  if (!tokenMatchesActor(token, actor)) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "ESCROW_GATE_LOCKED" }, { status: 423 }),
    };
  }

  return { ok: true as const, actor, role };
}

function mintPayload(m: any) {
  if (!m) return null;
  return {
    id: m.id,
    createdAt: iso(m.createdAt),
    updatedAt: iso(m.updatedAt),
    chainId: m.chainId,
    contract: m.contract,
    tokenId: m.tokenId,
    txHash: m.txHash || null,
    tokenUri: m.tokenUri || null,
    name: m.name || m.metaItem || null,
    image: m.metaImage || m.image || null,
    description: m.metaDescription || null,
    verified: Boolean(m.verified),
    deliveryEnabled: Boolean(m.deliveryEnabled),
    physicalItemIncluded: Boolean(m.physicalItemIncluded),
    officialItem: Boolean(m.officialItem),
    fulfillmentType: m.fulfillmentType || null,
    category: m.category || null,
    subcategory: m.subcategory || null,
    serviceCountry: m.serviceCountry || null,
    serviceCity: m.serviceCity || null,
    serviceArea: m.serviceArea || null,
    metaBrand: m.metaBrand || null,
    metaProject: m.metaProject || null,
  };
}

function listingPayload(l: any) {
  if (!l) return null;
  return {
    id: l.id,
    createdAt: iso(l.createdAt),
    updatedAt: iso(l.updatedAt),
    cancelledAt: iso(l.cancelledAt),
    soldOutAt: iso(l.soldOutAt),
    chainId: l.chainId,
    contract: l.contract,
    tokenId: l.tokenId,
    standard: l.standard,
    status: l.status,
    adminHidden: Boolean(l.adminHidden),
    adminHiddenAt: iso(l.adminHiddenAt),
    adminHiddenReason: l.adminHiddenReason || null,
    marketType: l.marketType || null,
    marketplaceContract: l.marketplaceContract || null,
    marketplaceListingId: s(l.marketplaceListingId),
    paymentTokenAddress: l.paymentTokenAddress || null,
    paymentSymbol: l.paymentSymbol || (l.marketType === "PROTECTED" ? "USDC" : null),
    paymentDecimals: l.paymentDecimals ?? (l.marketType === "PROTECTED" ? 6 : null),
    sellerWallet: l.sellerWallet,
    pricePerUnitWei: s(l.pricePerUnitWei),
    amountTotal: s(l.amountTotal),
    amountRemaining: s(l.amountRemaining),
    fulfillmentType: l.fulfillmentType || null,
    category: l.category || null,
    subcategory: l.subcategory || null,
    serviceCountry: l.serviceCountry || null,
    serviceCity: l.serviceCity || null,
    serviceArea: l.serviceArea || null,
    nftName: l.mint?.name || l.mint?.metaItem || null,
    nftImage: l.mint?.metaImage || l.mint?.image || null,
    nftVerified: l.mint ? Boolean(l.mint.verified) : null,
  };
}

function holdingPayload(h: any) {
  return {
    id: h.id,
    updatedAt: iso(h.updatedAt),
    chainId: h.chainId,
    contract: h.contract,
    tokenId: h.tokenId,
    standard: h.standard,
    amount: s(h.amount),
    mint: mintPayload(h.mint),
  };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requirePanelAccess(req);
    if (!access.ok) return access.response;

    const { id } = await params;
    const userId = clean(id, 200);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "USER_ID_REQUIRED" }, { status: 400 });
    }

    const url = new URL(req.url);
    const takeRaw = Number(url.searchParams.get("take") || "200");
    const take = Number.isFinite(takeRaw) ? Math.max(1, Math.min(300, Math.floor(takeRaw))) : 200;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        handle: true,
        publicId: true,
        walletAddress: true,
        googleEmail: true,
        googleName: true,
        twitterUser: true,
        twitterName: true,
        discordUser: true,
        discordName: true,
        referralCode: true,
        points: true,
        wallets: {
          select: {
            address: true,
            chainId: true,
            kind: true,
            embeddedWalletProvider: true,
            isPrimary: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
    }

    const wallets = Array.from(
      new Set([
        normAddr(user.walletAddress),
        ...(user.wallets || []).map((w) => normAddr(w.address)),
      ].filter(Boolean))
    );

    const [minted, holdings, listings] = await prisma.$transaction([
      prisma.mint.findMany({
        where: { userId: user.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
        select: {
          id: true,
          createdAt: true,
          chainId: true,
          contract: true,
          tokenId: true,
          txHash: true,
          tokenUri: true,
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
          metaDescription: true,
          metaItem: true,
          metaBrand: true,
          metaProject: true,
          listings: {
            orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
            take: 8,
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
              adminHiddenReason: true,
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
              fulfillmentType: true,
              category: true,
              subcategory: true,
              serviceCountry: true,
              serviceCity: true,
              serviceArea: true,
              mint: { select: { name: true, image: true, metaImage: true, metaItem: true, verified: true } },
            },
          },
          _count: { select: { listings: true, trades: true } },
        },
      }),
      prisma.holding.findMany({
        where: { userId: user.id, amount: { gt: 0n } },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take,
        select: {
          id: true,
          updatedAt: true,
          chainId: true,
          contract: true,
          tokenId: true,
          standard: true,
          amount: true,
          mint: {
            select: {
              id: true,
              createdAt: true,
              chainId: true,
              contract: true,
              tokenId: true,
              txHash: true,
              tokenUri: true,
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
              metaDescription: true,
              metaItem: true,
              metaBrand: true,
              metaProject: true,
            },
          },
        },
      }),
      prisma.listing.findMany({
        where: wallets.length ? { sellerWallet: { in: wallets } } : { sellerWallet: user.walletAddress },
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
          adminHiddenReason: true,
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
          fulfillmentType: true,
          category: true,
          subcategory: true,
          serviceCountry: true,
          serviceCity: true,
          serviceArea: true,
          mint: { select: { name: true, image: true, metaImage: true, metaItem: true, verified: true } },
        },
      }),
    ]);

    const [mintedCount, holdingsCount, listingsCount, activeListingsCount] = await prisma.$transaction([
      prisma.mint.count({ where: { userId: user.id } }),
      prisma.holding.count({ where: { userId: user.id, amount: { gt: 0n } } }),
      prisma.listing.count({ where: wallets.length ? { sellerWallet: { in: wallets } } : { sellerWallet: user.walletAddress } }),
      prisma.listing.count({
        where: {
          ...(wallets.length ? { sellerWallet: { in: wallets } } : { sellerWallet: user.walletAddress }),
          status: "ACTIVE",
          adminHidden: false,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      role: access.role,
      user: {
        id: user.id,
        handle: user.handle || null,
        publicId: user.publicId || null,
        walletAddress: user.walletAddress || null,
        walletShort: short(user.walletAddress),
        googleEmail: user.googleEmail || null,
        googleName: user.googleName || null,
        twitterUser: user.twitterUser || null,
        twitterName: user.twitterName || null,
        discordUser: user.discordUser || null,
        discordName: user.discordName || null,
        referralCode: user.referralCode || null,
        points: user.points || 0,
        wallets: user.wallets || [],
      },
      counts: {
        minted: mintedCount,
        profileHoldings: holdingsCount,
        listings: listingsCount,
        activeListings: activeListingsCount,
      },
      minted: minted.map((m: any) => ({
        ...mintPayload(m),
        listingsCount: m._count?.listings || 0,
        tradesCount: m._count?.trades || 0,
        recentListings: (m.listings || []).map(listingPayload),
      })),
      profileHoldings: holdings.map(holdingPayload),
      listings: listings.map(listingPayload),
    });
  } catch (e) {
    console.error("[API_ADMIN_USER_NFTS_GET_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
