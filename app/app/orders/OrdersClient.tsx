"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";

type OrderRow = {
  id: string;
  createdAt: string;
  updatedAt: string;

  chainId: number;
  contract: string;
  tokenId: string;
  vertical: string;

  sourceType?: "STORE" | "MARKETPLACE" | null;
  orderKind?: "PRIMARY" | "SECONDARY" | null;

  marketType?: "STANDARD" | "DELIVERY" | null;
  marketplaceContract?: string | null;
  marketplaceListingId?: string | null;
  marketplacePurchaseId?: string | null;

  listingId?: string | null;
  tradeId?: string | null;

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
  escrowReleaseTxHash?: string | null;
  escrowRefundTxHash?: string | null;

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

function shortHash(v?: string | null) {
  if (!v) return "—";
  const s = String(v);
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-6)}`;
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

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB");
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
    const out = bb ? `${a}.${bb}` : a;
    return `${out} ${symbol}`;
  } catch {
    return raw ? `${raw} ${paymentSymbol(paymentToken)}` : "—";
  }
}

function sourceTone(v?: string | null) {
  if (v === "MARKETPLACE") {
    return "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-100";
  }
  return "border-amber-500/20 bg-amber-500/10 text-amber-100";
}

function kindTone(v?: string | null) {
  if (v === "SECONDARY") {
    return "border-violet-500/20 bg-violet-500/10 text-violet-100";
  }
  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
}

function marketTone(v?: string | null) {
  if (v === "DELIVERY") {
    return "border-sky-500/20 bg-sky-500/10 text-sky-100";
  }
  return "border-white/10 bg-white/[0.06] text-white/80";
}

function isOnchainDeliveryOrder(x: OrderRow) {
  return (
    x.marketType === "DELIVERY" ||
    (x.sourceType === "MARKETPLACE" && Boolean(x.marketplacePurchaseId))
  );
}

function isShippingLocked(status: OrderRow["deliveryStatus"]) {
  return (
    status === "SHIPPED" ||
    status === "DELIVERED" ||
    status === "CONFIRMED" ||
    status === "CANCELLED" ||
    status === "RETURNED"
  );
}

function hasShippingMinimumFromRow(x: OrderRow) {
  return Boolean(
    String(x.shippingName || "").trim() &&
      String(x.shippingCountry || "").trim() &&
      String(x.shippingCity || "").trim() &&
      String(x.shippingAddress || "").trim()
  );
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

  const [shippingName, setShippingName] = useState<Record<string, string>>({});
  const [shippingPhone, setShippingPhone] = useState<Record<string, string>>({});
  const [shippingCountry, setShippingCountry] = useState<Record<string, string>>({});
  const [shippingCity, setShippingCity] = useState<Record<string, string>>({});
  const [shippingAddress, setShippingAddress] = useState<Record<string, string>>({});
  const [shippingZip, setShippingZip] = useState<Record<string, string>>({});

  function hydrateShippingForms(items: OrderRow[]) {
    setShippingName((prev) => {
      const next = { ...prev };
      for (const x of items) next[x.id] = x.shippingName || "";
      return next;
    });

    setShippingPhone((prev) => {
      const next = { ...prev };
      for (const x of items) next[x.id] = x.shippingPhone || "";
      return next;
    });

    setShippingCountry((prev) => {
      const next = { ...prev };
      for (const x of items) next[x.id] = x.shippingCountry || "";
      return next;
    });

    setShippingCity((prev) => {
      const next = { ...prev };
      for (const x of items) next[x.id] = x.shippingCity || "";
      return next;
    });

    setShippingAddress((prev) => {
      const next = { ...prev };
      for (const x of items) next[x.id] = x.shippingAddress || "";
      return next;
    });

    setShippingZip((prev) => {
      const next = { ...prev };
      for (const x of items) next[x.id] = x.shippingZip || "";
      return next;
    });
  }

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const j = await fetchJSON<OrdersResponse>(
        `/api/delivery/orders?role=${role}&take=100`
      );
      const items = Array.isArray(j?.items) ? j.items : [];
      setRows(items);
      hydrateShippingForms(items);
    } catch (e: any) {
      setErr(e?.message || "Failed to load delivery orders");
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

  async function saveShipping(id: string) {
    setBusyId(id);
    setErr(null);

    try {
      await fetchJSON(`/api/delivery/orders/${id}/shipping`, {
        method: "POST",
        body: JSON.stringify({
          shippingName: shippingName[id] || "",
          shippingPhone: shippingPhone[id] || "",
          shippingCountry: shippingCountry[id] || "",
          shippingCity: shippingCity[id] || "",
          shippingAddress: shippingAddress[id] || "",
          shippingZip: shippingZip[id] || "",
        }),
      });

      await load();
    } catch (e: any) {
      setErr(e?.message || "Save shipping failed");
    } finally {
      setBusyId(null);
    }
  }

  async function shipOrder(id: string) {
    setBusyId(id);
    setErr(null);

    try {
      await fetchJSON(`/api/delivery/orders/${id}/ship`, {
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
      await fetchJSON(`/api/delivery/orders/${id}/confirm`, {
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
                Delivery Center
              </div>
              <div className="mt-2 text-xl md:text-2xl font-black tracking-tight text-white/90">
                My Delivery Orders
              </div>
              <div className="mt-2 text-[12px] text-white/55 max-w-2xl">
                Buyer fills shipping details here. Seller then adds tracking and ships the order.
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
            Loading delivery orders...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-white/60">
            No delivery orders yet.
          </div>
        ) : (
          rows.map((x) => {
            const img = ipfsToHttp(x.product?.image || null);
            const nftHref = `/nft/${x.chainId}/${x.contract}/${encodeURIComponent(String(x.tokenId))}`;
            const roomHref = `/app/orders/${x.id}`;
            const onchainDelivery = isOnchainDeliveryOrder(x);

            const shippingDraftMinimum = Boolean(
              String(shippingName[x.id] || "").trim() &&
                String(shippingCountry[x.id] || "").trim() &&
                String(shippingCity[x.id] || "").trim() &&
                String(shippingAddress[x.id] || "").trim()
            );

            const shippingSavedMinimum = hasShippingMinimumFromRow(x);

            const canEditShipping =
              x.viewerRole === "buyer" &&
              x.deliveryRequired &&
              !isShippingLocked(x.deliveryStatus);

            const canShip =
              x.viewerRole === "seller" &&
              x.deliveryRequired &&
              shippingSavedMinimum &&
              x.deliveryStatus !== "SHIPPED" &&
              x.deliveryStatus !== "CONFIRMED" &&
              x.deliveryStatus !== "DELIVERED" &&
              x.deliveryStatus !== "CANCELLED";

            const showWaitingForBuyerShipping =
              x.viewerRole === "seller" &&
              x.deliveryRequired &&
              !shippingSavedMinimum &&
              x.deliveryStatus !== "CANCELLED" &&
              x.deliveryStatus !== "SHIPPED" &&
              x.deliveryStatus !== "DELIVERED" &&
              x.deliveryStatus !== "CONFIRMED";

            const canConfirm =
              x.viewerRole === "buyer" &&
              x.deliveryRequired &&
              x.deliveryStatus === "SHIPPED" &&
              x.escrowStatus !== "REFUNDED" &&
              x.escrowStatus !== "CANCELLED" &&
              x.escrowStatus !== "DISPUTED" &&
              !onchainDelivery;

            const showOnchainConfirmNotice =
              x.viewerRole === "buyer" &&
              x.deliveryRequired &&
              (x.deliveryStatus === "SHIPPED" ||
                x.deliveryStatus === "DELIVERED" ||
                x.deliveryStatus === "CONFIRMED") &&
              onchainDelivery &&
              x.escrowStatus !== "RELEASED" &&
              x.escrowStatus !== "REFUNDED" &&
              x.escrowStatus !== "CANCELLED";

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
                            {x.product?.name || `Delivery NFT #${x.tokenId}`}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.06] text-[10px] font-black text-white/80">
                              {x.viewerRole.toUpperCase()}
                            </span>

                            {x.sourceType ? (
                              <span
                                className={cx(
                                  "px-2 py-1 rounded-full border text-[10px] font-black",
                                  sourceTone(x.sourceType)
                                )}
                              >
                                {x.sourceType}
                              </span>
                            ) : null}

                            {x.orderKind ? (
                              <span
                                className={cx(
                                  "px-2 py-1 rounded-full border text-[10px] font-black",
                                  kindTone(x.orderKind)
                                )}
                              >
                                {x.orderKind}
                              </span>
                            ) : null}

                            {x.marketType ? (
                              <span
                                className={cx(
                                  "px-2 py-1 rounded-full border text-[10px] font-black",
                                  marketTone(x.marketType)
                                )}
                              >
                                MARKET {x.marketType}
                              </span>
                            ) : null}

                            <span className="px-2 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[10px] font-black text-emerald-100">
                              {x.escrowStatus}
                            </span>

                            <span className="px-2 py-1 rounded-full border border-sky-500/20 bg-sky-500/10 text-[10px] font-black text-sky-100">
                              {x.deliveryStatus}
                            </span>

                            <span className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.06] text-[10px] font-black text-white/80">
                              {titleCase(x.vertical)}
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
                            {formatPaymentAmount(x.totalPrice, x.paymentToken)}
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
                            {formatPaymentAmount(x.unitPrice, x.paymentToken)}
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

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                          <div className="text-[11px] text-white/45">Created</div>
                          <div className="mt-1 text-[12px] font-black text-white/80">
                            {fmtDate(x.createdAt)}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                          <div className="text-[11px] text-white/45">Shipped</div>
                          <div className="mt-1 text-[12px] font-black text-white/80">
                            {fmtDate(x.shippedAt)}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                          <div className="text-[11px] text-white/45">Confirmed</div>
                          <div className="mt-1 text-[12px] font-black text-white/80">
                            {fmtDate(x.confirmedAt)}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                          <div className="text-[11px] text-white/45">Released</div>
                          <div className="mt-1 text-[12px] font-black text-white/80">
                            {fmtDate(x.releasedAt)}
                          </div>
                        </div>
                      </div>

                      {canEditShipping ? (
                        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                          <div className="text-[12px] font-black text-amber-100">
                            Delivery details
                          </div>
                          <div className="mt-2 text-[12px] text-amber-50/85 leading-relaxed">
                            Fill your shipping info here. Seller will see it in this order and can ship the item after that.
                          </div>

                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                              value={shippingName[x.id] || ""}
                              onChange={(e) =>
                                setShippingName((s) => ({ ...s, [x.id]: e.target.value }))
                              }
                              placeholder="Full name *"
                              className="h-11 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
                            />

                            <input
                              value={shippingPhone[x.id] || ""}
                              onChange={(e) =>
                                setShippingPhone((s) => ({ ...s, [x.id]: e.target.value }))
                              }
                              placeholder="Phone"
                              className="h-11 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
                            />

                            <input
                              value={shippingCountry[x.id] || ""}
                              onChange={(e) =>
                                setShippingCountry((s) => ({ ...s, [x.id]: e.target.value }))
                              }
                              placeholder="Country *"
                              className="h-11 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
                            />

                            <input
                              value={shippingCity[x.id] || ""}
                              onChange={(e) =>
                                setShippingCity((s) => ({ ...s, [x.id]: e.target.value }))
                              }
                              placeholder="City *"
                              className="h-11 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
                            />

                            <input
                              value={shippingZip[x.id] || ""}
                              onChange={(e) =>
                                setShippingZip((s) => ({ ...s, [x.id]: e.target.value }))
                              }
                              placeholder="ZIP / Postal code"
                              className="h-11 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
                            />

                            <div className="hidden md:block" />

                            <textarea
                              value={shippingAddress[x.id] || ""}
                              onChange={(e) =>
                                setShippingAddress((s) => ({ ...s, [x.id]: e.target.value }))
                              }
                              placeholder="Address *"
                              rows={4}
                              className="md:col-span-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white/95 outline-none focus:border-white/20 resize-none"
                            />
                          </div>

                          <div className="mt-3 text-[11px] text-white/45">
                            Required: full name, country, city, address.
                          </div>

                          <button
                            onClick={() => saveShipping(x.id)}
                            disabled={busyId === x.id || !shippingDraftMinimum}
                            className={cx(
                              "mt-4 inline-flex items-center justify-center px-5 py-3 rounded-2xl text-black font-extrabold transition",
                              "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.20)]",
                              busyId === x.id || !shippingDraftMinimum
                                ? "opacity-60 cursor-not-allowed"
                                : "hover:brightness-110"
                            )}
                          >
                            {busyId === x.id ? "Saving..." : "Save delivery details"}
                          </button>
                        </div>
                      ) : null}

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

                      {showWaitingForBuyerShipping ? (
                        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                          <div className="text-[12px] font-black text-amber-100">
                            Waiting for buyer shipping details
                          </div>
                          <div className="mt-2 text-[12px] text-amber-50/85 leading-relaxed">
                            Buyer has not saved delivery address yet. Seller shipping block will unlock after buyer fills it in.
                          </div>
                        </div>
                      ) : null}

                      {x.escrowStatus === "NOT_REQUIRED" && !onchainDelivery ? (
                        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-[12px] text-amber-50/85">
                          <div className="font-black text-amber-100">Official store delivery</div>
                          <div className="mt-2 leading-relaxed">
                            This order does not use escrow. Use the order room for shipping, support and refund communication.
                          </div>
                        </div>
                      ) : null}

                      {onchainDelivery ? (
                        <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-[12px] text-sky-50/85">
                          <div className="font-black text-sky-100">
                            On-chain delivery escrow
                          </div>
                          <div className="mt-2 leading-relaxed">
                            This order uses the delivery marketplace contract. Confirm / release / refund
                            must be executed through the on-chain delivery flow, and the database is updated
                            later by the indexer.
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                            {x.marketplacePurchaseId ? (
                              <span className="px-2 py-1 rounded-full border border-sky-500/20 bg-sky-500/10 font-black text-sky-100">
                                Purchase #{x.marketplacePurchaseId}
                              </span>
                            ) : null}

                            {x.marketplaceContract ? (
                              <span className="px-2 py-1 rounded-full border border-sky-500/20 bg-sky-500/10 font-black text-sky-100">
                                {shortAddr(x.marketplaceContract)}
                              </span>
                            ) : null}
                          </div>
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
                            {x.escrowStatus === "NOT_REQUIRED"
                              ? "Order shipped. Confirm receipt to complete the delivery status."
                              : "Order shipped. Confirm receipt to release escrow."}
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

                      {showOnchainConfirmNotice ? (
                        <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
                          <div className="text-[12px] text-sky-100 font-black">
                            Buyer confirmation is on-chain for this order
                          </div>
                          <div className="mt-2 text-[12px] text-sky-50/85 leading-relaxed">
                            This delivery purchase is controlled by the delivery marketplace contract.
                            Do not use the old off-chain confirm route for it.
                          </div>
                        </div>
                      ) : null}

                      {(x.noteBuyer || x.noteSeller || x.adminNote) ? (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                          {x.noteBuyer ? (
                            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                              <div className="text-[11px] text-white/45 uppercase tracking-wider font-semibold">
                                Buyer note
                              </div>
                              <div className="mt-2 text-[12px] text-white/75 whitespace-pre-wrap">
                                {x.noteBuyer}
                              </div>
                            </div>
                          ) : null}

                          {x.noteSeller ? (
                            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                              <div className="text-[11px] text-white/45 uppercase tracking-wider font-semibold">
                                Seller note
                              </div>
                              <div className="mt-2 text-[12px] text-white/75 whitespace-pre-wrap">
                                {x.noteSeller}
                              </div>
                            </div>
                          ) : null}

                          {x.adminNote ? (
                            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                              <div className="text-[11px] text-white/45 uppercase tracking-wider font-semibold">
                                Admin note
                              </div>
                              <div className="mt-2 text-[12px] text-white/75 whitespace-pre-wrap">
                                {x.adminNote}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={roomHref}
                          className="inline-flex items-center justify-center px-4 py-2 rounded-2xl text-black font-extrabold transition bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.20)] hover:brightness-110 text-[12px]"
                        >
                          Open room
                        </Link>

                        <Link
                          href={nftHref}
                          className="inline-flex items-center justify-center px-4 py-2 rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition text-[12px] font-black text-white/85"
                        >
                          Open NFT
                        </Link>
                      </div>

                      <div className="mt-4 text-[11px] text-white/35">
                        Order ID: {x.id}
                        <span className="mx-2">•</span>
                        TX: {shortHash(x.buyTxHash)}
                        {x.marketplacePurchaseId ? (
                          <>
                            <span className="mx-2">•</span>
                            Purchase #{x.marketplacePurchaseId}
                          </>
                        ) : null}
                        {x.marketplaceListingId ? (
                          <>
                            <span className="mx-2">•</span>
                            Listing #{x.marketplaceListingId}
                          </>
                        ) : null}
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