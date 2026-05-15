// PATH: components/trading/QuickList1155.tsx — quick listing modal for ERC-1155 owned NFTs
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import {
  useAccount,
  useChainId,
  useSwitchChain,
  usePublicClient,
  useWriteContract,
  useReadContract,
} from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { encodeFunctionData, parseUnits, formatUnits, toHex } from "viem";
import { useWeb3Auth } from "@web3auth/modal/react";

import { erc1155CoreAbi } from "@/lib/erc1155CoreAbi";
import { realifeProtected1155Abi } from "@/lib/realifeProtected1155Abi";
import { marketplaceSpot1155Abi } from "@/lib/realifeMarketplaceSpot1155Abi";
import { realifeMarketplaceProtectedEscrow1155USDCAbi } from "@/lib/realifeMarketplaceProtectedEscrow1155USDCAbi";
import { REALIFE_PROTECTED_PAYMENT_USDC } from "@/lib/realifeProtectedUsdc";
import TxProgress, { type TxState } from "./TxProgress";

type MarketType = "STANDARD" | "PROTECTED";

type FulfillmentType =
  | "PHYSICAL_GOOD"
  | "DIGITAL_SERVICE"
  | "ONLINE_SESSION"
  | "LOCAL_SERVICE";

type ContractView =
  | "publicStandard"
  | "publicProtected"
  | "publicDelivery"
  | "cafe"
  | "store"
  | "unknown";

type QuickListListedPayload = {
  listedAmount: string;
  remainingOwnedAmount: string | null;
  marketType: MarketType;
};

type UiToastTone = "default" | "success" | "warning" | "error";

type UiToast = {
  id: string;
  title: string;
  text?: string;
  tone?: UiToastTone;
};


type Eip1193Provider = {
  request: (args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }) => Promise<unknown>;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

function normalizeEvmAddress(v: unknown): `0x${string}` | undefined {
  const s = String(v || "").trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(s) ? (s as `0x${string}`) : undefined;
}

function normalizeTxHash(v: unknown): `0x${string}` | undefined {
  const s = String(v || "").trim().toLowerCase();
  return /^0x[a-f0-9]{64}$/.test(s) ? (s as `0x${string}`) : undefined;
}

function parseRpcChainId(v: unknown): number | undefined {
  const s = String(v || "").trim();
  if (!s) return undefined;
  const n = s.startsWith("0x") ? Number.parseInt(s, 16) : Number(s);
  return Number.isFinite(n) ? n : undefined;
}

async function readProviderChainId(provider: Eip1193Provider | null) {
  if (!provider) return undefined;
  const raw = await provider.request({ method: "eth_chainId" }).catch(() => null);
  return parseRpcChainId(raw);
}

function chainAddParams(chainId: number) {
  if (chainId === 84532) {
    return {
      chainId: toHex(chainId),
      chainName: "Base Sepolia",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://sepolia.base.org"],
      blockExplorerUrls: ["https://sepolia.basescan.org"],
    };
  }

  return null;
}

async function ensureEmbeddedChain(provider: Eip1193Provider | null, chainId: number) {
  if (!provider) {
    throw new Error(
      "Embedded wallet provider is not ready. Please click Continue with Google again."
    );
  }

  const currentChainId = await readProviderChainId(provider);
  if (currentChainId === chainId) return;

  const chainIdHex = toHex(chainId);

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (switchError: any) {
    const code = switchError?.code ?? switchError?.data?.originalError?.code;
    const addParams = chainAddParams(chainId);

    if (code !== 4902 || !addParams) throw switchError;

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [addParams],
    });

    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  }
}


function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function toLower(a?: string | null) {
  return String(a || "").trim().toLowerCase();
}

