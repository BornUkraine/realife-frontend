"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useBalance, useChainId, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatUnits } from "viem";
import { cn } from "@/lib/utils";

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

function fmtEth(value?: string) {
  if (!value) return "0";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";
  return n.toFixed(5).replace(/0+$/, "").replace(/\.$/, "");
}

export default function BaseSepoliaFaucet() {
  const mounted = useMounted();
  const { openConnectModal } = useConnectModal();

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();

  const connected = mounted ? isConnected : false;
  const wrongNetwork = connected && chainId !== baseSepolia.id;

  const { data: balanceData, isLoading, isFetching, refetch } = useBalance({
    address,
    chainId: baseSepolia.id,
    query: { enabled: Boolean(address), refetchInterval: 12_000 },
  });

  const balanceLabel = useMemo(() => {
    if (!mounted || !connected) return "—";
    if (isLoading) return "loading…";
    if (!balanceData) return `0 ${baseSepolia.nativeCurrency?.symbol ?? "ETH"}`;
    const s = formatUnits(balanceData.value, balanceData.decimals);
    return `${fmtEth(s)} ${balanceData.symbol ?? "ETH"}`;
  }, [mounted, connected, isLoading, balanceData]);

  const balanceEth = useMemo(() => {
    if (!mounted || !balanceData) return 0;
    const s = formatUnits(balanceData.value, balanceData.decimals);
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }, [mounted, balanceData]);

  const hasGas = connected && !wrongNetwork && balanceEth > 0;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-5 shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white/60">Gas • Base Sepolia</p>
          <p className="mt-1 text-sm font-extrabold">
            {connected ? (wrongNetwork ? "Wrong network" : "Base Sepolia ready") : "Connect wallet"}
          </p>

          <p className="mt-2 text-xs text-white/70">
            Balance: <span className="text-white font-semibold">{balanceLabel}</span>{" "}
            {connected && !wrongNetwork ? (
              <span
                className={cn(
                  "ml-2 inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold",
                  hasGas
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-200"
                )}
              >
                {hasGas ? "Gas OK" : "No gas"}
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!connected ? (
            <button
              type="button"
              onClick={() => openConnectModal?.()}
              className="px-4 py-2 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm font-semibold"
            >
              Connect
            </button>
          ) : wrongNetwork ? (
            <button
              type="button"
              disabled={isSwitching}
              onClick={() => switchChainAsync({ chainId: baseSepolia.id }).catch(() => {})}
              className="px-4 py-2 rounded-2xl bg-[#d4af37] text-black font-extrabold hover:brightness-110 transition disabled:opacity-60"
            >
              {isSwitching ? "Switching…" : "Switch to Base Sepolia"}
            </button>
          ) : (
            <Link
              href="/app/faucet"
              className="px-4 py-2 rounded-2xl bg-[#d4af37] text-black font-extrabold hover:brightness-110 transition"
            >
              Faucet ↗
            </Link>
          )}

          <button
            type="button"
            onClick={() => refetch()}
            disabled={!mounted || !connected || isFetching}
            className="px-4 py-2 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm font-semibold disabled:opacity-50"
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-white/55">
        Flow: Switch → Request test ETH → Refresh → Mint.
      </p>
    </div>
  );
}
