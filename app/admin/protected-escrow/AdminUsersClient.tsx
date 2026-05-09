"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";

type ActivityFilter = "all" | "minted" | "listed" | "sold" | "bought" | "traded";

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
  twitterUser: string | null;
  discordUser: string | null;
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
  counts: {
    mints: number;
    listings: number;
    ordersBought: number;
    ordersSold: number;
    tradesBought: number;
    tradesSold: number;
    wallets: number;
    loginEvents: number;
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
  return d.toLocaleString("en-GB");
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
    const bb = b.slice(0, 6).replace(/0+$/, "");
    return `${bb ? `${a}.${bb}` : a} ${symbol}`;
  } catch {
    return raw ? `${raw} ${paymentSymbol(paymentToken)}` : "—";
  }
}

function userLabel(u: AdminUserRow) {
  if (u.handle) return `@${u.handle}`;
  if (u.googleName) return u.googleName;
  if (u.googleEmail) return u.googleEmail;
  if (u.publicId) return u.publicId;
  return shortAddr(u.walletAddress);
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
  if (s.includes("RELEASE") || s.includes("CONFIRM")) return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
  return "border-white/10 bg-white/[0.06] text-white/65";
}

function Badge({ children, tone }: { children: ReactNode; tone?: string | null }) {
  return (
    <span
      className={cx(
        "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
        badgeTone(tone)
      )}
    >
      {children}
    </span>
  );
}

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      {hint ? <div className="mt-1 text-xs text-white/50">{hint}</div> : null}
    </div>
  );
}

function MiniLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 text-xs">
      <div className="shrink-0 text-white/45">{label}</div>
      <div className="min-w-0 text-right text-white/75">{value}</div>
    </div>
  );
}

