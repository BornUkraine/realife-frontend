// PATH: components/storefront/StorefrontQuickBuy1155.tsx — Storefront quick-buy modal
// NOTE: Visual-density alignment for the new Realife AppShell. Transaction/data logic preserved.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useWeb3Auth } from "@web3auth/modal/react";
import { encodeFunctionData } from "viem";
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

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
};

type TxRequest = {
  from: `0x${string}`;
  to: `0x${string}`;
  data?: `0x${string}`;
  value?: `0x${string}`;
};

function normalizeEvmAddress(v: unknown) {
  const s = String(v || "").trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(s) ? (s as `0x${string}`) : null;
}

function parseChainIdNumber(v: unknown) {
  const s = String(v || "").trim();
  if (!s) return null;

  const n = s.startsWith("0x") ? Number.parseInt(s, 16) : Number(s);
  return Number.isFinite(n) ? n : null;
}

function toHexQuantity(v: number | bigint) {
  const bi = typeof v === "bigint" ? v : BigInt(Math.trunc(v));
  return `0x${bi.toString(16)}` as `0x${string}`;
}

async function sendEmbeddedTransaction(provider: Eip1193Provider, tx: TxRequest) {
  const hash = await provider.request({
    method: "eth_sendTransaction",
    params: [tx],
  });

  const h = String(hash || "");
  if (!/^0x[a-fA-F0-9]{64}$/.test(h)) {
    throw new Error("Embedded wallet did not return a valid transaction hash.");
  }

  return h as `0x${string}`;
}


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

  functionName?: string;
  defaultAmount?: number;
  maxBuyPerTx?: number;
  approveUnlimited?: boolean;
  extraRevalidateTags?: string[];
  successMessage?: string;
}) {
  const router = useRouter();

  const { data: session, status } = useSession();
  const { provider: web3AuthProvider } = useWeb3Auth();

  const { address, isConnected } = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { openConnectModal } = useConnectModal();

  const externalAddress = useMemo(() => normalizeEvmAddress(address), [address]);
  const embeddedAddress = useMemo(() => {
    if (status !== "authenticated") return null;

    const user = (session as any)?.user || {};
    const walletKind = String(user.walletKind || "").toUpperCase();
    if (walletKind !== "EMBEDDED") return null;

    return normalizeEvmAddress(user.walletAddress);
  }, [session, status]);

  const activeAddress = externalAddress || embeddedAddress;
  const activeWalletKind = externalAddress ? "EXTERNAL" : embeddedAddress ? "EMBEDDED" : null;
  const hasActiveWallet = Boolean(activeAddress);
  const isEmbeddedWallet = activeWalletKind === "EMBEDDED";
  const embeddedProvider = web3AuthProvider as Eip1193Provider | null;

  const [embeddedChainId, setEmbeddedChainId] = useState<number | null>(null);

  const refreshEmbeddedChain = useCallback(async () => {
    if (!isEmbeddedWallet || !embeddedProvider) {
      setEmbeddedChainId(null);
      return null;
    }

    const raw = await embeddedProvider.request({ method: "eth_chainId" }).catch(() => null);
    const parsed = parseChainIdNumber(raw);
    setEmbeddedChainId(parsed);
    return parsed;
  }, [embeddedProvider, isEmbeddedWallet]);

  useEffect(() => {
    void refreshEmbeddedChain();
  }, [refreshEmbeddedChain]);

  const nftAddr = useMemo(
    () => toLower(nftContract || storefrontContract),
    [nftContract, storefrontContract]
  );
  const storefrontAddr = useMemo(() => toLower(storefrontContract), [storefrontContract]);
  const paymentToken = useMemo(() => toLower(paymentTokenAddress), [paymentTokenAddress]);

  const unitPriceBI = useMemo(() => toBigIntSafe(unitPriceRaw), [unitPriceRaw]);
  const remainingBI = useMemo(() => toBigIntSafe(remaining), [remaining]);

  const needSwitch = Boolean(
    hasActiveWallet &&
      (isEmbeddedWallet
        ? embeddedChainId !== null && embeddedChainId !== chainId
        : isConnected && currentChainId !== chainId)
  );
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
      if (e.key === "Escape") setOpen(false);
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
      ((activeAddress || "0x0000000000000000000000000000000000000000") as `0x${string}`),
      ((storefrontAddr || "0x0000000000000000000000000000000000000000") as `0x${string}`),
    ],
    query: {
      enabled: Boolean(hasActiveWallet && hasPaymentToken && hasStorefront),
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
    if (!activeAddress) throw new Error("Connect wallet first.");

    if (isEmbeddedWallet) {
      if (!embeddedProvider) {
        throw new Error("Embedded wallet provider is not ready. Please reconnect with Google.");
      }

      const current = await refreshEmbeddedChain();
      if (current === chainId) return;

      await embeddedProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: toHexQuantity(chainId) }],
      });

      await refreshEmbeddedChain();
      return;
    }

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
      //
    }
  }

  async function approveToken() {
    if (!activeAddress) return openConnectModal?.();
    if (!hasPaymentToken || !hasStorefront) return;

    setErr(null);
    setOk(null);
    setBusy("approve");

    try {
      await ensureChain();

      const approveAmount = approveUnlimited ? MAX_UINT256 : totalPriceRawBI;

      const hash = isEmbeddedWallet
        ? await sendEmbeddedTransaction(embeddedProvider as Eip1193Provider, {
            from: activeAddress,
            to: paymentToken as `0x${string}`,
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: "approve",
              args: [storefrontAddr as `0x${string}`, approveAmount],
            }),
          })
        : await writeContractAsync({
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
    if (!activeAddress) return openConnectModal?.();
    if (!hasStorefront || !hasPaymentToken) return;
    if (!active || isSoldOut) return;

    setErr(null);
    setOk(null);
    setBusy("buy");

    try {
      await ensureChain();

      const args = [BigInt(tokenId), BigInt(amount || 1)] as any;

      const hash = isEmbeddedWallet
        ? await sendEmbeddedTransaction(embeddedProvider as Eip1193Provider, {
            from: activeAddress,
            to: storefrontAddr as `0x${string}`,
            data: encodeFunctionData({
              abi: storefrontAbi as any,
              functionName: functionName as any,
              args,
            }),
          })
        : await writeContractAsync({
            abi: storefrontAbi as any,
            address: storefrontAddr as `0x${string}`,
            functionName: functionName as any,
            args,
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
  const buttonLabel = isSoldOut ? "Sold out" : active ? "Buy" : "Inactive";

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
          "inline-flex items-center justify-center px-3.5 py-2.5 rounded-[18px]",
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
            className="absolute top-3 right-3 z-[101] h-10 w-10 rounded-full border border-white/12 bg-white/[0.08] hover:bg-white/[0.12] transition flex items-center justify-center text-white/85 text-lg font-black"
            title="Close"
          >
            ✕
          </button>

          <div
            className="relative w-full max-w-[390px] rounded-[22px] p-px overflow-hidden bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))] shadow-[0_34px_130px_rgba(0,0,0,0.70)]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="rounded-[22px] overflow-hidden border border-white/10 bg-[#0b0a09]/82 backdrop-blur-2xl ring-1 ring-black/10">
              <div className="p-4">
                <div className="text-center">
                  <div className="text-[18px] font-black text-white/95">
                    {title || `Token #${tokenId}`}
                  </div>
                  <div className="mt-2 text-[15px] font-black text-amber-100">{priceLabel}</div>
                </div>

                {err ? (
                  <div className="mt-3 rounded-[18px] border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-[12px] text-rose-100 text-center">
                    {err}
                  </div>
                ) : null}

                {ok ? (
                  <div className="mt-3 rounded-[18px] border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-[12px] text-emerald-100 text-center">
                    {ok}
                  </div>
                ) : null}

                {!hasActiveWallet ? (
                  <button
                    onClick={() => openConnectModal?.()}
                    className="mt-3 w-full inline-flex items-center justify-center px-4 py-2.5 rounded-[18px] text-black font-extrabold hover:brightness-110 transition shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
                  >
                    Connect Wallet
                  </button>
                ) : null}

                {needSwitch ? (
                  <button
                    onClick={() => void ensureChain()}
                    className="mt-3 w-full inline-flex items-center justify-center px-4 py-2.5 rounded-[18px] border border-white/15 bg-white/[0.06] hover:bg-white/10 font-extrabold transition text-white"
                  >
                    Switch Chain
                  </button>
                ) : null}

                <div className="mt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAmount(1)}
                      className={cx(
                        "h-11 rounded-[18px] border text-sm font-black transition",
                        amount === 1
                          ? "border-amber-300/40 bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black"
                          : "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
                      )}
                    >
                      1
                    </button>

                    <button
                      type="button"
                      onClick={() => setAmount(clampInt(10, 1, Math.max(1, maxBuyAmount)))}
                      className={cx(
                        "h-11 rounded-[18px] border text-sm font-black transition",
                        amount === clampInt(10, 1, Math.max(1, maxBuyAmount))
                          ? "border-amber-300/40 bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black"
                          : "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
                      )}
                    >
                      10
                    </button>
                  </div>

                  <input
                    value={amount}
                    onChange={(e) =>
                      setAmount(clampInt(Number(e.target.value || "1"), 1, Math.max(1, maxBuyAmount)))
                    }
                    type="number"
                    min={1}
                    max={Math.max(1, maxBuyAmount)}
                    className="mt-2 h-11 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 text-center text-base font-black text-white/95 outline-none focus:border-white/20"
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    disabled={busy !== null || !hasActiveWallet || needSwitch || !needsApproval}
                    onClick={approveToken}
                    className={cx(
                      "h-11 rounded-[18px] font-extrabold transition border",
                      needsApproval
                        ? "border-white/15 bg-white/[0.06] text-white hover:bg-white/10"
                        : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
                      busy !== null || !hasActiveWallet || needSwitch ? "opacity-60 cursor-not-allowed" : ""
                    )}
                  >
                    {needsApproval ? (busy === "approve" ? "Approving..." : "Approve") : "Approved"}
                  </button>

                  <button
                    disabled={
                      busy !== null ||
                      !hasActiveWallet ||
                      needSwitch ||
                      !active ||
                      isSoldOut ||
                      !hasStorefront ||
                      !hasPaymentToken ||
                      needsApproval
                    }
                    onClick={buyNow}
                    className={cx(
                      "h-11 rounded-[18px] font-extrabold transition text-black",
                      "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.20)] hover:brightness-110",
                      busy !== null ||
                        !hasActiveWallet ||
                        needSwitch ||
                        !active ||
                        isSoldOut ||
                        !hasStorefront ||
                        !hasPaymentToken ||
                        needsApproval
                        ? "opacity-60 cursor-not-allowed"
                        : ""
                    )}
                  >
                    {busy === "buy" ? "Buying..." : "Buy"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}