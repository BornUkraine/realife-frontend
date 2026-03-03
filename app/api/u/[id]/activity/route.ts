import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function normalizeKey(raw: string) {
  const key = safeDecode(raw || "").trim();
  if (!key || key.length > 64) return null;
  if (key.includes("/")) return null;
  if (!/^[a-zA-Z0-9_.-]+$/.test(key)) return null;
  return key;
}

function s(v: any) {
  return typeof v === "bigint" ? v.toString() : v;
}

function toInt(v: string | null) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: keyRaw } = await params;
  const key = normalizeKey(keyRaw);

  if (!key) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  const url = new URL(req.url);

  // independent pagination per section
  const take = clamp(toInt(url.searchParams.get("take")) ?? 50, 1, 200);

  const listingsSkip = clamp(toInt(url.searchParams.get("listingsSkip")) ?? 0, 0, 1_000_000);
  const purchasesSkip = clamp(toInt(url.searchParams.get("purchasesSkip")) ?? 0, 0, 1_000_000);
  const salesSkip = clamp(toInt(url.searchParams.get("salesSkip")) ?? 0, 0, 1_000_000);

  try {
    // Find user by handle/publicId
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { handle: { equals: key, mode: "insensitive" } },
          { publicId: { equals: key, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        handle: true,
        publicId: true,
        walletAddress: true,
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, reason: "USER_NOT_FOUND" }, { status: 404 });
    }

    const wallet = user.walletAddress.toLowerCase();

    // totals
    const [listingsTotal, purchasesTotal, salesTotal] = await Promise.all([
      prisma.listing.count({ where: { sellerWallet: wallet } }),
      prisma.trade.count({ where: { buyerWallet: wallet } }),
      prisma.trade.count({ where: { sellerWallet: wallet } }),
    ]);

    // page data
    const [listings, purchases, sales] = await Promise.all([
      prisma.listing.findMany({
        where: { sellerWallet: wallet },
        orderBy: { createdAt: "desc" },
        take,
        skip: listingsSkip,
        include: {
          mint: { select: { name: true, image: true } },
          seller: { select: { handle: true, publicId: true } }, // может быть null
        },
      }),
      prisma.trade.findMany({
        where: { buyerWallet: wallet },
        orderBy: { blockTime: "desc" },
        take,
        skip: purchasesSkip,
        include: {
          mint: { select: { name: true, image: true } },
          seller: { select: { handle: true, publicId: true } }, // nullable
          buyer: { select: { handle: true, publicId: true } },  // nullable
        },
      }),
      prisma.trade.findMany({
        where: { sellerWallet: wallet },
        orderBy: { blockTime: "desc" },
        take,
        skip: salesSkip,
        include: {
          mint: { select: { name: true, image: true } },
          seller: { select: { handle: true, publicId: true } }, // nullable
          buyer: { select: { handle: true, publicId: true } },  // nullable
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        handle: user.handle,
        publicId: user.publicId,
        walletAddress: user.walletAddress,
      },

      totalCounts: {
        listings: listingsTotal,
        purchases: purchasesTotal,
        sales: salesTotal,
      },

      page: {
        take,
        listingsSkip,
        purchasesSkip,
        salesSkip,
        next: {
          listingsSkip: listingsSkip + listings.length,
          purchasesSkip: purchasesSkip + purchases.length,
          salesSkip: salesSkip + sales.length,
        },
      },

      listings: listings.map((x) => ({
        id: x.id,
        chainId: x.chainId,
        contract: x.contract,
        tokenId: x.tokenId,
        standard: x.standard,
        status: x.status,

        sellerWallet: x.sellerWallet,
        seller: x.seller, // может быть null

        marketplaceListingId: s(x.marketplaceListingId),
        pricePerUnitWei: s(x.pricePerUnitWei),
        amountTotal: s(x.amountTotal),
        amountRemaining: s(x.amountRemaining),

        createdAt: x.createdAt,
        cancelledAt: x.cancelledAt,
        soldOutAt: x.soldOutAt,

        mint: x.mint,
      })),

      purchases: purchases.map((t) => ({
        chainId: t.chainId,
        contract: t.contract,
        tokenId: t.tokenId,
        standard: t.standard,

        txHash: t.txHash,
        logIndex: t.logIndex,
        blockTime: t.blockTime,

        sellerWallet: t.sellerWallet,
        buyerWallet: t.buyerWallet,

        // ✅ counterparty для покупок = seller
        counterpartyWallet: t.sellerWallet,
        counterpartyUser: t.seller ?? null,

        amount: s(t.amount),
        pricePerUnitWei: s(t.pricePerUnitWei),
        totalPriceWei: s(t.totalPriceWei),

        mint: t.mint,
      })),

      sales: sales.map((t) => ({
        chainId: t.chainId,
        contract: t.contract,
        tokenId: t.tokenId,
        standard: t.standard,

        txHash: t.txHash,
        logIndex: t.logIndex,
        blockTime: t.blockTime,

        sellerWallet: t.sellerWallet,
        buyerWallet: t.buyerWallet,

        // ✅ counterparty для продаж = buyer
        counterpartyWallet: t.buyerWallet,
        counterpartyUser: t.buyer ?? null,

        amount: s(t.amount),
        pricePerUnitWei: s(t.pricePerUnitWei),
        totalPriceWei: s(t.totalPriceWei),

        mint: t.mint,
      })),
    });
  } catch (e) {
    console.error("[API_U_ID_ACTIVITY_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}