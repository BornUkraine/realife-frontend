"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import ActivityPanel from "@/components/trading/ActivityPanel";

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
  mint?: { name?: string | null; image?: string | null; tokenUri?: string | null; verified?: boolean };
};

type ProductMeta = {
  image?: string | null;
  name?: string | null;
  description?: string | null;
  attributes?: Array<{ trait_type?: string; value?: string | number | null }>;
};

type EnrichedMarketListing = MarketListing & {
  metaImage?: string | null;
  metaDescription?: string | null;
  collection?: string | null;
  item?: string | null;
  rarity?: string | null;
};

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

const PRIMARY_IPFS_ORIGIN = (process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://nftstorage.link").replace(/\/$/, "");
const IPFS_GATEWAYS = [
  `${PRIMARY_IPFS_ORIGIN}/ipfs/`,
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
] as const;

const CAFE_CONTRACT = String(process.env.NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT || "")
  .trim()
  .toLowerCase();

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

  if (u.startsWith("/ipfs/")) return `${gw}${u.slice("/ipfs/".length)}`;
  if (u.startsWith("Qm") || u.startsWith("bafy")) return `${gw}${u}`;
  return u;
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
      // next gateway
    }
  }

  return null;
}

function getAttr(meta: ProductMeta | null, trait: string) {
  const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
  const found = attrs.find((x) => String(x?.trait_type || "").toLowerCase() === trait.toLowerCase());
  return found?.value != null ? String(found.value) : null;
}

