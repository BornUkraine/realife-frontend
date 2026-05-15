import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ipfsToHttp } from "@/lib/ipfs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type MarketType = "STANDARD" | "PROTECTED";
type SortMode = "new" | "priceAsc" | "priceDesc";

function s(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "bigint") return v.toString();
  return String(v);
}

function toInt(v: string | null) {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function normAddr(v?: string | null) {
  const x = String(v || "").trim();
  return x ? x.toLowerCase() : null;
}

function cleanText(v: string | null | undefined, max = 160) {
  const x = String(v || "").trim();
  return x ? x.slice(0, max) : null;
}

function parseWei(v: string | null) {
  const x = String(v || "").trim();
  if (!x || !/^\d+$/.test(x)) return null;

  try {
    return BigInt(x);
  } catch {
    return null;
  }
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

const ALLOWED_STATUS = new Set(["ACTIVE", "CANCELLED", "SOLD_OUT"]);
const ALLOWED_SORT = new Set<SortMode>(["new", "priceAsc", "priceDesc"]);
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

// ✅ Protected ERC-1155 mint contract — listings on this contract are
// always PROTECTED market type because the contract itself is the routing
// signal for the USDC escrow marketplace.
const PUBLIC_PROTECTED_CONTRACT = normAddr(
  process.env.NEXT_PUBLIC_REALIFE_PROTECTED_1155_ADDRESS ||
    process.env.REALIFE_PROTECTED_1155_ADDRESS ||
    process.env.ALLOWED_PROTECTED_NFTS ||
    null
);

const ACTIVE_PROTECTED_USDC_MARKETPLACE = normAddr(
  process.env.NEXT_PUBLIC_REALIFE_PROTECTED_MARKETPLACE_USDC_CONTRACT ||
    process.env.REALIFE_PROTECTED_MARKETPLACE_USDC_CONTRACT ||
    null
);

function orderByForSort(sort: SortMode) {
  if (sort === "priceAsc") {
    return [{ pricePerUnitWei: "asc" as const }, { createdAt: "desc" as const }];
  }

  if (sort === "priceDesc") {
    return [{ pricePerUnitWei: "desc" as const }, { createdAt: "desc" as const }];
  }

  return [{ createdAt: "desc" as const }, { id: "desc" as const }];
}

function suggestedMarketTypeFromSimple(input: {
  contract?: string | null;
  marketType?: string | null;
  fulfillmentType?: string | null;
  deliveryEnabled?: boolean | null;
  physicalItemIncluded?: boolean | null;
  category?: string | null;
  subcategory?: string | null;
}): MarketType {
  const contract = normAddr(input.contract);

  if (CAFE_CONTRACT && contract === CAFE_CONTRACT) return "STANDARD";
  if (STORE_CONTRACT && contract === STORE_CONTRACT) return "STANDARD";

  // Anything that comes from the protected NFT mint contract is locked to
  // PROTECTED — that is the whole point of having a separate contract.
  if (PUBLIC_PROTECTED_CONTRACT && contract === PUBLIC_PROTECTED_CONTRACT) {
    return "PROTECTED";
  }

  if (input.marketType === "PROTECTED") return "PROTECTED";
  if (input.marketType === "STANDARD") return "STANDARD";

  const ft = String(input.fulfillmentType || "").toUpperCase();

  if (
    ft === "PHYSICAL_GOOD" ||
    ft === "DIGITAL_SERVICE" ||
    ft === "ONLINE_SESSION" ||
    ft === "LOCAL_SERVICE"
  ) {
    return "PROTECTED";
  }

  if (input.deliveryEnabled || input.physicalItemIncluded) return "PROTECTED";

  const text = `${input.category || ""} ${input.subcategory || ""}`.toLowerCase();

  if (
    text.includes("service") ||
    text.includes("website") ||
    text.includes("design") ||
    text.includes("development") ||
    text.includes("consulting") ||
    text.includes("training") ||
    text.includes("coaching") ||
    text.includes("lesson") ||
    text.includes("session") ||
    text.includes("repair") ||
    text.includes("fitness") ||
    text.includes("marketing") ||
    text.includes("automation")
  ) {
    return "PROTECTED";
  }

  return "STANDARD";
}

function mediaFromMint(m: any) {
  const image =
    ipfsToHttp(m?.metaImage || null) || ipfsToHttp(m?.image || null) || null;

  const animation = ipfsToHttp(m?.metaAnimation || null) || null;

  const kind =
    m?.metaMediaKind === "video" || isLikelyVideoUrl(animation)
      ? "video"
      : "image";

  return {
    kind,
    src: kind === "video" ? animation : image,
    poster: kind === "video" ? image : null,
    image,
  };
}


function fulfillmentGroupFromSimple(input: {
  contract?: string | null;
  marketType?: string | null;
  fulfillmentType?: string | null;
  deliveryEnabled?: boolean | null;
  physicalItemIncluded?: boolean | null;
  category?: string | null;
  subcategory?: string | null;
}): "product" | "service" | "standard" {
  const resolved = suggestedMarketTypeFromSimple(input);
  if (resolved !== "PROTECTED") return "standard";

  const ft = String(input.fulfillmentType || "").toUpperCase();

  if (
    ft === "PHYSICAL_GOOD" ||
    input.deliveryEnabled ||
    input.physicalItemIncluded
  ) {
    return "product";
  }

  if (
    ft === "DIGITAL_SERVICE" ||
    ft === "ONLINE_SESSION" ||
    ft === "LOCAL_SERVICE"
  ) {
    return "service";
  }

  const text = `${input.category || ""} ${input.subcategory || ""}`.toLowerCase();

  if (
    text.includes("service") ||
    text.includes("website") ||
    text.includes("design") ||
    text.includes("development") ||
    text.includes("consult") ||
    text.includes("coaching") ||
    text.includes("session") ||
    text.includes("tour") ||
    text.includes("repair")
  ) {
    return "service";
  }

  return "product";
}

function textMatch(value: unknown, q: string) {
  return String(value || "").toLowerCase().includes(q.toLowerCase());
}

function tagsMatch(tags: unknown, q: string) {
  if (!Array.isArray(tags)) return false;
  return tags.some((tag) => textMatch(tag, q));
}

function aiIndexMatch(aiIndex: any, q: string) {
  if (!aiIndex) return false;

  return (
    textMatch(aiIndex.visualText, q) ||
    textMatch(aiIndex.visualSummary, q) ||
    textMatch(aiIndex.detectedProduct, q) ||
    textMatch(aiIndex.detectedService, q) ||
    textMatch(aiIndex.detectedCategory, q) ||
    textMatch(aiIndex.detectedBrand, q) ||
    textMatch(aiIndex.detectedCountry, q) ||
    textMatch(aiIndex.detectedRegion, q) ||
    textMatch(aiIndex.detectedCity, q) ||
    textMatch(aiIndex.detectedArea, q) ||
    tagsMatch(aiIndex.searchTags, q)
  );
}

function aiIndexLocationMatch(aiIndex: any, q: string) {
  if (!aiIndex) return false;

  return (
    textMatch(aiIndex.visualText, q) ||
    textMatch(aiIndex.visualSummary, q) ||
    textMatch(aiIndex.detectedCountry, q) ||
    textMatch(aiIndex.detectedRegion, q) ||
    textMatch(aiIndex.detectedCity, q) ||
    textMatch(aiIndex.detectedArea, q) ||
    tagsMatch(aiIndex.searchTags, q)
  );
}

function aiIndexCategoryMatch(aiIndex: any, q: string) {
  if (!aiIndex) return false;

  return (
    textMatch(aiIndex.visualText, q) ||
    textMatch(aiIndex.visualSummary, q) ||
    textMatch(aiIndex.detectedProduct, q) ||
    textMatch(aiIndex.detectedService, q) ||
    textMatch(aiIndex.detectedCategory, q) ||
    textMatch(aiIndex.detectedBrand, q) ||
    tagsMatch(aiIndex.searchTags, q)
  );
}

function aiIndexToJson(aiIndex: any) {
  if (!aiIndex) return null;

  return {
    status: aiIndex.status ?? null,
    visualText: aiIndex.visualText ?? null,
    visualSummary: aiIndex.visualSummary ?? null,

    detectedProduct: aiIndex.detectedProduct ?? null,
    detectedService: aiIndex.detectedService ?? null,
    detectedCategory: aiIndex.detectedCategory ?? null,
    detectedBrand: aiIndex.detectedBrand ?? null,

    detectedCountry: aiIndex.detectedCountry ?? null,
    detectedRegion: aiIndex.detectedRegion ?? null,
    detectedCity: aiIndex.detectedCity ?? null,
    detectedArea: aiIndex.detectedArea ?? null,

    searchTags: Array.isArray(aiIndex.searchTags) ? aiIndex.searchTags : [],
    confidence: aiIndex.confidence ?? null,
    enrichedAt: aiIndex.enrichedAt ? aiIndex.enrichedAt.toISOString() : null,
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const statusRaw = String(url.searchParams.get("status") || "ACTIVE").toUpperCase();
  const status = ALLOWED_STATUS.has(statusRaw) ? statusRaw : "ACTIVE";

  const sortRaw = String(url.searchParams.get("sort") || "new") as SortMode;
  const sort = ALLOWED_SORT.has(sortRaw) ? sortRaw : "new";

  const take = Math.max(
    1,
    Math.min(toInt(url.searchParams.get("take")) ?? 24, 100)
  );

  const skip = Math.max(toInt(url.searchParams.get("skip")) ?? 0, 0);

  const chainIdRaw = toInt(url.searchParams.get("chainId"));
  const chainId = chainIdRaw && chainIdRaw > 0 ? chainIdRaw : null;

  const contract = normAddr(url.searchParams.get("contract"));
  const seller = normAddr(url.searchParams.get("seller"));
  const marketplaceContract = normAddr(
    url.searchParams.get("marketplaceContract")
  );

  const q = cleanText(url.searchParams.get("q"), 160);
  const category = cleanText(url.searchParams.get("category"), 120);
  const subcategory = cleanText(url.searchParams.get("subcategory"), 120);
  const serviceCountry = cleanText(url.searchParams.get("serviceCountry"), 120);
  const serviceCity = cleanText(url.searchParams.get("serviceCity"), 120);
  const serviceArea = cleanText(url.searchParams.get("serviceArea"), 120);
  const fulfillmentType = cleanText(url.searchParams.get("fulfillmentType"), 80);
  const fulfillmentGroupRaw = cleanText(url.searchParams.get("fulfillmentGroup"), 40);
  const fulfillmentGroup =
    fulfillmentGroupRaw === "product" ||
    fulfillmentGroupRaw === "service" ||
    fulfillmentGroupRaw === "standard"
      ? fulfillmentGroupRaw
      : null;

  const minPriceWei = parseWei(url.searchParams.get("minPriceWei"));
  const maxPriceWei = parseWei(url.searchParams.get("maxPriceWei"));

  const marketTypeRaw = String(url.searchParams.get("marketType") || "").toUpperCase();
  const requestedMarketType = ALLOWED_MARKET_TYPE.has(marketTypeRaw as MarketType)
    ? (marketTypeRaw as MarketType)
    : null;

  try {
    const where: any = {
      status,
      adminHidden: false,
      mint: {
        is: {
          verified: true,
        },
      },
    };

    if (chainId !== null) where.chainId = chainId;
    if (contract) where.contract = contract;
    if (seller) where.sellerWallet = seller;
    if (marketplaceContract) where.marketplaceContract = marketplaceContract;

    if (requestedMarketType && !contract) {
      where.marketType = requestedMarketType;
      if (requestedMarketType === "PROTECTED" && ACTIVE_PROTECTED_USDC_MARKETPLACE) {
        where.marketplaceContract = ACTIVE_PROTECTED_USDC_MARKETPLACE;
      }
    }

    if (requestedMarketType && contract) {
      if (CAFE_CONTRACT && contract === CAFE_CONTRACT) {
        // Cafe is standard by product logic.
      } else if (STORE_CONTRACT && contract === STORE_CONTRACT) {
        // Store is standard by product logic.
      } else {
        where.marketType = requestedMarketType;
        if (requestedMarketType === "PROTECTED" && ACTIVE_PROTECTED_USDC_MARKETPLACE) {
          where.marketplaceContract = ACTIVE_PROTECTED_USDC_MARKETPLACE;
        }
      }
    }

    if (minPriceWei !== null || maxPriceWei !== null) {
      where.pricePerUnitWei = {};
      if (minPriceWei !== null) where.pricePerUnitWei.gte = minPriceWei;
      if (maxPriceWei !== null) where.pricePerUnitWei.lte = maxPriceWei;
    }

    const rawRows = await prisma.listing.findMany({
      where,
      orderBy: orderByForSort(sort),
      take: take + 100,
      skip,
      select: {
        id: true,
        chainId: true,
        contract: true,
        tokenId: true,
        standard: true,
        status: true,
        marketType: true,
        marketplaceContract: true,
        paymentTokenAddress: true,
        paymentSymbol: true,
        paymentDecimals: true,
        marketplaceListingId: true,
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
        createdAt: true,
        seller: {
          select: {
            handle: true,
            publicId: true,
          },
        },
        mint: {
          select: {
            chainId: true,
            contract: true,
            tokenId: true,
            name: true,
            image: true,
            tokenUri: true,
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
            metaCollection: true,
            metaItem: true,
            metaRarity: true,
            metaBrand: true,
            metaProject: true,

            aiIndex: {
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
                enrichedAt: true,
              },
            },
          },
        },
      },
    } as any);

    let rows = rawRows as any[];

    if (requestedMarketType) {
      rows = rows.filter((r) => {
        const resolved = suggestedMarketTypeFromSimple({
          contract: r.contract,
          marketType: r.marketType,
          fulfillmentType: r.fulfillmentType ?? r.mint?.fulfillmentType,
          deliveryEnabled: r.deliveryEnabled ?? r.mint?.deliveryEnabled,
          physicalItemIncluded:
            r.physicalItemIncluded ?? r.mint?.physicalItemIncluded,
          category: r.category ?? r.mint?.category,
          subcategory: r.subcategory ?? r.mint?.subcategory,
        });

        return resolved === requestedMarketType;
      });
    }

    if (fulfillmentGroup) {
      rows = rows.filter((r) => {
        const resolvedGroup = fulfillmentGroupFromSimple({
          contract: r.contract,
          marketType: r.marketType,
          fulfillmentType: r.fulfillmentType ?? r.mint?.fulfillmentType,
          deliveryEnabled: r.deliveryEnabled ?? r.mint?.deliveryEnabled,
          physicalItemIncluded:
            r.physicalItemIncluded ?? r.mint?.physicalItemIncluded,
          category: r.category ?? r.mint?.category,
          subcategory: r.subcategory ?? r.mint?.subcategory,
        });

        return resolvedGroup === fulfillmentGroup;
      });
    }

    if (fulfillmentType) {
      rows = rows.filter((r) => {
        const ft = String(r.fulfillmentType || r.mint?.fulfillmentType || "");
        return ft.toUpperCase() === fulfillmentType.toUpperCase();
      });
    }

    if (category) {
      rows = rows.filter((r) => {
        return (
          textMatch(r.category, category) ||
          textMatch(r.mint?.category, category) ||
          textMatch(r.mint?.metaDescription, category) ||
          textMatch(r.mint?.metaItem, category) ||
          textMatch(r.mint?.metaCollection, category) ||
          aiIndexCategoryMatch(r.mint?.aiIndex, category)
        );
      });
    }

    if (subcategory) {
      rows = rows.filter((r) => {
        return (
          textMatch(r.subcategory, subcategory) ||
          textMatch(r.mint?.subcategory, subcategory) ||
          textMatch(r.mint?.metaDescription, subcategory) ||
          textMatch(r.mint?.metaItem, subcategory) ||
          textMatch(r.mint?.metaCollection, subcategory) ||
          textMatch(r.mint?.metaBrand, subcategory) ||
          textMatch(r.mint?.metaProject, subcategory) ||
          aiIndexCategoryMatch(r.mint?.aiIndex, subcategory)
        );
      });
    }

    if (serviceCountry) {
      rows = rows.filter((r) => {
        return (
          textMatch(r.serviceCountry, serviceCountry) ||
          textMatch(r.mint?.serviceCountry, serviceCountry) ||
          textMatch(r.mint?.metaDescription, serviceCountry) ||
          textMatch(r.mint?.metaItem, serviceCountry) ||
          textMatch(r.mint?.metaCollection, serviceCountry) ||
          textMatch(r.mint?.metaBrand, serviceCountry) ||
          textMatch(r.mint?.metaProject, serviceCountry) ||
          aiIndexLocationMatch(r.mint?.aiIndex, serviceCountry)
        );
      });
    }

    if (serviceCity) {
      rows = rows.filter((r) => {
        return (
          textMatch(r.serviceCity, serviceCity) ||
          textMatch(r.mint?.serviceCity, serviceCity) ||
          textMatch(r.mint?.metaDescription, serviceCity) ||
          textMatch(r.mint?.metaItem, serviceCity) ||
          textMatch(r.mint?.metaCollection, serviceCity) ||
          aiIndexLocationMatch(r.mint?.aiIndex, serviceCity)
        );
      });
    }

    if (serviceArea) {
      rows = rows.filter((r) => {
        return (
          textMatch(r.serviceArea, serviceArea) ||
          textMatch(r.mint?.serviceArea, serviceArea) ||
          textMatch(r.mint?.metaDescription, serviceArea) ||
          textMatch(r.mint?.metaItem, serviceArea) ||
          textMatch(r.mint?.metaCollection, serviceArea) ||
          aiIndexLocationMatch(r.mint?.aiIndex, serviceArea)
        );
      });
    }

    if (q) {
      rows = rows.filter((r) => {
        return (
          textMatch(r.tokenId, q) ||
          textMatch(r.contract, q) ||
          textMatch(r.sellerWallet, q) ||
          textMatch(r.category, q) ||
          textMatch(r.subcategory, q) ||
          textMatch(r.serviceCountry, q) ||
          textMatch(r.serviceCity, q) ||
          textMatch(r.serviceArea, q) ||
          textMatch(r.mint?.name, q) ||
          textMatch(r.mint?.category, q) ||
          textMatch(r.mint?.subcategory, q) ||
          textMatch(r.mint?.serviceCountry, q) ||
          textMatch(r.mint?.serviceCity, q) ||
          textMatch(r.mint?.serviceArea, q) ||
          textMatch(r.mint?.metaDescription, q) ||
          textMatch(r.mint?.metaCollection, q) ||
          textMatch(r.mint?.metaItem, q) ||
          textMatch(r.mint?.metaRarity, q) ||
          textMatch(r.mint?.metaBrand, q) ||
          textMatch(r.mint?.metaProject, q) ||
          aiIndexMatch(r.mint?.aiIndex, q)
        );
      });
    }

    const hasMore = rows.length > take;
    const pageRows = rows.slice(0, take);

    const listings = pageRows.map((r) => {
      const m = r.mint || null;
      const media = mediaFromMint(m);

      const suggestedMarketType = suggestedMarketTypeFromSimple({
        contract: r.contract,
        marketType: r.marketType,
        fulfillmentType: r.fulfillmentType ?? m?.fulfillmentType,
        deliveryEnabled: r.deliveryEnabled ?? m?.deliveryEnabled,
        physicalItemIncluded: r.physicalItemIncluded ?? m?.physicalItemIncluded,
        category: r.category ?? m?.category,
        subcategory: r.subcategory ?? m?.subcategory,
      });

      return {
        id: r.id,
        chainId: r.chainId,
        contract: r.contract,
        tokenId: r.tokenId,
        standard: r.standard,
        status: r.status,

        marketType: suggestedMarketType,
        suggestedMarketType,
        marketplaceContract: r.marketplaceContract,
        paymentTokenAddress: r.paymentTokenAddress ?? null,
        paymentSymbol: r.paymentSymbol ?? (suggestedMarketType === "PROTECTED" ? "USDC" : null),
        paymentDecimals: r.paymentDecimals ?? (suggestedMarketType === "PROTECTED" ? 6 : null),

        sellerWallet: r.sellerWallet,
        seller: r.seller || null,

        marketplaceListingId: s(r.marketplaceListingId),
        pricePerUnitWei: s(r.pricePerUnitWei),
        amountTotal: s(r.amountTotal),
        amountRemaining: s(r.amountRemaining),

        deliveryEnabled: r.deliveryEnabled ?? m?.deliveryEnabled ?? null,
        physicalItemIncluded:
          r.physicalItemIncluded ?? m?.physicalItemIncluded ?? null,
        officialItem: r.officialItem ?? m?.officialItem ?? null,
        fulfillmentType: r.fulfillmentType ?? m?.fulfillmentType ?? null,
        category: r.category ?? m?.category ?? null,
        subcategory: r.subcategory ?? m?.subcategory ?? null,
        serviceCountry: r.serviceCountry ?? m?.serviceCountry ?? null,
        serviceCity: r.serviceCity ?? m?.serviceCity ?? null,
        serviceArea: r.serviceArea ?? m?.serviceArea ?? null,

        createdAt: r.createdAt ? r.createdAt.toISOString() : null,

        media,

        metaCollection: m?.metaCollection || null,
        metaItem: m?.metaItem || null,
        metaRarity: m?.metaRarity || null,
        metaBrand: m?.metaBrand || null,
        metaProject: m?.metaProject || null,
        metaDescription: m?.metaDescription || null,

        aiIndex: aiIndexToJson(m?.aiIndex),

        mint: m
          ? {
              name: m.name,
              image: m.image,
              tokenUri: m.tokenUri,
              verified: m.verified,
              deliveryEnabled: m.deliveryEnabled,
              physicalItemIncluded: m.physicalItemIncluded,
              officialItem: m.officialItem,
              fulfillmentType: m.fulfillmentType,
              category: m.category,
              subcategory: m.subcategory,
              serviceCountry: m.serviceCountry,
              serviceCity: m.serviceCity,
              serviceArea: m.serviceArea,
              suggestedMarketType: suggestedMarketTypeFromSimple({
                contract: m.contract,
                fulfillmentType: m.fulfillmentType,
                deliveryEnabled: m.deliveryEnabled,
                physicalItemIncluded: m.physicalItemIncluded,
                category: m.category,
                subcategory: m.subcategory,
              }),
            }
          : null,
      };
    });

    return NextResponse.json({
      ok: true,
      mode: "visual-ai-search",
      total: skip + listings.length + (hasMore ? 1 : 0),
      hasMore,
      filters: {
        q,
        category,
        subcategory,
        fulfillmentType,
        fulfillmentGroup,
        serviceCountry,
        serviceCity,
        serviceArea,
        minPriceWei: minPriceWei ? minPriceWei.toString() : null,
        maxPriceWei: maxPriceWei ? maxPriceWei.toString() : null,
        sort,
        marketType: requestedMarketType,
        contract,
      },
      listings,
    });
  } catch (e: any) {
    console.error("[API_MARKET_LISTINGS_VISUAL_AI_SEARCH_ERROR]", e);

    return NextResponse.json(
      {
        ok: false,
        error: "MARKET_LISTINGS_VISUAL_AI_SEARCH_FAILED",
        message: e?.message || "Listings API failed",
      },
      { status: 500 }
    );
  }
}
