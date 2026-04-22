"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  useAccount,
  useChainId,
  useSwitchChain,
  usePublicClient,
  useWriteContract,
  useReadContract,
} from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatUnits, parseUnits } from "viem";

import { erc1155CoreAbi } from "@/lib/erc1155CoreAbi";
import { marketplaceSpot1155Abi } from "@/lib/realifeMarketplaceSpot1155Abi";
import { realifeMarketplaceProtectedEscrow1155Abi } from "@/lib/realifeMarketplaceProtectedEscrow1155Abi";

type MarketType = "STANDARD" | "PROTECTED";

type FulfillmentType =
  | "PHYSICAL_GOOD"
  | "DIGITAL_SERVICE"
  | "ONLINE_SESSION"
  | "LOCAL_SERVICE";

type ContractView =
  | "publicStandard"
  | "publicDelivery"
  | "cafe"
  | "store"
  | "unknown";

type Listing = {
  id: string;
  standard: "ERC1155" | "ERC721";
  sellerWallet: string;
  seller?: { handle: string | null; publicId: string | null } | null;
  marketplaceListingId: string;
  pricePerUnitWei: string;
  amountTotal: string;
  amountRemaining: string;
  createdAt: string;

  deliveryEnabled?: boolean;
  physicalItemIncluded?: boolean;
  officialItem?: boolean;

  fulfillmentType?: FulfillmentType | null;
  category?: string | null;
  subcategory?: string | null;

  marketType?: MarketType;
  marketplaceContract?: string | null;
};

type Trade = {
  txHash: string;
  logIndex: number;
  blockNum: string;
  blockTime: string;
  sellerWallet: string;
  buyerWallet: string;
  amount: string;
  pricePerUnitWei: string;
  totalPriceWei: string;

  fulfillmentType?: FulfillmentType | null;
  category?: string | null;
  subcategory?: string | null;

  marketType?: MarketType;
  marketplaceContract?: string | null;
  marketplacePurchaseId?: string | null;
};

type MarketNftResponse = {
  ok: boolean;
  mint: {
    chainId: number;
    contract: string;
    tokenId: string;
    name: string | null;
    image: string | null;
    tokenUri: string | null;

    deliveryEnabled?: boolean;
    physicalItemIncluded?: boolean;
    officialItem?: boolean;

    fulfillmentType?: FulfillmentType | null;
    category?: string | null;
    subcategory?: string | null;
    resolvedMarketType?: MarketType | null;
  };
  stats: {
    activeListings: number;
    tradesCount: number;
    floorWei: string | null;
    lastSaleWei: string | null;
    volumeTotalWei: string;
  };
  listings: Listing[];
  trades: Trade[];
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

function fmtEth(weiStr?: string | null) {
  try {
    if (!weiStr) return "—";
    const v = formatUnits(BigInt(weiStr), 18);
    const [a, b] = v.split(".");
    if (!b) return a;
    const bb = b.slice(0, 6).replace(/0+$/, "");
    return bb ? `${a}.${bb}` : a;
  } catch {
    return "—";
  }
}

function toLower(a?: string | null) {
  return String(a || "").trim().toLowerCase();
}

function normText(a?: string | null) {
  return String(a || "").trim().toLowerCase();
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function bigintToSafeInt(v: bigint, fallback = 1) {
  try {
    if (v <= 0n) return fallback;
    if (v > 999999n) return 999999;
    return Number(v);
  } catch {
    return fallback;
  }
}

function parseEthOrZero(v: string) {
  try {
    return parseUnits(String(v || "0"), 18);
  } catch {
    return 0n;
  }
}

function explorerTxUrl(chainId: number, txHash: string) {
  if (!txHash) return "#";
  if (chainId === 84532) return `https://sepolia.basescan.org/tx/${txHash}`;
  if (chainId === 8453) return `https://basescan.org/tx/${txHash}`;
  return "#";
}

function marketLabel(mt?: MarketType | null) {
  return mt === "PROTECTED" ? "PROTECTED" : "STANDARD";
}

function listingKeyOf(x: {
  marketplaceListingId: string;
  marketType?: MarketType;
  marketplaceContract?: string | null;
}) {
  return [
    toLower(x.marketplaceContract),
    x.marketType || "STANDARD",
    String(x.marketplaceListingId || ""),
  ].join(":");
}

async function fetchJSON(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j) throw new Error(j?.error || "fetch_failed");
  return j;
}

function Pill({
  children,
  active = false,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-[11px] font-black transition",
        active
          ? "text-black bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
          : "border border-white/10 bg-white/[0.06] text-white/70 hover:bg-white/[0.10]"
      )}
    >
      {children}
    </Tag>
  );
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

function classifyContractView(contract: string): ContractView {
  const x = toLower(contract);

  if (CAFE_CONTRACT && x === CAFE_CONTRACT) return "cafe";
  if (STORE_CONTRACT && x === STORE_CONTRACT) return "store";
  if (PUBLIC_STANDARD_CONTRACT && x === PUBLIC_STANDARD_CONTRACT) {
    return "publicStandard";
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
  marketType?: MarketType;
}): MarketType {
  const { contractView, assetIsProtected, preferredMarketType, marketType } = params;

  if (contractView === "store" || contractView === "cafe") return "STANDARD";
  if (contractView === "publicDelivery") return "PROTECTED";
  if (assetIsProtected) return "PROTECTED";

  if (preferredMarketType === "PROTECTED" || marketType === "PROTECTED") {
    return "PROTECTED";
  }

  if (preferredMarketType === "STANDARD" || marketType === "STANDARD") {
    return "STANDARD";
  }

  return "STANDARD";
}

