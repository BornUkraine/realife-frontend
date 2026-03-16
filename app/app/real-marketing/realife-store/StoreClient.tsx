"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type StoreProduct = {
  id: string;
  createdAt: string;
  chainId: number;
  contract: string;
  tokenId: string;
  tokenUri: string | null;
  name: string | null;
  image: string | null;
  verified: boolean;

  active: boolean;
  priceRaw: string | null;
  priceUsdt: string | null;

  maxSupply: string | null;
  totalSupply: string | null;
  remaining: string | null;

  creatorWallet?: string | null;
  primarySellerWallet?: string | null;
  deliveryEnabled?: boolean;
  physicalItemIncluded?: boolean;
  officialItem?: boolean;
  paymentTokenAddress?: string | null;

  metaImage?: string | null;
  metaDescription?: string | null;
  collection?: string | null;
  category?: string | null;
  item?: string | null;
  rarity?: string | null;

  brandProject?: string | null;
  project?: string | null;
};

type StoreProductsResponse = {
  ok: boolean;
  storefrontType: "store";
  chainId: number;
  contract: string;
  paymentTokenAddress?: string | null;
  treasuryAddress?: string | null;
  total: number;
  items: StoreProduct[];
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

const PRIMARY_IPFS_ORIGIN = (
  process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://nftstorage.link"
).replace(/\/$/, "");

const IPFS_GATEWAYS = [
  `${PRIMARY_IPFS_ORIGIN}/ipfs/`,
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
] as const;

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

async function fetchJSON<T = any>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j) throw new Error(j?.error || "fetch_failed");
  return j as T;
}

function fmtUsdt(v?: string | null) {
  if (!v) return "—";
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2).replace(/\.00$/, "") : v;
}

