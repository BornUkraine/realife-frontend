"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  marketType?: "STANDARD" | "PROTECTED" | null;
  fulfillmentType?: string | null;
  category?: string | null;
  subcategory?: string | null;
  serviceCountry?: string | null;
  serviceCity?: string | null;
  serviceArea?: string | null;
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
  marketType?: "STANDARD" | "PROTECTED" | null;
  fulfillmentType?: string | null;
  category?: string | null;
  subcategory?: string | null;
  serviceCountry?: string | null;
  serviceCity?: string | null;
  serviceArea?: string | null;
};

type TotalCounts = {
  listings: number;
  purchases: number;
  sales: number;
};

type ActivityResponse = {
  user?: ActivityUser | null;
  totalCounts?: TotalCounts | null;
  listings?: ListingRow[];
  purchases?: TradeRow[];
  sales?: TradeRow[];
  page?: {
    next?: {
      listingsSkip?: number;
      purchasesSkip?: number;
      salesSkip?: number;
    };
  };
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

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtLastUpdated(ts: number | null) {
  if (!ts) return "Not synced yet";
  const diff = Math.max(0, Date.now() - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return "Updated just now";
  if (sec < 60) return `Updated ${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `Updated ${min}m ago`;
  const hr = Math.floor(min / 60);
  return `Updated ${hr}h ago`;
}

function mergeUnique<T>(prev: T[], next: T[], keyOf: (x: T) => string) {
  const seen = new Set(prev.map(keyOf));
  const out = [...prev];
  for (const item of next) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
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

function fulfillmentTypeLabel(v?: string | null) {
  const x = String(v || "").trim().toUpperCase();
  if (!x) return null;
  return x.replaceAll("_", " ");
}

function protectedBadgeClass(v?: string | null) {
  const x = String(v || "").trim().toUpperCase();
  if (x === "LOCAL_SERVICE") return "border-sky-500/20 bg-sky-500/10 text-sky-100";
  if (x === "ONLINE_SESSION") return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  if (x === "DIGITAL_SERVICE") return "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-100";
  if (x === "PHYSICAL_GOOD") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
  return "border-violet-500/20 bg-violet-500/10 text-violet-100";
}

/* ---------------- IPFS -> HTTP (for mint.image safety) ---------------- */

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

  if (u.startsWith("/ipfs/")) return `${PRIMARY_IPFS_ORIGIN}${u}`;
  if (u.startsWith("Qm") || u.startsWith("bafy")) return `${gw}${u}`;

  return u;
}

/* ---------------------------------------------------------------------- */

async function fetchJSON(url: string, signal?: AbortSignal) {
  const r = await fetch(url, { signal, cache: "no-store" });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j) throw new Error(j?.error || "fetch_failed");
  return j as ActivityResponse;
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "gold";
}) {
  return (
    <div
      className={cx(
        "rounded-[24px] border p-4 transition-all duration-200",
        tone === "gold"
          ? "border-amber-500/15 bg-[linear-gradient(180deg,rgba(212,175,55,0.10),rgba(255,255,255,0.03))]"
          : "border-white/8 bg-white/[0.035]"
      )}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
        {label}
      </div>
      <div className="mt-2 text-[26px] font-black leading-none text-white/92">
        {value}
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
      <div className="h-3 w-20 rounded-full bg-white/8" />
      <div className="mt-3 h-8 w-16 rounded-full bg-white/10" />
    </div>
  );
}

function MediaThumb({ img, label }: { img: string | null; label: string }) {
  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[18px] border border-white/10 bg-black/35">
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt={label}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-white/30">
          RL
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.28),transparent_60%)]" />
    </div>
  );
}

function SectionHeader({
  title,
  count,
  canMore,
  loadingMore,
  onLoadMore,
}: {
  title: string;
  count: number | null;
  canMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="text-[12px] font-black uppercase tracking-[0.2em] text-white/75">
          {title}
        </div>
        {count !== null ? (
          <div className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-bold text-white/50">
            {count}
          </div>
        ) : null}
      </div>

      {canMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore}
          className={cx(
            "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-[12px] font-black transition-all duration-200",
            "border border-white/12 bg-white/[0.05] text-amber-100/90",
            loadingMore
              ? "cursor-default opacity-70"
              : "hover:-translate-y-[1px] hover:bg-white/[0.09] hover:text-amber-100"
          )}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </div>
  );
}

function EmptyCard({
  title,
  text,
  actionHref,
  actionLabel,
}: {
  title: string;
  text: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.025] p-5 text-[12px] text-white/52">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/42">{title}</div>
      <div className="mt-2 leading-relaxed">{text}</div>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-2 text-[12px] font-black text-amber-100/90 transition hover:-translate-y-[1px] hover:bg-white/[0.09] hover:text-amber-100"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

function EmptyOverview() {
  return (
    <div className="mt-6 overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,rgba(247,231,167,0.16),rgba(212,175,55,0.07),rgba(184,135,10,0.05))] p-px shadow-[0_20px_70px_rgba(0,0,0,0.42)]">
      <div className="rounded-[28px] border border-white/10 bg-[#0b0a09]/40 p-6 text-center backdrop-blur-2xl">
        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/40">Activity feed</div>
        <div className="mt-3 text-xl font-black tracking-tight text-white/90">No marketplace activity yet</div>
        <div className="mx-auto mt-2 max-w-xl text-[13px] leading-relaxed text-white/55">
          Your listings, purchases and sales will appear here after the first onchain actions are indexed.
        </div>
      </div>
    </div>
  );
}

function ListingCard({ row }: { row: ListingRow }) {
  const img = ipfsToHttp(row.mint?.image) || null;

  return (
    <Link
      href={`/nft/${row.chainId}/${row.contract}/${row.tokenId}`}
      className={cx(
        "group relative overflow-hidden rounded-[26px] border border-white/9 bg-white/[0.035] p-4",
        "transition-all duration-200 hover:-translate-y-[2px] hover:border-white/14 hover:bg-white/[0.06]"
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <div className="flex gap-4">
        <MediaThumb img={img} label={row.mint?.name || `Token #${row.tokenId}`} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold text-white/92">
                {row.mint?.name || `Token #${row.tokenId}`}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-white/52">
                <span className="font-mono">{shortAddr(row.contract)}</span>
                <span>•</span>
                <span className="font-mono">#{row.tokenId}</span>
              </div>
            </div>

            <div
              className={cx(
                "rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.18em]",
                row.status === "ACTIVE"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
                  : row.status === "SOLD_OUT"
                  ? "border-amber-500/18 bg-amber-500/10 text-amber-100"
                  : "border-white/10 bg-white/[0.05] text-white/55"
              )}
            >
              {row.status}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-2xl border border-white/8 bg-black/18 px-3 py-2 text-white/68">
              Price: <span className="font-black text-amber-100">{fmtEth(row.pricePerUnitWei)} ETH</span>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/18 px-3 py-2 text-white/68">
              Remaining: <span className="font-black text-white/92">{fmtInt(row.amountRemaining)}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {row.marketType === "PROTECTED" ? (
              <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[10px] font-black text-violet-100">
                PROTECTED
              </span>
            ) : null}
            {fulfillmentTypeLabel(row.fulfillmentType) ? (
              <span className={cx("rounded-full border px-2 py-1 text-[10px] font-black", protectedBadgeClass(row.fulfillmentType))}>
                {fulfillmentTypeLabel(row.fulfillmentType)}
              </span>
            ) : null}
            {formatServiceLocation(row) ? (
              <span className="max-w-full truncate rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-[10px] font-black text-sky-100">
                {formatServiceLocation(row)}
              </span>
            ) : null}
          </div>

          <div className="mt-2 text-[11px] text-white/38">Created {fmtDate(row.createdAt)}</div>
        </div>
      </div>
    </Link>
  );
}

function TradeCard({ row, direction }: { row: TradeRow; direction: "from" | "to" }) {
  const img = ipfsToHttp(row.mint?.image) || null;

  return (
    <Link
      href={`/nft/${row.chainId}/${row.contract}/${row.tokenId}`}
      className={cx(
        "group relative overflow-hidden rounded-[26px] border border-white/9 bg-white/[0.035] p-4",
        "transition-all duration-200 hover:-translate-y-[2px] hover:border-white/14 hover:bg-white/[0.06]"
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <div className="flex gap-4">
        <MediaThumb img={img} label={row.mint?.name || `Token #${row.tokenId}`} />

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-extrabold text-white/92">
            {row.mint?.name || `Token #${row.tokenId}`}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-white/52">
            <span className="font-mono">{shortAddr(row.contract)}</span>
            <span>•</span>
            <span className="font-mono">#{row.tokenId}</span>
            <span>•</span>
            <span className="font-black text-white/68">
              {direction} {shortAddr(row.counterpartyWallet)}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-2xl border border-white/8 bg-black/18 px-3 py-2 text-white/68">
              Total: <span className="font-black text-amber-100">{fmtEth(row.totalPriceWei)} ETH</span>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/18 px-3 py-2 text-white/68">
              Amount: <span className="font-black text-white/92">{fmtInt(row.amount)}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {row.marketType === "PROTECTED" ? (
              <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[10px] font-black text-violet-100">
                PROTECTED
              </span>
            ) : null}
            {fulfillmentTypeLabel(row.fulfillmentType) ? (
              <span className={cx("rounded-full border px-2 py-1 text-[10px] font-black", protectedBadgeClass(row.fulfillmentType))}>
                {fulfillmentTypeLabel(row.fulfillmentType)}
              </span>
            ) : null}
            {formatServiceLocation(row) ? (
              <span className="max-w-full truncate rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-[10px] font-black text-sky-100">
                {formatServiceLocation(row)}
              </span>
            ) : null}
          </div>

          <div className="mt-2 text-[11px] text-white/38">{fmtDate(row.blockTime)}</div>
        </div>
      </div>
    </Link>
  );
}

function SkeletonRow() {
  return (
    <div className="overflow-hidden rounded-[26px] border border-white/8 bg-white/[0.03] p-4">
      <div className="flex gap-4">
        <div className="h-14 w-14 shrink-0 rounded-[18px] bg-white/8" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-2/3 rounded-full bg-white/10" />
          <div className="h-3 w-1/2 rounded-full bg-white/8" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-9 rounded-2xl bg-white/7" />
            <div className="h-9 rounded-2xl bg-white/7" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ActivityPanel({ userKey }: { userKey: string }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [user, setUser] = useState<ActivityUser | null>(null);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [purchases, setPurchases] = useState<TradeRow[]>([]);
  const [sales, setSales] = useState<TradeRow[]>([]);
  const [totalCounts, setTotalCounts] = useState<TotalCounts | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const [take] = useState(30);
  const [listingsSkip, setListingsSkip] = useState(0);
  const [purchasesSkip, setPurchasesSkip] = useState(0);
  const [salesSkip, setSalesSkip] = useState(0);

  const [loadingMore, setLoadingMore] = useState<{ l: boolean; p: boolean; s: boolean }>({
    l: false,
    p: false,
    s: false,
  });

  const abortRef = useRef<AbortController | null>(null);
  const hasLoadedOnceRef = useRef(false);

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

  const loadInitial = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent);
      const isFirstPaint = !hasLoadedOnceRef.current && !silent;

      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setErr(null);
      if (isFirstPaint) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const url = `/api/u/${encodeURIComponent(
          userKey
        )}/activity?take=${take}&listingsSkip=0&purchasesSkip=0&salesSkip=0`;
        const j = await fetchJSON(url, ctrl.signal);
        if (ctrl.signal.aborted) return;

        setUser(j.user || null);
        setTotalCounts(j.totalCounts || null);
        setListings(Array.isArray(j.listings) ? j.listings : []);
        setPurchases(Array.isArray(j.purchases) ? j.purchases : []);
        setSales(Array.isArray(j.sales) ? j.sales : []);

        setListingsSkip(
          Number(j.page?.next?.listingsSkip ?? j.listings?.length ?? 0)
        );
        setPurchasesSkip(
          Number(j.page?.next?.purchasesSkip ?? j.purchases?.length ?? 0)
        );
        setSalesSkip(Number(j.page?.next?.salesSkip ?? j.sales?.length ?? 0));
        setLastUpdatedAt(Date.now());
        hasLoadedOnceRef.current = true;
      } catch (e: any) {
        if (ctrl.signal.aborted) return;
        setErr(e?.message || "Failed to load activity");
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
        if (isFirstPaint) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [take, userKey]
  );

  useEffect(() => {
    void loadInitial();
    return () => abortRef.current?.abort();
  }, [loadInitial]);

  useEffect(() => {
    const onFocus = () => {
      if (!hasLoadedOnceRef.current) return;
      void loadInitial({ silent: true });
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadInitial]);

  async function loadMore(kind: "l" | "p" | "s") {
    if (loadingMore[kind]) return;

    setLoadingMore((x) => ({ ...x, [kind]: true }));
    setErr(null);

    const url =
      `/api/u/${encodeURIComponent(userKey)}/activity?take=${take}` +
      `&listingsSkip=${encodeURIComponent(String(listingsSkip))}` +
      `&purchasesSkip=${encodeURIComponent(String(purchasesSkip))}` +
      `&salesSkip=${encodeURIComponent(String(salesSkip))}`;

    try {
      const j = await fetchJSON(url);

      if (kind === "l") {
        const next = Array.isArray(j.listings) ? j.listings : [];
        setListings((prev) => mergeUnique(prev, next, (x) => x.id));
        setListingsSkip(
          Number(j.page?.next?.listingsSkip ?? listingsSkip + next.length)
        );
      }

      if (kind === "p") {
        const next = Array.isArray(j.purchases) ? j.purchases : [];
        setPurchases((prev) =>
          mergeUnique(prev, next, (x) => `${x.txHash}:${x.logIndex}`)
        );
        setPurchasesSkip(
          Number(j.page?.next?.purchasesSkip ?? purchasesSkip + next.length)
        );
      }

      if (kind === "s") {
        const next = Array.isArray(j.sales) ? j.sales : [];
        setSales((prev) =>
          mergeUnique(prev, next, (x) => `${x.txHash}:${x.logIndex}`)
        );
        setSalesSkip(Number(j.page?.next?.salesSkip ?? salesSkip + next.length));
      }

      if (j.totalCounts) setTotalCounts(j.totalCounts);
      setLastUpdatedAt(Date.now());
    } catch (e: any) {
      setErr(e?.message || "Failed to load more");
    } finally {
      setLoadingMore((x) => ({ ...x, [kind]: false }));
    }
  }

  const allEmpty =
    !loading &&
    (totalCounts?.listings ?? 0) === 0 &&
    (totalCounts?.purchases ?? 0) === 0 &&
    (totalCounts?.sales ?? 0) === 0;

  const wrap =
    "overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,rgba(247,231,167,0.16),rgba(212,175,55,0.07),rgba(184,135,10,0.05))] p-px shadow-[0_28px_110px_rgba(0,0,0,0.55)]";
  const card =
    "overflow-hidden rounded-[34px] border border-white/9 bg-[#0b0a09]/38 ring-1 ring-black/10 backdrop-blur-2xl";

  return (
    <div className={wrap}>
      <div className={card}>
        <div className="p-6 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
                  My Activity
                </div>
                <div
                  className={cx(
                    "rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.16em]",
                    refreshing
                      ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
                      : "border-emerald-500/18 bg-emerald-500/10 text-emerald-100"
                  )}
                >
                  {refreshing ? "SYNCING" : "LIVE"}
                </div>
              </div>

              <div className="mt-2 truncate text-xl font-black tracking-tight text-white/92 md:text-2xl">
                {user?.handle
                  ? `@${user.handle}`
                  : user?.publicId
                  ? user.publicId
                  : shortAddr(user?.walletAddress)}
              </div>

              <div className="mt-2 text-[12px] text-white/54">
                Listings, purchases and sales from on-chain indexer.
              </div>
              <div className="mt-1 text-[11px] text-white/35">
                {fmtLastUpdated(lastUpdatedAt)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadInitial({ silent: true })}
              disabled={refreshing}
              className={cx(
                "inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-[12px] font-black transition-all duration-200",
                "border border-white/12 bg-white/[0.05] text-amber-100/90",
                refreshing
                  ? "cursor-default opacity-75"
                  : "hover:-translate-y-[1px] hover:bg-white/[0.10] hover:text-amber-100"
              )}
            >
              <span
                className={cx(
                  "inline-block h-2 w-2 rounded-full bg-amber-200 transition-opacity",
                  refreshing ? "animate-pulse opacity-100" : "opacity-70"
                )}
              />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {err ? (
            <div className="mt-5 rounded-[22px] border border-rose-500/20 bg-rose-500/10 p-4 text-[12px] text-rose-100">
              {err}
            </div>
          ) : null}

          {refreshing && !loading ? (
            <div className="mt-5 rounded-[22px] border border-amber-500/18 bg-amber-500/10 p-4 text-[12px] text-amber-100">
              Syncing latest indexer activity… your cards stay visible while the feed refreshes.
            </div>
          ) : null}

          {loading ? (
            <>
              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
              </div>

              <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
                <SkeletonRow />
                <SkeletonRow />
              </div>
            </>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                <StatCard label="Listings" value={totalCounts?.listings ?? 0} tone="gold" />
                <StatCard label="Purchases" value={totalCounts?.purchases ?? 0} />
                <StatCard label="Sales" value={totalCounts?.sales ?? 0} />
              </div>

              {allEmpty ? <EmptyOverview /> : null}

              <section className="mt-8">
                <SectionHeader
                  title="Listings"
                  count={totalCounts?.listings ?? null}
                  canMore={canMoreListings}
                  loadingMore={loadingMore.l}
                  onLoadMore={() => void loadMore("l")}
                />

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {listings.map((row) => (
                    <ListingCard key={row.id} row={row} />
                  ))}

                  {listings.length === 0 ? (
                    <EmptyCard
                      title="No active listings"
                      text="Create your first listing and it will appear here with live indexer updates."
                      actionHref="/app/trading"
                      actionLabel="Open trading"
                    />
                  ) : null}
                </div>
              </section>

              <section className="mt-10">
                <SectionHeader
                  title="Purchases"
                  count={totalCounts?.purchases ?? null}
                  canMore={canMorePurchases}
                  loadingMore={loadingMore.p}
                  onLoadMore={() => void loadMore("p")}
                />

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {purchases.map((row) => (
                    <TradeCard key={`${row.txHash}:${row.logIndex}`} row={row} direction="from" />
                  ))}

                  {purchases.length === 0 ? (
                    <EmptyCard
                      title="No purchases yet"
                      text="Once you buy an NFT, the purchase will show up here together with price and counterparty details."
                    />
                  ) : null}
                </div>
              </section>

              <section className="mt-10">
                <SectionHeader
                  title="Sales"
                  count={totalCounts?.sales ?? null}
                  canMore={canMoreSales}
                  loadingMore={loadingMore.s}
                  onLoadMore={() => void loadMore("s")}
                />

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {sales.map((row) => (
                    <TradeCard key={`${row.txHash}:${row.logIndex}`} row={row} direction="to" />
                  ))}

                  {sales.length === 0 ? (
                    <EmptyCard
                      title="No sales yet"
                      text="When one of your listings sells, the sale will appear here with the latest onchain timestamp."
                    />
                  ) : null}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}