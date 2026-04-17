import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMintMetaMap, mintMetaKey } from "@/lib/mintMetaCache";
import { ipfsToHttp } from "@/lib/ipfs";

export const runtime = "nodejs";
// This endpoint is user-scoped (session-based) — don't ISR it,
// but we still skip force-dynamic so Next can optimize rendering.
export const dynamic = "force-dynamic";
export const revalidate = 0;

type MarketType = "STANDARD" | "PROTECTED";

function s(v: unknown) {
  return typeof v === "bigint" ? v.toString() : v;
}

function normAddr(v: string | null | undefined) {
  const x = String(v || "").trim();
  if (!x) return null;
  return x.toLowerCase();
}

function normText(v: string | null | undefined) {
  return String(v || "").trim().toLowerCase();
}

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
  if (PUBLIC_STANDARD_CONTRACT && c === PUBLIC_STANDARD_CONTRACT) return null;
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
}): MarketType {
  const { contract, suggestedMarketType } = params;
  const fixed = fixedMarketTypeByContract(contract);
  if (fixed) return fixed;
  if (isPublicStandardContract(contract)) return suggestedMarketType;
  return suggestedMarketType;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const uid = (session as any)?.userId || (session as any)?.user?.id;

  if (!uid) {
    return NextResponse.json(
      { ok: false, reason: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const rawTake = Number(url.searchParams.get("take") || "24");
  const take = Math.max(
    1,
    Math.min(48, Number.isFinite(rawTake) ? Math.trunc(rawTake) : 24)
  );
  const cursor = url.searchParams.get("cursor");

  try {
    const items = await prisma.holding.findMany({
      where: {
        userId: uid,
        amount: { gt: 0n },
        mint: { is: { verified: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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
            chainId: true,
            contract: true,
            tokenId: true,
            name: true,
            image: true,
            tokenUri: true,
            verified: true,
            txHash: true,
            createdAt: true,
            deliveryEnabled: true,
            physicalItemIncluded: true,
            officialItem: true,
            fulfillmentType: true,
            category: true,
            subcategory: true,

            // cache fields
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
          } as any,
        },
      },
    });

    const hasMore = items.length > take;
    const data = hasMore ? items.slice(0, take) : items;
    const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;

    // Resolve metadata in one parallel pass
    const mintInputs = data.map((x) => x.mint as any).filter(Boolean);
    const metaMap = await getMintMetaMap(mintInputs, {
      concurrency: 6,
      timeoutBudgetMs: 4000,
    });

    const nfts = data.map((x) => {
      const contract = String(x.contract || "").toLowerCase();
      const m = x.mint as any;
      const metaKey = m
        ? mintMetaKey(m.chainId, m.contract, m.tokenId)
        : null;
      const meta = metaKey ? metaMap.get(metaKey) || null : null;

      const suggestedMarketType = suggestedMarketTypeFromAsset({
        fulfillmentType: m?.fulfillmentType ?? null,
        deliveryEnabled: m?.deliveryEnabled ?? false,
        physicalItemIncluded: m?.physicalItemIncluded ?? false,
        category: m?.category ?? null,
        subcategory: m?.subcategory ?? null,
      });

      const resolvedMarketType = resolveMarketType({
        contract,
        suggestedMarketType,
      });

      const mediaImage = meta?.image || ipfsToHttp(m?.image) || null;
      const mediaAnimation = meta?.animation || null;
      const mediaKind = meta?.mediaKind || "image";

      return {
        id: x.id,
        updatedAt: x.updatedAt.toISOString(),
        chainId: x.chainId,
        contract,
        tokenId: x.tokenId,
        standard: x.standard,
        amount: s(x.amount),

        name: m?.name ?? null,
        image: m?.image ?? null,
        tokenUri: m?.tokenUri ?? null,
        verified: m?.verified ?? false,
        txHash: m?.txHash ?? null,
        mintedAt: m?.createdAt ? m.createdAt.toISOString() : null,

        deliveryEnabled: m?.deliveryEnabled ?? false,
        physicalItemIncluded: m?.physicalItemIncluded ?? false,
        officialItem: m?.officialItem ?? false,
        fulfillmentType: m?.fulfillmentType ?? null,
        category: m?.category ?? null,
        subcategory: m?.subcategory ?? null,

        suggestedMarketType,
        resolvedMarketType,

        isCafeContract: Boolean(CAFE_CONTRACT && contract === CAFE_CONTRACT),
        isStoreContract: Boolean(STORE_CONTRACT && contract === STORE_CONTRACT),
        isPublicStandardContract: Boolean(
          PUBLIC_STANDARD_CONTRACT && contract === PUBLIC_STANDARD_CONTRACT
        ),
        isPublicDeliveryContract: Boolean(
          PUBLIC_DELIVERY_CONTRACT && contract === PUBLIC_DELIVERY_CONTRACT
        ),

        // NEW: pre-resolved media + meta
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
      };
    });

    return NextResponse.json({
      ok: true,
      nfts,
      nextCursor,
    });
  } catch (e) {
    console.error("[API_ME_NFTS_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}
