"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

async function fetchJSON(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j) throw new Error(j?.error || "fetch_failed");
  return j;
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function TradingPanel1155({
  chainId,
  contract,
  tokenId,
}: {
  chainId: number;
  contract: string;
  tokenId: string;
}) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  const { openConnectModal } = useConnectModal();
  const { writeContractAsync } = useWriteContract();

  const MARKETPLACE_ADDRESS = useMemo(() => {
    const a =
      (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS ||
        process.env.NEXT_PUBLIC_MARKETPLACE ||
        process.env.NEXT_PUBLIC_MARKETPLACE_SPOT1155 ||
        "") as string;
    return toLower(a);
  }, []);

  const nftAddr = useMemo(() => toLower(contract), [contract]);
  const me = useMemo(() => toLower(address), [address]);

  const hasMarketplace = Boolean(MARKETPLACE_ADDRESS && MARKETPLACE_ADDRESS.startsWith("0x"));

  // ---------- revalidate tags (same tags as server page) ----------
  const revalidateMarketTags = useCallback(async () => {
    const tags = [`market:nft:${chainId}:${nftAddr}:${tokenId}`, `market:contract:${chainId}:${nftAddr}`];

    try {
      await fetch("/api/revalidate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tags }),
      });
    } catch {
      // ignore
    }
  }, [chainId, nftAddr, tokenId]);

  // ---------- API market data ----------
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<MarketNftResponse | null>(null);

  const refresh = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const url =
        `/api/market/nft?chainId=${encodeURIComponent(String(chainId))}` +
        `&contract=${encodeURIComponent(nftAddr)}` +
        `&tokenId=${encodeURIComponent(String(tokenId))}` +
        `&listingsTake=50&tradesTake=50`;
      const j = (await fetchJSON(url)) as MarketNftResponse;
      setData(j);
    } catch (e: any) {
      setErr(e?.message || "Failed to load market data");
    } finally {
      setLoading(false);
    }
  }, [chainId, nftAddr, tokenId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ---------- reads: balance / approval ----------
  const tokenIdBI = useMemo(() => {
    try {
      return BigInt(tokenId);
    } catch {
      return 0n;
    }
  }, [tokenId]);

  const { data: balanceRaw, refetch: refetchBalance } = useReadContract({
    abi: erc1155CoreAbi,
    address: nftAddr as `0x${string}`,
    functionName: "balanceOf",
    args: [((address || "0x0000000000000000000000000000000000000000") as `0x${string}`), tokenIdBI],
    query: {
      enabled: Boolean(address && nftAddr.startsWith("0x") && tokenIdBI >= 0n),
    },
  });

  const { data: approvedRaw, refetch: refetchApproved } = useReadContract({
    abi: erc1155CoreAbi,
    address: nftAddr as `0x${string}`,
    functionName: "isApprovedForAll",
    args: [
      ((address || "0x0000000000000000000000000000000000000000") as `0x${string}`),
      ((MARKETPLACE_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`),
    ],
    query: {
      enabled: Boolean(address && hasMarketplace && nftAddr.startsWith("0x")),
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

  // ---------- selection / forms ----------
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  // ✅ если выбранный листинг исчез — переключаемся на первый
  useEffect(() => {
    const list = data?.listings || [];
    if (!list.length) {
      setSelectedListingId(null);
      return;
    }
    setSelectedListingId((prev) => {
      if (!prev) return list[0]?.marketplaceListingId ?? null;
      const exists = list.some((x) => x.marketplaceListingId === prev);
      return exists ? prev : list[0]?.marketplaceListingId ?? null;
    });
  }, [data?.listings]);

  const selectedListing = useMemo(() => {
    const list = data?.listings || [];
    if (!list.length) return null;
    if (!selectedListingId) return list[0] || null;
    return list.find((x) => x.marketplaceListingId === selectedListingId) || list[0] || null;
  }, [data?.listings, selectedListingId]);

  const maxBuy = useMemo(() => {
    try {
      if (!selectedListing) return 0;
      return Number(BigInt(selectedListing.amountRemaining));
    } catch {
      return 0;
    }
  }, [selectedListing]);

  const [buyAmount, setBuyAmount] = useState(1);
  useEffect(() => {
    setBuyAmount(1);
  }, [selectedListingId]);

  const [sellAmount, setSellAmount] = useState(1);
  const [sellPriceEth, setSellPriceEth] = useState("0.01");

  const canTradeOnThisChain = currentChainId === chainId;

  // ---------- tx state ----------
  const [busy, setBusy] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const pollAfterTx = useCallback(async () => {
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 2200));
      await Promise.allSettled([refresh(), refetchBalance(), refetchApproved()]);
    }
  }, [refresh, refetchBalance, refetchApproved]);

  async function ensureChain() {
    if (!canTradeOnThisChain) {
      await switchChainAsync?.({ chainId });
    }
  }

  async function afterMarketTx() {
    await revalidateMarketTags();
    router.refresh();
    await Promise.allSettled([refresh(), refetchBalance(), refetchApproved()]);
    await pollAfterTx();
  }

  async function approveAll() {
    if (!isConnected) return openConnectModal?.();
    if (!hasMarketplace) return;

    setErr(null);
    setHint(null);
    setBusy("approve");

    try {
      await ensureChain();

      const hash = await writeContractAsync({
        abi: erc1155CoreAbi,
        address: nftAddr as `0x${string}`,
        functionName: "setApprovalForAll",
        args: [MARKETPLACE_ADDRESS as `0x${string}`, true],
      });

      setHint("Approval sent. Waiting for confirmation…");
      await publicClient?.waitForTransactionReceipt({ hash });

      setHint("Approved ✅");
      await Promise.allSettled([refetchApproved()]);
      setHint(null);
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Approve failed");
    } finally {
      setBusy(null);
    }
  }

  async function listNow() {
    if (!isConnected) return openConnectModal?.();
    if (!hasMarketplace) return;

    setErr(null);
    setHint(null);
    setBusy("list");

    try {
      await ensureChain();

      const amt = BigInt(clampInt(Number(sellAmount || 0), 1, Number(balance > 0n ? balance : 1n)));
      const priceWei = parseUnits(String(sellPriceEth || "0"), 18);

      const hash = await writeContractAsync({
        abi: marketplaceSpot1155Abi,
        address: MARKETPLACE_ADDRESS as `0x${string}`,
        functionName: "list1155",
        args: [nftAddr as `0x${string}`, tokenIdBI, amt, priceWei],
      });

      setHint("Listing sent. Waiting for confirmation…");
      await publicClient?.waitForTransactionReceipt({ hash });

      setHint("Listed ✅ Updating…");
      await afterMarketTx();
      setHint(null);
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Listing failed");
    } finally {
      setBusy(null);
    }
  }

  async function cancelListing(listingId: string) {
    if (!isConnected) return openConnectModal?.();
    if (!hasMarketplace) return;

    setErr(null);
    setHint(null);
    setBusy(`cancel:${listingId}`);

    try {
      await ensureChain();

      const hash = await writeContractAsync({
        abi: marketplaceSpot1155Abi,
        address: MARKETPLACE_ADDRESS as `0x${string}`,
        functionName: "cancel",
        args: [BigInt(listingId)],
      });

      setHint("Cancel sent. Waiting for confirmation…");
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
    if (!hasMarketplace) return;
    if (!selectedListing) return;

    setErr(null);
    setHint(null);
    setBusy("buy");

    try {
      await ensureChain();

      const amt = BigInt(clampInt(Number(buyAmount || 0), 1, Math.max(1, maxBuy)));
      const pricePer = BigInt(selectedListing.pricePerUnitWei);
      const total = pricePer * amt;

      const hash = await writeContractAsync({
        abi: marketplaceSpot1155Abi,
        address: MARKETPLACE_ADDRESS as `0x${string}`,
        functionName: "buy",
        args: [BigInt(selectedListing.marketplaceListingId), amt],
        value: total,
      });

      setHint("Buy sent. Waiting for confirmation…");
      await publicClient?.waitForTransactionReceipt({ hash });

      setHint("Bought ✅ Updating…");
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

  const iAmSellerOfSelected = useMemo(() => {
    if (!selectedListing) return false;
    return toLower(selectedListing.sellerWallet) === me;
  }, [selectedListing, me]);

  return (
    <div className={wrap}>
      <div className={card}>
        <div className="p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 font-black">Trading • ERC-1155</div>
              <div className="mt-2 text-xl md:text-2xl font-black tracking-tight text-white/90">Buy / Sell</div>
              <div className="mt-2 text-[12px] text-white/55">Closed market: only verified Realife NFTs.</div>
            </div>

            <div className="flex items-center gap-2">
              {!hasMarketplace ? (
                <div className="px-3 py-2 rounded-2xl border border-rose-500/25 bg-rose-500/10 text-[11px] font-black text-rose-100">
                  NEXT_PUBLIC_MARKETPLACE_ADDRESS missing
                </div>
              ) : null}

              <button
                onClick={() => refresh()}
                className={cx(
                  "inline-flex items-center justify-center px-4 py-2 rounded-2xl",
                  "border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition",
                  "text-[12px] font-black text-amber-100/90 hover:text-amber-100"
                )}
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

          {/* chain/connect helpers */}
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
                Wallet: <span className="font-mono text-white/80">{shortAddr(address || "")}</span>
              </div>
            ) : null}
          </div>

          {/* stats */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Floor</div>
              <div className="mt-1 text-lg font-black text-amber-100">{fmtEth(stats?.floorWei)} ETH</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Last sale</div>
              <div className="mt-1 text-lg font-black text-white/90">{fmtEth(stats?.lastSaleWei)} ETH</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Active</div>
              <div className="mt-1 text-lg font-black text-white/90">{stats?.activeListings ?? 0}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">You own</div>
              <div className="mt-1 text-lg font-black text-emerald-200">{balance.toString()}</div>
            </div>
          </div>

          {/* SELL */}
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[12px] font-black text-white/80 uppercase tracking-wider">Sell (List)</div>
              {!isApproved && isConnected && hasMarketplace ? (
                <button
                  disabled={busy !== null}
                  onClick={approveAll}
                  className={cx(
                    "inline-flex items-center justify-center px-4 py-2 rounded-2xl",
                    "border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition",
                    "text-[12px] font-black text-amber-100/90 hover:text-amber-100",
                    busy ? "opacity-60 cursor-not-allowed" : ""
                  )}
                >
                  {busy === "approve" ? "Approving…" : "Approve marketplace"}
                </button>
              ) : (
                <div className="text-[12px] text-white/50 font-semibold">
                  {isConnected ? (isApproved ? "Approved ✅" : "Approval required") : "Connect wallet"}
                </div>
              )}
            </div>

            <div className="mt-4 grid md:grid-cols-2 gap-3">
              <label className="block">
                <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Amount</div>
                <input
                  value={sellAmount}
                  onChange={(e) => setSellAmount(clampInt(Number(e.target.value || "1"), 1, Number(balance || 1n)))}
                  type="number"
                  min={1}
                  max={Number(balance || 1n)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/90 outline-none focus:border-white/20"
                  placeholder="1"
                />
                <div className="mt-1 text-[11px] text-white/40">Max: {balance.toString()}</div>
              </label>

              <label className="block">
                <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Price (ETH per unit)</div>
                <input
                  value={sellPriceEth}
                  onChange={(e) => setSellPriceEth(e.target.value)}
                  type="text"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/90 outline-none focus:border-white/20"
                  placeholder="0.01"
                />
                <div className="mt-1 text-[11px] text-white/40">Example: 0.01</div>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                disabled={busy !== null || !isConnected || !hasMarketplace || !canTradeOnThisChain || !isApproved || balance <= 0n}
                onClick={listNow}
                className={cx(
                  "inline-flex items-center justify-center px-5 py-3 rounded-2xl text-black font-extrabold transition",
                  "shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15",
                  "hover:brightness-110",
                  busy ? "opacity-60 cursor-not-allowed" : ""
                )}
              >
                {busy === "list" ? "Listing…" : "List for sale"}
              </button>

              <div className="text-[12px] text-white/55 font-semibold">{balance <= 0n ? "You have 0 balance." : null}</div>
            </div>
          </div>

          {/* BUY */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[12px] font-black text-white/80 uppercase tracking-wider">Buy</div>
              <div className="text-[12px] text-white/55 font-semibold">
                {loading ? "Loading…" : `${data?.listings?.length ?? 0} active listing(s)`}
              </div>
            </div>

            {(!data?.listings || data.listings.length === 0) && !loading ? (
              <div className="mt-4 text-[12px] text-white/60">No active listings yet.</div>
            ) : null}

            {data?.listings?.length ? (
              <div className="mt-4 grid grid-cols-1 gap-2">
                {data.listings.map((l) => {
                  const active = l.marketplaceListingId === (selectedListing?.marketplaceListingId || "");
                  const isMine = toLower(l.sellerWallet) === me;
                  const isCancelling = busy === `cancel:${l.marketplaceListingId}`;

                  return (
                    <div
                      key={l.marketplaceListingId}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedListingId(l.marketplaceListingId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setSelectedListingId(l.marketplaceListingId);
                      }}
                      className={cx(
                        "rounded-2xl border p-4 transition outline-none cursor-pointer",
                        active
                          ? "border-white/18 bg-white/[0.10]"
                          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-extrabold text-white/90">
                          {fmtEth(l.pricePerUnitWei)} ETH{" "}
                          <span className="text-white/35 text-[12px] font-black">per unit</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-[12px] font-black text-white/70">
                            Remaining: <span className="text-white/90">{l.amountRemaining}</span>
                          </div>

                          {isMine ? (
                            <button
                              type="button"
                              disabled={isCancelling || busy !== null || !isConnected || !hasMarketplace}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                cancelListing(l.marketplaceListingId);
                              }}
                              className={cx(
                                "inline-flex items-center justify-center px-3 py-2 rounded-xl",
                                "border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition",
                                "text-[11px] font-black text-white/80",
                                isCancelling || busy !== null ? "opacity-60 cursor-not-allowed" : ""
                              )}
                              title="Cancel this listing"
                            >
                              {isCancelling ? "Cancelling…" : "Cancel"}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-white/55">
                        <span>Seller:</span>
                        <span className="font-mono text-white/80">{shortAddr(l.sellerWallet)}</span>

                        {isMine ? (
                          <span className="ml-2 inline-flex items-center justify-center h-5 px-2 rounded-full text-[10px] font-black text-black/80 bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15">
                            YOUR LISTING
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {selectedListing ? (
              <div className="mt-4 grid md:grid-cols-3 gap-3 items-end">
                <label className="block md:col-span-1">
                  <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Amount</div>
                  <input
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(clampInt(Number(e.target.value || "1"), 1, Math.max(1, maxBuy)))}
                    type="number"
                    min={1}
                    max={Math.max(1, maxBuy)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/90 outline-none focus:border-white/20"
                  />
                  <div className="mt-1 text-[11px] text-white/40">Max: {maxBuy}</div>
                </label>

                <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                  <button
                    disabled={busy !== null || !isConnected || !hasMarketplace || !canTradeOnThisChain || iAmSellerOfSelected}
                    onClick={buyNow}
                    className={cx(
                      "inline-flex items-center justify-center px-5 py-3 rounded-2xl text-black font-extrabold transition",
                      "shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15",
                      "hover:brightness-110",
                      busy ? "opacity-60 cursor-not-allowed" : ""
                    )}
                  >
                    {busy === "buy"
                      ? "Buying…"
                      : `Buy for ~${fmtEth(
                          String(BigInt(selectedListing.pricePerUnitWei) * BigInt(buyAmount || 1))
                        )} ETH`}
                  </button>

                  <div className="text-[12px] text-white/55 font-semibold">Listing #{selectedListing.marketplaceListingId}</div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Trade history mini */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[12px] font-black text-white/80 uppercase tracking-wider">Recent Trades</div>
              <div className="text-[12px] text-white/55 font-semibold">{data?.trades?.length ?? 0}</div>
            </div>

            {data?.trades?.length ? (
              <div className="mt-4 space-y-2">
                {data.trades.slice(0, 6).map((t) => (
                  <div key={`${t.txHash}:${t.logIndex}`} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[12px] font-black text-amber-100">
                        {fmtEth(t.totalPriceWei)} ETH
                        <span className="ml-2 text-white/35 font-black">•</span>
                        <span className="ml-2 text-white/70 font-black">x{t.amount}</span>
                      </div>
                      <div className="text-[11px] text-white/40">{new Date(t.blockTime).toLocaleString("en-GB")}</div>
                    </div>

                    <div className="mt-2 text-[12px] text-white/55">
                      {shortAddr(t.sellerWallet)} → {shortAddr(t.buyerWallet)}
                      <span className="ml-2 text-white/35">•</span>
                      <a
                        className="ml-2 text-amber-100/90 hover:text-amber-100 font-black"
                        href={chainId === 84532 ? `https://sepolia.basescan.org/tx/${t.txHash}` : `https://basescan.org/tx/${t.txHash}`}
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
            Note: after buy/list/cancel, the indexer may take a few seconds (confirmations) to update listings/trades.
          </div>
        </div>
      </div>
    </div>
  );
}