export default function TradingClient({
  viewerKey,
  viewerWallet,
}: {
  viewerKey: string | null;
  viewerWallet: string | null;
}) {
  const { address, isConnected } = useAccount();
  const wallet = useMemo(() => normAddr(address) || normAddr(viewerWallet), [address, viewerWallet]);

  const [tab, setTab] = useState<"market" | "my">("market");
  const [marketView, setMarketView] = useState<"all" | "cafe">("all");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<EnrichedMarketListing[]>([]);
  const [skip, setSkip] = useState(0);
  const take = 24;

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"new" | "priceAsc" | "priceDesc">("new");

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

        return (
          name.includes(qq) ||
          seller.includes(qq) ||
          tokenId.includes(qq) ||
          collection.includes(qq) ||
          item.includes(qq) ||
          rarity.includes(qq)
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

  async function loadPage(nextSkip: number, append: boolean, view: "all" | "cafe" = marketView) {
    setErr(null);
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("status", "ACTIVE");
      params.set("take", String(take));
      params.set("skip", String(nextSkip));

      if (view === "cafe" && CAFE_CONTRACT) {
        params.set("contract", CAFE_CONTRACT);
      }

      const url = `/api/market/listings?${params.toString()}`;
      const j = await fetchJSON(url);

      const items = (j?.listings || []) as MarketListing[];
      const t = Number(j?.total || 0);

      const enriched = await Promise.all(
        items.map(async (item) => {
          const isCafe = !!CAFE_CONTRACT && normAddr(item.contract) === CAFE_CONTRACT;
          if (!isCafe) return item as EnrichedMarketListing;

          const meta = await loadMetadata(item.mint?.tokenUri || null);

          return {
            ...item,
            metaImage: ipfsToHttp(meta?.image || null),
            metaDescription: meta?.description || null,
            collection: getAttr(meta, "Collection"),
            item: getAttr(meta, "Item") || getAttr(meta, "Drink"),
            rarity: getAttr(meta, "Rarity"),
          } satisfies EnrichedMarketListing;
        })
      );

      setTotal(t);
      setSkip(nextSkip);
      setRows((prev) => (append ? [...prev, ...enriched] : enriched));
    } catch (e: any) {
      setErr(e?.message || "Failed to load market");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab !== "market") return;
    loadPage(0, false, marketView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketView, tab]);

  useEffect(() => {
    if (tab !== "market") return;
    loadPage(0, false, marketView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canLoadMore = rows.length < total;

  const goldWrap =
    "rounded-[34px] p-px overflow-hidden bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))] shadow-[0_34px_130px_rgba(0,0,0,0.60)]";
  const goldCard =
    "rounded-[34px] overflow-hidden border border-white/10 bg-[#0b0a09]/30 backdrop-blur-2xl ring-1 ring-black/10";

  const marketTitle = marketView === "cafe" ? "Realife Cafe NFT" : "Market";
  const marketSubtitle =
    marketView === "cafe"
      ? "Secondary market for Realife Cafe products and branded NFTs."
      : "All verified Realife NFTs across supported contracts.";

  return (
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
              Market
              <span className="ml-2 inline-flex items-center justify-center h-5 px-2 rounded-full text-[10px] font-black text-white/80 bg-black/25 ring-1 ring-white/10">
                {tab === "market" && marketView === "all" ? total : "ALL"}
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

            {tab === "market" ? (
              <>
                <button
                  onClick={() => setMarketView("all")}
                  className={cx(
                    "px-4 py-2 rounded-2xl border text-[12px] font-black transition",
                    marketView === "all"
                      ? "border-white/15 bg-white/[0.10] text-white"
                      : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                  )}
                >
                  All NFTs
                </button>

                <button
                  onClick={() => {
                    setMarketView("cafe");
                    setTab("market");
                  }}
                  disabled={!CAFE_CONTRACT}
                  className={cx(
                    "inline-flex items-center justify-center px-4 py-2 rounded-2xl text-[12px] font-black transition ring-1",
                    marketView === "cafe"
                      ? "text-black bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.18)]"
                      : "text-amber-100/95 border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] ring-white/10",
                    !CAFE_CONTRACT ? "opacity-50 cursor-not-allowed" : ""
                  )}
                >
                  Realife Cafe NFT
                </button>

                <button
                  onClick={() => loadPage(0, false, marketView)}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition text-[12px] font-black text-amber-100/90 hover:text-amber-100"
                >
                  Refresh
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {tab === "my" ? (
        <div className={goldWrap}>
          <div className={cx(goldCard, "p-6 md:p-7")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 font-black">My Activity</div>
                <div className="mt-2 text-xl md:text-2xl font-black tracking-tight text-white/90">
                  Listings • Purchases • Sales
                </div>
                <div className="mt-2 text-[12px] text-white/55">
                  {isConnected ? (
                    <>
                      Wallet: <span className="font-mono text-white/80">{shortAddr(address || "")}</span>
                    </>
                  ) : viewerWallet ? (
                    <>
                      Wallet: <span className="font-mono text-white/80">{shortAddr(viewerWallet)}</span>
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
                  No public key found (handle/publicId). Create it in profile settings and reload.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {marketView === "cafe" ? (
            <div className={goldWrap}>
              <div className={cx(goldCard, "p-6 md:p-7")}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-white/45 font-black">
                      Realife Cafe Collection
                    </div>
                    <div className="mt-2 text-xl md:text-2xl font-black tracking-tight text-white/90">
                      Premium cafe goods in one contract
                    </div>
                    <div className="mt-2 text-[13px] text-white/55 max-w-3xl">
                      This view isolates listings from the Realife Cafe storefront contract so users do not get lost
                      inside the broader market.
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/app/real-marketing"
                      className="px-4 py-2 rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition text-[12px] font-black text-white/85"
                    >
                      Real Marketing
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className={goldWrap}>
            <div className={cx(goldCard, "p-6 md:p-7")}>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[220px] flex-1">
                  <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                    Search • {marketTitle}
                  </div>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="name / token id / seller / rarity / item…"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/90 outline-none focus:border-white/20"
                  />
                </div>

                <div className="min-w-[220px]">
                  <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Sort</div>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as "new" | "priceAsc" | "priceDesc")}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/90 outline-none focus:border-white/20"
                  >
                    <option value="new">Newest</option>
                    <option value="priceAsc">Price: Low → High</option>
                    <option value="priceDesc">Price: High → Low</option>
                  </select>
                </div>

                <div className="min-w-[220px]">
                  <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Quick</div>
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

              <div className="mt-4 text-[12px] text-white/55">{marketSubtitle}</div>

              {err ? (
                <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-[12px] text-rose-100">
                  {err}
                </div>
              ) : null}

              <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Loaded</div>
                  <div className="mt-1 text-lg font-black text-white/90">{rows.length}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Total</div>
                  <div className="mt-1 text-lg font-black text-white/90">{total}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">My loaded</div>
                  <div className="mt-1 text-lg font-black text-amber-100">{myRows.length}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">View</div>
                  <div className="mt-1 text-lg font-black text-emerald-200">
                    {marketView === "cafe" ? "CAFE" : "ALL"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {(loading && rows.length === 0 ? Array.from({ length: 8 }) : filtered).map((x: any, idx: number) => {
              const isSkeleton = !x || typeof x !== "object" || !x.marketplaceListingId;

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

              const href = `/nft/${x.chainId}/${normAddr(x.contract)}/${encodeURIComponent(String(x.tokenId))}`;
              const isMine = wallet && normAddr(x.sellerWallet) === wallet;
              const isCafe = CAFE_CONTRACT && normAddr(x.contract) === CAFE_CONTRACT;
              const img = x?.metaImage || ipfsToHttp(x?.mint?.image || null) || null;

              return (
                <Link
                  key={x.marketplaceListingId}
                  href={href}
                  className={cx(
                    "group rounded-[26px] overflow-hidden border border-white/10 bg-white/[0.04]",
                    "backdrop-blur-xl",
                    "shadow-[0_24px_90px_rgba(0,0,0,0.55)] hover:-translate-y-1 transition-all duration-300 hover:bg-white/[0.08]"
                  )}
                >
                  <div className="aspect-square w-full bg-black/30 relative">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={x.mint?.name || "NFT"} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-white/25 font-black">No media</div>
                    )}

                    <div className="absolute top-3 left-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="px-2 py-1 rounded-full border border-white/10 bg-black/50 backdrop-blur-md text-[10px] font-black text-emerald-200">
                        ACTIVE
                      </div>

                      {isCafe ? (
                        <div className="px-2 py-1 rounded-full border border-black/10 bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-[10px] font-black text-black">
                          {x.collection || "CAFE"}
                        </div>
                      ) : null}

                      {isMine ? (
                        <div className="px-2 py-1 rounded-full border border-white/10 bg-black/50 backdrop-blur-md text-[10px] font-black text-amber-100">
                          YOUR LISTING
                        </div>
                      ) : null}
                    </div>

                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="px-2 py-1 rounded-full border border-white/10 bg-black/50 backdrop-blur-md text-[10px] font-black text-white/85">
                        x{x.amountRemaining}
                      </div>
                    </div>

                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.55)_0%,transparent_45%)]" />
                  </div>

                  <div className="p-5">
                    <div className="text-sm font-extrabold text-white/90 truncate">
                      {x.mint?.name || `Token #${x.tokenId}`}
                    </div>

                    {isCafe ? (
                      <div className="mt-2 flex flex-wrap gap-2">
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
                    ) : null}

                    <div className="mt-3 flex items-center justify-between gap-2 text-[12px] text-white/55">
                      <span className="truncate font-mono">{shortAddr(x.contract)}</span>
                      <span className="font-mono">#{x.tokenId}</span>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[12px] text-white/55 font-semibold">Price</div>
                        <div className="text-[13px] font-black text-amber-100">{fmtEth(x.pricePerUnitWei)} ETH</div>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2 text-[12px]">
                        <span className="text-white/45">Seller</span>
                        <span className="font-mono font-black text-white/75">{shortAddr(x.sellerWallet)}</span>
                      </div>
                    </div>

                    {isCafe && x.metaDescription ? (
                      <div className="mt-3 line-clamp-2 text-[12px] text-white/50">{x.metaDescription}</div>
                    ) : null}

                    <div className="mt-4 text-[12px] font-extrabold text-amber-100/90 group-hover:text-amber-100 flex items-center justify-between">
                      <span>Open</span>
                      <span>→</span>
                    </div>
                  </div>
                </Link>
              );
            })}
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
  );
}