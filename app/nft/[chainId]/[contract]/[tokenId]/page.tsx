// PATH: app/nft/[chainId]/[contract]/[tokenId]/page.tsx — NFT detail page
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import NftPreviewLightbox from "@/components/NftPreviewLightbox";
import TradingPanel1155 from "@/components/trading/TradingPanel1155";
import StorefrontBuyPanel1155 from "@/components/storefront/StorefrontBuyPanel1155";
import { realifeCafeStoreAbi } from "@/lib/realifeCafeStoreAbi";
import { realifeStoreAbi } from "@/lib/realifeStoreAbi";
import { headers } from "next/headers";
import { createPublicClient, formatUnits, http } from "viem";
import { baseSepolia } from "viem/chains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function shortAddr(addr?: string | null) {
  if (!addr) return "—";
  const s = String(addr);
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function norm(a: string) {
  return String(a || "").trim().toLowerCase();
}

function normText(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function fmtDate(v?: Date | string | null) {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB");
}

/* ------------------------------- Config ------------------------------ */

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://accurate-art-production.up.railway.app"
).replace(/\/$/, "");

const USER_STANDARD_1155_CONTRACT = norm(
  process.env.NEXT_PUBLIC_REALIFE_1155_NEW_CONTRACT ||
    process.env.REALIFE_1155_NEW_CONTRACT ||
    ""
);

const USER_DELIVERY_1155_CONTRACT = norm(
  process.env.NEXT_PUBLIC_REALIFE_1155_DELIVERY_CONTRACT ||
    process.env.REALIFE_1155_DELIVERY_CONTRACT ||
    ""
);

const CAFE_1155_CONTRACT = norm(
  process.env.NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT ||
    process.env.REALIFE_CAFE_STORE_CONTRACT ||
    ""
);

const STORE_1155_CONTRACT = norm(
  process.env.NEXT_PUBLIC_REALIFE_STORE_CONTRACT ||
    process.env.REALIFE_STORE_CONTRACT ||
    ""
);

const PAYMENT_TOKEN_FALLBACK = norm(
  process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS ||
    process.env.PAYMENT_TOKEN_ADDRESS ||
    ""
);

const ALLOWED_1155_CONTRACTS = [
  USER_STANDARD_1155_CONTRACT,
  USER_DELIVERY_1155_CONTRACT,
  CAFE_1155_CONTRACT,
  STORE_1155_CONTRACT,
].filter(Boolean);

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

const PINATA_IPFS = "https://gateway.pinata.cloud/ipfs/";
const CAFE_STOREFRONT_HREF = "/app/real-marketing/realife-cafe";
const STORE_STOREFRONT_HREF = "/app/real-marketing/realife-store";

/* ------------------------------- Market fetch tuning ------------------------------ */

const MARKET_REVALIDATE_SECONDS = 5;
const MARKET_FETCH_TIMEOUT_MS = 4500;

/* ------------------------------- On-chain reads ------------------------------ */

const RPC_URL =
  process.env.RPC_URL ||
  process.env.BASE_SEPOLIA_RPC ||
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ||
  "https://sepolia.base.org";

const storefrontClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

type CafeStoreState = {
  active: boolean | null;
  priceRaw: string | null;
  priceUsdt: string | null;
  maxSupply: string | null;
  totalSupply: string | null;
  remaining: string | null;
  paymentTokenAddress: string | null;
};

type StoreStoreState = {
  active: boolean | null;
  priceRaw: string | null;
  priceUsdt: string | null;
  maxSupply: string | null;
  totalSupply: string | null;
  remaining: string | null;
  paymentTokenAddress: string | null;
  deliveryEnabled: boolean | null;
  physicalItemIncluded: boolean | null;
  officialItem: boolean | null;
  primarySellerWallet: string | null;
};

async function safeReadCafeBigInt(
  functionName: "productPrices" | "maxSupply" | "totalSupply",
  tokenId: bigint
) {
  if (!CAFE_1155_CONTRACT) return null;

  try {
    return (await storefrontClient.readContract({
      address: CAFE_1155_CONTRACT as `0x${string}`,
      abi: realifeCafeStoreAbi,
      functionName,
      args: [tokenId],
    })) as bigint;
  } catch {
    return null;
  }
}

async function safeReadCafeBool(functionName: "isActive", tokenId: bigint) {
  if (!CAFE_1155_CONTRACT) return null;

  try {
    return (await storefrontClient.readContract({
      address: CAFE_1155_CONTRACT as `0x${string}`,
      abi: realifeCafeStoreAbi,
      functionName,
      args: [tokenId],
    })) as boolean;
  } catch {
    return null;
  }
}

async function safeReadCafeAddress(functionName: "paymentToken") {
  if (!CAFE_1155_CONTRACT) return null;

  try {
    return norm(
      (await storefrontClient.readContract({
        address: CAFE_1155_CONTRACT as `0x${string}`,
        abi: realifeCafeStoreAbi,
        functionName,
        args: [],
      })) as string
    );
  } catch {
    return null;
  }
}

async function safeReadStoreBigInt(
  functionName: "productPrices" | "maxSupply" | "totalSupply",
  tokenId: bigint
) {
  if (!STORE_1155_CONTRACT) return null;

  try {
    return (await storefrontClient.readContract({
      address: STORE_1155_CONTRACT as `0x${string}`,
      abi: realifeStoreAbi,
      functionName,
      args: [tokenId],
    })) as bigint;
  } catch {
    return null;
  }
}

async function safeReadStoreBool(
  functionName:
    | "isActive"
    | "deliveryEnabled"
    | "physicalItemIncluded"
    | "officialItem",
  tokenId: bigint
) {
  if (!STORE_1155_CONTRACT) return null;

  try {
    return (await storefrontClient.readContract({
      address: STORE_1155_CONTRACT as `0x${string}`,
      abi: realifeStoreAbi,
      functionName,
      args: [tokenId],
    })) as boolean;
  } catch {
    return null;
  }
}

async function safeReadStoreAddress(
  functionName: "paymentToken" | "primarySellerOf",
  tokenId?: bigint
) {
  if (!STORE_1155_CONTRACT) return null;

  try {
    return norm(
      (await storefrontClient.readContract({
        address: STORE_1155_CONTRACT as `0x${string}`,
        abi: realifeStoreAbi,
        functionName,
        args:
          functionName === "primarySellerOf" && tokenId !== undefined
            ? [tokenId]
            : [],
      })) as string
    );
  } catch {
    return null;
  }
}

async function loadCafeStoreState(
  contract: string,
  tokenId: string
): Promise<CafeStoreState | null> {
  if (!CAFE_1155_CONTRACT || contract !== CAFE_1155_CONTRACT) return null;

  try {
    const tokenIdBI = BigInt(tokenId);

    const [
      priceRaw,
      maxSupplyRaw,
      totalSupplyRaw,
      active,
      paymentTokenAddressRaw,
    ] = await Promise.all([
      safeReadCafeBigInt("productPrices", tokenIdBI),
      safeReadCafeBigInt("maxSupply", tokenIdBI),
      safeReadCafeBigInt("totalSupply", tokenIdBI),
      safeReadCafeBool("isActive", tokenIdBI),
      safeReadCafeAddress("paymentToken"),
    ]);

    const remainingRaw =
      maxSupplyRaw !== null && totalSupplyRaw !== null
        ? maxSupplyRaw - totalSupplyRaw
        : null;

    return {
      active: active ?? null,
      priceRaw: priceRaw !== null ? priceRaw.toString() : null,
      priceUsdt: priceRaw !== null ? formatUnits(priceRaw, 6) : null,
      maxSupply: maxSupplyRaw !== null ? maxSupplyRaw.toString() : null,
      totalSupply: totalSupplyRaw !== null ? totalSupplyRaw.toString() : null,
      remaining: remainingRaw !== null ? remainingRaw.toString() : null,
      paymentTokenAddress:
        paymentTokenAddressRaw || PAYMENT_TOKEN_FALLBACK || null,
    };
  } catch {
    return null;
  }
}

