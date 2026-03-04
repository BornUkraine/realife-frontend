"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatUnits } from "viem";

type ActivityUser = {
  id: string;
  handle: string | null;
  publicId: string | null;
  walletAddress: string;
};

type MintMini = { name: string | null; image: string | null };

type ListingRow = {
  id: string;
  chainId: number;
  contract: string;
  tokenId: string;
  standard: "ERC721" | "ERC1155";
  status: "ACTIVE" | "CANCELLED" | "SOLD_OUT";
  sellerWallet: string;
  marketplaceListingId: string;
  pricePerUnitWei: string;
  amountTotal: string;
  amountRemaining: string;
  createdAt: string;
  cancelledAt: string | null;
  soldOutAt: string | null;
  mint: MintMini | null;
};

type TradeRow = {
  chainId: number;
  contract: string;
  tokenId: string;
  standard: "ERC721" | "ERC1155";
  txHash: string;
  logIndex: number;
  blockTime: string;
  sellerWallet: string;
  buyerWallet: string;
  counterpartyWallet: string;
  counterpartyUser: { handle: string | null; publicId: string | null } | null;
  amount: string;
  pricePerUnitWei: string;
  totalPriceWei: string;
  mint: MintMini | null;
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

function fmtEth(weiStr: string) {
  try {
    const v = formatUnits(BigInt(weiStr || "0"), 18);
    // trim
    const [a, b] = v.split(".");
    if (!b) return a;
    const bb = b.slice(0, 6).replace(/0+$/, "");
    return bb ? `${a}.${bb}` : a;
  } catch {
    return "0";
  }
}

function fmtInt(x: string) {
  try {
    return BigInt(x).toString();
  } catch {
    return String(x || "0");
  }
}

async function fetchJSON(url: string, signal?: AbortSignal) {
  const r = await fetch(url, { signal, cache: "no-store" });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j) throw new Error(j?.error || "fetch_failed");
  return j;
}

