import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import Reveal from "@/components/Reveal";
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

function Pill({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/70 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
      {children}
    </div>
  );
}

function GoldEdgeWrap({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-[34px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.35),rgba(212,175,55,0.16),rgba(184,135,10,0.10))]",
        "shadow-[0_34px_130px_rgba(0,0,0,0.60)]",
        className
      )}
    >
      <div
        className={cx(
          "relative overflow-hidden rounded-[34px]",
          "border border-white/10 bg-[#0b0a09]/60 backdrop-blur-2xl",
          "ring-1 ring-black/10",
          "before:pointer-events-none before:absolute before:inset-0",
          "before:bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.12),transparent_45%)]",
          "after:pointer-events-none after:absolute after:inset-0",
          "after:bg-[radial-gradient(circle_at_85%_115%,rgba(255,255,255,0.06),transparent_55%)]"
        )}
      >
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

function ActionLink({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
}) {
  if (primary) {
    return (
      <Link
        href={href}
        className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-6 py-3 font-extrabold text-black ring-1 ring-black/15 transition hover:brightness-110 shadow-[0_18px_60px_rgba(212,175,55,0.20)]"
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-3 font-semibold backdrop-blur-2xl transition hover:bg-white/10 shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
    >
      {children}
    </Link>
  );
}

/* ------------------------------- Config ------------------------------ */

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://accurate-art-production.up.railway.app"
).replace(/\/$/, "");

const USER_1155_STANDARD_CONTRACT = norm(
  process.env.NEXT_PUBLIC_REALIFE_1155_NEW_CONTRACT ||
    process.env.REALIFE_1155_NEW_CONTRACT ||
    ""
);

const USER_1155_DELIVERY_CONTRACT = norm(
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

const USER_1155_CONTRACTS = [
  USER_1155_STANDARD_CONTRACT,
  USER_1155_DELIVERY_CONTRACT,
].filter(Boolean);

const ALLOWED_1155_CONTRACTS = [
  ...USER_1155_CONTRACTS,
  CAFE_1155_CONTRACT,
  STORE_1155_CONTRACT,
].filter(Boolean);

const CAFE_STOREFRONT_HREF = "/app/real-marketing/realife-cafe";
const STORE_STOREFRONT_HREF = "/app/real-marketing/realife-store";

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

/* ------------------------------- Helpers ------------------------------ */

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

    if (c && returnedContract && returnedContract !== c) {
      return null;
    }

    return j;
  } catch {
    // ignore
  }

  return null;
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

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (x: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (true) {
        const idx = i++;
        if (idx >= items.length) break;
        out[idx] = await fn(items[idx]);
      }
    }
  );

  await Promise.all(workers);
  return out;
}

function tabHref(base: string, tab: string) {
  return tab === "nfts" ? base : `${base}?tab=${encodeURIComponent(tab)}`;
}

function isLikelyVideoMeta(meta: any) {
  const anim =
    typeof meta?.animation_url === "string"
      ? meta.animation_url
      : typeof meta?.animationUrl === "string"
      ? meta.animationUrl
      : typeof meta?.animation === "string"
      ? meta.animation
      : null;

  return Boolean(anim);
}

function buildNftHref(
  chainId: number,
  contract: string,
  tokenId: string,
  fromHref?: string | null
) {
  const base = `/nft/${chainId}/${contract}/${encodeURIComponent(
    String(tokenId)
  )}`;
  if (!fromHref) return base;
  return `${base}?from=${encodeURIComponent(fromHref)}`;
}

function StatChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
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
          tone === "gold" ? "text-amber-100/70" : "text-white/55"
        )}
      >
        {label}
      </div>
      <div
        className={cx(
          "mt-1 text-sm font-extrabold truncate",
          tone === "gold" ? "text-amber-100" : "text-white/90"
        )}
      >
        {value}
      </div>
    </div>
  );
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
  const tab =
    String(rawTab || "nfts").toLowerCase() === "activity" ? "activity" : "nfts";

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
  const pageBase =
    publicKey && publicKey !== "tmp" ? `/u/${publicKey}/nfts` : `/u/${key}/nfts`;

  const session = await getServerSession(authOptions);
  const viewerId = (session as any)?.user?.id || (session as any)?.userId || null;
  const viewerWallet = String(
    (session as any)?.user?.walletAddress || (session as any)?.walletAddress || ""
  )
    .trim()
    .toLowerCase();
  const ownerWallet = String(user.walletAddress || "").trim().toLowerCase();

  const isOwner = Boolean(
    (viewerId && viewerId === user.id) ||
      (viewerWallet && ownerWallet && viewerWallet === ownerWallet)
  );

  const holdingWhere: any = {
    userId: user.id,
    amount: { gt: 0n },
    mint: { verified: true },
  };

  if (ALLOWED_1155_CONTRACTS.length > 0) {
    holdingWhere.contract = { in: ALLOWED_1155_CONTRACTS };
  }

  const itemsCount = await prisma.holding.count({
    where: holdingWhere,
  });

  const effectiveTab = tab === "activity" && !isOwner ? "nfts" : tab;
  const galleryBackHref = tabHref(pageBase, "nfts");

  let enriched: any[] = [];

  if (effectiveTab === "nfts") {
    const holdings = await prisma.holding.findMany({
      where: holdingWhere,
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
      const contract = String(x.contract || "").toLowerCase();

      const isCafeNft = !!CAFE_1155_CONTRACT && contract === CAFE_1155_CONTRACT;
      const isStoreNft =
        !!STORE_1155_CONTRACT && contract === STORE_1155_CONTRACT;
      const isUser1155Nft = USER_1155_CONTRACTS.includes(contract);

      const isDeliveryUserNft =
        !!USER_1155_DELIVERY_CONTRACT &&
        contract === USER_1155_DELIVERY_CONTRACT;

      const fallbackPoster = ipfsToHttp(x.mint?.image, IPFS_GATEWAYS[0]);

      let kind: "image" | "video" = "image";
      let media: string | null = fallbackPoster;
      let poster: string | null = null;
      let supply: string | null = null;

      const liveMeta = isUser1155Nft
        ? await loadMetadataFromBackend1155(String(x.tokenId), contract)
        : null;

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
        const animHttp =
          ipfsToHttp(metaAnimation, PINATA_IPFS) ||
          ipfsToHttp(metaAnimation, IPFS_GATEWAYS[0]);

        if (isLikelyVideoMeta(meta)) {
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
        contract,
        tokenId: x.tokenId,
        ownedAmount: x.amount.toString(),
        updatedAt: x.updatedAt,
        name: x.mint?.name ?? null,
        tokenUri: x.mint?.tokenUri ?? null,
        kind,
        media,
        poster,
        supply,
        isCafeNft,
        isStoreNft,
        isUser1155Nft,
        isDeliveryUserNft,
      };
    });
  }

  const cafeCount = enriched.filter((x) => x.isCafeNft).length;
  const storeCount = enriched.filter((x) => x.isStoreNft).length;

  return (
    <div className="space-y-8">
      <Reveal>
        <GoldEdgeWrap className="rounded-[40px]">
          <div className="relative overflow-hidden p-7 md:p-10">
            <div className="pointer-events-none absolute -top-44 -right-44 h-[560px] w-[560px] rounded-full bg-[#d4af37]/14 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-44 -left-44 h-[560px] w-[560px] rounded-full bg-white/[0.06] blur-3xl" />

            <div className="relative">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_18px_70px_rgba(0,0,0,0.30)] ring-1 ring-black/15">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt="avatar"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-black text-white/35">
                      RL
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill>Public gallery</Pill>

                    {isOwner ? (
                      <Pill>
                        <span className="font-extrabold text-amber-100">
                          Owner view
                        </span>
                      </Pill>
                    ) : null}

                    <Pill>
                      <span className="font-extrabold text-white/80">
                        {itemsCount} items
                      </span>
                    </Pill>
                  </div>

                  <h1 className="mt-5 truncate text-4xl font-black leading-[1.05] tracking-[-0.02em] md:text-6xl">
                    {displayName}
                  </h1>

                  <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/70 md:text-base">
                    Public NFT gallery inside the Realife ecosystem. Explore
                    verified holdings, media previews and collection activity
                    from one profile view.
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-white/55">
                    {publicUrl ? (
                      <>
                        <Link className="hover:underline" href={publicUrl}>
                          Back to profile
                        </Link>
                        <span>•</span>
                      </>
                    ) : null}
                    <span>
                      {effectiveTab === "activity" ? "My Activity" : "NFT Gallery"}
                    </span>
                    {(cafeCount > 0 || storeCount > 0) &&
                    effectiveTab === "nfts" ? (
                      <>
                        <span>•</span>
                        <span>
                          {cafeCount > 0 ? `Cafe ${cafeCount}` : ""}
                          {cafeCount > 0 && storeCount > 0 ? " • " : ""}
                          {storeCount > 0 ? `Store ${storeCount}` : ""}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {publicUrl ? (
                    <ActionLink href={publicUrl}>Profile</ActionLink>
                  ) : null}
                  <ActionLink href="/app/trading" primary>
                    Trading →
                  </ActionLink>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatChip label="Items" value={itemsCount} tone="gold" />
                <StatChip
                  label="Tab"
                  value={effectiveTab === "activity" ? "My Activity" : "NFTs"}
                />
                <StatChip
                  label="Cafe NFTs"
                  value={effectiveTab === "nfts" ? cafeCount : "—"}
                />
                <StatChip
                  label="Store NFTs"
                  value={effectiveTab === "nfts" ? storeCount : "—"}
                />
              </div>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={70}>
        <div className="flex flex-wrap items-center gap-2">
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
            <span className="ml-2 inline-flex h-5 items-center justify-center rounded-full bg-black/25 px-2 text-[10px] font-black text-white/80 ring-1 ring-white/10">
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
              <span className="ml-2 inline-flex h-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-2 text-[10px] font-black text-black/80 ring-1 ring-black/15">
                NEW
              </span>
            </Link>
          ) : null}
        </div>
      </Reveal>

      {effectiveTab === "activity" ? (
        <Reveal delayMs={100}>
          <ActivityPanel userKey={key} />
        </Reveal>
      ) : (
        <>
          <Reveal delayMs={100}>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {enriched.map((x: any) => {
                const storefrontHref = x.isCafeNft
                  ? CAFE_STOREFRONT_HREF
                  : x.isStoreNft
                  ? STORE_STOREFRONT_HREF
                  : null;

                const nftHref = buildNftHref(
                  x.chainId,
                  x.contract,
                  String(x.tokenId),
                  galleryBackHref
                );

                return (
                  <Link
                    key={x.id}
                    href={nftHref}
                    className={cx(
                      "group rounded-[26px] overflow-hidden border border-white/10 bg-white/[0.04]",
                      "backdrop-blur-xl",
                      "shadow-[0_24px_90px_rgba(0,0,0,0.55)] hover:-translate-y-1 transition-all duration-300 hover:bg-white/[0.08]"
                    )}
                  >
                    <div className="relative aspect-square w-full bg-black/30">
                      {isOwner ? (
                        <div className="absolute right-3 top-3 z-10 opacity-0 transition-opacity group-hover:opacity-100">
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

                          <div className="absolute left-3 top-3 flex flex-col gap-2">
                            {x.kind === "video" ? (
                              <div className="rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-black text-amber-100">
                                VIDEO
                              </div>
                            ) : null}

                            <div
                              className={cx(
                                "rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-black",
                                x.isCafeNft
                                  ? "text-amber-100"
                                  : x.isStoreNft
                                  ? "text-sky-200"
                                  : x.isDeliveryUserNft
                                  ? "text-emerald-200"
                                  : "text-emerald-200"
                              )}
                            >
                              {x.isCafeNft
                                ? "CAFE"
                                : x.isStoreNft
                                ? "STORE"
                                : x.isDeliveryUserNft
                                ? "DELIVERY"
                                : "EDITION"}
                            </div>

                            <div className="rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-black text-white/85">
                              Owned x{x.ownedAmount}
                            </div>
                          </div>

                          {x.supply ? (
                            <div className="absolute bottom-3 right-3 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-black text-white/85">
                              Supply x{x.supply}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/25 font-black">
                          No media
                        </div>
                      )}

                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.4)_0%,transparent_40%)] opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>

                    <div className="p-5">
                      <div className="truncate text-sm font-extrabold text-white/90">
                        {x.name || `Token #${x.tokenId}`}
                      </div>

                      <div className="mt-1.5 flex items-center justify-between gap-2 text-[12px] text-white/55">
                        <span className="truncate">{shortAddr(x.contract)}</span>
                        <span className="font-mono">#{x.tokenId}</span>
                      </div>

                      {storefrontHref ? (
                        <div className="mt-3">
                          <span
                            className={cx(
                              "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black",
                              x.isCafeNft
                                ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
                                : "border-sky-500/20 bg-sky-500/10 text-sky-200"
                            )}
                          >
                            {x.isCafeNft ? "Cafe storefront" : "NFT Store"}
                          </span>
                        </div>
                      ) : null}

                      <div className="mt-4 h-[1px] bg-white/10" />

                      <div className="mt-4 flex items-center justify-between text-[12px] font-extrabold text-amber-100/90 group-hover:text-amber-100">
                        <span>View Details</span>
                        <span>→</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Reveal>

          {enriched.length === 0 && (
            <Reveal delayMs={120}>
              <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-8 text-center text-white/60 backdrop-blur-xl">
                <div className="text-lg font-black text-white/85">
                  This user doesn&apos;t own any NFTs yet.
                </div>
                {publicUrl ? (
                  <div className="mt-4">
                    <Link
                      href={publicUrl}
                      className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-extrabold transition hover:bg-white/10 shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                    >
                      Back to profile
                    </Link>
                  </div>
                ) : null}
              </div>
            </Reveal>
          )}
        </>
      )}

      <Reveal delayMs={180}>
        <div className="pb-6 pt-2 text-center text-[10px] font-black uppercase tracking-[0.4em] text-white/20">
          Realife Ecosystem • Gallery
        </div>
      </Reveal>
    </div>
  );
}