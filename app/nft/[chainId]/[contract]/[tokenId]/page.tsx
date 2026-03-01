import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import NftMedia from "@/components/NftMedia";

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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://accurate-art-production.up.railway.app";

const REALIFE_1155_CONTRACT = (process.env.NEXT_PUBLIC_REALIFE_1155_CONTRACT || "").trim();

const PRIMARY_IPFS_ORIGIN = (process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://nftstorage.link").replace(/\/$/, "");

const IPFS_GATEWAYS = [
  `${PRIMARY_IPFS_ORIGIN}/ipfs/`,
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
] as const;

const PINATA_IPFS = "https://gateway.pinata.cloud/ipfs/";

/* ------------------------------- IPFS helpers ------------------------------ */

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

/* ----------------------------- Backend metadata ---------------------------- */

function is1155ByContract(contractLower: string) {
  if (!REALIFE_1155_CONTRACT) return false;
  return norm(contractLower) === norm(REALIFE_1155_CONTRACT);
}

async function loadMetadataFromBackend(tokenId: string, is1155: boolean) {
  const base = String(API_BASE || "").replace(/\/$/, "");
  if (!base || !tokenId) return null;

  const path = is1155 ? "metadata1155" : "metadata";

  try {
    const r = await fetch(`${base}/${path}/${encodeURIComponent(tokenId)}`, { cache: "no-store" });
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

  const is1155 = is1155ByContract(contract);

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

  // ✅ Prefer backend metadata route (721 vs 1155), fallback to tokenURI JSON
  const liveMeta = await loadMetadataFromBackend(tokenId, is1155);
  const meta = liveMeta || (nft.tokenUri ? await loadMetadataFromTokenUri(nft.tokenUri) : null);

  // Supply (only meaningful for 1155)
  let supplyLabel: string | null = null;
  if (is1155 && meta) {
    // backend /metadata1155 gives Total Supply in attributes
    supplyLabel = pickAttrValue(meta, "Total Supply");
    if (!supplyLabel) {
      // fallback: original tokenURI metadata may contain supply field
      const s = meta?.supply;
      if (typeof s === "number") supplyLabel = String(s);
      else if (typeof s === "string" && s.trim()) supplyLabel = s.trim();
    }
  }

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

  const standardLabel = is1155 ? "ERC-1155" : "ERC-721";

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

          {/* Meta */}
          <div
            className={cx(
              "reveal rounded-[34px] p-px overflow-hidden",
              "bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))]",
              "shadow-[0_34px_130px_rgba(0,0,0,0.60)]"
            )}
            style={{ animationDelay: "140ms" }}
          >
            <div className="rounded-[34px] h-full overflow-hidden border border-white/10 bg-[#0b0a09]/30 backdrop-blur-2xl ring-1 ring-black/10">
              <div className="p-6 md:p-7 h-full flex flex-col">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 font-black">
                    {is1155 ? "Realife Edition" : "Realife NFT"}
                  </div>

                  <div className="px-3 py-1.5 rounded-full border border-white/15 bg-white/[0.06] text-[11px] font-black text-amber-100">
                    {standardLabel}
                  </div>
                </div>

                <div className="mt-3 text-3xl md:text-4xl font-black tracking-tight">
                  {nft.name || `Token #${nft.tokenId}`}
                </div>

                {/* Owner (для 1155 это “минтер/профиль”, не единственный владелец) */}
                <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="h-12 w-12 rounded-2xl border border-white/10 bg-white/[0.06] overflow-hidden flex items-center justify-center shadow-[0_18px_70px_rgba(0,0,0,0.30)] ring-1 ring-black/15">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt="owner" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-white/35 text-xs font-black">RL</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                      {is1155 ? "Creator / Profile" : "Owner"}
                    </div>
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

                {/* Details */}
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

                  {is1155 ? (
                    <div className="col-span-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Total Supply</div>
                      <div className="mt-1 text-[13px] font-extrabold text-white/85 truncate">{supplyLabel || "—"}</div>
                    </div>
                  ) : null}
                </div>

                <div className="flex-1" />

                {/* Links */}
                <div className="mt-8 flex flex-wrap gap-3">
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
                  Media is resolved from backend {is1155 ? "/metadata1155" : "/metadata"} (animation_url), with IPFS tokenURI fallback.
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="reveal pt-10 text-[10px] font-black text-white/20 text-center uppercase tracking-[0.4em]">
          Realife Ecosystem • NFT Verified
        </footer>
      </div>
    </main>
  );
}