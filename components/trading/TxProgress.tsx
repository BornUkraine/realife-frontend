"use client";

/**
 * Shared inline transaction progress strip.
 * Used by TradingPanel1155 and QuickList1155 to give the user a clear
 * "what step am I on" indicator instead of a cascade of separate toasts.
 *
 * Phases (in order):
 *   1. preparing    - building args, ensuring chain
 *   2. awaiting-sig - wallet popup is open, user must sign
 *   3. confirming   - tx submitted, waiting for receipt
 *   4. syncing      - confirmed on-chain, refreshing local state
 *   5. done         - success
 *   error           - terminal failure (renders red, optional retry)
 *   idle            - nothing to render
 */

export type TxPhase =
  | "idle"
  | "preparing"
  | "awaiting-sig"
  | "confirming"
  | "syncing"
  | "done"
  | "error";

export type TxKind = "approve" | "list" | "buy" | "cancel";

export type TxState = {
  kind: TxKind;
  phase: TxPhase;
  label: string;
  txHash?: string | null;
  errorText?: string | null;
};

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function explorerTxUrl(chainId: number, txHash: string) {
  if (!txHash) return "#";
  if (chainId === 84532) return `https://sepolia.basescan.org/tx/${txHash}`;
  if (chainId === 8453) return `https://basescan.org/tx/${txHash}`;
  return "#";
}

const KIND_LABEL: Record<TxKind, string> = {
  approve: "Approval",
  list: "Listing",
  buy: "Purchase",
  cancel: "Cancel",
};

const STEPS: Array<{ key: TxPhase; label: string }> = [
  { key: "preparing", label: "Prepare" },
  { key: "awaiting-sig", label: "Sign" },
  { key: "confirming", label: "Confirm" },
  { key: "syncing", label: "Sync" },
  { key: "done", label: "Done" },
];

const ORDER: TxPhase[] = [
  "preparing",
  "awaiting-sig",
  "confirming",
  "syncing",
  "done",
];

export default function TxProgress({
  state,
  chainId,
  onDismiss,
  onRetry,
  compact = false,
  className = "",
}: {
  state: TxState | null;
  chainId: number;
  onDismiss?: () => void;
  onRetry?: () => void;
  /** compact = denser typography & spacing, used inside small modals */
  compact?: boolean;
  className?: string;
}) {
  if (!state || state.phase === "idle") return null;

  const isError = state.phase === "error";
  const isDone = state.phase === "done";

  const currentIndex = isError
    ? Math.max(0, ORDER.indexOf("confirming"))
    : ORDER.indexOf(state.phase);

  const tone = isError
    ? "border-rose-500/25 bg-rose-500/10 text-rose-100"
    : isDone
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
    : "border-amber-500/25 bg-amber-500/10 text-amber-100";

  const explorer =
    state.txHash && state.txHash.startsWith("0x")
      ? explorerTxUrl(chainId, state.txHash)
      : null;

  return (
    <div
      className={cx(
        "overflow-hidden rounded-2xl border transition-all duration-300",
        compact ? "p-3" : "p-4",
        tone,
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div
            className={cx(
              "font-black uppercase tracking-[0.2em] opacity-75",
              compact ? "text-[10px]" : "text-[11px]"
            )}
          >
            {KIND_LABEL[state.kind]}{" "}
            {isError ? "failed" : isDone ? "complete" : "in progress"}
          </div>

          <div
            className={cx(
              "mt-1 font-bold leading-snug",
              compact ? "text-[12px]" : "text-[13px]"
            )}
          >
            {isError ? state.errorText || "Transaction failed." : state.label}
          </div>
        </div>

        {/* Right-side icon: spinner while running, ✕ if dismissable */}
        {isError || isDone ? (
          onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className={cx(
                "inline-flex shrink-0 items-center justify-center rounded-xl border border-white/15 bg-black/20 text-white/85 transition hover:bg-black/35",
                compact ? "h-7 w-7" : "h-8 w-8"
              )}
              aria-label="Dismiss"
            >
              ✕
            </button>
          ) : null
        ) : (
          <div
            className={cx(
              "inline-flex shrink-0 items-center justify-center rounded-xl border border-white/15 bg-black/20",
              compact ? "h-7 w-7" : "h-8 w-8"
            )}
            aria-hidden
          >
            <span className="block h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent opacity-80" />
          </div>
        )}
      </div>

      {/* Progress bar of 5 segments */}
      <div className={cx("flex items-center gap-1.5", compact ? "mt-2" : "mt-3")}>
        {STEPS.map((s, i) => {
          const reached = i <= currentIndex && !isError;
          const isActive = i === currentIndex && !isDone && !isError;
          const isErrorStep = isError && i === currentIndex;

          return (
            <div
              key={s.key}
              className={cx(
                "h-1.5 flex-1 rounded-full transition-all duration-300",
                isErrorStep
                  ? "bg-rose-300/80"
                  : reached
                  ? "bg-current opacity-90"
                  : "bg-current opacity-15",
                isActive ? "animate-pulse" : ""
              )}
            />
          );
        })}
      </div>

      <div
        className={cx(
          "flex flex-wrap items-center justify-between gap-2 font-semibold opacity-80",
          compact ? "mt-1.5 text-[10px]" : "mt-2 text-[11px]"
        )}
      >
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {STEPS.map((s, i) => {
            const reached = i <= currentIndex && !isError;
            return (
              <span
                key={s.key}
                className={cx(
                  "uppercase tracking-wider transition-opacity",
                  reached ? "opacity-100" : "opacity-40"
                )}
              >
                {i + 1}. {s.label}
              </span>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {isError && onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="font-black underline-offset-2 hover:underline"
            >
              Retry
            </button>
          ) : null}

          {explorer ? (
            <a
              href={explorer}
              target="_blank"
              rel="noreferrer"
              className="font-black underline-offset-2 hover:underline"
            >
              View tx ↗
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