function normText(a?: string | null) {
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

function formatRawAmount(raw?: bigint | null, decimals = 18) {
  try {
    if (raw == null) return "—";
    const s = formatUnits(raw, decimals);
    const [a, b] = s.split(".");
    if (!b) return a;
    const bb = b.slice(0, decimals === 6 ? 2 : 6).replace(/0+$/, "");
    return bb ? `${a}.${bb}` : a;
  } catch {
    return "—";
  }
}

function paymentDecimalsForMarket(marketType: MarketType) {
  return marketType === "PROTECTED" ? REALIFE_PROTECTED_PAYMENT_USDC.decimals : 18;
}

function paymentSymbolForMarket(marketType: MarketType) {
  return marketType === "PROTECTED" ? REALIFE_PROTECTED_PAYMENT_USDC.symbol : "ETH";
}

function fmtPriceRaw(raw?: bigint | null, marketType: MarketType = "STANDARD") {
  return formatRawAmount(raw, paymentDecimalsForMarket(marketType));
}

function parsePriceRawSafe(v: string, marketType: MarketType) {
  try {
    const x = parseUnits(String(v || "0"), paymentDecimalsForMarket(marketType));
    return x > 0n ? x : null;
  } catch {
    return null;
  }
}

function marketLabel(mt: MarketType) {
  return mt === "PROTECTED" ? "PROTECTED" : "STANDARD";
}

const CAFE_CONTRACT = String(
  process.env.NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT || ""
)
  .trim()
  .toLowerCase();

const STORE_CONTRACT = String(
  process.env.NEXT_PUBLIC_REALIFE_STORE_CONTRACT || ""
)
  .trim()
  .toLowerCase();

const PUBLIC_STANDARD_CONTRACT = String(
  process.env.NEXT_PUBLIC_REALIFE_1155_NEW_CONTRACT || ""
)
  .trim()
  .toLowerCase();

const PUBLIC_DELIVERY_CONTRACT = String(
  process.env.NEXT_PUBLIC_REALIFE_1155_DELIVERY_CONTRACT || ""
)
  .trim()
  .toLowerCase();

const PUBLIC_PROTECTED_CONTRACT = String(
  process.env.NEXT_PUBLIC_REALIFE_PROTECTED_1155_ADDRESS ||
    process.env.REALIFE_PROTECTED_1155_ADDRESS ||
    ""
)
  .trim()
  .toLowerCase();

function classifyContractView(contract: string): ContractView {
  const x = toLower(contract);

  if (CAFE_CONTRACT && x === CAFE_CONTRACT) return "cafe";
  if (STORE_CONTRACT && x === STORE_CONTRACT) return "store";
  if (PUBLIC_STANDARD_CONTRACT && x === PUBLIC_STANDARD_CONTRACT) {
    return "publicStandard";
  }
  if (PUBLIC_PROTECTED_CONTRACT && x === PUBLIC_PROTECTED_CONTRACT) {
    return "publicProtected";
  }
  if (PUBLIC_DELIVERY_CONTRACT && x === PUBLIC_DELIVERY_CONTRACT) {
    return "publicDelivery";
  }

  return "unknown";
}

function textLooksProtected(...values: Array<string | null | undefined>) {
  const s = values.map(normText).filter(Boolean).join(" ");

  if (!s) return false;

  const needles = [
    "service",
    "services",
    "digital service",
    "online session",
    "local service",
    "consultation",
    "consulting",
    "lesson",
    "lessons",
    "training",
    "coaching",
    "mentoring",
    "tutoring",
    "website",
    "website development",
    "website design",
    "web design",
    "web development",
    "landing page",
    "development",
    "design",
    "graphic design",
    "logo design",
    "ui ux",
    "seo",
    "smm",
    "marketing work",
    "promo work",
    "ai work",
    "audit",
    "call",
    "meeting",
    "session",
  ];

  return needles.some((x) => s.includes(x));
}

function isProtectedFulfillment(v?: FulfillmentType | string | null) {
  const x = String(v || "").trim().toUpperCase();
  return (
    x === "PHYSICAL_GOOD" ||
    x === "DIGITAL_SERVICE" ||
    x === "ONLINE_SESSION" ||
    x === "LOCAL_SERVICE"
  );
}

function inferProtectedAsset(params: {
  contractView: ContractView;
  deliveryEnabled?: boolean;
  physicalItemIncluded?: boolean;
  fulfillmentType?: FulfillmentType | string | null;
  category?: string | null;
  subcategory?: string | null;
  serviceCountry?: string | null;
  serviceCity?: string | null;
  serviceArea?: string | null;
}) {
  const {
    contractView,
    deliveryEnabled,
    physicalItemIncluded,
    fulfillmentType,
    category,
    subcategory,
  } = params;

  if (contractView === "store" || contractView === "cafe") return false;
  if (contractView === "publicProtected") return true;
  if (contractView === "publicDelivery") return true;

  if (isProtectedFulfillment(fulfillmentType)) return true;
  if (deliveryEnabled || physicalItemIncluded) return true;
  if (textLooksProtected(category, subcategory)) return true;

  return false;
}

function resolveAssetMarketType(params: {
  contractView: ContractView;
  assetIsProtected: boolean;
  preferredMarketType?: MarketType;
  marketTypeHint?: MarketType;
}): MarketType {
  const { contractView, assetIsProtected, preferredMarketType, marketTypeHint } =
    params;

  if (contractView === "store" || contractView === "cafe") return "STANDARD";
  if (contractView === "publicProtected") return "PROTECTED";
  if (contractView === "publicDelivery") return "PROTECTED";
  if (assetIsProtected) return "PROTECTED";

  if (preferredMarketType === "PROTECTED" || marketTypeHint === "PROTECTED") {
    return "PROTECTED";
  }

  if (preferredMarketType === "STANDARD" || marketTypeHint === "STANDARD") {
    return "STANDARD";
  }

  return "STANDARD";
}

function resolveProtectedFulfillmentType(params: {
  contractView: ContractView;
  deliveryEnabled?: boolean;
  physicalItemIncluded?: boolean;
  fulfillmentType?: FulfillmentType | string | null;
  category?: string | null;
  subcategory?: string | null;
}): FulfillmentType {
  const {
    contractView,
    deliveryEnabled,
    physicalItemIncluded,
    fulfillmentType,
    category,
    subcategory,
  } = params;

  if (isProtectedFulfillment(fulfillmentType)) {
    return String(fulfillmentType).trim().toUpperCase() as FulfillmentType;
  }

  if (contractView === "publicDelivery") return "PHYSICAL_GOOD";
  if (deliveryEnabled || physicalItemIncluded) return "PHYSICAL_GOOD";

  if (textLooksProtected(category, subcategory)) {
    if (
      normText(category).includes("session") ||
      normText(subcategory).includes("session")
    ) {
      return "ONLINE_SESSION";
    }

    if (
      normText(category).includes("local service") ||
      normText(subcategory).includes("local service")
    ) {
      return "LOCAL_SERVICE";
    }

    return "DIGITAL_SERVICE";
  }

  return "DIGITAL_SERVICE";
}

function fulfillmentTypeToUint8(v: FulfillmentType): number {
  if (v === "PHYSICAL_GOOD") return 0;
  if (v === "DIGITAL_SERVICE") return 1;
  if (v === "ONLINE_SESSION") return 2;
  if (v === "LOCAL_SERVICE") return 3;
  return 1;
}

function fulfillmentTypeLabel(v?: FulfillmentType | null) {
  if (!v) return "DIGITAL SERVICE";
  return String(v).replaceAll("_", " ");
}



function cleanLocationValue(v?: string | null) {
  const s = String(v || "").trim();
  return s ? s : null;
}

function formatServiceLocation(input: {
  serviceCountry?: string | null;
  serviceCity?: string | null;
  serviceArea?: string | null;
}) {
  const country = cleanLocationValue(input.serviceCountry);
  const city = cleanLocationValue(input.serviceCity);
  const area = cleanLocationValue(input.serviceArea);
  const main = [city, country].filter(Boolean).join(", ");
  if (main && area) return main + " • " + area;
  return main || area || null;
}

function ToastCard({ toast }: { toast: UiToast }) {
  const toneClass =
    toast.tone === "success"
      ? "border-emerald-500/20 bg-emerald-500/12 text-emerald-100"
      : toast.tone === "warning"
      ? "border-amber-500/20 bg-amber-500/12 text-amber-100"
      : toast.tone === "error"
      ? "border-rose-500/20 bg-rose-500/12 text-rose-100"
      : "border-white/12 bg-black/55 text-white/88";

  return (
    <div
      className={cx(
        "pointer-events-auto min-w-[240px] max-w-[320px] overflow-hidden rounded-[22px] border px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl",
        toneClass
      )}
    >
      <div className="text-[11px] font-black uppercase tracking-[0.18em]">{toast.title}</div>
      {toast.text ? (
        <div className="mt-1 text-[12px] leading-relaxed text-current/80">{toast.text}</div>
      ) : null}
    </div>
  );
}

export default function QuickList1155({
  chainId,
  contract,
  tokenId,
  maxAmountHint,
  name,
  deliveryEnabled,
  physicalItemIncluded,
  fulfillmentType,
  category,
  subcategory,
  serviceCountry,
  serviceCity,
  serviceArea,
  marketTypeHint,
  preferredMarketType,
  onListed,
}: {
  chainId: number;
  contract: string;
  tokenId: string;
  maxAmountHint?: string;
  name?: string | null;
  deliveryEnabled?: boolean;
  physicalItemIncluded?: boolean;
  fulfillmentType?: FulfillmentType | null;
  category?: string | null;
  subcategory?: string | null;
  serviceCountry?: string | null;
  serviceCity?: string | null;
  serviceArea?: string | null;
  marketTypeHint?: MarketType;

  preferredMarketType?: MarketType;
  onListed?: (payload: QuickListListedPayload) => void;
}) {
  const { data: session } = useSession();
  const { provider: web3AuthProviderRaw } = useWeb3Auth();
  const embeddedProvider = (web3AuthProviderRaw as Eip1193Provider | null) || null;

  const { address, isConnected } = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  const { openConnectModal } = useConnectModal();
  const { writeContractAsync } = useWriteContract();

  const [embeddedChainId, setEmbeddedChainId] = useState<number | undefined>(undefined);

  const sessionUser = (session as any)?.user || null;
  const sessionWalletKind = String(sessionUser?.walletKind || "").toUpperCase();
  const embeddedWalletAddress = normalizeEvmAddress(sessionUser?.walletAddress);
  const externalWalletAddress = normalizeEvmAddress(address);
  const activeAddress = externalWalletAddress || embeddedWalletAddress;
  const activeWalletKind: "EXTERNAL" | "EMBEDDED" | null = externalWalletAddress
    ? "EXTERNAL"
    : embeddedWalletAddress && sessionWalletKind === "EMBEDDED"
    ? "EMBEDDED"
    : null;
  const walletReady = Boolean(isConnected || embeddedWalletAddress);
  const effectiveChainId =
    activeWalletKind === "EMBEDDED" ? embeddedChainId : currentChainId;

  const STANDARD_MARKETPLACE_ADDRESS = useMemo(() => {
    return toLower(
      process.env.NEXT_PUBLIC_REALIFE_MARKETPLACE_STANDARD_ADDRESS ||
        process.env.NEXT_PUBLIC_REALIFE_MARKETPLACE_ADDRESS ||
        process.env.NEXT_PUBLIC_MARKETPLACE_STANDARD_ADDRESS ||
        process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS ||
        ""
    );
  }, []);

  const PROTECTED_MARKETPLACE_ADDRESS = useMemo(() => {
    return toLower(
      process.env.NEXT_PUBLIC_REALIFE_PROTECTED_MARKETPLACE_USDC_CONTRACT ||
        REALIFE_PROTECTED_PAYMENT_USDC.marketplaceAddress ||
        ""
    );
  }, []);

  const nftAddr = useMemo(() => toLower(contract), [contract]);
  const needSwitch = walletReady && effectiveChainId !== chainId;
  const contractView = useMemo(() => classifyContractView(nftAddr), [nftAddr]);
  const isProtectedMintContract = contractView === "publicProtected";

  const tokenIdBI = useMemo(() => {
    try {
      return BigInt(tokenId);
    } catch {
      return 0n;
    }
  }, [tokenId]);

  const hintMax = useMemo(() => toBigIntSafe(maxAmountHint), [maxAmountHint]);

  const assetIsProtected = useMemo(() => {
    return inferProtectedAsset({
      contractView,
      deliveryEnabled,
      physicalItemIncluded,
      fulfillmentType,
      category,
      subcategory,
    });
  }, [
    contractView,
    deliveryEnabled,
    physicalItemIncluded,
    fulfillmentType,
    category,
    subcategory,
  ]);

  const inferredMarketType: MarketType = useMemo(() => {
    return resolveAssetMarketType({
      contractView,
      assetIsProtected,
      preferredMarketType,
      marketTypeHint,
    });
  }, [contractView, assetIsProtected, preferredMarketType, marketTypeHint]);

  const protectedFulfillmentType = useMemo(() => {
    return resolveProtectedFulfillmentType({
      contractView,
      deliveryEnabled,
      physicalItemIncluded,
      fulfillmentType,
      category,
      subcategory,
    });
  }, [
    contractView,
    deliveryEnabled,
    physicalItemIncluded,
    fulfillmentType,
    category,
    subcategory,
  ]);

  const protectedFulfillmentTypeUint8 = useMemo(() => {
    return fulfillmentTypeToUint8(protectedFulfillmentType);
  }, [protectedFulfillmentType]);

  const serviceLocationLabel = useMemo(() => {
    return formatServiceLocation({ serviceCountry, serviceCity, serviceArea });
  }, [serviceCountry, serviceCity, serviceArea]);

  const showServiceLocation =
    protectedFulfillmentType === "LOCAL_SERVICE" && Boolean(serviceLocationLabel);

  const marketplaceAddress = useMemo(() => {
    return inferredMarketType === "PROTECTED"
      ? PROTECTED_MARKETPLACE_ADDRESS
      : STANDARD_MARKETPLACE_ADDRESS;
  }, [
    inferredMarketType,
    PROTECTED_MARKETPLACE_ADDRESS,
    STANDARD_MARKETPLACE_ADDRESS,
  ]);

  const marketplaceAbi = useMemo(() => {
    return inferredMarketType === "PROTECTED"
      ? realifeMarketplaceProtectedEscrow1155USDCAbi
      : marketplaceSpot1155Abi;
  }, [inferredMarketType]);

  const hasMarketplace = marketplaceAddress.startsWith("0x");

  const { data: balanceRaw, refetch: refetchBalance } = useReadContract({
    abi: erc1155CoreAbi,
    address: (
      nftAddr || "0x0000000000000000000000000000000000000000"
    ) as `0x${string}`,
    functionName: "balanceOf",
    args: [
      (
        (activeAddress || ZERO_ADDRESS) as `0x${string}`
      ),
      tokenIdBI,
    ],
    query: { enabled: Boolean(activeAddress && nftAddr.startsWith("0x")) },
  });

  const { data: transferableRaw, refetch: refetchTransferable } = useReadContract({
    abi: realifeProtected1155Abi,
    address: (
      nftAddr || "0x0000000000000000000000000000000000000000"
    ) as `0x${string}`,
    functionName: "transferableBalance",
    args: [
      (
        (activeAddress || ZERO_ADDRESS) as `0x${string}`
      ),
      tokenIdBI,
    ],
    query: {
      enabled: Boolean(
        activeAddress && isProtectedMintContract && nftAddr.startsWith("0x")
      ),
    },
  });

  const balance = useMemo(() => {
    try {
      return BigInt(balanceRaw as any);
    } catch {
      return 0n;
    }
  }, [balanceRaw]);

  const transferableBalance = useMemo(() => {
    try {
      return BigInt(transferableRaw as any);
    } catch {
      return 0n;
    }
  }, [transferableRaw]);

  const maxAmountBI = isProtectedMintContract
    ? transferableBalance
    : balance > 0n
    ? balance
    : hintMax;

  const maxAmount = useMemo(() => {
    if (maxAmountBI <= 0n) return 1;
    if (maxAmountBI > 999999n) return 999999;
    return Number(maxAmountBI);
  }, [maxAmountBI]);

  const { data: approvedRaw, refetch: refetchApproved } = useReadContract({
    abi: erc1155CoreAbi,
    address: (
      nftAddr || "0x0000000000000000000000000000000000000000"
    ) as `0x${string}`,
    functionName: "isApprovedForAll",
    args: [
      (
        (activeAddress || ZERO_ADDRESS) as `0x${string}`
      ),
      (
        (marketplaceAddress ||
          "0x0000000000000000000000000000000000000000") as `0x${string}`
      ),
    ],
    query: {
      enabled: Boolean(activeAddress && hasMarketplace && nftAddr.startsWith("0x")),
    },
  });

  const isApproved = Boolean(approvedRaw);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState(1);
  const [priceEth, setPriceEth] = useState("0.01");
  const [busy, setBusy] = useState<"approve" | "list" | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [toasts, setToasts] = useState<UiToast[]>([]);

  /**
   * Inline tx progress state. Drives <TxProgress /> in the modal body.
   * Independent from `busy` so that "done" / "error" states stay visible
   * for a moment after the action completes.
   */
  const [txState, setTxState] = useState<TxState | null>(null);
  const txAutoDismissRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const updateTx = useCallback(
    (next: TxState | null, opts?: { autoDismissMs?: number }) => {
      if (txAutoDismissRef.current) {
        window.clearTimeout(txAutoDismissRef.current);
        txAutoDismissRef.current = null;
      }

      setTxState(next);

      if (next && opts?.autoDismissMs && opts.autoDismissMs > 0) {
        txAutoDismissRef.current = window.setTimeout(() => {
          setTxState((cur) => (cur === next ? null : cur));
          txAutoDismissRef.current = null;
        }, opts.autoDismissMs);
      }
    },
    []
  );

  const dismissTx = useCallback(() => {
    if (txAutoDismissRef.current) {
      window.clearTimeout(txAutoDismissRef.current);
      txAutoDismissRef.current = null;
    }
    setTxState(null);
  }, []);

  useEffect(() => {
    return () => {
      if (txAutoDismissRef.current) {
        window.clearTimeout(txAutoDismissRef.current);
      }
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const priceWei = useMemo(() => parsePriceRawSafe(priceEth, inferredMarketType), [priceEth, inferredMarketType]);

  const totalPriceWei = useMemo(() => {
    try {
      if (!priceWei) return null;
      return priceWei * BigInt(amount || 1);
    } catch {
      return null;
    }
  }, [priceWei, amount]);

  useEffect(() => {
    setAmount((prev) => clampInt(prev, 1, Math.max(1, maxAmount)));
  }, [maxAmount]);

  const pushToast = useCallback(
    (title: string, text?: string, tone: UiToastTone = "default") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, title, text, tone }]);
      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((x) => x.id !== id));
        }, 3600);
      }
    },
    []
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  function closeModal() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (txAutoDismissRef.current) {
      window.clearTimeout(txAutoDismissRef.current);
      txAutoDismissRef.current = null;
    }
    setOpen(false);
    setErr(null);
    setOk(null);
    setBusy(null);
    setTxState(null);
  }

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    let cancelled = false;

    async function syncEmbeddedChain() {
      if (activeWalletKind !== "EMBEDDED" || !embeddedProvider) {
        setEmbeddedChainId(undefined);
        return;
      }

      const nextChainId = await readProviderChainId(embeddedProvider);
      if (!cancelled) setEmbeddedChainId(nextChainId);
    }

    void syncEmbeddedChain();

    return () => {
      cancelled = true;
    };
  }, [activeWalletKind, embeddedProvider]);

  async function ensureChain() {
    if (!walletReady || !activeAddress) {
      openConnectModal?.();
      throw new Error("Connect wallet first.");
    }

    if (activeWalletKind === "EMBEDDED") {
      await ensureEmbeddedChain(embeddedProvider, chainId);
      const nextChainId = await readProviderChainId(embeddedProvider);
      setEmbeddedChainId(nextChainId);
      return;
    }

    if (currentChainId !== chainId) {
      await switchChainAsync?.({ chainId });
    }
  }

  async function sendActiveContractTransaction(params: {
    abi: any;
    address: `0x${string}`;
    functionName: string;
    args?: any[];
    value?: bigint;
  }) {
    if (activeWalletKind === "EMBEDDED") {
      if (!embeddedProvider || !activeAddress) {
        throw new Error(
          "Embedded wallet provider is not ready. Please click Continue with Google again."
        );
      }

      const data = encodeFunctionData({
        abi: params.abi,
        functionName: params.functionName as any,
        args: (params.args || []) as any,
      });

      const tx: Record<string, string> = {
        from: activeAddress,
        to: params.address,
        data,
      };

      if (params.value && params.value > 0n) tx.value = toHex(params.value);

      const rawHash = await embeddedProvider.request({
        method: "eth_sendTransaction",
        params: [tx],
      });

      const hash = normalizeTxHash(rawHash);
      if (!hash) throw new Error("Embedded wallet did not return transaction hash.");
      return hash;
    }

    return writeContractAsync({
      abi: params.abi,
      address: params.address,
      functionName: params.functionName as any,
      args: (params.args || []) as any,
      value: params.value,
    } as any);
  }

  async function revalidateAfterList() {
    const tags = [
      `market:nft:${chainId}:${nftAddr}:${tokenId}`,
      `market:contract:${chainId}:${nftAddr}`,
      `market:nft:${chainId}:${nftAddr}:${tokenId}:STANDARD`,
      `market:nft:${chainId}:${nftAddr}:${tokenId}:PROTECTED`,
      `market:contract:${chainId}:${nftAddr}:STANDARD`,
      `market:contract:${chainId}:${nftAddr}:PROTECTED`,
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

  const triggerAiVisualEnrich = useCallback(async () => {
    if (!nftAddr.startsWith("0x")) return;
    if (!tokenId) return;

    try {
      await fetch("/api/ai/nft-enrich", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        keepalive: true,
        body: JSON.stringify({
          chainId,
          contract: nftAddr,
          tokenId: String(tokenId),
          force: false,
        }),
      });
    } catch (e) {
      console.warn("[Realife] AI visual enrichment trigger failed", e);
    }
  }, [chainId, nftAddr, tokenId]);

  async function approveAll() {
    if (!walletReady) return openConnectModal?.();
    if (!hasMarketplace) return;

    setErr(null);
    setOk(null);
    setBusy("approve");

    updateTx({
      kind: "approve",
      phase: "preparing",
      label: `Preparing approval for ${marketLabel(inferredMarketType)} marketplace…`,
    });

    try {
      await ensureChain();

      updateTx({
        kind: "approve",
        phase: "awaiting-sig",
        label: "Open your wallet and confirm the approval transaction.",
      });

      const hash = await sendActiveContractTransaction({
        abi: erc1155CoreAbi,
        address: nftAddr as `0x${string}`,
        functionName: "setApprovalForAll",
        args: [marketplaceAddress as `0x${string}`, true],
      });

      updateTx({
        kind: "approve",
        phase: "confirming",
        label: "Approval submitted. Waiting for on-chain confirmation…",
        txHash: hash,
      });

      await publicClient?.waitForTransactionReceipt({ hash });

      updateTx({
        kind: "approve",
        phase: "syncing",
        label: "Confirmed. Refreshing approval state…",
        txHash: hash,
      });

      await refetchApproved();

      updateTx(
        {
          kind: "approve",
          phase: "done",
          label: `${marketLabel(inferredMarketType)} marketplace approved. You can now create the listing.`,
          txHash: hash,
        },
        { autoDismissMs: 3500 }
      );

      setOk(`${marketLabel(inferredMarketType)} approved ✅`);
    } catch (e: any) {
      const message = e?.shortMessage || e?.message || "Approve failed";
      setErr(message);
      updateTx(
        {
          kind: "approve",
          phase: "error",
          label: message,
          errorText: message,
        },
        { autoDismissMs: 6000 }
      );
    } finally {
      setBusy(null);
    }
  }

  const refreshWalletState = useCallback(async () => {
    setRefreshing(true);

    try {
      const [balanceRes, approvedRes, transferableRes] = await Promise.allSettled([
        refetchBalance(),
        refetchApproved(),
        isProtectedMintContract ? refetchTransferable() : Promise.resolve(null),
      ]);

      let remainingOwnedAmount: string | null = null;

      if (balanceRes.status === "fulfilled") {
        try {
          const value = (balanceRes.value as any)?.data;
          if (value !== undefined && value !== null) {
            remainingOwnedAmount = BigInt(value).toString();
          }
        } catch {
          remainingOwnedAmount = null;
        }
      }

      if (isProtectedMintContract && transferableRes.status === "fulfilled") {
        try {
          const value = (transferableRes.value as any)?.data;
          if (value !== undefined && value !== null) {
            remainingOwnedAmount = BigInt(value).toString();
          }
        } catch {
          //
        }
      }

      void approvedRes;
      if (remainingOwnedAmount !== null) {
        pushToast("Balance updated", `Owned amount is now ${remainingOwnedAmount}.`, "default");
      }
      return { remainingOwnedAmount };
    } finally {
      setRefreshing(false);
    }
  }, [isProtectedMintContract, refetchApproved, refetchBalance, refetchTransferable]);

  const schedulePostListRefreshes = useCallback(() => {
    if (typeof window === "undefined") return;

    for (const delay of [1600, 4200]) {
      window.setTimeout(() => {
        void Promise.allSettled([
          refetchBalance(),
          refetchApproved(),
          isProtectedMintContract ? refetchTransferable() : Promise.resolve(null),
        ]);
      }, delay);
    }
  }, [isProtectedMintContract, refetchApproved, refetchBalance, refetchTransferable]);

  async function listNow() {
    if (!walletReady) return openConnectModal?.();
    if (!hasMarketplace) return;

    if (maxAmountBI <= 0n) {
      const msg =
        inferredMarketType === "PROTECTED"
          ? "No transferable amount available. Pending or completed protected NFTs cannot be listed."
          : "No NFT balance available to list.";
      setErr(msg);
      updateTx(
        {
          kind: "list",
          phase: "error",
          label: msg,
          errorText: msg,
        },
        { autoDismissMs: 4500 }
      );
      return;
    }

    if (!priceWei) {
      setErr("Enter valid price");
      updateTx(
        {
          kind: "list",
          phase: "error",
          label: `Enter a valid ${paymentSymbolForMarket(inferredMarketType)} price greater than zero.`,
          errorText: `Enter a valid ${paymentSymbolForMarket(inferredMarketType)} price greater than zero.`,
        },
        { autoDismissMs: 4500 }
      );
      return;
    }

    setErr(null);
    setOk(null);
    setBusy("list");

    updateTx({
      kind: "list",
      phase: "preparing",
      label: `Preparing ${marketLabel(inferredMarketType).toLowerCase()} listing…`,
    });

    try {
      await ensureChain();

      const amt = BigInt(clampInt(amount, 1, Math.max(1, maxAmount)));

      const args =
        inferredMarketType === "PROTECTED"
          ? [
              nftAddr as `0x${string}`,
              tokenIdBI,
              amt,
              priceWei,
              protectedFulfillmentTypeUint8,
            ]
          : [nftAddr as `0x${string}`, tokenIdBI, amt, priceWei];

      updateTx({
        kind: "list",
        phase: "awaiting-sig",
        label:
          inferredMarketType === "PROTECTED"
            ? `Open wallet and sign the protected listing (${fulfillmentTypeLabel(
                protectedFulfillmentType
              )}).`
            : "Open wallet and sign the listing transaction.",
      });

      const hash = await sendActiveContractTransaction({
        abi: marketplaceAbi as any,
        address: marketplaceAddress as `0x${string}`,
        functionName: "list1155",
        args: args as any,
      });

      updateTx({
        kind: "list",
        phase: "confirming",
        label: "Listing submitted. Waiting for on-chain confirmation…",
        txHash: hash,
      });

      await publicClient?.waitForTransactionReceipt({ hash });

      void triggerAiVisualEnrich();

      updateTx({
        kind: "list",
        phase: "syncing",
        label: "Confirmed on-chain. Syncing market & wallet state…",
        txHash: hash,
      });

      await revalidateAfterList();
      const walletState = await refreshWalletState();
      schedulePostListRefreshes();

      onListed?.({
        listedAmount: amt.toString(),
        remainingOwnedAmount: walletState?.remainingOwnedAmount ?? null,
        marketType: inferredMarketType,
      });

      setOk(
        inferredMarketType === "PROTECTED"
          ? `Listed on ${marketLabel(inferredMarketType)} (${fulfillmentTypeLabel(
              protectedFulfillmentType
            )}) ✅`
          : `Listed on ${marketLabel(inferredMarketType)} ✅`
      );

      updateTx(
        {
          kind: "list",
          phase: "done",
          label:
            inferredMarketType === "PROTECTED"
              ? `Listed on ${marketLabel(
                  inferredMarketType
                )} • ${fulfillmentTypeLabel(protectedFulfillmentType)}.`
              : `Listed on ${marketLabel(inferredMarketType)}.`,
          txHash: hash,
        },
        { autoDismissMs: 4500 }
      );

      // Show the done state inside the modal for ~1.6s, then close gently.
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
      closeTimerRef.current = window.setTimeout(() => {
        closeModal();
        closeTimerRef.current = null;
      }, 1600);
    } catch (e: any) {
      const message = e?.shortMessage || e?.message || "Listing failed";
      setErr(message);
      updateTx(
        {
          kind: "list",
          phase: "error",
          label: message,
          errorText: message,
        },
        { autoDismissMs: 6000 }
      );
    } finally {
      setBusy(null);
    }
  }

  const disabledOpen = maxAmountBI <= 0n;
  const disabledApprove =
    busy !== null ||
    refreshing ||
    !walletReady ||
    needSwitch ||
    !hasMarketplace ||
    isApproved;
  const disabledList =
    busy !== null ||
    refreshing ||
    !walletReady ||
    needSwitch ||
    !hasMarketplace ||
    !isApproved ||
    maxAmountBI <= 0n ||
    !priceWei;

  const missingEnvText =
    inferredMarketType === "PROTECTED"
      ? "Missing protected marketplace env"
      : "Missing standard marketplace env";

  const compactNote = useMemo(() => {
    switch (contractView) {
      case "store":
        return {
          className: "border border-sky-500/20 bg-sky-500/10 text-sky-100",
          text: (
            <>
              Store resale is <span className="font-black">trading only</span>.
            </>
          ),
        };
      case "cafe":
        return {
          className: "border border-amber-500/20 bg-amber-500/10 text-amber-100",
          text: (
            <>
              Cafe resale is <span className="font-black">trading only</span>.
            </>
          ),
        };
      case "publicDelivery":
        return {
          className: "border border-violet-500/20 bg-violet-500/10 text-violet-100",
          text: (
            <>
              Use <span className="font-black">PROTECTED</span> market.
            </>
          ),
        };
      case "publicStandard":
        return assetIsProtected
          ? {
              className:
                "border border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-100",
              text: (
                <>
                  This asset should use the{" "}
                  <span className="font-black">PROTECTED</span> market.
                </>
              ),
            }
          : {
              className:
                "border border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
              text: (
                <>
                  Use <span className="font-black">STANDARD</span> market.
                </>
              ),
            };
      default:
        return inferredMarketType === "PROTECTED"
          ? {
              className:
                "border border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-100",
              text: (
                <>
                  Protected flow detected. Use{" "}
                  <span className="font-black">PROTECTED</span> market.
                </>
              ),
            }
          : null;
    }
  }, [contractView, assetIsProtected, inferredMarketType]);

  const headerBadges = useMemo(() => {
    switch (contractView) {
      case "store":
        return [
          {
            label: "TRADING ONLY",
            className: "border border-sky-500/20 bg-sky-500/10 text-sky-100",
          },
        ];
      case "cafe":
        return [
          {
            label: "TRADING ONLY",
            className:
              "border border-amber-500/20 bg-amber-500/10 text-amber-100",
          },
        ];
      default:
        return [];
    }
  }, [contractView]);

  const toastLayer =
    mounted && toasts.length
      ? createPortal(
          <div className="pointer-events-none fixed inset-x-0 top-4 z-[130] flex flex-col items-center gap-2 px-3">
            {toasts.map((toast) => (
              <ToastCard key={toast.id} toast={toast} />
            ))}
          </div>,
          document.body
        )
      : null;

  const modalLayer =
    mounted && open
      ? createPortal(
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center px-4"
            onClick={closeModal}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                closeModal();
              }}
              className="absolute right-4 top-4 z-[121] flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/70 text-lg font-black text-white shadow-[0_10px_35px_rgba(0,0,0,0.45)] transition hover:scale-[1.04] hover:bg-black/90"
              title="Close"
            >
              ✕
            </button>

            <div
              className="relative z-[121] w-full max-w-[360px] overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,rgba(247,231,167,0.20),rgba(212,175,55,0.10),rgba(184,135,10,0.08))] p-px shadow-[0_34px_130px_rgba(0,0,0,0.70)]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[#0b0a09]/88 ring-1 ring-black/10 backdrop-blur-2xl">
                <div className="p-4">
                  {headerBadges.length > 0 ? (
                    <div className="mb-2 flex justify-center">
                      {headerBadges.map((badge) => (
                        <span
                          key={badge.label}
                          className={cx(
                            "inline-flex items-center justify-center rounded-full px-3 py-1 text-[10px] font-black",
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {compactNote ? (
                    <div
                      className={cx(
                        "mt-2 rounded-2xl px-3 py-2 text-center text-[11px]",
                        compactNote.className
                      )}
                    >
                      {compactNote.text}
                    </div>
                  ) : null}

                  {inferredMarketType === "PROTECTED" ? (
                    <div className="mt-3 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-2 text-center text-[11px] text-fuchsia-100">
                      Protected type:{" "}
                      <span className="font-black">
                        {fulfillmentTypeLabel(protectedFulfillmentType)}
                      </span>
                    </div>
                  ) : null}

                  {showServiceLocation ? (
                    <div className="mt-3 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-center text-[11px] text-sky-100">
                      Service location:{" "}
                      <span className="font-black">{serviceLocationLabel}</span>
                    </div>
                  ) : null}

                  {!hasMarketplace ? (
                    <div className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-center text-[11px] text-rose-100">
                      {missingEnvText}
                    </div>
                  ) : null}

                  {err ? (
                    <div className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-center text-[11px] text-rose-100">
                      {err}
                    </div>
                  ) : null}

                  {ok ? (
                    <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-center text-[11px] text-emerald-100">
                      {ok}
                    </div>
                  ) : null}

                  {refreshing ? (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-center text-[11px] text-white/65">
                      Syncing wallet state…
                    </div>
                  ) : null}

                  {!walletReady ? (
                    <button
                      onClick={() => openConnectModal?.()}
                      className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-4 py-2.5 font-extrabold text-black ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.20)] transition hover:brightness-110"
                    >
                      Connect Wallet
                    </button>
                  ) : null}

                  {needSwitch ? (
                    <button
                      onClick={() => void ensureChain()}
                      className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2.5 font-extrabold text-white transition hover:bg-white/10"
                    >
                      Switch Chain
                    </button>
                  ) : null}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                        You own
                      </div>
                      <div className="mt-1 text-[14px] font-black text-emerald-200">
                        {maxAmountBI.toString()}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                        Approval
                      </div>
                      <div className="mt-1 text-[14px] font-black text-white/90">
                        {isApproved ? "Approved" : "Required"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAmount(1)}
                        className={cx(
                          "h-10 rounded-2xl border text-sm font-black transition",
                          amount === 1
                            ? "border-amber-300/40 bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black"
                            : "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
                        )}
                      >
                        1
                      </button>

                      <button
                        type="button"
                        onClick={() => setAmount(Math.max(1, maxAmount))}
                        className={cx(
                          "h-10 rounded-2xl border text-sm font-black transition",
                          amount === Math.max(1, maxAmount)
                            ? "border-amber-300/40 bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black"
                            : "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
                        )}
                      >
                        Max
                      </button>
                    </div>

                    <input
                      value={amount}
                      onChange={(e) =>
                        setAmount(
                          clampInt(
                            Number(e.target.value || "1"),
                            1,
                            Math.max(1, maxAmount)
                          )
                        )
                      }
                      type="number"
                      min={1}
                      max={Math.max(1, maxAmount)}
                      className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-center text-[15px] font-black text-white/95 outline-none focus:border-white/20"
                    />
                  </div>

                  <div className="mt-3">
                    <input
                      value={priceEth}
                      onChange={(e) => setPriceEth(e.target.value)}
                      type="text"
                      placeholder={inferredMarketType === "PROTECTED" ? "10" : "0.01"}
                      className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-center text-[15px] font-black text-white/95 outline-none focus:border-white/20"
                    />
                    <div className="mt-1.5 text-center text-[11px] text-white/40">
                      Price per unit ({paymentSymbolForMarket(inferredMarketType)})
                    </div>
                  </div>

                  <div className="mt-3 text-center text-[12px] font-black text-amber-100">
                    Total: {fmtPriceRaw(totalPriceWei, inferredMarketType)} {paymentSymbolForMarket(inferredMarketType)}
                  </div>

                  {/* Inline progress widget. Replaces the previous static
                      "Wallet → Confirmed → Synced" hint when a tx is active. */}
                  {txState ? (
                    <div className="mt-3">
                      <TxProgress
                        state={txState}
                        chainId={chainId}
                        onDismiss={dismissTx}
                        onRetry={
                          txState.kind === "approve"
                            ? approveAll
                            : txState.kind === "list"
                            ? listNow
                            : undefined
                        }
                        compact
                      />
                    </div>
                  ) : (
                    <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-center text-[11px] text-white/58">
                      {isApproved
                        ? "Marketplace approved. Sign one transaction to publish your listing."
                        : "First time? Approve marketplace once, then publish listings without re-approving."}
                    </div>
                  )}

                  {/* Action area.
                      - Not approved: full-width Approve button (primary).
                      - Approved:     compact ✓ chip + full-width List button.
                      Spinner replaces button label while busy. */}
                  {isApproved ? (
                    <>
                      <div className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-black text-emerald-100">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
                        Approved for {marketLabel(inferredMarketType).toLowerCase()} marketplace
                      </div>

                      <button
                        disabled={disabledList}
                        onClick={listNow}
                        className={cx(
                          "mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-extrabold text-black ring-1 ring-black/15 transition-all duration-200",
                          "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] shadow-[0_18px_60px_rgba(212,175,55,0.22)] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0",
                          disabledList ? "cursor-not-allowed opacity-60 hover:translate-y-0" : ""
                        )}
                      >
                        {busy === "list" ? (
                          <>
                            <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/70 border-r-transparent" />
                            <span>Listing…</span>
                          </>
                        ) : refreshing ? (
                          <>
                            <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/70 border-r-transparent" />
                            <span>Syncing…</span>
                          </>
                        ) : (
                          <span>List on {marketLabel(inferredMarketType).toLowerCase()} market</span>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        disabled={disabledApprove}
                        onClick={approveAll}
                        className={cx(
                          "mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border font-extrabold transition-all duration-200",
                          "border-white/15 bg-white/[0.06] text-white hover:bg-white/10",
                          disabledApprove ? "cursor-not-allowed opacity-60" : ""
                        )}
                      >
                        {busy === "approve" ? (
                          <>
                            <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                            <span>Approving…</span>
                          </>
                        ) : (
                          <span>Approve marketplace</span>
                        )}
                      </button>

                      <button
                        disabled
                        className="mt-2 inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-2xl border border-white/10 bg-white/[0.025] text-[12px] font-bold text-white/35"
                        title="Approve marketplace first"
                      >
                        List on {marketLabel(inferredMarketType).toLowerCase()} market
                      </button>
                    </>
                  )}

                  <div className="mt-3 text-center text-[11px] text-white/45">
                    {name ? (
                      <>
                        NFT: <span className="font-semibold text-white/75">{name}</span>
                      </>
                    ) : (
                      <>Quick list</>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

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
          "inline-flex items-center justify-center rounded-xl px-3 py-2 text-[12px] font-extrabold transition",
          disabledOpen
            ? "cursor-not-allowed border border-white/10 bg-white/[0.04] text-white/45"
            : "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.16)] hover:brightness-110"
        )}
        title="List"
      >
        List
      </button>

      {toastLayer}
      {modalLayer}
    </>
  );
}