function resolveRowMarketType(params: {
  contractView: ContractView;
  fallbackMarketType: MarketType;
  rowMarketType?: MarketType | null;
}): MarketType {
  const { contractView, fallbackMarketType, rowMarketType } = params;

  if (contractView === "store" || contractView === "cafe") return "STANDARD";
  if (contractView === "publicDelivery") return "PROTECTED";
  return rowMarketType || fallbackMarketType;
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
    if (normText(category).includes("session") || normText(subcategory).includes("session")) {
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

function MarketNotice({
  contractView,
  assetIsProtected,
}: {
  contractView: ContractView;
  assetIsProtected: boolean;
}) {
  if (contractView === "store") {
    return (
      <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-[12px] leading-relaxed text-sky-100">
        <div className="mb-1 font-black">Realife Store • Secondary Trading</div>
        <div>
          This NFT uses the <span className="font-black">STANDARD marketplace</span>.
          Delivery does not work here.
        </div>
        <div className="mt-2 text-sky-100/80">
          This page is <span className="font-black">TRADING ONLY</span>. If you want
          official purchase with delivery, use the Realife Store page in Real Marketing.
        </div>

        <Link
          href="/app/real-marketing"
          className="mt-3 inline-flex rounded-xl bg-sky-500/20 px-4 py-2 font-black text-sky-100 transition hover:bg-sky-500/30"
        >
          Go to Real Marketing →
        </Link>
      </div>
    );
  }

  if (contractView === "cafe") {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-[12px] leading-relaxed text-amber-100">
        <div className="mb-1 font-black">Realife Cafe • Secondary Trading</div>
        <div>
          This NFT uses the <span className="font-black">STANDARD marketplace</span>.
          Redemption does not work here.
        </div>
        <div className="mt-2 text-amber-100/80">
          This page is <span className="font-black">TRADING ONLY</span>. If you want
          official cafe purchase and redemption, use the Realife Cafe page in Real
          Marketing.
        </div>

        <Link
          href="/app/real-marketing"
          className="mt-3 inline-flex rounded-xl bg-amber-500/20 px-4 py-2 font-black text-amber-100 transition hover:bg-amber-500/30"
        >
          Go to Real Marketing →
        </Link>
      </div>
    );
  }

  if (contractView === "publicDelivery") {
    return (
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4 text-[12px] leading-relaxed text-violet-100">
        <div className="mb-1 font-black">Public Delivery NFT</div>
        <div>
          This NFT uses the <span className="font-black">PROTECTED marketplace</span>.
          Escrow / refund / protected order flow is enabled for this asset.
        </div>
        <div className="mt-2 text-violet-100/80">
          After purchase, the protected order flow is handled through Orders.
        </div>
      </div>
    );
  }

  if (contractView === "publicStandard" && assetIsProtected) {
    return (
      <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-4 text-[12px] leading-relaxed text-fuchsia-100">
        <div className="mb-1 font-black">Public Standard Contract • Protected Asset</div>
        <div>
          This NFT is stored in the standard mint contract, but it should trade on the{" "}
          <span className="font-black">PROTECTED marketplace</span>.
        </div>
        <div className="mt-2 text-fuchsia-100/80">
          This is used for protected goods / services / sessions.
        </div>
      </div>
    );
  }

  if (contractView === "publicStandard") {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-[12px] leading-relaxed text-emerald-100">
        <div className="mb-1 font-black">Public Standard NFT</div>
        <div>
          This NFT uses the <span className="font-black">STANDARD marketplace</span>.
        </div>
        <div className="mt-2 text-emerald-100/80">
          This is a normal user-created NFT without protected escrow flow.
        </div>
      </div>
    );
  }

  return null;
}

