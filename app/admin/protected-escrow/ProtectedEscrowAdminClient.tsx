"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { formatUnits } from "viem";

type AdminRole = "MODERATOR" | "ADMIN";
type PanelTab = "orders" | "notifications" | "safety";
type OrderScope = "protected" | "all";
type EscrowBucket =
  | "open"
  | "disputed"
  | "refund_requested"
  | "nft_returned"
  | "released"
  | "refunded"
  | "all";

type DeliveryMessage = {
  id: string;
  orderId?: string;
  senderUserId: string | null;
  senderWallet: string | null;
  senderRole: "BUYER" | "SELLER" | "SUPPORT" | "SYSTEM";
  body: string;
  isInternal: boolean;
  createdAt: string;
};

type OrderRow = {
  id: string;
  createdAt: string | null;
  updatedAt: string | null;
  chainId: number;
  contract: string;
  tokenId: string;
  vertical: string;
  sourceType: "STORE" | "MARKETPLACE" | null;
  orderKind: "PRIMARY" | "SECONDARY" | null;
  marketType: "STANDARD" | "DELIVERY" | "PROTECTED" | null;
  marketplaceContract: string | null;
  marketplaceListingId: string | null;
  marketplacePurchaseId: string | null;
  listingId: string | null;
  tradeId: string | null;
  buyerWallet: string;
  sellerWallet: string;
  buyer: { id: string; handle: string | null; publicId: string | null; walletAddress?: string | null } | null;
  seller: { id: string; handle: string | null; publicId: string | null; walletAddress?: string | null } | null;
  amount: string;
  unitPrice: string;
  totalPrice: string;
  paymentToken: string | null;
  deliveryRequired: boolean;
  physicalItem: boolean;
  officialItem: boolean;
  fulfillmentType: string | null;
  category: string | null;
  subcategory: string | null;
  serviceCountry: string | null;
  serviceCity: string | null;
  serviceArea: string | null;
  escrowStatus: string;
  deliveryStatus: string;
  serviceStatus: string;
  escrowFundedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  confirmedAt: string | null;
  releasedAt: string | null;
  refundedAt: string | null;
  disputedAt: string | null;
  cancelledAt: string | null;
  buyerConfirmedAt: string | null;
  refundRequestedAt: string | null;
  nftReturnedAt: string | null;
  refundRejectedAt: string | null;
  scheduledFor: string | null;
  workStartedAt: string | null;
  submittedAt: string | null;
  revisionRequestedAt: string | null;
  completedAt: string | null;
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
  escrowReleaseTxHash: string | null;
  escrowRefundTxHash: string | null;
  noteBuyer: string | null;
  noteSeller: string | null;
  adminNote: string | null;
  messageCount: number;
  latestMessages: DeliveryMessage[];
  nft: {
    id: string;
    name: string | null;
    image: string | null;
    animation: string | null;
    mediaKind: string | null;
    description: string | null;
    verified: boolean;
    category: string | null;
    subcategory: string | null;
    fulfillmentType: string | null;
    serviceCountry: string | null;
    serviceCity: string | null;
    serviceArea: string | null;
  } | null;
  listing: {
    id: string;
    status: string;
    amountRemaining: string;
    pricePerUnitWei: string;
    createdAt: string | null;
    cancelledAt: string | null;
  } | null;
};

type OrderSummary = Record<EscrowBucket, number>;

type OrdersResponse = {
  ok: boolean;
  role: AdminRole;
  bucket: EscrowBucket;
  scope: OrderScope;
  q: string | null;
  summary: OrderSummary;
  items: OrderRow[];
};

type SafetyStatus = "active" | "cancelled" | "sold_out" | "all";
type TriState = "" | "true" | "false";

