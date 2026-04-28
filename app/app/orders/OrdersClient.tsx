"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";

type MarketType = "STANDARD" | "DELIVERY" | "PROTECTED";
type FulfillmentType =
  | "PHYSICAL_GOOD"
  | "DIGITAL_SERVICE"
  | "ONLINE_SESSION"
  | "LOCAL_SERVICE";

type ServiceStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "REVISION_REQUESTED"
  | "COMPLETED"
  | "CONFIRMED"
  | "CANCELLED";

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

  marketType?: MarketType | null;
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

  fulfillmentType?: FulfillmentType | null;
  serviceStatus?: ServiceStatus | null;
  category?: string | null;
  subcategory?: string | null;

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
  refundedAt?: string | null;
  disputedAt?: string | null;

  buyerConfirmedAt?: string | null;
  refundRequestedAt?: string | null;
  nftReturnedAt?: string | null;
  refundRejectedAt?: string | null;

  scheduledFor?: string | null;
  workStartedAt?: string | null;
  submittedAt?: string | null;
  revisionRequestedAt?: string | null;
  completedAt?: string | null;

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

const REALIFE_SELLER_FEE_BPS = 250n;
const BPS_DENOMINATOR = 10_000n;

function formatFeePercent() {
  return `${Number(REALIFE_SELLER_FEE_BPS) / 100}%`;
}

