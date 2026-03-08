import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPublicClient, formatUnits, http } from "viem";
import { baseSepolia } from "viem/chains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const CHAIN_ID = Number(process.env.CHAIN_ID || "84532");
const RPC_URL = process.env.RPC_URL || process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";

const CAFE_CONTRACT = String(
  process.env.REALIFE_CAFE_STORE_CONTRACT ||
    process.env.NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT ||
    ""
)
  .trim()
  .toLowerCase();

const cafeAbi = [
  {
    type: "function",
    name: "productPrices",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "maxSupply",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "isActive",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

function s(v: any) {
  return typeof v === "bigint" ? v.toString() : v;
}

async function safeReadBigInt(functionName: "productPrices" | "maxSupply" | "totalSupply", tokenId: bigint) {
  try {
    return (await client.readContract({
      address: CAFE_CONTRACT as `0x${string}`,
      abi: cafeAbi,
      functionName,
      args: [tokenId],
    })) as bigint;
  } catch {
    return null;
  }
}

async function safeReadBool(functionName: "isActive", tokenId: bigint) {
  try {
    return (await client.readContract({
      address: CAFE_CONTRACT as `0x${string}`,
      abi: cafeAbi,
      functionName,
      args: [tokenId],
    })) as boolean;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  if (!CAFE_CONTRACT) {
    return NextResponse.json({ ok: false, error: "REALIFE_CAFE_STORE_CONTRACT_MISSING" }, { status: 500 });
  }

  const url = new URL(req.url);
  const take = Math.max(1, Math.min(100, Number(url.searchParams.get("take") || "48")));

  try {
    const rows = await prisma.mint.findMany({
      where: {
        chainId: CHAIN_ID,
        contract: CAFE_CONTRACT,
        verified: true,
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        createdAt: true,
        chainId: true,
        contract: true,
        tokenId: true,
        tokenUri: true,
        name: true,
        image: true,
        verified: true,
      },
    });

    const items = await Promise.all(
      rows.map(async (row) => {
        const tokenIdBI = BigInt(row.tokenId);

        const [priceRaw, maxSupplyRaw, totalSupplyRaw, active] = await Promise.all([
          safeReadBigInt("productPrices", tokenIdBI),
          safeReadBigInt("maxSupply", tokenIdBI),
          safeReadBigInt("totalSupply", tokenIdBI),
          safeReadBool("isActive", tokenIdBI),
        ]);

        const remainingRaw =
          maxSupplyRaw !== null && totalSupplyRaw !== null ? maxSupplyRaw - totalSupplyRaw : null;

        return {
          id: row.id,
          createdAt: row.createdAt,
          chainId: row.chainId,
          contract: row.contract,
          tokenId: row.tokenId,
          tokenUri: row.tokenUri,
          name: row.name,
          image: row.image,
          verified: row.verified,

          active: active ?? false,

          priceRaw: priceRaw !== null ? s(priceRaw) : null,
          priceUsdt: priceRaw !== null ? formatUnits(priceRaw, 6) : null,

          maxSupply: maxSupplyRaw !== null ? s(maxSupplyRaw) : null,
          totalSupply: totalSupplyRaw !== null ? s(totalSupplyRaw) : null,
          remaining: remainingRaw !== null ? s(remainingRaw) : null,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      contract: CAFE_CONTRACT,
      total: items.length,
      items,
    });
  } catch (e) {
    console.error("[API_CAFE_PRODUCTS_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}