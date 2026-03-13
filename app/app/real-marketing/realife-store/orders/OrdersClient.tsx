"use client";

import { useEffect, useMemo, useState } from "react";

type OrderRow = {
  id: string;
  createdAt: string;
  updatedAt: string;

  chainId: number;
  contract: string;
  tokenId: string;
  vertical: string;

  buyerWallet: string;
  sellerWallet: string;

  amount: string;
  unitPrice: string;
  totalPrice: string;
  paymentToken: string | null;

  deliveryRequired: boolean;
  physicalItem: boolean;
  officialItem: boolean;

  escrowStatus:
    | "NOT_REQUIRED"
    | "PENDING"
    | "FUNDED"
    | "RELEASED"
    | "REFUNDED"
    | "DISPUTED"
    | "CANCELLED";

  deliveryStatus:
    | "NOT_REQUIRED"
    | "PENDING"
    | "READY_TO_SHIP"
    | "SHIPPED"
    | "DELIVERED"
    | "CONFIRMED"
    | "RETURN_REQUESTED"
    | "RETURNED"
    | "CANCELLED";

  shippedAt: string | null;
  deliveredAt: string | null;
  confirmedAt: string | null;
  releasedAt: string | null;

  shippingName: string | null;
  shippingPhone: string | null;
  shippingCountry: string | null;
  shippingCity: string | null;
  shippingAddress: string | null;
  shippingZip: string | null;

  trackingCode: string | null;
  trackingUrl: string | null;
  carrier: string | null;

  buyTxHash: string | null;

  noteBuyer: string | null;
  noteSeller: string | null;
  adminNote: string | null;

  viewerRole: "buyer" | "seller" | "unknown";

  product: {
    name: string | null;
    image: string | null;
    tokenUri: string | null;
    deliveryEnabled: boolean;
    physicalItemIncluded: boolean;
    officialItem: boolean;
    primarySellerWallet: string | null;
  } | null;
};

