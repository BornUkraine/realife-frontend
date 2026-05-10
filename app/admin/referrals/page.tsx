"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";


function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB");
}

function shortAddr(addr?: string | null) {
  if (!addr) return "—";
  const s = String(addr);
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-6)}`;
}

type ReferredUser = {
  id: string;
  createdAt: string | null;
  referredAt: string | null;
  label: string | null;
  avatar: string | null;
  walletAddress: string | null;
  walletShort: string | null;
  twitterUser: string | null;
  discordUser: string | null;
  qualified: boolean;
  counts: {
    mints: number;
    listings: number;
    ordersBought: number;
    ordersSold: number;
    tradesBought: number;
    tradesSold: number;
  };
};

type ReferralRow = {
  id: string;
  createdAt: string | null;
  lastLoginAt: string | null;
  referralCode: string;
  label: string | null;
  avatar: string | null;
  walletAddress: string;
  walletShort: string | null;
  twitterUser: string | null;
  discordUser: string | null;
  points: number;
  invited: number;
  qualified: number;
  conversion: number;
  totals: {
    mints: number;
    listings: number;
    ordersBought: number;
    ordersSold: number;
    tradesBought: number;
    tradesSold: number;
  };
  recentUsers: ReferredUser[];
};

type ResponseShape = {
  ok: boolean;
  role: "MODERATOR" | "ADMIN";
  total: number;
  summary: {
    referrers: number;
    invited: number;
    qualified: number;
    listings: number;
    orders: number;
  };
  items: ReferralRow[];
  error?: string;
};

function Avatar({ src, label, size = "md" }: { src?: string | null; label?: string | null; size?: "sm" | "md" }) {
  const initials = String(label || "R")
    .replace(/^@/, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x.charAt(0).toUpperCase())
    .join("") || "R";
  const box = size === "sm" ? "h-8 w-8 text-[11px]" : "h-11 w-11 text-sm";

  return (
    <div className={cx("shrink-0 overflow-hidden rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10", box)}>
      {src ? <img src={src} alt={label || "avatar"} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <div className="flex h-full w-full items-center justify-center font-bold text-[#f5d76e]">{initials}</div>}
    </div>
  );
}

function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "ok" | "gold" | "warn" }) {
  const cls =
    tone === "ok"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
      : tone === "gold"
      ? "border-[#d4af37]/30 bg-[#d4af37]/10 text-[#f5d76e]"
      : tone === "warn"
      ? "border-rose-500/20 bg-rose-500/10 text-rose-100"
      : "border-white/10 bg-white/[0.06] text-white/65";

  return <span className={cx("inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]", cls)}>{children}</span>;
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      {hint ? <div className="mt-1 text-xs text-white/50">{hint}</div> : null}
    </div>
  );
}

export default function AdminReferralsPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ReferralRow[]>([]);
  const [summary, setSummary] = useState<ResponseShape["summary"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    p.set("take", "150");
    return p.toString();
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/admin/referrals?${query}`, { cache: "no-store" });
        const j = (await r.json().catch(() => null)) as ResponseShape | null;
        if (!r.ok || !j?.ok) throw new Error(j?.error || "Unable to load referrals");
        if (!cancelled) {
          setItems(j.items || []);
          setSummary(j.summary || null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Unable to load referrals");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="gold">Referral Ranking</Badge>
              <Badge>Every user can become a referrer</Badge>
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-white">Referral growth tracker</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
              Track who invited whom, qualified testnet users, listings and protected/order activity by referral code. This replaces a hard-coded ambassador-only system.
            </p>
          </div>

          <a href="/app/admin" className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/[0.08]">
            Back to admin
          </a>
        </div>
      </div>

      {summary ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Stat label="Referrers" value={summary.referrers} hint="Users with referral codes" />
          <Stat label="Invited" value={summary.invited} hint="Users attributed to a code" />
          <Stat label="Qualified" value={summary.qualified} hint="Mint/listing/order/social action" />
          <Stat label="Listings" value={summary.listings} hint="By invited users" />
          <Stat label="Orders" value={summary.orders} hint="Bought/sold order actions" />
        </div>
      ) : null}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search referral code, owner, wallet, X, Discord..."
        className="min-h-[46px] w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#d4af37]/40"
      />

      {error ? <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {loading ? <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-white/65">Loading referral ranking...</div> : null}

      {!loading && !items.length ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-white/65">
          No referral codes found yet. Create codes from the referrals page, then users who invite people will appear here.
        </div>
      ) : null}

      <div className="space-y-3">
        {items.map((row, idx) => {
          const isOpen = open === row.id;
          const orders = row.totals.ordersBought + row.totals.ordersSold;
          const trades = row.totals.tradesBought + row.totals.tradesSold;
          return (
            <div key={row.id} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_repeat(6,minmax(80px,auto))_auto] xl:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="text-sm font-semibold text-white/45">#{idx + 1}</div>
                  <Avatar src={row.avatar} label={row.label} />
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-white">{row.label || shortAddr(row.walletAddress)}</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge tone="gold">{row.referralCode}</Badge>
                      {row.twitterUser ? <Badge>@{row.twitterUser}</Badge> : null}
                      {row.discordUser ? <Badge>{row.discordUser}</Badge> : null}
                    </div>
                    <div className="mt-1 break-all font-mono text-xs text-white/45">{row.walletAddress}</div>
                  </div>
                </div>

                <div className="text-sm text-white"><span className="font-semibold">{row.invited}</span><div className="text-[11px] text-white/45">invited</div></div>
                <div className="text-sm text-white"><span className="font-semibold">{row.qualified}</span><div className="text-[11px] text-white/45">qualified</div></div>
                <div className="text-sm text-white"><span className="font-semibold">{row.conversion}%</span><div className="text-[11px] text-white/45">conversion</div></div>
                <div className="text-sm text-white"><span className="font-semibold">{row.totals.mints}</span><div className="text-[11px] text-white/45">mints</div></div>
                <div className="text-sm text-white"><span className="font-semibold">{row.totals.listings}</span><div className="text-[11px] text-white/45">listings</div></div>
                <div className="text-sm text-white"><span className="font-semibold">{orders}</span><div className="text-[11px] text-white/45">orders</div></div>

                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : row.id)}
                  className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/[0.08]"
                >
                  {isOpen ? "Hide" : "Open"}
                </button>
              </div>

              {isOpen ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="mb-3 flex flex-wrap gap-2 text-xs text-white/55">
                    <span>Points: <b className="text-white">{row.points}</b></span>
                    <span>Last login: <b className="text-white">{fmtDate(row.lastLoginAt)}</b></span>
                    <span>Trades by invited users: <b className="text-white">{trades}</b></span>
                  </div>

                  {!row.recentUsers.length ? (
                    <div className="text-sm text-white/50">No invited users yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-xs">
                        <thead className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                          <tr>
                            <th className="px-2 py-2">User</th>
                            <th className="px-2 py-2">Wallet</th>
                            <th className="px-2 py-2">Qualified</th>
                            <th className="px-2 py-2">Mints</th>
                            <th className="px-2 py-2">Listings</th>
                            <th className="px-2 py-2">Orders</th>
                            <th className="px-2 py-2">Referred</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 text-white/70">
                          {row.recentUsers.map((u) => (
                            <tr key={u.id} className="align-top">
                              <td className="px-2 py-2">
                                <div className="flex items-center gap-2">
                                  <Avatar src={u.avatar} label={u.label} size="sm" />
                                  <div>
                                    <div className="font-medium text-white">{u.label || shortAddr(u.walletAddress)}</div>
                                    <div className="text-white/40">{u.twitterUser ? `@${u.twitterUser}` : u.discordUser || "—"}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-2 font-mono">{u.walletShort || shortAddr(u.walletAddress)}</td>
                              <td className="px-2 py-2">{u.qualified ? <Badge tone="ok">Yes</Badge> : <Badge>No</Badge>}</td>
                              <td className="px-2 py-2">{u.counts.mints}</td>
                              <td className="px-2 py-2">{u.counts.listings}</td>
                              <td className="px-2 py-2">{u.counts.ordersBought + u.counts.ordersSold}</td>
                              <td className="px-2 py-2">{fmtDate(u.referredAt || u.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
