import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function s(v: unknown) {
  return typeof v === "bigint" ? v.toString() : v;
}

function toInt(v: string | null) {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function normAddr(v: string | null) {
  const x = (v || "").trim();
  if (!x) return null;
  return x.toLowerCase();
}

const ALLOWED_MARKET_TYPE = new Set(["STANDARD", "DELIVERY"]);

const CAFE_CONTRACT = normAddr(
  process.env.NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT ||
    process.env.REALIFE_CAFE_STORE_CONTRACT ||
    null
);

const STORE_CONTRACT = normAddr(
  process.env.NEXT_PUBLIC_REALIFE_STORE_CONTRACT ||
    process.env.REALIFE_STORE_CONTRACT ||
    null
);

const PUBLIC_STANDARD_CONTRACT = normAddr(
  process.env.NEXT_PUBLIC_REALIFE_1155_NEW_CONTRACT ||
    process.env.REALIFE_1155_NEW_CONTRACT ||
    null
);

const PUBLIC_DELIVERY_CONTRACT = normAddr(
  process.env.NEXT_PUBLIC_REALIFE_1155_DELIVERY_CONTRACT ||
    process.env.REALIFE_1155_DELIVERY_CONTRACT ||
    null
);

function forcedMarketTypeByContract(contract: string | null) {
  const c = normAddr(contract);
  if (!c) return null;

  if (PUBLIC_DELIVERY_CONTRACT && c === PUBLIC_DELIVERY_CONTRACT) {
    return "DELIVERY" as const;
  }

  if (
    (PUBLIC_STANDARD_CONTRACT && c === PUBLIC_STANDARD_CONTRACT) ||
    (CAFE_CONTRACT && c === CAFE_CONTRACT) ||
    (STORE_CONTRACT && c === STORE_CONTRACT)
  ) {
    return "STANDARD" as const;
  }

  return null;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const chainIdRaw = toInt(url.searchParams.get("chainId"));
  const chainId = chainIdRaw && chainIdRaw > 0 ? chainIdRaw : null;

  const contract = normAddr(url.searchParams.get("contract"));
  const tokenId = (url.searchParams.get("tokenId") || "").trim();

  const marketTypeRaw = (url.searchParams.get("marketType") || "").toUpperCase();
  const requestedMarketType = ALLOWED_MARKET_TYPE.has(marketTypeRaw)
    ? marketTypeRaw
    : null;

  const forcedMarketType = forcedMarketTypeByContract(contract);
  const marketType = forcedMarketType || requestedMarketType;

  const marketplaceContract = normAddr(url.searchParams.get("marketplaceContract"));

  const listingsTake = Math.max(
    1,
    Math.min(toInt(url.searchParams.get("listingsTake")) ?? 50, 200)
  );

  const tradesTake = Math.max(
    1,
    Math.min(toInt(url.searchParams.get("tradesTake")) ?? 100, 500)
  );

  if (!chainId || !contract || !tokenId) {
    return NextResponse.json(
      { ok: false, error: "Missing chainId/contract/tokenId" },
      { status: 400 }
    );
  }

  try {
    const mint = await prisma.mint.findUnique({
      where: {
        chainId_contract_tokenId: {
          chainId,
          contract,
          tokenId,
        },
      },
      select: {
        chainId: true,
        contract: true,
        tokenId: true,
        name: true,
        image: true,
        tokenUri: true,
        txHash: true,
        verified: true,
        createdAt: true,

        deliveryEnabled: true,
        physicalItemIncluded: true,
        officialItem: true,

        animationUrl: true,
        description: true,
        collection: true,
        brand: true,
        project: true,
        item: true,
        rarity: true,
        category: true,
        mediaKind: true,
        metadataSyncedAt: true,
        metadataError: true,
      },
    });

    if (!mint || !mint.verified) {
      return NextResponse.json(
        { ok: false, error: "NFT_NOT_FOUND_OR_NOT_VERIFIED" },
        { status: 404 }
      );
    }

    const listingsWhere: any = {
      chainId,
      contract,
      tokenId,
      status: "ACTIVE",
      mint: {
        is: {
          verified: true,
        },
      },
    };

    const tradesWhere: any = {
      chainId,
      contract,
      tokenId,
      mint: {
        is: {
          verified: true,
        },
      },
    };

    if (marketType) {
      listingsWhere.marketType = marketType;
      tradesWhere.marketType = marketType;
    }

    if (marketplaceContract) {
      listingsWhere.marketplaceContract = marketplaceContract;
      tradesWhere.marketplaceContract = marketplaceContract;
    }

    const [listings, trades] = await Promise.all([
      prisma.listing.findMany({
        where: listingsWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: listingsTake,
        select: {
          id: true,
          standard: true,
          marketType: true,
          marketplaceContract: true,

          sellerWallet: true,
          seller: {
            select: {
              handle: true,
              publicId: true,
            },
          },

          marketplaceListingId: true,
          pricePerUnitWei: true,
          amountTotal: true,
          amountRemaining: true,

          deliveryEnabled: true,
          physicalItemIncluded: true,
          officialItem: true,

          createdAt: true,
        },
      }),
      prisma.trade.findMany({
        where: tradesWhere,
        orderBy: [{ blockTime: "desc" }, { id: "desc" }],
        take: tradesTake,
        select: {
          txHash: true,
          logIndex: true,
          blockNum: true,
          blockTime: true,

          marketType: true,
          marketplaceContract: true,
          marketplaceListingId: true,
          marketplacePurchaseId: true,

          sellerWallet: true,
          buyerWallet: true,

          amount: true,
          pricePerUnitWei: true,
          totalPriceWei: true,
        },
      }),
    ]);

    const floorWei =
      listings.length === 0
        ? null
        : listings.reduce(
            (min, x) => (x.pricePerUnitWei < min ? x.pricePerUnitWei : min),
            listings[0].pricePerUnitWei
          );

    const lastSaleWei = trades[0]?.totalPriceWei ?? null;
    const volumeTotalWei = trades.reduce((acc, t) => acc + t.totalPriceWei, 0n);

    return NextResponse.json({
      ok: true,
      mint: {
        chainId: mint.chainId,
        contract: mint.contract,
        tokenId: mint.tokenId,
        name: mint.name,
        image: mint.image,
        tokenUri: mint.tokenUri,
        txHash: mint.txHash,
        verified: mint.verified,
        createdAt: mint.createdAt.toISOString(),

        deliveryEnabled: mint.deliveryEnabled,
        physicalItemIncluded: mint.physicalItemIncluded,
        officialItem: mint.officialItem,

        animationUrl: mint.animationUrl ?? null,
        description: mint.description ?? null,
        collection: mint.collection ?? null,
        brand: mint.brand ?? null,
        project: mint.project ?? null,
        item: mint.item ?? null,
        rarity: mint.rarity ?? null,
        category: mint.category ?? null,
        mediaKind: mint.mediaKind ?? null,
        metadataSyncedAt: mint.metadataSyncedAt
          ? mint.metadataSyncedAt.toISOString()
          : null,
        metadataError: mint.metadataError ?? null,
      },
      stats: {
        activeListings: listings.length,
        tradesCount: trades.length,
        floorWei: floorWei ? s(floorWei) : null,
        lastSaleWei: lastSaleWei ? s(lastSaleWei) : null,
        volumeTotalWei: s(volumeTotalWei),
      },
      listings: listings.map((r) => ({
        id: r.id,
        standard: r.standard,
        marketType: forcedMarketTypeByContract(contract) || r.marketType,
        marketplaceContract: r.marketplaceContract,

        sellerWallet: r.sellerWallet,
        seller: r.seller,

        marketplaceListingId: s(r.marketplaceListingId),
        pricePerUnitWei: s(r.pricePerUnitWei),
        amountTotal: s(r.amountTotal),
        amountRemaining: s(r.amountRemaining),

        deliveryEnabled: r.deliveryEnabled,
        physicalItemIncluded: r.physicalItemIncluded,
        officialItem: r.officialItem,

        createdAt: r.createdAt.toISOString(),
      })),
      trades: trades.map((t) => ({
        txHash: t.txHash,
        logIndex: t.logIndex,
        blockNum: s(t.blockNum),
        blockTime: t.blockTime.toISOString(),

        marketType: forcedMarketTypeByContract(contract) || t.marketType,
        marketplaceContract: t.marketplaceContract,
        marketplaceListingId: t.marketplaceListingId
          ? s(t.marketplaceListingId)
          : null,
        marketplacePurchaseId: t.marketplacePurchaseId
          ? s(t.marketplacePurchaseId)
          : null,

        sellerWallet: t.sellerWallet,
        buyerWallet: t.buyerWallet,

        amount: s(t.amount),
        pricePerUnitWei: s(t.pricePerUnitWei),
        totalPriceWei: s(t.totalPriceWei),
      })),
    });
  } catch (e) {
    console.error("[API_MARKET_NFT_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}