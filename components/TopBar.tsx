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

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");

    const apply = () => setIsDesktop(mq.matches);
    apply();

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }

    mq.addListener(apply);
    return () => mq.removeListener(apply);
  }, []);

  return isDesktop;
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
        "inline-block h-2 w-2 rounded-full",
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
        "relative overflow-hidden rounded-[22px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.40),rgba(212,175,55,0.18),rgba(184,135,10,0.12))]",
        "shadow-[0_18px_70px_rgba(0,0,0,0.35)]",
        className
      )}
    >
      <div
        className={cn(
          "relative rounded-[22px]",
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
  const refreshGlyph = !mounted ? "↻" : isFetching ? "…" : "↻";

  return (
    <div className="relative px-3.5 py-2.5">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.10),transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_115%,rgba(255,255,255,0.06),transparent_55%)]" />
      </div>

      <div className="relative flex items-center gap-2.5">
        <StatusDot state={dotState} />

        <div className="whitespace-nowrap text-sm font-semibold">
          {mounted ? (connected ? networkTitle : "Wallet") : "Wallet"}
        </div>

        {mounted && connected && !wrongNetwork ? (
          <span
            className={cn(
              "ml-0.5 rounded-full border px-2 py-1 text-[11px] font-semibold",
              hasGas
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/20 bg-rose-500/10 text-rose-200"
            )}
          >
            {hasGas ? "Gas OK" : "No gas"}
          </span>
        ) : null}

        <span className="ml-1 truncate text-xs text-white/65">
          Balance:{" "}
          <span className="font-semibold text-white/90">{balanceLabel}</span>
        </span>

        <button
          type="button"
          onClick={onRefresh}
          disabled={!mounted || !connected || isFetching}
          className={cn(
            "ml-1 h-9 w-9 rounded-xl",
            "border border-white/10 bg-white/[0.06] backdrop-blur-2xl",
            "text-xs font-semibold transition hover:bg-white/10",
            "disabled:opacity-40"
          )}
          title="Refresh balance"
        >
          {refreshGlyph}
        </button>

        {mounted && wrongNetwork ? (
          <button
            type="button"
            disabled={!canSwitch || isSwitching}
            onClick={onSwitch}
            className={cn(
              "h-9 rounded-xl px-3 text-xs font-extrabold",
              "text-black",
              "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
              "shadow-[0_18px_60px_rgba(212,175,55,0.18)]",
              "ring-1 ring-black/15",
              "transition hover:brightness-110 disabled:opacity-60"
            )}
            title={
              !canSwitch
                ? "This wallet cannot switch network automatically"
                : "Switch network"
            }
          >
            {isSwitching ? "Switching…" : "Switch"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function BrandLink() {
  return (
    <Link
      href="/"
      className="group relative inline-flex min-w-0 items-center gap-3"
    >
      <span
        className={cn(
          "relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full",
          "border border-white/10 bg-black",
          "shadow-[0_18px_70px_rgba(0,0,0,0.25)] ring-1 ring-black/10",
          "sm:hidden"
        )}
      >
        <img
          src="/brand/logo-mark.png"
          alt="Realife"
          className="pointer-events-none h-full w-full scale-[3.2] object-cover mix-blend-screen"
          draggable={false}
        />
      </span>

      <span className="relative hidden h-14 w-[250px] items-center overflow-visible sm:flex">
        <img
          src="/brand/logo-wordmark.png"
          alt="Realife"
          className={cn(
            "pointer-events-none h-full w-full origin-left object-contain object-left",
            "mix-blend-screen scale-[5.4]"
          )}
          draggable={false}
        />
      </span>
    </Link>
  );
}

function LoadingHeader() {
  return (
    <div className="relative border-b border-white/10 bg-[#0b0a09]/60 backdrop-blur-2xl">
      <div className="mx-auto w-full max-w-[1720px] px-4 py-3 sm:px-6 lg:px-8 2xl:px-10">
        <div className="flex items-center justify-between gap-3 md:hidden">
          <div className="flex items-center gap-3">
            <span className="h-11 w-11 rounded-full border border-white/10 bg-white/5" />
            <span className="h-8 w-40 rounded-xl border border-white/10 bg-white/5" />
          </div>
          <div className="h-10 w-36 rounded-2xl border border-white/10 bg-white/5" />
        </div>

        <div className="hidden md:grid md:grid-cols-[minmax(220px,1fr)_auto_minmax(220px,1fr)] md:items-center md:gap-4">
          <div className="flex items-center">
            <span className="h-10 w-48 rounded-xl border border-white/10 bg-white/5" />
          </div>
          <div className="flex justify-center">
            <div className="h-11 w-[420px] rounded-[22px] border border-white/10 bg-white/5" />
          </div>
          <div className="flex justify-end">
            <div className="h-10 w-40 rounded-2xl border border-white/10 bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TopBar() {
  const mounted = useMounted();
  const isDesktop = useIsDesktop();

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
    const s = formatUnits(balanceData.value, balanceData.decimals);
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }, [mounted, balanceData]);

  const hasGas = connected && !wrongNetwork && balanceEth > 0;

  const balanceLabel = useMemo(() => {
    if (!mounted || !connected) return "—";
    if (isLoading) return "loading…";
    if (!balanceData) {
      return `0 ${baseSepolia.nativeCurrency?.symbol ?? "ETH"}`;
    }
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

  const showGetEth = mounted
    ? connected
      ? wrongNetwork || !hasGas
      : false
    : false;

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
    onRefresh: () => {
      void refetch();
    },
    onSwitch: () => {
      if (!canSwitch) return;
      void switchChainAsync({ chainId: baseSepolia.id }).catch(() => {});
    },
  };

  if (!mounted) {
    return (
      <header className="relative z-50 w-full">
        <LoadingHeader />
      </header>
    );
  }

  return (
    <header className="relative z-50 w-full">
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-24 w-[820px] rounded-full bg-[#d4af37]/14 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-24 w-[560px] rounded-full bg-white/[0.06] blur-2xl" />

        <div className="relative border-b border-white/10 bg-[#0b0a09]/60 backdrop-blur-2xl">
          <div className="mx-auto w-full max-w-[1720px] px-4 py-3 sm:px-6 lg:px-8 2xl:px-10">
            {!isDesktop ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <BrandLink />

                  <div className="relative z-30 flex items-center gap-2">
                    {showGetEth ? (
                      <Link
                        href="/app/faucet"
                        className={cn(
                          "inline-flex h-10 items-center justify-center rounded-2xl px-3",
                          "border border-white/12 bg-white/[0.06] backdrop-blur-2xl",
                          "shadow-[0_18px_70px_rgba(0,0,0,0.28)] ring-1 ring-black/10",
                          "text-sm font-semibold transition hover:-translate-y-[1px] hover:bg-white/10"
                        )}
                      >
                        Get ETH
                      </Link>
                    ) : null}

                    <WalletMenu />
                  </div>
                </div>

                <div className="mt-3">
                  <GoldEdgeWrap>
                    <NetworkStatusContent {...statusProps} />
                  </GoldEdgeWrap>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-[minmax(220px,1fr)_auto_minmax(220px,1fr)] items-center gap-4">
                <div className="min-w-0">
                  <BrandLink />
                </div>

                <div className="flex min-w-0 justify-center">
                  <GoldEdgeWrap className="w-full max-w-[430px]">
                    <NetworkStatusContent {...statusProps} />
                  </GoldEdgeWrap>
                </div>

                <div className="flex items-center justify-end gap-2">
                  {showGetEth ? (
                    <Link
                      href="/app/faucet"
                      className={cn(
                        "inline-flex h-10 items-center justify-center rounded-2xl px-4",
                        "border border-white/12 bg-white/[0.06] backdrop-blur-2xl",
                        "shadow-[0_18px_70px_rgba(0,0,0,0.28)] ring-1 ring-black/10",
                        "text-sm font-semibold transition hover:-translate-y-[1px] hover:bg-white/10"
                      )}
                    >
                      Get ETH ↗
                    </Link>
                  ) : null}

                  <WalletMenu />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
