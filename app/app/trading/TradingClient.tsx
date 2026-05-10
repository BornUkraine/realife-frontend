"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { formatUnits, parseUnits } from "viem";
import { useAccount } from "wagmi";
import ActivityPanel from "@/components/trading/ActivityPanel";
import NftMedia from "@/components/NftMedia";

type MarketType = "STANDARD" | "PROTECTED";

type FulfillmentType =
  | "PHYSICAL_GOOD"
  | "DIGITAL_SERVICE"
  | "ONLINE_SESSION"
  | "LOCAL_SERVICE";

type MarketView =
  | "all"
  | "cafe"
  | "store"
  | "publicStandard"
  | "publicProtected"
  | "publicDelivery";

type MarketListing = {
  id: string;
  chainId: number;
  contract: string;
  tokenId: string;
  standard: "ERC721" | "ERC1155";
  status: "ACTIVE" | "CANCELLED" | "SOLD_OUT";
  sellerWallet: string;
  seller?: { handle: string | null; publicId: string | null } | null;
  marketplaceListingId: string;
  pricePerUnitWei: string;
  amountTotal: string;
  amountRemaining: string;
  createdAt: string;

  marketType?: MarketType | null;
  suggestedMarketType?: MarketType | null;
  marketplaceContract?: string | null;

  deliveryEnabled?: boolean | null;
  physicalItemIncluded?: boolean | null;
  officialItem?: boolean | null;
  fulfillmentType?: string | null;
  category?: string | null;
  subcategory?: string | null;
  serviceCountry?: string | null;
  serviceCity?: string | null;
  serviceArea?: string | null;

  aiIndex?: {
    status?: string | null;
    visualText?: string | null;
    visualSummary?: string | null;
    detectedProduct?: string | null;
    detectedService?: string | null;
    detectedCategory?: string | null;
    detectedBrand?: string | null;
    detectedCountry?: string | null;
    detectedRegion?: string | null;
    detectedCity?: string | null;
    detectedArea?: string | null;
    searchTags?: string[] | null;
    confidence?: number | null;
    enrichedAt?: string | null;
  } | null;

  mint?: {
    name?: string | null;
    image?: string | null;
    tokenUri?: string | null;
    verified?: boolean;
    deliveryEnabled?: boolean | null;
    physicalItemIncluded?: boolean | null;
    officialItem?: boolean | null;
    fulfillmentType?: string | null;
    category?: string | null;
    subcategory?: string | null;
    suggestedMarketType?: MarketType | null;
    serviceCountry?: string | null;
    serviceCity?: string | null;
    serviceArea?: string | null;
  } | null;
};

type ProductMeta = {
  image?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  animation_url?: string | null;
  animationUrl?: string | null;
  animation?: string | null;
  name?: string | null;
  description?: string | null;
  project?: string | null;
  brand?: string | null;
  collection?: string | null;
  item?: string | null;
  rarity?: string | null;
  attributes?: Array<{ trait_type?: string; value?: string | number | null }>;
};

type EnrichedMarketListing = MarketListing & {
  metaImage?: string | null;
  metaDescription?: string | null;
  collection?: string | null;
  item?: string | null;
  rarity?: string | null;
  brand?: string | null;
  project?: string | null;
  mediaKind?: "image" | "video";
  mediaSrc?: string | null;
  mediaPoster?: string | null;
  resolvedMarketType: MarketType;
  protectedSubtype?: FulfillmentType | null;
  protectedSubtypeLabel?: string | null;
};

type PreviewState = {
  src: string;
  kind: "image" | "video";
  poster?: string | null;
  alt?: string;
} | null;

type TradingFilters = {
  q: string;
  category: string;
  subcategory: string;
  fulfillmentType: "" | FulfillmentType;
  serviceCountry: string;
  serviceCity: string;
  serviceArea: string;
  minPriceEth: string;
  maxPriceEth: string;
};

const EMPTY_FILTERS: TradingFilters = {
  q: "",
  category: "",
  subcategory: "",
  fulfillmentType: "",
  serviceCountry: "",
  serviceCity: "",
  serviceArea: "",
  minPriceEth: "",
  maxPriceEth: "",
};

const CATEGORY_OPTIONS = [
  "Art / Collectible",
  "Creative & Design",
  "Marketing",
  "AI & Automation",
  "Development & Tech",
  "Business & Professional Services",
  "Education & Coaching",
  "Health & Wellness",
  "Beauty & Personal Care",
  "Home & Repair",
  "Travel & Tours",
  "Events & Tickets",
  "Logistics & Delivery",
  "Clothing & Merch",
  "Accessories & Jewelry",
  "Electronics & Gadgets",
  "Home & Decor",
  "Food & Beverage",
  "Sports & Outdoor",
  "Automotive",
  "Pet Products & Services",
  "Collectible Product",
  "Other Product",
  "Other Service",
  "Other",
] as const;

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function shortAddr(addr?: string | null) {
  if (!addr) return "—";
  const s = String(addr);
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function normAddr(v?: string | null) {
  const x = String(v || "").trim();
  return x ? x.toLowerCase() : "";
}


function profileLabel(user: { handle?: string | null; publicId?: string | null } | null | undefined, wallet?: string | null) {
  const handle = String(user?.handle || "").trim();
  if (handle) return `@${handle}`;
  const publicId = String(user?.publicId || "").trim();
  if (publicId) return publicId;
  return shortAddr(wallet);
}

function normText(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function fmtEth(weiStr?: string | null) {
  try {
    if (!weiStr) return "—";
    const v = formatUnits(BigInt(weiStr), 18);
    const [a, b] = v.split(".");
    if (!b) return a;
    const bb = b.slice(0, 6).replace(/0+$/, "");
    return bb ? `${a}.${bb}` : a;
  } catch {
    return "—";
  }
}

function safeEthToWeiString(value: string) {
  const v = String(value || "").trim().replace(",", ".");
  if (!v) return null;
  if (!/^\d+(\.\d{1,18})?$/.test(v)) return null;

  try {
    return parseUnits(v, 18).toString();
  } catch {
    return null;
  }
}

function compactFilters(filters: TradingFilters) {
  return {
    q: filters.q.trim(),
    category: filters.category.trim(),
    subcategory: filters.subcategory.trim(),
    fulfillmentType: filters.fulfillmentType,
    serviceCountry: filters.serviceCountry.trim(),
    serviceCity: filters.serviceCity.trim(),
    serviceArea: filters.serviceArea.trim(),
    minPriceEth: filters.minPriceEth.trim(),
    maxPriceEth: filters.maxPriceEth.trim(),
  };
}

function marketLabel(mt?: MarketType | null) {
  return mt === "PROTECTED" ? "PROTECTED" : "STANDARD";
}

function normalizeMarketView(view?: MarketView): MarketView {
  if (
    view === "all" ||
    view === "cafe" ||
    view === "store" ||
    view === "publicStandard" ||
    view === "publicProtected" ||
    view === "publicDelivery"
  ) {
    return view;
  }
  return "all";
}

const PRIMARY_IPFS_ORIGIN = (
  process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://nftstorage.link"
).replace(/\/$/, "");

const IPFS_GATEWAYS = [
  `${PRIMARY_IPFS_ORIGIN}/ipfs/`,
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
] as const;

const PINATA_IPFS = "https://gateway.pinata.cloud/ipfs/";

const CAFE_CONTRACT = String(
  process.env.NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT || ""
)
  .trim()
  .toLowerCase();

const STORE_CONTRACT = String(
  process.env.NEXT_PUBLIC_REALIFE_STORE_CONTRACT || ""
)
  .trim()
  .toLowerCase();

const PUBLIC_STANDARD_CONTRACT = String(
  process.env.NEXT_PUBLIC_REALIFE_1155_NEW_CONTRACT || ""
)
  .trim()
  .toLowerCase();

const PUBLIC_DELIVERY_CONTRACT = String(
  process.env.NEXT_PUBLIC_REALIFE_1155_DELIVERY_CONTRACT || ""
)
  .trim()
  .toLowerCase();

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

function isLikelyVideoUrl(u?: string | null) {
  const s = String(u || "").toLowerCase();
  const clean = s.split("?")[0].split("#")[0];
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".mov") ||
    clean.endsWith(".m4v")
  );
}

