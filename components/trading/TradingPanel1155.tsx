"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { formatUnits, parseUnits } from "viem";

import { erc1155CoreAbi } from "@/lib/erc1155CoreAbi";
import { marketplaceSpot1155Abi } from "@/lib/realifeMarketplaceSpot1155Abi";

type MarketType = "STANDARD" | "DELIVERY";

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
  return mt === "DELIVERY" ? "DELIVERY" : "STANDARD";
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
  children: React.ReactNode;
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

export default function TradingPanel1155({
  chainId,
  contract,
  tokenId,
  marketType,
  preferredMarketType,
  deliveryEnabled,
}: {
  chainId: number;
  contract: string;
  tokenId: string;
  marketType?: MarketType;
  preferredMarketType?: MarketType;
  deliveryEnabled?: boolean;
}) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  const { openConnectModal } = useConnectModal();
  const { writeContractAsync } = useWriteContract();

  const STANDARD_MARKETPLACE_ADDRESS = useMemo(() => {
    return toLower(
      process.env.NEXT_PUBLIC_MARKETPLACE_STANDARD_ADDRESS ||
        process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS ||
        ""
    );
  }, []);

  const DELIVERY_MARKETPLACE_ADDRESS = useMemo(() => {
    return toLower(
      process.env.NEXT_PUBLIC_MARKETPLACE_DELIVERY_ADDRESS ||
        process.env.NEXT_PUBLIC_DELIVERY_MARKETPLACE_ADDRESS ||
        ""
    );
  }, []);

  const nftAddr = useMemo(() => toLower(contract), [contract]);
  const me = useMemo(() => toLower(address), [address]);
  const canTradeOnThisChain = currentChainId === chainId;

  const explicitMarketType = preferredMarketType || marketType || null;

  const tokenIdBI = useMemo(() => {
    try {
      return BigInt(tokenId);
    } catch {
      return 0n;
    }
  }, [tokenId]);

  const revalidateMarketTags = useCallback(async () => {
    const tags = [
      `market:nft:${chainId}:${nftAddr}:${tokenId}`,
      `market:contract:${chainId}:${nftAddr}`,
      `market:nft:${chainId}:${nftAddr}:${tokenId}:STANDARD`,
      `market:nft:${chainId}:${nftAddr}:${tokenId}:DELIVERY`,
      `market:contract:${chainId}:${nftAddr}:STANDARD`,
      `market:contract:${chainId}:${nftAddr}:DELIVERY`,
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

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [data, setData] = useState<MarketNftResponse | null>(null);
  const [tab, setTab] = useState<"buy" | "sell">("buy");

  const refresh = useCallback(async () => {
    setErr(null);
    setLoading(true);

    try {
      const url =
        `/api/market/nft?chainId=${encodeURIComponent(String(chainId))}` +
        `&contract=${encodeURIComponent(nftAddr)}` +
        `&tokenId=${encodeURIComponent(String(tokenId))}` +
        (explicitMarketType
          ? `&marketType=${encodeURIComponent(explicitMarketType)}`
          : "") +
        `&listingsTake=50&tradesTake=50`;

      const j = (await fetchJSON(url)) as MarketNftResponse;
      setData(j);
    } catch (e: any) {
      setErr(e?.message || "Failed to load market data");
    } finally {
      setLoading(false);
    }
  }, [chainId, nftAddr, tokenId, explicitMarketType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const nftHasDelivery = useMemo(() => {
    return Boolean(
      deliveryEnabled ||
        data?.mint?.deliveryEnabled ||
        data?.mint?.physicalItemIncluded
    );
  }, [
    deliveryEnabled,
    data?.mint?.deliveryEnabled,
    data?.mint?.physicalItemIncluded,
  ]);

  const sellMarketType: MarketType = useMemo(() => {
    if (explicitMarketType) return explicitMarketType;
    return nftHasDelivery ? "DELIVERY" : "STANDARD";
  }, [explicitMarketType, nftHasDelivery]);

  const sellMarketplaceAddress = useMemo(() => {
    return sellMarketType === "DELIVERY"
      ? DELIVERY_MARKETPLACE_ADDRESS
      : STANDARD_MARKETPLACE_ADDRESS;
  }, [sellMarketType, DELIVERY_MARKETPLACE_ADDRESS, STANDARD_MARKETPLACE_ADDRESS]);

  const hasSellMarketplace = sellMarketplaceAddress.startsWith("0x");

  const { data: balanceRaw, refetch: refetchBalance } = useReadContract({
    abi: erc1155CoreAbi,
    address: (nftAddr || "0x0000000000000000000000000000000000000000") as `0x${string}`,
    functionName: "balanceOf",
    args: [
      ((address || "0x0000000000000000000000000000000000000000") as `0x${string}`),
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
      ((address || "0x0000000000000000000000000000000000000000") as `0x${string}`),
      ((sellMarketplaceAddress ||
        "0x0000000000000000000000000000000000000000") as `0x${string}`),
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

  const selectedListingHasDelivery = useMemo(() => {
    if (!selectedListing) return nftHasDelivery;
    return Boolean(
      selectedListing.deliveryEnabled ||
        selectedListing.physicalItemIncluded ||
        deliveryEnabled ||
        data?.mint?.deliveryEnabled ||
        data?.mint?.physicalItemIncluded
    );
  }, [
    selectedListing,
    nftHasDelivery,
    deliveryEnabled,
    data?.mint?.deliveryEnabled,
    data?.mint?.physicalItemIncluded,
  ]);

  const selectedListingMarketType: MarketType = useMemo(() => {
    if (selectedListing?.marketType) return selectedListing.marketType;
    if (explicitMarketType) return explicitMarketType;
    return selectedListingHasDelivery ? "DELIVERY" : "STANDARD";
  }, [selectedListing?.marketType, explicitMarketType, selectedListingHasDelivery]);

  const selectedListingMarketplaceAddress = useMemo(() => {
    const direct = toLower(selectedListing?.marketplaceContract || "");
    if (direct.startsWith("0x")) return direct;

    return selectedListingMarketType === "DELIVERY"
      ? DELIVERY_MARKETPLACE_ADDRESS
      : STANDARD_MARKETPLACE_ADDRESS;
  }, [
    selectedListing?.marketplaceContract,
    selectedListingMarketType,
    DELIVERY_MARKETPLACE_ADDRESS,
    STANDARD_MARKETPLACE_ADDRESS,
  ]);

  const hasSelectedListingMarketplace =
    selectedListingMarketplaceAddress.startsWith("0x");

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

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([refresh(), refetchBalance(), refetchApproved()]);
  }, [refresh, refetchBalance, refetchApproved]);

  const pollAfterTx = useCallback(async () => {
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 2200));
      await refreshAll();
    }
  }, [refreshAll]);

  async function ensureChain() {
    if (!canTradeOnThisChain) {
      await switchChainAsync?.({ chainId });
    }
  }

  async function afterMarketTx() {
    await revalidateMarketTags();
    router.refresh();
    await refreshAll();
    await pollAfterTx();
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
        `Approval sent to ${marketLabel(
          sellMarketType
        )} market. Waiting for confirmation…`
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

      const hash = await writeContractAsync({
        abi: marketplaceSpot1155Abi,
        address: sellMarketplaceAddress as `0x${string}`,
        functionName: "list1155",
        args: [nftAddr as `0x${string}`, tokenIdBI, amt, priceWei],
      });

      setHint(
        `${marketLabel(sellMarketType)} listing sent. Waiting for confirmation…`
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

    const listingMarketType: MarketType =
      listing.marketType ||
      (listing.deliveryEnabled || listing.physicalItemIncluded ? "DELIVERY" : "STANDARD");

    const listingMarketplaceAddress =
      toLower(listing.marketplaceContract || "") ||
      (listingMarketType === "DELIVERY"
        ? DELIVERY_MARKETPLACE_ADDRESS
        : STANDARD_MARKETPLACE_ADDRESS);

    if (!listingMarketplaceAddress.startsWith("0x")) {
      setErr(`Marketplace address missing for ${marketLabel(listingMarketType)} listing`);
      return;
    }

    const busyKey = `cancel:${listingKeyOf(listing)}`;

    setErr(null);
    setHint(null);
    setBusy(busyKey);

    try {
      await ensureChain();

      const hash = await writeContractAsync({
        abi: marketplaceSpot1155Abi,
        address: listingMarketplaceAddress as `0x${string}`,
        functionName: "cancel",
        args: [BigInt(listing.marketplaceListingId)],
      });

      setHint(
        `Cancel sent to ${marketLabel(
          listingMarketType
        )} market. Waiting for confirmation…`
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
        `Marketplace address missing for ${marketLabel(
          selectedListingMarketType
        )} listing`
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
        abi: marketplaceSpot1155Abi,
        address: selectedListingMarketplaceAddress as `0x${string}`,
        functionName: "buy",
        args: [BigInt(selectedListing.marketplaceListingId), amt],
        value: total,
      });

      setHint(
        selectedListingHasDelivery
          ? `Buy sent to ${marketLabel(
              selectedListingMarketType
            )} market. Waiting for confirmation…`
          : "Buy sent. Waiting for confirmation…"
      );
      await publicClient?.waitForTransactionReceipt({ hash });

      setHint(
        selectedListingHasDelivery
          ? `Bought on ${marketLabel(
              selectedListingMarketType
            )} ✅ Updating… Delivery order will appear in Orders & Delivery after indexer sync.`
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
    "rounded-[34px] p-px overflow-hidden bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))] shadow-[0_34px_130px_rgba(0,0,0,0.60)]";
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
    sellMarketType === "DELIVERY"
      ? "NEXT_PUBLIC_MARKETPLACE_DELIVERY_ADDRESS missing"
      : "NEXT_PUBLIC_MARKETPLACE_ADDRESS / NEXT_PUBLIC_MARKETPLACE_STANDARD_ADDRESS missing";

  return (
    <div className={wrap}>
      <div className={card}>
        <div className="p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 font-black">
                Trading • ERC-1155
              </div>
              <div className="mt-2 text-xl md:text-2xl font-black tracking-tight text-white/90">
                Buy / Sell
              </div>
              <div className="mt-2 text-[12px] text-white/55">
                Unified trading panel for standard and delivery Realife NFTs.
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!hasSellMarketplace ? (
                <div className="px-3 py-2 rounded-2xl border border-rose-500/25 bg-rose-500/10 text-[11px] font-black text-rose-100">
                  {sellEnvMissingText}
                </div>
              ) : null}

              <Link
                href="/app/orders"
                className="inline-flex items-center justify-center px-4 py-2 rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition text-[12px] font-black text-white/85"
              >
                Orders
              </Link>

              <button
                onClick={() => refreshAll()}
                className="inline-flex items-center justify-center px-4 py-2 rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition text-[12px] font-black text-amber-100/90 hover:text-amber-100"
              >
                Refresh
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

          {explicitMarketType ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-[12px] text-white/75">
              Viewing market:{" "}
              <span className="font-black text-amber-100">
                {marketLabel(explicitMarketType)}
              </span>
            </div>
          ) : null}

          {nftHasDelivery ? (
            <div className="mt-5 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-[12px] text-sky-100">
              This NFT is delivery-enabled and should use the{" "}
              <span className="font-black">DELIVERY marketplace</span> for new listings.
              After purchase, the delivery order should appear in{" "}
              <Link href="/app/orders" className="underline font-black">
                Orders &amp; Delivery
              </Link>
              .
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {!isConnected ? (
              <button
                onClick={() => openConnectModal?.()}
                className="inline-flex items-center justify-center px-5 py-3 rounded-2xl text-black font-extrabold hover:brightness-110 transition shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
              >
                Connect Wallet
              </button>
            ) : null}

            {isConnected && !canTradeOnThisChain ? (
              <button
                onClick={() => switchChainAsync?.({ chainId })}
                className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 font-extrabold transition shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
              >
                Switch Chain ({chainId})
              </button>
            ) : null}

            {isConnected ? (
              <div className="text-[12px] text-white/55 font-semibold">
                Wallet:{" "}
                <span className="font-mono text-white/80">
                  {shortAddr(address || "")}
                </span>
              </div>
            ) : null}

            <div className="text-[12px] text-white/55 font-semibold">
              Sell target:{" "}
              <span className="text-amber-100 font-black">
                {marketLabel(sellMarketType)}
              </span>
            </div>

            {isConnected ? (
              <div className="text-[12px] text-white/55 font-semibold">
                Approval:{" "}
                <span className={isApproved ? "text-emerald-200" : "text-amber-100"}>
                  {isApproved ? "Approved" : "Required"}
                </span>
              </div>
            ) : null}
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                Floor
              </div>
              <div className="mt-1 text-lg font-black text-amber-100">
                {fmtEth(stats?.floorWei)} ETH
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                Last sale
              </div>
              <div className="mt-1 text-lg font-black text-white/90">
                {fmtEth(stats?.lastSaleWei)} ETH
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                Active
              </div>
              <div className="mt-1 text-lg font-black text-white/90">
                {stats?.activeListings ?? 0}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
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
                  <div className="text-[12px] font-black text-white/80 uppercase tracking-wider">
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
                      "inline-flex items-center justify-center px-4 py-2 rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition text-[12px] font-black text-amber-100/90 hover:text-amber-100",
                      busy ? "opacity-60 cursor-not-allowed" : ""
                    )}
                  >
                    {busy === "approve"
                      ? "Approving…"
                      : `Approve ${marketLabel(sellMarketType).toLowerCase()} market`}
                  </button>
                ) : (
                  <div className="text-[12px] text-white/50 font-semibold">
                    {isConnected
                      ? isApproved
                        ? "Approved ✅"
                        : "Approval required"
                      : "Connect wallet"}
                  </div>
                )}
              </div>

              {nftHasDelivery ? (
                <div className="mt-4 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4 text-[12px] text-violet-100">
                  This NFT supports delivery, so new listings should go to the{" "}
                  <span className="font-black">DELIVERY marketplace</span>. When bought, the
                  secondary delivery order should appear in{" "}
                  <Link href="/app/orders" className="underline font-black">
                    Orders &amp; Delivery
                  </Link>
                  .
                </div>
              ) : null}

              <div className="mt-5 grid md:grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
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
                        clampInt(
                          Number(e.target.value || "1"),
                          1,
                          Math.max(1, maxSell)
                        )
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
                  <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
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
                    "inline-flex items-center justify-center px-5 py-3 rounded-2xl text-black font-extrabold transition shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15 hover:brightness-110",
                    sellDisabled ? "opacity-60 cursor-not-allowed" : ""
                  )}
                >
                  {busy === "list"
                    ? "Listing…"
                    : `List on ${marketLabel(sellMarketType).toLowerCase()} market`}
                </button>

                {balance <= 0n ? (
                  <div className="text-[12px] text-white/55 font-semibold">
                    You have 0 balance.
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-6 grid lg:grid-cols-[1.15fr_0.85fr] gap-4">
              <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[12px] font-black text-white/80 uppercase tracking-wider">
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
                      const hasDeliveryBadge = Boolean(
                        l.deliveryEnabled ||
                          l.physicalItemIncluded ||
                          deliveryEnabled ||
                          data?.mint?.deliveryEnabled ||
                          data?.mint?.physicalItemIncluded
                      );

                      const rowMarketType: MarketType =
                        l.marketType ||
                        (l.deliveryEnabled || l.physicalItemIncluded
                          ? "DELIVERY"
                          : explicitMarketType || "STANDARD");

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
                            "rounded-2xl border p-4 transition outline-none cursor-pointer",
                            active
                              ? "border-white/18 bg-white/[0.10]"
                              : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-extrabold text-white/92">
                                {fmtEth(l.pricePerUnitWei)} ETH
                                <span className="ml-2 text-white/35 text-[12px] font-black">
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
                                <span className="px-2 py-1 rounded-full border border-white/10 bg-black/20 text-[10px] font-black text-white/80">
                                  Left {l.amountRemaining}
                                </span>

                                <span className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.06] text-[10px] font-black text-white/80">
                                  {marketLabel(rowMarketType)}
                                </span>

                                {hasDeliveryBadge ? (
                                  <span className="px-2 py-1 rounded-full border border-sky-500/20 bg-sky-500/10 text-[10px] font-black text-sky-100">
                                    DELIVERY
                                  </span>
                                ) : null}

                                {l.officialItem ? (
                                  <span className="px-2 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-[10px] font-black text-amber-100">
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
                                    "inline-flex items-center justify-center px-3 py-2 rounded-xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition text-[11px] font-black text-white/80",
                                    isCancelling || busy !== null
                                      ? "opacity-60 cursor-not-allowed"
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
                              <span className="inline-flex items-center justify-center h-5 px-2 rounded-full text-[10px] font-black text-black/80 bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15">
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
                  <div className="text-[12px] font-black text-white/80 uppercase tracking-wider">
                    Buy selected
                  </div>
                  <div className="mt-1 text-[12px] text-white/50">
                    Choose listing and confirm amount.
                  </div>
                </div>

                {selectedListing ? (
                  <>
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                        Selected listing
                      </div>
                      <div className="mt-2 text-sm font-extrabold text-white/92">
                        {fmtEth(selectedListing.pricePerUnitWei)} ETH
                        <span className="ml-2 text-white/35 text-[12px] font-black">
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
                        <span className="text-white/82 font-black">
                          {selectedListing.amountRemaining}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.06] text-[10px] font-black text-white/80">
                          {marketLabel(selectedListingMarketType)}
                        </span>

                        {selectedListingHasDelivery ? (
                          <span className="px-2 py-1 rounded-full border border-sky-500/20 bg-sky-500/10 text-[10px] font-black text-sky-100">
                            DELIVERY ORDER AFTER BUY
                          </span>
                        ) : null}

                        {selectedListing.officialItem ? (
                          <span className="px-2 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-[10px] font-black text-amber-100">
                            OFFICIAL
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {selectedListingHasDelivery ? (
                      <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-[12px] text-sky-100">
                        This purchase should create a delivery order in{" "}
                        <Link href="/app/orders" className="underline font-black">
                          Orders &amp; Delivery
                        </Link>{" "}
                        after the marketplace indexer syncs the trade.
                      </div>
                    ) : null}

                    <label className="block mt-4">
                      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
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
                            clampInt(
                              Number(e.target.value || "1"),
                              1,
                              Math.max(1, maxBuy)
                            )
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
                      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
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
                          "inline-flex items-center justify-center px-5 py-3 rounded-2xl text-black font-extrabold transition shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15 hover:brightness-110",
                          buyDisabled ? "opacity-60 cursor-not-allowed" : ""
                        )}
                      >
                        {busy === "buy" ? "Buying…" : "Buy now"}
                      </button>

                      <div className="text-[12px] text-white/55 font-semibold">
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
                <div className="text-[12px] font-black text-white/80 uppercase tracking-wider">
                  Recent trades
                </div>
                <div className="mt-1 text-[12px] text-white/50">
                  Latest fills for this NFT.
                </div>
              </div>

              <div className="text-[12px] text-white/55 font-semibold">
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
                        <span className="ml-2 text-white/35 font-black">•</span>
                        <span className="ml-2 text-white/70 font-black">x{t.amount}</span>
                      </div>

                      <div className="text-[11px] text-white/40">
                        {new Date(t.blockTime).toLocaleString("en-GB")}
                      </div>
                    </div>

                    <div className="mt-2 text-[12px] text-white/55">
                      {shortAddr(t.sellerWallet)} → {shortAddr(t.buyerWallet)}
                      <span className="ml-2 text-white/35">•</span>
                      <span className="ml-2 text-white/70 font-black">
                        {marketLabel(t.marketType || explicitMarketType || "STANDARD")}
                      </span>
                      <span className="ml-2 text-white/35">•</span>
                      <a
                        className="ml-2 text-amber-100/90 hover:text-amber-100 font-black"
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
            listings, trades and delivery orders.
          </div>
        </div>
      </div>
    </div>
  );
}