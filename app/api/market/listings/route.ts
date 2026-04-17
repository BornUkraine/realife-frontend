import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMintMetaMap, mintMetaKey } from "@/lib/mintMetaCache";
import { ipfsToHttp } from "@/lib/ipfs";

export const runtime = "nodejs";

/**
 * Caching strategy:
 *
 *  - Route is ISR-cached for 30s per unique URL (revalidate below).
 *  - Metadata resolved server-side once, then persisted in DB (Mint.meta*).
 *  - After first hit per (contract,view), subsequent requests are effectively
 *    a single indexed DB query + a map over rows.
 */
export const revalidate = 30;
export const dynamic = "auto";

type MarketType = "STANDARD" | "PROTECTED";

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

const ALLOWED_STATUS = new Set(["ACTIVE", "CANCELLED", "SOLD_OUT"]);
const ALLOWED_STANDARD = new Set(["ERC721", "ERC1155"]);
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

type FixedMarketType = "STANDARD" | "PROTECTED";

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

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const chainIdRaw = toInt(url.searchParams.get("chainId"));
  const chainId = chainIdRaw && chainIdRaw > 0 ? chainIdRaw : null;

  const contract = normAddr(url.searchParams.get("contract"));
  const seller = normAddr(url.searchParams.get("seller"));
  const marketplaceContract = normAddr(
    url.searchParams.get("marketplaceContract")
  );

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

  if (chainId !== null) where.chainId = chainId;
  if (seller) where.sellerWallet = seller;
  if (standard) where.standard = standard;
  if (marketplaceContract) where.marketplaceContract = marketplaceContract;

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
        where.OR = orClauses;
      }
    } else if (requestedMarketType) {
      where.marketType = requestedMarketType;
    }
  }

  try {
    const [rows, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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

    // Resolve any uncached metadata (parallel, budgeted)
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
      listings: rows.map((r) => {
        const m = r.mint as any;
        const metaKey = m
          ? mintMetaKey(m.chainId, m.contract, m.tokenId)
          : null;
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