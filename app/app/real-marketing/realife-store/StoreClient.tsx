"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import StorefrontQuickBuy1155 from "@/components/storefront/StorefrontQuickBuy1155";
import { realifeStoreAbi } from "@/lib/realifeStoreAbi";

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

const STORE_STOREFRONT_CONTRACT = String(
  process.env.NEXT_PUBLIC_REALIFE_STORE_CONTRACT || ""
)
  .trim()
  .toLowerCase();

const ENV_PAYMENT_TOKEN_ADDRESS = String(
  process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS || ""
)
  .trim()
  .toLowerCase();

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

export default function StoreClient() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<StoreProduct[]>([]);
  const [apiPaymentToken, setApiPaymentToken] = useState<string>("");

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
        setApiPaymentToken(String(j?.paymentTokenAddress || "").trim().toLowerCase());
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

  const paymentTokenAddress = useMemo(() => {
    return apiPaymentToken || ENV_PAYMENT_TOKEN_ADDRESS;
  }, [apiPaymentToken]);

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

        return (
          name.includes(qq) ||
          tokenId.includes(qq) ||
          collection.includes(qq) ||
          category.includes(qq) ||
          item.includes(qq) ||
          rarity.includes(qq)
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
                Real-world items connected to NFTs. Delivery and escrow are handled through the site UI, while the NFT purchase itself is minted through the store contract.
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

          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                Total
              </div>
              <div className="mt-1 text-lg font-black text-white/90">{rows.length}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                Active
              </div>
              <div className="mt-1 text-lg font-black text-emerald-200">{activeCount}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                Visible
              </div>
              <div className="mt-1 text-lg font-black text-white/90">{filtered.length}</div>
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
                placeholder="art / antique / token id…"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/90 outline-none focus:border-white/20"
              />
            </div>

            <div className="min-w-[220px]">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                Sort
              </div>
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
          </div>

          {err ? (
            <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-[12px] text-rose-100">
              {err}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                <div className="p-5 space-y-3">
                  <div className="h-4 w-3/4 bg-white/[0.06] rounded-lg animate-pulse" />
                  <div className="h-3 w-1/2 bg-white/[0.06] rounded-lg animate-pulse" />
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

          const quickBuyReady =
            canBuy &&
            STORE_STOREFRONT_CONTRACT.startsWith("0x") &&
            paymentTokenAddress.startsWith("0x");

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

              <div className="p-5">
                <Link href={href} className="block">
                  <div className="text-sm font-extrabold text-white/90 truncate hover:text-amber-100 transition">
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

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[12px] text-white/55 font-semibold">Store price</div>
                    <div className="text-[13px] font-black text-amber-100">
                      {fmtUsdt(x.priceUsdt)} USDT
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2 text-[12px]">
                    <span className="text-white/45">Supply</span>
                    <span className="font-black text-white/75">
                      {x.totalSupply ?? "0"} / {x.maxSupply ?? "—"}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2 text-[12px]">
                    <span className="text-white/45">Seller</span>
                    <span className="font-black text-white/75">
                      {shortAddr(x.primarySellerWallet)}
                    </span>
                  </div>
                </div>

                {x.metaDescription ? (
                  <div className="mt-3 line-clamp-2 text-[12px] text-white/50">
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

                  {quickBuyReady ? (
                    <StorefrontQuickBuy1155
                      chainId={x.chainId}
                      nftContract={x.contract}
                      storefrontContract={STORE_STOREFRONT_CONTRACT}
                      storefrontAbi={realifeStoreAbi}
                      tokenId={String(x.tokenId)}
                      active={Boolean(x.active)}
                      unitPriceRaw={x.priceRaw}
                      priceLabel={`${fmtUsdt(x.priceUsdt)} USDT`}
                      paymentTokenAddress={paymentTokenAddress}
                      paymentSymbol="USDT"
                      remaining={x.remaining}
                      title={x.name || `Store Product #${x.tokenId}`}
                      functionName="buyProduct"
                      defaultAmount={1}
                      maxBuyPerTx={remainingNum && remainingNum > 0 ? remainingNum : 1}
                      approveUnlimited={true}
                    />
                  ) : canBuy ? (
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
                      Buy now
                    </Link>
                  ) : (
                    <div className="inline-flex items-center justify-center px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.04] text-[12px] font-black text-white/45">
                      {soldOut ? "Sold out" : "Inactive"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}