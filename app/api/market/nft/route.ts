import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ipfsToHttp } from "@/lib/ipfs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * NFT detail endpoint.
 *
 * Safe fallback modes:
 * 1) ai    = metadata cache + AI visual index
 * 2) meta  = metadata cache only
 * 3) basic = minimal core fields only
 */

type MarketType = "STANDARD" | "PROTECTED";
type ForcedMarketType = "STANDARD" | "PROTECTED";
type QueryMode = "ai" | "meta" | "basic";

function s(v: unknown) {
  return typeof v === "bigint" ? v.toString() : v;
}

function toInt(v: string | null) {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function normAddr(v: string | null | undefined) {
  const x = String(v || "").trim();
  if (!x) return null;
  return x.toLowerCase();
}

function normText(v: string | null | undefined) {
  return String(v || "").trim().toLowerCase();
}

function isLikelyVideoUrl(u?: string | null) {
  const s0 = String(u || "").trim().toLowerCase();
  if (!s0) return false;

  const s1 = s0.split("?")[0]?.split("#")[0] || s0;

  return (
    s1.endsWith(".mp4") ||
    s1.endsWith(".webm") ||
    s1.endsWith(".mov") ||
    s1.endsWith(".m4v")
  );
}

const ALLOWED_MARKET_TYPE = new Set<MarketType>(["STANDARD", "PROTECTED"]);

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

function fixedMarketTypeByContract(
  contract: string | null | undefined
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

function isPublicStandardContract(contract: string | null | undefined) {
  const c = normAddr(contract);
  return Boolean(PUBLIC_STANDARD_CONTRACT && c === PUBLIC_STANDARD_CONTRACT);
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
  const text = values.map(normText).filter(Boolean).join(" ");
  if (!text) return false;

  const needles = [
    "service",
    "services",
    "digital service",
    "online session",
    "local service",
    "offline service",
    "consultation",
    "consulting",
    "lesson",
    "lessons",
    "training",
    "coaching",
    "mentor",
    "mentoring",
    "tutor",
    "tutoring",
    "website",
    "web design",
    "web development",
    "landing page",
    "development",
    "design",
    "smm",
    "seo",
    "marketing work",
    "promo work",
    "ai work",
    "automation",
    "audit",
    "call",
    "meeting",
    "session",
  ];

  return needles.some((x) => text.includes(x));
}

function suggestedMarketTypeFromAsset(input: {
  fulfillmentType?: string | null;
  deliveryEnabled?: boolean | null;
  physicalItemIncluded?: boolean | null;
  category?: string | null;
  subcategory?: string | null;
}): MarketType {
  if (isProtectedFulfillment(input.fulfillmentType)) return "PROTECTED";
  if (input.deliveryEnabled || input.physicalItemIncluded) return "PROTECTED";
  if (textLooksProtected(input.category, input.subcategory)) return "PROTECTED";
  return "STANDARD";
}

function resolveMarketType(params: {
  contract: string | null | undefined;
  suggestedMarketType: MarketType;
  requestedMarketType?: MarketType | null;
  storedMarketType?: string | null;
}): MarketType {
  const {
    contract,
    suggestedMarketType,
    requestedMarketType = null,
    storedMarketType = null,
  } = params;

  const fixed = fixedMarketTypeByContract(contract);
  if (fixed) return fixed;

  if (isPublicStandardContract(contract)) {
    if (storedMarketType === "STANDARD" || storedMarketType === "PROTECTED") {
      return storedMarketType;
    }

    if (
      requestedMarketType === "STANDARD" ||
      requestedMarketType === "PROTECTED"
    ) {
      return requestedMarketType;
    }

    return suggestedMarketType;
  }

  if (storedMarketType === "STANDARD" || storedMarketType === "PROTECTED") {
    return storedMarketType;
  }

  if (requestedMarketType === "STANDARD" || requestedMarketType === "PROTECTED") {
    return requestedMarketType;
  }

  return suggestedMarketType;
}

function mintSelectForMode(mode: QueryMode) {
  const base: any = {
    chainId: true,
    contract: true,
    tokenId: true,
    name: true,
    image: true,
    tokenUri: true,
    txHash: true,
    verified: true,
    createdAt: true,
  };

  if (mode === "meta" || mode === "ai") {
    base.deliveryEnabled = true;
    base.physicalItemIncluded = true;
    base.officialItem = true;
    base.fulfillmentType = true;
    base.category = true;
    base.subcategory = true;
    base.serviceCountry = true;
    base.serviceCity = true;
    base.serviceArea = true;

    base.metadataCachedAt = true;
    base.metaImage = true;
    base.metaAnimation = true;
    base.metaMediaKind = true;
    base.metaDescription = true;
    base.metaCollection = true;
    base.metaItem = true;
    base.metaRarity = true;
    base.metaBrand = true;
    base.metaProject = true;
  }

  if (mode === "ai") {
    base.aiIndex = {
      select: {
        status: true,
        visualText: true,
        visualSummary: true,
        detectedProduct: true,
        detectedService: true,
        detectedCategory: true,
        detectedBrand: true,
        detectedCountry: true,
        detectedRegion: true,
        detectedCity: true,
        detectedArea: true,
        searchTags: true,
        confidence: true,
        sourceImage: true,
        sourceAnimation: true,
        provider: true,
        model: true,
        error: true,
        enrichedAt: true,
      },
    };
  }

  return base;
}

function listingSelectForMode(mode: QueryMode) {
  const base: any = {
    id: true,
    standard: true,
    chainId: true,
    contract: true,
    tokenId: true,
    status: true,
    marketplaceContract: true,
    marketplaceListingId: true,
    sellerWallet: true,
    pricePerUnitWei: true,
    amountTotal: true,
    amountRemaining: true,
    createdAt: true,
    seller: {
      select: {
        handle: true,
        publicId: true,
      },
    },
  };

  if (mode === "meta" || mode === "ai") {
    base.marketType = true;
    base.deliveryEnabled = true;
    base.physicalItemIncluded = true;
    base.officialItem = true;
    base.fulfillmentType = true;
    base.category = true;
    base.subcategory = true;
    base.serviceCountry = true;
    base.serviceCity = true;
    base.serviceArea = true;
  }

  return base;
}

function tradeSelectForMode(mode: QueryMode) {
  const base: any = {
    txHash: true,
    logIndex: true,
    blockNum: true,
    blockTime: true,
    sellerWallet: true,
    buyerWallet: true,
    amount: true,
    pricePerUnitWei: true,
    totalPriceWei: true,
  };

  if (mode === "meta" || mode === "ai") {
    base.marketType = true;
    base.marketplaceContract = true;
    base.marketplaceListingId = true;
    base.marketplacePurchaseId = true;
    base.fulfillmentType = true;
    base.category = true;
    base.subcategory = true;
    base.serviceCountry = true;
    base.serviceCity = true;
    base.serviceArea = true;
  }

  return base;
}

function metadataFromMint(m: any) {
  const image =
    ipfsToHttp(m?.metaImage || null) || ipfsToHttp(m?.image || null) || null;

  const animation = ipfsToHttp(m?.metaAnimation || null) || null;

  const mediaKind =
    m?.metaMediaKind === "video" || isLikelyVideoUrl(animation)
      ? "video"
      : "image";

  return {
    image,
    animation,
    mediaKind,
    description: m?.metaDescription || null,
    collection: m?.metaCollection || null,
    item: m?.metaItem || null,
    rarity: m?.metaRarity || null,
    brand: m?.metaBrand || null,
    project: m?.metaProject || null,
  };
}

async function loadMint(input: {
  mode: QueryMode;
  chainId: number;
  contract: string;
  tokenId: string;
}) {
  return prisma.mint.findUnique({
    where: {
      chainId_contract_tokenId: {
        chainId: input.chainId,
        contract: input.contract,
        tokenId: input.tokenId,
      },
    },
    select: mintSelectForMode(input.mode) as any,
  } as any);
}

async function loadListings(input: {
  mode: QueryMode;
  chainId: number;
  contract: string;
  tokenId: string;
  marketplaceContract: string | null;
  take: number;
}) {
  const where: any = {
    chainId: input.chainId,
    contract: input.contract,
    tokenId: input.tokenId,
    status: "ACTIVE",
    mint: {
      is: {
        verified: true,
      },
    },
  };

  if (input.marketplaceContract) {
    where.marketplaceContract = input.marketplaceContract;
  }

  return prisma.listing.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: input.take,
    select: listingSelectForMode(input.mode) as any,
  } as any);
}

