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
import { parseUnits, formatUnits } from "viem";

import { erc1155CoreAbi } from "@/lib/erc1155CoreAbi";
import { marketplaceSpot1155Abi } from "@/lib/realifeMarketplaceSpot1155Abi";

type MarketType = "STANDARD" | "DELIVERY";
type ContractView =
  | "publicStandard"
  | "publicDelivery"
  | "cafe"
  | "store"
  | "unknown";

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

function shortAddr(addr?: string | null) {
  if (!addr) return "—";
  const s = String(addr);
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function fmtEthWei(wei?: bigint | null) {
  try {
    if (wei == null) return "—";
    const s = formatUnits(wei, 18);
    const [a, b] = s.split(".");
    if (!b) return a;
    const bb = b.slice(0, 6).replace(/0+$/, "");
    return bb ? `${a}.${bb}` : a;
  } catch {
    return "—";
  }
}

function parsePriceWeiSafe(v: string) {
  try {
    const x = parseUnits(String(v || "0"), 18);
    return x > 0n ? x : null;
  } catch {
    return null;
  }
}

function marketLabel(mt: MarketType) {
  return mt === "DELIVERY" ? "DELIVERY" : "STANDARD";
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

function forcedMarketTypeByContractView(view: ContractView): MarketType | null {
  switch (view) {
    case "publicDelivery":
      return "DELIVERY";
    case "publicStandard":
    case "cafe":
    case "store":
      return "STANDARD";
    default:
      return null;
  }
}

export default function QuickList1155({
  chainId,
  contract,
  tokenId,
  maxAmountHint,
  name,
  deliveryEnabled,
  physicalItemIncluded,
  marketTypeHint,
  preferredMarketType,
}: {
  chainId: number;
  contract: string;
  tokenId: string;
  maxAmountHint?: string;
  name?: string | null;
  deliveryEnabled?: boolean;
  physicalItemIncluded?: boolean;
  marketTypeHint?: MarketType;
  preferredMarketType?: MarketType;
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
      process.env.NEXT_PUBLIC_REALIFE_MARKETPLACE_STANDARD_ADDRESS ||
        process.env.NEXT_PUBLIC_REALIFE_MARKETPLACE_ADDRESS ||
        process.env.NEXT_PUBLIC_MARKETPLACE_STANDARD_ADDRESS ||
        process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS ||
        ""
    );
  }, []);

  const DELIVERY_MARKETPLACE_ADDRESS = useMemo(() => {
    return toLower(
      process.env.NEXT_PUBLIC_REALIFE_MARKETPLACE_DELIVERY_ADDRESS ||
        process.env.NEXT_PUBLIC_MARKETPLACE_DELIVERY_ADDRESS ||
        process.env.NEXT_PUBLIC_DELIVERY_MARKETPLACE_ADDRESS ||
        ""
    );
  }, []);

  const nftAddr = useMemo(() => toLower(contract), [contract]);
  const needSwitch = isConnected && currentChainId !== chainId;

  const contractView = useMemo(() => classifyContractView(nftAddr), [nftAddr]);

  const forcedMarketType = useMemo(
    () => forcedMarketTypeByContractView(contractView),
    [contractView]
  );

  const tokenIdBI = useMemo(() => {
    try {
      return BigInt(tokenId);
    } catch {
      return 0n;
    }
  }, [tokenId]);

  const hintMax = useMemo(() => toBigIntSafe(maxAmountHint), [maxAmountHint]);

  const inferredMarketType: MarketType = useMemo(() => {
    if (forcedMarketType) return forcedMarketType;
    if (preferredMarketType) return preferredMarketType;
    if (marketTypeHint) return marketTypeHint;
    if (deliveryEnabled || physicalItemIncluded) return "DELIVERY";
    return "STANDARD";
  }, [
    forcedMarketType,
    preferredMarketType,
    marketTypeHint,
    deliveryEnabled,
    physicalItemIncluded,
  ]);

  const marketplaceAddress = useMemo(() => {
    return inferredMarketType === "DELIVERY"
      ? DELIVERY_MARKETPLACE_ADDRESS
      : STANDARD_MARKETPLACE_ADDRESS;
  }, [
    inferredMarketType,
    DELIVERY_MARKETPLACE_ADDRESS,
    STANDARD_MARKETPLACE_ADDRESS,
  ]);

  const hasMarketplace = marketplaceAddress.startsWith("0x");

  const { data: balanceRaw } = useReadContract({
    abi: erc1155CoreAbi,
    address: (
      nftAddr || "0x0000000000000000000000000000000000000000"
    ) as `0x${string}`,
    functionName: "balanceOf",
    args: [
      (
        (address || "0x0000000000000000000000000000000000000000") as `0x${string}`
      ),
      tokenIdBI,
    ],
    query: { enabled: Boolean(address && nftAddr.startsWith("0x")) },
  });

  const balance = useMemo(() => {
    try {
      return BigInt(balanceRaw as any);
    } catch {
      return 0n;
    }
  }, [balanceRaw]);

  const maxAmountBI = balance > 0n ? balance : hintMax;

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
        (address || "0x0000000000000000000000000000000000000000") as `0x${string}`
      ),
      (
        (marketplaceAddress ||
          "0x0000000000000000000000000000000000000000") as `0x${string}`
      ),
    ],
    query: { enabled: Boolean(address && hasMarketplace && nftAddr.startsWith("0x")) },
  });

  const isApproved = Boolean(approvedRaw);

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(1);
  const [priceEth, setPriceEth] = useState("0.01");
  const [busy, setBusy] = useState<"approve" | "list" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const title = name || `Token #${tokenId}`;

  const priceWei = useMemo(() => parsePriceWeiSafe(priceEth), [priceEth]);

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

  function closeModal() {
    setOpen(false);
    setErr(null);
    setOk(null);
    setBusy(null);
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

  async function ensureChain() {
    if (needSwitch) {
      await switchChainAsync?.({ chainId });
    }
  }

  async function revalidateAfterList() {
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
  }

  async function approveAll() {
    if (!isConnected) return openConnectModal?.();
    if (!hasMarketplace) return;

    setErr(null);
    setOk(null);
    setBusy("approve");

    try {
      await ensureChain();

      const hash = await writeContractAsync({
        abi: erc1155CoreAbi,
        address: nftAddr as `0x${string}`,
        functionName: "setApprovalForAll",
        args: [marketplaceAddress as `0x${string}`, true],
      });

      await publicClient?.waitForTransactionReceipt({ hash });
      await refetchApproved();

      setOk(`${marketLabel(inferredMarketType)} marketplace approved ✅`);
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Approve failed");
    } finally {
      setBusy(null);
    }
  }

  async function listNow() {
    if (!isConnected) return openConnectModal?.();
    if (!hasMarketplace) return;
    if (!priceWei) {
      setErr("Enter valid price");
      return;
    }

    setErr(null);
    setOk(null);
    setBusy("list");

    try {
      await ensureChain();

      const amt = BigInt(clampInt(amount, 1, Math.max(1, maxAmount)));

      const hash = await writeContractAsync({
        abi: marketplaceSpot1155Abi,
        address: marketplaceAddress as `0x${string}`,
        functionName: "list1155",
        args: [nftAddr as `0x${string}`, tokenIdBI, amt, priceWei],
      });

      await publicClient?.waitForTransactionReceipt({ hash });

      await revalidateAfterList();
      router.refresh();

      setOk(`Listed on ${marketLabel(inferredMarketType)} ✅`);

      setTimeout(() => {
        closeModal();
      }, 700);
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Listing failed");
    } finally {
      setBusy(null);
    }
  }

  const disabledOpen = maxAmountBI <= 0n;
  const disabledApprove =
    busy !== null || !isConnected || needSwitch || !hasMarketplace || isApproved;
  const disabledList =
    busy !== null ||
    !isConnected ||
    needSwitch ||
    !hasMarketplace ||
    !isApproved ||
    maxAmountBI <= 0n ||
    !priceWei;

  const missingEnvText =
    inferredMarketType === "DELIVERY"
      ? "Missing delivery marketplace env (NEXT_PUBLIC_REALIFE_MARKETPLACE_DELIVERY_ADDRESS)"
      : "Missing standard marketplace env (NEXT_PUBLIC_REALIFE_MARKETPLACE_ADDRESS or NEXT_PUBLIC_MARKETPLACE_ADDRESS)";

  const infoNote = useMemo(() => {
    switch (contractView) {
      case "publicDelivery":
        return {
          className:
            "border border-violet-500/20 bg-violet-500/10 text-violet-100",
          text: (
            <>
              This NFT belongs to the delivery-enabled public mint contract and
              should be listed in the{" "}
              <span className="font-black">DELIVERY</span> market.
            </>
          ),
        };

      case "store":
        return {
          className:
            "border border-sky-500/20 bg-sky-500/10 text-sky-100",
          text: (
            <>
              Realife Store secondary resale is{" "}
              <span className="font-black">TRADING ONLY</span>. Delivery is{" "}
              <span className="font-black">not available</span> in trading.
            </>
          ),
        };

      case "cafe":
        return {
          className:
            "border border-amber-500/20 bg-amber-500/10 text-amber-100",
          text: (
            <>
              Realife Cafe secondary resale is{" "}
              <span className="font-black">TRADING ONLY</span>. Redemption is{" "}
              <span className="font-black">not available</span> in trading.
            </>
          ),
        };

      case "publicStandard":
        return {
          className:
            "border border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
          text: (
            <>
              This NFT belongs to the standard public mint contract and should be
              listed in the <span className="font-black">STANDARD</span> market.
            </>
          ),
        };

      default:
        return null;
    }
  }, [contractView]);

  const headerBadges = useMemo(() => {
    switch (contractView) {
      case "store":
        return [
          {
            label: "TRADING ONLY",
            className:
              "border border-white/10 bg-white/[0.06] text-white/80",
          },
          {
            label: "NO DELIVERY",
            className:
              "border border-sky-500/20 bg-sky-500/10 text-sky-100",
          },
        ];

      case "cafe":
        return [
          {
            label: "TRADING ONLY",
            className:
              "border border-white/10 bg-white/[0.06] text-white/80",
          },
          {
            label: "NO REDEMPTION",
            className:
              "border border-amber-500/20 bg-amber-500/10 text-amber-100",
          },
        ];

      default:
        return [];
    }
  }, [contractView]);

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
          "inline-flex items-center justify-center px-3 py-2 rounded-xl",
          "text-[12px] font-extrabold transition",
          disabledOpen
            ? "border border-white/10 bg-white/[0.04] text-white/45 cursor-not-allowed"
            : "text-black bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] shadow-[0_18px_60px_rgba(212,175,55,0.16)] ring-1 ring-black/15 hover:brightness-110"
        )}
        title="List"
      >
        List
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          onClick={closeModal}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              closeModal();
            }}
            className="absolute top-4 right-4 z-[101] h-11 w-11 rounded-full border border-white/12 bg-white/[0.08] hover:bg-white/[0.12] transition flex items-center justify-center text-white/85 text-lg font-black"
            title="Close"
          >
            ✕
          </button>

          <div
            className="relative w-full max-w-[420px] rounded-[34px] p-px overflow-hidden bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))] shadow-[0_34px_130px_rgba(0,0,0,0.70)]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="rounded-[34px] overflow-hidden border border-white/10 bg-[#0b0a09]/82 backdrop-blur-2xl ring-1 ring-black/10">
              <div className="p-5">
                <div className="text-center">
                  <div className="text-[18px] font-black text-white/95">{title}</div>
                  <div className="mt-2 text-[12px] text-white/55">
                    {shortAddr(nftAddr)} • #{tokenId}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full border border-white/10 bg-white/[0.06] text-[10px] font-black text-white/80">
                      {marketLabel(inferredMarketType)}
                    </span>

                    {headerBadges.map((badge) => (
                      <span
                        key={badge.label}
                        className={cx(
                          "inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-black",
                          badge.className
                        )}
                      >
                        {badge.label}
                      </span>
                    ))}
                  </div>
                </div>

                {infoNote ? (
                  <div
                    className={cx(
                      "mt-4 rounded-2xl px-4 py-3 text-[12px] text-center",
                      infoNote.className
                    )}
                  >
                    {infoNote.text}
                  </div>
                ) : null}

                {!hasMarketplace ? (
                  <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-[12px] text-rose-100 text-center">
                    {missingEnvText}
                  </div>
                ) : null}

                {err ? (
                  <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-[12px] text-rose-100 text-center">
                    {err}
                  </div>
                ) : null}

                {ok ? (
                  <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[12px] text-emerald-100 text-center">
                    {ok}
                  </div>
                ) : null}

                {!isConnected ? (
                  <button
                    onClick={() => openConnectModal?.()}
                    className="mt-4 w-full inline-flex items-center justify-center px-5 py-3 rounded-2xl text-black font-extrabold hover:brightness-110 transition shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
                  >
                    Connect Wallet
                  </button>
                ) : null}

                {needSwitch ? (
                  <button
                    onClick={() => switchChainAsync?.({ chainId })}
                    className="mt-4 w-full inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 font-extrabold transition text-white"
                  >
                    Switch Chain
                  </button>
                ) : null}

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                    <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                      You own
                    </div>
                    <div className="mt-1 text-[15px] font-black text-emerald-200">
                      {maxAmountBI.toString()}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                    <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                      Approval
                    </div>
                    <div className="mt-1 text-[15px] font-black text-white/90">
                      {isApproved ? "Approved" : "Required"}
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAmount(1)}
                      className={cx(
                        "h-11 rounded-2xl border text-sm font-black transition",
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
                        "h-11 rounded-2xl border text-sm font-black transition",
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
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-center text-base font-black text-white/95 outline-none focus:border-white/20"
                  />
                </div>

                <div className="mt-4">
                  <input
                    value={priceEth}
                    onChange={(e) => setPriceEth(e.target.value)}
                    type="text"
                    placeholder="0.01"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-center text-base font-black text-white/95 outline-none focus:border-white/20"
                  />
                  <div className="mt-2 text-center text-[12px] text-white/45">
                    Price per unit in ETH
                  </div>
                </div>

                <div className="mt-4 text-center text-[13px] font-black text-amber-100">
                  Total: {fmtEthWei(totalPriceWei)} ETH
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    disabled={disabledApprove}
                    onClick={approveAll}
                    className={cx(
                      "h-12 rounded-2xl font-extrabold transition border",
                      isApproved
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                        : "border-white/15 bg-white/[0.06] text-white hover:bg-white/10",
                      disabledApprove ? "opacity-60 cursor-not-allowed" : ""
                    )}
                  >
                    {busy === "approve"
                      ? "Approving..."
                      : isApproved
                      ? "Approved"
                      : "Approve"}
                  </button>

                  <button
                    disabled={disabledList}
                    onClick={listNow}
                    className={cx(
                      "h-12 rounded-2xl font-extrabold transition text-black",
                      "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.20)] hover:brightness-110",
                      disabledList ? "opacity-60 cursor-not-allowed" : ""
                    )}
                  >
                    {busy === "list" ? "Listing..." : "List"}
                  </button>
                </div>

                <div className="mt-5 text-[11px] text-white/35 text-center">
                  After listing, indexer may take a few seconds. Market data refreshes automatically.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}