async function loadStoreStoreState(
  contract: string,
  tokenId: string
): Promise<StoreStoreState | null> {
  if (!STORE_1155_CONTRACT || contract !== STORE_1155_CONTRACT) return null;

  try {
    const tokenIdBI = BigInt(tokenId);

    const [
      priceRaw,
      maxSupplyRaw,
      totalSupplyRaw,
      active,
      paymentTokenAddressRaw,
      deliveryEnabled,
      physicalItemIncluded,
      officialItem,
      primarySellerWallet,
    ] = await Promise.all([
      safeReadStoreBigInt("productPrices", tokenIdBI),
      safeReadStoreBigInt("maxSupply", tokenIdBI),
      safeReadStoreBigInt("totalSupply", tokenIdBI),
      safeReadStoreBool("isActive", tokenIdBI),
      safeReadStoreAddress("paymentToken"),
      safeReadStoreBool("deliveryEnabled", tokenIdBI),
      safeReadStoreBool("physicalItemIncluded", tokenIdBI),
      safeReadStoreBool("officialItem", tokenIdBI),
      safeReadStoreAddress("primarySellerOf", tokenIdBI),
    ]);

    const remainingRaw =
      maxSupplyRaw !== null && totalSupplyRaw !== null
        ? maxSupplyRaw - totalSupplyRaw
        : null;

    return {
      active: active ?? null,
      priceRaw: priceRaw !== null ? priceRaw.toString() : null,
      priceUsdt: priceRaw !== null ? formatUnits(priceRaw, 6) : null,
      maxSupply: maxSupplyRaw !== null ? maxSupplyRaw.toString() : null,
      totalSupply: totalSupplyRaw !== null ? totalSupplyRaw.toString() : null,
      remaining: remainingRaw !== null ? remainingRaw.toString() : null,
      paymentTokenAddress:
        paymentTokenAddressRaw || PAYMENT_TOKEN_FALLBACK || null,
      deliveryEnabled: deliveryEnabled ?? null,
      physicalItemIncluded: physicalItemIncluded ?? null,
      officialItem: officialItem ?? null,
      primarySellerWallet: primarySellerWallet ?? null,
    };
  } catch {
    return null;
  }
}

async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto =
    h.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "development" ? "http" : "https");
  if (!host) return null;
  return `${proto}://${host}`;
}

async function getPreferredGalleryHref(
  creatorNftsUrl: string | null,
  currentOwnerNftsUrl: string | null
) {
  const h = await headers();
  const referer = String(h.get("referer") || "").trim();
  const origin = await getOrigin();

  if (origin && referer.startsWith(origin)) {
    const path = referer.slice(origin.length);
    if (/^\/app\/profile\/[^/?#]+\/nfts(?:\?[^#]*)?$/.test(path)) {
      return path;
    }

    if (/^\/u\/[^/?#]+\/nfts(?:\?[^#]*)?$/.test(path)) {
      return path;
    }
  }

  return currentOwnerNftsUrl || creatorNftsUrl || null;
}

async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit & { next?: { revalidate?: number; tags?: string[] } },
  timeoutMs: number
): Promise<{
  ok: boolean;
  status: number;
  json: any | null;
  error: string | null;
}> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const r = await fetch(url, { ...init, signal: controller.signal });
    const j = await r.json().catch(() => null);
    if (!r.ok) {
      return {
        ok: false,
        status: r.status,
        json: j,
        error: j?.error || `http_${r.status}`,
      };
    }
    return { ok: true, status: r.status, json: j, error: null };
  } catch (e: any) {
    const msg =
      e?.name === "AbortError" ? "timeout" : e?.message || "fetch_failed";
    return { ok: false, status: 0, json: null, error: msg };
  } finally {
    clearTimeout(t);
  }
}

function marketTagNft(
  chainId: number,
  contract: string,
  tokenId: string,
  marketType?: "STANDARD" | "PROTECTED"
) {
  return `market:nft:${chainId}:${contract}:${tokenId}:${marketType || "ALL"}`;
}

function marketTagContract(
  chainId: number,
  contract: string,
  marketType?: "STANDARD" | "PROTECTED"
) {
  return `market:contract:${chainId}:${contract}:${marketType || "ALL"}`;
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

  if (u.startsWith("/ipfs/")) {
    return `${gw}${u.slice("/ipfs/".length)}`;
  }

  if (u.startsWith("Qm") || u.startsWith("bafy")) return `${gw}${u}`;
  return u;
}

async function loadMetadataFromTokenUri(tokenUri: string) {
  for (const gw of IPFS_GATEWAYS) {
    const url = ipfsToHttp(tokenUri, gw);
    if (!url) continue;

    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) continue;
      const j = await r.json().catch(() => null);
      if (j && typeof j === "object") return j;
    } catch {
      //
    }
  }
  return null;
}

async function loadMetadataFromBackend1155(
  tokenId: string,
  contract?: string | null
) {
  const base = String(API_BASE || "").replace(/\/$/, "");
  const c = String(contract || "").trim().toLowerCase();
  if (!base || !tokenId) return null;

  try {
    const url =
      c && c.startsWith("0x")
        ? `${base}/metadata1155/${encodeURIComponent(c)}/${encodeURIComponent(
            tokenId
          )}`
        : `${base}/metadata1155/${encodeURIComponent(tokenId)}`;

    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;

    const j = await r.json().catch(() => null);
    if (!j || typeof j !== "object") return null;

    const returnedContract = String((j as any)?.contract || "")
      .trim()
      .toLowerCase();

    if (c && returnedContract && returnedContract !== c) return null;
    return j;
  } catch {
    //
  }

  return null;
}

function isLikelyVideoUrl(u?: string | null) {
  const s = (u || "").toLowerCase();
  const clean = s.split("?")[0].split("#")[0];
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".mov") ||
    clean.endsWith(".m4v")
  );
}

function pickAttrValue(meta: any, trait: string): string | null {
  const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
  const t = trait.toLowerCase();
  const hit = attrs.find(
    (a: any) => String(a?.trait_type || "").toLowerCase() === t
  );
  const v = hit?.value;
  if (v === undefined || v === null) return null;
  return String(v);
}

function pickAttrAny(meta: any, traits: string[]): string | null {
  for (const tr of traits) {
    const v = pickAttrValue(meta, tr);
    if (v && v.trim()) return v.trim();
  }
  return null;
}

function pickAny(meta: any, keys: string[]): string | null {
  for (const k of keys) {
    const v = meta?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function pickAnyBoolean(meta: any, keys: string[]): boolean | null {
  for (const k of keys) {
    const v = meta?.[k];
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (["true", "1", "yes", "on"].includes(s)) return true;
      if (["false", "0", "no", "off"].includes(s)) return false;
    }
  }
  return null;
}

function pickAttrBoolean(meta: any, traits: string[]): boolean | null {
  for (const tr of traits) {
    const v = pickAttrValue(meta, tr);
    if (!v) continue;
    const s = v.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(s)) return true;
    if (["false", "0", "no", "off"].includes(s)) return false;
  }
  return null;
}

function normalizeUrl(u?: string | null) {
  const s = String(u || "").trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("www.")) return `https://${s}`;
  return null;
}

function txExplorerUrl(chainId: number, txHash: string) {
  if (!txHash) return null;
  if (chainId === 84532) return `https://sepolia.basescan.org/tx/${txHash}`;
  if (chainId === 8453) return `https://basescan.org/tx/${txHash}`;
  return null;
}

function contractExplorerUrl(chainId: number, contract: string) {
  if (!contract) return null;
  if (chainId === 84532)
    return `https://sepolia.basescan.org/address/${contract}`;
  if (chainId === 8453) return `https://basescan.org/address/${contract}`;
  return null;
}

function toInt(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function isProtectedFulfillment(v?: string | null) {
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
    "mentoring",
    "tutoring",
    "website",
    "website development",
    "website design",
    "web design",
    "web development",
    "landing page",
    "development",
    "design",
    "graphic design",
    "logo design",
    "ui ux",
    "seo",
    "smm",
    "marketing work",
    "promo work",
    "ai work",
    "audit",
    "call",
    "meeting",
    "session",
  ];

  return needles.some((x) => s.includes(x));
}

function suggestSecondaryMarketType(input: {
  contract: string;
  fulfillmentType?: string | null;
  deliveryEnabled?: boolean | null;
  physicalItemIncluded?: boolean | null;
  category?: string | null;
  subcategory?: string | null;
}) {
  const c = norm(input.contract);

  if (c && (c === CAFE_1155_CONTRACT || c === STORE_1155_CONTRACT)) {
    return "STANDARD" as const;
  }

  if (c && c === USER_DELIVERY_1155_CONTRACT) {
    return "PROTECTED" as const;
  }

  if (isProtectedFulfillment(input.fulfillmentType)) {
    return "PROTECTED" as const;
  }

  if (input.deliveryEnabled || input.physicalItemIncluded) {
    return "PROTECTED" as const;
  }

  if (textLooksProtected(input.category, input.subcategory)) {
    return "PROTECTED" as const;
  }

  return "STANDARD" as const;
}