function calcSellerFee(raw?: string | null) {
  try {
    if (!raw) return { fee: null as string | null, payout: null as string | null };

    const total = BigInt(raw);
    const fee = (total * REALIFE_SELLER_FEE_BPS) / BPS_DENOMINATOR;
    const payout = total > fee ? total - fee : 0n;

    return {
      fee: fee.toString(),
      payout: payout.toString(),
    };
  } catch {
    return { fee: null as string | null, payout: null as string | null };
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
  if (v === "PROTECTED") {
    return "border-violet-500/20 bg-violet-500/10 text-violet-100";
  }
  if (v === "DELIVERY") {
    return "border-sky-500/20 bg-sky-500/10 text-sky-100";
  }
  return "border-white/10 bg-white/[0.06] text-white/80";
}

function fulfillmentTone(v?: string | null) {
  switch (String(v || "")) {
    case "PHYSICAL_GOOD":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
    case "DIGITAL_SERVICE":
      return "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-100";
    case "ONLINE_SESSION":
      return "border-amber-500/20 bg-amber-500/10 text-amber-100";
    case "LOCAL_SERVICE":
      return "border-sky-500/20 bg-sky-500/10 text-sky-100";
    default:
      return "border-white/10 bg-white/[0.06] text-white/80";
  }
}

function serviceStatusTone(v?: string | null) {
  switch (String(v || "")) {
    case "CONFIRMED":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
    case "COMPLETED":
    case "SUBMITTED":
      return "border-sky-500/20 bg-sky-500/10 text-sky-100";
    case "REVISION_REQUESTED":
      return "border-amber-500/20 bg-amber-500/10 text-amber-100";
    case "CANCELLED":
      return "border-rose-500/20 bg-rose-500/10 text-rose-100";
    case "IN_PROGRESS":
      return "border-violet-500/20 bg-violet-500/10 text-violet-100";
    default:
      return "border-white/10 bg-white/[0.06] text-white/80";
  }
}

function isOnchainEscrowOrder(x: OrderRow) {
  return (
    x.marketType === "DELIVERY" ||
    x.marketType === "PROTECTED" ||
    (x.sourceType === "MARKETPLACE" && Boolean(x.marketplacePurchaseId))
  );
}

function isPhysicalOrder(x: OrderRow) {
  return x.deliveryRequired || x.fulfillmentType === "PHYSICAL_GOOD";
}

function isServiceOrder(x: OrderRow) {
  return (
    x.fulfillmentType === "DIGITAL_SERVICE" ||
    x.fulfillmentType === "ONLINE_SESSION" ||
    x.fulfillmentType === "LOCAL_SERVICE"
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
      setErr(e?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/45">
                Orders Center
              </div>
              <div className="mt-2 text-xl font-black tracking-tight text-white/90 md:text-2xl">
                My Orders
              </div>
              <div className="mt-2 max-w-2xl text-[12px] text-white/55">
                Physical goods use shipping flow. Service orders use completion
                flow. Protected orders keep payout in escrow until buyer
                confirms. Realife applies a transparent 2.5% seller-side fee
                on completed marketplace transactions.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setRole("all")}
                className={cx(
                  "rounded-2xl border px-4 py-2 text-[12px] font-black transition",
                  role === "all"
                    ? "border-black/10 bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black ring-1 ring-black/15"
                    : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                )}
              >
                All
              </button>

              <button
                onClick={() => setRole("buyer")}
                className={cx(
                  "rounded-2xl border px-4 py-2 text-[12px] font-black transition",
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
                  "rounded-2xl border px-4 py-2 text-[12px] font-black transition",
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
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                Total
              </div>
              <div className="mt-1 text-lg font-black text-white/90">
                {rows.length}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                As buyer
              </div>
              <div className="mt-1 text-lg font-black text-emerald-200">
                {buyerCount}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                As seller
              </div>
              <div className="mt-1 text-lg font-black text-amber-100">
                {sellerCount}
              </div>
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
            const nftHref = `/nft/${x.chainId}/${x.contract}/${encodeURIComponent(
              String(x.tokenId)
            )}`;
            const roomHref = `/app/orders/${x.id}`;

            const onchainEscrow = isOnchainEscrowOrder(x);
            const isPhysical = isPhysicalOrder(x);
            const isService = isServiceOrder(x);

            const shippingDraftMinimum = Boolean(
              String(shippingName[x.id] || "").trim() &&
                String(shippingCountry[x.id] || "").trim() &&
                String(shippingCity[x.id] || "").trim() &&
                String(shippingAddress[x.id] || "").trim()
            );

            const shippingSavedMinimum = hasShippingMinimumFromRow(x);

            const canEditShipping =
              x.viewerRole === "buyer" && isPhysical && !isShippingLocked(x.deliveryStatus);

            const canShip =
              x.viewerRole === "seller" &&
              isPhysical &&
              shippingSavedMinimum &&
              x.deliveryStatus !== "SHIPPED" &&
              x.deliveryStatus !== "DELIVERED" &&
              x.deliveryStatus !== "CONFIRMED" &&
              x.deliveryStatus !== "CANCELLED" &&
              x.deliveryStatus !== "RETURNED";

            const showWaitingForBuyerShipping =
              x.viewerRole === "seller" &&
              isPhysical &&
              !shippingSavedMinimum &&
              x.deliveryStatus !== "CANCELLED" &&
              x.deliveryStatus !== "SHIPPED" &&
              x.deliveryStatus !== "DELIVERED" &&
              x.deliveryStatus !== "CONFIRMED" &&
              x.deliveryStatus !== "RETURNED";

            const canConfirmOffchain =
              x.viewerRole === "buyer" &&
              !onchainEscrow &&
              x.escrowStatus !== "REFUNDED" &&
              x.escrowStatus !== "CANCELLED" &&
              x.escrowStatus !== "DISPUTED" &&
              ((isPhysical &&
                (x.deliveryStatus === "SHIPPED" ||
                  x.deliveryStatus === "DELIVERED")) ||
                (isService &&
                  (x.serviceStatus === "SUBMITTED" ||
                    x.serviceStatus === "COMPLETED")));

            const showOnchainConfirmNotice =
              x.viewerRole === "buyer" &&
              onchainEscrow &&
              x.escrowStatus !== "RELEASED" &&
              x.escrowStatus !== "REFUNDED" &&
              x.escrowStatus !== "CANCELLED";

            const sellerFee = calcSellerFee(x.totalPrice);

            return (
              <div
                key={x.id}
                className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_24px_90px_rgba(0,0,0,0.55)]"
              >
                <div className="p-5 md:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row">
                    <div className="w-full shrink-0 lg:w-[140px]">
                      <div className="aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                        {img ? (
                          <img
                            src={img}
                            alt={x.product?.name || `Token #${x.tokenId}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-black text-white/25">
                            No image
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[18px] font-black text-white/90">
                            {x.product?.name || `Order NFT #${x.tokenId}`}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-black text-white/80">
                              {x.viewerRole.toUpperCase()}
                            </span>

                            {x.sourceType ? (
                              <span
                                className={cx(
                                  "rounded-full border px-2 py-1 text-[10px] font-black",
                                  sourceTone(x.sourceType)
                                )}
                              >
                                {x.sourceType}
                              </span>
                            ) : null}

                            {x.orderKind ? (
                              <span
                                className={cx(
                                  "rounded-full border px-2 py-1 text-[10px] font-black",
                                  kindTone(x.orderKind)
                                )}
                              >
                                {x.orderKind}
                              </span>
                            ) : null}

                            {x.marketType ? (
                              <span
                                className={cx(
                                  "rounded-full border px-2 py-1 text-[10px] font-black",
                                  marketTone(x.marketType)
                                )}
                              >
                                MARKET {x.marketType}
                              </span>
                            ) : null}

                            {x.fulfillmentType ? (
                              <span
                                className={cx(
                                  "rounded-full border px-2 py-1 text-[10px] font-black",
                                  fulfillmentTone(x.fulfillmentType)
                                )}
                              >
                                {titleCase(x.fulfillmentType)}
                              </span>
                            ) : null}

                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-100">
                              {x.escrowStatus}
                            </span>

                            {isPhysical ? (
                              <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-[10px] font-black text-sky-100">
                                {x.deliveryStatus}
                              </span>
                            ) : null}

                            {isService && x.serviceStatus ? (
                              <span
                                className={cx(
                                  "rounded-full border px-2 py-1 text-[10px] font-black",
                                  serviceStatusTone(x.serviceStatus)
                                )}
                              >
                                SERVICE {x.serviceStatus}
                              </span>
                            ) : null}

                            <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-black text-white/80">
                              {titleCase(x.vertical)}
                            </span>

                            {x.officialItem ? (
                              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-100">
                                OFFICIAL
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[12px] text-white/45">Buyer paid</div>
                          <div className="text-[16px] font-black text-amber-100">
                            {formatPaymentAmount(x.totalPrice, x.paymentToken)}
                          </div>
                          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
                            Seller fee {formatFeePercent()}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                          <div className="text-[11px] text-white/45">Amount</div>
                          <div className="mt-1 text-[13px] font-black text-white/80">
                            {x.amount}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                          <div className="text-[11px] text-white/45">
                            Unit price
                          </div>
                          <div className="mt-1 text-[13px] font-black text-white/80">
                            {formatPaymentAmount(x.unitPrice, x.paymentToken)}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.06] p-3">
                          <div className="text-[11px] text-amber-100/55">
                            Realife fee
                          </div>
                          <div className="mt-1 text-[13px] font-black text-amber-100">
                            {formatPaymentAmount(sellerFee.fee, x.paymentToken)}
                          </div>
                          <div className="mt-1 text-[10px] text-white/35">
                            {formatFeePercent()} seller-side
                          </div>
                        </div>

                        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] p-3">
                          <div className="text-[11px] text-emerald-100/55">
                            Seller payout
                          </div>
                          <div className="mt-1 text-[13px] font-black text-emerald-100">
                            {formatPaymentAmount(sellerFee.payout, x.paymentToken)}
                          </div>
                          <div className="mt-1 text-[10px] text-white/35">
                            after completion
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

                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                          <div className="text-[11px] text-white/45">Created</div>
                          <div className="mt-1 text-[12px] font-black text-white/80">
                            {fmtDate(x.createdAt)}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                          <div className="text-[11px] text-white/45">
                            {isPhysical ? "Shipped" : "Submitted"}
                          </div>
                          <div className="mt-1 text-[12px] font-black text-white/80">
                            {fmtDate(isPhysical ? x.shippedAt : x.submittedAt)}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                          <div className="text-[11px] text-white/45">Confirmed</div>
                          <div className="mt-1 text-[12px] font-black text-white/80">
                            {fmtDate(x.confirmedAt || x.buyerConfirmedAt)}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                          <div className="text-[11px] text-white/45">Released</div>
                          <div className="mt-1 text-[12px] font-black text-white/80">
                            {fmtDate(x.releasedAt)}
                          </div>
                        </div>
                      </div>

                      {(x.category || x.subcategory) && (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4 text-[12px] text-white/65">
                          {[x.category, x.subcategory].filter(Boolean).join(" • ")}
                        </div>
                      )}

                      {canEditShipping ? (
                        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                          <div className="text-[12px] font-black text-amber-100">
                            Delivery details
                          </div>
                          <div className="mt-2 text-[12px] leading-relaxed text-amber-50/85">
                            Fill your shipping info here. Seller will see it in
                            this order and can ship after that.
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <input
                              value={shippingName[x.id] || ""}
                              onChange={(e) =>
                                setShippingName((s) => ({
                                  ...s,
                                  [x.id]: e.target.value,
                                }))
                              }
                              placeholder="Full name *"
                              className="h-11 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
                            />

                            <input
                              value={shippingPhone[x.id] || ""}
                              onChange={(e) =>
                                setShippingPhone((s) => ({
                                  ...s,
                                  [x.id]: e.target.value,
                                }))
                              }
                              placeholder="Phone"
                              className="h-11 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
                            />

                            <input
                              value={shippingCountry[x.id] || ""}
                              onChange={(e) =>
                                setShippingCountry((s) => ({
                                  ...s,
                                  [x.id]: e.target.value,
                                }))
                              }
                              placeholder="Country *"
                              className="h-11 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
                            />

                            <input
                              value={shippingCity[x.id] || ""}
                              onChange={(e) =>
                                setShippingCity((s) => ({
                                  ...s,
                                  [x.id]: e.target.value,
                                }))
                              }
                              placeholder="City *"
                              className="h-11 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
                            />

                            <input
                              value={shippingZip[x.id] || ""}
                              onChange={(e) =>
                                setShippingZip((s) => ({
                                  ...s,
                                  [x.id]: e.target.value,
                                }))
                              }
                              placeholder="ZIP / Postal code"
                              className="h-11 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
                            />

                            <div className="hidden md:block" />

                            <textarea
                              value={shippingAddress[x.id] || ""}
                              onChange={(e) =>
                                setShippingAddress((s) => ({
                                  ...s,
                                  [x.id]: e.target.value,
                                }))
                              }
                              placeholder="Address *"
                              rows={4}
                              className="resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white/95 outline-none focus:border-white/20 md:col-span-2"
                            />
                          </div>

                          <div className="mt-3 text-[11px] text-white/45">
                            Required: full name, country, city, address.
                          </div>

                          <button
                            onClick={() => saveShipping(x.id)}
                            disabled={busyId === x.id || !shippingDraftMinimum}
                            className={cx(
                              "mt-4 inline-flex items-center justify-center rounded-2xl px-5 py-3 font-extrabold text-black transition",
                              "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.20)]",
                              busyId === x.id || !shippingDraftMinimum
                                ? "cursor-not-allowed opacity-60"
                                : "hover:brightness-110"
                            )}
                          >
                            {busyId === x.id
                              ? "Saving..."
                              : "Save delivery details"}
                          </button>
                        </div>
                      ) : null}

                      {isPhysical ? (
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
                              Tracking: {x.carrier || "—"} /{" "}
                              {x.trackingCode || "—"}
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

                      {isService ? (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
                          <div className="text-[12px] font-black text-white/80">
                            Service flow
                          </div>
                          <div className="mt-2 text-[12px] text-white/60">
                            Fulfillment: {titleCase(x.fulfillmentType)}
                          </div>
                          <div className="mt-1 text-[12px] text-white/60">
                            Status: {x.serviceStatus || "—"}
                          </div>
                          <div className="mt-1 text-[12px] text-white/60">
                            Scheduled: {fmtDate(x.scheduledFor)}
                          </div>
                          <div className="mt-1 text-[12px] text-white/60">
                            Started: {fmtDate(x.workStartedAt)}
                          </div>
                          <div className="mt-1 text-[12px] text-white/60">
                            Submitted: {fmtDate(x.submittedAt)}
                          </div>
                          <div className="mt-1 text-[12px] text-white/60">
                            Completed: {fmtDate(x.completedAt)}
                          </div>
                        </div>
                      ) : null}

                      {showWaitingForBuyerShipping ? (
                        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                          <div className="text-[12px] font-black text-amber-100">
                            Waiting for buyer shipping details
                          </div>
                          <div className="mt-2 text-[12px] leading-relaxed text-amber-50/85">
                            Buyer has not saved delivery address yet. Seller
                            shipping block will unlock after buyer fills it in.
                          </div>
                        </div>
                      ) : null}

                      {x.escrowStatus === "NOT_REQUIRED" && !onchainEscrow ? (
                        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-[12px] text-amber-50/85">
                          <div className="font-black text-amber-100">
                            Official store flow
                          </div>
                          <div className="mt-2 leading-relaxed">
                            This order does not use on-chain escrow. Use the
                            room for shipping, support and coordination.
                          </div>
                        </div>
                      ) : null}

                      {onchainEscrow ? (
                        <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-[12px] text-sky-50/85">
                          <div className="font-black text-sky-100">
                            On-chain escrow flow
                          </div>
                          <div className="mt-2 leading-relaxed">
                            This order is controlled by a marketplace contract.
                            Buyer confirmation and refund path are on-chain.
                            Protected refund can require NFT return to the
                            marketplace contract first. For protected one-step
                            refund flow, buyer can use the contract path like{" "}
                            <span className="font-black">
                              requestRefundAndReturnNft(purchaseId)
                            </span>{" "}
                            after approval.
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                            {x.marketplacePurchaseId ? (
                              <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 font-black text-sky-100">
                                Purchase #{x.marketplacePurchaseId}
                              </span>
                            ) : null}

                            {x.marketplaceContract ? (
                              <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 font-black text-sky-100">
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

                          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                            <input
                              value={trackingCode[x.id] || ""}
                              onChange={(e) =>
                                setTrackingCode((s) => ({
                                  ...s,
                                  [x.id]: e.target.value,
                                }))
                              }
                              placeholder="Tracking code"
                              className="h-11 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
                            />

                            <input
                              value={carrier[x.id] || ""}
                              onChange={(e) =>
                                setCarrier((s) => ({
                                  ...s,
                                  [x.id]: e.target.value,
                                }))
                              }
                              placeholder="Carrier"
                              className="h-11 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
                            />

                            <input
                              value={trackingUrl[x.id] || ""}
                              onChange={(e) =>
                                setTrackingUrl((s) => ({
                                  ...s,
                                  [x.id]: e.target.value,
                                }))
                              }
                              placeholder="Tracking URL"
                              className="h-11 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
                            />
                          </div>

                          <button
                            onClick={() => shipOrder(x.id)}
                            disabled={busyId === x.id}
                            className={cx(
                              "mt-3 inline-flex items-center justify-center rounded-2xl px-5 py-3 font-extrabold text-black transition",
                              "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.20)]",
                              busyId === x.id
                                ? "cursor-not-allowed opacity-60"
                                : "hover:brightness-110"
                            )}
                          >
                            {busyId === x.id ? "Shipping..." : "Mark as shipped"}
                          </button>
                        </div>
                      ) : null}

                      {canConfirmOffchain ? (
                        <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                          <div className="text-[12px] font-black text-emerald-100">
                            {isPhysical
                              ? x.escrowStatus === "NOT_REQUIRED"
                                ? "Order shipped. Confirm receipt to finalize delivery status."
                                : "Order shipped. Confirm receipt to release escrow."
                              : x.escrowStatus === "NOT_REQUIRED"
                              ? "Service looks ready. Confirm successful completion."
                              : "Service looks ready. Confirm successful completion to release escrow."}
                          </div>

                          <button
                            onClick={() => confirmOrder(x.id)}
                            disabled={busyId === x.id}
                            className={cx(
                              "mt-3 inline-flex items-center justify-center rounded-2xl px-5 py-3 font-extrabold text-black transition",
                              "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.20)]",
                              busyId === x.id
                                ? "cursor-not-allowed opacity-60"
                                : "hover:brightness-110"
                            )}
                          >
                            {busyId === x.id
                              ? "Confirming..."
                              : isPhysical
                              ? "Confirm delivery"
                              : "Confirm service"}
                          </button>
                        </div>
                      ) : null}

                      {showOnchainConfirmNotice ? (
                        <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
                          <div className="text-[12px] font-black text-sky-100">
                            Buyer confirmation is on-chain for this order
                          </div>
                          <div className="mt-2 text-[12px] leading-relaxed text-sky-50/85">
                            Final payout should come from the marketplace
                            contract after buyer wallet action. Do not use old
                            off-chain confirm for protected / delivery
                            marketplace orders.
                          </div>
                        </div>
                      ) : null}

                      {(x.noteBuyer || x.noteSeller || x.adminNote) && (
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                          {x.noteBuyer ? (
                            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                                Buyer note
                              </div>
                              <div className="mt-2 whitespace-pre-wrap text-[12px] text-white/75">
                                {x.noteBuyer}
                              </div>
                            </div>
                          ) : null}

                          {x.noteSeller ? (
                            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                                Seller note
                              </div>
                              <div className="mt-2 whitespace-pre-wrap text-[12px] text-white/75">
                                {x.noteSeller}
                              </div>
                            </div>
                          ) : null}

                          {x.adminNote ? (
                            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                                Admin note
                              </div>
                              <div className="mt-2 whitespace-pre-wrap text-[12px] text-white/75">
                                {x.adminNote}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={roomHref}
                          className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-4 py-2 text-[12px] font-extrabold text-black ring-1 ring-black/15 transition hover:brightness-110 shadow-[0_18px_60px_rgba(212,175,55,0.20)]"
                        >
                          Open room
                        </Link>

                        <Link
                          href={nftHref}
                          className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-2 text-[12px] font-black text-white/85 transition hover:bg-white/[0.10]"
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
