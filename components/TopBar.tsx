"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useBalance, useChainId, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { formatUnits } from "viem";
import { cn } from "@/lib/utils";
import WalletMenu from "./WalletMenu";

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtBalance(value?: string) {
  if (!value) return "0";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";
  return n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ state }: { state: "ok" | "warn" | "off" }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        "ring-[3px] ring-white/[0.06]",
        state === "ok"
          ? "bg-emerald-400"
          : state === "warn"
            ? "bg-rose-400"
            : "bg-white/25",
      )}
    />
  );
}

function OrdersIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M8 7.75h8M8 12h8M8 16.25h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7 3.75h8.4c1.22 0 1.83 0 2.31.237.422.207.764.549.971.971.237.48.237 1.09.237 2.31v9.464c0 1.22 0 1.83-.237 2.31a2.25 2.25 0 0 1-.971.971c-.48.237-1.09.237-2.31.237H8.6c-1.22 0-1.83 0-2.31-.237a2.25 2.25 0 0 1-.971-.971c-.237-.48-.237-1.09-.237-2.31V6.75l1.918-1.919C7.293 4.538 7.44 4.39 7.626 4.286c.165-.093.343-.156.528-.187.209-.035.416-.035.71-.035Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M7 3.75v2.1c0 .56 0 .84.109 1.054.096.188.249.34.437.437.214.109.494.109 1.054.109h2.15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Gold border pill — wraps the network status widget
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
        "relative overflow-hidden rounded-[20px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.36),rgba(201,168,76,0.16),rgba(184,135,10,0.10))]",
        "shadow-[0_14px_60px_rgba(0,0,0,0.32)]",
        className,
      )}
    >
      <div
        className={cn(
          "relative rounded-[20px]",
          "border border-white/[0.08]",
          "bg-[#0a0806]/72 backdrop-blur-2xl",
        )}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Network status content ───────────────────────────────────────────────────

type NetworkStatusContentProps = {
  mounted: boolean;
  connected: boolean;
  wrongNetwork: boolean;
  hasGas: boolean;
  networkTitle: string;
  balanceLabel: string;
  dotState: "ok" | "warn" | "off";
  isFetching: boolean;
  isSwitching: boolean;
  canSwitch: boolean;
  onRefresh: () => void;
  onSwitch: () => void;
};

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
  canSwitch,
  onRefresh,
  onSwitch,
}: NetworkStatusContentProps) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5">
      <StatusDot state={dotState} />

      <span className="whitespace-nowrap text-sm font-semibold">
        {mounted ? (connected ? networkTitle : "Wallet") : "Wallet"}
      </span>

      {mounted && connected && !wrongNetwork && (
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
            hasGas
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/20 bg-rose-500/10 text-rose-300",
          )}
        >
          {hasGas ? "Gas OK" : "No gas"}
        </span>
      )}

      <span className="ml-1 truncate text-xs text-white/55">
        Balance:{" "}
        <span className="font-semibold text-white/85">{balanceLabel}</span>
      </span>

      <button
        type="button"
        onClick={onRefresh}
        disabled={!mounted || !connected || isFetching}
        className={cn(
          "ml-1 h-8 w-8 shrink-0 rounded-xl",
          "border border-white/10 bg-white/[0.05]",
          "text-xs font-semibold transition hover:bg-white/10",
          "disabled:opacity-35",
        )}
        title="Refresh balance"
        aria-label="Refresh balance"
      >
        {isFetching ? "…" : "↻"}
      </button>

      {mounted && wrongNetwork && (
        <button
          type="button"
          disabled={!canSwitch || isSwitching}
          onClick={onSwitch}
          className={cn(
            "h-8 shrink-0 rounded-xl px-3 text-xs font-bold",
            "text-[#0a0806]",
            "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_50%,#b8870a_100%)]",
            "shadow-[0_10px_40px_rgba(212,175,55,0.15)]",
            "transition hover:brightness-110 disabled:opacity-55",
          )}
          title={
            !canSwitch
              ? "This wallet cannot switch automatically"
              : "Switch to Base Sepolia"
          }
        >
          {isSwitching ? "Switching…" : "Switch"}
        </button>
      )}
    </div>
  );
}

// ─── Brand link ───────────────────────────────────────────────────────────────

function BrandLink() {
  return (
    <Link href="/" className="group inline-flex min-w-0 items-center gap-3">
      {/* Mobile: mark only */}
      <span
        className={cn(
          "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full",
          "border border-white/10 bg-black",
          "shadow-[0_12px_50px_rgba(0,0,0,0.3)]",
          "sm:hidden",
        )}
      >
        <img
          src="/brand/logo-mark.png"
          alt="Realife"
          className="pointer-events-none h-full w-full scale-[3.2] object-cover mix-blend-screen"
          draggable={false}
        />
      </span>
      {/* Desktop: wordmark */}
      <span className="relative hidden h-12 w-[220px] items-center overflow-visible sm:flex">
        <img
          src="/brand/logo-wordmark.png"
          alt="Realife"
          className="pointer-events-none h-full w-full origin-left scale-[5.0] object-contain object-left mix-blend-screen"
          draggable={false}
        />
      </span>
    </Link>
  );
}

// ─── Skeleton shown before hydration ─────────────────────────────────────────

