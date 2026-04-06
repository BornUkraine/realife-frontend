import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import NftMedia from "@/components/NftMedia";
import TradingPanel1155 from "@/components/trading/TradingPanel1155";
import StorefrontBuyPanel1155 from "@/components/storefront/StorefrontBuyPanel1155";
import { realifeCafeStoreAbi } from "@/lib/realifeCafeStoreAbi";
import { realifeStoreAbi } from "@/lib/realifeStoreAbi";
import { headers } from "next/headers";
import { createPublicClient, formatUnits, http } from "viem";
import { baseSepolia } from "viem/chains";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
const DELIVERY_PROFILE_HREF = "/app/orders";

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
    const msg = e?.name === "AbortError" ? "timeout" : e?.message || "fetch_failed";
    return { ok: false, status: 0, json: null, error: msg };
  } finally {
    clearTimeout(t);
  }
}

function marketTagNft(
  chainId: number,
  contract: string,
  tokenId: string,
  marketType?: "STANDARD" | "DELIVERY"
) {
  return `market:nft:${chainId}:${contract}:${tokenId}:${marketType || "ALL"}`;
}

function marketTagContract(
  chainId: number,
  contract: string,
  marketType?: "STANDARD" | "DELIVERY"
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

async function loadMetadataFromBackend1155(tokenId: string) {
  const base = String(API_BASE || "").replace(/\/$/, "");
  if (!base || !tokenId) return null;

  try {
    const r = await fetch(`${base}/metadata1155/${encodeURIComponent(tokenId)}`, {
      cache: "no-store",
    });
    if (!r.ok) return null;
    const j = await r.json().catch(() => null);
    if (j && typeof j === "object") return j;
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
  if (chainId === 84532) return `https://sepolia.basescan.org/address/${contract}`;
  if (chainId === 8453) return `https://basescan.org/address/${contract}`;
  return null;
}

function toInt(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

async function loadMarketNft(
  origin: string | null,
  chainId: number,
  contract: string,
  tokenId: string,
  marketType: "STANDARD" | "DELIVERY"
) {
  const qs =
    `chainId=${encodeURIComponent(String(chainId))}` +
    `&contract=${encodeURIComponent(contract)}` +
    `&tokenId=${encodeURIComponent(tokenId)}` +
    `&marketType=${encodeURIComponent(marketType)}` +
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

  if (!res.ok) return { data: null as any, error: res.error || "market_unavailable" };
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
        <div className="h-12 w-12 rounded-2xl border border-white/10 bg-white/[0.06] overflow-hidden flex items-center justify-center shadow-[0_18px_70px_rgba(0,0,0,0.30)] ring-1 ring-black/15">
          {avatar ? (
            <img
              src={avatar}
              alt={label}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-white/35 text-xs font-bold">RL</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-white/40 font-semibold uppercase tracking-wider">
            {label}
          </div>
          <div className="mt-1 text-sm font-bold text-white/85 truncate">
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
    <span className={cx("px-3 py-1.5 rounded-full border text-[11px] font-bold", cls)}>
      {children}
    </span>
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
        "rounded-[28px] p-px overflow-hidden",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.16),rgba(212,175,55,0.08),rgba(184,135,10,0.06))]",
        "shadow-[0_26px_100px_rgba(0,0,0,0.55)]"
      )}
    >
      <div className="rounded-[28px] overflow-hidden border border-white/10 bg-[#0b0a09]/30 backdrop-blur-2xl ring-1 ring-black/10">
        <summary className="list-none cursor-pointer select-none">
          <div className="flex items-center justify-between gap-4 px-6 py-5 md:px-7">
            <div className="min-w-0">
              <div className="text-[12px] font-bold text-white/90 tracking-tight">
                {title}
              </div>
              {subtitle ? (
                <div className="mt-1 text-[12px] text-white/40 leading-relaxed">
                  {subtitle}
                </div>
              ) : null}
            </div>

            <div className="shrink-0 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.06] text-[11px] font-semibold text-white/60">
              Open / Close
            </div>
          </div>
        </summary>

        <div className="border-t border-white/10 px-6 py-6 md:px-7">
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
      deliveryEnabled: true,
      physicalItemIncluded: true,
      officialItem: true,
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
      ? `/u/${creatorPublicKey}`
      : null;
  const creatorNftsUrl = creatorUrl ? `${creatorUrl}/nfts` : null;

  const creatorName =
    creator?.twitterName ||
    creator?.discordName ||
    (creator?.twitterUser ? `@${creator.twitterUser}` : null) ||
    (creator?.discordUser ? `@${creator.discordUser}` : null) ||
    (creator?.handle ? `@${creator.handle}` : null) ||
    shortAddr(creator?.walletAddress || null);

  const creatorAvatar = creator?.twitterImage || creator?.discordImage || null;

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
      ? `/u/${currentOwnerPublicKey}`
      : null;
  const currentOwnerNftsUrl = currentOwnerUrl ? `${currentOwnerUrl}/nfts` : null;

  const currentOwnerName =
    currentOwnerUser?.twitterName ||
    currentOwnerUser?.discordName ||
    (currentOwnerUser?.twitterUser ? `@${currentOwnerUser.twitterUser}` : null) ||
    (currentOwnerUser?.discordUser ? `@${currentOwnerUser.discordUser}` : null) ||
    (currentOwnerUser?.handle ? `@${currentOwnerUser.handle}` : null) ||
    shortAddr(currentOwnerUser?.walletAddress || null);

  const currentOwnerAvatar =
    currentOwnerUser?.twitterImage || currentOwnerUser?.discordImage || null;

  const ownershipLabel = holdersCount > 1 ? "Top holder" : "Current owner";

  const tokenUriHttp = nft.tokenUri
    ? ipfsToHttp(nft.tokenUri, IPFS_GATEWAYS[0])
    : null;
  const txUrl = nft.txHash ? txExplorerUrl(nft.chainId, nft.txHash) : null;
  const contractUrl = contractExplorerUrl(nft.chainId, nft.contract);

  const fallbackPoster = ipfsToHttp(nft.image, IPFS_GATEWAYS[0]);

  const liveMeta = isUserStandard1155Nft
    ? await loadMetadataFromBackend1155(tokenId)
    : null;

  const meta =
    liveMeta || (nft.tokenUri ? await loadMetadataFromTokenUri(nft.tokenUri) : null);

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

  const metaDeliveryMode =
    pickAny(meta, ["deliveryMode"]) ||
    pickAttrAny(meta, ["Delivery Mode"]) ||
    (metaDeliveryEnabled || metaPhysicalItemIncluded ? "Delivery" : "Digital");

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

  const userDeliveryMarketplaceFlow = isUserDelivery1155Nft;

  const storePrimaryDeliveryCapable =
    isStoreNft &&
    (effectiveStoreDeliveryEnabled || effectiveStorePhysicalItemIncluded);

  const isDeliveryCapableForOrders =
    userDeliveryMarketplaceFlow || storePrimaryDeliveryCapable;

  const secondaryMarketType: "STANDARD" | "DELIVERY" =
    userDeliveryMarketplaceFlow ? "DELIVERY" : "STANDARD";

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

    const imgHttp = ipfsToHttp(metaImage, IPFS_GATEWAYS[0]) || fallbackPoster;
    const animHttp =
      ipfsToHttp(metaAnimation, PINATA_IPFS) || ipfsToHttp(metaAnimation, IPFS_GATEWAYS[0]);

    if (metaAnimation || isLikelyVideoUrl(animHttp)) {
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
    ? "ERC-1155 • DELIVERY"
    : isUserStandard1155Nft
    ? "ERC-1155 • STANDARD"
    : "ERC-1155";

  const origin = await getOrigin();
  const { data: market, error: marketError } = await loadMarketNft(
    origin,
    chainId,
    contract,
    tokenId,
    secondaryMarketType
  );

  const stats = market?.stats || null;
  const listings: any[] = Array.isArray(market?.listings) ? market.listings : [];
  const trades: any[] = Array.isArray(market?.trades) ? market.trades : [];
  const heroBrandLabel = metaBrand || metaProject || null;

  const session = await getServerSession(authOptions);
  const viewerAuthed = Boolean(
    (session as any)?.user?.id ||
      (session as any)?.userId ||
      (session as any)?.user?.walletAddress ||
      (session as any)?.walletAddress
  );

  const backToGalleryHref = await getPreferredGalleryHref(
    creatorNftsUrl,
    currentOwnerNftsUrl
  );

  const hasStorefrontPanel = isCafeNft || isStoreNft;
  const hasSecondaryActionPanel = hasStorefrontPanel || userDeliveryMarketplaceFlow;
  const showMyDeliveryButton = viewerAuthed && isDeliveryCapableForOrders;

  const storeCheckoutMode =
    effectiveStoreDeliveryEnabled || effectiveStorePhysicalItemIncluded
      ? "delivery"
      : "simple";

  const TradingPanelAny = TradingPanel1155 as any;

  return (
    <main className="min-h-screen bg-[#060505] text-white overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(255,255,255,0.05),transparent_60%)]" />
        <div className="animate-orb-1 absolute -top-80 -left-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/12 blur-3xl" />
        <div className="animate-orb-2 absolute -bottom-80 -right-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[length:56px_56px]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.65),transparent)]" />
      </div>

      <div className="relative mx-auto max-w-[1480px] px-6 py-10 space-y-8">
        <div className="reveal flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
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
              <span className="text-white/75 font-black truncate">
                {nft.name || `Token #${nft.tokenId}`}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {heroBrandLabel ? <InfoPill tone="gold">{heroBrandLabel}</InfoPill> : null}
              {metaCollection ? <InfoPill>{metaCollection}</InfoPill> : null}
              <InfoPill>{standardLabel}</InfoPill>
              {metaRarity ? <InfoPill>{metaRarity}</InfoPill> : null}

              {userDeliveryMarketplaceFlow ? (
                <InfoPill tone="violet">MARKETPLACE DELIVERY ITEM</InfoPill>
              ) : null}

              {storePrimaryDeliveryCapable ? (
                <InfoPill tone="emerald">PRIMARY DELIVERY AVAILABLE</InfoPill>
              ) : null}

              {isStoreNft ? <InfoPill tone="sky">SECONDARY TRADING ONLY</InfoPill> : null}
              {isStoreNft ? <InfoPill tone="sky">SECONDARY NO DELIVERY</InfoPill> : null}

              {isCafeNft ? <InfoPill tone="gold">SECONDARY TRADING ONLY</InfoPill> : null}
              {isCafeNft ? <InfoPill tone="gold">SECONDARY NO REDEMPTION</InfoPill> : null}

              <InfoPill tone={secondaryMarketType === "DELIVERY" ? "violet" : "sky"}>
                Market: {secondaryMarketType}
              </InfoPill>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isCafeNft ? (
              <Link
                href={CAFE_STOREFRONT_HREF}
                className="px-4 py-2 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 font-bold transition shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
              >
                Cafe storefront
              </Link>
            ) : null}

            {isStoreNft ? (
              <Link
                href={STORE_STOREFRONT_HREF}
                className="px-4 py-2 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 font-bold transition shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
              >
                NFT Store
              </Link>
            ) : null}

            {showMyDeliveryButton ? (
              <Link
                href={DELIVERY_PROFILE_HREF}
                className="px-4 py-2 rounded-2xl text-black font-extrabold hover:brightness-110 transition shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
              >
                My Delivery
              </Link>
            ) : null}

            {backToGalleryHref ? (
              <Link
                href={backToGalleryHref}
                className="px-4 py-2 rounded-2xl text-black font-extrabold hover:brightness-110 transition shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
              >
                Back to gallery
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] gap-6 items-start">
          <div className="space-y-6">
            <div
              className={cx(
                "reveal rounded-[28px] p-px overflow-hidden",
                "bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))]",
                "shadow-[0_34px_130px_rgba(0,0,0,0.60)]"
              )}
              style={{ animationDelay: "80ms" }}
            >
              <div className="rounded-[28px] overflow-hidden border border-white/10 bg-[#0b0a09]/15 backdrop-blur-2xl ring-1 ring-black/10">
                <div className="aspect-square bg-black/30 flex items-center justify-center relative">
                  {media ? (
                    <NftMedia
                      src={media}
                      kind={kind}
                      alt={nft.name || "NFT"}
                      poster={kind === "video" ? poster : null}
                      showControls={kind === "video"}
                      className="h-full w-full"
                      roundedClass="rounded-none"
                    />
                  ) : (
                    <div className="text-white/25 font-black">No media</div>
                  )}

                  <div className="pointer-events-none absolute inset-x-0 top-0 p-5 flex items-start justify-between">
                    <div className="flex flex-wrap gap-2">
                      <InfoPill>{standardLabel}</InfoPill>
                      {kind === "video" ? <InfoPill tone="gold">VIDEO</InfoPill> : null}
                    </div>

                    {supplyLabel ? <InfoPill>Supply {supplyLabel}</InfoPill> : null}
                  </div>

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6 bg-[linear-gradient(to_top,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.32)_42%,transparent_100%)]">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/40 font-black">
                      {isCafeNft
                        ? "Realife Cafe Edition"
                        : isStoreNft
                        ? "Realife Store Edition"
                        : isUserDelivery1155Nft
                        ? "Realife Delivery Edition"
                        : isUserStandard1155Nft
                        ? "Realife Standard Edition"
                        : "Realife Edition"}
                    </div>
                    <div className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-white">
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

          <div className="space-y-6 xl:sticky xl:top-24">
            <div
              className={cx(
                "reveal rounded-[28px] p-px overflow-hidden",
                "bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))]",
                "shadow-[0_34px_130px_rgba(0,0,0,0.60)]"
              )}
              style={{ animationDelay: "140ms" }}
            >
              <div className="rounded-[28px] overflow-hidden border border-white/10 bg-[#0b0a09]/30 backdrop-blur-2xl ring-1 ring-black/10">
                <div className="p-6 md:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/40 font-black">
                      {isCafeNft
                        ? "Realife Cafe Edition"
                        : isStoreNft
                        ? "Realife Store Edition"
                        : isUserDelivery1155Nft
                        ? "Marketplace Delivery Edition"
                        : isUserStandard1155Nft
                        ? "Marketplace Standard Edition"
                        : "Realife Edition"}
                    </div>
                    <div className="px-3 py-1.5 rounded-full border border-white/15 bg-white/[0.06] text-[11px] font-semibold text-amber-100">
                      {standardLabel}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {heroBrandLabel ? <InfoPill tone="gold">{heroBrandLabel}</InfoPill> : null}
                    {metaCollection ? <InfoPill>{metaCollection}</InfoPill> : null}
                    {metaRarity ? <InfoPill>{metaRarity}</InfoPill> : null}

                    {userDeliveryMarketplaceFlow ? (
                      <InfoPill tone="violet">DELIVERY</InfoPill>
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

                    <InfoPill tone={secondaryMarketType === "DELIVERY" ? "violet" : "sky"}>
                      {secondaryMarketType} market
                    </InfoPill>
                  </div>

                  <div className="mt-4 text-3xl md:text-4xl font-black tracking-tight">
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

                  {userDeliveryMarketplaceFlow ? (
                    <div className="mt-5 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
                      <div className="text-[12px] font-bold text-violet-100">
                        Marketplace delivery flow
                      </div>
                      <div className="mt-2 text-[12px] text-violet-50/90 leading-relaxed">
                        This NFT is traded through the delivery marketplace. If a buyer
                        purchases it, delivery and escrow are handled later in the site
                        UI order flow.
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <InfoPill tone="emerald">Delivery enabled</InfoPill>
                        <InfoPill tone="gold">Physical item included</InfoPill>
                        {metaDeliveryMode ? (
                          <InfoPill tone="violet">{metaDeliveryMode}</InfoPill>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {isStoreNft ? (
                    <div className="mt-5 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
                      <div className="text-[12px] font-bold text-sky-100">
                        Store primary vs secondary
                      </div>
                      <div className="mt-2 text-[12px] text-sky-50/90 leading-relaxed">
                        This NFT may support <span className="font-black">primary store delivery</span>
                        {" "}through the official Realife Store storefront below. But if this NFT is
                        listed and bought on the secondary market, that secondary trade is{" "}
                        <span className="font-black">trading only</span> and delivery is not included
                        for the secondary buyer.
                      </div>
                    </div>
                  ) : null}

                  {isCafeNft ? (
                    <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                      <div className="text-[12px] font-bold text-amber-100">
                        Cafe primary vs secondary
                      </div>
                      <div className="mt-2 text-[12px] text-amber-50/90 leading-relaxed">
                        The official Realife Cafe purchase flow below is separate. Secondary
                        trading here is <span className="font-black">trading only</span>, and
                        official drink / merch / redemption is not automatically guaranteed for
                        the secondary buyer.
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-6 grid grid-cols-2 gap-3">
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

                  {marketError ? (
                    <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-[12px] text-amber-100">
                      Market data temporarily unavailable ({marketError}). NFT details still
                      work.
                    </div>
                  ) : null}

                  <div className="mt-6 text-[11px] text-white/35">
                    The page is focused on media + key info first. Buy, delivery and details
                    stay below in premium collapsible sections.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={cx(
            "grid gap-6",
            hasSecondaryActionPanel ? "xl:grid-cols-2" : "grid-cols-1"
          )}
        >
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

          {userDeliveryMarketplaceFlow ? (
            <div className="reveal" style={{ animationDelay: "180ms" }}>
              <div
                className={cx(
                  "rounded-[28px] p-px overflow-hidden",
                  "bg-[linear-gradient(135deg,rgba(247,231,167,0.16),rgba(212,175,55,0.08),rgba(184,135,10,0.06))]",
                  "shadow-[0_34px_130px_rgba(0,0,0,0.60)]"
                )}
              >
                <div className="rounded-[28px] overflow-hidden border border-white/10 bg-[#0b0a09]/30 backdrop-blur-2xl ring-1 ring-black/10 p-6 md:p-7">
                  <div className="text-[12px] font-bold text-white/80 uppercase tracking-wider">
                    Delivery & Escrow
                  </div>

                  <div className="mt-2 text-xl font-black tracking-tight text-white/90">
                    Marketplace purchase flow
                  </div>

                  <div className="mt-3 text-[13px] text-white/60 leading-relaxed">
                    This item is not a store primary sale. It is bought through the delivery
                    marketplace. After a successful purchase, delivery details and escrow are
                    handled in the site UI orders flow.
                  </div>

                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <StatCard label="Delivery enabled" value="Yes" tone="gold" />
                    <StatCard label="Physical item" value="Included" tone="gold" />
                    <StatCard label="Delivery mode" value={metaDeliveryMode || "—"} />
                    <StatCard label="Item type" value={metaItemType || "—"} />
                  </div>

                  <div className="mt-5 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
                    <div className="text-[12px] font-bold text-violet-100">
                      Buyer journey
                    </div>
                    <div className="mt-2 space-y-2 text-[12px] text-violet-50/90 leading-relaxed">
                      <div>• buyer purchases NFT in delivery marketplace trading</div>
                      <div>• delivery order is created in site UI flow</div>
                      <div>• seller ships physical item and adds tracking</div>
                      <div>• buyer confirms delivery, escrow is released</div>
                    </div>
                  </div>

                  {viewerAuthed ? (
                    <div className="mt-5">
                      <Link
                        href={DELIVERY_PROFILE_HREF}
                        className="inline-flex items-center justify-center px-5 py-3 rounded-2xl text-black font-extrabold hover:brightness-110 transition shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
                      >
                        Open My Delivery
                      </Link>
                    </div>
                  ) : null}

                  <div className="mt-4 text-[11px] text-white/35">
                    This block only explains the flow. The actual trade still happens in the
                    Trading panel.
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="reveal" style={{ animationDelay: "200ms" }}>
            <TradingPanelAny
              chainId={chainId}
              contract={contract}
              tokenId={tokenId}
              marketType={secondaryMarketType}
              preferredMarketType={secondaryMarketType}
              deliveryEnabled={userDeliveryMarketplaceFlow}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div
            className="reveal text-[11px] uppercase tracking-[0.24em] text-white/40 font-black"
            style={{ animationDelay: "230ms" }}
          >
            Details
          </div>

          <div className="reveal" style={{ animationDelay: "240ms" }}>
            <AccordionSection
              title="About"
              subtitle="Description, collection, category, item type and premium metadata."
            >
              <div className="grid xl:grid-cols-[minmax(0,0.92fr)_minmax(340px,1.08fr)] gap-6">
                <div>
                  {metaDescription ? (
                    <div className="text-[13px] text-white/80 leading-relaxed whitespace-pre-wrap">
                      {metaDescription}
                    </div>
                  ) : (
                    <div className="text-[13px] text-white/40 leading-relaxed">
                      This NFT doesn&apos;t have an extended description yet.
                    </div>
                  )}

                  {metaProofUrl ? (
                    <div className="mt-5">
                      <a
                        href={metaProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/15 bg-white/[0.06] font-bold hover:bg-white/10 hover:-translate-y-px transition active:translate-y-0"
                      >
                        Proof / X ↗
                      </a>
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {metaBrand ? (
                    <StatCard label="Brand / Project" value={metaBrand} tone="gold" />
                  ) : null}
                  {metaCollection ? <StatCard label="Collection" value={metaCollection} /> : null}
                  {metaCategory ? <StatCard label="Category" value={metaCategory} /> : null}
                  {metaItemType ? <StatCard label="Item Type" value={metaItemType} /> : null}
                  {metaItem && metaItem !== metaItemType ? (
                    <StatCard label="Item" value={metaItem} />
                  ) : null}
                  {metaRarity ? <StatCard label="Rarity" value={metaRarity} /> : null}
                  {!metaBrand && metaProject ? (
                    <StatCard label="Project" value={metaProject} />
                  ) : null}
                  {metaVertical ? <StatCard label="Vertical" value={metaVertical} /> : null}
                </div>
              </div>
            </AccordionSection>
          </div>

          <div className="reveal" style={{ animationDelay: "260ms" }}>
            <AccordionSection
              title="Blockchain details"
              subtitle="Contract, token, mint time, supply, market type and on-chain links."
            >
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                <StatCard label="Contract" value={shortAddr(nft.contract)} />
                <StatCard label="Token ID" value={`#${nft.tokenId}`} />
                <StatCard label="Chain ID" value={String(nft.chainId)} />
                <StatCard label="Minted" value={fmtDate(nft.createdAt)} />
                <StatCard label="Total Supply" value={supplyLabel || "—"} />
                <StatCard label="Market Type" value={secondaryMarketType} />
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
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-2xl border border-white/15 bg-white/[0.06] font-bold backdrop-blur-2xl hover:bg-white/10 transition"
                  >
                    Token URI ↗
                  </a>
                ) : null}

                {txUrl ? (
                  <a
                    href={txUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-2xl border border-white/15 bg-white/[0.06] font-bold backdrop-blur-2xl hover:bg-white/10 transition"
                  >
                    Tx ↗
                  </a>
                ) : null}

                {contractUrl ? (
                  <a
                    href={contractUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-2xl border border-white/15 bg-white/[0.06] font-bold backdrop-blur-2xl hover:bg-white/10 transition"
                  >
                    Contract ↗
                  </a>
                ) : null}
              </div>
            </AccordionSection>
          </div>

          <div className="reveal" style={{ animationDelay: "280ms" }}>
            <AccordionSection
              title="Ownership & profiles"
              subtitle="Current owner, creator and holder context."
            >
              <div className="grid xl:grid-cols-2 gap-4">
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

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
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

          <div className="reveal" style={{ animationDelay: "300ms" }}>
            <AccordionSection
              title="Market activity"
              subtitle="Open listings and recent sales for this NFT."
            >
              {marketError ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-[12px] text-amber-100">
                  Market data temporarily unavailable ({marketError}).
                </div>
              ) : (
                <div className="grid xl:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[12px] font-black text-white/80 uppercase tracking-wider">
                        Active Listings
                      </div>
                      <div className="text-[12px] text-white/40 font-semibold">
                        {listings.length}
                      </div>
                    </div>

                    {listings.length === 0 ? (
                      <div className="mt-4 text-[12px] text-white/60">
                        No active listings yet.
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2">
                        {listings.slice(0, 10).map((l) => (
                          <div
                            key={`${l.marketType || secondaryMarketType}:${l.marketplaceListingId}`}
                            className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-[13px] font-black text-amber-100">
                                {fmtEth(l.pricePerUnitWei)} ETH{" "}
                                <span className="text-white/35 text-[11px] font-black">/ unit</span>
                              </div>
                              <div className="text-[12px] text-white/60 font-semibold">
                                Remaining:{" "}
                                <span className="text-white/90 font-black">{l.amountRemaining}</span>
                              </div>
                            </div>

                            <div className="mt-2 text-[12px] text-white/40 flex flex-wrap items-center gap-2">
                              <span>Seller:</span>
                              <span className="font-mono text-white/75">{shortAddr(l.sellerWallet)}</span>
                              <span className="text-white/35">•</span>
                              <span className="font-black text-white/70">
                                Listing #{l.marketplaceListingId}
                              </span>
                              <span className="text-white/35">•</span>
                              <span className="font-black text-white/70">
                                {l.marketType || secondaryMarketType}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[12px] font-black text-white/80 uppercase tracking-wider">
                        Recent Trades
                      </div>
                      <div className="text-[12px] text-white/40 font-semibold">
                        {trades.length}
                      </div>
                    </div>

                    {trades.length === 0 ? (
                      <div className="mt-4 text-[12px] text-white/60">
                        No trades yet.
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2">
                        {trades.slice(0, 10).map((t) => (
                          <div
                            key={`${t.txHash}:${t.logIndex}`}
                            className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-[13px] font-black text-amber-100">
                                {fmtEth(t.totalPriceWei)} ETH{" "}
                                <span className="text-white/35 text-[11px] font-black">•</span>
                                <span className="ml-2 text-white/80 text-[12px] font-black">
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
                                {t.marketType || secondaryMarketType}
                              </span>
                              <span className="text-white/35"> • </span>
                              <a
                                className="text-amber-100/90 hover:text-amber-100 font-black"
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
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </AccordionSection>
          </div>
        </div>

        <footer className="reveal pt-6 text-[10px] font-black text-white/20 text-center uppercase tracking-[0.4em]">
          Realife Ecosystem • NFT Trading
        </footer>
      </div>
    </main>
  );
}