async function fetchJSON(url: string) {
  // Server route is ISR-cached (revalidate: 30); browser cache is fine here.
  const r = await fetch(url, { cache: "default" });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j) throw new Error(j?.error || "fetch_failed");
  return j;
}

// Metadata resolution moved to the server (see /api/market/listings).
// Kept as a no-op stub so any lingering callers don't crash.
async function loadMetadata(
  _tokenUri?: string | null
): Promise<ProductMeta | null> {
  return null;
}

function getAttr(meta: ProductMeta | null, trait: string) {
  const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
  const found = attrs.find(
    (x) => String(x?.trait_type || "").toLowerCase() === trait.toLowerCase()
  );
  return found?.value != null ? String(found.value) : null;
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

function inferProtectedSubtype(input: {
  contract?: string | null;
  fulfillmentType?: string | null;
  deliveryEnabled?: boolean | null;
  physicalItemIncluded?: boolean | null;
  category?: string | null;
  subcategory?: string | null;
}): FulfillmentType | null {
  const ft = String(input.fulfillmentType || "").trim().toUpperCase();

  if (
    ft === "PHYSICAL_GOOD" ||
    ft === "DIGITAL_SERVICE" ||
    ft === "ONLINE_SESSION" ||
    ft === "LOCAL_SERVICE"
  ) {
    return ft as FulfillmentType;
  }

  const contract = normAddr(input.contract);

  if (PUBLIC_DELIVERY_CONTRACT && contract === PUBLIC_DELIVERY_CONTRACT) {
    return "PHYSICAL_GOOD";
  }

  if (input.deliveryEnabled || input.physicalItemIncluded) {
    return "PHYSICAL_GOOD";
  }

  const category = normText(input.category);
  const subcategory = normText(input.subcategory);
  const merged = [category, subcategory].filter(Boolean).join(" ");

  if (merged.includes("online session") || merged.includes("session")) {
    return "ONLINE_SESSION";
  }

  if (merged.includes("local service")) {
    return "LOCAL_SERVICE";
  }

  if (textLooksProtected(input.category, input.subcategory)) {
    return "DIGITAL_SERVICE";
  }

  return null;
}

function fulfillmentTypeLabel(v?: string | null) {
  const s = String(v || "").trim().toUpperCase();
  if (!s) return null;
  return s.replaceAll("_", " ");
}

function fulfillmentToneClass(v?: string | null) {
  const s = String(v || "").trim().toUpperCase();

  if (s === "PHYSICAL_GOOD") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
  }

  if (s === "ONLINE_SESSION") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  }

  if (s === "LOCAL_SERVICE") {
    return "border-sky-500/20 bg-sky-500/10 text-sky-100";
  }

  if (s === "DIGITAL_SERVICE") {
    return "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-100";
  }

  return "border-violet-500/20 bg-violet-500/10 text-violet-100";
}

function resolveRowMarketType(item: MarketListing): MarketType {
  const contract = normAddr(item.contract);

  if (CAFE_CONTRACT && contract === CAFE_CONTRACT) return "STANDARD";
  if (STORE_CONTRACT && contract === STORE_CONTRACT) return "STANDARD";
  if (PUBLIC_DELIVERY_CONTRACT && contract === PUBLIC_DELIVERY_CONTRACT) {
    return "PROTECTED";
  }

  if (item.marketType === "PROTECTED") return "PROTECTED";
  if (item.suggestedMarketType === "PROTECTED") return "PROTECTED";
  if (item.mint?.suggestedMarketType === "PROTECTED") return "PROTECTED";

  return "STANDARD";
}

function getMarketViewConfig(view: MarketView) {
  switch (view) {
    case "cafe":
      return {
        label: "Realife Cafe NFT",
        title: "Realife Cafe NFT Trading",
        subtitle:
          "Secondary NFT trading page for Realife Cafe NFTs that were bought through the official cafe flow and later listed by holders.",
        contract: CAFE_CONTRACT || null,
        marketType: null as MarketType | null,
        fulfillmentGroup: null as "product" | "service" | "standard" | null,
      };

    case "store":
      return {
        label: "Realife Store NFT",
        title: "Realife Store NFT Trading",
        subtitle:
          "Secondary NFT trading page for official Realife Store NFTs later listed by holders.",
        contract: STORE_CONTRACT || null,
        marketType: null as MarketType | null,
        fulfillmentGroup: null as "product" | "service" | "standard" | null,
      };

    case "publicProtected":
      return {
        label: "Service • Protected",
        title: "Service Protected NFT Trading",
        subtitle:
          "Service NFTs minted through the standard public mint contract and listed through the PROTECTED escrow flow. This view is for digital services, online sessions and local/offline services.",
        contract: PUBLIC_STANDARD_CONTRACT || null,
        marketType: "PROTECTED" as MarketType,
        fulfillmentGroup: "service" as "product" | "service" | "standard" | null,
      };

    case "publicDelivery":
      return {
        label: "Products • Protected",
        title: "Products Protected NFT Trading",
        subtitle:
          "Product NFTs minted through the unified public mint contract and listed through the PROTECTED escrow flow for physical goods, delivery, fulfillment and buyer confirmation.",
        contract: PUBLIC_STANDARD_CONTRACT || null,
        marketType: "PROTECTED" as MarketType,
        fulfillmentGroup: "product" as "product" | "service" | "standard" | null,
      };

    case "publicStandard":
      return {
        label: "Public Mint • Standard",
        title: "Public Standard NFT Trading",
        subtitle:
          "User-created NFTs minted through the standard public mint contract and listed in the STANDARD market flow without protected escrow or delivery flow.",
        contract: PUBLIC_STANDARD_CONTRACT || null,
        marketType: "STANDARD" as MarketType,
        fulfillmentGroup: "standard" as "product" | "service" | "standard" | null,
      };

    case "all":
    default:
      return {
        label: "All Trading NFTs",
        title: "NFT Trading",
        subtitle:
          "All verified Realife NFTs available for secondary trading, with the main focus on Service Protected, Products Protected and Public Standard flows before Cafe and Store resale.",
        contract: null,
        marketType: null as MarketType | null,
        fulfillmentGroup: null as "product" | "service" | "standard" | null,
      };
  }
}

