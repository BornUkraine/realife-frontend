"use client";

import { useMemo, useState } from "react";
import { useAccount, useChainId, useSwitchChain, usePublicClient, useWriteContract, useReadContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { parseUnits, formatUnits } from "viem";

import { erc1155CoreAbi } from "@/lib/erc1155CoreAbi";
import { marketplaceSpot1155Abi } from "@/lib/realifeMarketplaceSpot1155Abi";

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

function clampBigint(x: bigint, min: bigint, max: bigint) {
  if (x < min) return min;
  if (x > max) return max;
  return x;
}

export default function QuickList1155({
  chainId,
  contract,
  tokenId,
  maxAmountHint,
  name,
}: {
  chainId: number;
  contract: string;
  tokenId: string;
  maxAmountHint?: string; // from DB holdings (string)
  name?: string | null;
}) {
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

  const tokenIdBI = useMemo(() => {
    try {
      return BigInt(tokenId);
    } catch {
      return 0n;
    }
  }, [tokenId]);

  const hintMax = useMemo(() => {
    try {
      return BigInt(maxAmountHint || "0");
    } catch {
      return 0n;
    }
  }, [maxAmountHint]);

  // on-chain balance (truth)
  const { data: balanceRaw } = useReadContract({
    abi: erc1155CoreAbi,
    address: nftAddr as `0x${string}`,
    functionName: "balanceOf",
    args: [((address || "0x0000000000000000000000000000000000000000") as `0x${string}`), tokenIdBI],
    query: {
      enabled: Boolean(address && nftAddr.startsWith("0x")),
    },
  });

  const balance = useMemo(() => {
    try {
      return BigInt(balanceRaw as any);
    } catch {
      return 0n;
    }
  }, [balanceRaw]);

  const maxAmount = balance > 0n ? balance : hintMax;

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

  const isApproved = Boolean(approvedRaw);
  const needSwitch = isConnected && currentChainId !== chainId;

  // modal
  const [open, setOpen] = useState(false);

  // form
  const [amountStr, setAmountStr] = useState("1");
  const [priceEth, setPriceEth] = useState("0.01");

  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function ensureChain() {
    if (needSwitch) {
      await switchChainAsync?.({ chainId });
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
        args: [MARKETPLACE_ADDRESS as `0x${string}`, true],
      });

      await publicClient?.waitForTransactionReceipt({ hash });
      await refetchApproved();
      setOk("Approved ✅");
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
    setOk(null);
    setBusy("list");

    try {
      await ensureChain();

      const amtRaw = BigInt(String(amountStr || "0"));
      const amt = clampBigint(amtRaw, 1n, maxAmount > 0n ? maxAmount : 1n);
      const priceWei = parseUnits(String(priceEth || "0"), 18);

      const hash = await writeContractAsync({
        abi: marketplaceSpot1155Abi,
        address: MARKETPLACE_ADDRESS as `0x${string}`,
        functionName: "list1155",
        args: [nftAddr as `0x${string}`, tokenIdBI, amt, priceWei],
      });

      await publicClient?.waitForTransactionReceipt({ hash });

      setOk(`Listed ✅ (# pending indexer)`);
      // закрываем модалку чуть позже — как хочешь
      // setOpen(false);
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Listing failed");
    } finally {
      setBusy(null);
    }
  }

  const disabledList =
    !isConnected ||
    !hasMarketplace ||
    needSwitch ||
    !isApproved ||
    maxAmount <= 0n ||
    busy !== null;

  const title = name || `Token #${tokenId}`;

  return (
    <>
      {/* Button (to place on card) */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setErr(null);
          setOk(null);
          setOpen(true);
        }}
        className={cx(
          "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl",
          "text-[12px] font-extrabold",
          "text-black",
          "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
          "shadow-[0_18px_60px_rgba(212,175,55,0.16)]",
          "ring-1 ring-black/15",
          "hover:brightness-110 hover:-translate-y-px active:translate-y-0 transition"
        )}
        title="List item"
      >
        List
        <span className="inline-flex items-center justify-center h-5 px-2 rounded-full text-[10px] font-black text-black/80 bg-black/10 ring-1 ring-black/10">
          ↗
        </span>
      </button>

      {/* Modal */}
      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

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
                      Create listing
                    </div>
                    <div className="mt-2 text-xl font-black tracking-tight text-white/90 truncate">
                      {title}
                    </div>
                    <div className="mt-2 text-[12px] text-white/55">
                      Contract: <span className="font-mono">{shortAddr(nftAddr)}</span> • Token:{" "}
                      <span className="font-mono">#{tokenId}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setOpen(false)}
                    className="shrink-0 px-3 py-2 rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] transition text-[12px] font-black text-white/80"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">You own</div>
                    <div className="mt-1 text-[16px] font-black text-emerald-200">{maxAmount.toString()}</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Marketplace</div>
                    <div className="mt-1 text-[12px] font-mono font-black text-white/80 truncate">
                      {hasMarketplace ? shortAddr(MARKETPLACE_ADDRESS) : "missing env"}
                    </div>
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

                {/* Connect / Switch / Approve */}
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

                  {isConnected && hasMarketplace && !isApproved ? (
                    <button
                      disabled={busy !== null}
                      onClick={approveAll}
                      className={cx(
                        "inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 font-extrabold transition",
                        busy ? "opacity-60 cursor-not-allowed" : ""
                      )}
                    >
                      {busy === "approve" ? "Approving…" : "Approve marketplace"}
                    </button>
                  ) : null}

                  {isConnected && isApproved ? (
                    <div className="text-[12px] text-white/55 font-semibold">
                      Approved ✅
                    </div>
                  ) : null}
                </div>

                {/* Form */}
                <div className="mt-6 grid md:grid-cols-2 gap-3">
                  <label className="block">
                    <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Amount</div>
                    <input
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      type="number"
                      min={1}
                      max={maxAmount > 0n ? Number(maxAmount) : 1}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/90 outline-none focus:border-white/20"
                    />
                    <div className="mt-1 text-[11px] text-white/40">
                      Max: {maxAmount.toString()}
                    </div>
                  </label>

                  <label className="block">
                    <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Price per unit (ETH)</div>
                    <input
                      value={priceEth}
                      onChange={(e) => setPriceEth(e.target.value)}
                      type="text"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/90 outline-none focus:border-white/20"
                      placeholder="0.01"
                    />
                    <div className="mt-1 text-[11px] text-white/40">
                      Per-unit. Total = price * amount.
                    </div>
                  </label>
                </div>

                {/* Action */}
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <button
                    disabled={disabledList}
                    onClick={listNow}
                    className={cx(
                      "inline-flex items-center justify-center px-6 py-3 rounded-2xl text-black font-extrabold transition",
                      "shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15",
                      "hover:brightness-110",
                      disabledList ? "opacity-60 cursor-not-allowed" : ""
                    )}
                  >
                    {busy === "list" ? "Listing…" : "Create listing"}
                  </button>

                  <div className="text-[12px] text-white/55 font-semibold">
                    Total (est):{" "}
                    <span className="text-amber-100 font-black">
                      {fmtEthWei(
                        (() => {
                          try {
                            const amt = BigInt(String(amountStr || "0"));
                            const p = parseUnits(String(priceEth || "0"), 18);
                            return p * (amt > 0n ? amt : 1n);
                          } catch {
                            return null;
                          }
                        })()
                      )}{" "}
                      ETH
                    </span>
                  </div>
                </div>

                <div className="mt-5 text-[11px] text-white/35">
                  After listing, your indexer may take a few seconds (confirmations) to show it in Trading.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}