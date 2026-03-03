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
  return Number.isFinite(n) ? n : null;
}

function normAddr(v: string | null) {
  const x = (v || "").trim();
  if (!x) return null;
  return x.toLowerCase();
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const chainId = toInt(url.searchParams.get("chainId"));
  const contract = normAddr(url.searchParams.get("contract"));
  const standard = (url.searchParams.get("standard") || "").toUpperCase(); // ERC721 / ERC1155
  const seller = normAddr(url.searchParams.get("seller"));

  const status = (url.searchParams.get("status") || "ACTIVE").toUpperCase(); // ACTIVE/CANCELLED/SOLD_OUT
  const take = Math.min(toInt(url.searchParams.get("take")) ?? 30, 100);
  const skip = Math.max(toInt(url.searchParams.get("skip")) ?? 0, 0);

  // filters
  const where: any = {};
  if (status) where.status = status;
  if (chainId) where.chainId = chainId;
  if (contract) where.contract = contract;
  if (seller) where.sellerWallet = seller;
  if (standard === "ERC721" || standard === "ERC1155") where.standard = standard;

  try {
    const rows = await prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        mint: { select: { name: true, image: true, tokenUri: true, verified: true } },
        seller: { select: { handle: true, publicId: true } },
      },
    });

    // optional: total count (для пагинации)
    const total = await prisma.listing.count({ where });

    return NextResponse.json({
      ok: true,
      total,
      listings: rows.map((r) => ({
        id: r.id,
        chainId: r.chainId,
        contract: r.contract,
        tokenId: r.tokenId,
        standard: r.standard,
        status: r.status,

        sellerWallet: r.sellerWallet,
        seller: r.seller,

        marketplaceListingId: s(r.marketplaceListingId),
        pricePerUnitWei: s(r.pricePerUnitWei),
        amountTotal: s(r.amountTotal),
        amountRemaining: s(r.amountRemaining),

        createdAt: r.createdAt,
        mint: r.mint,
      })),
    });
  } catch (e) {
    console.error("[API_MARKET_LISTINGS_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}