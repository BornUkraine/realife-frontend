"use client";

import { useMemo, useState } from "react";
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

function shortAddr(addr?: string | null) {
  if (!addr) return "—";
  const s = String(addr);
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function toLower(a?: string | null) {
  return String(a || "").trim().toLowerCase();
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

function fmtRawInt(v?: string | null) {
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

type BuyArg = string | number | boolean;

type Erc20PaymentConfig = {
  tokenAddress: string;
  spender: string;
  amountRaw: string;
  symbol?: string;
  approveUnlimited?: boolean;
};

type StorefrontBuyConfig = {
  contract: string;
  abi: readonly any[];
  functionName: string;
  args?: BuyArg[];
  bigintArgIndices?: number[];
  valueWei?: string | null;
};

export default function StorefrontBuyPanel1155({
  chainId,
  nftContract,
  tokenId,

  storefrontLabel = "Primary Storefront",
  title = "Primary Sale",
  subtitle = "Buy directly from storefront contract",

  active,
  priceLabel,
  paymentTokenLabel = "USDT",
  remaining,
  totalSupply,
  maxSupply,

  buyButtonLabel = "Buy now",

  buyConfig,
  erc20Payment,
  extraRevalidateTags = [],
  successMessage = "Purchase completed ✅",
}: {
  chainId: number;
  nftContract: string;
  tokenId: string;

  storefrontLabel?: string;
  title?: string;
  subtitle?: string;

  active: boolean;
  priceLabel: string;
  paymentTokenLabel?: string;
  remaining?: string | null;
  totalSupply?: string | null;
  maxSupply?: string | null;

  buyButtonLabel?: string;

  buyConfig?: StorefrontBuyConfig | null;
  erc20Payment?: Erc20PaymentConfig | null;
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

  const nftAddr = useMemo(() => toLower(nftContract), [nftContract]);
  const me = useMemo(() => toLower(address), [address]);

  const storefrontContract = useMemo(() => toLower(buyConfig?.contract || ""), [buyConfig?.contract]);

  const hasBuyConfig = Boolean(
    buyConfig &&
      storefrontContract.startsWith("0x") &&
      buyConfig.functionName &&
      Array.isArray(buyConfig.abi)
  );

  const erc20Token = useMemo(() => toLower(erc20Payment?.tokenAddress || ""), [erc20Payment?.tokenAddress]);
  const erc20Spender = useMemo(() => toLower(erc20Payment?.spender || ""), [erc20Payment?.spender]);

  const hasErc20Payment = Boolean(
    erc20Payment &&
      erc20Token.startsWith("0x") &&
      erc20Spender.startsWith("0x") &&
      String(erc20Payment.amountRaw || "").trim()
  );

  const requiredErc20Amount = useMemo(
    () => toBigIntSafe(erc20Payment?.amountRaw || "0"),
    [erc20Payment?.amountRaw]
  );

  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    abi: erc20Abi,
    address: (erc20Token || "0x0000000000000000000000000000000000000000") as `0x${string}`,
    functionName: "allowance",
    args: [
      ((address || "0x0000000000000000000000000000000000000000") as `0x${string}`),
      ((erc20Spender || "0x0000000000000000000000000000000000000000") as `0x${string}`),
    ],
    query: {
      enabled: Boolean(isConnected && hasErc20Payment),
    },
  });

  const allowance = useMemo(() => {
    try {
      return BigInt(allowanceRaw as any);
    } catch {
      return 0n;
    }
  }, [allowanceRaw]);

  const needSwitch = isConnected && currentChainId !== chainId;
  const needsApproval = Boolean(hasErc20Payment && allowance < requiredErc20Amount);

  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const isSoldOut = useMemo(() => {
    try {
      if (remaining == null) return false;
      return BigInt(remaining) <= 0n;
    } catch {
      return false;
    }
  }, [remaining]);

  const canBuy = active && !isSoldOut && hasBuyConfig;

  function normalizeBuyArgs(cfg: StorefrontBuyConfig): unknown[] {
    const args = cfg.args || [];
    const bigintIdx = new Set(cfg.bigintArgIndices || []);

    return args.map((arg, idx) => {
      if (bigintIdx.has(idx)) {
        return BigInt(String(arg));
      }
      return arg;
    });
  }

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
    if (!hasErc20Payment || !erc20Payment) return;

    setErr(null);
    setOk(null);
    setBusy("approve");

    try {
      await ensureChain();

      const approveAmount = erc20Payment.approveUnlimited ? MAX_UINT256 : requiredErc20Amount;

      const hash = await writeContractAsync({
        abi: erc20Abi,
        address: erc20Token as `0x${string}`,
        functionName: "approve",
        args: [erc20Spender as `0x${string}`, approveAmount],
      });

      await publicClient?.waitForTransactionReceipt({ hash });
      await refetchAllowance();

      setOk(`${erc20Payment.symbol || paymentTokenLabel} approved ✅`);
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Approve failed");
    } finally {
      setBusy(null);
    }
  }

  async function buyNow() {
    if (!isConnected) return openConnectModal?.();
    if (!buyConfig) return;
    if (!active || isSoldOut) return;

    setErr(null);
    setOk(null);
    setBusy("buy");

    try {
      await ensureChain();

      const cfg = buyConfig;
      const args = normalizeBuyArgs(cfg);
      const value = cfg.valueWei ? BigInt(cfg.valueWei) : undefined;

      const hash = await writeContractAsync({
        abi: cfg.abi as any,
        address: storefrontContract as `0x${string}`,
        functionName: cfg.functionName as any,
        args: args as any,
        ...(value !== undefined ? { value } : {}),
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

  const wrap =
    "rounded-[34px] p-px overflow-hidden bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))] shadow-[0_34px_130px_rgba(0,0,0,0.60)]";
  const card =
    "rounded-[34px] overflow-hidden border border-white/10 bg-[#0b0a09]/30 backdrop-blur-2xl ring-1 ring-black/10";

  return (
    <div className={wrap}>
      <div className={card}>
        <div className="p-6 md:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 font-black">
                {storefrontLabel}
              </div>
              <div className="mt-2 text-lg md:text-xl font-black text-white/90">{title}</div>
              <div className="mt-2 text-[12px] text-white/55">{subtitle}</div>
            </div>

            <div
              className={cx(
                "px-3 py-1.5 rounded-full border text-[11px] font-black",
                active && !isSoldOut
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                  : "border-white/15 bg-white/[0.06] text-white/70"
              )}
            >
              {isSoldOut ? "SOLD OUT" : active ? "ACTIVE" : "INACTIVE"}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Price</div>
              <div className="mt-1 text-[13px] font-extrabold text-amber-100 truncate">
                {priceLabel}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Payment</div>
              <div className="mt-1 text-[13px] font-extrabold text-white/85 truncate">
                {paymentTokenLabel}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Remaining</div>
              <div className="mt-1 text-[13px] font-extrabold text-white/85 truncate">
                {fmtRawInt(remaining)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Supply</div>
              <div className="mt-1 text-[13px] font-extrabold text-white/85 truncate">
                {fmtRawInt(totalSupply)} / {fmtRawInt(maxSupply)}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-[12px] text-white/60">
            NFT: <span className="font-mono text-white/80">{shortAddr(nftAddr)}</span>
            <span className="text-white/30"> • </span>
            Token: <span className="font-mono text-white/80">#{tokenId}</span>
            {hasBuyConfig ? (
              <>
                <span className="text-white/30"> • </span>
                Storefront: <span className="font-mono text-white/80">{shortAddr(storefrontContract)}</span>
              </>
            ) : null}
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

          {!hasBuyConfig ? (
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-[12px] text-amber-100">
              Buy config is not connected yet. The UI is ready, but exact buy contract call still needs to be passed into this component.
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
                Wallet: <span className="font-mono text-white/80">{shortAddr(me)}</span>
              </div>
            ) : null}
          </div>

          {hasErc20Payment ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                    ERC20 Approval
                  </div>
                  <div className="mt-1 text-[12px] text-white/65">
                    Token: <span className="font-mono text-white/80">{shortAddr(erc20Token)}</span>
                    <span className="text-white/30"> • </span>
                    Spender: <span className="font-mono text-white/80">{shortAddr(erc20Spender)}</span>
                  </div>
                  <div className="mt-1 text-[12px] text-white/65">
                    Need:{" "}
                    <span className="font-black text-white/85">
                      {requiredErc20Amount.toString()} {erc20Payment?.symbol || paymentTokenLabel}
                    </span>
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
                    {busy === "approve"
                      ? "Approving…"
                      : `Approve ${erc20Payment?.symbol || paymentTokenLabel}`}
                  </button>
                ) : (
                  <div className="text-[12px] text-emerald-200 font-black">Approved ✅</div>
                )}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col md:flex-row md:items-center gap-2">
            <button
              disabled={
                busy !== null ||
                !isConnected ||
                needSwitch ||
                !canBuy ||
                (hasErc20Payment ? needsApproval : false)
              }
              onClick={buyNow}
              className={cx(
                "inline-flex items-center justify-center w-full md:w-auto px-6 py-3 rounded-2xl text-black font-extrabold transition",
                "shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15",
                "hover:brightness-110",
                busy ? "opacity-60 cursor-not-allowed" : "",
                !canBuy ? "opacity-60 cursor-not-allowed" : ""
              )}
            >
              {busy === "buy" ? "Buying…" : buyButtonLabel}
            </button>

            <div className="text-[12px] text-white/55 font-semibold">
              {!active
                ? "Storefront inactive."
                : isSoldOut
                ? "Sold out."
                : hasErc20Payment && needsApproval
                ? "Approval required before buy."
                : hasBuyConfig
                ? "Ready to buy."
                : "Connect buy config first."}
            </div>
          </div>

          <div className="mt-5 text-[11px] text-white/35">
            This block is for primary storefront sales. Secondary market buy/sell stays in TradingPanel1155.
          </div>
        </div>
      </div>
    </div>
  );
}