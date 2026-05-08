import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
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

const SUPPORT_ROLES = new Set<SupportRoleValue>(["USER", "MODERATOR", "ADMIN"]);
const INSENSITIVE = "insensitive" as const;

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function clean(v: unknown, max = 200) {
  return String(v || "").trim().slice(0, max);
}

function readGroupCount(row: { _count?: unknown }, key: string) {
  const count = row._count;
  if (!count || typeof count !== "object") return 0;

  const value = (count as Record<string, unknown>)[key];
  return typeof value === "number" ? value : Number(value || 0);
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
      response: NextResponse.json(
        { ok: false, error: "ESCROW_GATE_LOCKED" },
        { status: 423 }
      ),
    };
  }

  return { ok: true as const, actor, role };
}

function toInt(v: string | null, def: number, min: number, max: number) {
  const n = Number(v || def);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function iso(v?: Date | null) {
  return v ? v.toISOString() : null;
}

function short(v?: string | null, left = 8, right = 6) {
  const s = String(v || "");
  if (!s) return null;
  if (s.length <= left + right + 3) return s;
  return `${s.slice(0, left)}...${s.slice(-right)}`;
}

function userSearchWhere(q: string): Prisma.UserWhereInput {
  if (!q) return {};
  const query = q.trim();
  const qLower = query.toLowerCase();

  return {
    OR: [
      { id: { contains: query, mode: INSENSITIVE } },
      { handle: { contains: query, mode: INSENSITIVE } },
      { publicId: { contains: query, mode: INSENSITIVE } },
      { walletAddress: { contains: qLower, mode: INSENSITIVE } },
      { googleEmail: { contains: query, mode: INSENSITIVE } },
      { googleName: { contains: query, mode: INSENSITIVE } },
      { twitterUser: { contains: query, mode: INSENSITIVE } },
      { discordUser: { contains: query, mode: INSENSITIVE } },
      { firstIp: { contains: query, mode: INSENSITIVE } },
      { lastIp: { contains: query, mode: INSENSITIVE } },
      { lastCountry: { contains: query, mode: INSENSITIVE } },
      { lastCity: { contains: query, mode: INSENSITIVE } },
      { mints: { some: { tokenId: { contains: query, mode: INSENSITIVE } } } },
      { mints: { some: { txHash: { contains: query, mode: INSENSITIVE } } } },
      { listings: { some: { sellerWallet: { contains: qLower, mode: INSENSITIVE } } } },
      { storeOrdersBought: { some: { sellerWallet: { contains: qLower, mode: INSENSITIVE } } } },
      { storeOrdersSold: { some: { buyerWallet: { contains: qLower, mode: INSENSITIVE } } } },
      { wallets: { some: { address: { contains: qLower, mode: INSENSITIVE } } } },
      { loginEvents: { some: { ip: { contains: query, mode: INSENSITIVE } } } },
      { loginEvents: { some: { googleEmail: { contains: query, mode: INSENSITIVE } } } },
      { loginEvents: { some: { walletAddress: { contains: qLower, mode: INSENSITIVE } } } },
    ],
  };
}

function serializeMint(row: any) {
  return {
    id: row.id,
    createdAt: iso(row.createdAt),
    chainId: row.chainId,
    contract: row.contract,
    tokenId: row.tokenId,
    txHash: row.txHash || null,
    tokenUri: row.tokenUri || null,
    name: row.name || row.metaItem || null,
    image: row.metaImage || row.image || null,
    verified: Boolean(row.verified),
    deliveryEnabled: Boolean(row.deliveryEnabled),
    physicalItemIncluded: Boolean(row.physicalItemIncluded),
    officialItem: Boolean(row.officialItem),
    fulfillmentType: row.fulfillmentType || null,
    category: row.category || null,
    subcategory: row.subcategory || null,
    serviceCountry: row.serviceCountry || null,
    serviceCity: row.serviceCity || null,
    listingsCount: row._count?.listings || 0,
    tradesCount: row._count?.trades || 0,
  };
}

function serializeListing(row: any) {
  return {
    id: row.id,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    chainId: row.chainId,
    contract: row.contract,
    tokenId: row.tokenId,
    status: row.status,
    marketType: row.marketType,
    marketplaceListingId: row.marketplaceListingId ? String(row.marketplaceListingId) : null,
    marketplaceContract: row.marketplaceContract || null,
    sellerWallet: row.sellerWallet,
    pricePerUnitWei: row.pricePerUnitWei ? String(row.pricePerUnitWei) : null,
    amountTotal: row.amountTotal ? String(row.amountTotal) : null,
    amountRemaining: row.amountRemaining ? String(row.amountRemaining) : null,
    fulfillmentType: row.fulfillmentType || null,
    category: row.category || null,
    subcategory: row.subcategory || null,
    serviceCountry: row.serviceCountry || null,
    serviceCity: row.serviceCity || null,
    adminHidden: Boolean(row.adminHidden),
    nftName: row.mint?.name || row.mint?.metaItem || null,
  };
}

function serializeOrder(row: any, side: "BOUGHT" | "SOLD") {
  const counterpartyWallet = side === "SOLD" ? row.buyerWallet : row.sellerWallet;
  const counterparty = side === "SOLD" ? row.buyer : row.seller;

  return {
    id: row.id,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    side,
    chainId: row.chainId,
    contract: row.contract,
    tokenId: row.tokenId,
    vertical: row.vertical,
    sourceType: row.sourceType || null,
    orderKind: row.orderKind || null,
    marketType: row.marketType || null,
    marketplacePurchaseId: row.marketplacePurchaseId ? String(row.marketplacePurchaseId) : null,
    buyerWallet: row.buyerWallet,
    sellerWallet: row.sellerWallet,
    counterpartyWallet,
    counterparty: counterparty
      ? {
          id: counterparty.id,
          handle: counterparty.handle || null,
          publicId: counterparty.publicId || null,
          walletAddress: counterparty.walletAddress || null,
        }
      : null,
    amount: row.amount ? String(row.amount) : null,
    unitPrice: row.unitPrice ? String(row.unitPrice) : null,
    totalPrice: row.totalPrice ? String(row.totalPrice) : null,
    paymentToken: row.paymentToken || null,
    fulfillmentType: row.fulfillmentType || null,
    category: row.category || null,
    subcategory: row.subcategory || null,
    serviceCountry: row.serviceCountry || null,
    serviceCity: row.serviceCity || null,
    escrowStatus: row.escrowStatus,
    deliveryStatus: row.deliveryStatus,
    serviceStatus: row.serviceStatus,
    buyTxHash: row.buyTxHash || null,
    releasedAt: iso(row.releasedAt),
    refundedAt: iso(row.refundedAt),
    disputedAt: iso(row.disputedAt),
    confirmedAt: iso(row.confirmedAt),
    buyerConfirmedAt: iso(row.buyerConfirmedAt),
  };
}

function serializeTrade(row: any, side: "BOUGHT" | "SOLD") {
  return {
    id: row.id,
    createdAt: iso(row.createdAt),
    blockTime: iso(row.blockTime),
    side,
    chainId: row.chainId,
    contract: row.contract,
    tokenId: row.tokenId,
    txHash: row.txHash,
    marketType: row.marketType || null,
    sellerWallet: row.sellerWallet,
    buyerWallet: row.buyerWallet,
    amount: row.amount ? String(row.amount) : null,
    totalPriceWei: row.totalPriceWei ? String(row.totalPriceWei) : null,
    fulfillmentType: row.fulfillmentType || null,
    category: row.category || null,
  };
}

function serializeUser(row: any) {
  const latestEvents = (row.loginEvents || []).map((e: any) => ({
    id: e.id,
    createdAt: iso(e.createdAt),
    eventType: e.eventType,
    ip: e.ip || null,
    country: e.country || null,
    region: e.region || null,
    city: e.city || null,
    userAgent: e.userAgent || null,
    userAgentShort: e.userAgent ? short(e.userAgent, 38, 18) : null,
    walletAddress: e.walletAddress || null,
    walletShort: short(e.walletAddress),
    authMethod: e.authMethod || null,
    walletKind: e.walletKind || null,
    embeddedWalletProvider: e.embeddedWalletProvider || null,
    googleEmail: e.googleEmail || null,
    path: e.path || null,
  }));

  const wallets = (row.wallets || []).map((w: any) => ({
    id: w.id,
    address: w.address,
    shortAddress: short(w.address),
    chainId: w.chainId || null,
    kind: w.kind,
    embeddedWalletProvider: w.embeddedWalletProvider || null,
    isPrimary: Boolean(w.isPrimary),
    label: w.label || null,
    firstSeenAt: iso(w.firstSeenAt),
    lastSeenAt: iso(w.lastSeenAt),
    lastIp: w.lastIp || null,
  }));

  const recentMints = (row.mints || []).map(serializeMint);
  const recentListings = (row.listings || []).map(serializeListing);
  const recentOrdersSold = (row.storeOrdersSold || []).map((o: any) => serializeOrder(o, "SOLD"));
  const recentOrdersBought = (row.storeOrdersBought || []).map((o: any) => serializeOrder(o, "BOUGHT"));
  const recentTradesSold = (row.tradesSold || []).map((t: any) => serializeTrade(t, "SOLD"));
  const recentTradesBought = (row.tradesBought || []).map((t: any) => serializeTrade(t, "BOUGHT"));

  const linkedAccountCount =
    wallets.length +
    (row.googleEmail ? 1 : 0) +
    (row.twitterUser ? 1 : 0) +
    (row.discordUser ? 1 : 0);

  return {
    id: row.id,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    handle: row.handle || null,
    publicId: row.publicId || null,
    supportRole: row.supportRole,

    authMethod: row.authMethod,
    walletKind: row.walletKind,
    walletAddress: row.walletAddress,
    walletShort: short(row.walletAddress),
    walletChainId: row.walletChainId || null,
    embeddedWalletProvider: row.embeddedWalletProvider || null,

    googleId: row.googleId || null,
    googleEmail: row.googleEmail || null,
    googleName: row.googleName || null,
    googleImage: row.googleImage || null,

    twitterUser: row.twitterUser || null,
    discordUser: row.discordUser || null,

    firstLoginAt: iso(row.firstLoginAt),
    lastLoginAt: iso(row.lastLoginAt),
    firstIp: row.firstIp || null,
    lastIp: row.lastIp || null,
    firstCountry: row.firstCountry || null,
    lastCountry: row.lastCountry || null,
    firstRegion: row.firstRegion || null,
    lastRegion: row.lastRegion || null,
    firstCity: row.firstCity || null,
    lastCity: row.lastCity || null,
    lastAuthMethod: row.lastAuthMethod || null,
    lastWalletKind: row.lastWalletKind || null,
    lastEmbeddedWalletProvider: row.lastEmbeddedWalletProvider || null,

    approvedPhysicalSeller: Boolean(row.approvedPhysicalSeller),
    points: row.points || 0,

    counts: {
      mints: row._count?.mints || 0,
      listings: row._count?.listings || 0,
      ordersBought: row._count?.storeOrdersBought || 0,
      ordersSold: row._count?.storeOrdersSold || 0,
      tradesBought: row._count?.tradesBought || 0,
      tradesSold: row._count?.tradesSold || 0,
      wallets: row._count?.wallets || 0,
      loginEvents: row._count?.loginEvents || 0,
    },

    hasMintedNfts: (row._count?.mints || 0) > 0,
    hasCreatedListings: (row._count?.listings || 0) > 0,
    hasSoldGoodsOrServices: (row._count?.storeOrdersSold || 0) > 0,
    hasBoughtGoodsOrServices: (row._count?.storeOrdersBought || 0) > 0,

    linkedAccountCount,
    wallets,
    latestEvents,
    recentMints,
    recentListings,
    recentOrdersSold,
    recentOrdersBought,
    recentTradesSold,
    recentTradesBought,
  };
}

export async function GET(req: Request) {
  try {
    const access = await requirePanelAccess(req);
    if (!access.ok) return access.response;

    const url = new URL(req.url);
    const q = clean(url.searchParams.get("q"), 160);
    const roleFilter = clean(url.searchParams.get("role"), 40).toUpperCase();
    const authFilter = clean(url.searchParams.get("auth"), 40).toUpperCase();
    const walletFilter = clean(url.searchParams.get("wallet"), 40).toUpperCase();
    const providerFilter = clean(url.searchParams.get("provider"), 80).toUpperCase();
    const ipFilter = clean(url.searchParams.get("ip"), 120);
    const activityFilter = clean(url.searchParams.get("activity"), 80).toLowerCase();
    const skip = toInt(url.searchParams.get("skip"), 0, 0, 100000);
    const take = toInt(url.searchParams.get("take"), 30, 1, 100);

    const activityWhere: Prisma.UserWhereInput =
      activityFilter === "minted"
        ? { mints: { some: {} } }
        : activityFilter === "listed"
          ? { listings: { some: {} } }
          : activityFilter === "sold"
            ? { storeOrdersSold: { some: {} } }
            : activityFilter === "bought"
              ? { storeOrdersBought: { some: {} } }
              : activityFilter === "traded"
                ? { OR: [{ tradesSold: { some: {} } }, { tradesBought: { some: {} } }] }
                : {};

    const whereClauses: Prisma.UserWhereInput[] = [
      userSearchWhere(q),
      SUPPORT_ROLES.has(roleFilter as SupportRoleValue)
        ? { supportRole: roleFilter as SupportRoleValue }
        : {},
      authFilter === "GOOGLE" || authFilter === "WALLET"
        ? { authMethod: authFilter as any }
        : {},
      walletFilter === "EMBEDDED" || walletFilter === "EXTERNAL"
        ? { walletKind: walletFilter as any }
        : {},
      providerFilter
        ? { embeddedWalletProvider: providerFilter as any }
        : {},
      ipFilter
        ? {
            OR: [
              { firstIp: { contains: ipFilter, mode: INSENSITIVE } },
              { lastIp: { contains: ipFilter, mode: INSENSITIVE } },
              { loginEvents: { some: { ip: { contains: ipFilter, mode: INSENSITIVE } } } },
            ],
          }
        : {},
      activityWhere,
    ].filter((x) => Object.keys(x).length > 0);

    const where: Prisma.UserWhereInput = {
      AND: whereClauses,
    };

    const [items, total, summary, recentIps] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy: [{ lastLoginAt: "desc" }, { createdAt: "desc" }],
        skip,
        take,
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          handle: true,
          publicId: true,
          supportRole: true,
          authMethod: true,
          walletKind: true,
          walletAddress: true,
          walletChainId: true,
          embeddedWalletProvider: true,
          googleId: true,
          googleEmail: true,
          googleName: true,
          googleImage: true,
          twitterUser: true,
          discordUser: true,
          firstLoginAt: true,
          lastLoginAt: true,
          firstIp: true,
          lastIp: true,
          firstCountry: true,
          lastCountry: true,
          firstRegion: true,
          lastRegion: true,
          firstCity: true,
          lastCity: true,
          lastAuthMethod: true,
          lastWalletKind: true,
          lastEmbeddedWalletProvider: true,
          approvedPhysicalSeller: true,
          points: true,
          wallets: {
            orderBy: [{ isPrimary: "desc" }, { lastSeenAt: "desc" }],
            take: 8,
            select: {
              id: true,
              address: true,
              chainId: true,
              kind: true,
              embeddedWalletProvider: true,
              isPrimary: true,
              label: true,
              firstSeenAt: true,
              lastSeenAt: true,
              lastIp: true,
            },
          },
          loginEvents: {
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              createdAt: true,
              eventType: true,
              ip: true,
              userAgent: true,
              country: true,
              region: true,
              city: true,
              walletAddress: true,
              authMethod: true,
              walletKind: true,
              embeddedWalletProvider: true,
              googleEmail: true,
              path: true,
            },
          },
          mints: {
            orderBy: { createdAt: "desc" },
            take: 5,
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
              metaImage: true,
              metaItem: true,
              _count: { select: { listings: true, trades: true } },
            },
          },
          listings: {
            orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
            take: 5,
            select: {
              id: true,
              createdAt: true,
              updatedAt: true,
              chainId: true,
              contract: true,
              tokenId: true,
              status: true,
              marketType: true,
              marketplaceListingId: true,
              marketplaceContract: true,
              sellerWallet: true,
              pricePerUnitWei: true,
              amountTotal: true,
              amountRemaining: true,
              fulfillmentType: true,
              category: true,
              subcategory: true,
              serviceCountry: true,
              serviceCity: true,
              adminHidden: true,
              mint: { select: { name: true, metaItem: true } },
            },
          },
          storeOrdersSold: {
            orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
            take: 5,
            select: {
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
              marketplacePurchaseId: true,
              buyerWallet: true,
              sellerWallet: true,
              amount: true,
              unitPrice: true,
              totalPrice: true,
              paymentToken: true,
              fulfillmentType: true,
              category: true,
              subcategory: true,
              serviceCountry: true,
              serviceCity: true,
              escrowStatus: true,
              deliveryStatus: true,
              serviceStatus: true,
              buyTxHash: true,
              releasedAt: true,
              refundedAt: true,
              disputedAt: true,
              confirmedAt: true,
              buyerConfirmedAt: true,
              buyer: { select: { id: true, handle: true, publicId: true, walletAddress: true } },
              seller: { select: { id: true, handle: true, publicId: true, walletAddress: true } },
            },
          },
          storeOrdersBought: {
            orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
            take: 5,
            select: {
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
              marketplacePurchaseId: true,
              buyerWallet: true,
              sellerWallet: true,
              amount: true,
              unitPrice: true,
              totalPrice: true,
              paymentToken: true,
              fulfillmentType: true,
              category: true,
              subcategory: true,
              serviceCountry: true,
              serviceCity: true,
              escrowStatus: true,
              deliveryStatus: true,
              serviceStatus: true,
              buyTxHash: true,
              releasedAt: true,
              refundedAt: true,
              disputedAt: true,
              confirmedAt: true,
              buyerConfirmedAt: true,
              buyer: { select: { id: true, handle: true, publicId: true, walletAddress: true } },
              seller: { select: { id: true, handle: true, publicId: true, walletAddress: true } },
            },
          },
          tradesSold: {
            orderBy: { blockTime: "desc" },
            take: 5,
            select: {
              id: true,
              createdAt: true,
              blockTime: true,
              chainId: true,
              contract: true,
              tokenId: true,
              txHash: true,
              marketType: true,
              sellerWallet: true,
              buyerWallet: true,
              amount: true,
              totalPriceWei: true,
              fulfillmentType: true,
              category: true,
            },
          },
          tradesBought: {
            orderBy: { blockTime: "desc" },
            take: 5,
            select: {
              id: true,
              createdAt: true,
              blockTime: true,
              chainId: true,
              contract: true,
              tokenId: true,
              txHash: true,
              marketType: true,
              sellerWallet: true,
              buyerWallet: true,
              amount: true,
              totalPriceWei: true,
              fulfillmentType: true,
              category: true,
            },
          },
          _count: {
            select: {
              mints: true,
              listings: true,
              storeOrdersBought: true,
              storeOrdersSold: true,
              tradesBought: true,
              tradesSold: true,
              wallets: true,
              loginEvents: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
      prisma.user.aggregate({ _count: { id: true }, where: {} }),
      prisma.userLoginEvent.groupBy({
        by: ["ip"],
        where: {
          ip: { not: null },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        _count: { ip: true },
        orderBy: { _count: { ip: "desc" } },
        take: 12,
      }),
    ]);

    const [
      googleUsers,
      walletUsers,
      embeddedUsers,
      externalUsers,
      adminUsers,
      moderatorUsers,
      usersWithMints,
      usersWithListings,
      usersWithSoldOrders,
      usersWithBoughtOrders,
    ] = await prisma.$transaction([
      prisma.user.count({ where: { authMethod: "GOOGLE" } }),
      prisma.user.count({ where: { authMethod: "WALLET" } }),
      prisma.user.count({ where: { walletKind: "EMBEDDED" } }),
      prisma.user.count({ where: { walletKind: "EXTERNAL" } }),
      prisma.user.count({ where: { supportRole: "ADMIN" } }),
      prisma.user.count({ where: { supportRole: "MODERATOR" } }),
      prisma.user.count({ where: { mints: { some: {} } } }),
      prisma.user.count({ where: { listings: { some: {} } } }),
      prisma.user.count({ where: { storeOrdersSold: { some: {} } } }),
      prisma.user.count({ where: { storeOrdersBought: { some: {} } } }),
    ]);

    return NextResponse.json({
      ok: true,
      role: access.role,
      total,
      skip,
      take,
      summary: {
        totalUsers: summary._count.id,
        googleUsers,
        walletUsers,
        embeddedUsers,
        externalUsers,
        adminUsers,
        moderatorUsers,
        usersWithMints,
        usersWithListings,
        usersWithSoldOrders,
        usersWithBoughtOrders,
        topIps30d: recentIps.map((r) => ({ ip: r.ip || "unknown", count: readGroupCount(r, "ip") })),
      },
      filters: {
        q,
        role: roleFilter || null,
        auth: authFilter || null,
        wallet: walletFilter || null,
        provider: providerFilter || null,
        ip: ipFilter || null,
        activity: activityFilter || null,
      },
      items: items.map(serializeUser),
    });
  } catch (e) {
    console.error("[API_ADMIN_USERS_GET_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const access = await requirePanelAccess(req);
    if (!access.ok) return access.response;

    if (access.role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "ADMIN_ONLY" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const userId = clean(body?.userId, 200);
    const supportRole = clean(body?.supportRole, 40).toUpperCase();

    if (!userId) {
      return NextResponse.json({ ok: false, error: "USER_ID_REQUIRED" }, { status: 400 });
    }

    if (!SUPPORT_ROLES.has(supportRole as SupportRoleValue)) {
      return NextResponse.json({ ok: false, error: "INVALID_SUPPORT_ROLE" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { supportRole: supportRole as SupportRoleValue },
      select: {
        id: true,
        handle: true,
        publicId: true,
        walletAddress: true,
        supportRole: true,
      },
    });

    await prisma.adminActionLog.create({
      data: {
        adminUserId: access.actor.userId,
        adminWallet: access.actor.walletAddress || null,
        adminRole: access.role,
        action: "USER_SUPPORT_ROLE_UPDATE",
        targetType: "USER",
        targetId: updated.id,
        metadata: {
          supportRole: updated.supportRole,
          walletAddress: updated.walletAddress,
        },
      },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (e: any) {
    console.error("[API_ADMIN_USERS_PATCH_ERROR]", e);
    if (e?.code === "P2025") {
      return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
