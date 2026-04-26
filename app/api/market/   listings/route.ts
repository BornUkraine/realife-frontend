import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ipfsToHttp } from "@/lib/ipfs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Trading listings API.
 *
 * Important:
 * - This endpoint must NEVER break the whole trading page because of AI index,
 *   IPFS metadata fetching, or optional cache fields.
 * - It uses DB cached metadata only.
 * - It has safe fallbacks:
 *   1) ai mode: metadata + AI visual index
 *   2) meta mode: metadata cache only
 *   3) basic mode: core mint/listing fields only
 */

type MarketType = "STANDARD" | "PROTECTED";
type FixedMarketType = "STANDARD" | "PROTECTED";
type SortMode = "new" | "priceAsc" | "priceDesc";

type FulfillmentType =
  | "PHYSICAL_GOOD"
  | "DIGITAL_SERVICE"
  | "ONLINE_SESSION"
  | "LOCAL_SERVICE";

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

function cleanText(v: string | null | undefined, max = 120) {
  const x = String(v || "").trim();
  if (!x) return null;
  return x.slice(0, max);
}

function normText(v: string | null | undefined) {
  return String(v || "").trim().toLowerCase();
}

function parseWei(v: string | null) {
  const x = String(v || "").trim();
  if (!x) return null;
  if (!/^\d+$/.test(x)) return null;

  try {
    return BigInt(x);
  } catch {
    return null;
  }
}

function normalizeFulfillmentType(
  v: string | null | undefined
): FulfillmentType | null {
  const x = String(v || "").trim().toUpperCase();

  if (
    x === "PHYSICAL_GOOD" ||
    x === "DIGITAL_SERVICE" ||
    x === "ONLINE_SESSION" ||
    x === "LOCAL_SERVICE"
  ) {
    return x as FulfillmentType;
  }

  return null;
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
const ALLOWED_STANDARD = new Set(["ERC721", "ERC1155"]);
const ALLOWED_MARKET_TYPE = new Set<MarketType>(["STANDARD", "PROTECTED"]);
const ALLOWED_SORT = new Set<SortMode>(["new", "priceAsc", "priceDesc"]);

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
): FixedMarketType | null {
  const c = normAddr(contract);
  if (!c) return null;

  if (CAFE_CONTRACT && c === CAFE_CONTRACT) return "STANDARD";
  if (STORE_CONTRACT && c === STORE_CONTRACT) return "STANDARD";

  if (PUBLIC_DELIVERY_CONTRACT && c === PUBLIC_DELIVERY_CONTRACT) {
    return "PROTECTED";
  }

  // Public standard can contain both STANDARD collectible NFTs and PROTECTED service NFTs.
  if (PUBLIC_STANDARD_CONTRACT && c === PUBLIC_STANDARD_CONTRACT) {
    return null;
  }

  return null;
}

function getFixedContractMarketRules(): Array<{
  contract: string;
  marketType: FixedMarketType;
}> {
  const out: Array<{ contract: string; marketType: FixedMarketType }> = [];

  if (PUBLIC_DELIVERY_CONTRACT) {
    out.push({ contract: PUBLIC_DELIVERY_CONTRACT, marketType: "PROTECTED" });
  }

  if (CAFE_CONTRACT) {
    out.push({ contract: CAFE_CONTRACT, marketType: "STANDARD" });
  }

  if (STORE_CONTRACT) {
    out.push({ contract: STORE_CONTRACT, marketType: "STANDARD" });
  }

  return out;
}

function isProtectedFulfillment(v: string | null | undefined) {
  return Boolean(normalizeFulfillmentType(v));
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

  if (storedMarketType === "STANDARD" || storedMarketType === "PROTECTED") {
    return storedMarketType;
  }

  if (requestedMarketType === "STANDARD" || requestedMarketType === "PROTECTED") {
    return requestedMarketType;
  }

  return suggestedMarketType;
}

function textContainsFilter(field: string, value: string | null) {
  if (!value) return null;

  return {
    [field]: {
      contains: value,
      mode: "insensitive",
    },
  };
}

