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

const PRIMARY_IPFS_ORIGIN = (process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://nftstorage.link").replace(/\/$/, "");
const IPFS_GATEWAYS = [
  `${PRIMARY_IPFS_ORIGIN}/ipfs/`,
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
] as const;

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

type ProductMeta = {
  image?: string | null;
  name?: string | null;
  description?: string | null;
  collection?: string | null;
  drink?: string | null;
  item?: string | null;
  rarity?: string | null;
  attributes?: Array<{ trait_type?: string; value?: string | number | null }>;
};

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

function s(v: any) {
  return typeof v === "bigint" ? v.toString() : v;
}

function ipfsToHttp(uri?: string | null, gw: string = IPFS_GATEWAYS[0]) {
  const u = String(uri || "").trim();
  if (!u) return null;

  if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("data:") || u.startsWith("blob:")) {
    return u;
  }

  if (u.startsWith("ipfs://")) {
    let p = u.slice("ipfs://".length);
    if (p.startsWith("ipfs/")) p = p.slice("ipfs/".length);
    return `${gw}${p}`;
  }

  if (u.startsWith("/ipfs/")) return `${gw}${u.slice("/ipfs/".length)}`;
  if (u.startsWith("Qm") || u.startsWith("bafy")) return `${gw}${u}`;
  return u;
}

async function loadMetadata(tokenUri?: string | null): Promise<ProductMeta | null> {
  if (!tokenUri) return null;

  for (const gw of IPFS_GATEWAYS) {
    const url = ipfsToHttp(tokenUri, gw);
    if (!url) continue;

    try {
      const r = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) continue;

      const j = await r.json().catch(() => null);
      if (j && typeof j === "object") return j as ProductMeta;
    } catch {
      // try next gateway
    }
  }

  return null;
}

function getAttr(meta: ProductMeta | null, trait: string) {
  const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
  const found = attrs.find((x) => String(x?.trait_type || "").toLowerCase() === trait.toLowerCase());
  return found?.value != null ? String(found.value) : null;
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

        const [priceRaw, maxSupplyRaw, totalSupplyRaw, active, meta] = await Promise.all([
          safeReadBigInt("productPrices", tokenIdBI),
          safeReadBigInt("maxSupply", tokenIdBI),
          safeReadBigInt("totalSupply", tokenIdBI),
          safeReadBool("isActive", tokenIdBI),
          loadMetadata(row.tokenUri),
        ]);

        const remainingRaw =
          maxSupplyRaw !== null && totalSupplyRaw !== null ? maxSupplyRaw - totalSupplyRaw : null;

        const metaImage = ipfsToHttp(meta?.image || null);
        const collection =
          meta?.collection ||
          getAttr(meta, "Collection") ||
          null;
        const item =
          meta?.item ||
          meta?.drink ||
          getAttr(meta, "Item") ||
          getAttr(meta, "Drink") ||
          null;
        const rarity =
          meta?.rarity ||
          getAttr(meta, "Rarity") ||
          null;

        return {
          id: row.id,
          createdAt: row.createdAt,
          chainId: row.chainId,
          contract: row.contract,
          tokenId: row.tokenId,
          tokenUri: row.tokenUri,
          name: row.name || meta?.name || null,
          image: row.image,
          verified: row.verified,

          active: active ?? false,

          priceRaw: priceRaw !== null ? s(priceRaw) : null,
          priceUsdt: priceRaw !== null ? formatUnits(priceRaw, 6) : null,

          maxSupply: maxSupplyRaw !== null ? s(maxSupplyRaw) : null,
          totalSupply: totalSupplyRaw !== null ? s(totalSupplyRaw) : null,
          remaining: remainingRaw !== null ? s(remainingRaw) : null,

          metaImage,
          metaDescription: meta?.description || null,
          collection,
          item,
          rarity,
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