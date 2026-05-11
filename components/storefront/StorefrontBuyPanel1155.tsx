// PATH: components/storefront/StorefrontBuyPanel1155.tsx — Storefront detail buy panel
// NOTE: Visual-density alignment for the new Realife AppShell. Transaction/data logic preserved.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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


const DELIVERY_CREATE_ENDPOINT = "/api/delivery/orders/create";
const LEGACY_STORE_CREATE_ENDPOINT = "/api/store/orders/create";

type BuyArg = string | number | boolean;
type CheckoutMode = "simple" | "delivery";

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

  checkoutMode = "simple",
  vertical = "store",
  deliveryEnabled = false,
  physicalItemIncluded = false,
  officialItem = false,
  primarySellerWallet = null,

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

  checkoutMode?: CheckoutMode;
  vertical?: string;
  deliveryEnabled?: boolean;
  physicalItemIncluded?: boolean;
  officialItem?: boolean;
  primarySellerWallet?: string | null;

  buyConfig?: StorefrontBuyConfig | null;
  erc20Payment?: Erc20PaymentConfig | null;
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

  const nftAddr = useMemo(() => toLower(nftContract), [nftContract]);

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

  const me = useMemo(() => toLower(activeAddress), [activeAddress]);

  const storefrontContract = useMemo(
    () => toLower(buyConfig?.contract || ""),
    [buyConfig?.contract]
  );

  const hasBuyConfig = Boolean(
    buyConfig &&
      storefrontContract.startsWith("0x") &&
      buyConfig.functionName &&
      Array.isArray(buyConfig.abi)
  );

  const erc20Token = useMemo(
    () => toLower(erc20Payment?.tokenAddress || ""),
    [erc20Payment?.tokenAddress]
  );

  const erc20Spender = useMemo(
    () => toLower(erc20Payment?.spender || ""),
    [erc20Payment?.spender]
  );

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

  const isDeliveryCheckout = checkoutMode === "delivery";

  const requiresShipping = useMemo(() => {
    if (!isDeliveryCheckout) return false;
    return Boolean(deliveryEnabled || physicalItemIncluded);
  }, [isDeliveryCheckout, deliveryEnabled, physicalItemIncluded]);

  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    abi: erc20Abi,
    address: (erc20Token ||
      "0x0000000000000000000000000000000000000000") as `0x${string}`,
    functionName: "allowance",
    args: [
      ((activeAddress ||
        "0x0000000000000000000000000000000000000000") as `0x${string}`),
      ((erc20Spender ||
        "0x0000000000000000000000000000000000000000") as `0x${string}`),
    ],
    query: {
      enabled: Boolean(hasActiveWallet && hasErc20Payment),
    },
  });

  const allowance = useMemo(() => {
    try {
      return BigInt(allowanceRaw as any);
    } catch {
      return 0n;
    }
  }, [allowanceRaw]);

  const needSwitch = Boolean(
    hasActiveWallet &&
      (isEmbeddedWallet
        ? embeddedChainId !== null && embeddedChainId !== chainId
        : isConnected && currentChainId !== chainId)
  );
  const needsApproval = Boolean(hasErc20Payment && allowance < requiredErc20Amount);

  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingCountry, setShippingCountry] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingZip, setShippingZip] = useState("");

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
      if (bigintIdx.has(idx)) return BigInt(String(arg));
      return arg;
    });
  }

  function validateShipping() {
    if (!requiresShipping) return null;

    if (!shippingName.trim()) return "Shipping name is required";
    if (!shippingPhone.trim()) return "Shipping phone is required";
    if (!shippingCountry.trim()) return "Shipping country is required";
    if (!shippingCity.trim()) return "Shipping city is required";
    if (!shippingAddress.trim()) return "Shipping address is required";

    return null;
  }

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

  async function postOrderCreate(url: string, hash: string) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chainId,
        contract: nftAddr,
        tokenId,
        amount: "1",
        buyTxHash: hash,

        vertical,
        sourceType: "STORE",
        orderKind: "PRIMARY",

        shippingName,
        shippingPhone,
        shippingCountry,
        shippingCity,
        shippingAddress,
        shippingZip,
      }),
    });

    const j = await r.json().catch(() => null);
    return { r, j };
  }

  async function createOrderAfterBuy(hash: string) {
    if (!requiresShipping) return;

    let primary = await postOrderCreate(DELIVERY_CREATE_ENDPOINT, hash);
    if (primary.r.ok && primary.j?.ok) return;

    if (primary.r.status === 404) {
      const legacy = await postOrderCreate(LEGACY_STORE_CREATE_ENDPOINT, hash);
      if (legacy.r.ok && legacy.j?.ok) return;

      throw new Error(legacy.j?.error || "ORDER_CREATE_FAILED");
    }

    throw new Error(primary.j?.error || "ORDER_CREATE_FAILED");
  }

  async function approveToken() {
    if (!activeAddress) return openConnectModal?.();
    if (!hasErc20Payment || !erc20Payment) return;

    setErr(null);
    setOk(null);
    setBusy("approve");

    try {
      await ensureChain();

      const approveAmount = erc20Payment.approveUnlimited
        ? MAX_UINT256
        : requiredErc20Amount;

      const hash = isEmbeddedWallet
        ? await sendEmbeddedTransaction(embeddedProvider as Eip1193Provider, {
            from: activeAddress,
            to: erc20Token as `0x${string}`,
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: "approve",
              args: [erc20Spender as `0x${string}`, approveAmount],
            }),
          })
        : await writeContractAsync({
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
    if (!activeAddress) return openConnectModal?.();
    if (!buyConfig) return;
    if (!active || isSoldOut) return;

    const shippingError = validateShipping();
    if (shippingError) {
      setErr(shippingError);
      setOk(null);
      return;
    }

    setErr(null);
    setOk(null);
    setBusy("buy");

    try {
      await ensureChain();

      const cfg = buyConfig;
      const args = normalizeBuyArgs(cfg);
      const value = cfg.valueWei ? BigInt(cfg.valueWei) : undefined;

      const hash = isEmbeddedWallet
        ? await sendEmbeddedTransaction(embeddedProvider as Eip1193Provider, {
            from: activeAddress,
            to: storefrontContract as `0x${string}`,
            data: encodeFunctionData({
              abi: cfg.abi as any,
              functionName: cfg.functionName as any,
              args: args as any,
            }),
            ...(value !== undefined ? { value: toHexQuantity(value) } : {}),
          })
        : await writeContractAsync({
            abi: cfg.abi as any,
            address: storefrontContract as `0x${string}`,
            functionName: cfg.functionName as any,
            args: args as any,
            ...(value !== undefined ? { value } : {}),
          });

      await publicClient?.waitForTransactionReceipt({ hash });

      let orderWarning: string | null = null;

      if (requiresShipping) {
        try {
          await createOrderAfterBuy(hash);
        } catch (e: any) {
          orderWarning = e?.message || "ORDER_CREATE_FAILED";
        }
      }

      await revalidateAfterBuy();
      router.refresh();

      setOk(
        requiresShipping
          ? "Purchase completed ✅ Delivery order saved."
          : successMessage
      );

      if (orderWarning) {
        setErr(`On-chain purchase succeeded, but delivery order save failed: ${orderWarning}`);
      }
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Buy failed");
    } finally {
      setBusy(null);
    }
  }

  const wrap =
    "rounded-[22px] p-px overflow-hidden bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))] shadow-[0_34px_130px_rgba(0,0,0,0.60)]";
  const card =
    "rounded-[22px] overflow-hidden border border-white/10 bg-[#0b0a09]/30 backdrop-blur-2xl ring-1 ring-black/10";

  return (
    <div className={wrap}>
      <div className={card}>
        <div className="p-3 md:p-5">
          <div className="flex items-center justify-between gap-2.5">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 font-black">
                {storefrontLabel}
              </div>
              <div className="mt-2 text-lg md:text-xl font-black text-white/90">
                {title}
              </div>
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

          <div className="mt-3 flex flex-wrap gap-2">
            {isDeliveryCheckout && deliveryEnabled ? (
              <span className="px-3 py-1 rounded-full border border-sky-400/20 bg-sky-400/10 text-[11px] font-black text-sky-200">
                DELIVERY
              </span>
            ) : null}

            {isDeliveryCheckout && physicalItemIncluded ? (
              <span className="px-3 py-1 rounded-full border border-violet-400/20 bg-violet-400/10 text-[11px] font-black text-violet-200">
                PHYSICAL ITEM
              </span>
            ) : null}

            {officialItem ? (
              <span className="px-3 py-1 rounded-full border border-amber-400/20 bg-amber-400/10 text-[11px] font-black text-amber-100">
                OFFICIAL
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-3">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                Price
              </div>
              <div className="mt-1 text-[13px] font-extrabold text-amber-100 truncate">
                {priceLabel}
              </div>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-3">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                Payment
              </div>
              <div className="mt-1 text-[13px] font-extrabold text-white/85 truncate">
                {paymentTokenLabel}
              </div>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-3">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                Remaining
              </div>
              <div className="mt-1 text-[13px] font-extrabold text-white/85 truncate">
                {fmtRawInt(remaining)}
              </div>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-3">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                Supply
              </div>
              <div className="mt-1 text-[13px] font-extrabold text-white/85 truncate">
                {fmtRawInt(totalSupply)} / {fmtRawInt(maxSupply)}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[18px] border border-white/10 bg-white/[0.04] p-3 text-[12px] text-white/60">
            NFT: <span className="font-mono text-white/80">{shortAddr(nftAddr)}</span>
            <span className="text-white/30"> • </span>
            Token: <span className="font-mono text-white/80">#{tokenId}</span>
            {hasBuyConfig ? (
              <>
                <span className="text-white/30"> • </span>
                Storefront:{" "}
                <span className="font-mono text-white/80">
                  {shortAddr(storefrontContract)}
                </span>
              </>
            ) : null}
            {primarySellerWallet ? (
              <>
                <span className="text-white/30"> • </span>
                Seller:{" "}
                <span className="font-mono text-white/80">
                  {shortAddr(primarySellerWallet)}
                </span>
              </>
            ) : null}
            <span className="text-white/30"> • </span>
            Vertical: <span className="font-black text-white/80">{vertical}</span>
          </div>

          {requiresShipping ? (
            <div className="mt-4 rounded-[18px] border border-sky-500/20 bg-sky-500/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[12px] font-black text-sky-100">
                    Delivery checkout
                  </div>
                  <div className="mt-1 text-[12px] text-sky-50/80">
                    This product requires shipping info. After successful on-chain buy,
                    a delivery order will be created in the unified delivery layer.
                  </div>
                </div>

                <Link
                  href="/app/orders"
                  className="inline-flex items-center justify-center px-3.5 py-2 rounded-[18px] border border-sky-200/20 bg-white/10 hover:bg-white/15 text-[12px] font-black text-sky-50 transition"
                >
                  Open Orders
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <input
                  value={shippingName}
                  onChange={(e) => setShippingName(e.target.value)}
                  placeholder="Full name"
                  className="h-11 rounded-[18px] border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
                />

                <input
                  value={shippingPhone}
                  onChange={(e) => setShippingPhone(e.target.value)}
                  placeholder="Phone"
                  className="h-11 rounded-[18px] border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
                />

                <input
                  value={shippingCountry}
                  onChange={(e) => setShippingCountry(e.target.value)}
                  placeholder="Country"
                  className="h-11 rounded-[18px] border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
                />

                <input
                  value={shippingCity}
                  onChange={(e) => setShippingCity(e.target.value)}
                  placeholder="City"
                  className="h-11 rounded-[18px] border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white/95 outline-none focus:border-white/20"
                />

                <input
                  value={shippingZip}
                  onChange={(e) => setShippingZip(e.target.value)}
                  placeholder="ZIP / Postal code"
                  className="h-11 rounded-[18px] border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white/95 outline-none focus:border-white/20 md:col-span-2"
                />

                <textarea
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Full shipping address"
                  className="min-h-[84px] rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white/95 outline-none focus:border-white/20 md:col-span-2"
                />
              </div>
            </div>
          ) : null}

          {err ? (
            <div className="mt-4 rounded-[18px] border border-rose-500/20 bg-rose-500/10 p-3 text-[12px] text-rose-100">
              {err}
            </div>
          ) : null}

          {ok ? (
            <div className="mt-4 rounded-[18px] border border-emerald-500/20 bg-emerald-500/10 p-3 text-[12px] text-emerald-100">
              {ok}
            </div>
          ) : null}

          {!hasBuyConfig ? (
            <div className="mt-4 rounded-[18px] border border-amber-500/20 bg-amber-500/10 p-3 text-[12px] text-amber-100">
              Buy config is not connected yet. The UI is ready, but exact buy contract call still needs to be passed into this component.
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!hasActiveWallet ? (
              <button
                onClick={() => openConnectModal?.()}
                className="inline-flex items-center justify-center px-3.5 py-2.5 rounded-[18px] text-black font-extrabold hover:brightness-110 transition shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
              >
                Connect Wallet
              </button>
            ) : null}

            {needSwitch ? (
              <button
                onClick={() => void ensureChain()}
                className="inline-flex items-center justify-center px-3.5 py-2.5 rounded-[18px] border border-white/15 bg-white/[0.06] hover:bg-white/10 font-extrabold transition"
              >
                Switch Chain ({chainId})
              </button>
            ) : null}

            {hasActiveWallet ? (
              <div className="text-[12px] text-white/55 font-semibold">
                Wallet: <span className="font-mono text-white/80">{shortAddr(me)}</span>
              </div>
            ) : null}
          </div>

          {hasErc20Payment ? (
            <div className="mt-4 rounded-[18px] border border-white/10 bg-white/[0.04] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
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
                    disabled={busy !== null || !hasActiveWallet || needSwitch}
                    onClick={approveToken}
                    className={cx(
                      "inline-flex items-center justify-center px-3.5 py-2.5 rounded-[18px] border border-white/15 bg-white/[0.06] hover:bg-white/10 font-extrabold transition",
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

          <div className="mt-4 flex flex-col md:flex-row md:items-center gap-2">
            <button
              disabled={
                busy !== null ||
                !hasActiveWallet ||
                needSwitch ||
                !canBuy ||
                (hasErc20Payment ? needsApproval : false)
              }
              onClick={buyNow}
              className={cx(
                "inline-flex items-center justify-center w-full md:w-auto px-4.5 py-2.5 rounded-[18px] text-black font-extrabold transition",
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
                ? requiresShipping
                  ? "Ready to buy and create delivery order."
                  : "Ready to buy."
                : "Connect buy config first."}
            </div>
          </div>

          <div className="mt-4 text-[11px] text-white/35">
            This block is for primary storefront sales. Secondary market buy/sell stays in TradingPanel1155.
          </div>
        </div>
      </div>
    </div>
  );
}