export default function ActivityPanel({ userKey }: { userKey: string }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [user, setUser] = useState<ActivityUser | null>(null);

  const [listings, setListings] = useState<ListingRow[]>([]);
  const [purchases, setPurchases] = useState<TradeRow[]>([]);
  const [sales, setSales] = useState<TradeRow[]>([]);

  const [totalCounts, setTotalCounts] = useState<{ listings: number; purchases: number; sales: number } | null>(null);

  const [take] = useState(30);
  const [listingsSkip, setListingsSkip] = useState(0);
  const [purchasesSkip, setPurchasesSkip] = useState(0);
  const [salesSkip, setSalesSkip] = useState(0);

  const [loadingMore, setLoadingMore] = useState<{ l: boolean; p: boolean; s: boolean }>({ l: false, p: false, s: false });

  const canMoreListings = useMemo(() => {
    if (!totalCounts) return false;
    return listings.length < totalCounts.listings;
  }, [listings.length, totalCounts]);

  const canMorePurchases = useMemo(() => {
    if (!totalCounts) return false;
    return purchases.length < totalCounts.purchases;
  }, [purchases.length, totalCounts]);

  const canMoreSales = useMemo(() => {
    if (!totalCounts) return false;
    return sales.length < totalCounts.sales;
  }, [sales.length, totalCounts]);

  async function loadInitial() {
    setLoading(true);
    setErr(null);

    const ctrl = new AbortController();
    try {
      const url = `/api/u/${encodeURIComponent(userKey)}/activity?take=${take}&listingsSkip=0&purchasesSkip=0&salesSkip=0`;
      const j = await fetchJSON(url, ctrl.signal);

      setUser(j.user || null);
      setTotalCounts(j.totalCounts || null);

      setListings(Array.isArray(j.listings) ? j.listings : []);
      setPurchases(Array.isArray(j.purchases) ? j.purchases : []);
      setSales(Array.isArray(j.sales) ? j.sales : []);

      setListingsSkip((j.page?.next?.listingsSkip ?? (j.listings?.length ?? 0)) as number);
      setPurchasesSkip((j.page?.next?.purchasesSkip ?? (j.purchases?.length ?? 0)) as number);
      setSalesSkip((j.page?.next?.salesSkip ?? (j.sales?.length ?? 0)) as number);
    } catch (e: any) {
      setErr(e?.message || "Failed to load activity");
    } finally {
      setLoading(false);
    }

    return () => ctrl.abort();
  }

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userKey]);

  async function loadMore(kind: "l" | "p" | "s") {
    if (loadingMore[kind]) return;

    setLoadingMore((x) => ({ ...x, [kind]: true }));
    setErr(null);

    const lSkip = kind === "l" ? listingsSkip : listingsSkip;
    const pSkip = kind === "p" ? purchasesSkip : purchasesSkip;
    const sSkip = kind === "s" ? salesSkip : salesSkip;

    const url =
      `/api/u/${encodeURIComponent(userKey)}/activity?take=${take}` +
      `&listingsSkip=${kind === "l" ? listingsSkip : lSkip}` +
      `&purchasesSkip=${kind === "p" ? purchasesSkip : pSkip}` +
      `&salesSkip=${kind === "s" ? salesSkip : sSkip}`;

    try {
      const j = await fetchJSON(url);

      if (kind === "l") {
        const next = Array.isArray(j.listings) ? (j.listings as ListingRow[]) : [];
        setListings((prev) => [...prev, ...next]);
        setListingsSkip((j.page?.next?.listingsSkip ?? (listingsSkip + next.length)) as number);
      }
      if (kind === "p") {
        const next = Array.isArray(j.purchases) ? (j.purchases as TradeRow[]) : [];
        setPurchases((prev) => [...prev, ...next]);
        setPurchasesSkip((j.page?.next?.purchasesSkip ?? (purchasesSkip + next.length)) as number);
      }
      if (kind === "s") {
        const next = Array.isArray(j.sales) ? (j.sales as TradeRow[]) : [];
        setSales((prev) => [...prev, ...next]);
        setSalesSkip((j.page?.next?.salesSkip ?? (salesSkip + next.length)) as number);
      }

      if (j.totalCounts) setTotalCounts(j.totalCounts);
    } catch (e: any) {
      setErr(e?.message || "Failed to load more");
    } finally {
      setLoadingMore((x) => ({ ...x, [kind]: false }));
    }
  }

  const wrap = "rounded-[34px] p-px overflow-hidden bg-[linear-gradient(135deg,rgba(247,231,167,0.18),rgba(212,175,55,0.08),rgba(184,135,10,0.06))] shadow-[0_34px_140px_rgba(0,0,0,0.60)]";
  const card = "rounded-[34px] overflow-hidden border border-white/10 bg-[#0b0a09]/40 backdrop-blur-2xl ring-1 ring-black/10";

  return (
    <div className={wrap}>
      <div className={card}>
        <div className="p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 font-black">My Activity</div>
              <div className="mt-2 text-xl md:text-2xl font-black tracking-tight text-white/90 truncate">
                {user?.handle ? `@${user.handle}` : user?.publicId ? user.publicId : shortAddr(user?.walletAddress)}
              </div>
              <div className="mt-2 text-[12px] text-white/55">
                Listings, purchases and sales from on-chain indexer.
              </div>
            </div>

            <button
              onClick={() => loadInitial()}
              className={cx(
                "shrink-0 inline-flex items-center justify-center px-4 py-2 rounded-2xl",
                "border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition",
                "text-[12px] font-black text-amber-100/90 hover:text-amber-100"
              )}
            >
              Refresh
            </button>
          </div>

          {err ? (
            <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-[12px] text-rose-100">
              {err}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-6 text-white/60 text-[12px] font-semibold">Loading…</div>
          ) : null}

          {/* Counters */}
          {totalCounts ? (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Listings</div>
                <div className="mt-1 text-2xl font-black text-white/90">{totalCounts.listings}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Purchases</div>
                <div className="mt-1 text-2xl font-black text-white/90">{totalCounts.purchases}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Sales</div>
                <div className="mt-1 text-2xl font-black text-white/90">{totalCounts.sales}</div>
              </div>
            </div>
          ) : null}

          {/* LISTINGS */}
          <section className="mt-8">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[12px] font-black text-white/80 uppercase tracking-wider">Listings</div>
              {canMoreListings ? (
                <button
                  onClick={() => loadMore("l")}
                  className="px-4 py-2 rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition text-[12px] font-black text-amber-100/90"
                >
                  {loadingMore.l ? "Loading…" : "Load more"}
                </button>
              ) : null}
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {listings.map((x) => (
                <Link
                  key={x.id}
                  href={`/nft/${x.chainId}/${x.contract}/${x.tokenId}`}
                  className={cx(
                    "group rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition",
                    "p-4 flex gap-4"
                  )}
                >
                  <div className="h-14 w-14 rounded-2xl border border-white/10 bg-black/30 overflow-hidden shrink-0 flex items-center justify-center">
                    {x.mint?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={x.mint.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-[10px] font-black text-white/30">RL</div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-extrabold text-white/90 truncate">
                      {x.mint?.name || `Token #${x.tokenId}`}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-white/55">
                      <span className="font-mono">{shortAddr(x.contract)}</span>
                      <span>•</span>
                      <span className="font-mono">#{x.tokenId}</span>
                      <span>•</span>
                      <span className={cx("font-black", x.status === "ACTIVE" ? "text-emerald-200" : "text-white/55")}>
                        {x.status}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2 text-[12px]">
                      <div className="text-white/70">
                        Price:{" "}
                        <span className="font-black text-amber-100">
                          {fmtEth(x.pricePerUnitWei)} ETH
                        </span>
                      </div>
                      <div className="text-white/70">
                        Remaining:{" "}
                        <span className="font-black text-white/90">{fmtInt(x.amountRemaining)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {listings.length === 0 && !loading ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-[12px] text-white/60">
                  No listings yet.
                </div>
              ) : null}
            </div>
          </section>

          {/* PURCHASES */}
          <section className="mt-10">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[12px] font-black text-white/80 uppercase tracking-wider">Purchases</div>
              {canMorePurchases ? (
                <button
                  onClick={() => loadMore("p")}
                  className="px-4 py-2 rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition text-[12px] font-black text-amber-100/90"
                >
                  {loadingMore.p ? "Loading…" : "Load more"}
                </button>
              ) : null}
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {purchases.map((t) => (
                <Link
                  key={`${t.txHash}:${t.logIndex}`}
                  href={`/nft/${t.chainId}/${t.contract}/${t.tokenId}`}
                  className={cx(
                    "group rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition",
                    "p-4 flex gap-4"
                  )}
                >
                  <div className="h-14 w-14 rounded-2xl border border-white/10 bg-black/30 overflow-hidden shrink-0 flex items-center justify-center">
                    {t.mint?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.mint.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-[10px] font-black text-white/30">RL</div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-extrabold text-white/90 truncate">
                      {t.mint?.name || `Token #${t.tokenId}`}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-white/55">
                      <span className="font-mono">{shortAddr(t.contract)}</span>
                      <span>•</span>
                      <span className="font-mono">#{t.tokenId}</span>
                      <span>•</span>
                      <span className="font-black text-white/70">
                        from {shortAddr(t.counterpartyWallet)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2 text-[12px]">
                      <div className="text-white/70">
                        Total:{" "}
                        <span className="font-black text-amber-100">{fmtEth(t.totalPriceWei)} ETH</span>
                      </div>
                      <div className="text-white/70">
                        Amount:{" "}
                        <span className="font-black text-white/90">{fmtInt(t.amount)}</span>
                      </div>
                    </div>

                    <div className="mt-1 text-[11px] text-white/40">
                      {new Date(t.blockTime).toLocaleString("en-GB")}
                    </div>
                  </div>
                </Link>
              ))}

              {purchases.length === 0 && !loading ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-[12px] text-white/60">
                  No purchases yet.
                </div>
              ) : null}
            </div>
          </section>

          {/* SALES */}
          <section className="mt-10">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[12px] font-black text-white/80 uppercase tracking-wider">Sales</div>
              {canMoreSales ? (
                <button
                  onClick={() => loadMore("s")}
                  className="px-4 py-2 rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition text-[12px] font-black text-amber-100/90"
                >
                  {loadingMore.s ? "Loading…" : "Load more"}
                </button>
              ) : null}
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {sales.map((t) => (
                <Link
                  key={`${t.txHash}:${t.logIndex}`}
                  href={`/nft/${t.chainId}/${t.contract}/${t.tokenId}`}
                  className={cx(
                    "group rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition",
                    "p-4 flex gap-4"
                  )}
                >
                  <div className="h-14 w-14 rounded-2xl border border-white/10 bg-black/30 overflow-hidden shrink-0 flex items-center justify-center">
                    {t.mint?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.mint.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-[10px] font-black text-white/30">RL</div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-extrabold text-white/90 truncate">
                      {t.mint?.name || `Token #${t.tokenId}`}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-white/55">
                      <span className="font-mono">{shortAddr(t.contract)}</span>
                      <span>•</span>
                      <span className="font-mono">#{t.tokenId}</span>
                      <span>•</span>
                      <span className="font-black text-white/70">
                        to {shortAddr(t.counterpartyWallet)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2 text-[12px]">
                      <div className="text-white/70">
                        Total:{" "}
                        <span className="font-black text-amber-100">{fmtEth(t.totalPriceWei)} ETH</span>
                      </div>
                      <div className="text-white/70">
                        Amount:{" "}
                        <span className="font-black text-white/90">{fmtInt(t.amount)}</span>
                      </div>
                    </div>

                    <div className="mt-1 text-[11px] text-white/40">
                      {new Date(t.blockTime).toLocaleString("en-GB")}
                    </div>
                  </div>
                </Link>
              ))}

              {sales.length === 0 && !loading ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-[12px] text-white/60">
                  No sales yet.
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}