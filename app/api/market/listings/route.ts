import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function s(v: unknown) {
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

const ALLOWED_STATUS = new Set(["ACTIVE", "CANCELLED", "SOLD_OUT"]);
const ALLOWED_STANDARD = new Set(["ERC721", "ERC1155"]);
const ALLOWED_MARKET_TYPE = new Set(["STANDARD", "DELIVERY"]);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const chainIdRaw = toInt(url.searchParams.get("chainId"));
  const chainId = chainIdRaw && chainIdRaw > 0 ? chainIdRaw : null;

  const contract = normAddr(url.searchParams.get("contract"));
  const seller = normAddr(url.searchParams.get("seller"));
  const marketplaceContract = normAddr(url.searchParams.get("marketplaceContract"));

  const standardRaw = (url.searchParams.get("standard") || "").toUpperCase();
  const standard = ALLOWED_STANDARD.has(standardRaw) ? standardRaw : null;

  const statusRaw = (url.searchParams.get("status") || "ACTIVE").toUpperCase();
  const status = ALLOWED_STATUS.has(statusRaw) ? statusRaw : "ACTIVE";

  const marketTypeRaw = (url.searchParams.get("marketType") || "").toUpperCase();
  const marketType = ALLOWED_MARKET_TYPE.has(marketTypeRaw) ? marketTypeRaw : null;

  const take = Math.max(1, Math.min(toInt(url.searchParams.get("take")) ?? 30, 100));
  const skip = Math.max(toInt(url.searchParams.get("skip")) ?? 0, 0);

  const where: any = { status };

  if (chainId !== null) where.chainId = chainId;
  if (contract) where.contract = contract;
  if (seller) where.sellerWallet = seller;
  if (standard) where.standard = standard;
  if (marketType) where.marketType = marketType;
  if (marketplaceContract) where.marketplaceContract = marketplaceContract;

  // Только verified NFT
  where.mint = {
    is: {
      verified: true,
    },
  };

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
              name: true,
              image: true,
              tokenUri: true,
              verified: true,
              deliveryEnabled: true,
              physicalItemIncluded: true,
              officialItem: true,
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

        marketType: r.marketType,
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

        createdAt: r.createdAt.toISOString(),

        mint: r.mint
          ? {
              ...r.mint,
              deliveryEnabled: r.mint.deliveryEnabled,
              physicalItemIncluded: r.mint.physicalItemIncluded,
              officialItem: r.mint.officialItem,
            }
          : null,
      })),
    });
  } catch (e) {
    console.error("[API_MARKET_LISTINGS_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}