type SafetyListing = {
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
  marketplaceListingId: string;
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

type SafetyResponse = {
  ok: boolean;
  role: AdminRole;
  status: SafetyStatus;
  q: string | null;
  summary: {
    active: number;
    cancelled: number;
    sold_out: number;
    hidden: number;
    unverified_nfts: number;
  };
  items: SafetyListing[];
};

type AdminNotificationStatus = "UNREAD" | "READ" | "RESOLVED" | "ALL";

type AdminNotification = {
  id: string;
  createdAt: string;
  updatedAt: string;
  type: string;
  status: "UNREAD" | "READ" | "RESOLVED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT" | string;
  title: string;
  body: string;
  orderId: string | null;
  deliveryMessageId: string | null;
  actorUserId: string | null;
  actorWallet: string | null;
  actorRole: "BUYER" | "SELLER" | "SUPPORT" | "SYSTEM" | null;
  readAt: string | null;
  resolvedAt: string | null;
  metadata: any;
  order: null | {
    id: string;
    createdAt: string | null;
    updatedAt: string | null;
    chainId: number;
    contract: string;
    tokenId: string;
    vertical: string;
    sourceType: string | null;
    orderKind: string | null;
    marketType: string | null;
    marketplaceContract: string | null;
    marketplaceListingId: string | null;
    marketplacePurchaseId: string | null;
    buyerWallet: string;
    sellerWallet: string;
    totalPrice: string;
    paymentToken: string | null;
    fulfillmentType: string | null;
    escrowStatus: string;
    deliveryStatus: string;
    serviceStatus: string;
    refundRequestedAt: string | null;
    nftReturnedAt: string | null;
    disputedAt: string | null;
    buyTxHash: string | null;
    noteBuyer: string | null;
    noteSeller: string | null;
    adminNote: string | null;
    deliveryMessages: Array<{
      id: string;
      senderRole: "BUYER" | "SELLER" | "SUPPORT" | "SYSTEM";
      senderWallet: string | null;
      body: string;
      isInternal: boolean;
      createdAt: string;
    }>;
  };
};

type AdminNotificationsResponse = {
  ok: boolean;
  role: AdminRole;
  status: AdminNotificationStatus;
  q: string | null;
  type: string | null;
  summary: {
    unread: number;
    read: number;
    resolved: number;
    all: number;
  };
  items: AdminNotification[];
};

const ORDER_BUCKETS: EscrowBucket[] = [
  "open",
  "disputed",
  "refund_requested",
  "nft_returned",
  "released",
  "refunded",
  "all",
];

const PRIMARY_IPFS_ORIGIN = (
  process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://nftstorage.link"
).replace(/\/$/, "");

const IPFS_GATEWAYS = [
  `${PRIMARY_IPFS_ORIGIN}/ipfs/`,
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
] as const;

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
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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

function paymentSymbol(paymentToken?: string | null) {
  return paymentToken ? "USDC" : "ETH";
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

function fmtAmount(raw?: string | null) {
  try {
    return BigInt(raw || "0").toString();
  } catch {
    return String(raw || "0");
  }
}

function personLabel(
  p: { id: string; handle: string | null; publicId: string | null } | null,
  wallet?: string | null
) {
  if (p?.handle) return `@${p.handle}`;
  if (p?.publicId) return p.publicId;
  return shortAddr(wallet);
}

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
  if (u.startsWith("ipfs/")) return `${gw}${u.slice("ipfs/".length)}`;
  if (/^(Qm[1-9A-HJ-NP-Za-km-z]{44,}|bafy[0-9a-z]+)/i.test(u)) return `${gw}${u}`;
  return u;
}

function bucketLabel(bucket: EscrowBucket) {
  if (bucket === "open") return "Open";
  if (bucket === "disputed") return "Disputed";
  if (bucket === "refund_requested") return "Refund requested";
  if (bucket === "nft_returned") return "NFT returned";
  if (bucket === "released") return "Released";
  if (bucket === "refunded") return "Refunded";
  return "All";
}

function statusTone(v?: string | null) {
  const s = String(v || "").toUpperCase();
  if (s.includes("DISPUTED") || s.includes("RETURN_REQUESTED")) return "border-rose-500/20 bg-rose-500/10 text-rose-100";
  if (s.includes("REFUND") || s.includes("RETURNED")) return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  if (s.includes("RELEASED") || s.includes("CONFIRMED") || s.includes("COMPLETED")) return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
  if (s.includes("SHIPPED") || s.includes("SUBMITTED")) return "border-sky-500/20 bg-sky-500/10 text-sky-100";
  return "border-white/10 bg-white/[0.06] text-white/70";
}

function priorityTone(v?: string | null) {
  const s = String(v || "").toUpperCase();
  if (s === "URGENT") return "border-rose-500/25 bg-rose-500/12 text-rose-100";
  if (s === "HIGH") return "border-amber-500/25 bg-amber-500/12 text-amber-100";
  if (s === "LOW") return "border-white/10 bg-white/[0.04] text-white/55";
  return "border-sky-500/20 bg-sky-500/10 text-sky-100";
}

function notificationStatusTone(v?: string | null) {
  const s = String(v || "").toUpperCase();
  if (s === "UNREAD") return "border-[#d4af37]/35 bg-[#d4af37]/12 text-[#f7e7a7]";
  if (s === "RESOLVED") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
  return "border-white/10 bg-white/[0.06] text-white/65";
}

function marketTone(v?: string | null) {
  const s = String(v || "").toUpperCase();
  if (s === "PROTECTED" || s === "DELIVERY") return "border-[#d4af37]/30 bg-[#d4af37]/10 text-[#f7e7a7]";
  return "border-white/10 bg-white/[0.06] text-white/70";
}

function messageTone(role: DeliveryMessage["senderRole"], internal: boolean) {
  if (internal) return "border-violet-500/25 bg-violet-500/10";
  if (role === "SUPPORT") return "border-[#d4af37]/25 bg-[#d4af37]/10";
  if (role === "SYSTEM") return "border-white/10 bg-white/[0.04]";
  if (role === "BUYER") return "border-sky-500/20 bg-sky-500/10";
  return "border-emerald-500/20 bg-emerald-500/10";
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

function SmallBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
        className || "border-white/10 bg-white/[0.06] text-white/65"
      )}
    >
      {children}
    </span>
  );
}

function InfoBox({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">{label}</div>
      <div className="mt-2 break-words text-sm leading-6 text-white/75">{value || "—"}</div>
    </div>
  );
}

