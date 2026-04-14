"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";

type EscrowBucket =
  | "disputed"
  | "refund_requested"
  | "nft_returned"
  | "released"
  | "refunded";

type Row = {
  id: string;
  createdAt: string;
  updatedAt: string;
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
  buyerWallet: string;
  sellerWallet: string;
  buyer:
    | { id: string; handle: string | null; publicId: string | null }
    | null;
  seller:
    | { id: string; handle: string | null; publicId: string | null }
    | null;
  amount: string;
  unitPrice: string;
  totalPrice: string;
  paymentToken: string | null;
  fulfillmentType: string | null;
  category: string | null;
  subcategory: string | null;
  escrowStatus: string;
  deliveryStatus: string;
  serviceStatus: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  confirmedAt: string | null;
  releasedAt: string | null;
  refundedAt: string | null;
  disputedAt: string | null;
  buyerConfirmedAt: string | null;
  refundRequestedAt: string | null;
  nftReturnedAt: string | null;
  refundRejectedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  trackingCode: string | null;
  trackingUrl: string | null;
  carrier: string | null;
  buyTxHash: string | null;
  escrowReleaseTxHash: string | null;
  escrowRefundTxHash: string | null;
  noteBuyer: string | null;
  noteSeller: string | null;
  adminNote: string | null;
};

type Summary = Record<EscrowBucket, number>;

type ApiResponse = {
  ok: boolean;
  role: "MODERATOR" | "ADMIN";
  summary: Summary;
  items: Row[];
  bucket: EscrowBucket;
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

function bucketLabel(bucket: EscrowBucket) {
  if (bucket === "disputed") return "Disputed";
  if (bucket === "refund_requested") return "Refund requested";
  if (bucket === "nft_returned") return "NFT returned";
  if (bucket === "released") return "Released";
  return "Refunded";
}

function toneForBucket(bucket: EscrowBucket) {
  if (bucket === "disputed") {
    return "border-rose-500/20 bg-rose-500/10 text-rose-100";
  }
  if (bucket === "refund_requested") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  }
  if (bucket === "nft_returned") {
    return "border-sky-500/20 bg-sky-500/10 text-sky-100";
  }
  if (bucket === "released") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
  }
  return "border-zinc-500/20 bg-zinc-500/10 text-zinc-100";
}

function personLabel(
  p:
    | { id: string; handle: string | null; publicId: string | null }
    | null,
  wallet?: string | null
) {
  if (p?.handle) return `@${p.handle}`;
  if (p?.publicId) return p.publicId;
  return shortAddr(wallet);
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
  if (!r.ok || !j) {
    throw new Error(j?.error || "request_failed");
  }
  return j as T;
}

