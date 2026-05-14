"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { formatUnits } from "viem";

type ListingStatus = "active" | "cancelled" | "sold_out" | "all";
type HiddenFilter = "all" | "visible" | "hidden";
type VerifiedFilter = "all" | "verified" | "unverified";

type AdminListing = {
  id: string;
  createdAt: string | null;
  updatedAt: string | null;
  cancelledAt: string | null;
  soldOutAt: string | null;
  chainId: number;
  contract: string;
  tokenId: string;
  standard: string;
  status: string;
  adminHidden: boolean;
  adminHiddenAt: string | null;
  adminHiddenByWallet: string | null;
  adminHiddenReason: string | null;
  adminHiddenNote: string | null;
  marketType: string | null;
  marketplaceContract: string | null;
  marketplaceListingId: string | null;
  paymentTokenAddress?: string | null;
  paymentSymbol?: string | null;
  paymentDecimals?: number | null;
  sellerWallet: string;
  seller: {
    id: string;
    handle: string | null;
    publicId: string | null;
    walletAddress: string | null;
    supportRole: string | null;
  } | null;
  pricePerUnitWei: string;
  amountTotal: string;
  amountRemaining: string;
  deliveryEnabled: boolean;
  physicalItemIncluded: boolean;
  officialItem: boolean;
  fulfillmentType: string | null;
  category: string | null;
  subcategory: string | null;
  serviceCountry: string | null;
  serviceCity: string | null;
  serviceArea: string | null;
  createdTxHash: string | null;
  nft: {
    id: string;
    name: string | null;
    image: string | null;
    animation: string | null;
    mediaKind: string | null;
    description: string | null;
    verified: boolean;
    deliveryEnabled: boolean;
    physicalItemIncluded: boolean;
    officialItem: boolean;
    fulfillmentType: string | null;
    category: string | null;
    subcategory: string | null;
    serviceCountry: string | null;
    serviceCity: string | null;
    serviceArea: string | null;
    metaBrand: string | null;
    metaProject: string | null;
  } | null;
};

type ListingsResponse = {
  ok: boolean;
  error?: string;
  role: "MODERATOR" | "ADMIN";
  status: ListingStatus;
  q: string | null;
  summary: {
    active: number;
    cancelled: number;
    sold_out: number;
    hidden: number;
    unverified_nfts: number;
  };
  items: AdminListing[];
};

const REMOVAL_REASONS = [
  ["fake_product", "Fake product"],
  ["scam_risk", "Scam risk"],
  ["prohibited_item", "Prohibited item"],
  ["empty_nft", "Empty NFT"],
  ["copyright_abuse", "Copyright abuse"],
  ["unsafe_service", "Unsafe service"],
  ["spam", "Spam"],
  ["other", "Other"],
] as const;

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
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

