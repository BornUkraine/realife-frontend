import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function s(v: any) {
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

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const chainIdRaw = toInt(url.searchParams.get("chainId"));
  const chainId = chainIdRaw && chainIdRaw > 0 ? chainIdRaw : null;

  const contract = normAddr(url.searchParams.get("contract"));
  const tokenId = (url.searchParams.get("tokenId") || "").trim();

  const listingsTake = Math.min(toInt(url.searchParams.get("listingsTake")) ?? 50, 200);
  const tradesTake = Math.min(toInt(url.searchParams.get("tradesTake")) ?? 100, 500);

  if (!chainId || !contract || !tokenId) {
    return NextResponse.json({ ok: false, error: "Missing chainId/contract/tokenId" }, { status: 400 });
  }

  try {
    // 1) mint (каталог)
    const mint = await prisma.mint.findUnique({
      where: { chainId_contract_tokenId: { chainId, contract, tokenId } },
    });

    // закрытый маркет: только то, что есть в Mint и verified=true
    if (!mint || !mint.verified) {
      return NextResponse.json({ ok: false, error: "NFT_NOT_FOUND_OR_NOT_VERIFIED" }, { status: 404 });
    }

    // 2) listings + trades
    const [listings, trades] = await Promise.all([
      prisma.listing.findMany({
        where: { chainId, contract, tokenId, status: "ACTIVE", mint: { verified: true } },
        orderBy: { createdAt: "desc" },
        take: listingsTake,
        include: { seller: { select: { handle: true, publicId: true } } },
      }),
      prisma.trade.findMany({
        where: { chainId, contract, tokenId, mint: { verified: true } },
        orderBy: { blockTime: "desc" },
        take: tradesTake,
      }),
    ]);

    // 3) stats
    const floorWei =
      listings.length === 0
        ? null
        : listings.reduce(
            (min, x) => (x.pricePerUnitWei < min ? x.pricePerUnitWei : min),
            listings[0].pricePerUnitWei
          );

    const lastSaleWei = trades[0]?.pricePerUnitWei ?? null;
    const volumeTotalWei = trades.reduce((acc, t) => acc + t.totalPriceWei, 0n);

    return NextResponse.json({
      ok: true,
      mint,
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
        sellerWallet: r.sellerWallet,
        seller: r.seller,
        marketplaceListingId: s(r.marketplaceListingId),
        pricePerUnitWei: s(r.pricePerUnitWei),
        amountTotal: s(r.amountTotal),
        amountRemaining: s(r.amountRemaining),
        createdAt: r.createdAt,
      })),
      trades: trades.map((t) => ({
        txHash: t.txHash,
        logIndex: t.logIndex,
        blockNum: s(t.blockNum),
        blockTime: t.blockTime,

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