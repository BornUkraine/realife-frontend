import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import NftMedia from "@/components/NftMedia";
import TradingPanel1155 from "@/components/trading/TradingPanel1155";
import { headers } from "next/headers";
import { formatUnits } from "viem";

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

/* ------------------------------- Config ------------------------------ */

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "https://accurate-art-production.up.railway.app").replace(/\/$/, "");

// ✅ 1155-only: только NEW env
const REALIFE_1155_NEW_CONTRACT = norm(process.env.NEXT_PUBLIC_REALIFE_1155_NEW_CONTRACT || "");

const PRIMARY_IPFS_ORIGIN = (process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://nftstorage.link").replace(/\/$/, "");

const IPFS_GATEWAYS = [
  `${PRIMARY_IPFS_ORIGIN}/ipfs/`,
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
] as const;

const PINATA_IPFS = "https://gateway.pinata.cloud/ipfs/";

/* ------------------------------- Market fetch tuning ------------------------------ */

const MARKET_REVALIDATE_SECONDS = 5;
const MARKET_FETCH_TIMEOUT_MS = 4500;

/* ------------------------------- Request origin (SSR safe) ------------------------------ */

async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "development" ? "http" : "https");
  if (!host) return null;
  return `${proto}://${host}`;
}

/* ------------------------------- Small fetch helper (timeout) ------------------------------ */

async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit & { next?: { revalidate?: number; tags?: string[] } },
  timeoutMs: number
): Promise<{ ok: boolean; status: number; json: any | null; error: string | null }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const r = await fetch(url, { ...init, signal: controller.signal });
    const j = await r.json().catch(() => null);
    if (!r.ok) return { ok: false, status: r.status, json: j, error: j?.error || `http_${r.status}` };
    return { ok: true, status: r.status, json: j, error: null };
  } catch (e: any) {
    const msg = e?.name === "AbortError" ? "timeout" : e?.message || "fetch_failed";
    return { ok: false, status: 0, json: null, error: msg };
  } finally {
    clearTimeout(t);
  }
}

/* ------------------------------- Cache tags ------------------------------ */

function marketTagNft(chainId: number, contract: string, tokenId: string) {
  return `market:nft:${chainId}:${contract}:${tokenId}`;
}
function marketTagContract(chainId: number, contract: string) {
  return `market:contract:${chainId}:${contract}`;
}

/* ------------------------------- IPFS helpers ------------------------------ */

function ipfsToHttp(uri?: string | null, gw: string = IPFS_GATEWAYS[0]) {
  const u = String(uri || "").trim();
  if (!u) return null;

  if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("data:") || u.startsWith("blob:")) return u;

  if (u.startsWith("ipfs://")) {
    let p = u.slice("ipfs://".length);
    if (p.startsWith("ipfs/")) p = p.slice("ipfs/".length);
    return `${gw}${p}`;
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
      // next
    }
  }
  return null;
}

/* ----------------------------- Backend metadata (1155-only) ---------------------------- */

