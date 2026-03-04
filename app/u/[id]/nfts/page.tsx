import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import NftMedia from "@/components/NftMedia";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ActivityPanel from "@/components/trading/ActivityPanel";
import QuickList1155 from "@/components/trading/QuickList1155";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
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

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "https://accurate-art-production.up.railway.app").replace(
  /\/$/,
  ""
);

const REALIFE_1155_NEW_CONTRACT = norm(process.env.NEXT_PUBLIC_REALIFE_1155_NEW_CONTRACT || "");

const PRIMARY_IPFS_ORIGIN = (process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://nftstorage.link").replace(/\/$/, "");

const IPFS_GATEWAYS = [
  `${PRIMARY_IPFS_ORIGIN}/ipfs/`,
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
] as const;

const PINATA_IPFS = "https://gateway.pinata.cloud/ipfs/";

/* ------------------------------- Helpers ------------------------------ */

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
      // next gateway
    }
  }
  return null;
}

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

function pickAttrValue(meta: any, trait: string): string | null {
  const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
  const t = trait.toLowerCase();
  const hit = attrs.find((a: any) => String(a?.trait_type || "").toLowerCase() === t);
  const v = hit?.value;
  if (v === undefined || v === null) return null;
  return String(v);
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      out[idx] = await fn(items[idx]);
    }
  });

  await Promise.all(workers);
  return out;
}

function tabHref(base: string, tab: string) {
  return tab === "nfts" ? base : `${base}?tab=${encodeURIComponent(tab)}`;
}