type OrdersResponse = {
  ok: boolean;
  total: number;
  items: OrderRow[];
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

async function fetchJSON<T = any>(url: string, init?: RequestInit): Promise<T> {
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

function fmtUsdtRaw(raw?: string | null) {
  try {
    if (!raw) return "—";
    const n = Number(raw) / 1e6;
    if (!Number.isFinite(n)) return raw;
    return n.toFixed(2).replace(/\.00$/, "");
  } catch {
    return raw || "—";
  }
}

export default function OrdersClient() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [role, setRole] = useState<"all" | "buyer" | "seller">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [trackingCode, setTrackingCode] = useState<Record<string, string>>({});
  const [trackingUrl, setTrackingUrl] = useState<Record<string, string>>({});
  const [carrier, setCarrier] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const j = await fetchJSON<OrdersResponse>(
        `/api/store/orders?role=${role}&take=100&vertical=store`
      );
      setRows(Array.isArray(j?.items) ? j.items : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [role]);

  const buyerCount = useMemo(
    () => rows.filter((x) => x.viewerRole === "buyer").length,
    [rows]
  );

  const sellerCount = useMemo(
    () => rows.filter((x) => x.viewerRole === "seller").length,
    [rows]
  );

  async function shipOrder(id: string) {
    setBusyId(id);
    setErr(null);

    try {
      await fetchJSON(`/api/store/orders/${id}/ship`, {
        method: "POST",
        body: JSON.stringify({
          trackingCode: trackingCode[id] || "",
          trackingUrl: trackingUrl[id] || "",
          carrier: carrier[id] || "",
        }),
      });

      await load();
    } catch (e: any) {
      setErr(e?.message || "Ship failed");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmOrder(id: string) {
    setBusyId(id);
    setErr(null);

    try {
      await fetchJSON(`/api/store/orders/${id}/confirm`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      await load();
    } catch (e: any) {
      setErr(e?.message || "Confirm failed");
    } finally {
      setBusyId(null);
    }
  }

  const wrap =
    "rounded-[34px] p-px overflow-hidden bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))] shadow-[0_34px_130px_rgba(0,0,0,0.60)]";
  const card =
    "rounded-[34px] overflow-hidden border border-white/10 bg-[#0b0a09]/30 backdrop-blur-2xl ring-1 ring-black/10";

  return (
    <div className="space-y-6">
      <div className={wrap}>
        <div className={cx(card, "p-6 md:p-7")}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 font-black">
                Orders Center
              </div>
              <div className="mt-2 text-xl md:text-2xl font-black tracking-tight text-white/90">
                My Store Orders
              </div>
              <div className="mt-2 text-[12px] text-white/55 max-w-2xl">
                Delivery and escrow flow for store purchases.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setRole("all")}
                className={cx(
                  "px-4 py-2 rounded-2xl border text-[12px] font-black transition",
                  role === "all"
                    ? "border-black/10 text-black bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
                    : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                )}
              >
                All
              </button>

              <button
                onClick={() => setRole("buyer")}
                className={cx(
                  "px-4 py-2 rounded-2xl border text-[12px] font-black transition",
                  role === "buyer"
                    ? "border-white/15 bg-white/[0.10] text-white"
                    : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                )}
              >
                Bought
              </button>

              <button
                onClick={() => setRole("seller")}
                className={cx(
                  "px-4 py-2 rounded-2xl border text-[12px] font-black transition",
                  role === "seller"
                    ? "border-white/15 bg-white/[0.10] text-white"
                    : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                )}
              >
                Sold
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                Total
              </div>
              <div className="mt-1 text-lg font-black text-white/90">{rows.length}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                As buyer
              </div>
              <div className="mt-1 text-lg font-black text-emerald-200">{buyerCount}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                As seller
              </div>
              <div className="mt-1 text-lg font-black text-amber-100">{sellerCount}</div>
            </div>
          </div>

          {err ? (
            <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-[12px] text-rose-100">
              {err}
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-white/60">
            Loading orders...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-white/60">
            No orders yet.
          </div>
        ) : (
          rows.map((x) => {
            const img = ipfsToHttp(x.product?.image || null);

            const canShip =
              x.viewerRole === "seller" &&
              x.deliveryRequired &&
              x.deliveryStatus !== "SHIPPED" &&
              x.deliveryStatus !== "CONFIRMED" &&
              x.deliveryStatus !== "DELIVERED" &&
              x.deliveryStatus !== "CANCELLED";

            const canConfirm =
              x.viewerRole === "buyer" &&
              x.deliveryRequired &&
              x.deliveryStatus === "SHIPPED" &&
              x.escrowStatus !== "RELEASED";

            return (
              <div
                key={x.id}
                className="rounded-[28px] overflow-hidden border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_24px_90px_rgba(0,0,0,0.55)]"
              >
                <div className="p-5 md:p-6">
                  <div className="flex flex-col lg:flex-row gap-5">
                    <div className="w-full lg:w-[140px] shrink-0">
                      <div className="aspect-square rounded-2xl overflow-hidden bg-black/30 border border-white/10">
                        {img ? (
                          <img
                            src={img}
                            alt={x.product?.name || `Token #${x.tokenId}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-white/25 font-black">
                            No image
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[18px] font-black text-white/90 truncate">
                            {x.product?.name || `Store Product #${x.tokenId}`}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.06] text-[10px] font-black text-white/80">
                              {x.viewerRole.toUpperCase()}
                            </span>

                            <span className="px-2 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[10px] font-black text-emerald-100">
                              {x.escrowStatus}
                            </span>

                            <span className="px-2 py-1 rounded-full border border-sky-500/20 bg-sky-500/10 text-[10px] font-black text-sky-100">
                              {x.deliveryStatus}
                            </span>

                            {x.officialItem ? (
                              <span className="px-2 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-[10px] font-black text-amber-100">
                                OFFICIAL
                              </span>
                            ) : null}

                            {x.deliveryRequired ? (
                              <span className="px-2 py-1 rounded-full border border-violet-500/20 bg-violet-500/10 text-[10px] font-black text-violet-100">
                                DELIVERY
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[12px] text-white/45">Total</div>
                          <div className="text-[16px] font-black text-amber-100">
                            {fmtUsdtRaw(x.totalPrice)} USDT
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                          <div className="text-[11px] text-white/45">Amount</div>
                          <div className="mt-1 text-[13px] font-black text-white/80">
                            {x.amount}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                          <div className="text-[11px] text-white/45">Unit price</div>
                          <div className="mt-1 text-[13px] font-black text-white/80">
                            {fmtUsdtRaw(x.unitPrice)} USDT
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                          <div className="text-[11px] text-white/45">Buyer</div>
                          <div className="mt-1 text-[13px] font-black text-white/80">
                            {shortAddr(x.buyerWallet)}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                          <div className="text-[11px] text-white/45">Seller</div>
                          <div className="mt-1 text-[13px] font-black text-white/80">
                            {shortAddr(x.sellerWallet)}
                          </div>
                        </div>
                      </div>

                      {x.deliveryRequired ? (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
                          <div className="text-[12px] font-black text-white/80">
                            Shipping info
                          </div>

                          <div className="mt-2 text-[12px] text-white/60">
                            {x.shippingName || "—"} • {x.shippingPhone || "—"}
                          </div>
                          <div className="mt-1 text-[12px] text-white/60">
                            {x.shippingCountry || "—"}, {x.shippingCity || "—"},{" "}
                            {x.shippingZip || "—"}
                          </div>
                          <div className="mt-1 text-[12px] text-white/60">
                            {x.shippingAddress || "—"}
                          </div>

                          {x.trackingCode || x.carrier || x.trackingUrl ? (
                            <div className="mt-3 text-[12px] text-white/70">
                              Tracking: {x.carrier || "—"} / {x.trackingCode || "—"}
                              {x.trackingUrl ? (
                                <>
                                  {" "}
                                  •{" "}
                                  <a
                                    href={x.trackingUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-amber-100 underline"
                                  >
                                    open
                                  </a>
                                </>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {canShip ? (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <div className="text-[12px] font-black text-white/85">
                            Ship order
                          </div>

                          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input
                              value={trackingCode[x.id] || ""}
                              onChange={(e) =>
                                setTrackingCode((s) => ({ ...s, [x.id]: e.target.value }))
                              }
                              placeholder="Tracking code"
                              className="h-11 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
                            />

                            <input
                              value={carrier[x.id] || ""}
                              onChange={(e) =>
                                setCarrier((s) => ({ ...s, [x.id]: e.target.value }))
                              }
                              placeholder="Carrier"
                              className="h-11 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
                            />

                            <input
                              value={trackingUrl[x.id] || ""}
                              onChange={(e) =>
                                setTrackingUrl((s) => ({ ...s, [x.id]: e.target.value }))
                              }
                              placeholder="Tracking URL"
                              className="h-11 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
                            />
                          </div>

                          <button
                            onClick={() => shipOrder(x.id)}
                            disabled={busyId === x.id}
                            className={cx(
                              "mt-3 inline-flex items-center justify-center px-5 py-3 rounded-2xl text-black font-extrabold transition",
                              "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.20)]",
                              busyId === x.id ? "opacity-60 cursor-not-allowed" : "hover:brightness-110"
                            )}
                          >
                            {busyId === x.id ? "Shipping..." : "Mark as shipped"}
                          </button>
                        </div>
                      ) : null}

                      {canConfirm ? (
                        <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                          <div className="text-[12px] text-emerald-100 font-black">
                            Order shipped. Confirm receipt to release escrow.
                          </div>

                          <button
                            onClick={() => confirmOrder(x.id)}
                            disabled={busyId === x.id}
                            className={cx(
                              "mt-3 inline-flex items-center justify-center px-5 py-3 rounded-2xl text-black font-extrabold transition",
                              "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.20)]",
                              busyId === x.id ? "opacity-60 cursor-not-allowed" : "hover:brightness-110"
                            )}
                          >
                            {busyId === x.id ? "Confirming..." : "Confirm delivery"}
                          </button>
                        </div>
                      ) : null}

                      <div className="mt-4 text-[11px] text-white/35">
                        Order ID: {x.id} • TX: {x.buyTxHash ? shortAddr(x.buyTxHash) : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