function TopBarSkeleton() {
  return (
    <div className="border-b border-white/10 bg-[#0a0806]/65 backdrop-blur-2xl">
      <div className="mx-auto w-full max-w-[1760px] px-4 py-3 sm:px-6 lg:px-8 2xl:px-10">
        {/* Mobile skeleton */}
        <div className="flex items-center justify-between gap-3 md:hidden">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-full border border-white/10 bg-white/5" />
            <span className="h-7 w-36 rounded-xl border border-white/10 bg-white/5" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl border border-white/10 bg-white/5" />
            <div className="h-9 w-9 rounded-2xl border border-white/10 bg-white/5" />
          </div>
        </div>
        {/* Desktop skeleton */}
        <div className="hidden md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-4">
          <div className="h-9 w-44 rounded-xl border border-white/10 bg-white/5" />
          <div className="h-10 w-[380px] rounded-[20px] border border-white/10 bg-white/5" />
          <div className="ml-auto flex gap-2">
            <div className="h-9 w-28 rounded-2xl border border-white/10 bg-white/5" />
            <div className="h-9 w-36 rounded-2xl border border-white/10 bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export default function TopBar() {
  const mounted = useMounted();

  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();

  const { data: balanceData, isLoading, refetch, isFetching } = useBalance({
    address,
    chainId: chainId ?? baseSepolia.id,
    query: {
      enabled: mounted && Boolean(address),
      refetchInterval: 12_000,
    },
  });

  const connected = mounted && Boolean(address);
  const wrongNetwork = connected && chainId !== baseSepolia.id;

  const balanceEth = useMemo(() => {
    if (!mounted || !balanceData) return 0;
    const n = Number(formatUnits(balanceData.value, balanceData.decimals));
    return Number.isFinite(n) ? n : 0;
  }, [mounted, balanceData]);

  const hasGas = connected && !wrongNetwork && balanceEth > 0;

  const balanceLabel = useMemo(() => {
    if (!mounted || !connected) return "—";
    if (isLoading) return "loading…";
    if (!balanceData) return `0 ${baseSepolia.nativeCurrency?.symbol ?? "ETH"}`;
    return `${fmtBalance(formatUnits(balanceData.value, balanceData.decimals))} ${balanceData.symbol ?? "ETH"}`;
  }, [mounted, connected, isLoading, balanceData]);

  const networkTitle = !mounted || !connected
    ? "Connect wallet"
    : wrongNetwork
      ? "Wrong network"
      : "Base Sepolia";

  const dotState: "ok" | "warn" | "off" =
    !mounted || !connected ? "off" : wrongNetwork ? "warn" : "ok";

  const showGetEth = mounted && connected && (wrongNetwork || !hasGas);
  const canSwitch = typeof switchChainAsync === "function";

  const statusProps: NetworkStatusContentProps = {
    mounted,
    connected,
    wrongNetwork,
    hasGas,
    networkTitle,
    balanceLabel,
    dotState,
    isFetching,
    isSwitching,
    canSwitch,
    onRefresh: () => void refetch(),
    onSwitch: () => {
      if (canSwitch) void switchChainAsync({ chainId: baseSepolia.id }).catch(() => {});
    },
  };

  // Render skeleton on server / before hydration to avoid layout shift
  if (!mounted) {
    return (
      <header className="relative z-50 w-full">
        <TopBarSkeleton />
      </header>
    );
  }

  return (
    <header className="relative z-50 w-full">
      {/* Soft top glow */}
      <div className="pointer-events-none absolute inset-x-0 -top-20 z-0 mx-auto h-20 w-[700px] rounded-full bg-[#C9A84C]/12 blur-3xl" aria-hidden />

      <div className="relative border-b border-white/10 bg-[#0a0806]/65 backdrop-blur-2xl">
        <div className="mx-auto w-full max-w-[1760px] px-4 py-3 sm:px-6 lg:px-8 2xl:px-10">

          {/* ── Mobile layout ─────────────────────────────────────── */}
          <div className="flex flex-col gap-3 md:hidden">
            <div className="flex items-center justify-between gap-3">
              <BrandLink />
              <div className="flex items-center gap-2">
                <Link
                  href="/app/orders"
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-xl",
                    "border border-white/10 bg-white/[0.05] backdrop-blur-xl",
                    "text-white/75 transition hover:bg-white/10 hover:text-white",
                  )}
                  aria-label="My Orders"
                >
                  <OrdersIcon className="h-[17px] w-[17px]" />
                </Link>
                {showGetEth && (
                  <Link
                    href="/app/faucet"
                    className={cn(
                      "inline-flex h-9 items-center rounded-xl px-3",
                      "border border-white/10 bg-white/[0.05]",
                      "text-sm font-semibold transition hover:bg-white/10",
                    )}
                  >
                    Get ETH
                  </Link>
                )}
                <WalletMenu />
              </div>
            </div>
            <GoldEdgeWrap>
              <NetworkStatusContent {...statusProps} />
            </GoldEdgeWrap>
          </div>

          {/* ── Desktop layout ────────────────────────────────────── */}
          <div className="hidden md:grid md:grid-cols-[minmax(200px,1fr)_auto_minmax(280px,1fr)] md:items-center md:gap-4">
            <BrandLink />

            <GoldEdgeWrap className="w-full max-w-[420px]">
              <NetworkStatusContent {...statusProps} />
            </GoldEdgeWrap>

            <div className="flex items-center justify-end gap-2">
              <Link
                href="/app/orders"
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-xl px-3.5",
                  "border border-white/10 bg-white/[0.05] backdrop-blur-xl",
                  "text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white",
                )}
              >
                <OrdersIcon className="h-[16px] w-[16px]" />
                <span>My Orders</span>
              </Link>

              {showGetEth && (
                <Link
                  href="/app/faucet"
                  className={cn(
                    "inline-flex h-9 items-center rounded-xl px-3.5",
                    "border border-white/10 bg-white/[0.05]",
                    "text-sm font-medium transition hover:bg-white/10",
                  )}
                >
                  Get ETH ↗
                </Link>
              )}

              <WalletMenu />
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}