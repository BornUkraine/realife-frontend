// PATH: app/app/profile/[id]/nfts/page.tsx — Public NFT gallery for a profile. Light compact alignment for the new AppShell.
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ActivityPanel from "@/components/trading/ActivityPanel";
import GalleryGridClient from "@/components/gallery/GalleryGridClient";
import type { ReactNode } from "react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function normText(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

// ─── Config ───────────────────────────────────────────────────────────────────

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

// New quantity/inventory protected ERC-1155 mint contract.
// Profile galleries must include this address, otherwise protected NFTs
// minted on 0xf67a... will be hidden from public/user galleries.
const USER_1155_PROTECTED_CONTRACT = norm(
  process.env.NEXT_PUBLIC_REALIFE_PROTECTED_1155_ADDRESS ||
    process.env.REALIFE_PROTECTED_1155_ADDRESS ||
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
  USER_1155_PROTECTED_CONTRACT,
].filter(Boolean);

const ALLOWED_1155_CONTRACTS = [
  ...USER_1155_CONTRACTS,
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

const METADATA_FETCH_TIMEOUT_MS = 3200;

function withFetchTimeout(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

function normalizeMediaKind(v?: string | null): "image" | "video" | null {
  const s = String(v || "").trim().toLowerCase();
  if (!s) return null;
  if (s.includes("video") || s === "animation" || s === "animated") return "video";
  if (s.includes("image") || s.includes("photo") || s.includes("poster")) return "image";
  return null;
}

// ─── Market classification helpers ────────────────────────────────────────────

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

  if (c && c === USER_1155_PROTECTED_CONTRACT) {
    return "PROTECTED" as const;
  }

  if (c && c === USER_1155_DELIVERY_CONTRACT) {
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

  if (norm(input.contract) === USER_1155_DELIVERY_CONTRACT) {
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

// ─── IPFS / metadata helpers ──────────────────────────────────────────────────

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
      const timeout = withFetchTimeout(METADATA_FETCH_TIMEOUT_MS);
      const r = await fetch(url, {
        signal: timeout.signal,
        next: { revalidate: 60 * 60 * 12 },
      }).finally(timeout.clear);
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

    const timeout = withFetchTimeout(METADATA_FETCH_TIMEOUT_MS);
    const r = await fetch(url, {
      signal: timeout.signal,
      next: { revalidate: 60 * 60 * 12 },
    }).finally(timeout.clear);
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
  const base = `/app/nft/${chainId}/${contract}/${encodeURIComponent(
    String(tokenId)
  )}`;
  if (!fromHref) return base;
  return `${base}?from=${encodeURIComponent(fromHref)}`;
}

// ─── UI components ────────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AppProfileNFTsPage({
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
      googleName: true,
      googleImage: true,
      discordName: true,
      discordUser: true,
      discordImage: true,
    },
  });

  if (!user) notFound();

  const displayName =
    user.twitterName ||
    user.discordName ||
    user.googleName ||
    (user.twitterUser ? `@${user.twitterUser}` : null) ||
    (user.discordUser ? `@${user.discordUser}` : null) ||
    (user.handle ? `@${user.handle}` : null) ||
    shortAddr(user.walletAddress);

  const avatar = user.twitterImage || user.discordImage || user.googleImage || null;
  const publicKey = user.handle || user.publicId || null;
  const publicUrl =
    publicKey && publicKey !== "tmp" ? `/app/profile/${publicKey}` : null;
  const pageBase =
    publicKey && publicKey !== "tmp" ? `/app/profile/${publicKey}/nfts` : `/app/profile/${key}/nfts`;

  const session = await getServerSession(authOptions);
  const viewerId = (session as any)?.user?.id || (session as any)?.userId || null;
  const viewerWallet = String(
    (session as any)?.user?.walletAddress || (session as any)?.walletAddress || ""
  )
    .trim()
    .toLowerCase();
  const ownerWallet = String(user.walletAddress || "")
    .trim()
    .toLowerCase();

  const isOwner = Boolean(
    (viewerId && viewerId === user.id) ||
      (viewerWallet && ownerWallet && viewerWallet === ownerWallet)
  );

  const holdingWhere: any = {
    userId: user.id,
    amount: { gt: 0n },
    mint: {
      is: {
        verified: true,
      },
    },
  };

  if (ALLOWED_1155_CONTRACTS.length > 0) {
    holdingWhere.contract = { in: ALLOWED_1155_CONTRACTS };
  }

  const itemsCount = await prisma.holding.count({ where: holdingWhere });
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
            deliveryEnabled: true,
            physicalItemIncluded: true,
            officialItem: true,
            fulfillmentType: true,
            category: true,
            subcategory: true,
            serviceCountry: true,
            serviceCity: true,
            serviceArea: true,
            metaImage: true,
            metaAnimation: true,
            metaMediaKind: true,
            metaDescription: true,
            metaCollection: true,
            metaItem: true,
            metaRarity: true,
            metaBrand: true,
            metaProject: true,
            metadataCachedAt: true,
          },
        },
      },
      take: 200,
    });

    enriched = await mapLimit(holdings, 8, async (x) => {
      const contract = String(x.contract || "").toLowerCase();
      const isCafeNft = !!CAFE_1155_CONTRACT && contract === CAFE_1155_CONTRACT;
      const isStoreNft = !!STORE_1155_CONTRACT && contract === STORE_1155_CONTRACT;
      const isUser1155Nft = USER_1155_CONTRACTS.includes(contract);
      const isDeliveryUserNft =
        !!USER_1155_DELIVERY_CONTRACT && contract === USER_1155_DELIVERY_CONTRACT;
      const isProtectedUserNft =
        !!USER_1155_PROTECTED_CONTRACT && contract === USER_1155_PROTECTED_CONTRACT;
      const cachedMediaKind = normalizeMediaKind((x.mint as any)?.metaMediaKind);
      const cachedImageUri = (x.mint as any)?.metaImage || x.mint?.image || null;
      const cachedAnimationUri = (x.mint as any)?.metaAnimation || null;

      const fallbackPoster = ipfsToHttp(cachedImageUri, IPFS_GATEWAYS[0]);
      const fallbackAnimation =
        ipfsToHttp(cachedAnimationUri, PINATA_IPFS) ||
        ipfsToHttp(cachedAnimationUri, IPFS_GATEWAYS[0]);

      let kind: "image" | "video" =
        cachedMediaKind === "video" || fallbackAnimation ? "video" : "image";
      let media: string | null =
        kind === "video" ? fallbackAnimation || fallbackPoster : fallbackPoster;
      let poster: string | null = kind === "video" ? fallbackPoster : null;
      let supply: string | null = null;

      // Speed fix: do not block the gallery by fetching metadata for every NFT.
      // Use DB-cached media first; remote metadata is only a fallback for old mints
      // that still have no cached image/animation.
      const shouldFetchRemoteMeta = !media && Boolean(x.mint?.tokenUri);

      const liveMeta =
        shouldFetchRemoteMeta && isUser1155Nft
          ? await loadMetadataFromBackend1155(String(x.tokenId), contract)
          : null;

      let meta: any = liveMeta;
      if (shouldFetchRemoteMeta && !meta && x.mint?.tokenUri) {
        meta = await loadMetadataFromTokenUri(x.mint.tokenUri);
      }

      const metaCategory =
        x.mint?.category ||
        pickAttrAny(meta, ["Category", "category"]) ||
        pickAny(meta, ["category"]) ||
        null;

      const metaSubcategory =
        x.mint?.subcategory ||
        pickAttrAny(meta, ["Subcategory", "subcategory"]) ||
        pickAny(meta, ["subcategory"]) ||
        null;

      const metaFulfillmentType =
        x.mint?.fulfillmentType ||
        pickAny(meta, ["fulfillmentType"]) ||
        pickAttrAny(meta, ["Fulfillment Type", "Fulfillment"]) ||
        null;

      const serviceCountry =
        x.mint?.serviceCountry ||
        pickAny(meta, ["serviceCountry", "service_country", "country"]) ||
        pickAttrAny(meta, ["Service Country", "Country"]) ||
        null;

      const serviceCity =
        x.mint?.serviceCity ||
        pickAny(meta, ["serviceCity", "service_city", "city"]) ||
        pickAttrAny(meta, ["Service City", "City"]) ||
        null;

      const serviceArea =
        x.mint?.serviceArea ||
        pickAny(meta, [
          "serviceArea",
          "service_area",
          "area",
          "serviceZone",
          "service_zone",
        ]) ||
        pickAttrAny(meta, ["Service Area", "Service Zone", "Area"]) ||
        null;

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
          media = animHttp || fallbackAnimation || null;
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

      const secondaryMarketType = suggestSecondaryMarketType({
        contract,
        fulfillmentType: metaFulfillmentType,
        deliveryEnabled: x.mint?.deliveryEnabled,
        physicalItemIncluded: x.mint?.physicalItemIncluded,
        category: metaCategory,
        subcategory: metaSubcategory,
      });

      const usesProtectedSecondaryMarket = secondaryMarketType === "PROTECTED";

      const protectedSubtype = usesProtectedSecondaryMarket
        ? inferProtectedSubtype({
            contract,
            fulfillmentType: metaFulfillmentType,
            deliveryEnabled: x.mint?.deliveryEnabled,
            physicalItemIncluded: x.mint?.physicalItemIncluded,
            category: metaCategory,
            subcategory: metaSubcategory,
          })
        : null;

      const protectedSubtypeLabel = fulfillmentTypeLabel(protectedSubtype);

      return {
        id: x.id,
        chainId: x.chainId,
        contract,
        tokenId: String(x.tokenId),
        ownedAmount: x.amount.toString(),
        updatedAt: x.updatedAt?.toISOString?.() || String(x.updatedAt),
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
        isProtectedUserNft,
        deliveryEnabled: Boolean(x.mint?.deliveryEnabled),
        physicalItemIncluded: Boolean(x.mint?.physicalItemIncluded),
        officialItem: Boolean(x.mint?.officialItem),
        fulfillmentType: metaFulfillmentType,
        category: metaCategory,
        subcategory: metaSubcategory,
        serviceCountry,
        serviceCity,
        serviceArea,
        serviceLocationLabel: formatServiceLocation({
          serviceCountry,
          serviceCity,
          serviceArea,
        }),
        secondaryMarketType,
        usesProtectedSecondaryMarket,
        protectedSubtype,
        protectedSubtypeLabel,
        href: buildNftHref(x.chainId, contract, String(x.tokenId), galleryBackHref),
      };
    });
  }

  const cafeCount = enriched.filter((x) => x.isCafeNft).length;
  const storeCount = enriched.filter((x) => x.isStoreNft).length;
  const protectedCount = enriched.filter(
    (x) => x.secondaryMarketType === "PROTECTED"
  ).length;

  const physicalProtectedCount = enriched.filter(
    (x) => x.protectedSubtype === "PHYSICAL_GOOD"
  ).length;

  const serviceProtectedCount = enriched.filter(
    (x) =>
      x.protectedSubtype === "DIGITAL_SERVICE" ||
      x.protectedSubtype === "ONLINE_SESSION" ||
      x.protectedSubtype === "LOCAL_SERVICE"
  ).length;

  return (
    <div className="space-y-4">
        <div
          className={cx(
            "reveal rounded-[22px] p-px overflow-hidden",
            "bg-[linear-gradient(135deg,rgba(247,231,167,0.24),rgba(212,175,55,0.11),rgba(184,135,10,0.10))]",
            "shadow-[0_26px_100px_rgba(0,0,0,0.60)]"
          )}
        >
          <div className="rounded-[22px] overflow-hidden border border-white/10 bg-[#0b0a09]/25 backdrop-blur-2xl ring-1 ring-black/10">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_0%,rgba(212,175,55,0.12),transparent_45%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_86%_120%,rgba(255,255,255,0.06),transparent_55%)]" />
            </div>

            <div className="relative z-10 p-4 md:p-5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="h-16 w-16 rounded-2xl border border-white/10 bg-white/[0.06] overflow-hidden shadow-[0_18px_70px_rgba(0,0,0,0.30)] ring-1 ring-black/15 shrink-0">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt="avatar"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-white/35 font-bold text-xs">
                      RL
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.06] text-[11px] font-semibold text-white/60">
                      Public gallery
                    </span>
                    {isOwner ? (
                      <span className="px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-[11px] font-semibold text-amber-100">
                        Owner view
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 text-2xl md:text-[2rem] font-black tracking-tight truncate">
                    {displayName}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-white/40">
                    {publicUrl ? (
                      <>
                        <Link className="hover:underline" href={publicUrl}>
                          Back to profile
                        </Link>
                        <span>•</span>
                      </>
                    ) : null}

                    <span>{itemsCount} items</span>

                    {(cafeCount > 0 ||
                      storeCount > 0 ||
                      protectedCount > 0 ||
                      physicalProtectedCount > 0 ||
                      serviceProtectedCount > 0) &&
                    effectiveTab === "nfts" ? (
                      <>
                        <span>•</span>
                        <span>
                          {protectedCount > 0 ? `Protected ${protectedCount}` : ""}
                          {protectedCount > 0 && physicalProtectedCount > 0 ? " • " : ""}
                          {physicalProtectedCount > 0
                            ? `Physical ${physicalProtectedCount}`
                            : ""}
                          {(protectedCount > 0 || physicalProtectedCount > 0) &&
                          serviceProtectedCount > 0
                            ? " • "
                            : ""}
                          {serviceProtectedCount > 0
                            ? `Services ${serviceProtectedCount}`
                            : ""}
                          {(protectedCount > 0 ||
                            physicalProtectedCount > 0 ||
                            serviceProtectedCount > 0) &&
                          (cafeCount > 0 || storeCount > 0)
                            ? " • "
                            : ""}
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
                    <Link
                      href={publicUrl}
                      className="px-4 py-2.5 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 text-sm font-bold transition shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                    >
                      Profile
                    </Link>
                  ) : null}

                  <Link
                    href="/app/trading"
                    className="px-4 py-2.5 rounded-2xl text-sm font-extrabold text-black bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] shadow-[0_18px_60px_rgba(212,175,55,0.18)] ring-1 ring-black/15 hover:brightness-110 transition"
                  >
                    Trading →
                  </Link>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-7 gap-2.5">
                <StatChip label="Items" value={itemsCount} tone="gold" />
                <StatChip
                  label="Tab"
                  value={effectiveTab === "activity" ? "My Activity" : "NFTs"}
                />
                <StatChip
                  label="Protected"
                  value={effectiveTab === "nfts" ? protectedCount : "—"}
                />
                <StatChip
                  label="Physical"
                  value={effectiveTab === "nfts" ? physicalProtectedCount : "—"}
                />
                <StatChip
                  label="Services"
                  value={effectiveTab === "nfts" ? serviceProtectedCount : "—"}
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
        </div>

        <div
          className="reveal flex flex-wrap items-center gap-2"
          style={{ animationDelay: "60ms" }}
        >
          <Link
            href={tabHref(pageBase, "nfts")}
            className={cx(
              "px-4 py-2 rounded-2xl border text-[12px] font-bold transition",
              effectiveTab === "nfts"
                ? "border-white/15 bg-white/[0.10] text-white shadow-[0_18px_70px_rgba(0,0,0,0.24)]"
                : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"
            )}
          >
            NFTs
            <span className="ml-2 inline-flex items-center justify-center h-5 px-2 rounded-full text-[10px] font-bold text-white/75 bg-black/25 ring-1 ring-white/10">
              {itemsCount}
            </span>
          </Link>

          {isOwner ? (
            <Link
              href={tabHref(pageBase, "activity")}
              className={cx(
                "px-4 py-2 rounded-2xl border text-[12px] font-bold transition",
                effectiveTab === "activity"
                  ? "border-white/15 bg-white/[0.10] text-white shadow-[0_18px_70px_rgba(0,0,0,0.24)]"
                  : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"
              )}
            >
              My Activity
              <span className="ml-2 inline-flex items-center justify-center h-5 px-2 rounded-full text-[10px] font-bold text-black/80 bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15">
                NEW
              </span>
            </Link>
          ) : null}
        </div>

        {effectiveTab === "activity" ? (
          <div className="reveal mt-2" style={{ animationDelay: "90ms" }}>
            <ActivityPanel userKey={key} />
          </div>
        ) : (
          <>
            <GalleryGridClient items={enriched} isOwner={isOwner} />

            {enriched.length === 0 ? (
              <div className="reveal rounded-[22px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 text-center text-white/60">
                <div className="text-lg font-bold text-white/85">
                  This user doesn't own any NFTs yet.
                </div>

                {publicUrl ? (
                  <div className="mt-4">
                    <Link
                      href={publicUrl}
                      className="inline-flex items-center justify-center px-4 py-2.5 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 text-sm font-bold transition"
                    >
                      Back to profile
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}

        <footer className="reveal pt-3 text-[10px] font-bold text-white/20 text-center uppercase tracking-[0.4em]">
          Realife Ecosystem • Gallery
        </footer>
    </div>
  );
}