export default function ProtectedEscrowAdminClient() {
  const [bucket, setBucket] = useState<EscrowBucket>("disputed");
  const [summary, setSummary] = useState<Summary>({
    disputed: 0,
    refund_requested: 0,
    nft_returned: 0,
    released: 0,
    refunded: 0,
  });
  const [items, setItems] = useState<Row[]>([]);
  const [role, setRole] = useState<"MODERATOR" | "ADMIN" | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(nextBucket: EscrowBucket = bucket) {
    setLoading(true);
    setError(null);

    try {
      const j = await fetchJSON<ApiResponse>(
        `/api/admin/protected-escrow/orders?bucket=${encodeURIComponent(
          nextBucket
        )}`
      );

      setBucket(j.bucket);
      setRole(j.role);
      setSummary(j.summary);
      setItems(j.items);
    } catch (e: any) {
      setError(e?.message || "Unable to load protected escrow orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load("disputed");
  }, []);

  async function onSelectBucket(nextBucket: EscrowBucket) {
    if (actionId) return;
    await load(nextBucket);
  }

  async function runSettlementAction(
    order: Row,
    action: "release" | "refund"
  ) {
    if (actionId) return;

    const txField =
      action === "release" ? "escrowReleaseTxHash" : "escrowRefundTxHash";
    const txPrompt =
      action === "release"
        ? "Optional release tx hash. Leave empty if you only want to update DB / test route."
        : "Optional refund tx hash. Leave empty if you only want to update DB / test route.";
    const notePrompt =
      action === "release"
        ? "Optional admin note for release:"
        : "Optional admin note for refund:";

    const txHash = window.prompt(txPrompt, "") || "";
    const note = window.prompt(notePrompt, order.adminNote || "") || "";

    setActionId(order.id);
    setError(null);

    try {
      const j = await fetchJSON<any>(`/api/delivery/orders/${order.id}/${action}`, {
        method: "POST",
        body: JSON.stringify({
          [txField]: txHash.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });

      const orderData = j?.order || null;
      const extra =
        j?.onchainActionRequired ||
        j?.error === "ONCHAIN_RELEASE_REQUIRED" ||
        j?.error === "ONCHAIN_REFUND_REQUIRED"
          ? [
              j?.marketType ? `market=${j.marketType}` : null,
              j?.marketplaceContract ? `contract=${j.marketplaceContract}` : null,
              j?.marketplacePurchaseId ? `purchase=${j.marketplacePurchaseId}` : null,
            ]
              .filter(Boolean)
              .join(" | ")
          : "";

      if (extra) {
        window.alert(
          `${titleCase(action)} must be finalized on-chain with an operator wallet.\n\n${extra}`
        );
      } else {
        const status = orderData?.escrowStatus || order.escrowStatus;
        window.alert(`${titleCase(action)} completed.\nEscrow status: ${status}`);
      }

      await load(bucket);
    } catch (e: any) {
      const message = String(e?.message || "action_failed");

      if (
        message === "ONCHAIN_RELEASE_REQUIRED" ||
        message === "ONCHAIN_REFUND_REQUIRED"
      ) {
        window.alert(
          `${titleCase(action)} for this order must be completed on-chain by a wallet with the protected marketplace role.`
        );
      } else {
        setError(message);
      }
    } finally {
      setActionId(null);
    }
  }

  const visibleItems = useMemo(() => items, [items]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {(
          [
            "disputed",
            "refund_requested",
            "nft_returned",
            "released",
            "refunded",
          ] as EscrowBucket[]
        ).map((x) => {
          const active = x === bucket;
          return (
            <button
              key={x}
              type="button"
              onClick={() => onSelectBucket(x)}
              className={cx(
                "rounded-[26px] border p-5 text-left transition",
                active
                  ? "border-[#d4af37]/35 bg-[#d4af37]/10"
                  : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]"
              )}
            >
              <div
                className={cx(
                  "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                  toneForBucket(x)
                )}
              >
                {bucketLabel(x)}
              </div>
              <div className="mt-4 text-3xl font-semibold text-white">
                {summary[x] ?? 0}
              </div>
              <div className="mt-2 text-sm text-white/60">
                {x === "disputed"
                  ? "Need review / decision"
                  : x === "refund_requested"
                  ? "Buyer asked for refund"
                  : x === "nft_returned"
                  ? "Ready for protected refund review"
                  : x === "released"
                  ? "Funds released"
                  : "Refund completed"}
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-[30px] border border-white/10 bg-[#0b0a09]/60 p-6 backdrop-blur-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">
              {bucketLabel(bucket)}
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              Protected escrow control list
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-white/65">
              Review notes, room links, purchase ids, and settlement readiness.
              For protected on-chain orders, final release or refund must still
              be done by a wallet with the contract role.
            </p>
          </div>

          <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
            {role || "—"}
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-white/65">
            Loading orders...
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-white/65">
            No orders in this bucket right now.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {visibleItems.map((order) => {
              const isOnchain =
                order.marketType === "PROTECTED" ||
                order.marketType === "DELIVERY" ||
                (order.sourceType === "MARKETPLACE" && !!order.marketplacePurchaseId);

              return (
                <div
                  key={order.id}
                  className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-semibold text-white">
                          Order {order.id.slice(0, 10)}
                        </div>
                        <div
                          className={cx(
                            "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                            toneForBucket(bucket)
                          )}
                        >
                          {bucketLabel(bucket)}
                        </div>
                        <div className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">
                          {titleCase(order.marketType)}
                        </div>
                        {order.fulfillmentType ? (
                          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">
                            {titleCase(order.fulfillmentType)}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-2 text-sm text-white/60">
                        Token #{order.tokenId} • {titleCase(order.vertical)} •{" "}
                        {formatPaymentAmount(order.totalPrice, order.paymentToken)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/app/orders/${order.id}`}
                        className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/[0.08]"
                      >
                        Open room
                      </Link>

                      <button
                        type="button"
                        onClick={() => runSettlementAction(order, "release")}
                        disabled={actionId === order.id}
                        className="inline-flex items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Release
                      </button>

                      <button
                        type="button"
                        onClick={() => runSettlementAction(order, "refund")}
                        disabled={actionId === order.id}
                        className="inline-flex items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Refund
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                        Buyer
                      </div>
                      <div className="mt-2 text-sm font-medium text-white">
                        {personLabel(order.buyer, order.buyerWallet)}
                      </div>
                      <div className="mt-1 text-xs text-white/50">
                        {shortAddr(order.buyerWallet)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                        Seller
                      </div>
                      <div className="mt-2 text-sm font-medium text-white">
                        {personLabel(order.seller, order.sellerWallet)}
                      </div>
                      <div className="mt-1 text-xs text-white/50">
                        {shortAddr(order.sellerWallet)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                        Escrow / delivery / service
                      </div>
                      <div className="mt-2 text-sm text-white/80">
                        {titleCase(order.escrowStatus)} /{" "}
                        {titleCase(order.deliveryStatus)} /{" "}
                        {titleCase(order.serviceStatus)}
                      </div>
                      <div className="mt-1 text-xs text-white/50">
                        Updated {fmtDate(order.updatedAt)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                        Purchase / contract
                      </div>
                      <div className="mt-2 text-sm text-white/80">
                        {order.marketplacePurchaseId || "—"}
                      </div>
                      <div className="mt-1 text-xs text-white/50">
                        {shortAddr(order.marketplaceContract)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                        Buyer note
                      </div>
                      <div className="mt-2 text-sm leading-6 text-white/75">
                        {order.noteBuyer || "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                        Seller note
                      </div>
                      <div className="mt-2 text-sm leading-6 text-white/75">
                        {order.noteSeller || "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                        Admin note
                      </div>
                      <div className="mt-2 text-sm leading-6 text-white/75">
                        {order.adminNote || "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/75">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                        Refund requested
                      </div>
                      <div className="mt-2">{fmtDate(order.refundRequestedAt)}</div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/75">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                        NFT returned
                      </div>
                      <div className="mt-2">{fmtDate(order.nftReturnedAt)}</div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/75">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                        Confirmed / completed
                      </div>
                      <div className="mt-2">
                        {fmtDate(order.buyerConfirmedAt)}
                        {order.completedAt ? ` / ${fmtDate(order.completedAt)}` : ""}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/75">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                        Tx hashes
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-white/60">
                        <div>Buy: {shortHash(order.buyTxHash)}</div>
                        <div>Release: {shortHash(order.escrowReleaseTxHash)}</div>
                        <div>Refund: {shortHash(order.escrowRefundTxHash)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/65">
                    {isOnchain ? (
                      <span>
                        This order is treated as protected on-chain escrow.
                        Final release or refund should be executed by a wallet
                        with the proper contract role. Use the room for evidence
                        and this panel for review.
                      </span>
                    ) : (
                      <span>
                        This order can be finalized through the current support
                        routes directly from this panel.
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