export default async function PublicNFTsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = (searchParams ? await searchParams : {}) as any;

  const key = safeDecode(id || "").trim();
  if (!key || key.length > 64) notFound();

  const rawTab = typeof sp?.tab === "string" ? sp.tab : "nfts";
  const tab = String(rawTab || "nfts").toLowerCase() === "activity" ? "activity" : "nfts";

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { handle: { equals: key, mode: "insensitive" } },
        { publicId: { equals: key, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      handle: true,
      publicId: true,
      walletAddress: true,
      twitterName: true,
      twitterUser: true,
      twitterImage: true,
      discordName: true,
      discordUser: true,
      discordImage: true,
    },
  });

  if (!user) notFound();

  const displayName =
    user.twitterName ||
    user.discordName ||
    (user.twitterUser ? `@${user.twitterUser}` : null) ||
    (user.discordUser ? `@${user.discordUser}` : null) ||
    (user.handle ? `@${user.handle}` : null) ||
    shortAddr(user.walletAddress);

  const avatar = user.twitterImage || user.discordImage || null;
  const publicKey = user.handle || user.publicId || null;
  const publicUrl = publicKey && publicKey !== "tmp" ? `/u/${publicKey}` : null;
  const pageBase = publicKey && publicKey !== "tmp" ? `/u/${publicKey}/nfts` : `/u/${key}/nfts`;

  // ✅ owner check (only owner can see activity + list buttons)
  const session = await getServerSession(authOptions);
  const viewerId = (session as any)?.user?.id || (session as any)?.userId || null;
  const viewerWallet = ((session as any)?.user?.walletAddress || (session as any)?.walletAddress || "")?.toLowerCase?.() || "";
  const isOwner = Boolean(
    (viewerId && viewerId === user.id) || (viewerWallet && viewerWallet === user.walletAddress.toLowerCase())
  );

  // quick count (always cheap)
  const itemsCount = await prisma.holding.count({
    where: {
      userId: user.id,
      amount: { gt: 0n },
      mint: { verified: true },
      ...(REALIFE_1155_NEW_CONTRACT ? { contract: REALIFE_1155_NEW_CONTRACT } : {}),
    },
  });

  // If activity tab but not owner -> force NFTs
  const effectiveTab = tab === "activity" && !isOwner ? "nfts" : tab;

  // For NFT tab: load holdings + heavy metadata
  let enriched: any[] = [];
  if (effectiveTab === "nfts") {
    const holdings = await prisma.holding.findMany({
      where: {
        userId: user.id,
        amount: { gt: 0n },
        mint: { verified: true },
        ...(REALIFE_1155_NEW_CONTRACT ? { contract: REALIFE_1155_NEW_CONTRACT } : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        chainId: true,
        contract: true,
        tokenId: true,
        amount: true,
        updatedAt: true,
        mint: {
          select: {
            name: true,
            image: true,
            tokenUri: true,
            createdAt: true,
          },
        },
      },
      take: 200,
    });

    enriched = await mapLimit(holdings, 8, async (x) => {
      const fallbackPoster = ipfsToHttp(x.mint?.image, IPFS_GATEWAYS[0]);

      let kind: "image" | "video" = "image";
      let media: string | null = fallbackPoster;
      let poster: string | null = null;

      let supply: string | null = null;

      const liveMeta = await loadMetadataFromBackend1155(String(x.tokenId));
      let meta: any = liveMeta;

      if (!meta && x.mint?.tokenUri) {
        meta = await loadMetadataFromTokenUri(x.mint.tokenUri);
      }

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

        if (metaAnimation) {
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

        supply = pickAttrValue(meta, "Total Supply");
        if (!supply) {
          const s = meta?.supply;
          if (typeof s === "number") supply = String(s);
          else if (typeof s === "string" && s.trim()) supply = s.trim();
        }
      }

      return {
        id: x.id,
        chainId: x.chainId,
        contract: String(x.contract || "").toLowerCase(),
        tokenId: x.tokenId,
        ownedAmount: x.amount.toString(),
        updatedAt: x.updatedAt,
        name: x.mint?.name ?? null,
        tokenUri: x.mint?.tokenUri ?? null,
        kind,
        media,
        poster,
        supply,
      };
    });
  }

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

      <div className="relative mx-auto max-w-7xl px-6 py-10">
        <div className="reveal flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl border border-white/10 bg-white/[0.06] overflow-hidden shadow-[0_18px_70px_rgba(0,0,0,0.30)] ring-1 ring-black/15">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-white/35 font-black text-xs">RL</div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-3xl md:text-4xl font-black tracking-tight truncate">{displayName}</div>
            <div className="mt-2 flex items-center gap-2 text-[12px] text-white/55">
              {publicUrl ? (
                <Link className="hover:underline" href={publicUrl}>
                  Back to profile
                </Link>
              ) : null}
              <span>•</span>
              <span>{itemsCount} items</span>
            </div>
          </div>

          {publicUrl ? (
            <Link
              href={publicUrl}
              className="px-5 py-3 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 text-sm font-extrabold transition shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
            >
              Profile
            </Link>
          ) : null}
        </div>

        {/* Tabs */}
        <div className="reveal mt-8 flex flex-wrap items-center gap-2" style={{ animationDelay: "60ms" }}>
          <Link
            href={tabHref(pageBase, "nfts")}
            className={cx(
              "px-4 py-2 rounded-2xl border text-[12px] font-black transition",
              effectiveTab === "nfts"
                ? "border-white/15 bg-white/[0.10] text-white shadow-[0_18px_70px_rgba(0,0,0,0.24)]"
                : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
            )}
          >
            NFTs
            <span className="ml-2 inline-flex items-center justify-center h-5 px-2 rounded-full text-[10px] font-black text-white/80 bg-black/25 ring-1 ring-white/10">
              {itemsCount}
            </span>
          </Link>

          {isOwner ? (
            <Link
              href={tabHref(pageBase, "activity")}
              className={cx(
                "px-4 py-2 rounded-2xl border text-[12px] font-black transition",
                effectiveTab === "activity"
                  ? "border-white/15 bg-white/[0.10] text-white shadow-[0_18px_70px_rgba(0,0,0,0.24)]"
                  : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
              )}
            >
              My Activity
              <span className="ml-2 inline-flex items-center justify-center h-5 px-2 rounded-full text-[10px] font-black text-black/80 bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15">
                NEW
              </span>
            </Link>
          ) : null}

          <div className="flex-1" />

          <Link
            href="/app/trading"
            className={cx(
              "px-4 py-2 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08]",
              "text-[12px] font-black text-amber-100/90 hover:text-amber-100 transition"
            )}
          >
            Trading →
          </Link>
        </div>

        {/* Content */}
        {effectiveTab === "activity" ? (
          <div className="reveal mt-8" style={{ animationDelay: "90ms" }}>
            <ActivityPanel userKey={key} />
          </div>
        ) : (
          <>
            <div
              className="reveal mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              style={{ animationDelay: "90ms" }}
            >
              {enriched.map((x: any) => (
                <Link
                  key={x.id}
                  href={`/nft/${x.chainId}/${x.contract}/${x.tokenId}`}
                  className={cx(
                    "group rounded-[26px] overflow-hidden border border-white/10 bg-white/[0.04]",
                    "backdrop-blur-xl",
                    "shadow-[0_24px_90px_rgba(0,0,0,0.55)] hover:-translate-y-1 transition-all duration-300 hover:bg-white/[0.08]"
                  )}
                >
                  <div className="aspect-square w-full bg-black/30 relative">
                    {/* ✅ OpenSea-like quick list (owner only). Appears on hover */}
                    {isOwner ? (
                      <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <QuickList1155
                          chainId={x.chainId}
                          contract={x.contract}
                          tokenId={String(x.tokenId)}
                          maxAmountHint={String(x.ownedAmount)}
                          name={x.name}
                        />
                      </div>
                    ) : null}

                    {x.media ? (
                      <>
                        <NftMedia
                          src={x.media}
                          kind={x.kind}
                          alt={x.name || "NFT"}
                          poster={x.kind === "video" ? x.poster : null}
                          showControls={false}
                          className="h-full w-full"
                          roundedClass="rounded-none"
                        />

                        {/* badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                          {x.kind === "video" ? (
                            <div className="px-2 py-1 rounded-full border border-white/10 bg-black/40 text-[10px] font-black text-amber-100">
                              VIDEO
                            </div>
                          ) : null}

                          <div className="px-2 py-1 rounded-full border border-white/10 bg-black/40 text-[10px] font-black text-emerald-200">
                            EDITION
                          </div>

                          <div className="px-2 py-1 rounded-full border border-white/10 bg-black/40 text-[10px] font-black text-white/85">
                            Owned x{x.ownedAmount}
                          </div>
                        </div>

                        {x.supply ? (
                          <div className="absolute top-3 right-3 px-2 py-1 rounded-full border border-white/10 bg-black/40 text-[10px] font-black text-white/85">
                            Supply x{x.supply}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-white/25 font-black">No media</div>
                    )}

                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.4)_0%,transparent_40%)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className="p-5">
                    <div className="text-sm font-extrabold text-white/90 truncate">{x.name || `Token #${x.tokenId}`}</div>
                    <div className="mt-1.5 text-[12px] text-white/55 flex items-center justify-between gap-2">
                      <span className="truncate">{shortAddr(x.contract)}</span>
                      <span className="font-mono">#{x.tokenId}</span>
                    </div>

                    <div className="mt-4 h-[1px] bg-white/10" />
                    <div className="mt-4 text-[12px] font-extrabold text-amber-100/90 group-hover:text-amber-100 flex items-center justify-between">
                      <span>View Details</span>
                      <span>→</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {enriched.length === 0 && (
              <div className="reveal mt-10 rounded-[26px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-8 text-center text-white/60">
                This creator hasn&apos;t minted any NFTs yet.
              </div>
            )}
          </>
        )}

        <footer className="reveal pt-10 text-[10px] font-black text-white/20 text-center uppercase tracking-[0.4em]">
          Realife Ecosystem • Gallery
        </footer>
      </div>
    </main>
  );
}