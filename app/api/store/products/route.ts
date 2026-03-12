import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPublicClient, formatUnits, http } from "viem";
import { baseSepolia } from "viem/chains";
import { realifeStoreAbi } from "@/lib/realifeStoreAbi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const CHAIN_ID = Number(process.env.CHAIN_ID || "84532");
const RPC_URL =
  process.env.RPC_URL ||
  process.env.BASE_SEPOLIA_RPC ||
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ||
  "https://sepolia.base.org";

const STORE_CONTRACT = String(
  process.env.NEXT_PUBLIC_REALIFE_STORE_CONTRACT ||
    process.env.REALIFE_STORE_CONTRACT ||
    process.env.STORE_CONTRACT_ADDRESS ||
    ""
)
  .trim()
  .toLowerCase();

const PRIMARY_IPFS_ORIGIN = (
  process.env.NEXT_PUBLIC_IPFS_GATEWAY ||
  process.env.IPFS_GATEWAY_ORIGIN ||
  "https://nftstorage.link"
).replace(/\/$/, "");

const IPFS_GATEWAYS = [
  `${PRIMARY_IPFS_ORIGIN}/ipfs/`,
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
] as const;

type ProductMeta = {
  image?: string | null;
  name?: string | null;
  description?: string | null;
  collection?: string | null;
  category?: string | null;
  item?: string | null;
  rarity?: string | null;
  attributes?: Array<{ trait_type?: string; value?: string | number | null }>;
};

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

function s(v: unknown) {
  return typeof v === "bigint" ? v.toString() : String(v ?? "");
}

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function ipfsToHttp(uri?: string | null, gw: string = IPFS_GATEWAYS[0]) {
  const u = String(uri || "").trim();
  if (!u) return null;

  if (
    u.startsWith("http://") ||
    u.startsWith("https://") ||
    u.startsWith("data:") ||
    u.startsWith("blob:")
  ) {
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
  const found = attrs.find(
    (x) => String(x?.trait_type || "").toLowerCase() === trait.toLowerCase()
  );
  return found?.value != null ? String(found.value) : null;
}

async function safeReadAddress(functionName: "paymentToken" | "treasury") {
  try {
    return normAddr(
      (await client.readContract({
        address: STORE_CONTRACT as `0x${string}`,
        abi: realifeStoreAbi,
        functionName,
        args: [],
      })) as string
    );
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  if (!STORE_CONTRACT) {
    return NextResponse.json(
      { ok: false, error: "NEXT_PUBLIC_REALIFE_STORE_CONTRACT_MISSING" },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const take = Math.max(1, Math.min(100, Number(url.searchParams.get("take") || "48")));
  const mode = String(url.searchParams.get("mode") || "all").toLowerCase();

  try {
    const [paymentTokenAddressOnchain, treasuryAddress, rows] = await Promise.all([
      safeReadAddress("paymentToken"),
      safeReadAddress("treasury"),
      prisma.realMarketingProduct.findMany({
        where: {
          chainId: CHAIN_ID,
          contract: STORE_CONTRACT,
          vertical: "store",
          ...(mode === "active" ? { isActive: true } : {}),
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
          paymentToken: true,
          maxSupply: true,
          mintedSupply: true,
          price: true,
          isActive: true,
          creatorWallet: true,
          primarySellerWallet: true,
          deliveryEnabled: true,
          physicalItemIncluded: true,
          officialItem: true,
        },
      }),
    ]);

    const items = await Promise.all(
      rows.map(async (row) => {
        const meta = await loadMetadata(row.tokenUri);

        const remainingRaw =
          row.maxSupply !== null && row.mintedSupply !== null
            ? row.maxSupply - row.mintedSupply
            : null;

        const metaImage = ipfsToHttp(meta?.image || null);
        const collection = meta?.collection || getAttr(meta, "Collection") || "REALIFE STORE";
        const category = meta?.category || getAttr(meta, "Category") || null;
        const item = meta?.item || getAttr(meta, "Item") || null;
        const rarity = meta?.rarity || getAttr(meta, "Rarity") || null;

        const paymentTokenAddress =
          normAddr(row.paymentToken) ||
          paymentTokenAddressOnchain ||
          normAddr(process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS) ||
          normAddr(process.env.PAYMENT_TOKEN_ADDRESS) ||
          null;

        return {
          id: row.id,
          createdAt: row.createdAt,
          chainId: row.chainId,
          contract: row.contract,
          tokenId: row.tokenId,
          tokenUri: row.tokenUri,
          name: row.name || meta?.name || null,
          image: metaImage,
          verified: true,

          active: row.isActive ?? false,

          priceRaw: row.price != null ? s(row.price) : null,
          priceUsdt: row.price != null ? formatUnits(row.price, 6) : null,

          maxSupply: row.maxSupply != null ? s(row.maxSupply) : null,
          totalSupply: row.mintedSupply != null ? s(row.mintedSupply) : null,
          remaining: remainingRaw != null ? s(remainingRaw) : null,

          creatorWallet: row.creatorWallet || null,
          primarySellerWallet: row.primarySellerWallet || null,
          deliveryEnabled: row.deliveryEnabled ?? false,
          physicalItemIncluded: row.physicalItemIncluded ?? false,
          officialItem: row.officialItem ?? false,
          paymentTokenAddress,

          metaImage,
          metaDescription: meta?.description || null,
          collection,
          category,
          item,
          rarity,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      storefrontType: "store",
      chainId: CHAIN_ID,
      contract: STORE_CONTRACT,
      paymentTokenAddress:
        paymentTokenAddressOnchain ||
        normAddr(process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS) ||
        normAddr(process.env.PAYMENT_TOKEN_ADDRESS) ||
        null,
      treasuryAddress,
      total: items.length,
      items,
    });
  } catch (e) {
    console.error("[API_STORE_PRODUCTS_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}