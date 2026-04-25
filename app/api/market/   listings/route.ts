import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMintMetaMap, mintMetaKey } from "@/lib/mintMetaCache";
import { ipfsToHttp } from "@/lib/ipfs";

export const runtime = "nodejs";

/**
 * Trading listings API.
 *
 * Important architecture note:
 * - This route stays DB/indexer based.
 * - AI search does NOT live here.
 * - /api/ai/trading-search only converts human text into safe filters.
 * - This route receives normal filters and performs the real Prisma search.
 */
export const revalidate = 30;
export const dynamic = "auto";

type MarketType = "STANDARD" | "PROTECTED";
type SortMode = "new" | "priceAsc" | "priceDesc";

type FixedMarketType = "STANDARD" | "PROTECTED";

type FulfillmentType =
  | "PHYSICAL_GOOD"
  | "DIGITAL_SERVICE"
  | "ONLINE_SESSION"
  | "LOCAL_SERVICE";

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

function normalizeFulfillmentType(v: string | null | undefined): FulfillmentType | null {
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

  // Public standard can contain both STANDARD collectible/listings and
  // PROTECTED service/session listings, so we do not hard-force it here.
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

function buildTextSearchClause(q: string | null) {
  if (!q) return null;

  const query = q.slice(0, 160);
  const compactQuery = query.toLowerCase();

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
          OR: [
            { tokenId: { contains: query, mode: "insensitive" } },
            { contract: { contains: compactQuery, mode: "insensitive" } },
            { name: { contains: query, mode: "insensitive" } },
            { category: { contains: query, mode: "insensitive" } },
            { subcategory: { contains: query, mode: "insensitive" } },
            { serviceCountry: { contains: query, mode: "insensitive" } },
            { serviceCity: { contains: query, mode: "insensitive" } },
            { serviceArea: { contains: query, mode: "insensitive" } },
            { metaCollection: { contains: query, mode: "insensitive" } },
            { metaItem: { contains: query, mode: "insensitive" } },
            { metaRarity: { contains: query, mode: "insensitive" } },
            { metaBrand: { contains: query, mode: "insensitive" } },
            { metaProject: { contains: query, mode: "insensitive" } },
            { metaDescription: { contains: query, mode: "insensitive" } },
            {
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
            },
          ],
        },
      },
    },
  ];

  const aiTags = buildAiTagSearchClause(query);
  if (aiTags) directOr.push(aiTags);

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

  const where: any = {
    status,
    mint: {
      is: {
        verified: true,
      },
    },
  };

  const andClauses: any[] = [];

  if (chainId !== null) where.chainId = chainId;
  if (seller) where.sellerWallet = seller;
  if (standard) where.standard = standard;
  if (marketplaceContract) where.marketplaceContract = marketplaceContract;

  if (fulfillmentType) {
    andClauses.push({
      OR: [
        { fulfillmentType },
        {
          mint: {
            is: {
              fulfillmentType,
            },
          },
        },
      ],
    });
  }

  const categoryListing = textContainsFilter("category", category);
  const categoryMint = relationMintTextContainsFilter("category", category);
  const categoryAi = relationMintAiTextContainsFilter("detectedCategory", category);
  if (categoryListing && categoryMint) {
    andClauses.push({ OR: [categoryListing, categoryMint, categoryAi].filter(Boolean) });
  }

  const subcategoryListing = textContainsFilter("subcategory", subcategory);
  const subcategoryMint = relationMintTextContainsFilter("subcategory", subcategory);
  const subcategoryMeta = relationMintAnyTextContainsFilter(
    ["metaDescription", "metaItem", "metaCollection", "metaBrand", "metaProject"],
    subcategory
  );
  const subcategoryAi = relationMintAiAnyTextContainsFilter(
    [
      "visualText",
      "visualSummary",
      "detectedProduct",
      "detectedService",
      "detectedCategory",
      "detectedBrand",
    ],
    subcategory
  );
  if (subcategory) {
    andClauses.push({
      OR: [subcategoryListing, subcategoryMint, subcategoryMeta, subcategoryAi].filter(Boolean),
    });
  }

  /**
   * Country / city / area are intentionally broad.
   * For LOCAL_SERVICE these can match serviceCountry/serviceCity/serviceArea.
   * For DELIVERY or normal public mint NFTs, country/region may exist only in:
   * - AI visual OCR text from the image/poster
   * - AI detectedCountry/detectedRegion/detectedCity
   * - AI searchTags
   * - cached metadata description/item/brand/project
   */
  const locationMetaFields = [
    "serviceCountry",
    "serviceCity",
    "serviceArea",
    "metaDescription",
    "metaItem",
    "metaCollection",
    "metaBrand",
    "metaProject",
  ];

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

  const countryListing = textContainsFilter("serviceCountry", serviceCountry);
  const countryMintBroad = relationMintAnyTextContainsFilter(locationMetaFields, serviceCountry);
  const countryAiBroad = relationMintAiAnyTextContainsFilter(locationAiFields, serviceCountry);
  if (serviceCountry) {
    andClauses.push({ OR: [countryListing, countryMintBroad, countryAiBroad].filter(Boolean) });
  }

  const cityListing = textContainsFilter("serviceCity", serviceCity);
  const cityMintBroad = relationMintAnyTextContainsFilter(locationMetaFields, serviceCity);
  const cityAiBroad = relationMintAiAnyTextContainsFilter(locationAiFields, serviceCity);
  if (serviceCity) {
    andClauses.push({ OR: [cityListing, cityMintBroad, cityAiBroad].filter(Boolean) });
  }

  const areaListing = textContainsFilter("serviceArea", serviceArea);
  const areaMintBroad = relationMintAnyTextContainsFilter(locationMetaFields, serviceArea);
  const areaAiBroad = relationMintAiAnyTextContainsFilter(locationAiFields, serviceArea);
  if (serviceArea) {
    andClauses.push({ OR: [areaListing, areaMintBroad, areaAiBroad].filter(Boolean) });
  }

  if (minPriceWei !== null || maxPriceWei !== null) {
    where.pricePerUnitWei = {};
    if (minPriceWei !== null) where.pricePerUnitWei.gte = minPriceWei;
    if (maxPriceWei !== null) where.pricePerUnitWei.lte = maxPriceWei;
  }

  const qClause = buildTextSearchClause(q);
  if (qClause) andClauses.push(qClause);

  const fixedRules = getFixedContractMarketRules();
  const fixedContracts = Array.from(new Set(fixedRules.map((x) => x.contract)));

  if (contract) {
    where.contract = contract;

    const fixedMarketType = fixedMarketTypeByContract(contract);
    const resolvedRequestedMarketType = fixedMarketType || requestedMarketType;

    if (resolvedRequestedMarketType) {
      where.marketType = resolvedRequestedMarketType;
    }
  } else {
    if (fixedRules.length > 0) {
      const fixedClauses = fixedRules
        .filter((rule) => {
          if (!requestedMarketType) return true;
          return rule.marketType === requestedMarketType;
        })
        .map((rule) => ({
          contract: rule.contract,
          marketType: rule.marketType,
        }));

      const orClauses: any[] = [...fixedClauses];

      if (fixedContracts.length > 0) {
        const flexibleClause: any = {
          contract: { notIn: fixedContracts },
        };
        if (requestedMarketType) {
          flexibleClause.marketType = requestedMarketType;
        }
        orClauses.push(flexibleClause);
      }

      if (orClauses.length > 0) {
        andClauses.push({ OR: orClauses });
      }
    } else if (requestedMarketType) {
      where.marketType = requestedMarketType;
    }
  }

  if (andClauses.length > 0) {
    where.AND = andClauses;
  }

  try {
    const [rows, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: orderByForSort(sort),
        take,
        skip,
        include: {
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

              metadataCachedAt: true,
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
          seller: {
            select: {
              handle: true,
              publicId: true,
            },
          },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    const mintInputs = rows
      .map((r) => (r.mint as any) || null)
      .filter(Boolean) as any[];

    const metaMap = await getMintMetaMap(mintInputs, {
      concurrency: 6,
      timeoutBudgetMs: 4000,
    });

    return NextResponse.json({
      ok: true,
      total,
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
      listings: rows.map((r) => {
        const m = r.mint as any;
        const metaKey = m ? mintMetaKey(m.chainId, m.contract, m.tokenId) : null;
        const meta = metaKey ? metaMap.get(metaKey) || null : null;

        const rowSuggestedMarketType = suggestedMarketTypeFromAsset({
          fulfillmentType: r.fulfillmentType ?? m?.fulfillmentType ?? null,
          deliveryEnabled: r.deliveryEnabled ?? m?.deliveryEnabled ?? null,
          physicalItemIncluded:
            r.physicalItemIncluded ?? m?.physicalItemIncluded ?? null,
          category: r.category ?? m?.category ?? null,
          subcategory: r.subcategory ?? m?.subcategory ?? null,
        });

        const resolvedMarketType = resolveMarketType({
          contract: r.contract,
          suggestedMarketType: rowSuggestedMarketType,
          storedMarketType: r.marketType,
          requestedMarketType,
        });

        const mediaImage = meta?.image || ipfsToHttp(m?.image) || null;
        const mediaAnimation = meta?.animation || null;
        const mediaKind = meta?.mediaKind || "image";

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
          serviceCountry: r.serviceCountry,
          serviceCity: r.serviceCity,
          serviceArea: r.serviceArea,

          createdAt: r.createdAt.toISOString(),

          media: {
            kind: mediaKind,
            src: mediaKind === "video" ? mediaAnimation : mediaImage,
            poster: mediaKind === "video" ? mediaImage : null,
            image: mediaImage,
          },

          metaCollection: meta?.collection || null,
          metaItem: meta?.item || null,
          metaRarity: meta?.rarity || null,
          metaBrand: meta?.brand || null,
          metaProject: meta?.project || null,
          metaDescription: meta?.description || null,

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
      }),
    });
  } catch (e) {
    console.error("[API_MARKET_LISTINGS_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}
