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

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const chainIdRaw = toInt(url.searchParams.get("chainId"));
  const chainId = chainIdRaw && chainIdRaw > 0 ? chainIdRaw : null;

  const contract = normAddr(url.searchParams.get("contract"));
  const tokenId = (url.searchParams.get("tokenId") || "").trim();

  const marketTypeRaw = (url.searchParams.get("marketType") || "").toUpperCase();
  const marketType = ALLOWED_MARKET_TYPE.has(marketTypeRaw) ? marketTypeRaw : null;

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
        deliveryEnabled: true,
        physicalItemIncluded: true,
        officialItem: true,
        createdAt: true,
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
        include: {
          seller: {
            select: {
              handle: true,
              publicId: true,
            },
          },
        },
      }),
      prisma.trade.findMany({
        where: tradesWhere,
        orderBy: [{ blockTime: "desc" }, { id: "desc" }],
        take: tradesTake,
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
        marketType: r.marketType,
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

        marketType: t.marketType,
        marketplaceContract: t.marketplaceContract,
        marketplaceListingId: t.marketplaceListingId ? s(t.marketplaceListingId) : null,
        marketplacePurchaseId: t.marketplacePurchaseId ? s(t.marketplacePurchaseId) : null,

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