export default function TradingPanel1155({
  chainId,
  contract,
  tokenId,
  marketType,
  preferredMarketType,
  deliveryEnabled,
  physicalItemIncluded,
  fulfillmentType,
  category,
  subcategory,
  initialMarketData = null,
}: {
  chainId: number;
  contract: string;
  tokenId: string;
  marketType?: MarketType;
  preferredMarketType?: MarketType;
  deliveryEnabled?: boolean;
  physicalItemIncluded?: boolean;
  fulfillmentType?: FulfillmentType | null;
  category?: string | null;
  subcategory?: string | null;
  initialMarketData?: MarketNftResponse | null;
}) {
  const { address, isConnected } = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  const { openConnectModal } = useConnectModal();
  const { writeContractAsync } = useWriteContract();

  const STANDARD_MARKETPLACE_ADDRESS = useMemo(() => {
    return toLower(
      process.env.NEXT_PUBLIC_REALIFE_MARKETPLACE_ADDRESS ||
        process.env.NEXT_PUBLIC_REALIFE_MARKETPLACE_STANDARD_ADDRESS ||
        process.env.NEXT_PUBLIC_MARKETPLACE_STANDARD_ADDRESS ||
        process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS ||
        ""
    );
  }, []);

  const PROTECTED_MARKETPLACE_ADDRESS = useMemo(() => {
    return toLower(
      process.env.NEXT_PUBLIC_REALIFE_PROTECTED_MARKETPLACE_CONTRACT ||
        process.env.NEXT_PUBLIC_PROTECTED_MARKETPLACE_ADDRESS ||
        process.env.NEXT_PUBLIC_REALIFE_MARKETPLACE_PROTECTED_ADDRESS ||
        process.env.NEXT_PUBLIC_MARKETPLACE_PROTECTED_ADDRESS ||
        ""
    );
  }, []);

  const nftAddr = useMemo(() => toLower(contract), [contract]);
  const me = useMemo(() => toLower(address), [address]);
  const canTradeOnThisChain = currentChainId === chainId;
  const contractView = useMemo(() => classifyContractView(nftAddr), [nftAddr]);

  const [loading, setLoading] = useState(!initialMarketData);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [data, setData] = useState<MarketNftResponse | null>(initialMarketData);
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const hasRenderableDataRef = useRef(Boolean(initialMarketData));

  const tokenIdBI = useMemo(() => {
    try {
      return BigInt(tokenId);
    } catch {
      return 0n;
    }
  }, [tokenId]);

  useEffect(() => {
    hasRenderableDataRef.current = Boolean(data);
  }, [data]);

  useEffect(() => {
    if (initialMarketData) {
      setData(initialMarketData);
      setLoading(false);
      hasRenderableDataRef.current = true;
      return;
    }

    setData(null);
    setLoading(true);
    hasRenderableDataRef.current = false;
  }, [initialMarketData, chainId, nftAddr, tokenId]);

  const assetDeliveryEnabled =
    data?.mint?.deliveryEnabled ?? deliveryEnabled ?? false;

  const assetPhysicalItemIncluded =
    data?.mint?.physicalItemIncluded ?? physicalItemIncluded ?? false;

  const assetFulfillmentType =
    data?.mint?.fulfillmentType ?? fulfillmentType ?? null;

  const assetCategory = data?.mint?.category ?? category ?? null;
  const assetSubcategory = data?.mint?.subcategory ?? subcategory ?? null;

  const assetIsProtected = useMemo(() => {
    return inferProtectedAsset({
      contractView,
      deliveryEnabled: assetDeliveryEnabled,
      physicalItemIncluded: assetPhysicalItemIncluded,
      fulfillmentType: assetFulfillmentType,
      category: assetCategory,
      subcategory: assetSubcategory,
    });
  }, [
    contractView,
    assetDeliveryEnabled,
    assetPhysicalItemIncluded,
    assetFulfillmentType,
    assetCategory,
    assetSubcategory,
  ]);

  const resolvedMarketType: MarketType = useMemo(() => {
    return resolveAssetMarketType({
      contractView,
      assetIsProtected,
      preferredMarketType,
      marketType,
    });
  }, [contractView, assetIsProtected, preferredMarketType, marketType]);

  const protectedFulfillmentType = useMemo(() => {
    return resolveProtectedFulfillmentType({
      contractView,
      deliveryEnabled: assetDeliveryEnabled,
      physicalItemIncluded: assetPhysicalItemIncluded,
      fulfillmentType: assetFulfillmentType,
      category: assetCategory,
      subcategory: assetSubcategory,
    });
  }, [
    contractView,
    assetDeliveryEnabled,
    assetPhysicalItemIncluded,
    assetFulfillmentType,
    assetCategory,
    assetSubcategory,
  ]);

  const protectedFulfillmentTypeUint8 = useMemo(() => {
    return fulfillmentTypeToUint8(protectedFulfillmentType);
  }, [protectedFulfillmentType]);

  const revalidateMarketTags = useCallback(async () => {
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
  }, [chainId, nftAddr, tokenId]);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent);
      const keepVisible = silent || hasRenderableDataRef.current;

      setErr(null);

      if (keepVisible) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const url =
          `/api/market/nft?chainId=${encodeURIComponent(String(chainId))}` +
          `&contract=${encodeURIComponent(nftAddr)}` +
          `&tokenId=${encodeURIComponent(String(tokenId))}` +
          `&marketType=${encodeURIComponent(resolvedMarketType)}` +
          `&listingsTake=50&tradesTake=50`;

        const j = (await fetchJSON(url)) as MarketNftResponse;
        setData(j);
        hasRenderableDataRef.current = true;
      } catch (e: any) {
        setErr(e?.message || "Failed to load market data");
      } finally {
        if (keepVisible) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [chainId, nftAddr, tokenId, resolvedMarketType]
  );

  useEffect(() => {
    void refresh({ silent: Boolean(initialMarketData) });
  }, [refresh, initialMarketData]);

  const sellMarketType = resolvedMarketType;

  const sellMarketplaceAddress = useMemo(() => {
    return sellMarketType === "PROTECTED"
      ? PROTECTED_MARKETPLACE_ADDRESS
      : STANDARD_MARKETPLACE_ADDRESS;
  }, [sellMarketType, PROTECTED_MARKETPLACE_ADDRESS, STANDARD_MARKETPLACE_ADDRESS]);

  const sellMarketplaceAbi = useMemo(() => {
    return sellMarketType === "PROTECTED"
      ? realifeMarketplaceProtectedEscrow1155Abi
      : marketplaceSpot1155Abi;
  }, [sellMarketType]);

  const hasSellMarketplace = sellMarketplaceAddress.startsWith("0x");

  const { data: balanceRaw, refetch: refetchBalance } = useReadContract({
    abi: erc1155CoreAbi,
    address: (nftAddr || "0x0000000000000000000000000000000000000000") as `0x${string}`,
    functionName: "balanceOf",
    args: [
      (address || "0x0000000000000000000000000000000000000000") as `0x${string}`,
      tokenIdBI,
    ],
    query: {
      enabled: Boolean(address && nftAddr.startsWith("0x")),
    },
  });

  const { data: approvedRaw, refetch: refetchApproved } = useReadContract({
    abi: erc1155CoreAbi,
    address: (nftAddr || "0x0000000000000000000000000000000000000000") as `0x${string}`,
    functionName: "isApprovedForAll",
    args: [
      (address || "0x0000000000000000000000000000000000000000") as `0x${string}`,
      (sellMarketplaceAddress ||
        "0x0000000000000000000000000000000000000000") as `0x${string}`,
    ],
    query: {
      enabled: Boolean(address && hasSellMarketplace && nftAddr.startsWith("0x")),
    },
  });

  const balance = useMemo(() => {
    try {
      return BigInt(balanceRaw as any);
    } catch {
      return 0n;
    }
  }, [balanceRaw]);

  const isApproved = Boolean(approvedRaw);

  const [selectedListingKey, setSelectedListingKey] = useState<string | null>(null);
  const [buyAmount, setBuyAmount] = useState(1);
  const [sellAmount, setSellAmount] = useState(1);
  const [sellPriceEth, setSellPriceEth] = useState("0.01");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const list = data?.listings || [];
    if (!list.length) {
      setSelectedListingKey(null);
      return;
    }

    setSelectedListingKey((prev) => {
      if (!prev) return listingKeyOf(list[0]);
      const exists = list.some((x) => listingKeyOf(x) === prev);
      return exists ? prev : listingKeyOf(list[0]);
    });
  }, [data?.listings]);

  const selectedListing = useMemo(() => {
    const list = data?.listings || [];
    if (!list.length) return null;
    if (!selectedListingKey) return list[0] || null;
    return list.find((x) => listingKeyOf(x) === selectedListingKey) || list[0] || null;
  }, [data?.listings, selectedListingKey]);

  const selectedListingMarketType: MarketType = useMemo(() => {
    return resolveRowMarketType({
      contractView,
      fallbackMarketType: resolvedMarketType,
      rowMarketType: selectedListing?.marketType,
    });
  }, [contractView, resolvedMarketType, selectedListing?.marketType]);

  const selectedListingMarketplaceAddress = useMemo(() => {
    const direct = toLower(selectedListing?.marketplaceContract || "");
    if (direct.startsWith("0x")) return direct;

    return selectedListingMarketType === "PROTECTED"
      ? PROTECTED_MARKETPLACE_ADDRESS
      : STANDARD_MARKETPLACE_ADDRESS;
  }, [
    selectedListing?.marketplaceContract,
    selectedListingMarketType,
    PROTECTED_MARKETPLACE_ADDRESS,
    STANDARD_MARKETPLACE_ADDRESS,
  ]);

  const selectedListingMarketplaceAbi = useMemo(() => {
    return selectedListingMarketType === "PROTECTED"
      ? realifeMarketplaceProtectedEscrow1155Abi
      : marketplaceSpot1155Abi;
  }, [selectedListingMarketType]);

  const hasSelectedListingMarketplace =
    selectedListingMarketplaceAddress.startsWith("0x");

  const selectedListingCreatesProtectedOrder =
    selectedListingMarketType === "PROTECTED";

  const maxBuyBI = useMemo(() => {
    try {
      if (!selectedListing) return 0n;
      return BigInt(selectedListing.amountRemaining);
    } catch {
      return 0n;
    }
  }, [selectedListing]);

  const maxBuy = useMemo(() => bigintToSafeInt(maxBuyBI, 1), [maxBuyBI]);
  const maxSell = useMemo(() => bigintToSafeInt(balance, 1), [balance]);

  useEffect(() => {
    setBuyAmount((prev) => clampInt(prev, 1, Math.max(1, maxBuy)));
  }, [maxBuy]);

  useEffect(() => {
    setSellAmount((prev) => clampInt(prev, 1, Math.max(1, maxSell)));
  }, [maxSell]);

  const iAmSellerOfSelected = useMemo(() => {
    if (!selectedListing) return false;
    return toLower(selectedListing.sellerWallet) === me;
  }, [selectedListing, me]);

  const sellTotalWei = useMemo(() => {
    try {
      return parseEthOrZero(sellPriceEth) * BigInt(sellAmount || 1);
    } catch {
      return 0n;
    }
  }, [sellPriceEth, sellAmount]);

  const buyTotalWei = useMemo(() => {
    try {
      if (!selectedListing) return 0n;
      return BigInt(selectedListing.pricePerUnitWei) * BigInt(buyAmount || 1);
    } catch {
      return 0n;
    }
  }, [selectedListing, buyAmount]);

  const refreshAll = useCallback(
    async (opts?: { silent?: boolean }) => {
      await Promise.allSettled([
        refresh(opts),
        refetchBalance(),
        refetchApproved(),
      ]);
    },
    [refresh, refetchBalance, refetchApproved]
  );

  const schedulePostTxRefreshes = useCallback(() => {
    if (typeof window === "undefined") return;

    for (const delay of [1600, 4200]) {
      window.setTimeout(() => {
        void refreshAll({ silent: true });
      }, delay);
    }
  }, [refreshAll]);

  async function ensureChain() {
    if (!canTradeOnThisChain) {
      await switchChainAsync?.({ chainId });
    }
  }

  async function afterMarketTx() {
    await revalidateMarketTags();
    await refreshAll({ silent: true });
    schedulePostTxRefreshes();
  }

  async function approveAll() {
    if (!isConnected) return openConnectModal?.();
    if (!hasSellMarketplace) return;

    setErr(null);
    setHint(null);
    setBusy("approve");

    try {
      await ensureChain();

      const hash = await writeContractAsync({
        abi: erc1155CoreAbi,
        address: nftAddr as `0x${string}`,
        functionName: "setApprovalForAll",
        args: [sellMarketplaceAddress as `0x${string}`, true],
      });

      setHint(
        `Approval sent to ${marketLabel(sellMarketType)} market. Waiting for confirmation…`
      );
      await publicClient?.waitForTransactionReceipt({ hash });

      await refetchApproved();
      setHint(`Approved for ${marketLabel(sellMarketType)} ✅`);
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Approve failed");
    } finally {
      setBusy(null);
    }
  }

  async function listNow() {
    if (!isConnected) return openConnectModal?.();
    if (!hasSellMarketplace) return;

    setErr(null);
    setHint(null);
    setBusy("list");

    try {
      await ensureChain();

      const amt = BigInt(clampInt(sellAmount, 1, Math.max(1, maxSell)));
      const priceWei = parseEthOrZero(sellPriceEth);

      const listArgs =
        sellMarketType === "PROTECTED"
          ? [
              nftAddr as `0x${string}`,
              tokenIdBI,
              amt,
              priceWei,
              protectedFulfillmentTypeUint8,
            ]
          : [nftAddr as `0x${string}`, tokenIdBI, amt, priceWei];

      const hash = await writeContractAsync({
        abi: sellMarketplaceAbi as any,
        address: sellMarketplaceAddress as `0x${string}`,
        functionName: "list1155",
        args: listArgs as any,
      });

      setHint(
        sellMarketType === "PROTECTED"
          ? `${marketLabel(
              sellMarketType
            )} listing sent (${fulfillmentTypeLabel(
              protectedFulfillmentType
            )}). Waiting for confirmation…`
          : `${marketLabel(sellMarketType)} listing sent. Waiting for confirmation…`
      );

      await publicClient?.waitForTransactionReceipt({ hash });

      setHint(`Listed on ${marketLabel(sellMarketType)} ✅ Updating…`);
      await afterMarketTx();
      setHint(null);
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Listing failed");
    } finally {
      setBusy(null);
    }
  }

  async function cancelListing(listing: Listing) {
    if (!isConnected) return openConnectModal?.();

    const listingMarketType = resolveRowMarketType({
      contractView,
      fallbackMarketType: resolvedMarketType,
      rowMarketType: listing.marketType,
    });

    const directMarketplace = toLower(listing.marketplaceContract || "");
    const listingMarketplaceAddress = directMarketplace.startsWith("0x")
      ? directMarketplace
      : listingMarketType === "PROTECTED"
      ? PROTECTED_MARKETPLACE_ADDRESS
      : STANDARD_MARKETPLACE_ADDRESS;

    const listingMarketplaceAbi =
      listingMarketType === "PROTECTED"
        ? realifeMarketplaceProtectedEscrow1155Abi
        : marketplaceSpot1155Abi;

    if (!listingMarketplaceAddress.startsWith("0x")) {
      setErr(
        `Marketplace address missing for ${marketLabel(listingMarketType)} listing`
      );
      return;
    }

    const busyKey = `cancel:${listingKeyOf(listing)}`;

    setErr(null);
    setHint(null);
    setBusy(busyKey);

    try {
      await ensureChain();

      const hash = await writeContractAsync({
        abi: listingMarketplaceAbi as any,
        address: listingMarketplaceAddress as `0x${string}`,
        functionName: "cancel",
        args: [BigInt(listing.marketplaceListingId)],
      });

      setHint(
        `Cancel sent to ${marketLabel(listingMarketType)} market. Waiting for confirmation…`
      );
      await publicClient?.waitForTransactionReceipt({ hash });

      setHint("Cancelled ✅ Updating…");
      await afterMarketTx();
      setHint(null);
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Cancel failed");
    } finally {
      setBusy(null);
    }
  }

  async function buyNow() {
    if (!isConnected) return openConnectModal?.();
    if (!selectedListing) return;

    if (!hasSelectedListingMarketplace) {
      setErr(
        `Marketplace address missing for ${marketLabel(selectedListingMarketType)} listing`
      );
      return;
    }

    setErr(null);
    setHint(null);
    setBusy("buy");

    try {
      await ensureChain();

      const amt = BigInt(clampInt(buyAmount, 1, Math.max(1, maxBuy)));
      const pricePer = BigInt(selectedListing.pricePerUnitWei);
      const total = pricePer * amt;

      const hash = await writeContractAsync({
        abi: selectedListingMarketplaceAbi as any,
        address: selectedListingMarketplaceAddress as `0x${string}`,
        functionName: "buy",
        args: [BigInt(selectedListing.marketplaceListingId), amt],
        value: total,
      });

      setHint(
        selectedListingCreatesProtectedOrder
          ? `Buy sent to ${marketLabel(
              selectedListingMarketType
            )} market. Waiting for confirmation…`
          : "Buy sent. Waiting for confirmation…"
      );

      await publicClient?.waitForTransactionReceipt({ hash });

      setHint(
        selectedListingCreatesProtectedOrder
          ? `Bought on ${marketLabel(
              selectedListingMarketType
            )} ✅ Updating… Protected order will appear in Orders after indexer sync.`
          : "Bought ✅ Updating…"
      );

      await afterMarketTx();
      setHint(null);
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Buy failed");
    } finally {
      setBusy(null);
    }
  }

  const wrap =
    "rounded-[34px] overflow-hidden bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))] p-px shadow-[0_34px_130px_rgba(0,0,0,0.60)]";
  const card =
    "rounded-[34px] overflow-hidden border border-white/10 bg-[#0b0a09]/30 backdrop-blur-2xl ring-1 ring-black/10";

  const stats = data?.stats;

  const sellDisabled =
    busy !== null ||
    !isConnected ||
    !hasSellMarketplace ||
    !canTradeOnThisChain ||
    !isApproved ||
    balance <= 0n;

  const buyDisabled =
    busy !== null ||
    !isConnected ||
    !hasSelectedListingMarketplace ||
    !canTradeOnThisChain ||
    !selectedListing ||
    iAmSellerOfSelected;

  const sellEnvMissingText =
    sellMarketType === "PROTECTED"
      ? "Missing protected marketplace env (NEXT_PUBLIC_REALIFE_PROTECTED_MARKETPLACE_CONTRACT)"
      : "Missing standard marketplace env (NEXT_PUBLIC_REALIFE_MARKETPLACE_ADDRESS or NEXT_PUBLIC_MARKETPLACE_ADDRESS)";

  return (
    <div className={wrap}>
      <div className={card}>
        <div className="p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/45">
                Trading • ERC-1155
              </div>
              <div className="mt-2 text-xl font-black tracking-tight text-white/90 md:text-2xl">
                Buy / Sell
              </div>
              <div className="mt-2 text-[12px] text-white/55">
                Contract-aware trading panel for Realife NFTs.
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!hasSellMarketplace ? (
                <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[11px] font-black text-rose-100">
                  {sellEnvMissingText}
                </div>
              ) : null}

              <Link
                href="/app/orders"
                className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-2 text-[12px] font-black text-white/85 transition hover:bg-white/[0.10]"
              >
                Orders
              </Link>

              <button
                onClick={() => refreshAll({ silent: true })}
                disabled={refreshing}
                className={cx(
                  "inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-2 text-[12px] font-black text-amber-100/90 transition hover:bg-white/[0.10] hover:text-amber-100",
                  refreshing && "cursor-default opacity-70"
                )}
              >
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>

          {err ? (
            <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-[12px] text-rose-100">
              {err}
            </div>
          ) : null}

          {hint ? (
            <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-[12px] text-amber-100">
              {hint}
            </div>
          ) : null}

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-[12px] text-white/75">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                Viewing market:{" "}
                <span className="font-black text-amber-100">
                  {marketLabel(resolvedMarketType)}
                </span>
              </div>

              {refreshing ? (
                <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/45">
                  <span className="h-2 w-2 rounded-full bg-amber-300/80 animate-pulse" />
                  Syncing
                </div>
              ) : null}
            </div>
          </div>

          {sellMarketType === "PROTECTED" ? (
            <div className="mt-3 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-4 text-[12px] text-fuchsia-100">
              Protected listing type:{" "}
              <span className="font-black">
                {fulfillmentTypeLabel(protectedFulfillmentType)}
              </span>
            </div>
          ) : null}

          <div className="mt-5">
            <MarketNotice
              contractView={contractView}
              assetIsProtected={assetIsProtected}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {!isConnected ? (
              <button
                onClick={() => openConnectModal?.()}
                className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-5 py-3 font-extrabold text-black ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.20)] transition hover:brightness-110"
              >
                Connect Wallet
              </button>
            ) : null}

            {isConnected && !canTradeOnThisChain ? (
              <button
                onClick={() => switchChainAsync?.({ chainId })}
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-3 font-extrabold transition hover:bg-white/10 shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
              >
                Switch Chain ({chainId})
              </button>
            ) : null}

            {isConnected ? (
              <div className="text-[12px] font-semibold text-white/55">
                Wallet:{" "}
                <span className="font-mono text-white/80">
                  {shortAddr(address || "")}
                </span>
              </div>
            ) : null}

            <div className="text-[12px] font-semibold text-white/55">
              Sell target:{" "}
              <span className="font-black text-amber-100">
                {marketLabel(sellMarketType)}
              </span>
            </div>

            {isConnected ? (
              <div className="text-[12px] font-semibold text-white/55">
                Approval:{" "}
                <span className={isApproved ? "text-emerald-200" : "text-amber-100"}>
                  {isApproved ? "Approved" : "Required"}
                </span>
              </div>
            ) : null}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                Floor
              </div>
              <div className="mt-1 text-lg font-black text-amber-100">
                {fmtEth(stats?.floorWei)} ETH
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                Last sale
              </div>
              <div className="mt-1 text-lg font-black text-white/90">
                {fmtEth(stats?.lastSaleWei)} ETH
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                Active
              </div>
              <div className="mt-1 text-lg font-black text-white/90">
                {stats?.activeListings ?? 0}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                You own
              </div>
              <div className="mt-1 text-lg font-black text-emerald-200">
                {balance.toString()}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            <Pill active={tab === "buy"} onClick={() => setTab("buy")}>
              Buy
            </Pill>
            <Pill active={tab === "sell"} onClick={() => setTab("sell")}>
              Sell
            </Pill>
          </div>

          {tab === "sell" ? (
            <div className="mt-6 rounded-[26px] border border-white/10 bg-white/[0.04] p-5 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[12px] font-black uppercase tracking-wider text-white/80">
                    Create listing
                  </div>
                  <div className="mt-1 text-[12px] text-white/50">
                    List your amount with a per-unit ETH price.
                  </div>
                </div>

                {!isApproved && isConnected && hasSellMarketplace ? (
                  <button
                    disabled={busy !== null}
                    onClick={approveAll}
                    className={cx(
                      "inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-2 text-[12px] font-black text-amber-100/90 transition hover:bg-white/[0.10] hover:text-amber-100",
                      busy ? "cursor-not-allowed opacity-60" : ""
                    )}
                  >
                    {busy === "approve"
                      ? "Approving…"
                      : `Approve ${marketLabel(sellMarketType).toLowerCase()} market`}
                  </button>
                ) : (
                  <div className="text-[12px] font-semibold text-white/50">
                    {isConnected
                      ? isApproved
                        ? "Approved ✅"
                        : "Approval required"
                      : "Connect wallet"}
                  </div>
                )}
              </div>

              {contractView === "publicDelivery" ? (
                <div className="mt-4 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4 text-[12px] text-violet-100">
                  This NFT uses the <span className="font-black">PROTECTED marketplace</span>.
                  After buy, the protected order should appear in{" "}
                  <Link href="/app/orders" className="font-black underline">
                    Orders
                  </Link>
                  .
                </div>
              ) : contractView === "store" ? (
                <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-[12px] text-sky-100">
                  Secondary Realife Store resale uses the{" "}
                  <span className="font-black">STANDARD marketplace</span>. This is{" "}
                  <span className="font-black">TRADING ONLY</span>. Delivery does not
                  work here.
                </div>
              ) : contractView === "cafe" ? (
                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-[12px] text-amber-100">
                  Secondary Realife Cafe resale uses the{" "}
                  <span className="font-black">STANDARD marketplace</span>. This is{" "}
                  <span className="font-black">TRADING ONLY</span>. Official redemption
                  does not work here.
                </div>
              ) : contractView === "publicStandard" && assetIsProtected ? (
                <div className="mt-4 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-4 text-[12px] text-fuchsia-100">
                  This asset should use the{" "}
                  <span className="font-black">PROTECTED marketplace</span> because it
                  behaves like a protected good / service / session.
                </div>
              ) : contractView === "publicStandard" ? (
                <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-[12px] text-emerald-100">
                  This NFT uses the <span className="font-black">STANDARD marketplace</span>.
                  It is a normal public standard NFT without protected flow.
                </div>
              ) : null}

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                    Amount
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSellAmount(1)}
                      className={cx(
                        "h-11 rounded-2xl border text-sm font-black transition",
                        sellAmount === 1
                          ? "border-amber-300/40 bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black"
                          : "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
                      )}
                    >
                      1
                    </button>

                    <button
                      type="button"
                      onClick={() => setSellAmount(Math.max(1, maxSell))}
                      className={cx(
                        "h-11 rounded-2xl border text-sm font-black transition",
                        sellAmount === Math.max(1, maxSell)
                          ? "border-amber-300/40 bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black"
                          : "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
                      )}
                    >
                      Max
                    </button>
                  </div>

                  <input
                    value={sellAmount}
                    onChange={(e) =>
                      setSellAmount(
                        clampInt(Number(e.target.value || "1"), 1, Math.max(1, maxSell))
                      )
                    }
                    type="number"
                    min={1}
                    max={Math.max(1, maxSell)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/90 outline-none focus:border-white/20"
                    placeholder="1"
                  />

                  <div className="mt-1 text-[11px] text-white/40">
                    Available: {balance.toString()}
                  </div>
                </label>

                <label className="block">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                    Price per unit (ETH)
                  </div>

                  <input
                    value={sellPriceEth}
                    onChange={(e) => setSellPriceEth(e.target.value)}
                    type="text"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/90 outline-none focus:border-white/20"
                    placeholder="0.01"
                  />

                  <div className="mt-1 text-[11px] text-white/40">
                    Total estimate: {fmtEth(sellTotalWei.toString())} ETH
                  </div>
                </label>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  disabled={sellDisabled}
                  onClick={listNow}
                  className={cx(
                    "inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-5 py-3 font-extrabold text-black ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.20)] transition hover:brightness-110",
                    sellDisabled ? "cursor-not-allowed opacity-60" : ""
                  )}
                >
                  {busy === "list"
                    ? "Listing…"
                    : `List on ${marketLabel(sellMarketType).toLowerCase()} market`}
                </button>

                {balance <= 0n ? (
                  <div className="text-[12px] font-semibold text-white/55">
                    You have 0 balance.
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[12px] font-black uppercase tracking-wider text-white/80">
                      Active listings
                    </div>
                    <div className="mt-1 text-[12px] text-white/50">
                      {loading
                        ? "Loading…"
                        : `${data?.listings?.length ?? 0} listing(s) available`}
                    </div>
                  </div>
                </div>

                {(!data?.listings || data.listings.length === 0) && !loading ? (
                  <div className="mt-4 text-[12px] text-white/60">
                    No active listings yet.
                  </div>
                ) : null}

                {data?.listings?.length ? (
                  <div className="mt-4 space-y-2">
                    {data.listings.map((l) => {
                      const k = listingKeyOf(l);
                      const active =
                        k === (selectedListing ? listingKeyOf(selectedListing) : "");
                      const isMine = toLower(l.sellerWallet) === me;
                      const isCancelling = busy === `cancel:${k}`;

                      const rowMarketType = resolveRowMarketType({
                        contractView,
                        fallbackMarketType: resolvedMarketType,
                        rowMarketType: l.marketType,
                      });

                      const showProtectedBadge = rowMarketType === "PROTECTED";
                      const showTradingOnlyBadge =
                        contractView === "store" || contractView === "cafe";
                      const showNoDeliveryBadge = contractView === "store";
                      const showNoRedemptionBadge = contractView === "cafe";

                      return (
                        <div
                          key={k}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedListingKey(k)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              setSelectedListingKey(k);
                            }
                          }}
                          className={cx(
                            "cursor-pointer rounded-2xl border p-4 outline-none transition",
                            active
                              ? "border-white/18 bg-white/[0.10]"
                              : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-extrabold text-white/92">
                                {fmtEth(l.pricePerUnitWei)} ETH
                                <span className="ml-2 text-[12px] font-black text-white/35">
                                  per unit
                                </span>
                              </div>
                              <div className="mt-1 text-[12px] text-white/55">
                                Seller:{" "}
                                <span className="font-mono text-white/82">
                                  {shortAddr(l.sellerWallet)}
                                </span>
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-black text-white/80">
                                  Left {l.amountRemaining}
                                </span>

                                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-black text-white/80">
                                  {marketLabel(rowMarketType)}
                                </span>

                                {showProtectedBadge ? (
                                  <span className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-2 py-1 text-[10px] font-black text-fuchsia-100">
                                    PROTECTED
                                  </span>
                                ) : null}

                                {showTradingOnlyBadge ? (
                                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-black text-white/80">
                                    TRADING ONLY
                                  </span>
                                ) : null}

                                {showNoDeliveryBadge ? (
                                  <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-[10px] font-black text-sky-100">
                                    NO DELIVERY
                                  </span>
                                ) : null}

                                {showNoRedemptionBadge ? (
                                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-100">
                                    NO REDEMPTION
                                  </span>
                                ) : null}

                                {l.officialItem ? (
                                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-100">
                                    OFFICIAL
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {isMine ? (
                                <button
                                  type="button"
                                  disabled={isCancelling || busy !== null || !isConnected}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    cancelListing(l);
                                  }}
                                  className={cx(
                                    "inline-flex items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-[11px] font-black text-white/80 transition hover:bg-white/[0.10]",
                                    isCancelling || busy !== null
                                      ? "cursor-not-allowed opacity-60"
                                      : ""
                                  )}
                                >
                                  {isCancelling ? "Cancelling…" : "Cancel"}
                                </button>
                              ) : null}
                            </div>
                          </div>

                          {isMine ? (
                            <div className="mt-2">
                              <span className="inline-flex h-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-2 text-[10px] font-black text-black/80 ring-1 ring-black/15">
                                YOUR LISTING
                              </span>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 md:p-6">
                <div>
                  <div className="text-[12px] font-black uppercase tracking-wider text-white/80">
                    Buy selected
                  </div>
                  <div className="mt-1 text-[12px] text-white/50">
                    Choose listing and confirm amount.
                  </div>
                </div>

                {selectedListing ? (
                  <>
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                        Selected listing
                      </div>
                      <div className="mt-2 text-sm font-extrabold text-white/92">
                        {fmtEth(selectedListing.pricePerUnitWei)} ETH
                        <span className="ml-2 text-[12px] font-black text-white/35">
                          per unit
                        </span>
                      </div>
                      <div className="mt-2 text-[12px] text-white/55">
                        Seller:{" "}
                        <span className="font-mono text-white/82">
                          {shortAddr(selectedListing.sellerWallet)}
                        </span>
                      </div>
                      <div className="mt-2 text-[12px] text-white/55">
                        Remaining:{" "}
                        <span className="font-black text-white/82">
                          {selectedListing.amountRemaining}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-black text-white/80">
                          {marketLabel(selectedListingMarketType)}
                        </span>

                        {selectedListingCreatesProtectedOrder ? (
                          <span className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-2 py-1 text-[10px] font-black text-fuchsia-100">
                            PROTECTED ORDER AFTER BUY
                          </span>
                        ) : null}

                        {contractView === "store" || contractView === "cafe" ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-black text-white/80">
                            TRADING ONLY
                          </span>
                        ) : null}

                        {contractView === "store" ? (
                          <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-[10px] font-black text-sky-100">
                            NO DELIVERY
                          </span>
                        ) : null}

                        {contractView === "cafe" ? (
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-100">
                            NO REDEMPTION
                          </span>
                        ) : null}

                        {selectedListing.officialItem ? (
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-100">
                            OFFICIAL
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {contractView === "publicDelivery" ? (
                      <div className="mt-4 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4 text-[12px] text-violet-100">
                        This purchase should create a protected order in{" "}
                        <Link href="/app/orders" className="font-black underline">
                          Orders
                        </Link>{" "}
                        after the marketplace indexer syncs the trade.
                      </div>
                    ) : contractView === "store" ? (
                      <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-[12px] text-sky-100">
                        This is a Realife Store secondary resale listing. It uses the{" "}
                        <span className="font-black">STANDARD marketplace</span>. Delivery
                        does not work here. For official purchase with delivery, use Real
                        Marketing.
                      </div>
                    ) : contractView === "cafe" ? (
                      <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-[12px] text-amber-100">
                        This is a Realife Cafe secondary resale listing. It uses the{" "}
                        <span className="font-black">STANDARD marketplace</span>. Redemption
                        does not work here. For official cafe flow, use Real Marketing.
                      </div>
                    ) : contractView === "publicStandard" && assetIsProtected ? (
                      <div className="mt-4 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-4 text-[12px] text-fuchsia-100">
                        This asset is traded through the{" "}
                        <span className="font-black">PROTECTED marketplace</span>.
                        Protected flow is used for goods / services / sessions.
                      </div>
                    ) : contractView === "publicStandard" ? (
                      <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-[12px] text-emerald-100">
                        This is a Public Standard NFT and it uses the{" "}
                        <span className="font-black">STANDARD marketplace</span>.
                      </div>
                    ) : null}

                    <label className="mt-4 block">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                        Amount
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setBuyAmount(1)}
                          className={cx(
                            "h-11 rounded-2xl border text-sm font-black transition",
                            buyAmount === 1
                              ? "border-amber-300/40 bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black"
                              : "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
                          )}
                        >
                          1
                        </button>

                        <button
                          type="button"
                          onClick={() => setBuyAmount(Math.max(1, maxBuy))}
                          className={cx(
                            "h-11 rounded-2xl border text-sm font-black transition",
                            buyAmount === Math.max(1, maxBuy)
                              ? "border-amber-300/40 bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black"
                              : "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
                          )}
                        >
                          Max
                        </button>
                      </div>

                      <input
                        value={buyAmount}
                        onChange={(e) =>
                          setBuyAmount(
                            clampInt(Number(e.target.value || "1"), 1, Math.max(1, maxBuy))
                          )
                        }
                        type="number"
                        min={1}
                        max={Math.max(1, maxBuy)}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/90 outline-none focus:border-white/20"
                      />

                      <div className="mt-1 text-[11px] text-white/40">
                        Max: {maxBuy}
                      </div>
                    </label>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                        Total
                      </div>
                      <div className="mt-1 text-lg font-black text-amber-100">
                        {fmtEth(buyTotalWei.toString())} ETH
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        disabled={buyDisabled}
                        onClick={buyNow}
                        className={cx(
                          "inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-5 py-3 font-extrabold text-black ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.20)] transition hover:brightness-110",
                          buyDisabled ? "cursor-not-allowed opacity-60" : ""
                        )}
                      >
                        {busy === "buy" ? "Buying…" : "Buy now"}
                      </button>

                      <div className="text-[12px] font-semibold text-white/55">
                        Listing #{selectedListing.marketplaceListingId}
                      </div>
                    </div>

                    {iAmSellerOfSelected ? (
                      <div className="mt-3 text-[12px] text-amber-100">
                        This is your own listing. Buying is disabled.
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="mt-4 text-[12px] text-white/60">
                    Select a listing from the left block.
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 rounded-[26px] border border-white/10 bg-white/[0.04] p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[12px] font-black uppercase tracking-wider text-white/80">
                  Recent trades
                </div>
                <div className="mt-1 text-[12px] text-white/50">
                  Latest fills for this NFT.
                </div>
              </div>

              <div className="text-[12px] font-semibold text-white/55">
                {data?.trades?.length ?? 0}
              </div>
            </div>

            {data?.trades?.length ? (
              <div className="mt-4 space-y-2">
                {data.trades.slice(0, 6).map((t) => (
                  <div
                    key={`${t.txHash}:${t.logIndex}`}
                    className="rounded-2xl border border-white/10 bg-black/10 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[12px] font-black text-amber-100">
                        {fmtEth(t.totalPriceWei)} ETH
                        <span className="ml-2 font-black text-white/35">•</span>
                        <span className="ml-2 font-black text-white/70">x{t.amount}</span>
                      </div>

                      <div className="text-[11px] text-white/40">
                        {new Date(t.blockTime).toLocaleString("en-GB")}
                      </div>
                    </div>

                    <div className="mt-2 text-[12px] text-white/55">
                      {shortAddr(t.sellerWallet)} → {shortAddr(t.buyerWallet)}
                      <span className="ml-2 text-white/35">•</span>
                      <span className="ml-2 font-black text-white/70">
                        {marketLabel(
                          resolveRowMarketType({
                            contractView,
                            fallbackMarketType: resolvedMarketType,
                            rowMarketType: t.marketType,
                          })
                        )}
                      </span>
                      <span className="ml-2 text-white/35">•</span>
                      <a
                        className="ml-2 font-black text-amber-100/90 hover:text-amber-100"
                        href={explorerTxUrl(chainId, t.txHash)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Tx ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 text-[12px] text-white/60">No trades yet.</div>
            )}
          </div>

          <div className="mt-6 text-[11px] text-white/35">
            After buy / list / cancel, the indexer may take a few seconds to update
            listings, trades and protected orders.
          </div>
        </div>
      </div>
    </div>
  );
}
