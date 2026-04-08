"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import ActivityPanel from "@/components/trading/ActivityPanel";
import NftMedia from "@/components/NftMedia";

type MarketType = "STANDARD" | "DELIVERY";
type MarketView =
  | "all"
  | "cafe"
  | "store"
  | "publicStandard"
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

  marketType?: MarketType;
  marketplaceContract?: string | null;
  deliveryEnabled?: boolean;
  physicalItemIncluded?: boolean;
  officialItem?: boolean;

  mint?: {
    name?: string | null;
    image?: string | null;
    tokenUri?: string | null;
    verified?: boolean;
    deliveryEnabled?: boolean;
    physicalItemIncluded?: boolean;
    officialItem?: boolean;
  };
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
};

type PreviewState = {
  src: string;
  kind: "image" | "video";
  poster?: string | null;
  alt?: string;
} | null;

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

function marketLabel(mt?: MarketType | null) {
  return mt === "DELIVERY" ? "DELIVERY" : "STANDARD";
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
  const r = await fetch(url, { cache: "no-store" });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j) throw new Error(j?.error || "fetch_failed");
  return j;
}

async function loadMetadata(tokenUri?: string | null): Promise<ProductMeta | null> {
  if (!tokenUri) return null;

  for (const gw of IPFS_GATEWAYS) {
    const url = ipfsToHttp(tokenUri, gw);
    if (!url) continue;

    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) continue;
      const j = await r.json().catch(() => null);
      if (j && typeof j === "object") return j as ProductMeta;
    } catch {
      //
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

function getMarketViewConfig(view: MarketView) {
  switch (view) {
    case "cafe":
      return {
        label: "Realife Cafe NFT",
        title: "Realife Cafe NFT Trading",
        subtitle:
          "Secondary NFT trading page for Realife Cafe NFTs that were bought through the official cafe flow and later listed by holders.",
        contract: CAFE_CONTRACT || null,
      };

    case "store":
      return {
        label: "Realife Store NFT",
        title: "Realife Store NFT Trading",
        subtitle:
          "Secondary NFT trading page for official Realife Store NFTs later listed by holders.",
        contract: STORE_CONTRACT || null,
      };

    case "publicStandard":
      return {
        label: "Public Mint • Standard",
        title: "Public Standard NFT Trading",
        subtitle:
          "User-created NFTs minted through the standard public contract without delivery mode.",
        contract: PUBLIC_STANDARD_CONTRACT || null,
      };

    case "publicDelivery":
      return {
        label: "Public Mint • Delivery",
        title: "Public Delivery NFT Trading",
        subtitle:
          "User-created NFTs minted through the delivery-enabled public contract, shown in a separate premium NFT trading view.",
        contract: PUBLIC_DELIVERY_CONTRACT || null,
      };

    case "all":
    default:
      return {
        label: "All Trading NFTs",
        title: "NFT Trading",
        subtitle:
          "All verified Realife NFTs available for secondary trading across supported contracts, including standard, delivery, cafe and store listings.",
        contract: null,
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
          "This page shows secondary NFT trading of Realife Store NFTs. Some NFTs may originally come from official store items with delivery in the primary flow, but secondary trading uses the STANDARD marketplace only. Secondary buyers do not get automatic delivery through trading. For official purchase with delivery, use Real Marketing.",
      };

    case "publicDelivery":
      return {
        tone: "border-violet-500/20 bg-violet-500/10 text-violet-100",
        text:
          "These NFTs come from the delivery-enabled public mint contract. Delivery-related traits stay visible on cards, while trading remains a premium NFT collection-style market view.",
      };

    case "publicStandard":
      return {
        tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
        text:
          "This page focuses on user-created standard public mint NFTs without delivery mode.",
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
    case "publicDelivery":
      return "text-violet-100 border border-violet-500/20 bg-violet-500/10 ring-violet-500/10";
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
  const { address, isConnected } = useAccount();
  const wallet = useMemo(
    () => normAddr(address) || normAddr(viewerWallet),
    [address, viewerWallet]
  );

  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"market" | "my">("market");
  const [marketView, setMarketView] = useState<MarketView>(initialMarketView);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<EnrichedMarketListing[]>([]);
  const [skip, setSkip] = useState(0);
  const take = 24;

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"new" | "priceAsc" | "priceDesc">("new");
  const [preview, setPreview] = useState<PreviewState>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMarketView(initialMarketView);
  }, [initialMarketView]);

  useEffect(() => {
    if (!preview) return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreview(null);
    };

    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [preview]);

  const marketCfg = useMemo(() => getMarketViewConfig(marketView), [marketView]);
  const marketNote = useMemo(() => getMarketViewNote(marketView), [marketView]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let out = rows;

    if (qq) {
      out = out.filter((x) => {
        const name = String(x.mint?.name || "").toLowerCase();
        const seller = String(x.sellerWallet || "").toLowerCase();
        const tokenId = String(x.tokenId || "");
        const collection = String(x.collection || "").toLowerCase();
        const item = String(x.item || "").toLowerCase();
        const rarity = String(x.rarity || "").toLowerCase();
        const market = String(x.marketType || "").toLowerCase();
        const brand = String(x.brand || "").toLowerCase();
        const project = String(x.project || "").toLowerCase();
        const contract = String(x.contract || "").toLowerCase();

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
          contract.includes(qq)
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
  }, [rows, q, sort]);

  const myRows = useMemo(() => {
    if (!wallet) return [];
    return filtered.filter((x) => normAddr(x.sellerWallet) === wallet);
  }, [filtered, wallet]);

  async function loadPage(
    nextSkip: number,
    append: boolean,
    view: MarketView = marketView
  ) {
    setErr(null);
    setLoading(true);

    try {
      const cfg = getMarketViewConfig(view);

      if (view !== "all" && !cfg.contract) {
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

      const url = `/api/market/listings?${params.toString()}`;
      const j = await fetchJSON(url);

      const items = (j?.listings || []) as MarketListing[];
      const t = Number(j?.total || 0);

      const enriched = await Promise.all(
        items.map(async (item) => {
          const meta = await loadMetadata(item.mint?.tokenUri || null);

          const metaImageRaw =
            meta?.image || meta?.image_url || meta?.imageUrl || null;

          const metaAnimationRaw =
            meta?.animation_url || meta?.animationUrl || meta?.animation || null;

          const imgHttp =
            ipfsToHttp(metaImageRaw) ||
            ipfsToHttp(item.mint?.image || null) ||
            null;

          const animHttp =
            ipfsToHttp(metaAnimationRaw, PINATA_IPFS) ||
            ipfsToHttp(metaAnimationRaw) ||
            null;

          const mediaKind: "image" | "video" =
            metaAnimationRaw || isLikelyVideoUrl(animHttp) ? "video" : "image";

          const mediaSrc =
            mediaKind === "video" ? animHttp || null : imgHttp || null;

          const mediaPoster = mediaKind === "video" ? imgHttp || null : null;

          return {
            ...item,
            metaImage: imgHttp,
            metaDescription: meta?.description || null,
            collection: meta?.collection || getAttr(meta, "Collection") || null,
            item:
              meta?.item ||
              getAttr(meta, "Item") ||
              getAttr(meta, "Drink") ||
              null,
            rarity: meta?.rarity || getAttr(meta, "Rarity") || null,
            brand: meta?.brand || getAttr(meta, "Brand") || null,
            project: meta?.project || getAttr(meta, "Project") || null,
            mediaKind,
            mediaSrc: mediaKind === "video" ? mediaSrc : imgHttp || null,
            mediaPoster,
          } satisfies EnrichedMarketListing;
        })
      );

      setTotal(t);
      setSkip(nextSkip);
      setRows((prev) => (append ? [...prev, ...enriched] : enriched));
    } catch (e: any) {
      setErr(e?.message || "Failed to load NFT trading");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab !== "market") return;
    loadPage(0, false, marketView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketView, tab]);

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
                  "px-4 py-2 rounded-2xl border text-[12px] font-black transition",
                  tab === "market"
                    ? "border-white/15 bg-white/[0.10] text-white"
                    : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                )}
              >
                NFT Trading
                <span className="ml-2 inline-flex items-center justify-center h-5 px-2 rounded-full text-[10px] font-black text-white/80 bg-black/25 ring-1 ring-white/10">
                  {tab === "market" ? total : "ALL"}
                </span>
              </button>

              <button
                onClick={() => setTab("my")}
                className={cx(
                  "px-4 py-2 rounded-2xl border text-[12px] font-black transition",
                  tab === "my"
                    ? "border-white/15 bg-white/[0.10] text-white"
                    : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                )}
              >
                My Activity
                <span className="ml-2 inline-flex items-center justify-center h-5 px-2 rounded-full text-[10px] font-black text-black/80 bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15">
                  NEW
                </span>
              </button>

              <div className="flex-1" />

              {lockMarketView ? (
                <Link
                  href="/app/trading"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition text-[12px] font-black text-white/85"
                >
                  All collections
                </Link>
              ) : null}

              {tab === "market" ? (
                <button
                  onClick={() => loadPage(0, false, marketView)}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition text-[12px] font-black text-amber-100/90 hover:text-amber-100"
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
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 font-black">
                    My Activity
                  </div>
                  <div className="mt-2 text-xl md:text-2xl font-black tracking-tight text-white/90">
                    Listings • Purchases • Sales
                  </div>
                  <div className="mt-2 text-[12px] text-white/55">
                    {isConnected ? (
                      <>
                        Wallet:{" "}
                        <span className="font-mono text-white/80">
                          {shortAddr(address || "")}
                        </span>
                      </>
                    ) : viewerWallet ? (
                      <>
                        Wallet:{" "}
                        <span className="font-mono text-white/80">
                          {shortAddr(viewerWallet)}
                        </span>
                        <span className="text-white/35"> (session)</span>
                      </>
                    ) : (
                      <>Connect wallet to see personal activity.</>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                {viewerKey ? (
                  <ActivityPanel userKey={viewerKey} />
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
                        ["cafe", "Realife Cafe NFT"],
                        ["store", "Realife Store NFT"],
                        ["publicStandard", "Public Mint • Standard"],
                        ["publicDelivery", "Public Mint • Delivery"],
                      ] as Array<[MarketView, string]>
                    ).map(([viewKey, label]) => {
                      const cfg = getMarketViewConfig(viewKey);
                      const disabled = viewKey !== "all" && !cfg.contract;

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
                            "inline-flex items-center justify-center px-4 py-2 rounded-2xl text-[12px] font-black transition ring-1",
                            marketView === viewKey
                              ? viewBadgeClass(viewKey)
                              : "text-white/75 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] ring-white/10",
                            disabled
                              ? "opacity-45 cursor-not-allowed hover:bg-white/[0.04]"
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
                    "flex flex-col md:flex-row md:items-center md:justify-between gap-4",
                    !lockMarketView ? "mt-5" : ""
                  )}
                >
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-white/45 font-black">
                      {lockMarketView
                        ? "Premium NFT collection view"
                        : "Premium NFT trading view"}
                    </div>
                    <div className="mt-2 text-xl md:text-2xl font-black tracking-tight text-white/90">
                      {marketCfg.title}
                    </div>
                    <div className="mt-2 text-[13px] text-white/55 max-w-3xl">
                      {marketCfg.subtitle}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div
                      className={cx(
                        "px-3 py-2 rounded-2xl text-[11px] font-black ring-1",
                        viewBadgeClass(marketView)
                      )}
                    >
                      {marketCfg.label}
                    </div>

                    {marketCfg.contract ? (
                      <div className="px-3 py-2 rounded-2xl border border-white/10 bg-white/[0.04] text-[11px] font-black text-white/80">
                        {shortAddr(marketCfg.contract)}
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
                          className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition text-[12px] font-black text-white/90"
                        >
                          Go to Real Marketing →
                        </Link>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                      Loaded
                    </div>
                    <div className="mt-1 text-lg font-black text-white/90">
                      {rows.length}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                      Total
                    </div>
                    <div className="mt-1 text-lg font-black text-white/90">
                      {total}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                      My listings
                    </div>
                    <div className="mt-1 text-lg font-black text-amber-100">
                      {myRows.length}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
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
                    <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                      Search • {marketCfg.title}
                    </div>
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="name / token id / seller / rarity / item / brand / project / collection…"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/90 outline-none focus:border-white/20"
                    />
                  </div>

                  <div className="min-w-[220px]">
                    <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
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
                    <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                      Quick
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => setQ("")}
                        className="px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition text-[12px] font-black text-white/80"
                      >
                        Clear
                      </button>

                      {wallet ? (
                        <button
                          onClick={() => {
                            setQ(wallet);
                          }}
                          className="px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition text-[12px] font-black text-amber-100/90 hover:text-amber-100"
                        >
                          My listings
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {err ? (
                  <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-[12px] text-rose-100">
                    {err}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(loading && rows.length === 0 ? Array.from({ length: 8 }) : filtered).map(
                (x: any, idx: number) => {
                  const isSkeleton =
                    !x || typeof x !== "object" || !x.marketplaceListingId;

                  if (isSkeleton) {
                    return (
                      <div
                        key={`sk_${idx}`}
                        className={cx(
                          "rounded-[26px] overflow-hidden border border-white/10 bg-white/[0.04]",
                          "backdrop-blur-xl",
                          "shadow-[0_24px_90px_rgba(0,0,0,0.55)]"
                        )}
                      >
                        <div className="aspect-square w-full bg-white/[0.03] animate-pulse" />
                        <div className="p-5 space-y-3">
                          <div className="h-4 w-3/4 bg-white/[0.06] rounded-lg animate-pulse" />
                          <div className="h-3 w-1/2 bg-white/[0.06] rounded-lg animate-pulse" />
                          <div className="h-10 w-full bg-white/[0.06] rounded-2xl animate-pulse" />
                        </div>
                      </div>
                    );
                  }

                  const href = `/nft/${x.chainId}/${normAddr(x.contract)}/${encodeURIComponent(
                    String(x.tokenId)
                  )}`;

                  const isMine = Boolean(wallet && normAddr(x.sellerWallet) === wallet);

                  const isCafe =
                    Boolean(CAFE_CONTRACT) &&
                    normAddr(x.contract) === CAFE_CONTRACT;

                  const isStore =
                    Boolean(STORE_CONTRACT) &&
                    normAddr(x.contract) === STORE_CONTRACT;

                  const isPublicStandard =
                    Boolean(PUBLIC_STANDARD_CONTRACT) &&
                    normAddr(x.contract) === PUBLIC_STANDARD_CONTRACT;

                  const isPublicDelivery =
                    Boolean(PUBLIC_DELIVERY_CONTRACT) &&
                    normAddr(x.contract) === PUBLIC_DELIVERY_CONTRACT;

                  const rowMarketType: MarketType =
                    isPublicDelivery ? "DELIVERY" : "STANDARD";

                  const showDeliveryBadge = isPublicDelivery;
                  const showTradingOnlyBadge = isStore || isCafe;
                  const showNoDeliveryBadge = isStore;
                  const showNoRedemptionBadge = isCafe;

                  const topLabel = isCafe
                    ? x.collection || "CAFE"
                    : isStore
                    ? x.collection || "STORE"
                    : isPublicStandard
                    ? "PUBLIC STANDARD"
                    : isPublicDelivery
                    ? "PUBLIC DELIVERY"
                    : "TRADING";

                  const topLabelClass = isCafe
                    ? "text-black bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] border-black/10"
                    : isStore
                    ? "text-sky-100 bg-sky-500/10 border-sky-500/20"
                    : isPublicStandard
                    ? "text-emerald-100 bg-emerald-500/10 border-emerald-500/20"
                    : isPublicDelivery
                    ? "text-violet-100 bg-violet-500/10 border-violet-500/20"
                    : "text-white/85 bg-black/50 border-white/10";

                  const cardPreviewSrc =
                    x.mediaSrc ||
                    x.metaImage ||
                    ipfsToHttp(x?.mint?.image || null) ||
                    null;

                  const cardPoster =
                    x.mediaKind === "video"
                      ? x.mediaPoster || x.metaImage || ipfsToHttp(x?.mint?.image || null)
                      : null;

                  const cardImage =
                    x.mediaKind === "video"
                      ? cardPoster
                      : cardPreviewSrc || x.metaImage || ipfsToHttp(x?.mint?.image || null);

                  return (
                    <Link
                      key={x.id}
                      href={href}
                      className={cx(
                        "group rounded-[26px] overflow-hidden border border-white/10 bg-white/[0.04]",
                        "backdrop-blur-xl",
                        "shadow-[0_24px_90px_rgba(0,0,0,0.55)] hover:-translate-y-1 transition-all duration-300 hover:bg-white/[0.08]"
                      )}
                    >
                      <div className="aspect-square w-full bg-black/30 relative">
                        {cardImage ? (
                          <img
                            src={cardImage}
                            alt={x.mint?.name || "NFT"}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                            draggable={false}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-white/25 font-black">
                            No media
                          </div>
                        )}

                        <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 opacity-0 transition-opacity pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto">
                          <div className="px-2 py-1 rounded-full border border-white/10 bg-black/50 backdrop-blur-md text-[10px] font-black text-emerald-200">
                            ACTIVE
                          </div>

                          <div
                            className={cx(
                              "px-2 py-1 rounded-full border text-[10px] font-black",
                              topLabelClass
                            )}
                          >
                            {topLabel}
                          </div>

                          {x.mediaKind === "video" ? (
                            <div className="px-2 py-1 rounded-full border border-white/10 bg-black/50 backdrop-blur-md text-[10px] font-black text-amber-100">
                              VIDEO
                            </div>
                          ) : null}

                          {isMine ? (
                            <div className="px-2 py-1 rounded-full border border-white/10 bg-black/50 backdrop-blur-md text-[10px] font-black text-amber-100">
                              YOUR LISTING
                            </div>
                          ) : null}
                        </div>

                        <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2 opacity-0 transition-all duration-200 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto">
                          <div className="px-2 py-1 rounded-full border border-white/10 bg-black/50 backdrop-blur-md text-[10px] font-black text-white/85">
                            x{x.amountRemaining}
                          </div>

                          <div className="px-2 py-1 rounded-full border border-white/10 bg-black/50 backdrop-blur-md text-[10px] font-black text-white/85">
                            {marketLabel(rowMarketType)}
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
                                  kind: x.mediaKind === "video" ? "video" : "image",
                                  poster: x.mediaKind === "video" ? cardPoster : null,
                                  alt: x.mint?.name || `Token #${x.tokenId}`,
                                });
                              }}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-black/45 text-white/90 backdrop-blur-md shadow-[0_10px_35px_rgba(0,0,0,0.35)] transition-all duration-200 hover:scale-[1.04] hover:bg-black/60 active:scale-[0.98]"
                            >
                              <span className="text-lg leading-none">⤢</span>
                            </button>
                          ) : null}
                        </div>

                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.55)_0%,transparent_45%)]" />
                      </div>

                      <div className="p-5">
                        <div className="text-sm font-extrabold text-white/90 truncate">
                          {x.mint?.name || `Token #${x.tokenId}`}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.06] text-[10px] font-black text-white/80">
                            {marketLabel(rowMarketType)}
                          </span>

                          {showDeliveryBadge ? (
                            <span className="px-2 py-1 rounded-full border border-violet-500/20 bg-violet-500/10 text-[10px] font-black text-violet-100">
                              DELIVERY
                            </span>
                          ) : null}

                          {showTradingOnlyBadge ? (
                            <span className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.06] text-[10px] font-black text-white/80">
                              TRADING ONLY
                            </span>
                          ) : null}

                          {showNoDeliveryBadge ? (
                            <span className="px-2 py-1 rounded-full border border-sky-500/20 bg-sky-500/10 text-[10px] font-black text-sky-100">
                              NO DELIVERY
                            </span>
                          ) : null}

                          {showNoRedemptionBadge ? (
                            <span className="px-2 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-[10px] font-black text-amber-100">
                              NO REDEMPTION
                            </span>
                          ) : null}

                          {x.officialItem || x.mint?.officialItem ? (
                            <span className="px-2 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-[10px] font-black text-amber-100">
                              OFFICIAL
                            </span>
                          ) : null}

                          {x.item ? (
                            <span className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.06] text-[10px] font-black text-white/80">
                              {x.item}
                            </span>
                          ) : null}

                          {x.rarity ? (
                            <span className="px-2 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-[10px] font-black text-amber-100">
                              {x.rarity}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2 text-[12px] text-white/55">
                          <span className="truncate font-mono">
                            {shortAddr(x.contract)}
                          </span>
                          <span className="font-mono">#{x.tokenId}</span>
                        </div>

                        {x.brand || x.project || x.collection ? (
                          <div className="mt-3 text-[12px] text-white/55 line-clamp-2">
                            {x.brand ? (
                              <span className="text-white/80 font-black">{x.brand}</span>
                            ) : null}
                            {x.brand && x.project ? <span> • </span> : null}
                            {x.project ? <span>{x.project}</span> : null}
                            {(x.brand || x.project) && x.collection ? <span> • </span> : null}
                            {x.collection ? <span>{x.collection}</span> : null}
                          </div>
                        ) : null}

                        <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[12px] text-white/55 font-semibold">
                              Price
                            </div>
                            <div className="text-[13px] font-black text-amber-100">
                              {fmtEth(x.pricePerUnitWei)} ETH
                            </div>
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-2 text-[12px]">
                            <span className="text-white/45">Seller</span>
                            <span className="font-mono font-black text-white/75">
                              {shortAddr(x.sellerWallet)}
                            </span>
                          </div>
                        </div>

                        {x.metaDescription ? (
                          <div className="mt-3 line-clamp-2 text-[12px] text-white/50">
                            {x.metaDescription}
                          </div>
                        ) : null}

                        <div className="mt-4 text-[12px] font-extrabold text-amber-100/90 group-hover:text-amber-100 flex items-center justify-between">
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
                  "mt-4 inline-flex items-center justify-center px-6 py-3 rounded-2xl text-black font-extrabold transition",
                  "shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15",
                  "hover:brightness-110",
                  loading || !canLoadMore ? "opacity-60 cursor-not-allowed" : ""
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