async function loadTrades(input: {
  mode: QueryMode;
  chainId: number;
  contract: string;
  tokenId: string;
  marketplaceContract: string | null;
  take: number;
}) {
  const where: any = {
    chainId: input.chainId,
    contract: input.contract,
    tokenId: input.tokenId,
    mint: {
      is: {
        verified: true,
      },
    },
  };

  if (input.marketplaceContract) {
    where.marketplaceContract = input.marketplaceContract;
  }

  return prisma.trade.findMany({
    where,
    orderBy: [{ blockTime: "desc" }, { id: "desc" }],
    take: input.take,
    select: tradeSelectForMode(input.mode) as any,
  } as any);
}

function listingToJson(r: any, requestedMarketType: MarketType | null) {
  const rowSuggestedMarketType = suggestedMarketTypeFromAsset({
    fulfillmentType: r?.fulfillmentType ?? null,
    deliveryEnabled: r?.deliveryEnabled ?? null,
    physicalItemIncluded: r?.physicalItemIncluded ?? null,
    category: r?.category ?? null,
    subcategory: r?.subcategory ?? null,
  });

  const rowResolvedMarketType = resolveMarketType({
    contract: r?.contract,
    suggestedMarketType: rowSuggestedMarketType,
    storedMarketType: r?.marketType,
    requestedMarketType,
  });

  return {
    id: r.id,
    standard: r.standard,
    marketType: rowResolvedMarketType,
    suggestedMarketType: rowSuggestedMarketType,
    marketplaceContract: r.marketplaceContract ?? null,

    sellerWallet: r.sellerWallet,
    seller: r.seller || null,

    marketplaceListingId: s(r.marketplaceListingId),
    pricePerUnitWei: s(r.pricePerUnitWei),
    amountTotal: s(r.amountTotal),
    amountRemaining: s(r.amountRemaining),

    deliveryEnabled: r.deliveryEnabled ?? null,
    physicalItemIncluded: r.physicalItemIncluded ?? null,
    officialItem: r.officialItem ?? null,
    fulfillmentType: r.fulfillmentType ?? null,
    category: r.category ?? null,
    subcategory: r.subcategory ?? null,
    serviceCountry: r.serviceCountry ?? null,
    serviceCity: r.serviceCity ?? null,
    serviceArea: r.serviceArea ?? null,

    createdAt: r.createdAt ? r.createdAt.toISOString() : null,
  };
}