function getMarketViewNote(view: MarketView) {
  switch (view) {
    case "cafe":
      return {
        tone: "border-amber-500/20 bg-amber-500/10 text-amber-100",
        text:
          "This page shows secondary NFT trading of Realife Cafe NFTs. It is trading only. Drink, food, merch, or official redemption is not automatically guaranteed for secondary buyers.",
      };

    case "store":
      return {
        tone: "border-sky-500/20 bg-sky-500/10 text-sky-100",
        text:
          "This page shows secondary NFT trading of Realife Store NFTs. Some NFTs may originally come from official store items with delivery in the primary flow, but secondary trading for store NFTs remains STANDARD only. Secondary buyers do not get automatic delivery through trading. For official purchase with delivery, use Real Marketing.",
      };

    case "publicProtected":
      return {
        tone: "border-violet-500/20 bg-violet-500/10 text-violet-100",
        text:
          "Service Protected shows NFTs from the standard public mint contract listed through the PROTECTED escrow flow. This is the main service direction for digital services, online sessions and local/offline services with buyer confirmation.",
      };

    case "publicDelivery":
      return {
        tone: "border-amber-500/20 bg-amber-500/10 text-amber-100",
        text:
          "Products Protected shows NFTs from the unified public mint contract listed through the PROTECTED escrow flow. This is the main product direction for physical goods, delivery, fulfillment and buyer confirmation.",
      };

    case "publicStandard":
      return {
        tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
        text:
          "Public Standard shows NFTs from the standard public mint contract listed through the STANDARD market flow, without protected escrow and without delivery flow.",
      };

    default:
      return null;
  }
}

function viewBadgeClass(view: MarketView) {
  switch (view) {
    case "cafe":
      return "text-black bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.18)]";
    case "store":
      return "text-sky-100 border border-sky-500/20 bg-sky-500/10 ring-sky-500/10";
    case "publicStandard":
      return "text-emerald-100 border border-emerald-500/20 bg-emerald-500/10 ring-emerald-500/10";
    case "publicProtected":
      return "text-violet-100 border border-violet-500/20 bg-violet-500/10 ring-violet-500/10";
    case "publicDelivery":
      return "text-amber-100 border border-amber-500/20 bg-amber-500/10 ring-amber-500/10";
    case "all":
    default:
      return "text-white/80 border border-white/10 bg-white/[0.06] ring-white/10";
  }
}

