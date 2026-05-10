"use client";

import { Fragment, type ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";

type ActivityFilter = "all" | "minted" | "listed" | "sold" | "bought" | "traded" | "referred" | "qualified";

type SortMode =
  | "default"
  | "top_referrals"
  | "top_mints"
  | "top_listings"
  | "top_sold"
  | "top_bought"
  | "top_trades"
  | "top_points"
  | "newest"
  | "last_login";

type UserActivityItem = {
  id: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  blockTime?: string | null;
  chainId?: number | null;
  contract?: string | null;
  tokenId?: string | null;
  txHash?: string | null;
  buyTxHash?: string | null;
  side?: string | null;
  vertical?: string | null;
  sourceType?: string | null;
  orderKind?: string | null;
  amount?: string | null;
  unitPrice?: string | null;
  releasedAt?: string | null;
  refundedAt?: string | null;
  disputedAt?: string | null;
  confirmedAt?: string | null;
  buyerConfirmedAt?: string | null;
  name?: string | null;
  nftName?: string | null;
  status?: string | null;
  marketType?: string | null;
  marketplaceListingId?: string | null;
  marketplacePurchaseId?: string | null;
  sellerWallet?: string | null;
  buyerWallet?: string | null;
  counterpartyWallet?: string | null;
  totalPrice?: string | null;
  totalPriceWei?: string | null;
  pricePerUnitWei?: string | null;
  paymentToken?: string | null;
  escrowStatus?: string | null;
  deliveryStatus?: string | null;
  serviceStatus?: string | null;
  fulfillmentType?: string | null;
  category?: string | null;
  subcategory?: string | null;
  serviceCountry?: string | null;
  serviceCity?: string | null;
  listingsCount?: number;
  tradesCount?: number;
  adminHidden?: boolean;
};

type UserWalletRow = {
  id: string;
  address: string;
  shortAddress: string | null;
  chainId: number | null;
  kind: string;
  embeddedWalletProvider: string | null;
  isPrimary: boolean;
  label: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  lastIp: string | null;
};

type LoginEventRow = {
  id: string;
  createdAt: string | null;
  eventType: string;
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  userAgentShort: string | null;
  walletAddress: string | null;
  walletShort: string | null;
  authMethod: string | null;
  walletKind: string | null;
  embeddedWalletProvider: string | null;
  googleEmail: string | null;
  path: string | null;
};

type AdminUserRow = {
  id: string;
  createdAt: string | null;
  updatedAt: string | null;
  handle: string | null;
  publicId: string | null;
  displayName: string | null;
  mainAvatar: string | null;
  supportRole: "USER" | "MODERATOR" | "ADMIN";
  authMethod: string;
  walletKind: string;
  walletAddress: string;
  walletShort: string | null;
  walletChainId: number | null;
  embeddedWalletProvider: string | null;
  googleId: string | null;
  googleEmail: string | null;
  googleName: string | null;
  googleImage: string | null;
  twitterUser: string | null;
  twitterName: string | null;
  twitterImage: string | null;
  discordUser: string | null;
  discordName: string | null;
  discordImage: string | null;
  firstLoginAt: string | null;
  lastLoginAt: string | null;
  firstIp: string | null;
  lastIp: string | null;
  firstCountry: string | null;
  lastCountry: string | null;
  firstRegion: string | null;
  lastRegion: string | null;
  firstCity: string | null;
  lastCity: string | null;
  approvedPhysicalSeller: boolean;
  points: number;
  referralCode: string | null;
  referredById: string | null;
  referredAt: string | null;
  referredBy: {
    id: string;
    handle: string | null;
    publicId: string | null;
    walletAddress: string | null;
    walletShort: string | null;
    referralCode: string | null;
    label: string | null;
    avatar: string | null;
  } | null;
  qualified: boolean;
  counts: {
    mints: number;
    listings: number;
    ordersBought: number;
    ordersSold: number;
    tradesBought: number;
    tradesSold: number;
    wallets: number;
    loginEvents: number;
    referrals: number;
  };
  hasMintedNfts: boolean;
  hasCreatedListings: boolean;
  hasSoldGoodsOrServices: boolean;
  hasBoughtGoodsOrServices: boolean;
  linkedAccountCount: number;
  wallets: UserWalletRow[];
  latestEvents: LoginEventRow[];
  recentMints: UserActivityItem[];
  recentListings: UserActivityItem[];
  recentOrdersSold: UserActivityItem[];
  recentOrdersBought: UserActivityItem[];
  recentTradesSold: UserActivityItem[];
  recentTradesBought: UserActivityItem[];
};

type AdminUsersResponse = {
  ok: boolean;
  role: "MODERATOR" | "ADMIN";
  total: number;
  skip: number;
  take: number;
  summary: {
    totalUsers: number;
    googleUsers: number;
    walletUsers: number;
    embeddedUsers: number;
    externalUsers: number;
    adminUsers: number;
    moderatorUsers: number;
    usersWithMints: number;
    usersWithListings: number;
    usersWithSoldOrders: number;
    usersWithBoughtOrders: number;
    usersWithReferrals: number;
    usersReferred: number;
    qualifiedUsers: number;
    topIps30d: Array<{ ip: string | null; count: number }>;
  };
  items: AdminUserRow[];
};

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function titleCase(v?: string | null) {
  const s = String(v || "").trim();
  if (!s) return "—";
  return s
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

function shortAddr(addr?: string | null) {
  if (!addr) return "—";
  const s = String(addr);
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-6)}`;
}

function shortHash(v?: string | null) {
  if (!v) return "—";
  const s = String(v);
  if (s.length <= 14) return s;
  return `${s.slice(0, 10)}…${s.slice(-8)}`;
}

function paymentSymbol(paymentToken?: string | null) {
  return paymentToken ? "USDT" : "ETH";
}

function formatPaymentAmount(raw?: string | null, paymentToken?: string | null) {
  try {
    if (!raw) return "—";
    const decimals = paymentToken ? 6 : 18;
    const symbol = paymentSymbol(paymentToken);
    const v = formatUnits(BigInt(raw), decimals);
    const [a, b = ""] = v.split(".");
    const bb = b.slice(0, 4).replace(/0+$/, "");
    return `${bb ? `${a}.${bb}` : a} ${symbol}`;
  } catch {
    return raw ? `${raw} ${paymentSymbol(paymentToken)}` : "—";
  }
}

function userLabel(u: AdminUserRow) {
  return (
    u.displayName ||
    (u.handle ? `@${u.handle}` : null) ||
    u.twitterName ||
    u.discordName ||
    u.googleName ||
    u.googleEmail ||
    u.publicId ||
    shortAddr(u.walletAddress)
  );
}

function profileKey(u: Pick<AdminUserRow, "handle" | "publicId">) {
  return String(u.handle || u.publicId || "").trim();
}

function profileHref(u: Pick<AdminUserRow, "handle" | "publicId">) {
  const key = profileKey(u);
  return key ? `/app/profile/${encodeURIComponent(key)}` : null;
}

function profileNftsHref(u: Pick<AdminUserRow, "handle" | "publicId">) {
  const key = profileKey(u);
  return key ? `/app/profile/${encodeURIComponent(key)}/nfts` : null;
}

function locationLabel(u: AdminUserRow) {
  const country = u.lastCountry || u.firstCountry;
  const city = u.lastCity || u.firstCity;
  const region = u.lastRegion || u.firstRegion;
  return [city, region, country].filter(Boolean).join(", ") || "—";
}

function badgeTone(kind?: string | null) {
  const s = String(kind || "").toUpperCase();
  if (s === "ADMIN") return "border-[#d4af37]/30 bg-[#d4af37]/10 text-[#f5d76e]";
  if (s === "MODERATOR") return "border-sky-500/20 bg-sky-500/10 text-sky-100";
  if (s === "GOOGLE" || s === "EMBEDDED") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
  if (s === "WALLET" || s === "EXTERNAL") return "border-violet-500/20 bg-violet-500/10 text-violet-100";
  if (s.includes("DISPUT") || s.includes("REFUND")) return "border-rose-500/20 bg-rose-500/10 text-rose-100";
  if (s.includes("RELEASE") || s.includes("QUALIFIED") || s.includes("CONFIRM")) return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
  return "border-white/10 bg-white/[0.06] text-white/65";
}

function Badge({ children, tone }: { children: ReactNode; tone?: string | null }) {
  return (
    <span
      className={cx(
        "inline-flex rounded-full border px-2 py-[5px] text-[10px] font-semibold uppercase tracking-[0.14em] leading-none",
        badgeTone(tone)
      )}
    >
      {children}
    </span>
  );
}

function TinyStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function UserAvatar({ src, label }: { src?: string | null; label?: string | null }) {
  const initials =
    String(label || "R")
      .replace(/^@/, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x.charAt(0).toUpperCase())
      .join("") || "R";

  return (
    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10 text-xs">
      {src ? (
        <img src={src} alt={label || "avatar"} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-bold text-[#f5d76e]">{initials}</div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{children}</div>;
}

function KV({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 py-1.5 text-xs last:border-b-0">
      <div className="shrink-0 text-white/40">{label}</div>
      <div className="min-w-0 text-right text-white/75">{value}</div>
    </div>
  );
}

function EmptyMini({ text }: { text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs text-white/45">{text}</div>;
}

function MiniActivityList({ items, kind }: { items: UserActivityItem[]; kind: "mints" | "listings" | "orders" | "trades" }) {
  if (!items.length) return <EmptyMini text={`No ${kind} yet.`} />;

  return (
    <div className="space-y-2">
      {items.slice(0, 4).map((item) => {
        const top =
          kind === "mints"
            ? item.name || `Token #${item.tokenId}`
            : kind === "listings"
            ? item.nftName || `Token #${item.tokenId}`
            : `#${item.tokenId || "—"}`;

        return (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {kind === "mints" ? <Badge tone="MINTED">Mint</Badge> : null}
              {kind === "listings" && item.status ? <Badge tone={item.status}>{titleCase(item.status)}</Badge> : null}
              {kind === "orders" && item.escrowStatus ? <Badge tone={item.escrowStatus}>{titleCase(item.escrowStatus)}</Badge> : null}
              {kind === "trades" ? <Badge tone="TRADE">Trade</Badge> : null}
              {item.marketType ? <Badge tone={item.marketType}>{titleCase(item.marketType)}</Badge> : null}
            </div>
            <div className="mt-2 text-sm font-medium text-white">{top}</div>
            <div className="mt-1 grid gap-1 text-xs text-white/55">
              {kind === "mints" ? (
                <>
                  <KV label="Token" value={`#${item.tokenId || "—"} · ${shortAddr(item.contract)}`} />
                  <KV label="Tx" value={shortHash(item.txHash)} />
                </>
              ) : null}
              {kind === "listings" ? (
                <>
                  <KV label="Listing" value={item.marketplaceListingId || "—"} />
                  <KV label="Price" value={formatPaymentAmount(item.pricePerUnitWei, null)} />
                </>
              ) : null}
              {kind === "orders" ? (
                <>
                  <KV label="Amount" value={formatPaymentAmount(item.totalPrice, item.paymentToken)} />
                  <KV label="Buyer / Seller" value={`${shortAddr(item.buyerWallet)} / ${shortAddr(item.sellerWallet)}`} />
                </>
              ) : null}
              {kind === "trades" ? (
                <>
                  <KV label="Price" value={formatPaymentAmount(item.totalPriceWei, null)} />
                  <KV label="Tx" value={shortHash(item.txHash)} />
                </>
              ) : null}
              <KV label="Date" value={fmtDate(item.updatedAt || item.createdAt || item.blockTime)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LoginRows({ items }: { items: LoginEventRow[] }) {
  if (!items.length) return <EmptyMini text="No login events yet." />;
  return (
    <div className="space-y-2">
      {items.slice(0, 5).map((e) => (
        <div key={e.id} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs text-white/60">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={e.authMethod}>{e.authMethod || "login"}</Badge>
            {e.walletKind ? <Badge tone={e.walletKind}>{e.walletKind}</Badge> : null}
            {e.embeddedWalletProvider ? <Badge tone={e.embeddedWalletProvider}>{e.embeddedWalletProvider}</Badge> : null}
          </div>
          <div className="mt-2 grid gap-1">
            <KV label="When" value={fmtDate(e.createdAt)} />
            <KV label="IP" value={e.ip || "—"} />
            <KV label="Geo" value={[e.city, e.region, e.country].filter(Boolean).join(", ") || "—"} />
            <KV label="Wallet" value={e.walletShort || shortAddr(e.walletAddress)} />
          </div>
        </div>
      ))}
    </div>
  );
}

async function fetchJSON<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j) throw new Error(j?.error || "request_failed");
  return j as T;
}

export default function AdminUsersClient() {
  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [summary, setSummary] = useState<AdminUsersResponse["summary"] | null>(null);
  const [total, setTotal] = useState(0);
  const [role, setRole] = useState<"MODERATOR" | "ADMIN" | null>(null);
  const [q, setQ] = useState("");
  const [activity, setActivity] = useState<ActivityFilter>("all");
  const [sort, setSort] = useState<SortMode>("default");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (activity !== "all") p.set("activity", activity);
    p.set("take", "80");
    return p.toString();
  }, [q, activity]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const j = await fetchJSON<AdminUsersResponse>(`/api/admin/users?${query}`);
      setItems(j.items || []);
      setSummary(j.summary);
      setTotal(j.total || 0);
      setRole(j.role || null);
    } catch (e: any) {
      setError(e?.message || "Unable to load admin users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function copy(text?: string | null, key?: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key || text);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      // noop
    }
  }

  const sortedItems = useMemo(() => {
    const toTime = (v?: string | null) => {
      if (!v) return 0;
      const n = new Date(v).getTime();
      return Number.isFinite(n) ? n : 0;
    };

    const score = (u: AdminUserRow) => {
      if (sort === "top_referrals") return u.counts.referrals;
      if (sort === "top_mints") return u.counts.mints;
      if (sort === "top_listings") return u.counts.listings;
      if (sort === "top_sold") return u.counts.ordersSold + u.counts.tradesSold;
      if (sort === "top_bought") return u.counts.ordersBought + u.counts.tradesBought;
      if (sort === "top_trades") return u.counts.tradesBought + u.counts.tradesSold;
      if (sort === "top_points") return u.points || 0;
      if (sort === "newest") return toTime(u.createdAt);
      if (sort === "last_login") return toTime(u.lastLoginAt);
      return 0;
    };

    if (sort === "default") return items;
    return [...items].sort((a, b) => score(b) - score(a));
  }, [items, sort]);


  return (
    <div className="space-y-4 rounded-[28px] border border-white/10 bg-[#0b0a09]/60 p-4 backdrop-blur-2xl xl:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f5d76e]">
            Users intelligence
          </div>
          <h2 className="mt-2 text-xl font-semibold text-white">Compact users dashboard</h2>
          <p className="mt-1 text-sm text-white/60">
            Dense operator view: more users on one screen. Expand only when you need full details.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={role}>{role || "—"}</Badge>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/80 transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            Refresh
          </button>
        </div>
      </div>

      {summary ? (
        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-8">
          <TinyStat label="All" value={summary.totalUsers} />
          <TinyStat label="Qualified" value={summary.qualifiedUsers} />
          <TinyStat label="Minted" value={summary.usersWithMints} />
          <TinyStat label="Listed" value={summary.usersWithListings} />
          <TinyStat label="Sold" value={summary.usersWithSoldOrders} />
          <TinyStat label="Bought" value={summary.usersWithBoughtOrders} />
          <TinyStat label="Referred" value={summary.usersReferred} />
          <TinyStat label="Codes" value={summary.usersWithReferrals} />
        </div>
      ) : null}

      {summary?.topIps30d?.length ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.16em] text-white/40">Top IPs</span>
          {summary.topIps30d.map((x) => (
            <button
              key={`${x.ip}-${x.count}`}
              type="button"
              onClick={() => setQ(x.ip || "")}
              className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-white/70 transition hover:border-[#d4af37]/30 hover:text-white"
            >
              {x.ip || "unknown"} · {x.count}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-2 xl:grid-cols-[1fr_auto]">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search handle, wallet, email, IP, country, token id, tx..."
          className="min-h-[42px] rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#d4af37]/40"
        />

        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="min-h-[38px] rounded-xl border border-[#d4af37]/25 bg-black/40 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f5d76e] outline-none"
            title="Sort users"
          >
            <option value="default">Default</option>
            <option value="top_referrals">Top referrals</option>
            <option value="top_mints">Top mints</option>
            <option value="top_listings">Top listings</option>
            <option value="top_sold">Top sold</option>
            <option value="top_bought">Top bought</option>
            <option value="top_trades">Top trades</option>
            <option value="top_points">Top points</option>
            <option value="newest">Newest</option>
            <option value="last_login">Last login</option>
          </select>

          {(["all", "qualified", "referred", "minted", "listed", "sold", "bought", "traded"] as ActivityFilter[]).map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => setActivity(x)}
              className={cx(
                "rounded-xl border px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition",
                activity === x
                  ? "border-[#d4af37]/35 bg-[#d4af37]/10 text-[#f5d76e]"
                  : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/20 hover:text-white/80"
              )}
            >
              {x}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-white/65">Loading users...</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-white/65">No users found for this filter.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03]">
            <table className="min-w-[1320px] w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[#12100d] text-[10px] uppercase tracking-[0.16em] text-white/45">
                <tr>
                  <th className="px-3 py-3 font-semibold">User</th>
                  <th className="px-3 py-3 font-semibold">Wallet / Profile</th>
                  <th className="px-3 py-3 font-semibold">Social</th>
                  <th className="px-3 py-3 font-semibold">Referral</th>
                  <th className="px-3 py-3 font-semibold">Activity</th>
                  <th className="px-3 py-3 font-semibold">Geo / IP</th>
                  <th className="px-3 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((u) => {
                  const isOpen = expanded === u.id;
                  const publicProfileHref = profileHref(u);
                  const publicProfileNftsHref = profileNftsHref(u);
                  const soldTrades = u.counts.tradesSold;
                  const boughtTrades = u.counts.tradesBought;
                  const soldOrders = u.counts.ordersSold;
                  const boughtOrders = u.counts.ordersBought;
                  const socials = [
                    u.twitterUser ? `X @${u.twitterUser}` : null,
                    u.discordUser ? `DC ${u.discordUser}` : null,
                    u.googleEmail || null,
                  ].filter(Boolean);

                  return (
                    <Fragment key={u.id}>
                      <tr key={u.id} className="border-t border-white/8 align-top hover:bg-white/[0.025]">
                        <td className="px-3 py-3">
                          <div className="flex items-start gap-3">
                            <UserAvatar src={u.mainAvatar} label={userLabel(u)} />
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-white">{userLabel(u)}</div>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                <Badge tone={u.supportRole}>{u.supportRole}</Badge>
                                <Badge tone={u.authMethod}>{u.authMethod}</Badge>
                                <Badge tone={u.walletKind}>{u.walletKind}</Badge>
                                {u.embeddedWalletProvider ? <Badge tone={u.embeddedWalletProvider}>{u.embeddedWalletProvider}</Badge> : null}
                                {u.qualified ? <Badge tone="QUALIFIED">Qualified</Badge> : <Badge>Not qualified</Badge>}
                              </div>
                              <div className="mt-1 font-mono text-[11px] text-white/45">{u.id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div className="space-y-1.5">
                            <button
                              type="button"
                              onClick={() => void copy(u.walletAddress, `${u.id}-wallet`)}
                              className="block font-mono text-xs text-white/80 transition hover:text-[#f5d76e]"
                            >
                              {u.walletAddress}
                            </button>
                            <div className="text-[11px] text-white/45">{copied === `${u.id}-wallet` ? "Copied" : shortAddr(u.walletAddress)}</div>
                            <div className="text-xs text-white/65">Handle: {u.handle ? `@${u.handle}` : "—"}</div>
                            <div className="text-xs text-white/45">Public ID: {u.publicId || "—"}</div>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div className="space-y-1.5 text-xs text-white/70">
                            {socials.length ? socials.map((s) => <div key={s}>{s}</div>) : <div className="text-white/40">No socials</div>}
                            <div className="text-white/45">Points: {u.points}</div>
                            <div className="text-white/45">Wallets: {u.counts.wallets} · Logins: {u.counts.loginEvents}</div>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div className="space-y-1.5 text-xs">
                            <div className="text-white/70">Own code: <span className="font-mono text-white">{u.referralCode || "—"}</span></div>
                            <div className="text-white/70">From: <span className="text-white">{u.referredBy?.label || "No referral"}</span></div>
                            <div className="text-white/45">Invited: {u.counts.referrals}</div>
                            <div className="text-white/45">At: {fmtDate(u.referredAt)}</div>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/70">
                            <div>Mints: <span className="font-semibold text-white">{u.counts.mints}</span></div>
                            <div>Listings: <span className="font-semibold text-white">{u.counts.listings}</span></div>
                            <div>Sold: <span className="font-semibold text-white">{soldOrders}</span></div>
                            <div>Bought: <span className="font-semibold text-white">{boughtOrders}</span></div>
                            <div>Tr sold: <span className="font-semibold text-white">{soldTrades}</span></div>
                            <div>Tr bought: <span className="font-semibold text-white">{boughtTrades}</span></div>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div className="space-y-1.5 text-xs text-white/70">
                            <div>{locationLabel(u)}</div>
                            <div className="font-mono text-white/55">Last IP: {u.lastIp || "—"}</div>
                            <div className="text-white/45">Last login: {fmtDate(u.lastLoginAt)}</div>
                            <div className="text-white/45">Joined: {fmtDate(u.createdAt)}</div>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => setExpanded(isOpen ? null : u.id)}
                              className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/80 transition hover:border-white/20 hover:bg-white/[0.08]"
                            >
                              {isOpen ? "Hide details" : "Open details"}
                            </button>

                            {publicProfileHref ? (
                              <a href={publicProfileHref} target="_blank" rel="noreferrer" className="rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/10 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-[#f5d76e] transition hover:bg-[#d4af37]/15">
                                Profile ↗
                              </a>
                            ) : null}
                            {publicProfileNftsHref ? (
                              <a href={publicProfileNftsHref} target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-white/75 transition hover:border-white/20 hover:text-white">
                                NFTs ↗
                              </a>
                            ) : null}
                          </div>
                        </td>
                      </tr>

                      {isOpen ? (
                        <tr className="border-t border-white/8 bg-black/20">
                          <td colSpan={7} className="px-3 py-4">
                            <div className="grid gap-3 xl:grid-cols-3">
                              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                <SectionTitle>Wallets</SectionTitle>
                                <div className="space-y-2">
                                  {(u.wallets.length ? u.wallets : [{
                                    id: `${u.id}-primary`,
                                    address: u.walletAddress,
                                    shortAddress: u.walletShort,
                                    chainId: u.walletChainId,
                                    kind: u.walletKind,
                                    embeddedWalletProvider: u.embeddedWalletProvider,
                                    isPrimary: true,
                                    label: "Primary wallet",
                                    firstSeenAt: u.firstLoginAt,
                                    lastSeenAt: u.lastLoginAt,
                                    lastIp: u.lastIp,
                                  }]).map((w) => (
                                    <div key={w.id} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs text-white/60">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge tone={w.kind}>{w.kind}</Badge>
                                        {w.embeddedWalletProvider ? <Badge tone={w.embeddedWalletProvider}>{w.embeddedWalletProvider}</Badge> : null}
                                        {w.isPrimary ? <Badge tone="ADMIN">Primary</Badge> : null}
                                      </div>
                                      <button type="button" onClick={() => void copy(w.address, `${w.id}-address`)} className="mt-2 block w-full break-all text-left font-mono text-white/80 hover:text-[#f5d76e]">
                                        {w.address}
                                      </button>
                                      <div className="mt-1 text-[11px] text-white/45">{copied === `${w.id}-address` ? "Copied" : `${fmtDate(w.firstSeenAt)} → ${fmtDate(w.lastSeenAt)}`}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                <SectionTitle>Latest logins / IP</SectionTitle>
                                <LoginRows items={u.latestEvents} />
                              </div>

                              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                <SectionTitle>Referral / identity</SectionTitle>
                                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs text-white/60">
                                  <KV label="Own code" value={<span className="font-mono text-white">{u.referralCode || "—"}</span>} />
                                  <KV label="Referred by" value={u.referredBy?.label || "No referral"} />
                                  <KV label="Source code" value={<span className="font-mono text-white">{u.referredBy?.referralCode || "—"}</span>} />
                                  <KV label="Invited users" value={u.counts.referrals} />
                                  <KV label="Qualified" value={u.qualified ? "Yes" : "No"} />
                                  <KV label="Location" value={locationLabel(u)} />
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 grid gap-3 xl:grid-cols-2">
                              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                <SectionTitle>Recent minted NFTs</SectionTitle>
                                <MiniActivityList items={u.recentMints} kind="mints" />
                              </div>
                              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                <SectionTitle>Recent listings</SectionTitle>
                                <MiniActivityList items={u.recentListings} kind="listings" />
                              </div>
                            </div>

                            <div className="mt-3 grid gap-3 xl:grid-cols-2">
                              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                <SectionTitle>Goods / services orders</SectionTitle>
                                <MiniActivityList items={[...u.recentOrdersSold, ...u.recentOrdersBought].slice(0, 4)} kind="orders" />
                              </div>
                              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                <SectionTitle>Trading activity</SectionTitle>
                                <MiniActivityList items={[...u.recentTradesSold, ...u.recentTradesBought].slice(0, 4)} kind="trades" />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-white/45">Showing {sortedItems.length} users in current filter. Total matched: {total}. Sort: {sort.replace(/_/g, " ")}.</div>
        </>
      )}
    </div>
  );
}
