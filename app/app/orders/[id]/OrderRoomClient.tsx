"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";

type ViewerRole = "buyer" | "seller" | "unknown";
type MessageRole = "BUYER" | "SELLER" | "SUPPORT" | "SYSTEM";
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

type OrderResponse = {
  ok: boolean;
  viewerRole: ViewerRole;
  order: OrderRow;
};

type DeliveryMessage = {
  id: string;
  orderId: string;
  senderUserId: string | null;
  senderWallet: string | null;
  senderRole: MessageRole;
  body: string;
  isInternal: boolean;
  createdAt: string;
};

type MessagesResponse = {
  ok: boolean;
  items: DeliveryMessage[];
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

function escrowTone(v?: string | null) {
  switch (String(v || "")) {
    case "RELEASED":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
    case "FUNDED":
      return "border-sky-500/20 bg-sky-500/10 text-sky-100";
    case "REFUNDED":
    case "DISPUTED":
    case "CANCELLED":
      return "border-rose-500/20 bg-rose-500/10 text-rose-100";
    default:
      return "border-white/10 bg-white/[0.06] text-white/80";
  }
}

function deliveryTone(v?: string | null) {
  switch (String(v || "")) {
    case "CONFIRMED":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
    case "READY_TO_SHIP":
    case "SHIPPED":
    case "DELIVERED":
      return "border-sky-500/20 bg-sky-500/10 text-sky-100";
    case "RETURN_REQUESTED":
    case "RETURNED":
    case "CANCELLED":
      return "border-rose-500/20 bg-rose-500/10 text-rose-100";
    default:
      return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  }
}

function serviceTone(v?: string | null) {
  switch (String(v || "")) {
    case "CONFIRMED":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
    case "COMPLETED":
    case "SUBMITTED":
      return "border-sky-500/20 bg-sky-500/10 text-sky-100";
    case "REVISION_REQUESTED":
      return "border-amber-500/20 bg-amber-500/10 text-amber-100";
    case "IN_PROGRESS":
      return "border-violet-500/20 bg-violet-500/10 text-violet-100";
    case "CANCELLED":
      return "border-rose-500/20 bg-rose-500/10 text-rose-100";
    default:
      return "border-white/10 bg-white/[0.06] text-white/80";
  }
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

function messageTone(role: MessageRole, internal: boolean) {
  if (internal) {
    return "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-50";
  }
  switch (role) {
    case "BUYER":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-50";
    case "SELLER":
      return "border-sky-500/20 bg-sky-500/10 text-sky-50";
    case "SUPPORT":
      return "border-amber-500/20 bg-amber-500/10 text-amber-50";
    default:
      return "border-white/10 bg-white/[0.06] text-white/80";
  }
}

function senderLabel(role: MessageRole) {
  switch (role) {
    case "BUYER":
      return "Buyer";
    case "SELLER":
      return "Seller";
    case "SUPPORT":
      return "Support";
    default:
      return "System";
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

export default function OrderRoomClient({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [acting, setActing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [viewerRole, setViewerRole] = useState<ViewerRole>("unknown");
  const [messages, setMessages] = useState<DeliveryMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [supportDraft, setSupportDraft] = useState("");
  const [refundDraft, setRefundDraft] = useState("");

  async function loadInitial() {
    setLoading(true);
    setErr(null);

    try {
      const [orderRes, messagesRes] = await Promise.all([
        fetchJSON<OrderResponse>(`/api/delivery/orders/${orderId}`),
        fetchJSON<MessagesResponse>(`/api/delivery/orders/${orderId}/messages`),
      ]);

      setOrder(orderRes.order);
      setViewerRole(orderRes.viewerRole);
      setMessages(Array.isArray(messagesRes.items) ? messagesRes.items : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load order room");
    } finally {
      setLoading(false);
    }
  }

  async function refreshRoom() {
    try {
      const [orderRes, messagesRes] = await Promise.all([
        fetchJSON<OrderResponse>(`/api/delivery/orders/${orderId}`),
        fetchJSON<MessagesResponse>(`/api/delivery/orders/${orderId}/messages`),
      ]);

      setOrder(orderRes.order);
      setViewerRole(orderRes.viewerRole);
      setMessages(Array.isArray(messagesRes.items) ? messagesRes.items : []);
    } catch (e) {
      console.error("refreshRoom failed", e);
    }
  }

  useEffect(() => {
    void loadInitial();

    const t = setInterval(() => {
      void refreshRoom();
    }, 4000);

    return () => clearInterval(t);
  }, [orderId]);

  const img = useMemo(
    () => ipfsToHttp(order?.product?.image || null),
    [order?.product?.image]
  );

  const nftHref = order
    ? `/nft/${order.chainId}/${order.contract}/${encodeURIComponent(
        String(order.tokenId)
      )}`
    : "#";

  const onchainEscrow = order ? isOnchainEscrowOrder(order) : false;
  const isPhysical = order ? isPhysicalOrder(order) : false;
  const isService = order ? isServiceOrder(order) : false;

  const canConfirmOffchain = Boolean(
    order &&
      viewerRole === "buyer" &&
      !onchainEscrow &&
      order.escrowStatus !== "REFUNDED" &&
      order.escrowStatus !== "CANCELLED" &&
      order.escrowStatus !== "DISPUTED" &&
      ((isPhysical &&
        (order.deliveryStatus === "SHIPPED" ||
          order.deliveryStatus === "DELIVERED")) ||
        (isService &&
          (order.serviceStatus === "SUBMITTED" ||
            order.serviceStatus === "COMPLETED")))
  );

  async function sendMessage() {
    if (!draft.trim()) return;
    setSending(true);
    setErr(null);

    try {
      await fetchJSON(`/api/delivery/orders/${orderId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: draft }),
      });
      setDraft("");
      await refreshRoom();
    } catch (e: any) {
      setErr(e?.message || "Message send failed");
    } finally {
      setSending(false);
    }
  }

  async function requestRefund() {
    if (!refundDraft.trim()) return;
    setActing(true);
    setErr(null);

    try {
      await fetchJSON(`/api/delivery/orders/${orderId}/request-refund`, {
        method: "POST",
        body: JSON.stringify({ note: refundDraft }),
      });
      setRefundDraft("");
      await refreshRoom();
    } catch (e: any) {
      setErr(e?.message || "Refund request failed");
    } finally {
      setActing(false);
    }
  }

  async function callSupport() {
    if (!supportDraft.trim()) return;
    setActing(true);
    setErr(null);

    try {
      await fetchJSON(`/api/delivery/orders/${orderId}/call-support`, {
        method: "POST",
        body: JSON.stringify({ note: supportDraft }),
      });
      setSupportDraft("");
      await refreshRoom();
    } catch (e: any) {
      setErr(e?.message || "Support request failed");
    } finally {
      setActing(false);
    }
  }

  async function confirmOrder() {
    if (!order) return;
    setConfirming(true);
    setErr(null);

    try {
      await fetchJSON(`/api/delivery/orders/${orderId}/confirm`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await refreshRoom();
    } catch (e: any) {
      setErr(e?.message || "Confirm failed");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-white/60">
        Loading order room...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-rose-100">
        Order not found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
          <div className="p-5 md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row">
              <div className="w-full shrink-0 lg:w-[160px]">
                <div className="aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                  {img ? (
                    <img
                      src={img}
                      alt={order.product?.name || `Token #${order.tokenId}`}
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
                      {order.product?.name || `Order NFT #${order.tokenId}`}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-black text-white/80">
                        {viewerRole.toUpperCase()}
                      </span>

                      {order.fulfillmentType ? (
                        <span
                          className={cx(
                            "rounded-full border px-2 py-1 text-[10px] font-black",
                            fulfillmentTone(order.fulfillmentType)
                          )}
                        >
                          {titleCase(order.fulfillmentType)}
                        </span>
                      ) : null}

                      <span
                        className={cx(
                          "rounded-full border px-2 py-1 text-[10px] font-black",
                          escrowTone(order.escrowStatus)
                        )}
                      >
                        {order.escrowStatus}
                      </span>

                      {isPhysical ? (
                        <span
                          className={cx(
                            "rounded-full border px-2 py-1 text-[10px] font-black",
                            deliveryTone(order.deliveryStatus)
                          )}
                        >
                          {order.deliveryStatus}
                        </span>
                      ) : null}

                      {isService && order.serviceStatus ? (
                        <span
                          className={cx(
                            "rounded-full border px-2 py-1 text-[10px] font-black",
                            serviceTone(order.serviceStatus)
                          )}
                        >
                          SERVICE {order.serviceStatus}
                        </span>
                      ) : null}

                      <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-black text-white/80">
                        {titleCase(order.vertical)}
                      </span>

                      {order.officialItem ? (
                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-100">
                          OFFICIAL
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[12px] text-white/45">Total</div>
                    <div className="text-[16px] font-black text-amber-100">
                      {formatPaymentAmount(order.totalPrice, order.paymentToken)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                    <div className="text-[11px] text-white/45">Buyer</div>
                    <div className="mt-1 text-[13px] font-black text-white/80">
                      {shortAddr(order.buyerWallet)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                    <div className="text-[11px] text-white/45">Seller</div>
                    <div className="mt-1 text-[13px] font-black text-white/80">
                      {shortAddr(order.sellerWallet)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                    <div className="text-[11px] text-white/45">Created</div>
                    <div className="mt-1 text-[12px] font-black text-white/80">
                      {fmtDate(order.createdAt)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                    <div className="text-[11px] text-white/45">Tx</div>
                    <div className="mt-1 text-[12px] font-black text-white/80">
                      {shortHash(order.buyTxHash)}
                    </div>
                  </div>
                </div>

                {(order.category || order.subcategory) && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4 text-[12px] text-white/65">
                    {[order.category, order.subcategory]
                      .filter(Boolean)
                      .join(" • ")}
                  </div>
                )}

                {isPhysical ? (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="text-[12px] font-black text-white/80">
                      Shipping
                    </div>
                    <div className="mt-2 text-[12px] text-white/60">
                      {order.shippingName || "—"} • {order.shippingPhone || "—"}
                    </div>
                    <div className="mt-1 text-[12px] text-white/60">
                      {order.shippingCountry || "—"}, {order.shippingCity || "—"},{" "}
                      {order.shippingZip || "—"}
                    </div>
                    <div className="mt-1 text-[12px] text-white/60">
                      {order.shippingAddress || "—"}
                    </div>

                    {order.trackingCode || order.carrier || order.trackingUrl ? (
                      <div className="mt-3 text-[12px] text-white/70">
                        Tracking: {order.carrier || "—"} /{" "}
                        {order.trackingCode || "—"}
                        {order.trackingUrl ? (
                          <>
                            {" "}
                            •{" "}
                            <a
                              href={order.trackingUrl}
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
                      Status: {order.serviceStatus || "—"}
                    </div>
                    <div className="mt-1 text-[12px] text-white/60">
                      Scheduled: {fmtDate(order.scheduledFor)}
                    </div>
                    <div className="mt-1 text-[12px] text-white/60">
                      Started: {fmtDate(order.workStartedAt)}
                    </div>
                    <div className="mt-1 text-[12px] text-white/60">
                      Submitted: {fmtDate(order.submittedAt)}
                    </div>
                    <div className="mt-1 text-[12px] text-white/60">
                      Revision requested: {fmtDate(order.revisionRequestedAt)}
                    </div>
                    <div className="mt-1 text-[12px] text-white/60">
                      Completed: {fmtDate(order.completedAt)}
                    </div>
                  </div>
                ) : null}

                {onchainEscrow ? (
                  <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-[12px] text-sky-50/85">
                    <div className="font-black text-sky-100">
                      On-chain escrow flow
                    </div>
                    <div className="mt-2 leading-relaxed">
                      This room is used for communication and support, but final
                      payout / refund path is controlled by marketplace contract
                      logic. Protected refund can require NFT return back to the
                      contract first. For the one-step protected path, buyer can
                      use{" "}
                      <span className="font-black">
                        requestRefundAndReturnNft(purchaseId)
                      </span>{" "}
                      after approval.
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                      {order.marketplacePurchaseId ? (
                        <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 font-black text-sky-100">
                          Purchase #{order.marketplacePurchaseId}
                        </span>
                      ) : null}
                      {order.marketplaceContract ? (
                        <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 font-black text-sky-100">
                          {shortAddr(order.marketplaceContract)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : order.escrowStatus === "NOT_REQUIRED" ? (
                  <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-[12px] text-amber-50/85">
                    <div className="font-black text-amber-100">
                      Official store flow
                    </div>
                    <div className="mt-2 leading-relaxed">
                      This order does not use on-chain escrow. The room is used
                      for shipping, service coordination, support and refund
                      workflow.
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={nftHref}
                    className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-2 text-[12px] font-black text-white/85 transition hover:bg-white/[0.10]"
                  >
                    Open NFT
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
          <div className="p-5 md:p-6">
            <div className="text-[12px] font-black uppercase tracking-wider text-white/85">
              Chat
            </div>

            <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-[12px] text-white/55">
                  No messages yet.
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={cx(
                      "rounded-2xl border p-4",
                      messageTone(m.senderRole, m.isInternal)
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] font-black uppercase tracking-wider">
                        {senderLabel(m.senderRole)}
                        {m.isInternal ? " • internal" : ""}
                      </div>
                      <div className="text-[11px] opacity-70">
                        {fmtDate(m.createdAt)}
                      </div>
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed">
                      {m.body}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                placeholder="Write a message to the other side..."
                className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
              />
              <div className="mt-3 flex justify-end">
                <button
                  onClick={sendMessage}
                  disabled={sending || !draft.trim()}
                  className={cx(
                    "inline-flex items-center justify-center rounded-2xl px-5 py-3 font-extrabold text-black transition",
                    "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.20)]",
                    sending || !draft.trim()
                      ? "cursor-not-allowed opacity-60"
                      : "hover:brightness-110"
                  )}
                >
                  {sending ? "Sending..." : "Send message"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
          <div className="p-5 md:p-6">
            <div className="text-[12px] font-black uppercase tracking-wider text-white/85">
              Support & actions
            </div>

            {err ? (
              <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-[12px] text-rose-100">
                {err}
              </div>
            ) : null}

            {viewerRole === "buyer" && canConfirmOffchain ? (
              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="text-[12px] font-black text-emerald-100">
                  {isPhysical
                    ? "Confirm successful delivery"
                    : "Confirm successful service completion"}
                </div>
                <div className="mt-2 text-[12px] leading-relaxed text-emerald-50/85">
                  {order.escrowStatus === "NOT_REQUIRED"
                    ? "This updates buyer confirmation and final status in the room."
                    : "This confirms successful completion and releases escrow for this off-chain order."}
                </div>
                <button
                  onClick={confirmOrder}
                  disabled={confirming}
                  className={cx(
                    "mt-3 inline-flex items-center justify-center rounded-2xl px-5 py-3 font-extrabold text-black transition",
                    "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.20)]",
                    confirming ? "cursor-not-allowed opacity-60" : "hover:brightness-110"
                  )}
                >
                  {confirming
                    ? "Confirming..."
                    : isPhysical
                    ? "Confirm delivery"
                    : "Confirm service"}
                </button>
              </div>
            ) : null}

            {viewerRole === "buyer" && onchainEscrow ? (
              <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
                <div className="text-[12px] font-black text-sky-100">
                  Buyer confirmation is on-chain
                </div>
                <div className="mt-2 text-[12px] leading-relaxed text-sky-50/85">
                  This order is controlled by marketplace contract logic.
                  Seller payout should come from the contract after buyer wallet
                  action. For protected refund path, buyer can first return NFT
                  to contract through one-step flow like{" "}
                  <span className="font-black">
                    requestRefundAndReturnNft(purchaseId)
                  </span>{" "}
                  after approval.
                </div>
              </div>
            ) : null}

            {viewerRole === "buyer" ? (
              <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                <div className="text-[12px] font-black text-rose-100">
                  Request refund
                </div>
                <div className="mt-2 text-[12px] leading-relaxed text-rose-50/85">
                  {onchainEscrow
                    ? "This sends refund context into the room and support flow. The real protected / delivery refund action should be executed through the marketplace contract path in wallet."
                    : "This creates a refund request and alerts support. It does not execute the final refund by itself."}
                </div>
                <textarea
                  value={refundDraft}
                  onChange={(e) => setRefundDraft(e.target.value)}
                  rows={4}
                  placeholder="Explain why you need a refund..."
                  className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
                />
                <button
                  onClick={requestRefund}
                  disabled={acting || !refundDraft.trim()}
                  className={cx(
                    "mt-3 inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-[12px] font-extrabold transition",
                    acting || !refundDraft.trim()
                      ? "cursor-not-allowed border-white/10 bg-white/[0.06] text-white/40"
                      : "border-rose-500/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
                  )}
                >
                  {acting ? "Submitting..." : "Request refund"}
                </button>
              </div>
            ) : null}

            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="text-[12px] font-black text-amber-100">
                Call support
              </div>
              <div className="mt-2 text-[12px] leading-relaxed text-amber-50/85">
                Use this when you need platform intervention, manual review or
                escalation.
              </div>
              <textarea
                value={supportDraft}
                onChange={(e) => setSupportDraft(e.target.value)}
                rows={4}
                placeholder="Describe the issue for support..."
                className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
              />
              <button
                onClick={callSupport}
                disabled={acting || !supportDraft.trim()}
                className={cx(
                  "mt-3 inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-[12px] font-extrabold transition",
                  acting || !supportDraft.trim()
                    ? "cursor-not-allowed border-white/10 bg-white/[0.06] text-white/40"
                    : "border-amber-500/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15"
                )}
              >
                {acting ? "Submitting..." : "Call support"}
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="text-[12px] font-black text-white/85">
                Quick summary
              </div>
              <div className="mt-3 space-y-2 text-[12px] text-white/65">
                <div>Order: {order.id}</div>
                <div>Escrow: {order.escrowStatus}</div>
                {isPhysical ? <div>Delivery: {order.deliveryStatus}</div> : null}
                {isService ? <div>Service: {order.serviceStatus || "—"}</div> : null}
                <div>Fulfillment: {order.fulfillmentType || "—"}</div>
                <div>Source: {order.sourceType || "—"}</div>
                <div>Kind: {order.orderKind || "—"}</div>
                <div>Market: {order.marketType || "—"}</div>
                <div>Buyer confirmed: {fmtDate(order.buyerConfirmedAt)}</div>
                <div>Refund requested: {fmtDate(order.refundRequestedAt)}</div>
                <div>NFT returned: {fmtDate(order.nftReturnedAt)}</div>
                <div>Released: {fmtDate(order.releasedAt)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
