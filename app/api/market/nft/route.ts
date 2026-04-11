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

function normText(v: string | null | undefined) {
  return String(v || "").trim().toLowerCase();
}

const ALLOWED_MARKET_TYPE = new Set(["STANDARD", "PROTECTED"]);

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

type ForcedMarketType = "STANDARD" | "PROTECTED";

function fixedMarketTypeByContract(
  contract: string | null
): ForcedMarketType | null {
  const c = normAddr(contract);
  if (!c) return null;

  if (CAFE_CONTRACT && c === CAFE_CONTRACT) return "STANDARD";
  if (STORE_CONTRACT && c === STORE_CONTRACT) return "STANDARD";

  if (PUBLIC_DELIVERY_CONTRACT && c === PUBLIC_DELIVERY_CONTRACT) {
    return "PROTECTED";
  }

  if (PUBLIC_STANDARD_CONTRACT && c === PUBLIC_STANDARD_CONTRACT) {
    return null;
  }

  return null;
}

function isProtectedFulfillment(v: string | null | undefined) {
  const x = String(v || "").trim().toUpperCase();
  return (
    x === "PHYSICAL_GOOD" ||
    x === "DIGITAL_SERVICE" ||
    x === "ONLINE_SESSION" ||
    x === "LOCAL_SERVICE"
  );
}

function textLooksProtected(...values: Array<string | null | undefined>) {
  const s = values.map(normText).filter(Boolean).join(" ");
  if (!s) return false;

  const needles = [
    "service",
    "services",
    "digital service",
    "online session",
    "local service",
    "consultation",
    "consulting",
    "lesson",
    "lessons",
    "training",
    "coaching",
    "website",
    "web design",
    "web development",
    "development",
    "design",
    "smm",
    "marketing work",
    "promo work",
    "ai work",
  ];

  return needles.some((x) => s.includes(x));
}

function suggestedMarketTypeFromAsset(input: {
  fulfillmentType?: string | null;
  deliveryEnabled?: boolean | null;
  physicalItemIncluded?: boolean | null;
  category?: string | null;
  subcategory?: string | null;
}) {
  if (isProtectedFulfillment(input.fulfillmentType)) {
    return "PROTECTED" as const;
  }

  if (input.deliveryEnabled || input.physicalItemIncluded) {
    return "PROTECTED" as const;
  }

  if (textLooksProtected(input.category, input.subcategory)) {
    return "PROTECTED" as const;
  }

  return "STANDARD" as const;
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

  const marketplaceContract = normAddr(
    url.searchParams.get("marketplaceContract")
  );

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
        fulfillmentType: true,
        category: true,
        subcategory: true,
        createdAt: true,
      },
    });

    if (!mint || !mint.verified) {
      return NextResponse.json(
        { ok: false, error: "NFT_NOT_FOUND_OR_NOT_VERIFIED" },
        { status: 404 }
      );
    }

    const suggestedMarketType = suggestedMarketTypeFromAsset({
      fulfillmentType: mint.fulfillmentType,
      deliveryEnabled: mint.deliveryEnabled,
      physicalItemIncluded: mint.physicalItemIncluded,
      category: mint.category,
      subcategory: mint.subcategory,
    });

    const resolvedMarketType =
      fixedMarketTypeByContract(contract) ||
      requestedMarketType ||
      suggestedMarketType;

    const listingsWhere: any = {
      chainId,
      contract,
      tokenId,
      status: "ACTIVE",
      marketType: resolvedMarketType,
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
      marketType: resolvedMarketType,
      mint: {
        is: {
          verified: true,
        },
      },
    };

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
        fulfillmentType: mint.fulfillmentType,
        category: mint.category,
        subcategory: mint.subcategory,
        suggestedMarketType,
        resolvedMarketType,
      },
      stats: {
        activeListings: listings.length,
        tradesCount: trades.length,
        floorWei: floorWei ? s(floorWei) : null,
        lastSaleWei: lastSaleWei ? s(lastSaleWei) : null,
        volumeTotalWei: s(volumeTotalWei),
      },
      listings: listings.map((r) => {
        const rowSuggestedMarketType = suggestedMarketTypeFromAsset({
          fulfillmentType: r.fulfillmentType,
          deliveryEnabled: r.deliveryEnabled,
          physicalItemIncluded: r.physicalItemIncluded,
          category: r.category,
          subcategory: r.subcategory,
        });

        return {
          id: r.id,
          standard: r.standard,
          marketType:
            fixedMarketTypeByContract(r.contract) ||
            r.marketType ||
            rowSuggestedMarketType,
          suggestedMarketType: rowSuggestedMarketType,
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
          fulfillmentType: r.fulfillmentType,
          category: r.category,
          subcategory: r.subcategory,

          createdAt: r.createdAt.toISOString(),
        };
      }),
      trades: trades.map((t) => {
        const rowSuggestedMarketType = suggestedMarketTypeFromAsset({
          fulfillmentType: t.fulfillmentType,
          deliveryEnabled: null,
          physicalItemIncluded: null,
          category: t.category,
          subcategory: t.subcategory,
        });

        return {
          txHash: t.txHash,
          logIndex: t.logIndex,
          blockNum: s(t.blockNum),
          blockTime: t.blockTime.toISOString(),

          marketType:
            fixedMarketTypeByContract(contract) ||
            t.marketType ||
            rowSuggestedMarketType,
          marketplaceContract: t.marketplaceContract,
          marketplaceListingId: t.marketplaceListingId
            ? s(t.marketplaceListingId)
            : null,
          marketplacePurchaseId: t.marketplacePurchaseId
            ? s(t.marketplacePurchaseId)
            : null,

          fulfillmentType: t.fulfillmentType,
          category: t.category,
          subcategory: t.subcategory,

          sellerWallet: t.sellerWallet,
          buyerWallet: t.buyerWallet,

          amount: s(t.amount),
          pricePerUnitWei: s(t.pricePerUnitWei),
          totalPriceWei: s(t.totalPriceWei),
        };
      }),
    });
  } catch (e) {
    console.error("[API_MARKET_NFT_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}