function tradeToJson(
  t: any,
  fallbackContract: string,
  requestedMarketType: MarketType | null
) {
  const rowSuggestedMarketType = suggestedMarketTypeFromAsset({
    fulfillmentType: t?.fulfillmentType ?? null,
    deliveryEnabled: null,
    physicalItemIncluded: null,
    category: t?.category ?? null,
    subcategory: t?.subcategory ?? null,
  });

  const rowResolvedMarketType = resolveMarketType({
    contract: t?.contract || fallbackContract,
    suggestedMarketType: rowSuggestedMarketType,
    storedMarketType: t?.marketType,
    requestedMarketType,
  });

  return {
    txHash: t.txHash,
    logIndex: t.logIndex,
    blockNum: s(t.blockNum ?? null),
    blockTime: t.blockTime ? t.blockTime.toISOString() : null,

    marketType: rowResolvedMarketType,
    marketplaceContract: t.marketplaceContract ?? null,
    marketplaceListingId: t.marketplaceListingId
      ? s(t.marketplaceListingId)
      : null,
    marketplacePurchaseId: t.marketplacePurchaseId
      ? s(t.marketplacePurchaseId)
      : null,

    fulfillmentType: t.fulfillmentType ?? null,
    category: t.category ?? null,
    subcategory: t.subcategory ?? null,
    serviceCountry: t.serviceCountry ?? null,
    serviceCity: t.serviceCity ?? null,
    serviceArea: t.serviceArea ?? null,

    sellerWallet: t.sellerWallet,
    buyerWallet: t.buyerWallet,

    amount: s(t.amount ?? null),
    pricePerUnitWei: s(t.pricePerUnitWei ?? null),
    totalPriceWei: s(t.totalPriceWei ?? null),
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const chainIdRaw = toInt(url.searchParams.get("chainId"));
  const chainId = chainIdRaw && chainIdRaw > 0 ? chainIdRaw : null;

  const contract = normAddr(url.searchParams.get("contract"));
  const tokenId = (url.searchParams.get("tokenId") || "").trim();

  const marketTypeRaw = (url.searchParams.get("marketType") || "").toUpperCase();
  const requestedMarketType = ALLOWED_MARKET_TYPE.has(
    marketTypeRaw as MarketType
  )
    ? (marketTypeRaw as MarketType)
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

  const modes: QueryMode[] = ["ai", "meta", "basic"];
  const warnings: string[] = [];

  for (const mode of modes) {
    try {
      const mint = await loadMint({
        mode,
        chainId,
        contract,
        tokenId,
      });

      if (!mint || !mint.verified) {
        return NextResponse.json(
          { ok: false, error: "NFT_NOT_FOUND_OR_NOT_VERIFIED" },
          { status: 404 }
        );
      }

      const suggestedMarketType = suggestedMarketTypeFromAsset({
        fulfillmentType: mint.fulfillmentType ?? null,
        deliveryEnabled: mint.deliveryEnabled ?? null,
        physicalItemIncluded: mint.physicalItemIncluded ?? null,
        category: mint.category ?? null,
        subcategory: mint.subcategory ?? null,
      });

      const resolvedMarketType = resolveMarketType({
        contract,
        suggestedMarketType,
        requestedMarketType,
      });

      const [listingsRaw, tradesRaw] = await Promise.all([
        loadListings({
          mode,
          chainId,
          contract,
          tokenId,
          marketplaceContract,
          take: listingsTake,
        }),
        loadTrades({
          mode,
          chainId,
          contract,
          tokenId,
          marketplaceContract,
          take: tradesTake,
        }),
      ]);

      const listings = listingsRaw.map((r: any) =>
        listingToJson(r, requestedMarketType)
      );

      const trades = tradesRaw.map((t: any) =>
        tradeToJson(t, contract, requestedMarketType)
      );

      const floorWei =
        listings.length === 0
          ? null
          : listings.reduce((min: bigint | null, x: any) => {
              try {
                const price = BigInt(x.pricePerUnitWei || "0");
                if (min === null) return price;
                return price < min ? price : min;
              } catch {
                return min;
              }
            }, null);

      const lastSaleWei = trades[0]?.totalPriceWei ?? null;

      const volumeTotalWei = trades.reduce((acc: bigint, t: any) => {
        try {
          return acc + BigInt(t.totalPriceWei || "0");
        } catch {
          return acc;
        }
      }, 0n);

      const meta = metadataFromMint(mint);

      const mediaImage = meta.image || ipfsToHttp(mint.image) || null;
      const mediaAnimation = meta.animation || null;
      const mediaKind = meta.mediaKind || "image";

      return NextResponse.json({
        ok: true,
        mode,
        warnings,
        mint: {
          chainId: mint.chainId,
          contract: mint.contract,
          tokenId: mint.tokenId,
          name: mint.name,
          image: mint.image,
          tokenUri: mint.tokenUri,
          txHash: mint.txHash,
          verified: mint.verified,
          createdAt: mint.createdAt ? mint.createdAt.toISOString() : null,

          deliveryEnabled: mint.deliveryEnabled ?? null,
          physicalItemIncluded: mint.physicalItemIncluded ?? null,
          officialItem: mint.officialItem ?? null,
          fulfillmentType: mint.fulfillmentType ?? null,
          category: mint.category ?? null,
          subcategory: mint.subcategory ?? null,
          serviceCountry: mint.serviceCountry ?? null,
          serviceCity: mint.serviceCity ?? null,
          serviceArea: mint.serviceArea ?? null,

          suggestedMarketType,
          resolvedMarketType,

          media: {
            kind: mediaKind,
            src: mediaKind === "video" ? mediaAnimation : mediaImage,
            poster: mediaKind === "video" ? mediaImage : null,
            image: mediaImage,
          },

          metaCollection: meta.collection,
          metaItem: meta.item,
          metaRarity: meta.rarity,
          metaBrand: meta.brand,
          metaProject: meta.project,
          metaDescription: meta.description,

          aiIndex: mint.aiIndex
            ? {
                status: mint.aiIndex.status,
                visualText: mint.aiIndex.visualText,
                visualSummary: mint.aiIndex.visualSummary,
                detectedProduct: mint.aiIndex.detectedProduct,
                detectedService: mint.aiIndex.detectedService,
                detectedCategory: mint.aiIndex.detectedCategory,
                detectedBrand: mint.aiIndex.detectedBrand,
                detectedCountry: mint.aiIndex.detectedCountry,
                detectedRegion: mint.aiIndex.detectedRegion,
                detectedCity: mint.aiIndex.detectedCity,
                detectedArea: mint.aiIndex.detectedArea,
                searchTags: mint.aiIndex.searchTags || [],
                confidence: mint.aiIndex.confidence,
                sourceImage: mint.aiIndex.sourceImage,
                sourceAnimation: mint.aiIndex.sourceAnimation,
                provider: mint.aiIndex.provider,
                model: mint.aiIndex.model,
                error: mint.aiIndex.error,
                enrichedAt: mint.aiIndex.enrichedAt
                  ? mint.aiIndex.enrichedAt.toISOString()
                  : null,
              }
            : null,
        },

        stats: {
          activeListings: listings.length,
          tradesCount: trades.length,
          floorWei: floorWei !== null ? s(floorWei) : null,
          lastSaleWei: lastSaleWei ? s(lastSaleWei) : null,
          volumeTotalWei: s(volumeTotalWei),
        },

        listings,
        trades,
      });
    } catch (e: any) {
      warnings.push(`${mode}_query_failed`);
      console.error(`[API_MARKET_NFT_${mode.toUpperCase()}_ERROR]`, e);

      if (mode !== "basic") continue;

      return NextResponse.json(
        {
          ok: false,
          error: "MARKET_NFT_FAILED",
          message: e?.message || "NFT API failed",
          warnings,
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    {
      ok: false,
      error: "MARKET_NFT_FAILED",
      message: "Unknown NFT API error",
      warnings,
    },
    { status: 500 }
  );
}