function ipfsToHttp(v?: string | null) {
  const s = String(v || "").trim();
  if (!s) return null;
  if (s.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${s.replace("ipfs://", "").replace(/^ipfs\//, "")}`;
  return s;
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
  if (s.length <= 16) return s;
  return `${s.slice(0, 10)}…${s.slice(-8)}`;
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
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

function formatTokenAmount(raw?: string | null, symbol?: string | null, decimals?: number | null, marketType?: string | null) {
  try {
    if (!raw) return "—";
    const finalSymbol = symbol || (marketType === "PROTECTED" ? "USDC" : "ETH");
    const finalDecimals = typeof decimals === "number" ? decimals : finalSymbol === "USDC" ? 6 : 18;
    const v = formatUnits(BigInt(raw), finalDecimals);
    const [a, b = ""] = v.split(".");
    const bb = b.slice(0, finalSymbol === "USDC" ? 4 : 6).replace(/0+$/, "");
    return `${bb ? `${a}.${bb}` : a} ${finalSymbol}`;
  } catch {
    return raw ? `${raw} ${symbol || (marketType === "PROTECTED" ? "USDC" : "ETH")}` : "—";
  }
}

function profileHref(u?: AdminListing["seller"]) {
  const key = String(u?.handle || u?.publicId || "").trim();
  return key ? `/app/profile/${encodeURIComponent(key)}` : null;
}

function Badge({ children, tone }: { children: ReactNode; tone?: string | null }) {
  const t = String(tone || "").toUpperCase();
  return (
    <span
      className={cx(
        "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] leading-none",
        t.includes("ACTIVE") || t.includes("VERIFIED")
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
          : t.includes("CANCEL") || t.includes("HIDDEN") || t.includes("UNVERIFIED") || t.includes("REMOVE")
            ? "border-rose-500/20 bg-rose-500/10 text-rose-100"
            : t.includes("PROTECTED") || t.includes("USDC")
              ? "border-[#d4af37]/30 bg-[#d4af37]/10 text-[#f5d76e]"
              : "border-white/10 bg-white/[0.06] text-white/65"
      )}
    >
      {children}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 py-1.5 text-xs last:border-b-0">
      <div className="shrink-0 text-white/40">{label}</div>
      <div className="min-w-0 text-right text-white/75">{value}</div>
    </div>
  );
}

export default function AdminTradingModerationClient() {
  const [items, setItems] = useState<AdminListing[]>([]);
  const [summary, setSummary] = useState<ListingsResponse["summary"] | null>(null);
  const [role, setRole] = useState<"MODERATOR" | "ADMIN" | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ListingStatus>("active");
  const [hidden, setHidden] = useState<HiddenFilter>("all");
  const [verified, setVerified] = useState<VerifiedFilter>("all");
  const [marketType, setMarketType] = useState("all");
  const [fulfillmentType, setFulfillmentType] = useState("all");
  const [reason, setReason] = useState("scam_risk");
  const [note, setNote] = useState("Admin moderation from Realife Safety Center.");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("status", status);
    p.set("take", "80");
    if (q.trim()) p.set("q", q.trim());
    if (hidden === "hidden") p.set("hidden", "true");
    if (hidden === "visible") p.set("hidden", "false");
    if (verified === "verified") p.set("verified", "true");
    if (verified === "unverified") p.set("verified", "false");
    if (marketType !== "all") p.set("marketType", marketType);
    if (fulfillmentType !== "all") p.set("fulfillmentType", fulfillmentType);
    return p.toString();
  }, [q, status, hidden, verified, marketType, fulfillmentType]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const j = await fetchJSON<ListingsResponse>(`/api/admin/safety/listings?${query}`);
      setItems(j.items || []);
      setSummary(j.summary || null);
      setRole(j.role || null);
    } catch (e: any) {
      setError(e?.message || "Unable to load trading listings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function listingAction(item: AdminListing, action: "remove" | "restore" | "disable_nft" | "enable_nft", disableMint = false) {
    const actionLabel = action.replace(/_/g, " ");
    if (!window.confirm(`Confirm ${actionLabel} for token #${item.tokenId}?`)) return;

    setWorkingId(item.id);
    setError(null);
    try {
      await fetchJSON(`/api/admin/safety/listings/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          action,
          reason,
          note: note.trim() || `Admin action: ${actionLabel}`,
          disableMint,
        }),
      });
      await load();
    } catch (e: any) {
      setError(e?.message || `Unable to ${actionLabel}.`);
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="space-y-4 rounded-[28px] border border-white/10 bg-[#0b0a09]/60 p-4 backdrop-blur-2xl xl:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-100">
            Trading safety
          </div>
          <h2 className="mt-2 text-xl font-semibold text-white">Marketplace listing moderation</h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-white/60">
            Remove unsafe NFTs from the Trading page, restore safe listings, or disable fake/empty NFTs from public surfaces. This is a website/admin moderation action: it hides/removes from Realife UI and keeps an audit log.
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
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <Stat label="Active" value={summary.active} />
          <Stat label="Cancelled" value={summary.cancelled} />
          <Stat label="Sold out" value={summary.sold_out} />
          <Stat label="Hidden" value={summary.hidden} />
          <Stat label="Unverified NFTs" value={summary.unverified_nfts} />
        </div>
      ) : null}

      <div className="grid gap-2 xl:grid-cols-[1fr_auto]">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search token id, listing id, wallet, category, city, NFT name..."
          className="min-h-[42px] rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#d4af37]/40"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <select value={status} onChange={(e) => setStatus(e.target.value as ListingStatus)} className="min-h-[38px] rounded-xl border border-white/10 bg-black/40 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75 outline-none">
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
            <option value="sold_out">Sold out</option>
            <option value="all">All</option>
          </select>
          <select value={hidden} onChange={(e) => setHidden(e.target.value as HiddenFilter)} className="min-h-[38px] rounded-xl border border-white/10 bg-black/40 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75 outline-none">
            <option value="all">Hidden: all</option>
            <option value="visible">Visible only</option>
            <option value="hidden">Hidden only</option>
          </select>
          <select value={verified} onChange={(e) => setVerified(e.target.value as VerifiedFilter)} className="min-h-[38px] rounded-xl border border-white/10 bg-black/40 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75 outline-none">
            <option value="all">NFT status: all</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>
          <select value={marketType} onChange={(e) => setMarketType(e.target.value)} className="min-h-[38px] rounded-xl border border-white/10 bg-black/40 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75 outline-none">
            <option value="all">Market: all</option>
            <option value="PROTECTED">Protected / USDC</option>
            <option value="STANDARD">Standard</option>
          </select>
          <select value={fulfillmentType} onChange={(e) => setFulfillmentType(e.target.value)} className="min-h-[38px] rounded-xl border border-white/10 bg-black/40 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75 outline-none">
            <option value="all">Fulfillment: all</option>
            <option value="PHYSICAL_GOOD">Physical good</option>
            <option value="DIGITAL_SERVICE">Digital service</option>
            <option value="ONLINE_SESSION">Online session</option>
            <option value="LOCAL_SERVICE">Local service</option>
          </select>
        </div>
      </div>

      <div className="grid gap-2 xl:grid-cols-[220px_1fr]">
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="min-h-[42px] rounded-xl border border-[#d4af37]/20 bg-black/35 px-3 text-sm text-white/80 outline-none"
        >
          {REMOVAL_REASONS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Moderation note saved to AdminActionLog"
          className="min-h-[42px] rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#d4af37]/40"
        />
      </div>

      {error ? <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {loading ? <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-white/65">Loading trading listings...</div> : null}

      {!loading && !items.length ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-white/65">
          No listings found for this filter.
        </div>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-2">
        {items.map((item) => {
          const img = ipfsToHttp(item.nft?.image);
          const name = item.nft?.name || `Token #${item.tokenId}`;
          const href = `/app/trading/${encodeURIComponent(item.contract)}/${encodeURIComponent(item.tokenId)}`;
          const sellerHref = profileHref(item.seller);
          const working = workingId === item.id;
          const isActive = item.status === "ACTIVE" && !item.adminHidden;

          return (
            <div key={item.id} className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04]">
              <div className="grid gap-0 sm:grid-cols-[160px_1fr]">
                <div className="relative min-h-[160px] bg-black/30">
                  {img ? (
                    <img src={img} alt={name} className="h-full min-h-[160px] w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full min-h-[160px] items-center justify-center text-xs text-white/40">No image</div>
                  )}
                  <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
                    <Badge tone={item.status}>{titleCase(item.status)}</Badge>
                    {item.adminHidden ? <Badge tone="hidden">Hidden</Badge> : null}
                    {item.nft?.verified ? <Badge tone="verified">Verified</Badge> : <Badge tone="unverified">Unverified</Badge>}
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-white">{name}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {item.marketType ? <Badge tone={item.marketType}>{item.marketType}</Badge> : null}
                        {item.marketType === "PROTECTED" ? <Badge tone="USDC">USDC</Badge> : null}
                        {item.fulfillmentType ? <Badge tone={item.fulfillmentType}>{titleCase(item.fulfillmentType)}</Badge> : null}
                      </div>
                    </div>
                    <a href={href} target="_blank" rel="noreferrer" className="rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#f5d76e] transition hover:bg-[#d4af37]/15">
                      Open NFT ↗
                    </a>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
                      <KV label="Price" value={formatTokenAmount(item.pricePerUnitWei, item.paymentSymbol, item.paymentDecimals, item.marketType)} />
                      <KV label="Remaining" value={`${item.amountRemaining}/${item.amountTotal}`} />
                      <KV label="Listing" value={item.marketplaceListingId || "—"} />
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
                      <KV label="Seller" value={sellerHref ? <a href={sellerHref} target="_blank" rel="noreferrer" className="text-[#f5d76e] hover:underline">{item.seller?.handle ? `@${item.seller.handle}` : shortAddr(item.sellerWallet)}</a> : shortAddr(item.sellerWallet)} />
                      <KV label="Token" value={`#${item.tokenId} · ${shortAddr(item.contract)}`} />
                      <KV label="Updated" value={fmtDate(item.updatedAt)} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
                    <KV label="Category" value={[item.category || item.nft?.category, item.subcategory || item.nft?.subcategory].filter(Boolean).join(" · ") || "—"} />
                    <KV label="Location" value={[item.serviceCity || item.nft?.serviceCity, item.serviceCountry || item.nft?.serviceCountry].filter(Boolean).join(", ") || "—"} />
                    <KV label="Tx" value={shortHash(item.createdTxHash)} />
                    {item.adminHiddenReason ? <KV label="Admin reason" value={titleCase(item.adminHiddenReason)} /> : null}
                    {item.adminHiddenNote ? <KV label="Admin note" value={item.adminHiddenNote} /> : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isActive ? (
                      <>
                        <button
                          type="button"
                          disabled={working}
                          onClick={() => void listingAction(item, "remove", false)}
                          className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-rose-100 transition hover:bg-rose-500/15 disabled:opacity-50"
                        >
                          Remove from trading
                        </button>
                        <button
                          type="button"
                          disabled={working}
                          onClick={() => void listingAction(item, "remove", true)}
                          className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-50"
                        >
                          Remove + disable NFT
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={working}
                        onClick={() => void listingAction(item, "restore")}
                        className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-500/15 disabled:opacity-50"
                      >
                        Restore listing
                      </button>
                    )}

                    {item.nft?.verified ? (
                      <button
                        type="button"
                        disabled={working}
                        onClick={() => void listingAction(item, "disable_nft")}
                        className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/75 transition hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-50"
                      >
                        Disable NFT only
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={working}
                        onClick={() => void listingAction(item, "enable_nft")}
                        className="rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#f5d76e] transition hover:bg-[#d4af37]/15 disabled:opacity-50"
                      >
                        Enable NFT
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