export default function TradingClient({
  viewerKey,
  viewerWallet,
  initialMarketView = "all",
  lockMarketView = false,
}: {
  viewerKey: string | null;
  viewerWallet: string | null;
  initialMarketView?: MarketView;
  lockMarketView?: boolean;
}) {
  const { address } = useAccount();
  const { data: liveSession } = useSession();

  const liveSessionUser = ((liveSession as any)?.user || {}) as any;

  const liveSessionWallet =
    (liveSessionUser?.walletAddress as string | undefined) ||
    ((liveSession as any)?.walletAddress as string | undefined) ||
    null;

  const activeViewerKey =
    (liveSessionUser?.handle as string | undefined) ||
    (liveSessionUser?.publicId as string | undefined) ||
    ((liveSession as any)?.handle as string | undefined) ||
    ((liveSession as any)?.publicId as string | undefined) ||
    viewerKey ||
    null;

  const activeWalletRaw = address || liveSessionWallet || viewerWallet || null;
  const wallet = useMemo(() => normAddr(activeWalletRaw), [activeWalletRaw]);

  const liveWalletKind = String(liveSessionUser?.walletKind || "").toUpperCase();
  const liveEmbeddedProvider = String(
    liveSessionUser?.embeddedWalletProvider || ""
  ).toUpperCase();

  const activeWalletLabel = address
    ? "connected wallet"
    : liveWalletKind === "EMBEDDED" || liveEmbeddedProvider
    ? liveEmbeddedProvider === "WEB3AUTH"
      ? "Google / Web3Auth"
      : "Google embedded wallet"
    : activeWalletRaw
    ? "session wallet"
    : null;

  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"market" | "my">("market");
  const [marketView, setMarketView] = useState<MarketView>(
    normalizeMarketView(initialMarketView)
  );

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<EnrichedMarketListing[]>([]);
  const [skip, setSkip] = useState(0);
  const take = 24;

  const [filters, setFilters] = useState<TradingFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<"new" | "priceAsc" | "priceDesc">("new");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMarketView(normalizeMarketView(initialMarketView));
  }, [initialMarketView]);

  useEffect(() => {
    if (!preview) return;

    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;

    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;
    const prevHtmlOverflow = html.style.overflow;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    html.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreview(null);
    };

    window.addEventListener("keydown", onKey);

    return () => {
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      html.style.overflow = prevHtmlOverflow;

      window.removeEventListener("keydown", onKey);

      requestAnimationFrame(() => {
        window.scrollTo({
          top: scrollY,
          left: 0,
          behavior: "auto",
        });
      });
    };
  }, [preview]);

  const marketCfg = useMemo(() => getMarketViewConfig(marketView), [marketView]);
  const marketNote = useMemo(() => getMarketViewNote(marketView), [marketView]);

  const filtered = useMemo(() => {
    const qq = filters.q.trim().toLowerCase();
    let out = rows;

    if (qq) {
      out = out.filter((x) => {
        const name = String(x.mint?.name || "").toLowerCase();
        const seller = String(x.sellerWallet || "").toLowerCase();
        const tokenId = String(x.tokenId || "");
        const collection = String(x.collection || "").toLowerCase();
        const item = String(x.item || "").toLowerCase();
        const rarity = String(x.rarity || "").toLowerCase();
        const market = String(x.resolvedMarketType || "").toLowerCase();
        const brand = String(x.brand || "").toLowerCase();
        const project = String(x.project || "").toLowerCase();
        const contract = String(x.contract || "").toLowerCase();
        const fulfillmentType = String(x.fulfillmentType || "").toLowerCase();
        const category = String(x.category || "").toLowerCase();
        const subcategory = String(x.subcategory || "").toLowerCase();
        const protectedSubtype = String(x.protectedSubtypeLabel || "").toLowerCase();
        const aiVisualText = String(x.aiIndex?.visualText || "").toLowerCase();
        const aiVisualSummary = String(x.aiIndex?.visualSummary || "").toLowerCase();
        const aiProduct = String(x.aiIndex?.detectedProduct || "").toLowerCase();
        const aiService = String(x.aiIndex?.detectedService || "").toLowerCase();
        const aiCategory = String(x.aiIndex?.detectedCategory || "").toLowerCase();
        const aiBrand = String(x.aiIndex?.detectedBrand || "").toLowerCase();
        const aiCountry = String(x.aiIndex?.detectedCountry || "").toLowerCase();
        const aiRegion = String(x.aiIndex?.detectedRegion || "").toLowerCase();
        const aiCity = String(x.aiIndex?.detectedCity || "").toLowerCase();
        const aiArea = String(x.aiIndex?.detectedArea || "").toLowerCase();
        const aiTags = Array.isArray(x.aiIndex?.searchTags)
          ? x.aiIndex.searchTags.join(" ").toLowerCase()
          : "";

        return (
          name.includes(qq) ||
          seller.includes(qq) ||
          tokenId.includes(qq) ||
          collection.includes(qq) ||
          item.includes(qq) ||
          rarity.includes(qq) ||
          brand.includes(qq) ||
          project.includes(qq) ||
          market.includes(qq) ||
          contract.includes(qq) ||
          fulfillmentType.includes(qq) ||
          category.includes(qq) ||
          subcategory.includes(qq) ||
          protectedSubtype.includes(qq) ||
          aiVisualText.includes(qq) ||
          aiVisualSummary.includes(qq) ||
          aiProduct.includes(qq) ||
          aiService.includes(qq) ||
          aiCategory.includes(qq) ||
          aiBrand.includes(qq) ||
          aiCountry.includes(qq) ||
          aiRegion.includes(qq) ||
          aiCity.includes(qq) ||
          aiArea.includes(qq) ||
          aiTags.includes(qq)
        );
      });
    }

    if (sort === "priceAsc") {
      out = [...out].sort((a, b) => {
        const aa = BigInt(a.pricePerUnitWei || "0");
        const bb = BigInt(b.pricePerUnitWei || "0");
        return aa < bb ? -1 : aa > bb ? 1 : 0;
      });
    } else if (sort === "priceDesc") {
      out = [...out].sort((a, b) => {
        const aa = BigInt(a.pricePerUnitWei || "0");
        const bb = BigInt(b.pricePerUnitWei || "0");
        return aa > bb ? -1 : aa < bb ? 1 : 0;
      });
    }

    return out;
  }, [rows, filters.q, sort]);

  const myRows = useMemo(() => {
    if (!wallet) return [];
    return filtered.filter((x) => normAddr(x.sellerWallet) === wallet);
  }, [filtered, wallet]);

  async function loadPage(
    nextSkip: number,
    append: boolean,
    view: MarketView = marketView,
    filterOverride?: TradingFilters
  ) {
    setErr(null);
    setLoading(true);

    try {
      const cfg = getMarketViewConfig(view);

      if (
        (view === "cafe" ||
          view === "store" ||
          view === "publicProtected" ||
          view === "publicDelivery" ||
          view === "publicStandard") &&
        !cfg.contract
      ) {
        setRows([]);
        setTotal(0);
        setSkip(0);
        setErr(`Missing contract env for ${cfg.label}`);
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.set("status", "ACTIVE");
      params.set("take", String(take));
      params.set("skip", String(nextSkip));

      if (cfg.contract) {
        params.set("contract", cfg.contract);
      }

      if (cfg.marketType) {
        params.set("marketType", cfg.marketType);
      }

      if (cfg.fulfillmentGroup) {
        params.set("fulfillmentGroup", cfg.fulfillmentGroup);
      }

      const activeFilters = compactFilters(filterOverride || filters);

      if (activeFilters.q) params.set("q", activeFilters.q);
      if (activeFilters.category) params.set("category", activeFilters.category);
      if (activeFilters.subcategory) {
        params.set("subcategory", activeFilters.subcategory);
      }
      if (activeFilters.fulfillmentType) {
        params.set("fulfillmentType", activeFilters.fulfillmentType);
      }
      if (activeFilters.serviceCountry) {
        params.set("serviceCountry", activeFilters.serviceCountry);
      }
      if (activeFilters.serviceCity) {
        params.set("serviceCity", activeFilters.serviceCity);
      }
      if (activeFilters.serviceArea) {
        params.set("serviceArea", activeFilters.serviceArea);
      }

      const minWei = safeEthToWeiString(activeFilters.minPriceEth);
      const maxWei = safeEthToWeiString(activeFilters.maxPriceEth);
      if (minWei) params.set("minPriceWei", minWei);
      if (maxWei) params.set("maxPriceWei", maxWei);

      params.set("sort", sort);

      const url = `/api/market/listings?${params.toString()}`;
      const j = await fetchJSON(url);

      const items = (j?.listings || []) as Array<
        MarketListing & {
          media?: {
            kind?: "image" | "video" | null;
            src?: string | null;
            poster?: string | null;
            image?: string | null;
          } | null;
          metaCollection?: string | null;
          metaItem?: string | null;
          metaRarity?: string | null;
          metaBrand?: string | null;
          metaProject?: string | null;
          metaDescription?: string | null;
          aiIndex?: MarketListing["aiIndex"];
        }
      >;
      const t = Number(j?.total || 0);

      // Server resolved IPFS metadata — no client IPFS fetching anymore.
      const enriched: EnrichedMarketListing[] = items.map((item) => {
        const media = item.media || null;
        const mediaKind: "image" | "video" =
          media?.kind === "video" ? "video" : "image";

        const imgHttp =
          media?.image || ipfsToHttp(item.mint?.image || null) || null;

        const mediaSrc =
          mediaKind === "video"
            ? media?.src || null
            : media?.image || imgHttp || null;

        const mediaPoster =
          mediaKind === "video" ? media?.poster || imgHttp || null : null;

        const resolvedMarketType = resolveRowMarketType(item);

        const protectedSubtype =
          resolvedMarketType === "PROTECTED"
            ? inferProtectedSubtype({
                contract: item.contract,
                fulfillmentType:
                  item.fulfillmentType || item.mint?.fulfillmentType || null,
                deliveryEnabled:
                  item.deliveryEnabled ?? item.mint?.deliveryEnabled ?? null,
                physicalItemIncluded:
                  item.physicalItemIncluded ??
                  item.mint?.physicalItemIncluded ??
                  null,
                category: item.category || item.mint?.category || null,
                subcategory:
                  item.subcategory || item.mint?.subcategory || null,
              })
            : null;

        const protectedSubtypeLabel = fulfillmentTypeLabel(protectedSubtype);

        return {
          ...item,
          metaImage: imgHttp,
          metaDescription: item.metaDescription || null,
          collection: item.metaCollection || null,
          item: item.metaItem || null,
          rarity: item.metaRarity || null,
          brand: item.metaBrand || null,
          project: item.metaProject || null,
          mediaKind,
          mediaSrc,
          mediaPoster,
          resolvedMarketType,
          protectedSubtype,
          protectedSubtypeLabel,
        } satisfies EnrichedMarketListing;
      });

      setTotal(t);
      setSkip(nextSkip);
      setRows((prev) => (append ? [...prev, ...enriched] : enriched));
    } catch (e: any) {
      setErr(e?.message || "Failed to load NFT trading");
    } finally {
      setLoading(false);
    }
  }

  async function applyFilters(nextFilters: TradingFilters = filters) {
    setAiNote(null);
    await loadPage(0, false, marketView, nextFilters);
  }

  async function runAiSearch() {
    const query = filters.q.trim();
    if (!query) {
      setAiNote(
        "Write what you want to find first, for example: fitness in Los Angeles, delivery products, website services."
      );
      return;
    }

    setAiLoading(true);
    setAiNote(null);

    try {
      const r = await fetch("/api/ai/trading-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, marketView }),
      });

      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) {
        throw new Error(j?.error || "AI search failed");
      }

      const f = j.filters || {};
      const nextFilters: TradingFilters = {
        q: String(f.q || filters.q || ""),
        category: String(f.category || ""),
        subcategory: String(f.subcategory || ""),
        fulfillmentType:
          f.fulfillmentType === "PHYSICAL_GOOD" ||
          f.fulfillmentType === "DIGITAL_SERVICE" ||
          f.fulfillmentType === "ONLINE_SESSION" ||
          f.fulfillmentType === "LOCAL_SERVICE"
            ? f.fulfillmentType
            : "",
        serviceCountry: String(f.serviceCountry || ""),
        serviceCity: String(f.serviceCity || ""),
        serviceArea: String(f.serviceArea || ""),
        minPriceEth: filters.minPriceEth,
        maxPriceEth: filters.maxPriceEth,
      };

      setFilters(nextFilters);

      if (f.sort === "new" || f.sort === "priceAsc" || f.sort === "priceDesc") {
        setSort(f.sort);
      }

      setAiNote(
        j.explanation || "AI converted your request into Realife trading filters."
      );

      await loadPage(0, false, marketView, nextFilters);
    } catch (e: any) {
      setAiNote(e?.message || "AI search failed");
    } finally {
      setAiLoading(false);
    }
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setAiNote(null);
    loadPage(0, false, marketView, EMPTY_FILTERS);
  }

  useEffect(() => {
    if (tab !== "market") return;
    loadPage(0, false, marketView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketView, tab, sort]);

  const canLoadMore = rows.length < total;

  const goldWrap =
    "rounded-[34px] p-px overflow-hidden bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))] shadow-[0_34px_130px_rgba(0,0,0,0.60)]";
  const goldCard =
    "rounded-[34px] overflow-hidden border border-white/10 bg-[#0b0a09]/30 backdrop-blur-2xl ring-1 ring-black/10";

  const previewModal =
    mounted && preview
      ? createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-sm"
            onClick={() => setPreview(null)}
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPreview(null);
              }}
              aria-label="Close"
              className="absolute right-4 top-4 z-[100000] inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-black/50 text-white backdrop-blur-md shadow-[0_10px_35px_rgba(0,0,0,0.35)] transition hover:scale-[1.04] hover:bg-black/70"
            >
              <span className="text-xl leading-none">✕</span>
            </button>

            <div className="absolute inset-x-0 top-0 z-[100000] pointer-events-none">
              <div className="mx-auto max-w-6xl px-5 pt-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[11px] font-bold text-white/70 backdrop-blur-md shadow-[0_10px_35px_rgba(0,0,0,0.25)]">
                  <span>Fullscreen Preview</span>
                  <span className="text-white/30">•</span>
                  <span
                    className={
                      preview.kind === "video" ? "text-amber-100" : "text-white/75"
                    }
                  >
                    {preview.kind === "video" ? "VIDEO" : "IMAGE"}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="flex h-full w-full items-center justify-center p-4 sm:p-6 md:p-10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <div className="relative flex h-full w-full items-center justify-center">
                <NftMedia
                  src={preview.src}
                  kind={preview.kind}
                  alt={preview.alt || "NFT"}
                  poster={preview.kind === "video" ? preview.poster || null : null}
                  className="h-full w-full"
                  roundedClass="rounded-none"
                  showControls={true}
                  fit="contain"
                  mediaBgClass="bg-black"
                />
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className="space-y-6">
        <div className={goldWrap}>
          <div className={cx(goldCard, "p-4 md:p-5")}>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setTab("market")}
                className={cx(
                  "rounded-2xl border px-4 py-2 text-[12px] font-black transition",
                  tab === "market"
                    ? "border-white/15 bg-white/[0.10] text-white"
                    : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                )}
              >
                NFT Trading
                <span className="ml-2 inline-flex h-5 items-center justify-center rounded-full bg-black/25 px-2 text-[10px] font-black text-white/80 ring-1 ring-white/10">
                  {tab === "market" ? total : "ALL"}
                </span>
              </button>

              <button
                onClick={() => setTab("my")}
                className={cx(
                  "rounded-2xl border px-4 py-2 text-[12px] font-black transition",
                  tab === "my"
                    ? "border-white/15 bg-white/[0.10] text-white"
                    : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                )}
              >
                My Activity
                <span className="ml-2 inline-flex h-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-2 text-[10px] font-black text-black/80 ring-1 ring-black/15">
                  NEW
                </span>
              </button>

              <div className="flex-1" />

              {lockMarketView ? (
                <Link
                  href="/app/trading"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-2 text-[12px] font-black text-white/85 transition hover:bg-white/[0.10]"
                >
                  All collections
                </Link>
              ) : null}

              {tab === "market" ? (
                <button
                  onClick={() => loadPage(0, false, marketView)}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-2 text-[12px] font-black text-amber-100/90 transition hover:bg-white/[0.10] hover:text-amber-100"
                >
                  Refresh
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {tab === "my" ? (
          <div className={goldWrap}>
            <div className={cx(goldCard, "p-6 md:p-7")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/45">
                    My Activity
                  </div>
                  <div className="mt-2 text-xl font-black tracking-tight text-white/90 md:text-2xl">
                    Listings • Purchases • Sales
                  </div>
                  <div className="mt-2 text-[12px] text-white/55">
                    {activeWalletRaw ? (
                      <>
                        Wallet:{" "}
                        <span className="font-mono text-white/80">
                          {shortAddr(activeWalletRaw)}
                        </span>
                        {activeWalletLabel ? (
                          <span className="text-white/35"> ({activeWalletLabel})</span>
                        ) : null}
                      </>
                    ) : (
                      <>Connect wallet or continue with Google to see personal activity.</>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                {activeViewerKey ? (
                  <ActivityPanel userKey={activeViewerKey} />
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-[12px] text-white/60">
                    No public key found (handle/publicId). Create it in profile
                    settings and reload.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className={goldWrap}>
              <div className={cx(goldCard, "p-6 md:p-7")}>
                {!lockMarketView ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {(
                      [
                        ["all", "All Trading NFTs"],
                        ["publicProtected", "Service • Protected"],
                        ["publicDelivery", "Products • Protected"],
                        ["publicStandard", "Public Mint • Standard"],
                        ["cafe", "Realife Cafe NFT"],
                        ["store", "Realife Store NFT"],
                      ] as Array<[MarketView, string]>
                    ).map(([viewKey, label]) => {
                      const cfg = getMarketViewConfig(viewKey);
                      const disabled =
                        (viewKey === "cafe" ||
                          viewKey === "store" ||
                          viewKey === "publicProtected" ||
                          viewKey === "publicDelivery" ||
                          viewKey === "publicStandard") &&
                        !cfg.contract;

                      return (
                        <button
                          key={viewKey}
                          onClick={() => {
                            if (disabled) return;
                            setMarketView(viewKey);
                            setTab("market");
                          }}
                          disabled={disabled}
                          className={cx(
                            "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-[12px] font-black transition ring-1",
                            marketView === viewKey
                              ? viewBadgeClass(viewKey)
                              : "border border-white/10 bg-white/[0.04] text-white/75 ring-white/10 hover:bg-white/[0.08]",
                            disabled
                              ? "cursor-not-allowed opacity-45 hover:bg-white/[0.04]"
                              : ""
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <div
                  className={cx(
                    "flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
                    !lockMarketView ? "mt-5" : ""
                  )}
                >
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">
                      {lockMarketView
                        ? "Premium NFT collection view"
                        : "Premium NFT trading view"}
                    </div>
                    <div className="mt-2 text-xl font-black tracking-tight text-white/90 md:text-2xl">
                      {marketCfg.title}
                    </div>
                    <div className="mt-2 max-w-3xl text-[13px] text-white/55">
                      {marketCfg.subtitle}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div
                      className={cx(
                        "rounded-2xl px-3 py-2 text-[11px] font-black ring-1",
                        viewBadgeClass(marketView)
                      )}
                    >
                      {marketCfg.label}
                    </div>

                    {marketCfg.contract ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-black text-white/80">
                        {shortAddr(marketCfg.contract)}
                      </div>
                    ) : null}

                    {marketCfg.marketType ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-black text-white/80">
                        {marketCfg.marketType}
                      </div>
                    ) : null}
                  </div>
                </div>

                {marketNote ? (
                  <div
                    className={cx(
                      "mt-5 rounded-2xl border p-4 text-[12px] leading-relaxed",
                      marketNote.tone
                    )}
                  >
                    {marketNote.text}
                    {(marketView === "store" || marketView === "cafe") && (
                      <div className="mt-3">
                        <Link
                          href="/app/real-marketing"
                          className="inline-flex items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] px-4 py-2 text-[12px] font-black text-white/90 transition hover:bg-white/[0.10]"
                        >
                          Go to Real Marketing →
                        </Link>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                      Loaded
                    </div>
                    <div className="mt-1 text-lg font-black text-white/90">
                      {rows.length}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                      Total
                    </div>
                    <div className="mt-1 text-lg font-black text-white/90">
                      {total}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                      My listings
                    </div>
                    <div className="mt-1 text-lg font-black text-amber-100">
                      {myRows.length}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                      View
                    </div>
                    <div className="mt-1 text-lg font-black text-emerald-200">
                      {marketCfg.label}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={goldWrap}>
              <div className={cx(goldCard, "p-6 md:p-7")}>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[220px] flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                      Search • {marketCfg.title}
                    </div>
                    <input
                      value={filters.q}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, q: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") applyFilters();
                      }}
                      placeholder="AI/search: fitness service in Los Angeles, delivery products, website service, pineapple Spain…"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/90 outline-none focus:border-white/20"
                    />
                    <div className="mt-2 text-[11px] leading-relaxed text-white/35">
                      Searches metadata + AI visual index from any NFT contract: standard mint, delivery mint, cafe, store, images, posters and visible text.
                    </div>
                  </div>

                  <div className="min-w-[220px]">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                      AI Search
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={runAiSearch}
                        disabled={aiLoading}
                        className={cx(
                          "flex-1 rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-4 py-3 text-[12px] font-black text-black ring-1 ring-black/15 transition hover:brightness-110",
                          aiLoading ? "cursor-not-allowed opacity-60" : ""
                        )}
                      >
                        {aiLoading ? "AI…" : "AI find"}
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFilters()}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[12px] font-black text-white/85 transition hover:bg-white/[0.08]"
                      >
                        Search
                      </button>
                    </div>
                  </div>

                  <div className="min-w-[220px]">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                      Type
                    </div>
                    <select
                      value={filters.fulfillmentType}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          fulfillmentType: e.target.value as "" | FulfillmentType,
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/90 outline-none focus:border-white/20"
                    >
                      <option value="">All types</option>
                      <option value="PHYSICAL_GOOD">Physical good</option>
                      <option value="DIGITAL_SERVICE">Digital service</option>
                      <option value="ONLINE_SESSION">Online session</option>
                      <option value="LOCAL_SERVICE">Local service</option>
                    </select>
                  </div>

                  <div className="min-w-[220px]">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                      Category
                    </div>
                    <select
                      value={filters.category}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, category: e.target.value }))
                      }
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/90 outline-none focus:border-white/20"
                    >
                      <option value="">All categories</option>
                      {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-[220px]">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                      Sort
                    </div>
                    <select
                      value={sort}
                      onChange={(e) =>
                        setSort(e.target.value as "new" | "priceAsc" | "priceDesc")
                      }
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/90 outline-none focus:border-white/20"
                    >
                      <option value="new">Newest</option>
                      <option value="priceAsc">Price: Low → High</option>
                      <option value="priceDesc">Price: High → Low</option>
                    </select>
                  </div>

                  <div className="min-w-[220px]">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                      Quick
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={clearFilters}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[12px] font-black text-white/80 transition hover:bg-white/[0.08]"
                      >
                        Clear filters
                      </button>

                      {wallet ? (
                        <button
                          onClick={() => {
                            const nextFilters = { ...EMPTY_FILTERS, q: wallet };
                            setFilters(nextFilters);
                            loadPage(0, false, marketView, nextFilters);
                          }}
                          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[12px] font-black text-amber-100/90 transition hover:bg-white/[0.08] hover:text-amber-100"
                        >
                          My listings
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-5">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                      Subcategory
                    </div>
                    <input
                      value={filters.subcategory}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, subcategory: e.target.value }))
                      }
                      placeholder="fitness, repair, web design…"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/90 outline-none focus:border-white/20"
                    />
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                      Country / visual text
                    </div>
                    <input
                      value={filters.serviceCountry}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          serviceCountry: e.target.value,
                        }))
                      }
                      placeholder="Spain, USA, Ukraine, Andalusia…"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/90 outline-none focus:border-white/20"
                    />
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                      City
                    </div>
                    <input
                      value={filters.serviceCity}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, serviceCity: e.target.value }))
                      }
                      placeholder="Los Angeles, Kyiv…"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/90 outline-none focus:border-white/20"
                    />
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                      Min ETH
                    </div>
                    <input
                      value={filters.minPriceEth}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, minPriceEth: e.target.value }))
                      }
                      placeholder="0.001"
                      inputMode="decimal"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/90 outline-none focus:border-white/20"
                    />
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                      Max ETH
                    </div>
                    <input
                      value={filters.maxPriceEth}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, maxPriceEth: e.target.value }))
                      }
                      placeholder="0.1"
                      inputMode="decimal"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/90 outline-none focus:border-white/20"
                    />
                  </div>
                </div>

                {aiNote ? (
                  <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-[12px] text-amber-100">
                    {aiNote}
                  </div>
                ) : null}

                {err ? (
                  <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-[12px] text-rose-100">
                    {err}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {(loading && rows.length === 0 ? Array.from({ length: 8 }) : filtered).map(
                (x: any, idx: number) => {
                  const isSkeleton =
                    !x || typeof x !== "object" || !x.marketplaceListingId;

                  if (isSkeleton) {
                    return (
                      <div
                        key={`sk_${idx}`}
                        className={cx(
                          "overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04]",
                          "backdrop-blur-xl shadow-[0_24px_90px_rgba(0,0,0,0.55)]"
                        )}
                      >
                        <div className="aspect-square w-full animate-pulse bg-white/[0.03]" />
                        <div className="space-y-3 p-5">
                          <div className="h-4 w-3/4 animate-pulse rounded-lg bg-white/[0.06]" />
                          <div className="h-3 w-1/2 animate-pulse rounded-lg bg-white/[0.06]" />
                          <div className="h-10 w-full animate-pulse rounded-2xl bg-white/[0.06]" />
                        </div>
                      </div>
                    );
                  }

                  const href = `/nft/${x.chainId}/${normAddr(
                    x.contract
                  )}/${encodeURIComponent(String(x.tokenId))}`;

                  const isMine = Boolean(wallet && normAddr(x.sellerWallet) === wallet);
                  const sellerLabel = profileLabel(x.seller, x.sellerWallet);

                  const contractLc = normAddr(x.contract);
                  const isCafe =
                    Boolean(CAFE_CONTRACT) && contractLc === CAFE_CONTRACT;
                  const isStore =
                    Boolean(STORE_CONTRACT) && contractLc === STORE_CONTRACT;
                  const isPublicStandardContract =
                    Boolean(PUBLIC_STANDARD_CONTRACT) &&
                    contractLc === PUBLIC_STANDARD_CONTRACT;
                  const isPublicDeliveryContract =
                    Boolean(PUBLIC_DELIVERY_CONTRACT) &&
                    contractLc === PUBLIC_DELIVERY_CONTRACT;

                  const rowMarketType: MarketType = x.resolvedMarketType;
                  const isProtected = rowMarketType === "PROTECTED";
                  const rowFulfillmentType = String(
                    x.fulfillmentType || x.mint?.fulfillmentType || ""
                  ).toUpperCase();
                  const isProductProtected =
                    isProtected &&
                    (rowFulfillmentType === "PHYSICAL_GOOD" ||
                      Boolean(x.deliveryEnabled || x.mint?.deliveryEnabled) ||
                      Boolean(
                        x.physicalItemIncluded || x.mint?.physicalItemIncluded
                      ));

                  const showTradingOnlyBadge = isStore || isCafe;
                  const showNoDeliveryBadge = isStore;
                  const showNoRedemptionBadge = isCafe;
                  const showProtectedBadge = isProtected;
                  const showDeliveryContractBadge = isPublicDeliveryContract;
                  const showProtectedSubtypeBadge =
                    isProtected && Boolean(x.protectedSubtypeLabel);

                  const topLabel = isCafe
                    ? x.collection || "CAFE"
                    : isStore
                    ? x.collection || "STORE"
                    : isProductProtected
                    ? "PRODUCTS PROTECTED"
                    : isProtected && isPublicStandardContract
                    ? "SERVICE PROTECTED"
                    : isProtected
                    ? "PROTECTED"
                    : isPublicStandardContract
                    ? "PUBLIC STANDARD"
                    : "TRADING";

                  const topLabelClass = isCafe
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
                    : isStore
                    ? "border-sky-500/20 bg-sky-500/10 text-sky-100"
                    : isProductProtected
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
                    : isProtected
                    ? "border-violet-500/20 bg-violet-500/10 text-violet-100"
                    : isPublicStandardContract
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
                    : "border-white/10 bg-black/40 text-white/85";

                  const cardPreviewSrc =
                    x.mediaSrc ||
                    x.metaImage ||
                    ipfsToHttp(x?.mint?.image || null) ||
                    null;

                  const cardPoster =
                    x.mediaKind === "video"
                      ? x.mediaPoster ||
                        x.metaImage ||
                        ipfsToHttp(x?.mint?.image || null)
                      : null;

                  const mediaKind: "image" | "video" =
                    x.mediaKind === "video" ? "video" : "image";

                  return (
                    <Link
                      key={x.id}
                      href={href}
                      className={cx(
                        "group overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl",
                        "shadow-[0_24px_90px_rgba(0,0,0,0.55)] transition-all duration-300",
                        "hover:-translate-y-1 hover:bg-white/[0.08]"
                      )}
                    >
                      <div className="relative aspect-square w-full bg-black">
                        <NftMedia
                          src={cardPreviewSrc}
                          kind={mediaKind}
                          alt={x.mint?.name || "NFT"}
                          poster={mediaKind === "video" ? cardPoster : null}
                          showControls={false}
                          fit="contain"
                          className="h-full w-full"
                          roundedClass="rounded-none"
                          mediaBgClass="bg-black"
                        />

                        <div className="absolute left-3 top-3 z-20 flex max-w-[78%] flex-col gap-2">
                          {x.mediaKind === "video" ? (
                            <div className="w-fit rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-bold text-amber-100 backdrop-blur-md">
                              VIDEO
                            </div>
                          ) : null}

                          {x.aiIndex?.status === "DONE" ? (
                            <div className="w-fit rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-2 py-1 text-[10px] font-bold text-fuchsia-100 backdrop-blur-md">
                              AI INDEX
                            </div>
                          ) : null}

                          <div
                            className={cx(
                              "w-fit rounded-full border px-2 py-1 text-[10px] font-bold backdrop-blur-md",
                              topLabelClass
                            )}
                          >
                            {topLabel}
                          </div>

                          <div className="w-fit rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-bold text-white/75 backdrop-blur-md">
                            {marketLabel(rowMarketType)}
                          </div>

                          {showProtectedSubtypeBadge ? (
                            <div
                              className={cx(
                                "w-fit rounded-full border px-2 py-1 text-[10px] font-bold backdrop-blur-md",
                                fulfillmentToneClass(x.protectedSubtype)
                              )}
                            >
                              {x.protectedSubtypeLabel}
                            </div>
                          ) : null}

                          {isMine ? (
                            <div className="w-fit rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-bold text-amber-100 backdrop-blur-md">
                              YOUR LISTING
                            </div>
                          ) : null}
                        </div>

                        <div className="absolute right-3 top-3 z-20 flex flex-col items-end gap-2">
                          <div className="rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-bold text-white/75 backdrop-blur-md">
                            x{x.amountRemaining}
                          </div>

                          {cardPreviewSrc ? (
                            <button
                              type="button"
                              aria-label="Open full preview"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setPreview({
                                  src: cardPreviewSrc,
                                  kind: mediaKind,
                                  poster: mediaKind === "video" ? cardPoster : null,
                                  alt: x.mint?.name || `Token #${x.tokenId}`,
                                });
                              }}
                              className="pointer-events-none inline-flex h-10 w-10 translate-y-1 items-center justify-center rounded-xl border border-white/15 bg-black/45 text-white/90 opacity-0 backdrop-blur-md shadow-[0_10px_35px_rgba(0,0,0,0.35)] transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 hover:scale-[1.04] hover:bg-black/60 active:scale-[0.98]"
                            >
                              <span className="text-lg leading-none">⤢</span>
                            </button>
                          ) : null}
                        </div>

                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.38)_0%,transparent_42%)]" />
                      </div>

                      <div className="p-5">
                        <div className="truncate text-sm font-bold text-white/90">
                          {x.mint?.name || `Token #${x.tokenId}`}
                        </div>

                        <div className="mt-1.5 flex items-center justify-between gap-2 text-[12px] text-white/40">
                          <span className="truncate">{shortAddr(x.contract)}</span>
                          <span className="font-mono">#{x.tokenId}</span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {showProtectedBadge ? (
                            <span className="inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold text-violet-100">
                              PROTECTED
                            </span>
                          ) : null}

                          {showDeliveryContractBadge ? (
                            <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-100">
                              DELIVERY PROTECTED
                            </span>
                          ) : null}

                          {showProtectedSubtypeBadge ? (
                            <span
                              className={cx(
                                "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold",
                                fulfillmentToneClass(x.protectedSubtype)
                              )}
                            >
                              {x.protectedSubtypeLabel}
                            </span>
                          ) : null}

                          {showTradingOnlyBadge ? (
                            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-bold text-white/80">
                              TRADING ONLY
                            </span>
                          ) : null}

                          {showNoDeliveryBadge ? (
                            <span className="inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-bold text-sky-100">
                              NO DELIVERY
                            </span>
                          ) : null}

                          {showNoRedemptionBadge ? (
                            <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-100">
                              NO REDEMPTION
                            </span>
                          ) : null}

                          {x.officialItem || x.mint?.officialItem ? (
                            <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-100">
                              OFFICIAL
                            </span>
                          ) : null}

                          {x.item ? (
                            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-bold text-white/80">
                              {x.item}
                            </span>
                          ) : null}

                          {x.rarity ? (
                            <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-100">
                              {x.rarity}
                            </span>
                          ) : null}
                        </div>

                        {x.brand || x.project || x.collection ? (
                          <div className="mt-3 line-clamp-1 text-[12px] text-white/55">
                            {x.brand ? (
                              <span className="font-black text-white/80">{x.brand}</span>
                            ) : null}
                            {x.brand && x.project ? <span> • </span> : null}
                            {x.project ? <span>{x.project}</span> : null}
                            {(x.brand || x.project) && x.collection ? (
                              <span> • </span>
                            ) : null}
                            {x.collection ? <span>{x.collection}</span> : null}
                          </div>
                        ) : null}

                        {(x.category || x.subcategory) ? (
                          <div className="mt-2 line-clamp-1 text-[12px] text-white/45">
                            {[x.category, x.subcategory].filter(Boolean).join(" • ")}
                          </div>
                        ) : null}


                        <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[12px] font-semibold text-white/55">
                              Price
                            </div>
                            <div className="text-[13px] font-black text-amber-100">
                              {fmtEth(x.pricePerUnitWei)} ETH
                            </div>
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-2 text-[12px]">
                            <span className="text-white/45">Seller</span>
                            <span className="truncate font-mono font-black text-white/75">
                              {sellerLabel}
                            </span>
                          </div>
                        </div>

                        {x.metaDescription ? (
                          <div className="mt-3 line-clamp-2 text-[12px] text-white/50">
                            {x.metaDescription}
                          </div>
                        ) : null}

                        <div className="mt-4 flex items-center justify-between text-[12px] font-bold text-amber-100/90 group-hover:text-amber-100">
                          <span>Open NFT</span>
                          <span>→</span>
                        </div>
                      </div>
                    </Link>
                  );
                }
              )}
            </div>

            <div className="flex justify-center pt-2">
              <button
                disabled={loading || !canLoadMore}
                onClick={() => loadPage(skip + take, true, marketView)}
                className={cx(
                  "mt-4 inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-6 py-3 font-extrabold text-black ring-1 ring-black/15 transition",
                  "shadow-[0_18px_60px_rgba(212,175,55,0.20)] hover:brightness-110",
                  loading || !canLoadMore ? "cursor-not-allowed opacity-60" : ""
                )}
              >
                {loading ? "Loading…" : canLoadMore ? "Load more" : "No more"}
              </button>
            </div>
          </>
        )}
      </div>

      {previewModal}
    </>
  );
}