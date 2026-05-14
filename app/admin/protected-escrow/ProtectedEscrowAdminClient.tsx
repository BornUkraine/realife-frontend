"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { formatUnits, isAddress } from "viem";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { realifeMarketplaceProtectedEscrow1155Abi } from "@/lib/realifeMarketplaceProtectedEscrow1155Abi";

type EscrowBucket =
  | "all"
  | "open"
  | "disputed"
  | "refund_requested"
  | "nft_returned"
  | "released"
  | "refunded";

type OrderScope = "protected" | "all";

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
  buyer: { id: string; handle: string | null; publicId: string | null } | null;
  seller: { id: string; handle: string | null; publicId: string | null } | null;
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
  return paymentToken ? "USDC" : "ETH";
}

function formatPaymentAmount(
  raw?: string | null,
  paymentToken?: string | null,
) {
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
  if (bucket === "all") return "All orders";
  if (bucket === "open") return "Open orders";
  if (bucket === "disputed") return "Disputed";
  if (bucket === "refund_requested") return "Refund requested";
  if (bucket === "nft_returned") return "NFT returned";
  if (bucket === "released") return "Released";
  return "Refunded";
}

function toneForBucket(bucket: EscrowBucket) {
  if (bucket === "all") {
    return "border-[#d4af37]/25 bg-[#d4af37]/10 text-[#f7e7a7]";
  }
  if (bucket === "open") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
  }
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
  p: { id: string; handle: string | null; publicId: string | null } | null,
  wallet?: string | null,
) {
  if (p?.handle) return `@${p.handle}`;
  if (p?.publicId) return p.publicId;
  return shortAddr(wallet);
}

function personProfileHref(
  p: { id: string; handle: string | null; publicId: string | null } | null,
) {
  const key = String(p?.handle || p?.publicId || "").trim();
  return key ? `/app/profile/${encodeURIComponent(key)}` : null;
}

function isFinalEscrowStatus(v?: string | null) {
  const s = String(v || "").toUpperCase();
  return s === "RELEASED" || s === "REFUNDED" || s === "CANCELLED";
}

function protectedMarketplaceAddress(order: Row) {
  const fallback =
    process.env.NEXT_PUBLIC_REALIFE_MARKETPLACE_PROTECTED_ADDRESS ||
    process.env.NEXT_PUBLIC_REALIFE_PROTECTED_MARKETPLACE_CONTRACT ||
    process.env.NEXT_PUBLIC_REALIFE_PROTECTED_MARKETPLACE_CONTRACT_ADDRESS ||
    "";

  return String(order.marketplaceContract || fallback || "").trim();
}

function protectedPurchaseId(order: Row) {
  const s = String(order.marketplacePurchaseId || "").trim();
  if (!s) return null;
  try {
    return BigInt(s);
  } catch {
    return null;
  }
}

function canUseProtectedContract(order: Row) {
  const contract = protectedMarketplaceAddress(order);
  return (
    order.marketType === "PROTECTED" &&
    isAddress(contract) &&
    protectedPurchaseId(order) != null
  );
}

