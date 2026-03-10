"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useAccount,
  useChainId,
  useSwitchChain,
  usePublicClient,
  useWriteContract,
  useReadContract,
} from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function toLower(a?: string | null) {
  return String(a || "").trim().toLowerCase();
}

function shortAddr(addr?: string | null) {
  if (!addr) return "—";
  const s = String(addr);
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function toBigIntSafe(v?: string | number | bigint | null) {
  try {
    if (typeof v === "bigint") return v;
    if (typeof v === "number") return BigInt(Math.trunc(v));
    if (typeof v === "string" && v.trim()) return BigInt(v);
    return 0n;
  } catch {
    return 0n;
  }
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function fmtInt(v?: string | null) {
  try {
    if (!v) return "—";
    return BigInt(v).toString();
  } catch {
    return String(v || "—");
  }
}

const erc20Abi = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const MAX_UINT256 = (1n << 256n) - 1n;

export default function StorefrontQuickBuy1155({
  chainId,
  nftContract,
  storefrontContract,
  storefrontAbi,
  tokenId,

  active,
  unitPriceRaw,
  priceLabel,
  paymentTokenAddress,
  paymentSymbol = "USDT",

  remaining,
  title,
  subtitle,

  functionName = "buyProduct",
  defaultAmount = 1,
  maxBuyPerTx,
  approveUnlimited = true,
  extraRevalidateTags = [],
  successMessage = "Purchase completed ✅",
}: {
  chainId: number;
  nftContract?: string;
  storefrontContract: string;
  storefrontAbi: readonly any[];
  tokenId: string;

  active: boolean;
  unitPriceRaw: string | null;
  priceLabel: string;
  paymentTokenAddress: string;
  paymentSymbol?: string;

  remaining?: string | null;
  title?: string | null;
  subtitle?: string | null;

  functionName?: string;
  defaultAmount?: number;
  maxBuyPerTx?: number;
  approveUnlimited?: boolean;
  extraRevalidateTags?: string[];
  successMessage?: string;
}) {
  const router = useRouter();

  const { address, isConnected } = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { openConnectModal } = useConnectModal();

  const nftAddr = useMemo(
    () => toLower(nftContract || storefrontContract),
    [nftContract, storefrontContract]
  );
  const storefrontAddr = useMemo(() => toLower(storefrontContract), [storefrontContract]);
  const paymentToken = useMemo(() => toLower(paymentTokenAddress), [paymentTokenAddress]);

  const unitPriceBI = useMemo(() => toBigIntSafe(unitPriceRaw), [unitPriceRaw]);
  const remainingBI = useMemo(() => toBigIntSafe(remaining), [remaining]);

  const needSwitch = isConnected && currentChainId !== chainId;
  const isSoldOut = remaining != null ? remainingBI <= 0n : false;
  const hasStorefront = storefrontAddr.startsWith("0x");
  const hasPaymentToken = paymentToken.startsWith("0x");

  const maxBuyAmount = useMemo(() => {
    let max = remainingBI > 0n ? remainingBI : 1n;

    if (typeof maxBuyPerTx === "number" && Number.isFinite(maxBuyPerTx) && maxBuyPerTx > 0) {
      const hardCap = BigInt(Math.trunc(maxBuyPerTx));
      max = max > hardCap ? hardCap : max;
    }

    if (max > 999999n) return 999999;
    return Number(max);
  }, [remainingBI, maxBuyPerTx]);

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(clampInt(defaultAmount, 1, Math.max(1, maxBuyAmount)));
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    setAmount((prev) => clampInt(prev, 1, Math.max(1, maxBuyAmount)));
  }, [maxBuyAmount]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const totalPriceRawBI = useMemo(() => {
    try {
      return unitPriceBI * BigInt(amount || 1);
    } catch {
      return unitPriceBI;
    }
  }, [unitPriceBI, amount]);

  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    abi: erc20Abi,
    address: (paymentToken || "0x0000000000000000000000000000000000000000") as `0x${string}`,
    functionName: "allowance",
    args: [
      ((address || "0x0000000000000000000000000000000000000000") as `0x${string}`),
      ((storefrontAddr || "0x0000000000000000000000000000000000000000") as `0x${string}`),
    ],
    query: {
      enabled: Boolean(isConnected && hasPaymentToken && hasStorefront),
    },
  });

  const allowance = useMemo(() => {
    try {
      return BigInt(allowanceRaw as any);
    } catch {
      return 0n;
    }
  }, [allowanceRaw]);

  const needsApproval = hasPaymentToken && allowance < totalPriceRawBI;

  async function ensureChain() {
    if (needSwitch) {
      await switchChainAsync?.({ chainId });
    }
  }

  async function revalidateAfterBuy() {
    const tags = [
      `market:nft:${chainId}:${nftAddr}:${tokenId}`,
      `market:contract:${chainId}:${nftAddr}`,
      ...extraRevalidateTags,
    ];

    try {
      await fetch("/api/revalidate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tags }),
      });
    } catch {
      // ignore
    }
  }

  async function approveToken() {
    if (!isConnected) return openConnectModal?.();
    if (!hasPaymentToken || !hasStorefront) return;

    setErr(null);
    setOk(null);
    setBusy("approve");

    try {
      await ensureChain();

      const approveAmount = approveUnlimited ? MAX_UINT256 : totalPriceRawBI;

      const hash = await writeContractAsync({
        abi: erc20Abi,
        address: paymentToken as `0x${string}`,
        functionName: "approve",
        args: [storefrontAddr as `0x${string}`, approveAmount],
      });

      await publicClient?.waitForTransactionReceipt({ hash });
      await refetchAllowance();

      setOk(`${paymentSymbol} approved ✅`);
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Approve failed");
    } finally {
      setBusy(null);
    }
  }

  async function buyNow() {
    if (!isConnected) return openConnectModal?.();
    if (!hasStorefront || !hasPaymentToken) return;
    if (!active || isSoldOut) return;

    setErr(null);
    setOk(null);
    setBusy("buy");

    try {
      await ensureChain();

      const hash = await writeContractAsync({
        abi: storefrontAbi as any,
        address: storefrontAddr as `0x${string}`,
        functionName: functionName as any,
        args: [BigInt(tokenId), BigInt(amount || 1)] as any,
      });

      await publicClient?.waitForTransactionReceipt({ hash });

      await revalidateAfterBuy();
      router.refresh();

      setOk(successMessage);
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Buy failed");
    } finally {
      setBusy(null);
    }
  }

  const disabledOpen = !active || isSoldOut;
  const disabledBuy =
    busy !== null ||
    !isConnected ||
    needSwitch ||
    !active ||
    isSoldOut ||
    !hasStorefront ||
    !hasPaymentToken ||
    needsApproval;

  const buttonLabel = isSoldOut ? "Sold out" : active ? "Buy now" : "Inactive";

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (disabledOpen) return;
          setErr(null);
          setOk(null);
          setOpen(true);
        }}
        disabled={disabledOpen}
        className={cx(
          "inline-flex items-center justify-center px-4 py-3 rounded-2xl",
          "text-[12px] font-extrabold transition",
          disabledOpen
            ? "border border-white/10 bg-white/[0.04] text-white/45 cursor-not-allowed"
            : "text-black bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] shadow-[0_18px_60px_rgba(212,175,55,0.16)] ring-1 ring-black/15 hover:brightness-110"
        )}
        title={buttonLabel}
      >
        {buttonLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }}
            className="absolute top-4 right-4 z-[101] h-10 w-10 rounded-full border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition flex items-center justify-center text-white/80 font-black"
            title="Close (Esc)"
          >
            ✕
          </button>

          <div
            className="relative w-full max-w-lg rounded-[34px] p-px overflow-hidden bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))] shadow-[0_34px_130px_rgba(0,0,0,0.70)]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="rounded-[34px] overflow-hidden border border-white/10 bg-[#0b0a09]/70 backdrop-blur-2xl ring-1 ring-black/10">
              <div className="p-6 md:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 font-black">
                      Quick Buy
                    </div>
                    <div className="mt-2 text-xl font-black tracking-tight text-white/90 truncate">
                      {title || `Token #${tokenId}`}
                    </div>
                    <div className="mt-2 text-[12px] text-white/55">
                      {subtitle || "Primary storefront purchase"}
                    </div>
                    <div className="mt-2 text-[12px] text-white/55">
                      Store: <span className="font-mono text-white/80">{shortAddr(storefrontAddr)}</span>
                      <span className="text-white/30"> • </span>
                      Token: <span className="font-mono text-white/80">#{tokenId}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setOpen(false)}
                    className="shrink-0 px-3 py-2 rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition text-[12px] font-black text-white/80"
                    title="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Price</div>
                    <div className="mt-1 text-[16px] font-black text-amber-100">{priceLabel}</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Remaining</div>
                    <div className="mt-1 text-[16px] font-black text-white/90">{fmtInt(remaining)}</div>
                  </div>
                </div>

                {err ? (
                  <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-[12px] text-rose-100">
                    {err}
                  </div>
                ) : null}

                {ok ? (
                  <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-[12px] text-emerald-100">
                    {ok}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {!isConnected ? (
                    <button
                      onClick={() => openConnectModal?.()}
                      className="inline-flex items-center justify-center px-5 py-3 rounded-2xl text-black font-extrabold hover:brightness-110 transition shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
                    >
                      Connect Wallet
                    </button>
                  ) : null}

                  {needSwitch ? (
                    <button
                      onClick={() => switchChainAsync?.({ chainId })}
                      className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 font-extrabold transition"
                    >
                      Switch Chain ({chainId})
                    </button>
                  ) : null}

                  {isConnected ? (
                    <div className="text-[12px] text-white/55 font-semibold">
                      Wallet: <span className="font-mono text-white/80">{shortAddr(address || "")}</span>
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 grid md:grid-cols-2 gap-3">
                  <label className="block">
                    <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Amount</div>
                    <input
                      value={amount}
                      onChange={(e) =>
                        setAmount(clampInt(Number(e.target.value || "1"), 1, Math.max(1, maxBuyAmount)))
                      }
                      type="number"
                      min={1}
                      max={Math.max(1, maxBuyAmount)}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/90 outline-none focus:border-white/20"
                    />
                    <div className="mt-1 text-[11px] text-white/40">Max: {Math.max(1, maxBuyAmount)}</div>
                  </label>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Approval / Total</div>
                    <div className="mt-2 text-[13px] font-extrabold text-amber-100">
                      {totalPriceRawBI.toString()} raw {paymentSymbol}
                    </div>
                    <div className="mt-1 text-[11px] text-white/40">ERC20 storefront payment</div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                        ERC20 Approval
                      </div>
                      <div className="mt-1 text-[12px] text-white/65">
                        Token: <span className="font-mono text-white/80">{shortAddr(paymentToken)}</span>
                        <span className="text-white/30"> • </span>
                        Spender: <span className="font-mono text-white/80">{shortAddr(storefrontAddr)}</span>
                      </div>
                    </div>

                    <div className="text-[12px] text-white/55 font-semibold">
                      Allowance: <span className="font-black text-white/85">{allowance.toString()}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {needsApproval ? (
                      <button
                        disabled={busy !== null || !isConnected || needSwitch}
                        onClick={approveToken}
                        className={cx(
                          "inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 font-extrabold transition",
                          busy ? "opacity-60 cursor-not-allowed" : ""
                        )}
                      >
                        {busy === "approve" ? `Approving ${paymentSymbol}…` : `Approve ${paymentSymbol}`}
                      </button>
                    ) : (
                      <div className="text-[12px] text-emerald-200 font-black">Approved ✅</div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex flex-col md:flex-row md:items-center gap-2">
                  <button
                    disabled={disabledBuy}
                    onClick={buyNow}
                    className={cx(
                      "inline-flex items-center justify-center w-full md:w-auto px-6 py-3 rounded-2xl text-black font-extrabold transition",
                      "shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15",
                      "hover:brightness-110",
                      disabledBuy ? "opacity-60 cursor-not-allowed" : ""
                    )}
                  >
                    {busy === "buy" ? "Buying…" : "Buy now"}
                  </button>

                  <button
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center justify-center w-full md:w-auto px-5 py-3 rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition text-[12px] font-black text-white/80"
                  >
                    Cancel
                  </button>

                  <div className="text-[12px] text-white/55 font-semibold md:ml-2">
                    {!active
                      ? "Storefront inactive."
                      : isSoldOut
                      ? "Sold out."
                      : needsApproval
                      ? "Approval required before buy."
                      : "Ready to buy."}
                  </div>
                </div>

                <div className="mt-5 text-[11px] text-white/35">
                  Quick buy is for primary storefront sales. Secondary trading stays on the NFT detail page.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}