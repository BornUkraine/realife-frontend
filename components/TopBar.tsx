"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useBalance, useChainId, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { formatUnits } from "viem";
import { cn } from "@/lib/utils";
import WalletMenu from "./WalletMenu";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function fmtBalance(value?: string) {
  if (!value) return "0";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";
  return n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function StatusDot({ state }: { state: "ok" | "warn" | "off" }) {
  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full",
        state === "ok"
          ? "bg-emerald-400"
          : state === "warn"
          ? "bg-rose-400"
          : "bg-white/30",
        "shadow-[0_0_0_3px_rgba(255,255,255,0.06)]"
      )}
    />
  );
}

function GoldEdgeWrap({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl p-px overflow-hidden",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.40),rgba(212,175,55,0.18),rgba(184,135,10,0.12))]",
        "shadow-[0_18px_70px_rgba(0,0,0,0.35)]",
        className
      )}
    >
      <div
        className={cn(
          "relative rounded-2xl",
          "border border-white/10",
          "bg-[#0b0a09]/70 backdrop-blur-2xl",
          "ring-1 ring-black/10"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function NetworkStatusContent({
  mounted,
  connected,
  wrongNetwork,
  hasGas,
  networkTitle,
  balanceLabel,
  dotState,
  isFetching,
  isSwitching,
  onRefresh,
  onSwitch,
}: any) {
  const refreshGlyph = !mounted ? "↻" : isFetching ? "…" : "↻";

  return (
    <div className="relative px-3 py-2">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.10),transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_115%,rgba(255,255,255,0.06),transparent_55%)]" />
      </div>

      <div className="relative flex items-center gap-2">
        <StatusDot state={dotState} />

        <div className="text-sm font-semibold whitespace-nowrap">
          {mounted ? (connected ? networkTitle : "Wallet") : "Wallet"}
        </div>

        {mounted && connected && !wrongNetwork ? (
          <span
            className={cn(
              "ml-1 text-xs font-semibold px-2 py-1 rounded-full border",
              hasGas
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                : "bg-rose-500/10 border-rose-500/20 text-rose-200"
            )}
          >
            {hasGas ? "Gas OK" : "No gas"}
          </span>
        ) : null}

        <span className="ml-2 text-xs text-white/65 truncate">
          Balance: <span className="text-white/90 font-semibold">{balanceLabel}</span>
        </span>

        <button
          type="button"
          onClick={onRefresh}
          disabled={!mounted || !connected || isFetching}
          className={cn(
            "ml-2 h-9 w-9 rounded-xl",
            "border border-white/10 bg-white/[0.06] backdrop-blur-2xl",
            "hover:bg-white/10 transition text-xs font-semibold",
            "disabled:opacity-40"
          )}
          title="Refresh balance"
        >
          {refreshGlyph}
        </button>

        {mounted && wrongNetwork ? (
          <button
            type="button"
            disabled={isSwitching}
            onClick={onSwitch}
            className={cn(
              "h-9 px-3 rounded-xl text-xs font-extrabold",
              "text-black",
              "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
              "shadow-[0_18px_60px_rgba(212,175,55,0.18)]",
              "ring-1 ring-black/15",
              "hover:brightness-110 disabled:opacity-60 transition"
            )}
          >
            {isSwitching ? "Switching…" : "Switch"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function TopBar() {
  const mounted = useMounted();
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();

  const { data: balanceData, isLoading, refetch, isFetching } = useBalance({
    address,
    chainId: baseSepolia.id,
    query: { enabled: mounted && Boolean(address), refetchInterval: 12_000 },
  });

  const connected = mounted && Boolean(address);
  const wrongNetwork = connected && chainId !== baseSepolia.id;

  const balanceEth = useMemo(() => {
    if (!mounted || !balanceData) return 0;
    const s = formatUnits(balanceData.value, balanceData.decimals);
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }, [mounted, balanceData]);

  const hasGas = connected && !wrongNetwork && balanceEth > 0;

  const balanceLabel = useMemo(() => {
    if (!mounted || !connected) return "—";
    if (isLoading) return "loading…";
    if (!balanceData) return `0 ${baseSepolia.nativeCurrency?.symbol ?? "ETH"}`;
    const s = formatUnits(balanceData.value, balanceData.decimals);
    return `${fmtBalance(s)} ${balanceData.symbol ?? "ETH"}`;
  }, [mounted, connected, isLoading, balanceData]);

  const networkTitle = !mounted
    ? "Connect wallet"
    : !connected
    ? "Connect wallet"
    : wrongNetwork
    ? "Wrong network"
    : "Base Sepolia";

  const dotState: "ok" | "warn" | "off" = !mounted
    ? "off"
    : !connected
    ? "off"
    : wrongNetwork
    ? "warn"
    : "ok";

  const showGetEth = mounted ? (connected ? wrongNetwork || !hasGas : false) : false;

  const statusProps = {
    mounted,
    connected,
    wrongNetwork,
    hasGas,
    networkTitle,
    balanceLabel,
    dotState,
    isFetching,
    isSwitching,
    onRefresh: () => refetch(),
    onSwitch: () => switchChainAsync({ chainId: baseSepolia.id }).catch(() => {}),
  };

  return (
    <header className="w-full">
      <div className="relative">
        {/* premium glows */}
        <div className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-24 w-[820px] rounded-full bg-[#d4af37]/14 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-24 w-[560px] rounded-full bg-white/[0.06] blur-2xl" />

        <div className="relative border-b border-white/10 bg-[#0b0a09]/60 backdrop-blur-2xl">
          <div className="mx-auto w-full max-w-7xl px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              {/* brand: click -> HOME (/) */}
              <Link href="/" className="inline-flex items-center gap-3 min-w-0">
                {/* mobile: mark (фон чисто черный, зум 2.2) */}
                <span
                  className={cn(
                    "sm:hidden h-11 w-11 rounded-2xl overflow-hidden flex items-center justify-center",
                    "bg-black border border-white/10 backdrop-blur-2xl", 
                    "shadow-[0_18px_70px_rgba(0,0,0,0.25)] ring-1 ring-black/10"
                  )}
                >
                  <img
                    src="/brand/logo-mark.png"
                    alt="Realife"
                    className="h-full w-full object-cover mix-blend-screen scale-[2.2]" 
                    draggable={false}
                  />
                </span>

                {/* desktop: wordmark (зум выкручен до 3.5) */}
                <span className="hidden sm:flex relative w-56 h-10 ml-2 overflow-hidden items-center">
                  <img
                    src="/brand/logo-wordmark.png"
                    alt="Realife"
                    className={cn(
                      "w-full h-full object-contain object-left", 
                      "mix-blend-screen scale-[3.5] origin-left" 
                    )}
                    draggable={false}
                  />
                </span>
              </Link>

              {/* desktop status */}
              <div className="hidden md:flex items-center gap-2 min-w-0">
                <GoldEdgeWrap>
                  <NetworkStatusContent {...statusProps} />
                </GoldEdgeWrap>

                {showGetEth ? (
                  <Link
                    href="/app/faucet"
                    className={cn(
                      "h-10 inline-flex items-center justify-center px-4 rounded-2xl",
                      "border border-white/12 bg-white/[0.06] backdrop-blur-2xl",
                      "shadow-[0_18px_70px_rgba(0,0,0,0.28)] ring-1 ring-black/10",
                      "hover:bg-white/10 hover:-translate-y-[1px] transition",
                      "text-sm font-semibold"
                    )}
                  >
                    Get ETH ↗
                  </Link>
                ) : null}
              </div>

              {/* right */}
              <div className="flex items-center gap-2">
                {showGetEth ? (
                  <Link
                    href="/app/faucet"
                    className={cn(
                      "md:hidden h-10 inline-flex items-center justify-center px-3 rounded-2xl",
                      "border border-white/12 bg-white/[0.06] backdrop-blur-2xl",
                      "shadow-[0_18px_70px_rgba(0,0,0,0.28)] ring-1 ring-black/10",
                      "hover:bg-white/10 hover:-translate-y-[1px] transition",
                      "text-sm font-semibold"
                    )}
                  >
                    Get ETH
                  </Link>
                ) : null}

                <WalletMenu />
              </div>
            </div>

            {/* mobile status */}
            <div className="md:hidden mt-3">
              <GoldEdgeWrap>
                <NetworkStatusContent {...statusProps} />
              </GoldEdgeWrap>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}