async function loadMetadataFromBackend1155(tokenId: string) {
  const base = String(API_BASE || "").replace(/\/$/, "");
  if (!base || !tokenId) return null;

  try {
    const r = await fetch(`${base}/metadata1155/${encodeURIComponent(tokenId)}`, { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json().catch(() => null);
    if (j && typeof j === "object") return j;
  } catch {
    // ignore
  }
  return null;
}

function isLikelyVideoUrl(u?: string | null) {
  const s = (u || "").toLowerCase();
  const clean = s.split("?")[0].split("#")[0];
  return clean.endsWith(".mp4") || clean.endsWith(".webm") || clean.endsWith(".mov") || clean.endsWith(".m4v");
}

function pickAttrValue(meta: any, trait: string): string | null {
  const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
  const t = trait.toLowerCase();
  const hit = attrs.find((a: any) => String(a?.trait_type || "").toLowerCase() === t);
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

function normalizeUrl(u?: string | null) {
  const s = String(u || "").trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("www.")) return `https://${s}`;
  return null;
}

/* --------------------------- explorer url per chain ------------------------ */

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

/* ------------------------ market API helpers ------------------------ */

function toInt(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

async function loadMarketNft(origin: string | null, chainId: number, contract: string, tokenId: string) {
  const qs =
    `chainId=${encodeURIComponent(String(chainId))}` +
    `&contract=${encodeURIComponent(contract)}` +
    `&tokenId=${encodeURIComponent(tokenId)}` +
    `&listingsTake=50&tradesTake=50`;

  const url = origin ? `${origin}/api/market/nft?${qs}` : `/api/market/nft?${qs}`;

  const tags = [marketTagNft(chainId, contract, tokenId), marketTagContract(chainId, contract)];

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

export default async function NftDetailsPage({
  params,
}: {
  params: Promise<{ chainId: string; contract: string; tokenId: string }>;
}) {
  const p = await params;

  const chainId = Number(p.chainId);
  const contract = norm(safeDecode(p.contract || ""));
  const tokenId = safeDecode(p.tokenId || "").trim();

  if (!Number.isFinite(chainId) || !contract.startsWith("0x") || !tokenId) notFound();

  if (REALIFE_1155_NEW_CONTRACT && contract !== REALIFE_1155_NEW_CONTRACT) notFound();

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

  const u = nft.user;
  const publicKey = u.handle || u.publicId || null;
  const ownerUrl = publicKey && publicKey !== "tmp" ? `/u/${publicKey}` : null;
  const ownerNftsUrl = ownerUrl ? `${ownerUrl}/nfts` : null;

  const ownerName =
    u.twitterName ||
    u.discordName ||
    (u.twitterUser ? `@${u.twitterUser}` : null) ||
    (u.discordUser ? `@${u.discordUser}` : null) ||
    (u.handle ? `@${u.handle}` : null) ||
    shortAddr(u.walletAddress);

  const avatar = u.twitterImage || u.discordImage || null;

  const tokenUriHttp = nft.tokenUri ? ipfsToHttp(nft.tokenUri, IPFS_GATEWAYS[0]) : null;
  const txUrl = nft.txHash ? txExplorerUrl(nft.chainId, nft.txHash) : null;
  const contractUrl = contractExplorerUrl(nft.chainId, nft.contract);

  const fallbackPoster = ipfsToHttp(nft.image, IPFS_GATEWAYS[0]);

  const liveMeta = await loadMetadataFromBackend1155(tokenId);
  const meta = liveMeta || (nft.tokenUri ? await loadMetadataFromTokenUri(nft.tokenUri) : null);

  // Supply label
  let supplyLabel: string | null = null;
  if (meta) {
    supplyLabel = pickAttrValue(meta, "Total Supply");
    if (!supplyLabel) {
      const s = meta?.supply;
      if (typeof s === "number") supplyLabel = String(s);
      else if (typeof s === "string" && s.trim()) supplyLabel = s.trim();
    }
  }

  // MintForm-derived fields (from metadata)
  const metaDescription = typeof meta?.description === "string" && meta.description.trim() ? meta.description.trim() : null;

  const metaProject =
    pickAttrAny(meta, ["Project", "project"]) ||
    pickAny(meta, ["project"]) ||
    null;

  const metaCategory =
    pickAttrAny(meta, ["Category", "category"]) ||
    pickAny(meta, ["category"]) ||
    null;

  const metaProofRaw =
    pickAny(meta, ["external_url", "externalUrl", "proofUrl", "proof_url", "url"]) ||
    pickAttrAny(meta, ["Proof / X link", "Proof", "X", "X link", "Proof URL"]);

  const metaProofUrl = normalizeUrl(metaProofRaw);

  // Media resolve
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
    const animHttp = ipfsToHttp(metaAnimation, PINATA_IPFS) || ipfsToHttp(metaAnimation, IPFS_GATEWAYS[0]);

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

  const standardLabel = "ERC-1155";

  const origin = await getOrigin();
  const { data: market, error: marketError } = await loadMarketNft(origin, chainId, contract, tokenId);

  const stats = market?.stats || null;
  const listings: any[] = Array.isArray(market?.listings) ? market.listings : [];
  const trades: any[] = Array.isArray(market?.trades) ? market.trades : [];

  return (
    <main className="min-h-screen bg-[#060505] text-white overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(255,255,255,0.05),transparent_60%)]" />
        <div className="absolute -top-80 -left-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/12 blur-3xl animate-pulse" />
        <div className="absolute -bottom-80 -right-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/10 blur-3xl animate-pulse" />
        <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[length:56px_56px]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.65),transparent)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-10 space-y-6">
        <div className="reveal flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[12px] text-white/55">
            {ownerNftsUrl ? (
              <Link className="hover:underline" href={ownerNftsUrl}>
                NFTs
              </Link>
            ) : (
              <span>NFTs</span>
            )}
            <span>›</span>
            {ownerUrl ? (
              <Link className="hover:underline" href={ownerUrl}>
                {ownerName}
              </Link>
            ) : (
              <span>{ownerName}</span>
            )}
            <span>›</span>
            <span className="text-white/70 font-black">{nft.name || `Token #${nft.tokenId}`}</span>
          </div>

          {ownerNftsUrl ? (
            <Link
              href={ownerNftsUrl}
              className="px-4 py-2 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 font-extrabold transition shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
            >
              Back to gallery
            </Link>
          ) : null}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Media + About */}
          <div className="space-y-6">
            {/* Media */}
            <div
              className={cx(
                "reveal rounded-[34px] p-px overflow-hidden",
                "bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))]",
                "shadow-[0_34px_130px_rgba(0,0,0,0.60)]"
              )}
              style={{ animationDelay: "80ms" }}
            >
              <div className="rounded-[34px] overflow-hidden border border-white/10 bg-[#0b0a09]/15 backdrop-blur-2xl ring-1 ring-black/10">
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
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.35)_0%,transparent_35%)]" />
                </div>
              </div>
            </div>

            {/* About (MintForm data from metadata) */}
            {metaDescription || metaProject || metaCategory || metaProofUrl ? (
              <div
                className={cx(
                  "reveal rounded-[34px] p-px overflow-hidden",
                  "bg-[linear-gradient(135deg,rgba(247,231,167,0.16),rgba(212,175,55,0.08),rgba(184,135,10,0.06))]",
                  "shadow-[0_34px_130px_rgba(0,0,0,0.55)]"
                )}
                style={{ animationDelay: "120ms" }}
              >
                <div className="rounded-[34px] overflow-hidden border border-white/10 bg-[#0b0a09]/30 backdrop-blur-2xl ring-1 ring-black/10 p-6 md:p-7">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 font-black">About</div>

                  {metaDescription ? (
                    <div className="mt-3 text-[13px] text-white/80 leading-relaxed whitespace-pre-wrap">
                      {metaDescription}
                    </div>
                  ) : null}

                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {metaProject ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Project</div>
                        <div className="mt-1 text-[13px] font-extrabold text-white/85 truncate">{metaProject}</div>
                      </div>
                    ) : null}

                    {metaCategory ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Category</div>
                        <div className="mt-1 text-[13px] font-extrabold text-white/85 truncate">{metaCategory}</div>
                      </div>
                    ) : null}
                  </div>

                  {metaProofUrl ? (
                    <div className="mt-5 flex flex-wrap gap-3">
                      <a
                        href={metaProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/15 bg-white/[0.06] font-extrabold hover:bg-white/10 hover:-translate-y-px transition active:translate-y-0"
                      >
                        Proof / X ↗
                      </a>
                    </div>
                  ) : null}

                  <div className="mt-4 text-[11px] text-white/35">
                    This block is filled from token metadata created in MintForm (project/category/description/proof).
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Meta */}
          <div className="space-y-6">
            <div
              className={cx(
                "reveal rounded-[34px] p-px overflow-hidden",
                "bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))]",
                "shadow-[0_34px_130px_rgba(0,0,0,0.60)]"
              )}
              style={{ animationDelay: "140ms" }}
            >
              <div className="rounded-[34px] h-full overflow-hidden border border-white/10 bg-[#0b0a09]/30 backdrop-blur-2xl ring-1 ring-black/10">
                <div className="p-6 md:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 font-black">Realife Edition</div>
                    <div className="px-3 py-1.5 rounded-full border border-white/15 bg-white/[0.06] text-[11px] font-black text-amber-100">
                      {standardLabel}
                    </div>
                  </div>

                  <div className="mt-3 text-3xl md:text-4xl font-black tracking-tight">{nft.name || `Token #${nft.tokenId}`}</div>

                  <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="h-12 w-12 rounded-2xl border border-white/10 bg-white/[0.06] overflow-hidden flex items-center justify-center shadow-[0_18px_70px_rgba(0,0,0,0.30)] ring-1 ring-black/15">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatar} alt="creator" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-white/35 text-xs font-black">RL</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Creator / Profile</div>
                      <div className="mt-1 text-sm font-extrabold text-white/85 truncate">
                        {ownerUrl ? (
                          <Link className="hover:underline" href={ownerUrl}>
                            {ownerName}
                          </Link>
                        ) : (
                          ownerName
                        )}
                      </div>
                    </div>

                    {ownerNftsUrl ? (
                      <Link href={ownerNftsUrl} className="shrink-0 text-[12px] font-extrabold text-amber-100/90 hover:text-amber-100">
                        View NFTs →
                      </Link>
                    ) : null}
                  </div>

                  {marketError ? (
                    <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-[12px] text-amber-100">
                      Market data temporarily unavailable ({marketError}). NFT details still work.
                    </div>
                  ) : null}

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Floor</div>
                      <div className="mt-1 text-[13px] font-extrabold text-amber-100 truncate">
                        {stats?.floorWei ? `${fmtEth(stats.floorWei)} ETH` : "—"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Last sale</div>
                      <div className="mt-1 text-[13px] font-extrabold text-white/85 truncate">
                        {stats?.lastSaleWei ? `${fmtEth(stats.lastSaleWei)} ETH` : "—"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Active listings</div>
                      <div className="mt-1 text-[13px] font-extrabold text-white/85 truncate">
                        {toInt(stats?.activeListings ?? 0)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Volume</div>
                      <div className="mt-1 text-[13px] font-extrabold text-white/85 truncate">
                        {stats?.volumeTotalWei ? `${fmtEth(stats.volumeTotalWei)} ETH` : "0"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Contract</div>
                      <div className="mt-1 text-[13px] font-mono font-extrabold text-white/85 truncate">{shortAddr(nft.contract)}</div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Token ID</div>
                      <div className="mt-1 text-[13px] font-mono font-extrabold text-white/85 truncate">#{nft.tokenId}</div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Chain ID</div>
                      <div className="mt-1 text-[13px] font-mono font-extrabold text-white/85 truncate">{nft.chainId}</div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Minted</div>
                      <div className="mt-1 text-[13px] font-extrabold text-white/85 truncate">
                        {new Date(nft.createdAt).toLocaleString("en-GB")}
                      </div>
                    </div>

                    <div className="col-span-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Total Supply</div>
                      <div className="mt-1 text-[13px] font-extrabold text-white/85 truncate">{supplyLabel || "—"}</div>
                    </div>
                  </div>

                  <div className="mt-7 flex flex-wrap gap-3">
                    {tokenUriHttp ? (
                      <a
                        href={tokenUriHttp}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/15 bg-white/[0.06] font-extrabold backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)] hover:bg-white/10 hover:-translate-y-px transition active:translate-y-0"
                      >
                        Token URI ↗
                      </a>
                    ) : null}

                    {txUrl ? (
                      <a
                        href={txUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/15 bg-white/[0.06] font-extrabold backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)] hover:bg-white/10 hover:-translate-y-px transition active:translate-y-0"
                      >
                        Tx ↗
                      </a>
                    ) : null}

                    {contractUrl ? (
                      <a
                        href={contractUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/15 bg-white/[0.06] font-extrabold backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)] hover:bg-white/10 hover:-translate-y-px transition active:translate-y-0"
                      >
                        Contract ↗
                      </a>
                    ) : null}

                    {ownerNftsUrl ? (
                      <Link
                        href={ownerNftsUrl}
                        className="inline-flex items-center justify-center px-5 py-3 rounded-2xl text-black font-extrabold hover:brightness-110 transition shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
                      >
                        Back to gallery
                      </Link>
                    ) : null}
                  </div>

                  <div className="mt-6 text-[11px] text-white/35">
                    Market uses timeout + revalidate({MARKET_REVALIDATE_SECONDS}s) + tags. If market fails — page still renders.
                  </div>
                </div>
              </div>
            </div>

            <div className="reveal" style={{ animationDelay: "200ms" }}>
              <TradingPanel1155 chainId={chainId} contract={contract} tokenId={tokenId} />
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div
            className={cx(
              "reveal rounded-[34px] p-px overflow-hidden",
              "bg-[linear-gradient(135deg,rgba(247,231,167,0.16),rgba(212,175,55,0.08),rgba(184,135,10,0.06))]",
              "shadow-[0_34px_130px_rgba(0,0,0,0.60)]"
            )}
            style={{ animationDelay: "240ms" }}
          >
            <div className="rounded-[34px] overflow-hidden border border-white/10 bg-[#0b0a09]/30 backdrop-blur-2xl ring-1 ring-black/10 p-6 md:p-7">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[12px] font-black text-white/80 uppercase tracking-wider">Active Listings</div>
                <div className="text-[12px] text-white/55 font-semibold">{listings.length}</div>
              </div>

              {listings.length === 0 ? (
                <div className="mt-4 text-[12px] text-white/60">No active listings yet.</div>
              ) : (
                <div className="mt-4 space-y-2">
                  {listings.slice(0, 10).map((l) => (
                    <div key={l.marketplaceListingId} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[13px] font-black text-amber-100">
                          {fmtEth(l.pricePerUnitWei)} ETH <span className="text-white/35 text-[11px] font-black">/ unit</span>
                        </div>
                        <div className="text-[12px] text-white/70 font-semibold">
                          Remaining: <span className="text-white/90 font-black">{l.amountRemaining}</span>
                        </div>
                      </div>

                      <div className="mt-2 text-[12px] text-white/55 flex flex-wrap items-center gap-2">
                        <span>Seller:</span>
                        <span className="font-mono text-white/80">{shortAddr(l.sellerWallet)}</span>
                        <span className="text-white/35">•</span>
                        <span className="font-black text-white/70">Listing #{l.marketplaceListingId}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div
            className={cx(
              "reveal rounded-[34px] p-px overflow-hidden",
              "bg-[linear-gradient(135deg,rgba(247,231,167,0.16),rgba(212,175,55,0.08),rgba(184,135,10,0.06))]",
              "shadow-[0_34px_130px_rgba(0,0,0,0.60)]"
            )}
            style={{ animationDelay: "280ms" }}
          >
            <div className="rounded-[34px] overflow-hidden border border-white/10 bg-[#0b0a09]/30 backdrop-blur-2xl ring-1 ring-black/10 p-6 md:p-7">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[12px] font-black text-white/80 uppercase tracking-wider">Recent Trades</div>
                <div className="text-[12px] text-white/55 font-semibold">{trades.length}</div>
              </div>

              {trades.length === 0 ? (
                <div className="mt-4 text-[12px] text-white/60">No trades yet.</div>
              ) : (
                <div className="mt-4 space-y-2">
                  {trades.slice(0, 10).map((t) => (
                    <div key={`${t.txHash}:${t.logIndex}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[13px] font-black text-amber-100">
                          {fmtEth(t.totalPriceWei)} ETH{" "}
                          <span className="text-white/35 text-[11px] font-black">•</span>
                          <span className="ml-2 text-white/80 text-[12px] font-black">x{t.amount}</span>
                        </div>
                        <div className="text-[11px] text-white/40">{new Date(t.blockTime).toLocaleString("en-GB")}</div>
                      </div>

                      <div className="mt-2 text-[12px] text-white/55">
                        {shortAddr(t.sellerWallet)} → {shortAddr(t.buyerWallet)}
                        <span className="text-white/35"> • </span>
                        <a
                          className="text-amber-100/90 hover:text-amber-100 font-black"
                          href={chainId === 84532 ? `https://sepolia.basescan.org/tx/${t.txHash}` : `https://basescan.org/tx/${t.txHash}`}
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
        </div>

        <footer className="reveal pt-10 text-[10px] font-black text-white/20 text-center uppercase tracking-[0.4em]">
          Realife Ecosystem • NFT Trading
        </footer>
      </div>
    </main>
  );
}