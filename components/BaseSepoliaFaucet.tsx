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
    return `${fmtEth(formatUnits(balanceData.value, balanceData.decimals))} ${balanceData.symbol ?? "ETH"}`;
  }, [mounted, connected, isLoading, balanceData]);

  const balanceEth = useMemo(() => {
    if (!mounted || !balanceData) return 0;
    const n = Number(formatUnits(balanceData.value, balanceData.decimals));
    return Number.isFinite(n) ? n : 0;
  }, [mounted, balanceData]);

  const hasGas = connected && !wrongNetwork && balanceEth > 0;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
            Faucet · Base Sepolia
          </p>
          <p className="mt-1 text-sm font-semibold text-white/85">
            {connected ? (wrongNetwork ? "Wrong network" : "Base Sepolia ready") : "Connect wallet"}
          </p>
          <p className="mt-1.5 text-xs text-white/40">
            Balance: <span className="font-semibold text-white/65">{balanceLabel}</span>
            {connected && !wrongNetwork && (
              <span className={cn(
                "ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                hasGas
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-300",
              )}>
                {hasGas ? "Gas OK" : "No gas"}
              </span>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!connected ? (
            <button
              type="button"
              onClick={() => openConnectModal?.()}
              className="px-3.5 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.05] hover:bg-white/10 transition text-sm font-medium text-white/75"
            >
              Connect
            </button>
          ) : wrongNetwork ? (
            <button
              type="button"
              disabled={isSwitching}
              onClick={() => switchChainAsync({ chainId: baseSepolia.id }).catch(() => {})}
              className="px-3.5 py-1.5 rounded-xl text-[#0a0806] text-sm font-bold bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_50%,#b8870a_100%)] transition hover:brightness-105 disabled:opacity-50"
            >
              {isSwitching ? "Switching…" : "Switch network"}
            </button>
          ) : (
            <Link
              href="/app/faucet"
              className="px-3.5 py-1.5 rounded-xl text-[#0a0806] text-sm font-bold bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_50%,#b8870a_100%)] transition hover:brightness-105"
            >
              Faucet ETH/USDC ↗
            </Link>
          )}

          <button
            type="button"
            onClick={() => refetch()}
            disabled={!mounted || !connected || isFetching}
            className="px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] transition text-sm text-white/50 disabled:opacity-40"
          >
            {isFetching ? "..." : "↺"}
          </button>
        </div>
      </div>

      <p className="mt-3 pt-3 border-t border-white/[0.06] text-[11px] text-white/28">
        Switch → Claim test ETH/USDC → Refresh → Mint
      </p>
    </div>
  );
}