function toSafeNumber(v?: string | null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getBrandLabel(x: Partial<StoreProduct>) {
  return String(x.brandProject || x.project || "").trim() || null;
}

export default function StoreClient() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<StoreProduct[]>([]);

  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"all" | "active">("active");
  const [sort, setSort] = useState<"new" | "priceAsc" | "priceDesc">("new");

  useEffect(() => {
    let dead = false;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const j = await fetchJSON<StoreProductsResponse>(
          `/api/store/products?take=80&mode=${mode === "active" ? "active" : "all"}`
        );
        if (dead) return;

        setRows(Array.isArray(j?.items) ? j.items : []);
      } catch (e: any) {
        if (dead) return;
        setErr(e?.message || "Failed to load store products");
      } finally {
        if (!dead) setLoading(false);
      }
    })();

    return () => {
      dead = true;
    };
  }, [mode]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    let out = rows;

    if (qq) {
      out = out.filter((x) => {
        const name = String(x.name || "").toLowerCase();
        const tokenId = String(x.tokenId || "");
        const collection = String(x.collection || "").toLowerCase();
        const category = String(x.category || "").toLowerCase();
        const item = String(x.item || "").toLowerCase();
        const rarity = String(x.rarity || "").toLowerCase();
        const brandProject = String(x.brandProject || "").toLowerCase();
        const project = String(x.project || "").toLowerCase();

        return (
          name.includes(qq) ||
          tokenId.includes(qq) ||
          collection.includes(qq) ||
          category.includes(qq) ||
          item.includes(qq) ||
          rarity.includes(qq) ||
          brandProject.includes(qq) ||
          project.includes(qq)
        );
      });
    }

    if (sort === "priceAsc") {
      out = [...out].sort(
        (a, b) => Number(a.priceUsdt || "0") - Number(b.priceUsdt || "0")
      );
    } else if (sort === "priceDesc") {
      out = [...out].sort(
        (a, b) => Number(b.priceUsdt || "0") - Number(a.priceUsdt || "0")
      );
    } else {
      out = [...out].sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
      );
    }

    return out;
  }, [rows, q, sort]);

  const activeCount = useMemo(() => rows.filter((x) => x.active).length, [rows]);

  const brandCount = useMemo(() => {
    const set = new Set(
      rows
        .map((x) => getBrandLabel(x))
        .filter((v): v is string => Boolean(v))
        .map((v) => v.toLowerCase())
    );
    return set.size;
  }, [rows]);

  const goldWrap =
    "rounded-[34px] p-px overflow-hidden bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))] shadow-[0_34px_130px_rgba(0,0,0,0.60)]";
  const goldCard =
    "rounded-[34px] overflow-hidden border border-white/10 bg-[#0b0a09]/30 backdrop-blur-2xl ring-1 ring-black/10";

  return (
    <div className="space-y-6">
      <div className={goldWrap}>
        <div className={cx(goldCard, "p-6 md:p-7")}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 font-black">
                Curated Storefront
              </div>
              <div className="mt-2 text-xl md:text-2xl font-black tracking-tight text-white/90">
                Realife NFT Store
              </div>
              <div className="mt-2 text-[12px] text-white/55 max-w-2xl">
                Curated storefront for Realife products and future brand-ready
                collections. Delivery checkout and final purchase flow open on the
                dedicated NFT product page.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setMode("active")}
                className={cx(
                  "px-4 py-2 rounded-2xl border text-[12px] font-black transition",
                  mode === "active"
                    ? "border-black/10 text-black bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
                    : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                )}
              >
                Active only
              </button>

              <button
                onClick={() => setMode("all")}
                className={cx(
                  "px-4 py-2 rounded-2xl border text-[12px] font-black transition",
                  mode === "all"
                    ? "border-white/15 bg-white/[0.10] text-white"
                    : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                )}
              >
                All products
              </button>

              <Link
                href="/app/trading"
                className="px-4 py-2 rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition text-[12px] font-black text-amber-100/90 hover:text-amber-100"
              >
                Open Trading →
              </Link>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                Total
              </div>
              <div className="mt-1 text-lg font-black text-white/90">
                {rows.length}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                Active
              </div>
              <div className="mt-1 text-lg font-black text-emerald-200">
                {activeCount}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                Visible
              </div>
              <div className="mt-1 text-lg font-black text-white/90">
                {filtered.length}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                Brands
              </div>
              <div className="mt-1 text-lg font-black text-white/90">
                {brandCount}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                Mode
              </div>
              <div className="mt-1 text-lg font-black text-amber-100">
                {mode === "active" ? "ACTIVE" : "ALL"}
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
                Search
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="brand / art / antique / token id…"
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
          </div>

          {err ? (
            <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-[12px] text-rose-100">
              {err}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {(loading ? Array.from({ length: 8 }) : filtered).map((x: any, idx: number) => {
          const isSkeleton = !x || typeof x !== "object" || !x.id;

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
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 bg-white/[0.06] rounded-lg animate-pulse" />
                  <div className="h-3 w-1/2 bg-white/[0.06] rounded-lg animate-pulse" />
                  <div className="h-16 w-full bg-white/[0.06] rounded-2xl animate-pulse" />
                  <div className="h-10 w-full bg-white/[0.06] rounded-2xl animate-pulse" />
                </div>
              </div>
            );
          }

          const href = `/nft/${x.chainId}/${x.contract}/${encodeURIComponent(
            String(x.tokenId)
          )}`;

          const img = x?.metaImage || ipfsToHttp(x?.image || null) || null;
          const remaining = x?.remaining ?? "—";
          const remainingNum = toSafeNumber(x?.remaining);
          const soldOut = remainingNum !== null ? remainingNum <= 0 : false;
          const canBuy = Boolean(x.active) && !soldOut;
          const brandLabel = getBrandLabel(x);

          const primaryActionLabel =
            x.deliveryEnabled || x.physicalItemIncluded
              ? "Delivery & buy"
              : "Buy";

          return (
            <div
              key={x.id}
              className={cx(
                "group rounded-[26px] overflow-hidden border border-white/10 bg-white/[0.04]",
                "backdrop-blur-xl",
                "shadow-[0_24px_90px_rgba(0,0,0,0.55)] hover:-translate-y-1 transition-all duration-300 hover:bg-white/[0.08]"
              )}
            >
              <Link href={href} className="block">
                <div className="aspect-square w-full bg-black/30 relative">
                  {img ? (
                    <img
                      src={img}
                      alt={x.name || "Store NFT"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-white/25 font-black">
                      No media
                    </div>
                  )}

                  <div className="absolute top-3 left-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div
                      className={cx(
                        "px-2 py-1 rounded-full border backdrop-blur-md text-[10px] font-black",
                        canBuy
                          ? "border-white/10 bg-black/50 text-emerald-200"
                          : "border-white/10 bg-black/50 text-rose-200"
                      )}
                    >
                      {soldOut ? "SOLD OUT" : x.active ? "AVAILABLE" : "INACTIVE"}
                    </div>

                    {brandLabel ? (
                      <div className="px-2 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-[10px] font-black text-amber-100">
                        {brandLabel}
                      </div>
                    ) : null}

                    {x.deliveryEnabled ? (
                      <div className="px-2 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[10px] font-black text-emerald-100">
                        DELIVERY
                      </div>
                    ) : null}

                    {x.officialItem ? (
                      <div className="px-2 py-1 rounded-full border border-black/10 bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-[10px] font-black text-black">
                        OFFICIAL
                      </div>
                    ) : null}
                  </div>

                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="px-2 py-1 rounded-full border border-white/10 bg-black/50 backdrop-blur-md text-[10px] font-black text-white/85">
                      left {remaining}
                    </div>
                  </div>

                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.55)_0%,transparent_45%)]" />
                </div>
              </Link>

              <div className="p-4">
                {brandLabel ? (
                  <div className="mb-2">
                    <span className="inline-flex px-2 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-[10px] font-black text-amber-100">
                      {brandLabel}
                    </span>
                  </div>
                ) : null}

                <Link href={href} className="block">
                  <div className="text-[15px] font-extrabold text-white/90 truncate hover:text-amber-100 transition">
                    {x.name || `Store Product #${x.tokenId}`}
                  </div>
                </Link>

                {x.category || x.item || x.rarity ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {x.category ? (
                      <span className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.06] text-[10px] font-black text-white/80">
                        {x.category}
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
                ) : null}

                <div className="mt-3 flex items-center justify-between gap-2 text-[12px] text-white/55">
                  <span className="truncate font-mono">{shortAddr(x.contract)}</span>
                  <span className="font-mono">#{x.tokenId}</span>
                </div>

                <div className="mt-3 rounded-2xl border border-white/10 bg-black/10 p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[11px] text-white/45">Store price</div>
                      <div className="mt-1 text-[13px] font-black text-amber-100">
                        {fmtUsdt(x.priceUsdt)} USDT
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-white/45">Supply</div>
                      <div className="mt-1 text-[13px] font-black text-white/80">
                        {x.totalSupply ?? "0"} / {x.maxSupply ?? "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-white/45">Left</div>
                      <div className="mt-1 text-[13px] font-black text-white/80">
                        {remaining}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-white/45">Seller</div>
                      <div className="mt-1 truncate text-[13px] font-black text-white/80">
                        {shortAddr(x.primarySellerWallet)}
                      </div>
                    </div>
                  </div>
                </div>

                {x.metaDescription ? (
                  <div className="mt-3 line-clamp-2 text-[11px] text-white/50">
                    {x.metaDescription}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  {x.deliveryEnabled ? (
                    <span className="px-2 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[10px] font-black text-emerald-100">
                      Delivery available
                    </span>
                  ) : null}

                  {x.physicalItemIncluded ? (
                    <span className="px-2 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-[10px] font-black text-amber-100">
                      Physical item included
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Link
                    href={href}
                    className="inline-flex items-center justify-center px-4 py-3 rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition text-[12px] font-black text-white/85"
                  >
                    Open product
                  </Link>

                  {canBuy ? (
                    <Link
                      href={href}
                      className={cx(
                        "inline-flex items-center justify-center px-4 py-3 rounded-2xl",
                        "text-[12px] font-extrabold text-black",
                        "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
                        "shadow-[0_18px_60px_rgba(212,175,55,0.16)] ring-1 ring-black/15",
                        "hover:brightness-110 transition"
                      )}
                    >
                      {primaryActionLabel}
                    </Link>
                  ) : (
                    <div className="inline-flex items-center justify-center px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.04] text-[12px] font-black text-white/45">
                      {soldOut ? "Sold out" : "Inactive"}
                    </div>
                  )}
                </div>

                {x.deliveryEnabled || x.physicalItemIncluded ? (
                  <div className="mt-3 text-[11px] text-white/45 leading-relaxed">
                    Checkout and delivery form are shown on the product page.
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}