function inferProtectedSubtype(input: {
  contract: string;
  fulfillmentType?: string | null;
  deliveryEnabled?: boolean | null;
  physicalItemIncluded?: boolean | null;
  category?: string | null;
  subcategory?: string | null;
}) {
  const ft = String(input.fulfillmentType || "").trim().toUpperCase();

  if (
    ft === "PHYSICAL_GOOD" ||
    ft === "DIGITAL_SERVICE" ||
    ft === "ONLINE_SESSION" ||
    ft === "LOCAL_SERVICE"
  ) {
    return ft as
      | "PHYSICAL_GOOD"
      | "DIGITAL_SERVICE"
      | "ONLINE_SESSION"
      | "LOCAL_SERVICE";
  }

  if (norm(input.contract) === USER_DELIVERY_1155_CONTRACT) {
    return "PHYSICAL_GOOD" as const;
  }

  if (input.deliveryEnabled || input.physicalItemIncluded) {
    return "PHYSICAL_GOOD" as const;
  }

  const category = normText(input.category);
  const subcategory = normText(input.subcategory);
  const merged = [category, subcategory].filter(Boolean).join(" ");

  if (merged.includes("online session") || merged.includes("session")) {
    return "ONLINE_SESSION" as const;
  }

  if (merged.includes("local service")) {
    return "LOCAL_SERVICE" as const;
  }

  if (textLooksProtected(input.category, input.subcategory)) {
    return "DIGITAL_SERVICE" as const;
  }

  return null;
}

function fulfillmentTypeLabel(v?: string | null) {
  const s = String(v || "").trim().toUpperCase();
  if (!s) return null;
  return s.replaceAll("_", " ");
}

function fulfillmentTypeTone(
  v?: string | null
): "default" | "gold" | "emerald" | "sky" | "violet" {
  const s = String(v || "").trim().toUpperCase();

  if (s === "PHYSICAL_GOOD") return "emerald";
  if (s === "LOCAL_SERVICE") return "sky";
  if (s === "ONLINE_SESSION") return "gold";
  if (s === "DIGITAL_SERVICE") return "violet";
  return "violet";
}

function cleanLocationValue(v?: string | null) {
  const s = String(v || "").trim();
  return s ? s : null;
}

function formatServiceLocation(input: {
  serviceCountry?: string | null;
  serviceCity?: string | null;
  serviceArea?: string | null;
}) {
  const country = cleanLocationValue(input.serviceCountry);
  const city = cleanLocationValue(input.serviceCity);
  const area = cleanLocationValue(input.serviceArea);
  const main = [city, country].filter(Boolean).join(", ");
  if (main && area) return main + " • " + area;
  return main || area || null;
}

async function loadMarketNft(
  origin: string | null,
  chainId: number,
  contract: string,
  tokenId: string,
  marketType?: "STANDARD" | "PROTECTED"
) {
  const qs =
    `chainId=${encodeURIComponent(String(chainId))}` +
    `&contract=${encodeURIComponent(contract)}` +
    `&tokenId=${encodeURIComponent(tokenId)}` +
    (marketType ? `&marketType=${encodeURIComponent(marketType)}` : "") +
    `&listingsTake=50&tradesTake=50`;

  const url = origin ? `${origin}/api/market/nft?${qs}` : `/api/market/nft?${qs}`;

  const tags = [
    marketTagNft(chainId, contract, tokenId, marketType),
    marketTagContract(chainId, contract, marketType),
    `market:nft:${chainId}:${contract}:${tokenId}`,
    `market:contract:${chainId}:${contract}`,
  ];

  const res = await fetchJsonWithTimeout(
    url,
    {
      next: { revalidate: MARKET_REVALIDATE_SECONDS, tags },
      headers: { accept: "application/json" },
    },
    MARKET_FETCH_TIMEOUT_MS
  );

  if (!res.ok)
    return { data: null as any, error: res.error || "market_unavailable" };
  return { data: res.json, error: null as string | null };
}