export default function ProtectedEscrowAdminClient() {
  const [tab, setTab] = useState<PanelTab>("orders");

  const [role, setRole] = useState<AdminRole | null>(null);
  const [orderBucket, setOrderBucket] = useState<EscrowBucket>("open");
  const [orderScope, setOrderScope] = useState<OrderScope>("all");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderSummary, setOrderSummary] = useState<OrderSummary>({
    open: 0,
    disputed: 0,
    refund_requested: 0,
    nft_returned: 0,
    released: 0,
    refunded: 0,
    all: 0,
  });
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const [notificationStatus, setNotificationStatus] = useState<AdminNotificationStatus>("UNREAD");
  const [notificationQuery, setNotificationQuery] = useState("");
  const [notificationSummary, setNotificationSummary] = useState<AdminNotificationsResponse["summary"]>({
    unread: 0,
    read: 0,
    resolved: 0,
    all: 0,
  });
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [notificationActionId, setNotificationActionId] = useState<string | null>(null);

  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [messagesByOrder, setMessagesByOrder] = useState<Record<string, DeliveryMessage[]>>({});
  const [messageLoadingId, setMessageLoadingId] = useState<string | null>(null);
  const [internalNote, setInternalNote] = useState("");

  const [safetyStatus, setSafetyStatus] = useState<SafetyStatus>("active");
  const [safetyQuery, setSafetyQuery] = useState("");
  const [safetyHidden, setSafetyHidden] = useState<TriState>("");
  const [safetyVerified, setSafetyVerified] = useState<TriState>("");
  const [safetySummary, setSafetySummary] = useState<SafetyResponse["summary"]>({
    active: 0,
    cancelled: 0,
    sold_out: 0,
    hidden: 0,
    unverified_nfts: 0,
  });
  const [listings, setListings] = useState<SafetyListing[]>([]);
  const [safetyLoading, setSafetyLoading] = useState(false);
  const [safetyError, setSafetyError] = useState<string | null>(null);
  const [listingActionId, setListingActionId] = useState<string | null>(null);

  async function loadOrders(next?: Partial<{ bucket: EscrowBucket; scope: OrderScope; q: string }>) {
    const bucket = next?.bucket ?? orderBucket;
    const scope = next?.scope ?? orderScope;
    const q = next?.q ?? orderQuery;

    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const params = new URLSearchParams({
        bucket,
        scope,
        take: "60",
      });
      if (q.trim()) params.set("q", q.trim());

      const j = await fetchJSON<OrdersResponse>(
        `/api/admin/protected-escrow/orders?${params.toString()}`
      );

      setRole(j.role);
      setOrderBucket(j.bucket);
      setOrderScope(j.scope);
      setOrderSummary(j.summary);
      setOrders(j.items || []);
    } catch (e: any) {
      setOrdersError(e?.message || "Unable to load admin orders.");
    } finally {
      setOrdersLoading(false);
    }
  }

  async function loadNotifications(next?: Partial<{ status: AdminNotificationStatus; q: string }>) {
    const status = next?.status ?? notificationStatus;
    const q = next?.q ?? notificationQuery;

    setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      const params = new URLSearchParams({
        status,
        take: "50",
      });
      if (q.trim()) params.set("q", q.trim());

      const j = await fetchJSON<AdminNotificationsResponse>(
        `/api/admin/notifications?${params.toString()}`
      );

      setRole(j.role);
      setNotificationStatus(j.status);
      setNotificationSummary(j.summary);
      setNotifications(j.items || []);
    } catch (e: any) {
      setNotificationsError(e?.message || "Unable to load admin notifications.");
    } finally {
      setNotificationsLoading(false);
    }
  }

  async function loadSafety(next?: Partial<{ status: SafetyStatus; q: string; hidden: TriState; verified: TriState }>) {
    const status = next?.status ?? safetyStatus;
    const q = next?.q ?? safetyQuery;
    const hidden = next?.hidden ?? safetyHidden;
    const verified = next?.verified ?? safetyVerified;

    setSafetyLoading(true);
    setSafetyError(null);
    try {
      const params = new URLSearchParams({
        status,
        take: "80",
      });
      if (q.trim()) params.set("q", q.trim());
      if (hidden) params.set("hidden", hidden);
      if (verified) params.set("verified", verified);

      const j = await fetchJSON<SafetyResponse>(`/api/admin/safety/listings?${params.toString()}`);
      setRole(j.role);
      setSafetyStatus(j.status);
      setSafetySummary(j.summary);
      setListings(j.items || []);
    } catch (e: any) {
      setSafetyError(e?.message || "Unable to load safety listings.");
    } finally {
      setSafetyLoading(false);
    }
  }

  useEffect(() => {
    loadOrders({ bucket: "open", scope: "all" });
    loadNotifications({ status: "UNREAD" });
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      loadNotifications({ status: notificationStatus });
    }, 30000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationStatus, notificationQuery]);

  useEffect(() => {
    if (tab === "notifications" && notifications.length === 0 && !notificationsLoading) {
      loadNotifications();
    }
    if (tab === "safety" && listings.length === 0 && !safetyLoading) {
      loadSafety();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function selectBucket(bucket: EscrowBucket) {
    if (actionId) return;
    await loadOrders({ bucket });
  }

  async function selectNotificationStatus(status: AdminNotificationStatus) {
    if (notificationActionId) return;
    setNotificationStatus(status);
    await loadNotifications({ status });
  }

  async function submitNotificationSearch(e: FormEvent) {
    e.preventDefault();
    await loadNotifications({ q: notificationQuery });
  }

  async function updateNotification(notification: AdminNotification, action: "mark_read" | "resolve" | "reopen") {
    if (notificationActionId) return;
    setNotificationActionId(notification.id);
    setNotificationsError(null);
    try {
      await fetchJSON(`/api/admin/notifications/${notification.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      await loadNotifications();
      if (action === "resolve" || action === "mark_read") {
        await loadOrders();
      }
    } catch (e: any) {
      setNotificationsError(e?.message || "Notification action failed.");
    } finally {
      setNotificationActionId(null);
    }
  }

  async function markAllNotificationsRead() {
    if (notificationActionId) return;
    setNotificationActionId("all");
    setNotificationsError(null);
    try {
      await fetchJSON(`/api/admin/notifications`, {
        method: "POST",
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      await loadNotifications();
    } catch (e: any) {
      setNotificationsError(e?.message || "Mark all read failed.");
    } finally {
      setNotificationActionId(null);
    }
  }

  async function submitOrderSearch(e: FormEvent) {
    e.preventDefault();
    await loadOrders({ q: orderQuery });
  }

  async function submitSafetySearch(e: FormEvent) {
    e.preventDefault();
    await loadSafety({ q: safetyQuery });
  }

  async function loadMessages(orderId: string, force = false) {
    if (!force && messagesByOrder[orderId]) return;
    setMessageLoadingId(orderId);
    try {
      const j = await fetchJSON<{ ok: boolean; items: DeliveryMessage[] }>(
        `/api/delivery/orders/${orderId}/messages`
      );
      setMessagesByOrder((prev) => ({ ...prev, [orderId]: j.items || [] }));
    } catch (e: any) {
      window.alert(e?.message || "Unable to load order messages.");
    } finally {
      setMessageLoadingId(null);
    }
  }

  async function toggleOrderMessages(order: OrderRow) {
    const next = openOrderId === order.id ? null : order.id;
    setOpenOrderId(next);
    setInternalNote("");
    if (next) await loadMessages(order.id);
  }

  async function sendInternalSupportNote(orderId: string) {
    const text = internalNote.trim();
    if (!text || actionId) return;

    setActionId(orderId);
    try {
      await fetchJSON(`/api/delivery/orders/${orderId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: text, isInternal: true }),
      });
      setInternalNote("");
      await loadMessages(orderId, true);
    } catch (e: any) {
      window.alert(e?.message || "Unable to add internal note.");
    } finally {
      setActionId(null);
    }
  }

  async function runSettlementAction(order: OrderRow, action: "release" | "refund") {
    if (actionId) return;

    const txField = action === "release" ? "escrowReleaseTxHash" : "escrowRefundTxHash";
    const txHash = window.prompt(
      action === "release"
        ? "Optional release tx hash. Leave empty if this is only a DB/test update."
        : "Optional refund tx hash. Leave empty if this is only a DB/test update.",
      ""
    );
    if (txHash === null) return;

    const note = window.prompt(
      action === "release" ? "Optional admin release note:" : "Optional admin refund note:",
      order.adminNote || ""
    );
    if (note === null) return;

    setActionId(order.id);
    setOrdersError(null);
    try {
      const j = await fetchJSON<any>(`/api/delivery/orders/${order.id}/${action}`, {
        method: "POST",
        body: JSON.stringify({
          [txField]: txHash.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });

      const onchain =
        j?.onchainActionRequired ||
        j?.error === "ONCHAIN_RELEASE_REQUIRED" ||
        j?.error === "ONCHAIN_REFUND_REQUIRED";

      if (onchain) {
        window.alert(
          `${titleCase(action)} must be finalized on-chain by an operator wallet.\n\n` +
            [
              j?.marketType ? `Market: ${j.marketType}` : null,
              j?.marketplaceContract ? `Contract: ${j.marketplaceContract}` : null,
              j?.marketplacePurchaseId ? `Purchase: ${j.marketplacePurchaseId}` : null,
            ]
              .filter(Boolean)
              .join("\n")
        );
      } else {
        window.alert(`${titleCase(action)} completed.`);
      }

      await loadOrders();
    } catch (e: any) {
      const msg = String(e?.message || "action_failed");
      if (msg === "ONCHAIN_RELEASE_REQUIRED" || msg === "ONCHAIN_REFUND_REQUIRED") {
        window.alert(
          `${titleCase(action)} for this order must be completed on-chain by a wallet with the protected marketplace role.`
        );
      } else {
        setOrdersError(msg);
      }
    } finally {
      setActionId(null);
    }
  }

  async function moderateListing(listing: SafetyListing, action: "remove" | "restore" | "disable_nft" | "enable_nft") {
    if (listingActionId) return;

    const actionLabel = action.replaceAll("_", " ");
    const reason =
      action === "restore" || action === "enable_nft"
        ? "other"
        : window.prompt(
            "Reason: fake_product, scam_risk, prohibited_item, empty_nft, copyright_abuse, unsafe_service, spam, other",
            listing.adminHiddenReason || "fake_product"
          );
    if (reason === null) return;

    const note = window.prompt(`Admin note for ${actionLabel}:`, listing.adminHiddenNote || "");
    if (note === null) return;

    const disableMint =
      action === "remove"
        ? window.confirm("Also mark the NFT as unverified? Use this for fake/empty/prohibited NFTs.")
        : false;

    setListingActionId(listing.id);
    setSafetyError(null);
    try {
      await fetchJSON(`/api/admin/safety/listings/${listing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, reason, note, disableMint }),
      });
      await loadSafety();
    } catch (e: any) {
      setSafetyError(e?.message || "Moderation action failed.");
    } finally {
      setListingActionId(null);
    }
  }

  const selectedMessages = openOrderId ? messagesByOrder[openOrderId] || [] : [];

  const topStats = useMemo(
    () => [
      { label: "Support requests", value: notificationSummary.unread || 0, tone: "border-[#d4af37]/30 bg-[#d4af37]/10 text-[#f7e7a7]" },
      { label: "Open orders", value: orderSummary.open || 0, tone: "border-sky-500/20 bg-sky-500/10 text-sky-100" },
      { label: "Disputed", value: orderSummary.disputed || 0, tone: "border-rose-500/20 bg-rose-500/10 text-rose-100" },
      { label: "Hidden listings", value: safetySummary.hidden || 0, tone: "border-violet-500/20 bg-violet-500/10 text-violet-100" },
    ],
    [notificationSummary.unread, orderSummary, safetySummary.hidden]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {topStats.map((x) => (
          <div key={x.label} className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
            <SmallBadge className={x.tone}>{x.label}</SmallBadge>
            <div className="mt-4 text-3xl font-semibold text-white">{x.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-2">
        <div className="grid gap-2 md:grid-cols-3">
          <button
            type="button"
            onClick={() => setTab("orders")}
            className={cx(
              "rounded-[24px] px-5 py-4 text-left transition",
              tab === "orders" ? "bg-[#d4af37]/12 text-white" : "text-white/60 hover:bg-white/[0.05] hover:text-white"
            )}
          >
            <div className="text-sm font-semibold">Escrow & open orders</div>
            <div className="mt-1 text-xs leading-5 text-white/55">Review purchases, statuses, shipping, evidence and messages.</div>
          </button>
          <button
            type="button"
            onClick={() => setTab("notifications")}
            className={cx(
              "rounded-[24px] px-5 py-4 text-left transition",
              tab === "notifications" ? "bg-[#d4af37]/12 text-white" : "text-white/60 hover:bg-white/[0.05] hover:text-white"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">Support inbox</span>
              {notificationSummary.unread ? (
                <span className="rounded-full border border-[#d4af37]/35 bg-[#d4af37]/15 px-2 py-0.5 text-xs font-bold text-[#f7e7a7]">
                  {notificationSummary.unread}
                </span>
              ) : null}
            </div>
            <div className="mt-1 text-xs leading-5 text-white/55">Unread Admin Support requests from buyer/seller order rooms.</div>
          </button>
          <button
            type="button"
            onClick={() => setTab("safety")}
            className={cx(
              "rounded-[24px] px-5 py-4 text-left transition",
              tab === "safety" ? "bg-[#d4af37]/12 text-white" : "text-white/60 hover:bg-white/[0.05] hover:text-white"
            )}
          >
            <div className="text-sm font-semibold">Safety listings</div>
            <div className="mt-1 text-xs leading-5 text-white/55">Remove fake, prohibited, empty or unsafe goods/services.</div>
          </button>
        </div>
      </div>

      {tab === "orders" ? (
        <div className="space-y-5">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <SmallBadge className="border-[#d4af37]/30 bg-[#d4af37]/10 text-[#f7e7a7]">Order control</SmallBadge>
                <h2 className="mt-3 text-2xl font-semibold text-white">Open orders and escrow review</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
                  Admins can inspect purchase data, delivery/service state, latest room messages, and settlement evidence. Use release/refund only after the case is reviewed.
                </p>
              </div>

              <form onSubmit={submitOrderSearch} className="flex w-full flex-col gap-2 sm:flex-row xl:max-w-2xl">
                <input
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  placeholder="Search order, wallet, token, tx, city..."
                  className="min-h-[46px] flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#d4af37]/40"
                />
                <select
                  value={orderScope}
                  onChange={(e) => {
                    const scope = e.target.value as OrderScope;
                    setOrderScope(scope);
                    loadOrders({ scope });
                  }}
                  className="min-h-[46px] rounded-2xl border border-white/10 bg-black/70 px-3 text-sm text-white outline-none focus:border-[#d4af37]/40"
                >
                  <option value="all">All orders</option>
                  <option value="protected">Protected only</option>
                </select>
                <button
                  type="submit"
                  className="min-h-[46px] rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/12 px-5 text-sm font-semibold text-[#f7e7a7] transition hover:bg-[#d4af37]/18"
                >
                  Search
                </button>
              </form>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {ORDER_BUCKETS.map((x) => (
                <button
                  key={x}
                  type="button"
                  onClick={() => selectBucket(x)}
                  className={cx(
                    "rounded-full border px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition",
                    x === orderBucket
                      ? "border-[#d4af37]/35 bg-[#d4af37]/12 text-[#f7e7a7]"
                      : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/20 hover:text-white"
                  )}
                >
                  {bucketLabel(x)} · {orderSummary[x] || 0}
                </button>
              ))}
            </div>
          </div>

          {ordersError ? (
            <div className="rounded-[26px] border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">{ordersError}</div>
          ) : null}

          {ordersLoading ? (
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-8 text-sm text-white/60">Loading admin orders…</div>
          ) : orders.length === 0 ? (
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-8 text-sm text-white/60">No orders found for this filter.</div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const isOpen = openOrderId === order.id;
                const image = ipfsToHttp(order.nft?.image || null);
                const serviceLocation = [order.serviceCity, order.serviceCountry].filter(Boolean).join(", ");

                return (
                  <div key={order.id} className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
                    <div className="flex flex-col gap-5 xl:flex-row">
                      <div className="flex min-w-0 flex-1 gap-4">
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-black/30">
                          {image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={image} alt="NFT" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-white/35">NFT</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <SmallBadge className={statusTone(order.escrowStatus)}>{titleCase(order.escrowStatus)}</SmallBadge>
                            <SmallBadge className={marketTone(order.marketType)}>{titleCase(order.marketType)}</SmallBadge>
                            {order.fulfillmentType ? <SmallBadge>{titleCase(order.fulfillmentType)}</SmallBadge> : null}
                            {order.messageCount ? <SmallBadge>{order.messageCount} messages</SmallBadge> : null}
                          </div>
                          <div className="mt-3 text-lg font-semibold text-white">
                            {order.nft?.name || `Token #${order.tokenId}`}
                          </div>
                          <div className="mt-1 text-sm text-white/55">
                            Order {order.id.slice(0, 10)} · Token #{order.tokenId} · {formatPaymentAmount(order.totalPrice, order.paymentToken)}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/45">
                            <span>Created {fmtDate(order.createdAt)}</span>
                            <span>Updated {fmtDate(order.updatedAt)}</span>
                            {serviceLocation ? <span>{serviceLocation}</span> : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-start justify-start gap-2 xl:justify-end">
                        <Link
                          href={`/app/orders/${order.id}`}
                          className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/[0.08]"
                        >
                          Open room
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleOrderMessages(order)}
                          className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/15"
                        >
                          {isOpen ? "Hide messages" : "View messages"}
                        </button>
                        <button
                          type="button"
                          disabled={actionId === order.id}
                          onClick={() => runSettlementAction(order, "release")}
                          className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Release
                        </button>
                        <button
                          type="button"
                          disabled={actionId === order.id}
                          onClick={() => runSettlementAction(order, "refund")}
                          className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Refund
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <InfoBox label="Buyer" value={<><div className="font-medium text-white">{personLabel(order.buyer, order.buyerWallet)}</div><div className="text-xs text-white/45">{shortAddr(order.buyerWallet)}</div></>} />
                      <InfoBox label="Seller" value={<><div className="font-medium text-white">{personLabel(order.seller, order.sellerWallet)}</div><div className="text-xs text-white/45">{shortAddr(order.sellerWallet)}</div></>} />
                      <InfoBox label="Statuses" value={`${titleCase(order.escrowStatus)} / ${titleCase(order.deliveryStatus)} / ${titleCase(order.serviceStatus)}`} />
                      <InfoBox label="Marketplace" value={<><div>Listing {order.marketplaceListingId || "—"}</div><div>Purchase {order.marketplacePurchaseId || "—"}</div></>} />
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <InfoBox label="Shipping" value={<><div>{[order.shippingName, order.shippingPhone].filter(Boolean).join(" · ") || "—"}</div><div>{[order.shippingCity, order.shippingCountry, order.shippingZip].filter(Boolean).join(", ") || "—"}</div><div>{order.shippingAddress || ""}</div></>} />
                      <InfoBox label="Tracking" value={<><div>{order.carrier || "—"}</div><div>{order.trackingCode || "—"}</div>{order.trackingUrl ? <a className="text-[#f7e7a7] underline-offset-4 hover:underline" href={order.trackingUrl} target="_blank" rel="noreferrer">Open tracking</a> : null}</>} />
                      <InfoBox label="Important dates" value={<><div>Refund: {fmtDate(order.refundRequestedAt)}</div><div>NFT returned: {fmtDate(order.nftReturnedAt)}</div><div>Completed: {fmtDate(order.completedAt || order.buyerConfirmedAt)}</div></>} />
                      <InfoBox label="Tx hashes" value={<><div>Buy: {shortHash(order.buyTxHash)}</div><div>Release: {shortHash(order.escrowReleaseTxHash)}</div><div>Refund: {shortHash(order.escrowRefundTxHash)}</div></>} />
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <InfoBox label="Buyer note" value={order.noteBuyer || "—"} />
                      <InfoBox label="Seller note" value={order.noteSeller || "—"} />
                      <InfoBox label="Admin note" value={order.adminNote || "—"} />
                    </div>

                    {isOpen ? (
                      <div className="mt-5 rounded-[26px] border border-white/10 bg-black/25 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">Order room messages</div>
                            <div className="mt-1 text-xs text-white/45">Support can see public and internal messages.</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => loadMessages(order.id, true)}
                            className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-white/20 hover:text-white"
                          >
                            Refresh
                          </button>
                        </div>

                        {messageLoadingId === order.id ? (
                          <div className="mt-4 text-sm text-white/50">Loading messages…</div>
                        ) : selectedMessages.length === 0 ? (
                          <div className="mt-4 text-sm text-white/50">No messages yet.</div>
                        ) : (
                          <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                            {selectedMessages.map((m) => (
                              <div key={m.id} className={cx("rounded-2xl border p-3", messageTone(m.senderRole, m.isInternal))}>
                                <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-white/45">
                                  <span>{m.senderRole}</span>
                                  {m.isInternal ? <span className="text-violet-200">Internal</span> : <span>Public</span>}
                                  <span>{fmtDate(m.createdAt)}</span>
                                  {m.senderWallet ? <span>{shortAddr(m.senderWallet)}</span> : null}
                                </div>
                                <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/78">{m.body}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <textarea
                            value={internalNote}
                            onChange={(e) => setInternalNote(e.target.value)}
                            placeholder="Add internal support note. Buyer/seller will not see it."
                            rows={2}
                            className="min-h-[74px] flex-1 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#d4af37]/40"
                          />
                          <button
                            type="button"
                            disabled={!internalNote.trim() || actionId === order.id}
                            onClick={() => sendInternalSupportNote(order.id)}
                            className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Add internal note
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : tab === "notifications" ? (
        <div className="space-y-5">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <SmallBadge className="border-[#d4af37]/30 bg-[#d4af37]/10 text-[#f7e7a7]">Admin support inbox</SmallBadge>
                <h2 className="mt-3 text-2xl font-semibold text-white">Support requests from order rooms</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
                  When a buyer or seller presses Admin Support, the request appears here as a persistent notification. Open the order, read the latest messages, then mark it read or resolved.
                </p>
              </div>

              <form onSubmit={submitNotificationSearch} className="flex w-full flex-col gap-2 sm:flex-row xl:max-w-2xl">
                <input
                  value={notificationQuery}
                  onChange={(e) => setNotificationQuery(e.target.value)}
                  placeholder="Search support request, wallet, order, token..."
                  className="min-h-[46px] flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#d4af37]/40"
                />
                <button
                  type="submit"
                  className="min-h-[46px] rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/12 px-5 text-sm font-semibold text-[#f7e7a7] transition hover:bg-[#d4af37]/18"
                >
                  Search
                </button>
                <button
                  type="button"
                  disabled={!notificationSummary.unread || notificationActionId === "all"}
                  onClick={markAllNotificationsRead}
                  className="min-h-[46px] rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-white/75 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Mark all read
                </button>
              </form>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {(["UNREAD", "READ", "RESOLVED", "ALL"] as AdminNotificationStatus[]).map((x) => {
                const count =
                  x === "UNREAD"
                    ? notificationSummary.unread
                    : x === "READ"
                      ? notificationSummary.read
                      : x === "RESOLVED"
                        ? notificationSummary.resolved
                        : notificationSummary.all;
                return (
                  <button
                    key={x}
                    type="button"
                    onClick={() => selectNotificationStatus(x)}
                    className={cx(
                      "rounded-full border px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition",
                      x === notificationStatus
                        ? "border-[#d4af37]/35 bg-[#d4af37]/12 text-[#f7e7a7]"
                        : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/20 hover:text-white"
                    )}
                  >
                    {titleCase(x)} · {count || 0}
                  </button>
                );
              })}
            </div>
          </div>

          {notificationsError ? (
            <div className="rounded-[26px] border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">{notificationsError}</div>
          ) : null}

          {notificationsLoading ? (
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-8 text-sm text-white/60">Loading support notifications…</div>
          ) : notifications.length === 0 ? (
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-8 text-sm text-white/60">No support notifications for this filter.</div>
          ) : (
            <div className="space-y-4">
              {notifications.map((n) => {
                const o = n.order;
                return (
                  <div key={n.id} className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <SmallBadge className={notificationStatusTone(n.status)}>{titleCase(n.status)}</SmallBadge>
                          <SmallBadge className={priorityTone(n.priority)}>{titleCase(n.priority)}</SmallBadge>
                          <SmallBadge>{titleCase(n.actorRole || "user")}</SmallBadge>
                          {o?.escrowStatus ? <SmallBadge className={statusTone(o.escrowStatus)}>{titleCase(o.escrowStatus)}</SmallBadge> : null}
                          {o?.marketType ? <SmallBadge className={marketTone(o.marketType)}>{titleCase(o.marketType)}</SmallBadge> : null}
                        </div>

                        <div className="mt-3 text-lg font-semibold text-white">{n.title}</div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/70">{n.body}</p>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/45">
                          <span>{fmtDate(n.createdAt)}</span>
                          {n.actorWallet ? <span>From {shortAddr(n.actorWallet)}</span> : null}
                          {o ? <span>Order {o.id.slice(0, 10)}</span> : null}
                          {o ? <span>Token #{o.tokenId}</span> : null}
                          {o ? <span>{formatPaymentAmount(o.totalPrice, o.paymentToken)}</span> : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-start justify-start gap-2 xl:justify-end">
                        {o ? (
                          <Link
                            href={`/app/orders/${o.id}`}
                            className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/[0.08]"
                          >
                            Open order room
                          </Link>
                        ) : null}
                        {o ? (
                          <button
                            type="button"
                            onClick={() => {
                              setTab("orders");
                              setOrderQuery(o.id);
                              loadOrders({ q: o.id, bucket: "all", scope: "all" });
                            }}
                            className="rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/12 px-4 py-2.5 text-sm font-semibold text-[#f7e7a7] transition hover:bg-[#d4af37]/18"
                          >
                            Review in admin
                          </button>
                        ) : null}
                        {n.status === "UNREAD" ? (
                          <button
                            type="button"
                            disabled={notificationActionId === n.id}
                            onClick={() => updateNotification(n, "mark_read")}
                            className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/75 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Mark read
                          </button>
                        ) : null}
                        {n.status !== "RESOLVED" ? (
                          <button
                            type="button"
                            disabled={notificationActionId === n.id}
                            onClick={() => updateNotification(n, "resolve")}
                            className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Resolve
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={notificationActionId === n.id}
                            onClick={() => updateNotification(n, "reopen")}
                            className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    </div>

                    {o ? (
                      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <InfoBox label="Buyer" value={shortAddr(o.buyerWallet)} />
                        <InfoBox label="Seller" value={shortAddr(o.sellerWallet)} />
                        <InfoBox label="NFT" value={<><div>{shortAddr(o.contract)}</div><div className="text-xs text-white/45">Token #{o.tokenId}</div></>} />
                        <InfoBox label="Order status" value={`${titleCase(o.deliveryStatus)} / ${titleCase(o.serviceStatus)}`} />
                      </div>
                    ) : null}

                    {o?.deliveryMessages?.length ? (
                      <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Latest order room messages</div>
                        <div className="mt-3 space-y-2">
                          {o.deliveryMessages.map((m) => (
                            <div key={m.id} className={cx("rounded-2xl border p-3", messageTone(m.senderRole, m.isInternal))}>
                              <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-white/45">
                                <span>{m.isInternal ? "Internal" : titleCase(m.senderRole)}</span>
                                <span>{fmtDate(m.createdAt)}</span>
                              </div>
                              <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/70">{m.body}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <SmallBadge className="border-rose-500/20 bg-rose-500/10 text-rose-100">Marketplace safety</SmallBadge>
                <h2 className="mt-3 text-2xl font-semibold text-white">Listings moderation</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
                  Remove fake goods, scam-risk services, prohibited items, empty NFTs, spam or unsafe listings. Every action is saved in AdminActionLog.
                </p>
              </div>

              <form onSubmit={submitSafetySearch} className="grid w-full gap-2 sm:grid-cols-2 xl:max-w-4xl xl:grid-cols-[1fr_140px_140px_140px_120px]">
                <input
                  value={safetyQuery}
                  onChange={(e) => setSafetyQuery(e.target.value)}
                  placeholder="Search title, wallet, country, token..."
                  className="min-h-[46px] rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#d4af37]/40 sm:col-span-2 xl:col-span-1"
                />
                <select
                  value={safetyStatus}
                  onChange={(e) => {
                    const status = e.target.value as SafetyStatus;
                    setSafetyStatus(status);
                    loadSafety({ status });
                  }}
                  className="min-h-[46px] rounded-2xl border border-white/10 bg-black/70 px-3 text-sm text-white outline-none focus:border-[#d4af37]/40"
                >
                  <option value="active">Active</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="sold_out">Sold out</option>
                  <option value="all">All</option>
                </select>
                <select
                  value={safetyHidden}
                  onChange={(e) => {
                    const hidden = e.target.value as TriState;
                    setSafetyHidden(hidden);
                    loadSafety({ hidden });
                  }}
                  className="min-h-[46px] rounded-2xl border border-white/10 bg-black/70 px-3 text-sm text-white outline-none focus:border-[#d4af37]/40"
                >
                  <option value="">Any hidden</option>
                  <option value="true">Hidden only</option>
                  <option value="false">Visible only</option>
                </select>
                <select
                  value={safetyVerified}
                  onChange={(e) => {
                    const verified = e.target.value as TriState;
                    setSafetyVerified(verified);
                    loadSafety({ verified });
                  }}
                  className="min-h-[46px] rounded-2xl border border-white/10 bg-black/70 px-3 text-sm text-white outline-none focus:border-[#d4af37]/40"
                >
                  <option value="">Any NFT</option>
                  <option value="true">Verified NFT</option>
                  <option value="false">Unverified NFT</option>
                </select>
                <button
                  type="submit"
                  className="min-h-[46px] rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/12 px-5 text-sm font-semibold text-[#f7e7a7] transition hover:bg-[#d4af37]/18"
                >
                  Search
                </button>
              </form>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-5">
              <InfoBox label="Active" value={safetySummary.active} />
              <InfoBox label="Cancelled" value={safetySummary.cancelled} />
              <InfoBox label="Sold out" value={safetySummary.sold_out} />
              <InfoBox label="Admin hidden" value={safetySummary.hidden} />
              <InfoBox label="Unverified NFTs" value={safetySummary.unverified_nfts} />
            </div>
          </div>

          {safetyError ? (
            <div className="rounded-[26px] border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">{safetyError}</div>
          ) : null}

          {safetyLoading ? (
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-8 text-sm text-white/60">Loading listings…</div>
          ) : listings.length === 0 ? (
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-8 text-sm text-white/60">No listings found for this filter.</div>
          ) : (
            <div className="space-y-4">
              {listings.map((listing) => {
                const image = ipfsToHttp(listing.nft?.image || null);
                const seller = listing.seller?.handle ? `@${listing.seller.handle}` : shortAddr(listing.sellerWallet);
                const canRestore = role === "ADMIN";

                return (
                  <div key={listing.id} className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
                      <div className="flex min-w-0 flex-1 gap-4">
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-black/30">
                          {image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={image} alt="NFT" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-white/35">NFT</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <SmallBadge className={statusTone(listing.status)}>{titleCase(listing.status)}</SmallBadge>
                            <SmallBadge className={marketTone(listing.marketType)}>{titleCase(listing.marketType)}</SmallBadge>
                            {listing.adminHidden ? <SmallBadge className="border-violet-500/20 bg-violet-500/10 text-violet-100">Admin hidden</SmallBadge> : null}
                            {listing.nft?.verified === false ? <SmallBadge className="border-rose-500/20 bg-rose-500/10 text-rose-100">NFT unverified</SmallBadge> : null}
                          </div>
                          <div className="mt-3 text-lg font-semibold text-white">{listing.nft?.name || `Token #${listing.tokenId}`}</div>
                          <div className="mt-1 text-sm text-white/55">
                            Listing {listing.marketplaceListingId} · Token #{listing.tokenId} · {formatPaymentAmount(listing.pricePerUnitWei, null)}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/45">
                            <span>Seller {seller}</span>
                            <span>Remaining {fmtAmount(listing.amountRemaining)} / {fmtAmount(listing.amountTotal)}</span>
                            {listing.category ? <span>{listing.category}</span> : null}
                            {listing.serviceCity || listing.serviceCountry ? <span>{[listing.serviceCity, listing.serviceCountry].filter(Boolean).join(", ")}</span> : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-start justify-start gap-2 xl:justify-end">
                        <Link
                          href={`/app/trading?chainId=${listing.chainId}&contract=${listing.contract}&tokenId=${listing.tokenId}`}
                          className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/[0.08]"
                        >
                          Open NFT
                        </Link>
                        {!listing.adminHidden && listing.status === "ACTIVE" ? (
                          <button
                            type="button"
                            disabled={listingActionId === listing.id}
                            onClick={() => moderateListing(listing, "remove")}
                            className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Remove listing
                          </button>
                        ) : null}
                        {listing.nft?.verified ? (
                          <button
                            type="button"
                            disabled={listingActionId === listing.id}
                            onClick={() => moderateListing(listing, "disable_nft")}
                            className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Disable NFT
                          </button>
                        ) : canRestore ? (
                          <button
                            type="button"
                            disabled={listingActionId === listing.id}
                            onClick={() => moderateListing(listing, "enable_nft")}
                            className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Enable NFT
                          </button>
                        ) : null}
                        {listing.adminHidden && canRestore ? (
                          <button
                            type="button"
                            disabled={listingActionId === listing.id}
                            onClick={() => moderateListing(listing, "restore")}
                            className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Restore
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <InfoBox label="Seller wallet" value={shortAddr(listing.sellerWallet)} />
                      <InfoBox label="Contract" value={<><div>{shortAddr(listing.contract)}</div><div className="text-xs text-white/45">Chain {listing.chainId}</div></>} />
                      <InfoBox label="Fulfillment" value={`${titleCase(listing.fulfillmentType || listing.nft?.fulfillmentType)} / ${titleCase(listing.category || listing.nft?.category)}`} />
                      <InfoBox label="Moderation" value={<><div>{listing.adminHiddenReason || "—"}</div><div className="text-xs text-white/45">{listing.adminHiddenAt ? `Hidden ${fmtDate(listing.adminHiddenAt)}` : "Visible"}</div></>} />
                    </div>

                    {listing.adminHiddenNote || listing.nft?.description ? (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <InfoBox label="Admin note" value={listing.adminHiddenNote || "—"} />
                        <InfoBox label="NFT description" value={listing.nft?.description || "—"} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