function EmptyMini({ text }: { text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-white/45">{text}</div>;
}

function MintRows({ items }: { items: UserActivityItem[] }) {
  if (!items.length) return <EmptyMini text="No minted NFTs yet." />;
  return (
    <div className="space-y-2">
      {items.map((m) => (
        <div key={m.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="MINTED">Mint</Badge>
            <div className="min-w-0 truncate text-sm font-medium text-white">{m.name || `Token #${m.tokenId}`}</div>
          </div>
          <div className="mt-2 grid gap-1 text-xs text-white/60">
            <MiniLine label="Token" value={<span className="break-all">#{m.tokenId} · {shortAddr(m.contract)}</span>} />
            <MiniLine label="Type" value={`${titleCase(m.fulfillmentType)} / ${m.category || "—"}`} />
            <MiniLine label="Listings" value={`${m.listingsCount || 0} listings · ${m.tradesCount || 0} trades`} />
            <MiniLine label="Tx" value={<span className="break-all">{shortHash(m.txHash)}</span>} />
            <MiniLine label="Date" value={fmtDate(m.createdAt)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListingRows({ items }: { items: UserActivityItem[] }) {
  if (!items.length) return <EmptyMini text="No listings created yet." />;
  return (
    <div className="space-y-2">
      {items.map((l) => (
        <div key={l.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={l.status}>{titleCase(l.status)}</Badge>
            <Badge tone={l.marketType}>{titleCase(l.marketType)}</Badge>
            {l.adminHidden ? <Badge tone="DISPUTED">Hidden</Badge> : null}
          </div>
          <div className="mt-2 grid gap-1 text-xs text-white/60">
            <MiniLine label="NFT" value={l.nftName || `Token #${l.tokenId}`} />
            <MiniLine label="Full seller wallet" value={<span className="break-all">{l.sellerWallet || "—"}</span>} />
            <MiniLine label="Listing ID" value={l.marketplaceListingId || "—"} />
            <MiniLine label="Price" value={formatPaymentAmount(l.pricePerUnitWei, null)} />
            <MiniLine label="Type" value={`${titleCase(l.fulfillmentType)} / ${l.category || "—"}`} />
            <MiniLine label="Updated" value={fmtDate(l.updatedAt)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function OrderRows({ items, empty }: { items: UserActivityItem[]; empty: string }) {
  if (!items.length) return <EmptyMini text={empty} />;
  return (
    <div className="space-y-2">
      {items.map((o) => (
        <div key={o.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={o.escrowStatus}>{titleCase(o.escrowStatus)}</Badge>
            <Badge tone={o.marketType}>{titleCase(o.marketType)}</Badge>
            {o.fulfillmentType ? <Badge tone={o.fulfillmentType}>{titleCase(o.fulfillmentType)}</Badge> : null}
          </div>
          <div className="mt-2 grid gap-1 text-xs text-white/60">
            <MiniLine label="Order" value={o.id.slice(0, 12)} />
            <MiniLine label="Token" value={`#${o.tokenId} · ${titleCase(o.vertical || o.fulfillmentType || o.category)}`} />
            <MiniLine label="Amount" value={formatPaymentAmount(o.totalPrice, o.paymentToken)} />
            <MiniLine label="Buyer wallet" value={<span className="break-all">{o.buyerWallet || "—"}</span>} />
            <MiniLine label="Seller wallet" value={<span className="break-all">{o.sellerWallet || "—"}</span>} />
            <MiniLine label="Delivery/service" value={`${titleCase(o.deliveryStatus)} / ${titleCase(o.serviceStatus)}`} />
            <MiniLine label="Buy tx" value={<span className="break-all">{shortHash(o.buyTxHash)}</span>} />
            <MiniLine label="Date" value={fmtDate(o.updatedAt || o.createdAt)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TradeRows({ items, empty }: { items: UserActivityItem[]; empty: string }) {
  if (!items.length) return <EmptyMini text={empty} />;
  return (
    <div className="space-y-2">
      {items.map((t) => (
        <div key={t.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="TRADE">Trade</Badge>
            <Badge tone={t.marketType}>{titleCase(t.marketType)}</Badge>
          </div>
          <div className="mt-2 grid gap-1 text-xs text-white/60">
            <MiniLine label="Token" value={`#${t.tokenId}`} />
            <MiniLine label="Price" value={formatPaymentAmount(t.totalPriceWei, null)} />
            <MiniLine label="Buyer" value={<span className="break-all">{t.buyerWallet || "—"}</span>} />
            <MiniLine label="Seller" value={<span className="break-all">{t.sellerWallet || "—"}</span>} />
            <MiniLine label="Tx" value={<span className="break-all">{shortHash(t.txHash)}</span>} />
            <MiniLine label="Date" value={fmtDate(t.blockTime || t.createdAt)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function LoginRows({ items }: { items: LoginEventRow[] }) {
  if (!items.length) return <EmptyMini text="No login/session events yet." />;
  return (
    <div className="space-y-2">
      {items.map((e) => (
        <div key={e.id} className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-white/60">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={e.authMethod}>{e.authMethod || "SESSION"}</Badge>
            <Badge tone={e.walletKind}>{e.walletKind || "—"}</Badge>
            {e.embeddedWalletProvider ? <Badge tone={e.embeddedWalletProvider}>{e.embeddedWalletProvider}</Badge> : null}
          </div>
          <div className="mt-2 grid gap-1">
            <MiniLine label="IP" value={<span className="break-all">{e.ip || "—"}</span>} />
            <MiniLine label="Country" value={[e.city, e.region, e.country].filter(Boolean).join(", ") || "—"} />
            <MiniLine label="Wallet" value={<span className="break-all">{e.walletAddress || "—"}</span>} />
            <MiniLine label="Email" value={e.googleEmail || "—"} />
            <MiniLine label="Path" value={<span className="break-all">{e.path || "—"}</span>} />
            <MiniLine label="Time" value={fmtDate(e.createdAt)} />
          </div>
        </div>
      ))}
    </div>
  );
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (activity !== "all") p.set("activity", activity);
    p.set("take", "30");
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function copy(text?: string | null, key?: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key || text);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      // Clipboard can fail on non-HTTPS/local contexts. Do nothing.
    }
  }

  return (
    <div className="space-y-6 rounded-[30px] border border-white/10 bg-[#0b0a09]/60 p-6 backdrop-blur-2xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f5d76e]">
            Users intelligence
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-white">User tracking, wallets, mints, listings and sales</h2>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-white/65">
            This is where you see who minted NFTs, the full wallet address, country/IP signal, whether the user listed the NFT, and whether buyers purchased their goods or services.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={role}>{role || "—"}</Badge>
          <button
            type="button"
            onClick={load}
            className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            Refresh
          </button>
        </div>
      </div>

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total users" value={summary.totalUsers} hint={`${total} in current filter`} />
          <StatCard label="Google / Web2" value={summary.googleUsers} hint={`${summary.embeddedUsers} embedded wallets`} />
          <StatCard label="Wallet / Web3" value={summary.walletUsers} hint={`${summary.externalUsers} external wallets`} />
          <StatCard label="Minted NFTs" value={summary.usersWithMints} hint="Users who minted at least one NFT" />
          <StatCard label="Sold orders" value={summary.usersWithSoldOrders} hint="Users who had goods/services bought" />
        </div>
      ) : null}

      {summary?.topIps30d?.length ? (
        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Top IPs in last 30 days</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.topIps30d.map((x) => (
              <button
                key={`${x.ip}-${x.count}`}
                type="button"
                onClick={() => setQ(x.ip || "")}
                className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white/70 transition hover:border-[#d4af37]/30 hover:text-white"
              >
                {x.ip || "unknown"} · {x.count}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search handle, profile ID, wallet, email, IP, country, token id, tx hash..."
          className="min-h-[46px] rounded-2xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#d4af37]/40"
        />
        <div className="flex flex-wrap gap-2">
          {(["all", "minted", "listed", "sold", "bought", "traded"] as ActivityFilter[]).map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => setActivity(x)}
              className={cx(
                "rounded-2xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition",
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

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-white/65">Loading users...</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-white/65">No users found for this filter.</div>
      ) : (
        <div className="space-y-4">
          {items.map((u) => {
            const isOpen = expanded === u.id;
            const primaryWallets = u.wallets.length ? u.wallets : [
              {
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
              },
            ];
            const publicProfileHref = profileHref(u);
            const publicProfileNftsHref = profileNftsHref(u);

            return (
              <div key={u.id} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="min-w-0 truncate text-lg font-semibold text-white">{userLabel(u)}</div>
                      <Badge tone={u.supportRole}>{u.supportRole}</Badge>
                      <Badge tone={u.authMethod}>{u.authMethod}</Badge>
                      <Badge tone={u.walletKind}>{u.walletKind}</Badge>
                      {u.embeddedWalletProvider ? <Badge tone={u.embeddedWalletProvider}>{u.embeddedWalletProvider}</Badge> : null}
                      {u.approvedPhysicalSeller ? <Badge tone="RELEASED">Approved seller</Badge> : null}
                    </div>

                    <div className="mt-2 text-sm text-white/55">
                      User ID: <span className="font-mono text-white/75">{u.id}</span>
                    </div>
                    <div className="mt-1 text-sm text-white/55">
                      Profile: <span className="font-mono text-white/75">{u.handle ? `@${u.handle}` : "—"}</span>
                      <span className="mx-2 text-white/25">/</span>
                      Public ID: <span className="font-mono text-white/75">{u.publicId || "—"}</span>
                    </div>
                    <div className="mt-1 text-sm text-white/55">
                      Google: <span className="text-white/75">{u.googleEmail || "—"}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {publicProfileHref ? (
                      <a
                        href={publicProfileHref}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/10 px-4 py-2.5 text-sm font-semibold text-[#f5d76e] transition hover:bg-[#d4af37]/15"
                      >
                        Open profile ↗
                      </a>
                    ) : null}
                    {publicProfileNftsHref ? (
                      <a
                        href={publicProfileNftsHref}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/[0.08]"
                      >
                        NFTs ↗
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : u.id)}
                      className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/[0.08]"
                    >
                      {isOpen ? "Hide details" : "Open details"}
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Full primary wallet</div>
                    <button
                      type="button"
                      onClick={() => copy(u.walletAddress, `${u.id}-wallet`)}
                      className="mt-2 block w-full break-all text-left font-mono text-xs text-white/80 transition hover:text-[#f5d76e]"
                    >
                      {u.walletAddress || "—"}
                    </button>
                    <div className="mt-1 text-xs text-white/45">{copied === `${u.id}-wallet` ? "Copied" : "Click wallet to copy"}</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Profile handle / ID</div>
                    <div className="mt-2 break-all font-mono text-sm font-medium text-white">{u.handle ? `@${u.handle}` : "—"}</div>
                    <div className="mt-1 break-all font-mono text-xs text-white/55">{u.publicId || "—"}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {publicProfileHref ? <a href={publicProfileHref} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#f5d76e] hover:underline">Profile ↗</a> : null}
                      {publicProfileNftsHref ? <a href={publicProfileNftsHref} target="_blank" rel="noreferrer" className="text-xs font-semibold text-white/70 hover:text-white hover:underline">NFTs ↗</a> : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Country / IP</div>
                    <div className="mt-2 text-sm font-medium text-white">{locationLabel(u)}</div>
                    <div className="mt-1 break-all text-xs text-white/55">Last IP: {u.lastIp || "—"}</div>
                    <div className="mt-1 break-all text-xs text-white/45">First IP: {u.firstIp || "—"}</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">NFT activity</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div className="text-white"><span className="font-semibold">{u.counts.mints}</span> mints</div>
                      <div className="text-white"><span className="font-semibold">{u.counts.listings}</span> listings</div>
                      <div className="text-white"><span className="font-semibold">{u.counts.tradesSold}</span> sold trades</div>
                      <div className="text-white"><span className="font-semibold">{u.counts.tradesBought}</span> bought trades</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Goods/services orders</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div className="text-white"><span className="font-semibold">{u.counts.ordersSold}</span> sold</div>
                      <div className="text-white"><span className="font-semibold">{u.counts.ordersBought}</span> bought</div>
                      <div className={cx("col-span-2 text-xs", u.hasSoldGoodsOrServices ? "text-emerald-200" : "text-white/45")}>
                        {u.hasSoldGoodsOrServices ? "Someone bought this user's item/service" : "No sold goods/services yet"}
                      </div>
                    </div>
                  </div>
                </div>

                {isOpen ? (
                  <div className="mt-5 space-y-4">
                    <div className="grid gap-3 xl:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="mb-3 text-sm font-semibold text-white">Linked wallets</div>
                        <div className="space-y-2">
                          {primaryWallets.map((w) => (
                            <div key={w.id} className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-white/60">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge tone={w.kind}>{w.kind}</Badge>
                                {w.embeddedWalletProvider ? <Badge tone={w.embeddedWalletProvider}>{w.embeddedWalletProvider}</Badge> : null}
                                {w.isPrimary ? <Badge tone="ADMIN">Primary</Badge> : null}
                              </div>
                              <button
                                type="button"
                                onClick={() => copy(w.address, `${w.id}-address`)}
                                className="mt-2 block w-full break-all text-left font-mono text-white/80 hover:text-[#f5d76e]"
                              >
                                {w.address}
                              </button>
                              <div className="mt-2 grid gap-1">
                                <MiniLine label="Chain" value={w.chainId || "—"} />
                                <MiniLine label="Last IP" value={<span className="break-all">{w.lastIp || "—"}</span>} />
                                <MiniLine label="Seen" value={`${fmtDate(w.firstSeenAt)} → ${fmtDate(w.lastSeenAt)}`} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="mb-3 text-sm font-semibold text-white">Latest login/IP events</div>
                        <LoginRows items={u.latestEvents} />
                      </div>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="mb-3 text-sm font-semibold text-white">Recent minted NFTs</div>
                        <MintRows items={u.recentMints} />
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="mb-3 text-sm font-semibold text-white">Recent listings</div>
                        <ListingRows items={u.recentListings} />
                      </div>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="mb-3 text-sm font-semibold text-white">Goods/services sold by this user</div>
                        <OrderRows items={u.recentOrdersSold} empty="Nobody has bought this user's goods/services yet." />
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="mb-3 text-sm font-semibold text-white">Goods/services bought by this user</div>
                        <OrderRows items={u.recentOrdersBought} empty="This user has not bought goods/services yet." />
                      </div>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="mb-3 text-sm font-semibold text-white">Trading sold</div>
                        <TradeRows items={u.recentTradesSold} empty="No secondary trade sales yet." />
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="mb-3 text-sm font-semibold text-white">Trading bought</div>
                        <TradeRows items={u.recentTradesBought} empty="No secondary trade purchases yet." />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