function fmtEth(wei?: string | null) {
  try {
    if (!wei) return "—";
    const s = formatUnits(BigInt(wei), 18);
    const [a, b] = s.split(".");
    if (!b) return a;
    const bb = b.slice(0, 6).replace(/0+$/, "");
    return bb ? `${a}.${bb}` : a;
  } catch {
    return "—";
  }
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "gold";
}) {
  return (
    <div
      className={cx(
        "rounded-2xl border px-4 py-3",
        tone === "gold"
          ? "border-amber-500/20 bg-amber-500/10"
          : "border-white/10 bg-white/[0.04]"
      )}
    >
      <div
        className={cx(
          "text-[11px] font-semibold uppercase tracking-wider",
          tone === "gold" ? "text-amber-100/70" : "text-white/40"
        )}
      >
        {label}
      </div>
      <div
        className={cx(
          "mt-1 text-sm font-bold truncate",
          tone === "gold" ? "text-amber-100" : "text-white/90"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function PersonCard({
  label,
  avatar,
  name,
  href,
  secondaryHref,
}: {
  label: string;
  avatar?: string | null;
  name: string;
  href?: string | null;
  secondaryHref?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_18px_70px_rgba(0,0,0,0.30)] ring-1 ring-black/15">
          {avatar ? (
            <img
              src={avatar}
              alt={label}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-xs font-bold text-white/35">RL</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
            {label}
          </div>
          <div className="mt-1 truncate text-sm font-bold text-white/85">
            {href ? (
              <Link className="hover:underline" href={href}>
                {name}
              </Link>
            ) : (
              name
            )}
          </div>
        </div>

        {secondaryHref ? (
          <Link
            href={secondaryHref}
            className="shrink-0 text-[12px] font-bold text-amber-100/90 hover:text-amber-100"
          >
            View NFTs →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function InfoPill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "gold" | "emerald" | "sky" | "violet";
}) {
  const cls =
    tone === "gold"
      ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
      : tone === "emerald"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
      : tone === "sky"
      ? "border-sky-500/20 bg-sky-500/10 text-sky-100"
      : tone === "violet"
      ? "border-violet-500/20 bg-violet-500/10 text-violet-100"
      : "border-white/10 bg-white/[0.06] text-white/75";

  return (
    <span className={cx("rounded-full border px-3 py-1.5 text-[11px] font-bold", cls)}>
      {children}
    </span>
  );
}

function FavoriteSoonButton({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      title="Favorites soon"
      aria-label="Favorites soon"
      className={cx(
        "inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/38 text-white/88 backdrop-blur-xl transition",
        compact
          ? "px-3 py-1.5 text-[11px] font-bold shadow-[0_14px_40px_rgba(0,0,0,0.28)]"
          : "px-4 py-2 text-[12px] font-black shadow-[0_18px_60px_rgba(0,0,0,0.32)]"
      )}
    >
      <span className="text-[14px] leading-none text-rose-200">♥</span>
      <span>{compact ? "Soon" : "Favorites soon"}</span>
    </button>
  );
}

function AccordionSection({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className={cx(
        "group/acc overflow-hidden rounded-[22px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.16),rgba(212,175,55,0.08),rgba(184,135,10,0.06))]",
        "shadow-[0_26px_100px_rgba(0,0,0,0.55)]",
        "transition-shadow duration-300 hover:shadow-[0_30px_120px_rgba(212,175,55,0.10)]"
      )}
    >
      <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[#0b0a09]/30 ring-1 ring-black/10 backdrop-blur-2xl">
        <summary className="list-none cursor-pointer select-none transition-colors duration-200 hover:bg-white/[0.02]">
          <div className="flex items-center justify-between gap-4 px-6 py-5 md:px-7 md:py-6">
            <div className="min-w-0">
              <div className="text-[13px] font-black tracking-tight text-white/92 md:text-sm">
                {title}
              </div>
              {subtitle ? (
                <div className="mt-1.5 text-[12px] leading-relaxed text-white/45">
                  {subtitle}
                </div>
              ) : null}
            </div>

            <div
              className={cx(
                "shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-2xl",
                "border border-white/10 bg-white/[0.05] text-amber-100/85",
                "transition-all duration-300",
                "group-hover/acc:bg-white/[0.08] group-hover/acc:text-amber-100",
                "group-open/acc:rotate-180 group-open/acc:bg-amber-500/10 group-open/acc:border-amber-500/25"
              )}
              aria-hidden
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="transition-transform duration-300"
              >
                <path
                  d="M3 5l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </summary>

        <div className="border-t border-white/10 px-6 py-6 md:px-7 md:py-7">
          {children}
        </div>
      </div>
    </details>
  );
}

export default async function NftDetailsPage({
  params,
}: {
  params: Promise<{ chainId: string; contract: string; tokenId: string }>;
}) {
  const p = await params;

  const chainId = Number(p.chainId);
  const contract = norm(safeDecode(p.contract || ""));
  const tokenId = safeDecode(p.tokenId || "").trim();

  if (!Number.isFinite(chainId) || !contract.startsWith("0x") || !tokenId) {
    notFound();
  }

  if (ALLOWED_1155_CONTRACTS.length > 0 && !ALLOWED_1155_CONTRACTS.includes(contract)) {
    notFound();
  }

  const isCafeNft = !!CAFE_1155_CONTRACT && contract === CAFE_1155_CONTRACT;
  const isStoreNft = !!STORE_1155_CONTRACT && contract === STORE_1155_CONTRACT;
  const isUserStandard1155Nft =
    !!USER_STANDARD_1155_CONTRACT && contract === USER_STANDARD_1155_CONTRACT;
  const isUserDelivery1155Nft =
    !!USER_DELIVERY_1155_CONTRACT && contract === USER_DELIVERY_1155_CONTRACT;

  const nft = await prisma.mint.findFirst({
    where: { chainId, contract, tokenId, verified: true },
    select: {
      id: true,
      createdAt: true,
      chainId: true,
      contract: true,
      tokenId: true,
      txHash: true,
      tokenUri: true,
      name: true,
      image: true,
      metaImage: true,
      metaAnimation: true,
      metaMediaKind: true,
      metaDescription: true,
      metaCollection: true,
      metaItem: true,
      metaRarity: true,
      metaBrand: true,
      metaProject: true,
      deliveryEnabled: true,
      physicalItemIncluded: true,
      officialItem: true,
      fulfillmentType: true,
      category: true,
      subcategory: true,
      serviceCountry: true,
      serviceCity: true,
      serviceArea: true,
      user: {
        select: {
          handle: true,
          publicId: true,
          twitterName: true,
          twitterUser: true,
          twitterImage: true,
          discordName: true,
          discordUser: true,
          discordImage: true,
          googleName: true,
          googleImage: true,
          walletAddress: true,
        },
      },
    },
  });

  if (!nft) notFound();

  const creator = nft.user;

  const creatorPublicKey = creator?.handle || creator?.publicId || null;
  const creatorUrl =
    creatorPublicKey && creatorPublicKey !== "tmp"
      ? `/app/profile/${creatorPublicKey}`
      : null;
  const creatorNftsUrl = creatorUrl ? `${creatorUrl}/nfts` : null;

  const creatorName =
    creator?.twitterName ||
    creator?.discordName ||
    creator?.googleName ||
    (creator?.twitterUser ? `@${creator.twitterUser}` : null) ||
    (creator?.discordUser ? `@${creator.discordUser}` : null) ||
    (creator?.handle ? `@${creator.handle}` : null) ||
    shortAddr(creator?.walletAddress || null);

  const creatorAvatar =
    creator?.twitterImage || creator?.discordImage || creator?.googleImage || null;

  const holdersCount = await prisma.holding.count({
    where: {
      chainId,
      contract,
      tokenId,
      amount: { gt: 0n },
    },
  });

  const topHolder = await prisma.holding.findFirst({
    where: {
      chainId,
      contract,
      tokenId,
      amount: { gt: 0n },
    },
    orderBy: [{ amount: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
    select: {
      amount: true,
      user: {
        select: {
          handle: true,
          publicId: true,
          twitterName: true,
          twitterUser: true,
          twitterImage: true,
          discordName: true,
          discordUser: true,
          discordImage: true,
          googleName: true,
          googleImage: true,
          walletAddress: true,
        },
      },
    },
  });

  const currentOwnerUser = topHolder?.user || creator || null;

  const currentOwnerPublicKey =
    currentOwnerUser?.handle || currentOwnerUser?.publicId || null;
  const currentOwnerUrl =
    currentOwnerPublicKey && currentOwnerPublicKey !== "tmp"
      ? `/app/profile/${currentOwnerPublicKey}`
      : null;
  const currentOwnerNftsUrl = currentOwnerUrl ? `${currentOwnerUrl}/nfts` : null;

  const currentOwnerName =
    currentOwnerUser?.twitterName ||
    currentOwnerUser?.discordName ||
    currentOwnerUser?.googleName ||
    (currentOwnerUser?.twitterUser ? `@${currentOwnerUser.twitterUser}` : null) ||
    (currentOwnerUser?.discordUser ? `@${currentOwnerUser.discordUser}` : null) ||
    (currentOwnerUser?.handle ? `@${currentOwnerUser.handle}` : null) ||
    shortAddr(currentOwnerUser?.walletAddress || null);

  const currentOwnerAvatar =
    currentOwnerUser?.twitterImage ||
    currentOwnerUser?.discordImage ||
    currentOwnerUser?.googleImage ||
    null;

  const ownershipLabel = holdersCount > 1 ? "Top holder" : "Current owner";

  const tokenUriHttp = nft.tokenUri
    ? ipfsToHttp(nft.tokenUri, IPFS_GATEWAYS[0])
    : null;
  const txUrl = nft.txHash ? txExplorerUrl(nft.chainId, nft.txHash) : null;
  const contractUrl = contractExplorerUrl(nft.chainId, nft.contract);

  const fallbackPoster =
    ipfsToHttp(nft.metaImage, IPFS_GATEWAYS[0]) ||
    ipfsToHttp(nft.image, IPFS_GATEWAYS[0]);

  const cachedMeta = {
    name: nft.name || null,
    description: nft.metaDescription || null,
    image: nft.metaImage || null,
    animation_url: nft.metaAnimation || null,
    mediaKind: nft.metaMediaKind || null,
    collection: nft.metaCollection || null,
    item: nft.metaItem || null,
    rarity: nft.metaRarity || null,
    brand: nft.metaBrand || null,
    project: nft.metaProject || null,
  };

  const hasCachedMeta = Boolean(
    cachedMeta.image ||
      cachedMeta.animation_url ||
      cachedMeta.description ||
      cachedMeta.mediaKind ||
      cachedMeta.collection ||
      cachedMeta.item ||
      cachedMeta.rarity ||
      cachedMeta.brand ||
      cachedMeta.project
  );

  const shouldUseBackendMetadata =
    !hasCachedMeta && (isUserStandard1155Nft || isUserDelivery1155Nft);

  const liveMeta = shouldUseBackendMetadata
    ? await loadMetadataFromBackend1155(tokenId, contract)
    : null;

  const tokenUriMeta =
    !liveMeta && !hasCachedMeta && nft.tokenUri
      ? await loadMetadataFromTokenUri(nft.tokenUri)
      : null;

  const meta = liveMeta || tokenUriMeta || (hasCachedMeta ? cachedMeta : null);

  const cafeStore = isCafeNft ? await loadCafeStoreState(contract, tokenId) : null;
  const storeStore = isStoreNft ? await loadStoreStoreState(contract, tokenId) : null;

  let supplyLabel: string | null = null;
  if (meta) {
    supplyLabel = pickAttrValue(meta, "Total Supply");
    if (!supplyLabel && cafeStore?.maxSupply) supplyLabel = cafeStore.maxSupply;
    if (!supplyLabel && storeStore?.maxSupply) supplyLabel = storeStore.maxSupply;

    if (!supplyLabel) {
      const s = meta?.supply;
      if (typeof s === "number") supplyLabel = String(s);
      else if (typeof s === "string" && s.trim()) supplyLabel = s.trim();
    }
  } else if (cafeStore?.maxSupply) {
    supplyLabel = cafeStore.maxSupply;
  } else if (storeStore?.maxSupply) {
    supplyLabel = storeStore.maxSupply;
  }

  const metaDescription =
    typeof meta?.description === "string" && meta.description.trim()
      ? meta.description.trim()
      : null;

  const metaBrand =
    pickAttrAny(meta, ["Brand Project", "Brand", "Project", "project"]) ||
    pickAny(meta, ["brandProject", "brand", "project"]) ||
    null;

  const metaProject =
    pickAttrAny(meta, ["Project", "project"]) || pickAny(meta, ["project"]) || null;

  const metaCollection =
    pickAttrAny(meta, ["Collection", "collection"]) ||
    pickAny(meta, ["collection"]) ||
    null;

  const metaCategory =
    pickAttrAny(meta, ["Category", "category"]) ||
    pickAny(meta, ["category"]) ||
    nft.category ||
    null;

  const metaSubcategory =
    pickAttrAny(meta, ["Subcategory", "subcategory"]) ||
    pickAny(meta, ["subcategory"]) ||
    nft.subcategory ||
    null;

  const metaItem =
    pickAttrAny(meta, ["Item", "item", "Drink"]) ||
    pickAny(meta, ["item", "drink"]) ||
    null;

  const metaItemType =
    pickAttrAny(meta, ["Item Type", "Item type", "item type"]) ||
    pickAny(meta, ["itemType", "item_type"]) ||
    metaItem ||
    null;

  const metaRarity =
    pickAttrAny(meta, ["Rarity", "rarity"]) || pickAny(meta, ["rarity"]) || null;

  const metaVertical =
    pickAttrAny(meta, ["Vertical", "vertical"]) ||
    pickAny(meta, ["vertical"]) ||
    null;

  const metaProofRaw =
    pickAny(meta, ["external_url", "externalUrl", "proofUrl", "proof_url", "url"]) ||
    pickAttrAny(meta, ["Proof / X link", "Proof", "X", "X link", "Proof URL"]);

  const metaProofUrl = normalizeUrl(metaProofRaw);

  const metaDeliveryEnabled =
    pickAnyBoolean(meta, ["deliveryEnabled"]) ??
    pickAttrBoolean(meta, ["Delivery Enabled"]) ??
    false;

  const metaPhysicalItemIncluded =
    pickAnyBoolean(meta, ["physicalItemIncluded"]) ??
    pickAttrBoolean(meta, ["Physical Item Included"]) ??
    false;

  const metaOfficialItem =
    pickAnyBoolean(meta, ["officialItem"]) ??
    pickAttrBoolean(meta, ["Official Item"]) ??
    false;

  const metaFulfillmentType =
    pickAny(meta, ["fulfillmentType"]) ||
    pickAttrAny(meta, ["Fulfillment Type", "Fulfillment"]) ||
    nft.fulfillmentType ||
    null;

  const serviceCountry =
    pickAny(meta, ["serviceCountry", "service_country", "country"]) ||
    pickAttrAny(meta, ["Service Country", "Country"]) ||
    nft.serviceCountry ||
    null;

  const serviceCity =
    pickAny(meta, ["serviceCity", "service_city", "city"]) ||
    pickAttrAny(meta, ["Service City", "City"]) ||
    nft.serviceCity ||
    null;

  const serviceArea =
    pickAny(meta, ["serviceArea", "service_area", "area", "serviceZone", "service_zone"]) ||
    pickAttrAny(meta, ["Service Area", "Service Zone", "Area"]) ||
    nft.serviceArea ||
    null;

  const serviceLocationLabel = formatServiceLocation({
    serviceCountry,
    serviceCity,
    serviceArea,
  });

  const dbDeliveryEnabled = Boolean(nft.deliveryEnabled);
  const dbPhysicalItemIncluded = Boolean(nft.physicalItemIncluded);
  const dbOfficialItem = Boolean(nft.officialItem);

  const effectiveStoreDeliveryEnabled = isStoreNft
    ? Boolean(storeStore?.deliveryEnabled || dbDeliveryEnabled || metaDeliveryEnabled)
    : false;

  const effectiveStorePhysicalItemIncluded = isStoreNft
    ? Boolean(
        storeStore?.physicalItemIncluded ||
          dbPhysicalItemIncluded ||
          metaPhysicalItemIncluded
      )
    : false;

  const effectiveStoreOfficialItem = isStoreNft
    ? Boolean(storeStore?.officialItem || dbOfficialItem || metaOfficialItem)
    : false;

  const storePrimaryDeliveryCapable =
    isStoreNft &&
    (effectiveStoreDeliveryEnabled || effectiveStorePhysicalItemIncluded);

  const suggestedSecondaryMarketType = suggestSecondaryMarketType({
    contract,
    fulfillmentType: metaFulfillmentType || nft.fulfillmentType,
    deliveryEnabled: isStoreNft
      ? false
      : Boolean(dbDeliveryEnabled || metaDeliveryEnabled),
    physicalItemIncluded: isStoreNft
      ? false
      : Boolean(dbPhysicalItemIncluded || metaPhysicalItemIncluded),
    category: metaCategory || nft.category,
    subcategory: metaSubcategory || nft.subcategory,
  });

  let kind: "image" | "video" = "image";
  let media: string | null = fallbackPoster;
  let poster: string | null = null;

  if (meta) {
    const metaImage =
      typeof meta?.image === "string"
        ? meta.image
        : typeof meta?.image_url === "string"
        ? meta.image_url
        : typeof meta?.imageUrl === "string"
        ? meta.imageUrl
        : null;

    const metaAnimation =
      typeof meta?.animation_url === "string"
        ? meta.animation_url
        : typeof meta?.animationUrl === "string"
        ? meta.animationUrl
        : typeof meta?.animation === "string"
        ? meta.animation
        : null;

    const metaMediaKind =
      typeof meta?.mediaKind === "string"
        ? meta.mediaKind.toLowerCase()
        : typeof meta?.media_kind === "string"
        ? meta.media_kind.toLowerCase()
        : null;

    const imgHttp = ipfsToHttp(metaImage, IPFS_GATEWAYS[0]) || fallbackPoster;
    const animHttp =
      ipfsToHttp(metaAnimation, PINATA_IPFS) ||
      ipfsToHttp(metaAnimation, IPFS_GATEWAYS[0]);

    if (metaAnimation || metaMediaKind === "video" || isLikelyVideoUrl(animHttp)) {
      kind = "video";
      media = animHttp || null;
      poster = imgHttp || fallbackPoster || null;

      if (!media) {
        kind = "image";
        media = poster;
        poster = null;
      }
    } else {
      kind = "image";
      media = imgHttp || fallbackPoster;
      poster = null;
    }
  }

  const standardLabel = isCafeNft
    ? "ERC-1155 • CAFE"
    : isStoreNft
    ? "ERC-1155 • STORE"
    : isUserDelivery1155Nft
    ? "ERC-1155 • LEGACY DELIVERY CONTRACT"
    : isUserStandard1155Nft
    ? "ERC-1155 • UNIFIED PUBLIC CONTRACT"
    : "ERC-1155";

  const origin = await getOrigin();
  const { data: market, error: marketError } = await loadMarketNft(
    origin,
    chainId,
    contract,
    tokenId
  );

  const apiResolvedMarketType =
    market?.mint?.resolvedMarketType === "PROTECTED" ? "PROTECTED" : null;

  const secondaryMarketType: "STANDARD" | "PROTECTED" =
    apiResolvedMarketType || suggestedSecondaryMarketType;

  const usesProtectedSecondaryMarket = secondaryMarketType === "PROTECTED";

  const protectedSubtype =
    usesProtectedSecondaryMarket
      ? inferProtectedSubtype({
          contract,
          fulfillmentType: metaFulfillmentType || nft.fulfillmentType,
          deliveryEnabled: isStoreNft
            ? false
            : Boolean(dbDeliveryEnabled || metaDeliveryEnabled),
          physicalItemIncluded: isStoreNft
            ? false
            : Boolean(dbPhysicalItemIncluded || metaPhysicalItemIncluded),
          category: metaCategory || nft.category,
          subcategory: metaSubcategory || nft.subcategory,
        })
      : null;

  const protectedSubtypeLabel = fulfillmentTypeLabel(protectedSubtype);
  const protectedFlowTypeLabel = protectedSubtypeLabel || "PROTECTED";

  const stats = market?.stats || null;
  const listings: any[] = Array.isArray(market?.listings) ? market.listings : [];
  const trades: any[] = Array.isArray(market?.trades) ? market.trades : [];
  const initialTradingMarketData = market && market.ok ? market : null;
  const heroBrandLabel = metaBrand || metaProject || null;

  const backToGalleryHref = await getPreferredGalleryHref(
    creatorNftsUrl,
    currentOwnerNftsUrl
  );

  const hasStorefrontPanel = isCafeNft || isStoreNft;
  const hasSecondaryActionPanel = hasStorefrontPanel || usesProtectedSecondaryMarket;

  const storeCheckoutMode =
    effectiveStoreDeliveryEnabled || effectiveStorePhysicalItemIncluded
      ? "delivery"
      : "simple";

  const TradingPanelAny = TradingPanel1155 as any;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#060505] text-white scroll-smooth">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(255,255,255,0.05),transparent_60%)]" />
        <div className="animate-orb-1 absolute -left-80 -top-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/12 blur-3xl" />
        <div className="animate-orb-2 absolute -bottom-80 -right-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[length:56px_56px]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.65),transparent)]" />
      </div>

      <div className="relative mx-auto max-w-[1480px] px-4 py-5 md:px-5 md:py-6 space-y-4">
        <div className="reveal grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-white/40">
              {backToGalleryHref ? (
                <Link className="hover:underline" href={backToGalleryHref}>
                  Gallery
                </Link>
              ) : (
                <span>NFT</span>
              )}
              <span>›</span>
              <span className="truncate font-black text-white/75">
                {nft.name || `Token #${nft.tokenId}`}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {heroBrandLabel ? <InfoPill tone="gold">{heroBrandLabel}</InfoPill> : null}
              {metaCollection ? <InfoPill>{metaCollection}</InfoPill> : null}
              <InfoPill>{standardLabel}</InfoPill>
              {metaRarity ? <InfoPill>{metaRarity}</InfoPill> : null}

              {usesProtectedSecondaryMarket ? (
                <InfoPill tone="violet">PROTECTED SECONDARY FLOW</InfoPill>
              ) : null}

              {protectedSubtypeLabel ? (
                <InfoPill tone={fulfillmentTypeTone(protectedSubtype)}>
                  {protectedSubtypeLabel}
                </InfoPill>
              ) : null}

              {serviceLocationLabel ? (
                <InfoPill tone="sky">{serviceLocationLabel}</InfoPill>
              ) : null}

              {storePrimaryDeliveryCapable ? (
                <InfoPill tone="emerald">PRIMARY DELIVERY AVAILABLE</InfoPill>
              ) : null}

              {isStoreNft ? <InfoPill tone="sky">SECONDARY TRADING ONLY</InfoPill> : null}
              {isStoreNft ? <InfoPill tone="sky">SECONDARY NO DELIVERY</InfoPill> : null}

              {isCafeNft ? <InfoPill tone="gold">SECONDARY TRADING ONLY</InfoPill> : null}
              {isCafeNft ? <InfoPill tone="gold">SECONDARY NO REDEMPTION</InfoPill> : null}

              <InfoPill tone={secondaryMarketType === "PROTECTED" ? "violet" : "sky"}>
                Market: {secondaryMarketType}
              </InfoPill>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto xl:justify-self-end">
            {backToGalleryHref ? (
              <Link
                href={backToGalleryHref}
                className="inline-flex min-w-[190px] items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-4 py-2 font-extrabold text-black ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_22px_70px_rgba(212,175,55,0.28)] active:translate-y-0"
              >
                Back to gallery
              </Link>
            ) : null}

            {isCafeNft ? (
              <Link
                href={CAFE_STOREFRONT_HREF}
                className="inline-flex min-w-[190px] items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2 font-bold shadow-[0_18px_70px_rgba(0,0,0,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 active:translate-y-0"
              >
                Cafe storefront
              </Link>
            ) : null}

            {isStoreNft ? (
              <Link
                href={STORE_STOREFRONT_HREF}
                className="inline-flex min-w-[190px] items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2 font-bold shadow-[0_18px_70px_rgba(0,0,0,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 active:translate-y-0"
              >
                NFT Store
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.02fr)_minmax(520px,0.98fr)]">
          <div className="space-y-4">
            <div
              className={cx(
                "reveal group/media overflow-hidden rounded-[22px] p-px",
                "bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))]",
                "shadow-[0_34px_130px_rgba(0,0,0,0.60)]",
                "transition-shadow duration-500 hover:shadow-[0_40px_140px_rgba(212,175,55,0.18)]"
              )}
              style={{ animationDelay: "80ms" }}
            >
              <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[#0b0a09]/15 ring-1 ring-black/10 backdrop-blur-2xl">
                <div className="relative aspect-square bg-black">
                  {media ? (
                    <NftPreviewLightbox
                      src={media}
                      kind={kind}
                      alt={nft.name || "NFT"}
                      poster={kind === "video" ? poster : null}
                      showControls={kind === "video"}
                      fit="contain"
                      className="h-full w-full"
                      roundedClass="rounded-none"
                      buttonClassName="right-5 top-[4.75rem]"
                      priority
                      sizes="(max-width: 1279px) 100vw, 48vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-black text-white/25">
                      No media
                    </div>
                  )}

                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/media:opacity-100 bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.10),transparent_70%)]" />

                  <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5">
                    <div className="pointer-events-none flex flex-wrap gap-2">
                      <InfoPill>{standardLabel}</InfoPill>
                      {kind === "video" ? <InfoPill tone="gold">VIDEO</InfoPill> : null}
                    </div>

                    <div className="flex items-center gap-2">
                      {supplyLabel ? (
                        <div className="pointer-events-none">
                          <InfoPill>Supply {supplyLabel}</InfoPill>
                        </div>
                      ) : null}
                      <FavoriteSoonButton compact />
                    </div>
                  </div>

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.76)_0%,rgba(0,0,0,0.30)_42%,transparent_100%)] p-4 md:p-5">
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/40">
                      {isCafeNft
                        ? "Realife Cafe Edition"
                        : isStoreNft
                        ? "Realife Store Edition"
                        : isUserDelivery1155Nft
                        ? "Realife Delivery Contract Edition"
                        : isUserStandard1155Nft
                        ? "Realife Standard Contract Edition"
                        : "Realife Edition"}
                    </div>

                    <div className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">
                      {nft.name || `Token #${nft.tokenId}`}
                    </div>

                    {metaCollection || heroBrandLabel ? (
                      <div className="mt-2 text-[13px] text-white/60">
                        {[heroBrandLabel, metaCollection].filter(Boolean).join(" • ")}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 h-full">
            <div
              className={cx(
                "reveal h-full overflow-hidden rounded-[22px] p-px",
                "bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))]",
                "shadow-[0_34px_130px_rgba(0,0,0,0.60)]"
              )}
              style={{ animationDelay: "140ms" }}
            >
              <div className="h-full overflow-hidden rounded-[22px] border border-white/10 bg-[#0b0a09]/30 ring-1 ring-black/10 backdrop-blur-2xl">
                <div className="flex h-full min-h-[560px] flex-col p-4 md:min-h-[620px] md:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/40">
                      {isCafeNft
                        ? "Realife Cafe Edition"
                        : isStoreNft
                        ? "Realife Store Edition"
                        : usesProtectedSecondaryMarket
                        ? "Protected Marketplace Edition"
                        : "Realife Edition"}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-amber-100">
                        {standardLabel}
                      </div>
                      <FavoriteSoonButton compact />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {heroBrandLabel ? <InfoPill tone="gold">{heroBrandLabel}</InfoPill> : null}
                    {metaCollection ? <InfoPill>{metaCollection}</InfoPill> : null}
                    {metaRarity ? <InfoPill>{metaRarity}</InfoPill> : null}

                    {usesProtectedSecondaryMarket ? (
                      <InfoPill tone="violet">PROTECTED</InfoPill>
                    ) : null}

                    {protectedSubtypeLabel ? (
                      <InfoPill tone={fulfillmentTypeTone(protectedSubtype)}>
                        {protectedSubtypeLabel}
                      </InfoPill>
                    ) : null}

                    {serviceLocationLabel ? (
                      <InfoPill tone="sky">{serviceLocationLabel}</InfoPill>
                    ) : null}

                    {storePrimaryDeliveryCapable ? (
                      <InfoPill tone="emerald">PRIMARY DELIVERY AVAILABLE</InfoPill>
                    ) : null}

                    {isStoreNft ? <InfoPill tone="sky">SECONDARY TRADING ONLY</InfoPill> : null}
                    {isStoreNft ? <InfoPill tone="sky">SECONDARY NO DELIVERY</InfoPill> : null}

                    {isCafeNft ? <InfoPill tone="gold">SECONDARY TRADING ONLY</InfoPill> : null}
                    {isCafeNft ? <InfoPill tone="gold">SECONDARY NO REDEMPTION</InfoPill> : null}

                    {isStoreNft && effectiveStoreOfficialItem ? (
                      <InfoPill>Official item</InfoPill>
                    ) : null}

                    <InfoPill tone={secondaryMarketType === "PROTECTED" ? "violet" : "sky"}>
                      {secondaryMarketType} market
                    </InfoPill>
                  </div>

                  <div className="mt-3 text-2xl font-black tracking-tight md:text-[2rem]">
                    {nft.name || `Token #${nft.tokenId}`}
                  </div>

                  <div className="mt-6 space-y-3">
                    <PersonCard
                      label={ownershipLabel}
                      avatar={currentOwnerAvatar}
                      name={currentOwnerName}
                      href={currentOwnerUrl}
                      secondaryHref={currentOwnerNftsUrl}
                    />

                    <PersonCard
                      label="Creator / Profile"
                      avatar={creatorAvatar}
                      name={creatorName}
                      href={creatorUrl}
                      secondaryHref={creatorNftsUrl}
                    />
                  </div>

                  {usesProtectedSecondaryMarket ? (
                    <div className="mt-5 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
                      <div className="text-[12px] font-bold text-violet-100">
                        Protected marketplace flow
                      </div>
                      <div className="mt-2 text-[12px] leading-relaxed text-violet-50/90">
                        This NFT uses the <span className="font-black">PROTECTED marketplace</span>.
                        Buyer receives the NFT, but funds stay in protected escrow until completion
                        is confirmed or refund resolution is finished.
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {protectedSubtypeLabel ? (
                          <InfoPill tone={fulfillmentTypeTone(protectedSubtype)}>
                            {protectedSubtypeLabel}
                          </InfoPill>
                        ) : null}
                        {metaCategory ? <InfoPill tone="violet">{metaCategory}</InfoPill> : null}
                        {metaSubcategory ? (
                          <InfoPill tone="violet">{metaSubcategory}</InfoPill>
                        ) : null}
                        {serviceLocationLabel ? (
                          <InfoPill tone="sky">{serviceLocationLabel}</InfoPill>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {protectedSubtype === "LOCAL_SERVICE" && serviceLocationLabel ? (
                    <div className="mt-5 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
                      <div className="text-[12px] font-bold text-sky-100">
                        Local / offline service location
                      </div>
                      <div className="mt-2 text-[12px] leading-relaxed text-sky-50/90">
                        This service is available around
                        <span className="font-black"> {serviceLocationLabel}</span>.
                        Exact address, timing and handoff details should be coordinated inside
                        the protected order room after purchase.
                      </div>
                    </div>
                  ) : null}

                  {isStoreNft ? (
                    <div className="mt-5 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
                      <div className="text-[12px] font-bold text-sky-100">
                        Store primary vs secondary
                      </div>
                      <div className="mt-2 text-[12px] leading-relaxed text-sky-50/90">
                        Primary store purchase may include delivery and official fulfillment
                        through the Realife Store flow. Secondary market purchase is trading
                        only and does not automatically include delivery for the secondary buyer.
                      </div>
                    </div>
                  ) : null}

                  {isCafeNft ? (
                    <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                      <div className="text-[12px] font-bold text-amber-100">
                        Cafe primary vs secondary
                      </div>
                      <div className="mt-2 text-[12px] leading-relaxed text-amber-50/90">
                        Primary cafe purchase is handled separately through the official
                        Realife Cafe flow. Secondary market purchase is trading only and does
                        not automatically guarantee drink, merch, or redemption rights.
                      </div>
                    </div>
                  ) : null}

                  {marketError ? (
                    <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-[12px] text-amber-100">
                      Market data temporarily unavailable ({marketError}). NFT details still
                      work.
                    </div>
                  ) : null}

                  <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
                    <StatCard
                      label="Floor"
                      value={stats?.floorWei ? `${fmtEth(stats.floorWei)} ETH` : "—"}
                      tone="gold"
                    />
                    <StatCard
                      label="Last sale"
                      value={stats?.lastSaleWei ? `${fmtEth(stats.lastSaleWei)} ETH` : "—"}
                    />
                    <StatCard
                      label="Active"
                      value={String(toInt(stats?.activeListings ?? 0))}
                    />
                    <StatCard
                      label="Top holder amount"
                      value={topHolder?.amount ? topHolder.amount.toString() : "—"}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={cx(
            "grid gap-4",
            hasStorefrontPanel
              ? "xl:grid-cols-[minmax(0,0.88fr)_minmax(520px,1.12fr)]"
              : "grid-cols-1"
          )}
        >
          {hasStorefrontPanel ? (
            <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
              {isCafeNft ? (
                <div className="reveal" style={{ animationDelay: "180ms" }}>
                  <StorefrontBuyPanel1155
                    chainId={chainId}
                    nftContract={contract}
                    tokenId={tokenId}
                    storefrontLabel="Realife Cafe"
                    title="Cafe Primary Sale"
                    subtitle="Buy directly from Realife Cafe storefront contract"
                    active={Boolean(cafeStore?.active)}
                    priceLabel={`${cafeStore?.priceUsdt ?? "—"} USDT`}
                    paymentTokenLabel="USDT"
                    remaining={cafeStore?.remaining}
                    totalSupply={cafeStore?.totalSupply}
                    maxSupply={cafeStore?.maxSupply}
                    buyButtonLabel="Buy from cafe"
                    checkoutMode="simple"
                    vertical="cafe"
                    buyConfig={{
                      contract: CAFE_1155_CONTRACT,
                      abi: realifeCafeStoreAbi,
                      functionName: "buyProduct",
                      args: [tokenId, 1],
                      bigintArgIndices: [0, 1],
                    }}
                    erc20Payment={{
                      tokenAddress:
                        cafeStore?.paymentTokenAddress || PAYMENT_TOKEN_FALLBACK || "",
                      spender: CAFE_1155_CONTRACT,
                      amountRaw: cafeStore?.priceRaw || "0",
                      symbol: "USDT",
                      approveUnlimited: true,
                    }}
                  />
                </div>
              ) : null}

              {isStoreNft ? (
                <div className="reveal" style={{ animationDelay: "180ms" }}>
                  <StorefrontBuyPanel1155
                    chainId={chainId}
                    nftContract={contract}
                    tokenId={tokenId}
                    storefrontLabel="Realife NFT Store"
                    title={heroBrandLabel ? `${heroBrandLabel} Store Sale` : "Store Primary Sale"}
                    subtitle={
                      effectiveStoreDeliveryEnabled || effectiveStorePhysicalItemIncluded
                        ? heroBrandLabel
                          ? `Primary sale for ${heroBrandLabel}. NFT purchase happens on-chain here, while delivery and escrow are handled in the site UI.`
                          : "NFT purchase happens on-chain here, while delivery and escrow are handled in the site UI."
                        : heroBrandLabel
                        ? `Primary sale for ${heroBrandLabel}. This item is sold as a normal NFT without delivery flow.`
                        : "NFT purchase happens on-chain here. This item is sold without delivery flow."
                    }
                    active={Boolean(storeStore?.active)}
                    priceLabel={`${storeStore?.priceUsdt ?? "—"} USDT`}
                    paymentTokenLabel="USDT"
                    remaining={storeStore?.remaining}
                    totalSupply={storeStore?.totalSupply}
                    maxSupply={storeStore?.maxSupply}
                    buyButtonLabel="Buy from store"
                    checkoutMode={storeCheckoutMode}
                    vertical="store"
                    deliveryEnabled={effectiveStoreDeliveryEnabled}
                    physicalItemIncluded={effectiveStorePhysicalItemIncluded}
                    officialItem={effectiveStoreOfficialItem}
                    primarySellerWallet={storeStore?.primarySellerWallet || null}
                    buyConfig={{
                      contract: STORE_1155_CONTRACT,
                      abi: realifeStoreAbi,
                      functionName: "buyProduct",
                      args: [tokenId, 1],
                      bigintArgIndices: [0, 1],
                    }}
                    erc20Payment={{
                      tokenAddress:
                        storeStore?.paymentTokenAddress || PAYMENT_TOKEN_FALLBACK || "",
                      spender: STORE_1155_CONTRACT,
                      amountRaw: storeStore?.priceRaw || "0",
                      symbol: "USDT",
                      approveUnlimited: true,
                    }}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-4">
            {usesProtectedSecondaryMarket ? (
              <div className="reveal" style={{ animationDelay: "180ms" }}>
                <div
                  className={cx(
                    "overflow-hidden rounded-[22px] p-px",
                    "bg-[linear-gradient(135deg,rgba(247,231,167,0.16),rgba(212,175,55,0.08),rgba(184,135,10,0.06))]",
                    "shadow-[0_34px_130px_rgba(0,0,0,0.60)]"
                  )}
                >
                  <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[#0b0a09]/30 p-4 ring-1 ring-black/10 backdrop-blur-2xl md:p-5">
                    <div className="text-[12px] font-bold uppercase tracking-wider text-white/80">
                      Protected Escrow
                    </div>

                    <div className="mt-2 text-xl font-black tracking-tight text-white/90">
                      Protected marketplace purchase flow
                    </div>

                    <div className="mt-3 text-[13px] leading-relaxed text-white/60">
                      This asset is traded through the protected marketplace. Buyer gets the NFT,
                      while payment remains in escrow until completion confirmation or refund
                      resolution.
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <StatCard label="Secondary market" value="PROTECTED" tone="gold" />
                      <StatCard label="Flow type" value={protectedFlowTypeLabel} tone="gold" />
                      <StatCard label="Category" value={metaCategory || "—"} />
                      <StatCard label="Subcategory" value={metaSubcategory || "—"} />
                    </div>

                    <div className="mt-5 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
                      <div className="text-[12px] font-bold text-violet-100">
                        Buyer journey
                      </div>
                      <div className="mt-2 space-y-2 text-[12px] leading-relaxed text-violet-50/90">
                        <div>• buyer purchases NFT through protected marketplace</div>
                        <div>• NFT moves to buyer, funds stay in escrow</div>
                        <div>• buyer confirms completion or requests refund</div>
                        <div>• if refund is requested, NFT is returned and escrow is resolved</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="reveal" style={{ animationDelay: "180ms" }}>
              <TradingPanelAny
                chainId={chainId}
                contract={contract}
                tokenId={tokenId}
                marketType={secondaryMarketType}
                preferredMarketType={secondaryMarketType}
                deliveryEnabled={Boolean(dbDeliveryEnabled || metaDeliveryEnabled)}
                physicalItemIncluded={Boolean(
                  dbPhysicalItemIncluded || metaPhysicalItemIncluded
                )}
                fulfillmentType={metaFulfillmentType || nft.fulfillmentType || null}
                category={metaCategory || nft.category || null}
                subcategory={metaSubcategory || nft.subcategory || null}
                serviceCountry={serviceCountry}
                serviceCity={serviceCity}
                serviceArea={serviceArea}
                initialMarketData={initialTradingMarketData}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div
            className="reveal text-[11px] font-black uppercase tracking-[0.24em] text-white/40"
            style={{ animationDelay: "230ms" }}
          >
            Details
          </div>

          <div className="reveal" style={{ animationDelay: "180ms" }}>
            <AccordionSection
              title="About this NFT"
              subtitle="Description, brand, project, collection, category, item type and rarity metadata."
            >
              <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(340px,1.08fr)]">
                <div>
                  {metaDescription ? (
                    <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-white/80">
                      {metaDescription}
                    </div>
                  ) : (
                    <div className="text-[13px] leading-relaxed text-white/40">
                      This NFT doesn&apos;t have an extended description yet.
                    </div>
                  )}

                  {metaProofUrl ? (
                    <div className="mt-5">
                      <a
                        href={metaProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-3 font-bold transition hover:-translate-y-px hover:bg-white/10 active:translate-y-0"
                      >
                        Proof / X ↗
                      </a>
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {metaBrand ? (
                    <StatCard label="Brand / Project" value={metaBrand} tone="gold" />
                  ) : null}
                  {metaCollection ? <StatCard label="Collection" value={metaCollection} /> : null}
                  {metaCategory ? <StatCard label="Category" value={metaCategory} /> : null}
                  {metaSubcategory ? (
                    <StatCard label="Subcategory" value={metaSubcategory} />
                  ) : null}
                  {metaItemType ? <StatCard label="Item Type" value={metaItemType} /> : null}
                  {metaItem && metaItem !== metaItemType ? (
                    <StatCard label="Item" value={metaItem} />
                  ) : null}
                  {metaRarity ? <StatCard label="Rarity" value={metaRarity} /> : null}
                  {!metaBrand && metaProject ? (
                    <StatCard label="Project" value={metaProject} />
                  ) : null}
                  {metaVertical ? <StatCard label="Vertical" value={metaVertical} /> : null}
                  {metaFulfillmentType ? (
                    <StatCard
                      label="Fulfillment"
                      value={String(metaFulfillmentType).replaceAll("_", " ")}
                    />
                  ) : null}
                </div>
              </div>
            </AccordionSection>
          </div>

          <div className="reveal" style={{ animationDelay: "180ms" }}>
            <AccordionSection
              title="Blockchain details"
              subtitle="Smart contract, token ID, supply, mint transaction and on-chain explorer links."
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <StatCard label="Contract" value={shortAddr(nft.contract)} />
                <StatCard label="Token ID" value={`#${nft.tokenId}`} />
                <StatCard label="Chain ID" value={String(nft.chainId)} />
                <StatCard label="Minted" value={fmtDate(nft.createdAt)} />
                <StatCard label="Total Supply" value={supplyLabel || "—"} />
                <StatCard label="Market Type" value={secondaryMarketType} />
                {usesProtectedSecondaryMarket && protectedSubtypeLabel ? (
                  <StatCard label="Protected Type" value={protectedSubtypeLabel} />
                ) : null}
                {isStoreNft && storeStore?.primarySellerWallet ? (
                  <StatCard
                    label="Primary Seller"
                    value={shortAddr(storeStore.primarySellerWallet)}
                  />
                ) : null}
                {txUrl ? <StatCard label="Tx Hash" value={shortAddr(nft.txHash)} /> : null}
                {tokenUriHttp ? <StatCard label="Token URI" value="Available" /> : null}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {tokenUriHttp ? (
                  <a
                    href={tokenUriHttp}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2.5 font-bold backdrop-blur-2xl transition hover:bg-white/10"
                  >
                    Token URI ↗
                  </a>
                ) : null}

                {txUrl ? (
                  <a
                    href={txUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2.5 font-bold backdrop-blur-2xl transition hover:bg-white/10"
                  >
                    Tx ↗
                  </a>
                ) : null}

                {contractUrl ? (
                  <a
                    href={contractUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2.5 font-bold backdrop-blur-2xl transition hover:bg-white/10"
                  >
                    Contract ↗
                  </a>
                ) : null}
              </div>
            </AccordionSection>
          </div>

          <div className="reveal" style={{ animationDelay: "180ms" }}>
            <AccordionSection
              title="Ownership & profiles"
              subtitle="Current owner or top holder, original creator, total holders count and creator wallet."
            >
              <div className="grid gap-4 xl:grid-cols-2">
                <PersonCard
                  label={ownershipLabel}
                  avatar={currentOwnerAvatar}
                  name={currentOwnerName}
                  href={currentOwnerUrl}
                  secondaryHref={currentOwnerNftsUrl}
                />

                <PersonCard
                  label="Creator / Profile"
                  avatar={creatorAvatar}
                  name={creatorName}
                  href={creatorUrl}
                  secondaryHref={creatorNftsUrl}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <StatCard label="Holders" value={String(holdersCount)} />
                <StatCard
                  label="Top holder amount"
                  value={topHolder?.amount ? topHolder.amount.toString() : "—"}
                />
                <StatCard
                  label="Creator Wallet"
                  value={shortAddr(creator?.walletAddress || null)}
                />
              </div>
            </AccordionSection>
          </div>

          <div className="reveal" style={{ animationDelay: "180ms" }}>
            <AccordionSection
              title="Market activity"
              subtitle="Open listings on the secondary market and recent trade history with explorer links."
            >
              {marketError ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-[12px] text-amber-100">
                  Market data temporarily unavailable ({marketError}).
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[12px] font-black uppercase tracking-wider text-white/80">
                        Active Listings
                      </div>
                      <div className="text-[12px] font-semibold text-white/40">
                        {listings.length}
                      </div>
                    </div>

                    {listings.length === 0 ? (
                      <div className="mt-4 text-[12px] text-white/60">
                        No active listings yet.
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2">
                        {listings.slice(0, 10).map((l) => {
                          const rowMarketType =
                            (l.marketType || secondaryMarketType) as
                              | "STANDARD"
                              | "PROTECTED";

                          const rowSubtype = inferProtectedSubtype({
                            contract,
                            fulfillmentType: l.fulfillmentType,
                            deliveryEnabled: l.deliveryEnabled,
                            physicalItemIncluded: l.physicalItemIncluded,
                            category: l.category,
                            subcategory: l.subcategory,
                          });

                          return (
                            <div
                              key={`${rowMarketType}:${l.marketplaceListingId}`}
                              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-[13px] font-black text-amber-100">
                                  {fmtEth(l.pricePerUnitWei)} ETH{" "}
                                  <span className="text-[11px] font-black text-white/35">
                                    / unit
                                  </span>
                                </div>
                                <div className="text-[12px] font-semibold text-white/60">
                                  Remaining:{" "}
                                  <span className="font-black text-white/90">
                                    {l.amountRemaining}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-white/40">
                                <span>Seller:</span>
                                <span className="font-mono text-white/75">
                                  {shortAddr(l.sellerWallet)}
                                </span>
                                <span className="text-white/35">•</span>
                                <span className="font-black text-white/70">
                                  Listing #{l.marketplaceListingId}
                                </span>
                                <span className="text-white/35">•</span>
                                <span className="font-black text-white/70">
                                  {rowMarketType}
                                </span>
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {rowSubtype && rowMarketType === "PROTECTED" ? (
                                  <InfoPill tone={fulfillmentTypeTone(rowSubtype)}>
                                    {fulfillmentTypeLabel(rowSubtype)}
                                  </InfoPill>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[12px] font-black uppercase tracking-wider text-white/80">
                        Recent Trades
                      </div>
                      <div className="text-[12px] font-semibold text-white/40">
                        {trades.length}
                      </div>
                    </div>

                    {trades.length === 0 ? (
                      <div className="mt-4 text-[12px] text-white/60">
                        No trades yet.
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2">
                        {trades.slice(0, 10).map((t) => {
                          const rowMarketType =
                            (t.marketType || secondaryMarketType) as
                              | "STANDARD"
                              | "PROTECTED";

                          const rowSubtype = inferProtectedSubtype({
                            contract,
                            fulfillmentType: t.fulfillmentType,
                            deliveryEnabled: null,
                            physicalItemIncluded: null,
                            category: t.category,
                            subcategory: t.subcategory,
                          });

                          return (
                            <div
                              key={`${t.txHash}:${t.logIndex}`}
                              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-[13px] font-black text-amber-100">
                                  {fmtEth(t.totalPriceWei)} ETH{" "}
                                  <span className="text-[11px] font-black text-white/35">•</span>
                                  <span className="ml-2 text-[12px] font-black text-white/80">
                                    x{t.amount}
                                  </span>
                                </div>
                                <div className="text-[11px] text-white/40">
                                  {fmtDate(t.blockTime)}
                                </div>
                              </div>

                              <div className="mt-2 text-[12px] text-white/40">
                                {shortAddr(t.sellerWallet)} → {shortAddr(t.buyerWallet)}
                                <span className="text-white/35"> • </span>
                                <span className="font-black text-white/70">
                                  {rowMarketType}
                                </span>
                                <span className="text-white/35"> • </span>
                                <a
                                  className="font-black text-amber-100/90 hover:text-amber-100"
                                  href={
                                    chainId === 84532
                                      ? `https://sepolia.basescan.org/tx/${t.txHash}`
                                      : `https://basescan.org/tx/${t.txHash}`
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Tx ↗
                                </a>
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {rowSubtype && rowMarketType === "PROTECTED" ? (
                                  <InfoPill tone={fulfillmentTypeTone(rowSubtype)}>
                                    {fulfillmentTypeLabel(rowSubtype)}
                                  </InfoPill>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </AccordionSection>
          </div>
        </div>

        <footer className="reveal pt-6 text-center text-[10px] font-black uppercase tracking-[0.4em] text-white/20">
          Realife Ecosystem • NFT Trading
        </footer>
      </div>
    </main>
  );
}