function relationMintTextContainsFilter(field: string, value: string | null) {
  if (!value) return null;

  return {
    mint: {
      is: {
        [field]: {
          contains: value,
          mode: "insensitive",
        },
      },
    },
  };
}

function relationMintAiTextContainsFilter(field: string, value: string | null) {
  if (!value) return null;

  return {
    mint: {
      is: {
        aiIndex: {
          is: {
            [field]: {
              contains: value,
              mode: "insensitive",
            },
          },
        },
      },
    },
  };
}

function relationMintAnyTextContainsFilter(
  fields: string[],
  value: string | null
) {
  if (!value) return null;

  const clauses = fields.map((field) => ({
    [field]: {
      contains: value,
      mode: "insensitive",
    },
  }));

  return {
    mint: {
      is: {
        OR: clauses,
      },
    },
  };
}

function aiTagVariants(value: string | null) {
  if (!value) return [];

  const raw = value.trim();
  if (!raw) return [];

  return Array.from(
    new Set(
      [
        raw,
        raw.toLowerCase(),
        raw.toUpperCase(),
        raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase(),
      ].filter(Boolean)
    )
  ).slice(0, 8);
}

function relationMintAiAnyTextContainsFilter(
  fields: string[],
  value: string | null
) {
  if (!value) return null;

  const textClauses = fields.map((field) => ({
    [field]: {
      contains: value,
      mode: "insensitive",
    },
  }));

  const variants = aiTagVariants(value);

  const tagClause =
    variants.length > 0
      ? {
          searchTags: {
            hasSome: variants,
          },
        }
      : null;

  return {
    mint: {
      is: {
        aiIndex: {
          is: {
            OR: [...textClauses, tagClause].filter(Boolean),
          },
        },
      },
    },
  };
}

function buildAiTagSearchClause(q: string | null) {
  if (!q) return null;

  const raw = q.trim();
  if (!raw) return null;

  const variants = aiTagVariants(raw);
  if (variants.length === 0) return null;

  return {
    mint: {
      is: {
        aiIndex: {
          is: {
            searchTags: {
              hasSome: variants,
            },
          },
        },
      },
    },
  };
}

function buildTextSearchClause(
  q: string | null,
  options: {
    includeMetaSearch: boolean;
    includeAiSearch: boolean;
  }
) {
  if (!q) return null;

  const query = q.slice(0, 160);
  const compactQuery = query.toLowerCase();

  const mintOr: any[] = [
    { tokenId: { contains: query, mode: "insensitive" } },
    { contract: { contains: compactQuery, mode: "insensitive" } },
    { name: { contains: query, mode: "insensitive" } },
    { category: { contains: query, mode: "insensitive" } },
    { subcategory: { contains: query, mode: "insensitive" } },
    { serviceCountry: { contains: query, mode: "insensitive" } },
    { serviceCity: { contains: query, mode: "insensitive" } },
    { serviceArea: { contains: query, mode: "insensitive" } },
  ];

  if (options.includeMetaSearch) {
    mintOr.push(
      { metaCollection: { contains: query, mode: "insensitive" } },
      { metaItem: { contains: query, mode: "insensitive" } },
      { metaRarity: { contains: query, mode: "insensitive" } },
      { metaBrand: { contains: query, mode: "insensitive" } },
      { metaProject: { contains: query, mode: "insensitive" } },
      { metaDescription: { contains: query, mode: "insensitive" } }
    );
  }

  if (options.includeAiSearch) {
    mintOr.push({
      aiIndex: {
        is: {
          OR: [
            { visualText: { contains: query, mode: "insensitive" } },
            { visualSummary: { contains: query, mode: "insensitive" } },
            { detectedProduct: { contains: query, mode: "insensitive" } },
            { detectedService: { contains: query, mode: "insensitive" } },
            { detectedCategory: { contains: query, mode: "insensitive" } },
            { detectedBrand: { contains: query, mode: "insensitive" } },
            { detectedCountry: { contains: query, mode: "insensitive" } },
            { detectedRegion: { contains: query, mode: "insensitive" } },
            { detectedCity: { contains: query, mode: "insensitive" } },
            { detectedArea: { contains: query, mode: "insensitive" } },
          ],
        },
      },
    });
  }

  const directOr: any[] = [
    { tokenId: { contains: query, mode: "insensitive" } },
    { contract: { contains: compactQuery, mode: "insensitive" } },
    { sellerWallet: { contains: compactQuery, mode: "insensitive" } },
    { category: { contains: query, mode: "insensitive" } },
    { subcategory: { contains: query, mode: "insensitive" } },
    { serviceCountry: { contains: query, mode: "insensitive" } },
    { serviceCity: { contains: query, mode: "insensitive" } },
    { serviceArea: { contains: query, mode: "insensitive" } },
    {
      mint: {
        is: {
          OR: mintOr,
        },
      },
    },
  ];

  if (options.includeAiSearch) {
    const aiTags = buildAiTagSearchClause(query);
    if (aiTags) directOr.push(aiTags);
  }

  return { OR: directOr };
}