function walletErrorMessage(e: any) {
  const raw = String(
    e?.shortMessage || e?.message || e || "Wallet action failed",
  );
  if (raw.includes("Ownable") || raw.includes("owner")) {
    return "Wallet transaction failed. The connected wallet is not the protected marketplace owner/operator wallet.";
  }
  if (raw.includes("NFT_NOT_RETURNED")) {
    return "Refund failed on-chain: buyer must return the NFT to escrow first.";
  }
  if (raw.includes("BAD_STATUS")) {
    return "On-chain action failed: this purchase is not in a valid status for this action.";
  }
  if (raw.includes("User rejected") || raw.includes("rejected")) {
    return "Wallet transaction was rejected.";
  }
  if (
    raw.includes("EstimateGasExecutionError") ||
    raw.includes("execution reverted") ||
    raw.includes("reverted") ||
    raw.includes("cannot estimate gas") ||
    raw.includes("ContractFunctionExecutionError")
  ) {
    return (
      "The protected escrow contract rejected this action before signing. " +
      "Most likely reason: wrong owner/operator wallet, wrong purchase status, NFT was not returned on-chain, or ABI/function mismatch. Raw error: " +
      raw
    );
  }
  return raw;
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
  const [bucket, setBucket] = useState<EscrowBucket>("all");
  const [scope, setScope] = useState<OrderScope>("protected");
  const [query, setQuery] = useState("");
  const [queryDraft, setQueryDraft] = useState("");
  const [summary, setSummary] = useState<Summary>({
    all: 0,
    open: 0,
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

  const { address: connectedAddress } = useAccount();
  const connectedChainId = useChainId();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  async function load(
    nextBucket: EscrowBucket = bucket,
    nextScope: OrderScope = scope,
    nextQuery: string = query,
  ) {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        bucket: nextBucket,
        scope: nextScope,
        take: "100",
      });
      const cleanedQuery = nextQuery.trim();
      if (cleanedQuery) params.set("q", cleanedQuery);

      const j = await fetchJSON<ApiResponse>(
        `/api/admin/protected-escrow/orders?${params.toString()}`,
      );

      setBucket(j.bucket);
      setScope(nextScope);
      setQuery(cleanedQuery);
      setQueryDraft(cleanedQuery);
      setRole(j.role);
      setSummary({
        all: j.summary?.all ?? 0,
        open: j.summary?.open ?? 0,
        disputed: j.summary?.disputed ?? 0,
        refund_requested: j.summary?.refund_requested ?? 0,
        nft_returned: j.summary?.nft_returned ?? 0,
        released: j.summary?.released ?? 0,
        refunded: j.summary?.refunded ?? 0,
      });
      setItems(j.items);
    } catch (e: any) {
      setError(e?.message || "Unable to load protected escrow orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load("all", "protected", "");
  }, []);

  async function onSelectBucket(nextBucket: EscrowBucket) {
    if (actionId) return;
    await load(nextBucket, scope, query);
  }

  async function onSelectScope(nextScope: OrderScope) {
    if (actionId) return;
    await load(bucket, nextScope, query);
  }

  async function onSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (actionId) return;
    await load(bucket, scope, queryDraft);
  }

  async function clearSearch() {
    if (actionId) return;
    await load(bucket, scope, "");
  }

  async function runSettlementAction(order: Row, action: "release" | "refund") {
    if (actionId) return;

    if (isFinalEscrowStatus(order.escrowStatus)) {
      window.alert(
        `This order is already finalized: ${titleCase(order.escrowStatus)}.`,
      );
      return;
    }

    const isProtected = canUseProtectedContract(order);
    const contract = protectedMarketplaceAddress(order);
    const purchaseId = protectedPurchaseId(order);

    const notePrompt =
      action === "release"
        ? "Admin note for force release:"
        : "Admin note for force refund:";
    const note = window.prompt(notePrompt, order.adminNote || "");
    if (note === null) return;

    let txHash = "";

    try {
      setActionId(order.id);
      setError(null);

      if (isProtected) {
        if (!connectedAddress) {
          throw new Error(
            "Connect the protected marketplace owner/operator wallet first.",
          );
        }
        if (!purchaseId) {
          throw new Error("Marketplace purchaseId is missing or invalid.");
        }

        if (action === "refund" && !order.nftReturnedAt) {
          const proceed = window.confirm(
            "Protected refund normally requires buyer to return the NFT to escrow first. Continue and let the contract validate status?",
          );
          if (!proceed) return;
        }

        const proceed = window.confirm(
          `${action === "release" ? "Force release" : "Force refund"} will open your wallet and call ${
            action === "release" ? "releasePurchase" : "refundPurchase"
          }(${purchaseId.toString()}) on the protected escrow contract.\n\n` +
            `Contract: ${contract}\n` +
            `Connected wallet: ${connectedAddress}\n\n` +
            "Continue only after reviewing evidence in the order room.",
        );
        if (!proceed) return;

        if (connectedChainId !== order.chainId) {
          await switchChainAsync?.({ chainId: order.chainId });
        }

        if (!publicClient) {
          throw new Error("RPC/public client is not ready. Refresh the page and reconnect the wallet.");
        }

        const functionName =
          action === "release" ? "releasePurchase" : "refundPurchase";

        // Preflight simulation prevents MetaMask from opening a disabled
        // “Unknown transaction” when the contract will revert anyway.
        // If this fails, the user sees the real reason in the admin panel.
        const simulated = await publicClient.simulateContract({
          address: contract as `0x${string}`,
          abi: realifeMarketplaceProtectedEscrow1155Abi,
          functionName,
          args: [purchaseId],
          account: connectedAddress as `0x${string}`,
        } as any);

        const hash = await writeContractAsync(simulated.request as any);

        txHash = String(hash);
        await publicClient.waitForTransactionReceipt({
          hash: hash as `0x${string}`,
        });
      } else {
        const txFieldLabel = action === "release" ? "release" : "refund";
        const manualTx = window.prompt(
          `Optional ${txFieldLabel} tx hash. Leave empty if this is only a DB/test update.`,
          "",
        );
        if (manualTx === null) return;
        txHash = manualTx.trim();
      }

      const txField =
        action === "release" ? "escrowReleaseTxHash" : "escrowRefundTxHash";

      const j = await fetchJSON<any>(
        `/api/delivery/orders/${order.id}/${action}`,
        {
          method: "POST",
          body: JSON.stringify({
            [txField]: txHash || undefined,
            note: note.trim() || undefined,
          }),
        },
      );

      const orderData = j?.order || null;
      const status = orderData?.escrowStatus || order.escrowStatus;
      window.alert(
        `${titleCase(action)} completed.\nEscrow status: ${status}${txHash ? `\nTx: ${shortHash(txHash)}` : ""}`,
      );

      await load(bucket);
    } catch (e: any) {
      const message = walletErrorMessage(e);

      if (
        message === "ONCHAIN_RELEASE_REQUIRED" ||
        message === "ONCHAIN_REFUND_REQUIRED"
      ) {
        window.alert(
          `${titleCase(action)} for this order must be completed on-chain by a wallet with the protected marketplace role.`,
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {(
          [
            "all",
            "open",
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
                  : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]",
              )}
            >
              <div
                className={cx(
                  "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                  toneForBucket(x),
                )}
              >
                {bucketLabel(x)}
              </div>
              <div className="mt-4 text-3xl font-semibold text-white">
                {summary[x] ?? 0}
              </div>
              <div className="mt-2 text-sm text-white/60">
                {x === "all"
                  ? "All visible platform orders"
                  : x === "open"
                    ? "Active orders before settlement"
                    : x === "disputed"
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
              All orders & protected escrow control list
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-white/65">
              Admins and moderators can now review every active, completed, disputed, refunded and released order from one place. Use Open room to enter the buyer/seller order room, read messages, delivery proof, service evidence and support notes. For protected on-chain orders, Release/Refund opens the connected wallet and calls the protected escrow contract.
            </p>
          </div>

          <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
            {role || "—"}
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[auto_1fr] lg:items-end">
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Order scope
            </div>
            <div className="flex flex-wrap gap-2">
              {(["protected", "all"] as OrderScope[]).map((x) => (
                <button
                  key={x}
                  type="button"
                  onClick={() => onSelectScope(x)}
                  disabled={actionId !== null || loading}
                  className={cx(
                    "rounded-2xl border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition disabled:cursor-not-allowed disabled:opacity-60",
                    scope === x
                      ? "border-[#d4af37]/35 bg-[#d4af37]/12 text-[#f7e7a7]"
                      : "border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:bg-white/[0.07]",
                  )}
                >
                  {x === "protected" ? "Protected / service orders" : "All store orders"}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={onSearchSubmit} className="flex flex-wrap gap-2">
            <input
              value={queryDraft}
              onChange={(e) => setQueryDraft(e.target.value)}
              placeholder="Search order id, wallet, tokenId, tx hash, city, category..."
              className="min-w-[260px] flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#d4af37]/35"
            />
            <button
              type="submit"
              disabled={actionId !== null || loading}
              className="rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/12 px-4 py-2.5 text-sm font-semibold text-[#f7e7a7] transition hover:bg-[#d4af37]/18 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Search
            </button>
            {query ? (
              <button
                type="button"
                onClick={clearSearch}
                disabled={actionId !== null || loading}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear
              </button>
            ) : null}
          </form>
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
            No orders match this filter right now.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {visibleItems.map((order) => {
              const isOnchain =
                order.marketType === "PROTECTED" ||
                order.marketType === "DELIVERY" ||
                (order.sourceType === "MARKETPLACE" &&
                  !!order.marketplacePurchaseId);

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
                            toneForBucket(bucket),
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
                        {formatPaymentAmount(
                          order.totalPrice,
                          order.paymentToken,
                        )}
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
                        disabled={
                          actionId === order.id ||
                          isFinalEscrowStatus(order.escrowStatus)
                        }
                        className="inline-flex items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Release
                      </button>

                      <button
                        type="button"
                        onClick={() => runSettlementAction(order, "refund")}
                        disabled={
                          actionId === order.id ||
                          isFinalEscrowStatus(order.escrowStatus)
                        }
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
                      {personProfileHref(order.buyer) ? (
                        <Link
                          href={personProfileHref(order.buyer)!}
                          className="mt-2 block text-sm font-medium text-[#f5d76e] hover:underline"
                        >
                          {personLabel(order.buyer, order.buyerWallet)} ↗
                        </Link>
                      ) : (
                        <div className="mt-2 text-sm font-medium text-white">
                          {personLabel(order.buyer, order.buyerWallet)}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-white/50">
                        {shortAddr(order.buyerWallet)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                        Seller
                      </div>
                      {personProfileHref(order.seller) ? (
                        <Link
                          href={personProfileHref(order.seller)!}
                          className="mt-2 block text-sm font-medium text-[#f5d76e] hover:underline"
                        >
                          {personLabel(order.seller, order.sellerWallet)} ↗
                        </Link>
                      ) : (
                        <div className="mt-2 text-sm font-medium text-white">
                          {personLabel(order.seller, order.sellerWallet)}
                        </div>
                      )}
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
                      <div className="mt-2">
                        {fmtDate(order.refundRequestedAt)}
                      </div>
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
                        {order.completedAt
                          ? ` / ${fmtDate(order.completedAt)}`
                          : ""}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/75">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                        Tx hashes
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-white/60">
                        <div>Buy: {shortHash(order.buyTxHash)}</div>
                        <div>
                          Release: {shortHash(order.escrowReleaseTxHash)}
                        </div>
                        <div>Refund: {shortHash(order.escrowRefundTxHash)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/65">
                    {isOnchain ? (
                      <span>
                        This order is treated as protected on-chain escrow.
                        Release/Refund will call the protected marketplace
                        contract from the connected owner/operator wallet, then
                        sync the tx hash into the order.
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
