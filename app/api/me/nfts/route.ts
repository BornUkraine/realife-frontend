import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function s(v: unknown) {
  return typeof v === "bigint" ? v.toString() : v;
}

function suggestedMarketTypeFromAsset(input: {
  fulfillmentType?: string | null;
  deliveryEnabled?: boolean | null;
  physicalItemIncluded?: boolean | null;
}) {
  const ft = String(input.fulfillmentType || "").toUpperCase();

  if (
    ft === "PHYSICAL_GOOD" ||
    ft === "DIGITAL_SERVICE" ||
    ft === "ONLINE_SESSION" ||
    ft === "LOCAL_SERVICE"
  ) {
    return "PROTECTED" as const;
  }

  if (input.deliveryEnabled || input.physicalItemIncluded) {
    return "PROTECTED" as const;
  }

  return "STANDARD" as const;
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
        mint: {
          is: {
            verified: true,
          },
        },
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
          },
        },
      },
    });

    const hasMore = items.length > take;
    const data = hasMore ? items.slice(0, take) : items;
    const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;

    const nfts = data.map((x) => ({
      id: x.id,
      updatedAt: x.updatedAt.toISOString(),
      chainId: x.chainId,
      contract: String(x.contract || "").toLowerCase(),
      tokenId: x.tokenId,
      standard: x.standard,
      amount: s(x.amount),
      name: x.mint?.name ?? null,
      image: x.mint?.image ?? null,
      tokenUri: x.mint?.tokenUri ?? null,
      verified: x.mint?.verified ?? false,
      txHash: x.mint?.txHash ?? null,
      mintedAt: x.mint?.createdAt ? x.mint.createdAt.toISOString() : null,
      deliveryEnabled: x.mint?.deliveryEnabled ?? false,
      physicalItemIncluded: x.mint?.physicalItemIncluded ?? false,
      officialItem: x.mint?.officialItem ?? false,
      fulfillmentType: x.mint?.fulfillmentType ?? null,
      category: x.mint?.category ?? null,
      subcategory: x.mint?.subcategory ?? null,
      suggestedMarketType: suggestedMarketTypeFromAsset({
        fulfillmentType: x.mint?.fulfillmentType ?? null,
        deliveryEnabled: x.mint?.deliveryEnabled ?? false,
        physicalItemIncluded: x.mint?.physicalItemIncluded ?? false,
      }),
    }));

    return NextResponse.json({ ok: true, nfts, nextCursor });
  } catch (e) {
    console.error("[API_ME_NFTS_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}