function orderByForSort(sort: SortMode) {
  if (sort === "priceAsc") {
    return [{ pricePerUnitWei: "asc" as const }, { createdAt: "desc" as const }];
  }

  if (sort === "priceDesc") {
    return [{ pricePerUnitWei: "desc" as const }, { createdAt: "desc" as const }];
  }

  return [{ createdAt: "desc" as const }, { id: "desc" as const }];
}

function mintSelectForMode(mode: QueryMode) {
  const base: any = {
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
  };

  if (mode === "meta" || mode === "ai") {
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
        enrichedAt: true,
      },
    };
  }

  return base;
}

function listingSelectForMode(mode: QueryMode) {
  return {
    id: true,
    chainId: true,
    contract: true,
    tokenId: true,
    standard: true,
    status: true,
    marketType: true,
    marketplaceContract: true,
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
    mint: {
      select: mintSelectForMode(mode),
    },
    seller: {
      select: {
        handle: true,
        publicId: true,
      },
    },
  };
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

function buildWhere(input: {
  mode: QueryMode;
  chainId: number | null;
  contract: string | null;
  seller: string | null;
  marketplaceContract: string | null;
  q: string | null;
  category: string | null;
  subcategory: string | null;
  fulfillmentType: FulfillmentType | null;
  serviceCountry: string | null;
  serviceCity: string | null;
  serviceArea: string | null;
  minPriceWei: bigint | null;
  maxPriceWei: bigint | null;
  standard: string | null;
  status: string;
  requestedMarketType: MarketType | null;
}) {
  const includeMetaSearch = input.mode === "meta" || input.mode === "ai";
  const includeAiSearch = input.mode === "ai";

  const where: any = {
    status: input.status,
    mint: {
      is: {
        verified: true,
      },
    },
  };

  const andClauses: any[] = [];

  if (input.chainId !== null) where.chainId = input.chainId;
  if (input.seller) where.sellerWallet = input.seller;
  if (input.standard) where.standard = input.standard;
  if (input.marketplaceContract) {
    where.marketplaceContract = input.marketplaceContract;
  }

  if (input.fulfillmentType) {
    andClauses.push({
      OR: [
        { fulfillmentType: input.fulfillmentType },
        {
          mint: {
            is: {
              fulfillmentType: input.fulfillmentType,
            },
          },
        },
      ],
    });
  }

  if (input.category) {
    const categoryListing = textContainsFilter("category", input.category);
    const categoryMint = relationMintTextContainsFilter(
      "category",
      input.category
    );
    const categoryAi = includeAiSearch
      ? relationMintAiTextContainsFilter("detectedCategory", input.category)
      : null;

    andClauses.push({
      OR: [categoryListing, categoryMint, categoryAi].filter(Boolean),
    });
  }

  if (input.subcategory) {
    const subcategoryListing = textContainsFilter(
      "subcategory",
      input.subcategory
    );
    const subcategoryMint = relationMintTextContainsFilter(
      "subcategory",
      input.subcategory
    );

    const subcategoryMeta = includeMetaSearch
      ? relationMintAnyTextContainsFilter(
          ["metaDescription", "metaItem", "metaCollection", "metaBrand", "metaProject"],
          input.subcategory
        )
      : null;

    const subcategoryAi = includeAiSearch
      ? relationMintAiAnyTextContainsFilter(
          [
            "visualText",
            "visualSummary",
            "detectedProduct",
            "detectedService",
            "detectedCategory",
            "detectedBrand",
          ],
          input.subcategory
        )
      : null;

    andClauses.push({
      OR: [
        subcategoryListing,
        subcategoryMint,
        subcategoryMeta,
        subcategoryAi,
      ].filter(Boolean),
    });
  }

  const locationMintFields = includeMetaSearch
    ? [
        "serviceCountry",
        "serviceCity",
        "serviceArea",
        "metaDescription",
        "metaItem",
        "metaCollection",
        "metaBrand",
        "metaProject",
      ]
    : ["serviceCountry", "serviceCity", "serviceArea"];

  const locationAiFields = [
    "visualText",
    "visualSummary",
    "detectedProduct",
    "detectedService",
    "detectedCategory",
    "detectedBrand",
    "detectedCountry",
    "detectedRegion",
    "detectedCity",
    "detectedArea",
  ];

  if (input.serviceCountry) {
    const countryListing = textContainsFilter(
      "serviceCountry",
      input.serviceCountry
    );
    const countryMintBroad = relationMintAnyTextContainsFilter(
      locationMintFields,
      input.serviceCountry
    );
    const countryAiBroad = includeAiSearch
      ? relationMintAiAnyTextContainsFilter(
          locationAiFields,
          input.serviceCountry
        )
      : null;

    andClauses.push({
      OR: [countryListing, countryMintBroad, countryAiBroad].filter(Boolean),
    });
  }

  if (input.serviceCity) {
    const cityListing = textContainsFilter("serviceCity", input.serviceCity);
    const cityMintBroad = relationMintAnyTextContainsFilter(
      locationMintFields,
      input.serviceCity
    );
    const cityAiBroad = includeAiSearch
      ? relationMintAiAnyTextContainsFilter(locationAiFields, input.serviceCity)
      : null;

    andClauses.push({
      OR: [cityListing, cityMintBroad, cityAiBroad].filter(Boolean),
    });
  }

  if (input.serviceArea) {
    const areaListing = textContainsFilter("serviceArea", input.serviceArea);
    const areaMintBroad = relationMintAnyTextContainsFilter(
      locationMintFields,
      input.serviceArea
    );
    const areaAiBroad = includeAiSearch
      ? relationMintAiAnyTextContainsFilter(locationAiFields, input.serviceArea)
      : null;

    andClauses.push({
      OR: [areaListing, areaMintBroad, areaAiBroad].filter(Boolean),
    });
  }

  if (input.minPriceWei !== null || input.maxPriceWei !== null) {
    where.pricePerUnitWei = {};
    if (input.minPriceWei !== null) where.pricePerUnitWei.gte = input.minPriceWei;
    if (input.maxPriceWei !== null) where.pricePerUnitWei.lte = input.maxPriceWei;
  }

  const qClause = buildTextSearchClause(input.q, {
    includeMetaSearch,
    includeAiSearch,
  });

  if (qClause) andClauses.push(qClause);

  const fixedRules = getFixedContractMarketRules();
  const fixedContracts = Array.from(new Set(fixedRules.map((x) => x.contract)));

  if (input.contract) {
    where.contract = input.contract;

    const fixedMarketType = fixedMarketTypeByContract(input.contract);

    if (
      fixedMarketType &&
      input.requestedMarketType &&
      fixedMarketType !== input.requestedMarketType
    ) {
      andClauses.push({ id: "__no_matching_fixed_market_type__" });
    } else if (!fixedMarketType && input.requestedMarketType) {
      where.marketType = input.requestedMarketType;
    }
  } else {
    if (fixedRules.length > 0) {
      const fixedClauses = fixedRules
        .filter((rule) => {
          if (!input.requestedMarketType) return true;
          return rule.marketType === input.requestedMarketType;
        })
        .map((rule) => ({
          contract: rule.contract,
        }));

      const orClauses: any[] = [...fixedClauses];

      if (fixedContracts.length > 0) {
        const flexibleClause: any = {
          contract: { notIn: fixedContracts },
        };

        if (input.requestedMarketType) {
          flexibleClause.marketType = input.requestedMarketType;
        }

        orClauses.push(flexibleClause);
      }

      if (orClauses.length > 0) {
        andClauses.push({ OR: orClauses });
      }
    } else if (input.requestedMarketType) {
      where.marketType = input.requestedMarketType;
    }
  }

  if (andClauses.length > 0) {
    where.AND = andClauses;
  }

  return where;
}

async function runListingQuery(input: {
  mode: QueryMode;
  where: any;
  sort: SortMode;
  take: number;
  skip: number;
}) {
  const select = listingSelectForMode(input.mode);

  const [rows, total] = await Promise.all([
    prisma.listing.findMany({
      where: input.where,
      orderBy: orderByForSort(input.sort),
      take: input.take,
      skip: input.skip,
      select: select as any,
    } as any),
    prisma.listing.count({ where: input.where } as any),
  ]);

  return { rows: rows as any[], total };
}

function listingToJson(r: any, requestedMarketType: MarketType | null) {
  const m = r?.mint || null;
  const meta = metadataFromMint(m);

  const rowSuggestedMarketType = suggestedMarketTypeFromAsset({
    fulfillmentType: r?.fulfillmentType ?? m?.fulfillmentType ?? null,
    deliveryEnabled: r?.deliveryEnabled ?? m?.deliveryEnabled ?? null,
    physicalItemIncluded:
      r?.physicalItemIncluded ?? m?.physicalItemIncluded ?? null,
    category: r?.category ?? m?.category ?? null,
    subcategory: r?.subcategory ?? m?.subcategory ?? null,
  });

  const resolvedMarketType = resolveMarketType({
    contract: r?.contract,
    suggestedMarketType: rowSuggestedMarketType,
    storedMarketType: r?.marketType,
    requestedMarketType,
  });

  const mediaImage = meta.image || null;
  const mediaAnimation = meta.animation || null;
  const mediaKind = meta.mediaKind || "image";

  return {
    id: r.id,
    chainId: r.chainId,
    contract: r.contract,
    tokenId: r.tokenId,
    standard: r.standard,
    status: r.status,

    marketType: resolvedMarketType,
    suggestedMarketType: rowSuggestedMarketType,
    marketplaceContract: r.marketplaceContract,

    sellerWallet: r.sellerWallet,
    seller: r.seller || null,

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
    serviceCountry: r.serviceCountry,
    serviceCity: r.serviceCity,
    serviceArea: r.serviceArea,

    createdAt: r.createdAt ? r.createdAt.toISOString() : null,

    media: {
      kind: mediaKind,
      src: mediaKind === "video" ? mediaAnimation : mediaImage,
      poster: mediaKind === "video" ? mediaImage : null,
      image: mediaImage,
    },

    metaCollection: meta.collection || null,
    metaItem: meta.item || null,
    metaRarity: meta.rarity || null,
    metaBrand: meta.brand || null,
    metaProject: meta.project || null,
    metaDescription: meta.description || null,

    aiIndex: m?.aiIndex
      ? {
          status: m.aiIndex.status,
          visualText: m.aiIndex.visualText,
          visualSummary: m.aiIndex.visualSummary,
          detectedProduct: m.aiIndex.detectedProduct,
          detectedService: m.aiIndex.detectedService,
          detectedCategory: m.aiIndex.detectedCategory,
          detectedBrand: m.aiIndex.detectedBrand,
          detectedCountry: m.aiIndex.detectedCountry,
          detectedRegion: m.aiIndex.detectedRegion,
          detectedCity: m.aiIndex.detectedCity,
          detectedArea: m.aiIndex.detectedArea,
          searchTags: m.aiIndex.searchTags || [],
          confidence: m.aiIndex.confidence,
          enrichedAt: m.aiIndex.enrichedAt
            ? m.aiIndex.enrichedAt.toISOString()
            : null,
        }
      : null,

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
          suggestedMarketType: suggestedMarketTypeFromAsset({
            fulfillmentType: m.fulfillmentType,
            deliveryEnabled: m.deliveryEnabled,
            physicalItemIncluded: m.physicalItemIncluded,
            category: m.category,
            subcategory: m.subcategory,
          }),
        }
      : null,
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

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

  const fulfillmentType = normalizeFulfillmentType(
    url.searchParams.get("fulfillmentType")
  );

  const serviceCountry = cleanText(url.searchParams.get("serviceCountry"), 120);
  const serviceCity = cleanText(url.searchParams.get("serviceCity"), 120);
  const serviceArea = cleanText(url.searchParams.get("serviceArea"), 120);

  const minPriceWei = parseWei(url.searchParams.get("minPriceWei"));
  const maxPriceWei = parseWei(url.searchParams.get("maxPriceWei"));

  const sortRaw = (url.searchParams.get("sort") || "new") as SortMode;
  const sort = ALLOWED_SORT.has(sortRaw) ? sortRaw : "new";

  const standardRaw = (url.searchParams.get("standard") || "").toUpperCase();
  const standard = ALLOWED_STANDARD.has(standardRaw) ? standardRaw : null;

  const statusRaw = (url.searchParams.get("status") || "ACTIVE").toUpperCase();
  const status = ALLOWED_STATUS.has(statusRaw) ? statusRaw : "ACTIVE";

  const marketTypeRaw = (url.searchParams.get("marketType") || "").toUpperCase();
  const requestedMarketType = ALLOWED_MARKET_TYPE.has(
    marketTypeRaw as MarketType
  )
    ? (marketTypeRaw as MarketType)
    : null;

  const take = Math.max(
    1,
    Math.min(toInt(url.searchParams.get("take")) ?? 30, 100)
  );

  const skip = Math.max(toInt(url.searchParams.get("skip")) ?? 0, 0);

  const commonWhereInput = {
    chainId,
    contract,
    seller,
    marketplaceContract,
    q,
    category,
    subcategory,
    fulfillmentType,
    serviceCountry,
    serviceCity,
    serviceArea,
    minPriceWei,
    maxPriceWei,
    standard,
    status,
    requestedMarketType,
  };

  const modes: QueryMode[] = ["ai", "meta", "basic"];
  const warnings: string[] = [];

  for (const mode of modes) {
    try {
      const where = buildWhere({
        mode,
        ...commonWhereInput,
      });

      const { rows, total } = await runListingQuery({
        mode,
        where,
        sort,
        take,
        skip,
      });

      return NextResponse.json({
        ok: true,
        mode,
        total,
        warnings,
        filters: {
          q,
          category,
          subcategory,
          fulfillmentType,
          serviceCountry,
          serviceCity,
          serviceArea,
          minPriceWei: minPriceWei?.toString() || null,
          maxPriceWei: maxPriceWei?.toString() || null,
          sort,
          marketType: requestedMarketType,
          contract,
        },
        listings: rows.map((r) => listingToJson(r, requestedMarketType)),
      });
    } catch (e: any) {
      const message = e?.message || String(e || "unknown error");
      warnings.push(`${mode}_query_failed`);

      console.error(`[API_MARKET_LISTINGS_${mode.toUpperCase()}_ERROR]`, e);

      // Continue to safer fallback mode.
      if (mode !== "basic") continue;

      return NextResponse.json(
        {
          ok: false,
          error: "MARKET_LISTINGS_FAILED",
          message,
          warnings,
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    {
      ok: false,
      error: "MARKET_LISTINGS_FAILED",
      message: "Unknown listings error",
      warnings,
    },
    { status: 500 }
  );
}
