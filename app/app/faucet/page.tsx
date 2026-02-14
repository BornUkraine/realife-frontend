"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useAccount, useBalance, useChainId, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatUnits } from "viem";

import AppShell from "@/components/AppShell";

const FAUCETS = [
  { name: "Alchemy Base Sepolia Faucet", url: "https://www.alchemy.com/faucets/base-sepolia" },
  { name: "EthFaucet (Base Sepolia)", url: "https://ethfaucet.com/networks/base/base-sepolia" },
  { name: "LearnWeb3 Base Sepolia Faucet", url: "https://learnweb3.io/faucets/base_sepolia/" },
  { name: "QuickNode Faucet (Base Sepolia)", url: "https://faucet.quicknode.com/base/sepolia" },
  { name: "Optimism Console Faucet", url: "https://console.optimism.io/faucet" },
] as const;

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function shortAddr(a?: `0x${string}`) {
  if (!a) return "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function fmtEth(value?: string) {
  if (!value) return "0";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";
  return n.toFixed(5).replace(/0+$/, "").replace(/\.$/, "");
}

function StatusDot({ state }: { state: "ok" | "warn" | "off" }) {
  const cls =
    state === "ok" ? "bg-emerald-400" : state === "warn" ? "bg-rose-400" : "bg-white/30";
  return (
    <span
      className={[
        "inline-block h-2 w-2 rounded-full",
        cls,
        "shadow-[0_0_0_3px_rgba(255,255,255,0.06)]",
      ].join(" ")}
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
      className={[
        "relative rounded-[34px] p-px overflow-hidden",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.40),rgba(212,175,55,0.18),rgba(184,135,10,0.12))]",
        "shadow-[0_28px_110px_rgba(0,0,0,0.60)]",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "relative rounded-[34px] overflow-hidden",
          "border border-white/10",
          "bg-[#0b0a09]/70 backdrop-blur-2xl",
          "ring-1 ring-black/10",
          "before:pointer-events-none before:absolute before:inset-0",
          "before:bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.12),transparent_45%)]",
          "after:pointer-events-none after:absolute after:inset-0",
          "after:bg-[radial-gradient(circle_at_85%_115%,rgba(255,255,255,0.06),transparent_55%)]",
        ].join(" ")}
      >
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.06] backdrop-blur-2xl text-[11px] font-semibold text-white/70 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
      {children}
    </div>
  );
}

export default function FaucetPage() {
  const mounted = useMounted();
  const { openConnectModal } = useConnectModal();

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();

  const connected = mounted ? isConnected : false;
  const effectiveChainId = mounted ? chainId : undefined;

  const wrongNetwork = connected && effectiveChainId !== baseSepolia.id;

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

  const dotState: "ok" | "warn" | "off" = !mounted
    ? "off"
    : !connected
    ? "off"
    : wrongNetwork
    ? "warn"
    : "ok";

  const title = !mounted
    ? "Connect wallet"
    : !connected
    ? "Connect wallet"
    : wrongNetwork
    ? "Wrong network"
    : "Base Sepolia";

  const sidebarTopBadge = (
    <GoldEdgeWrap className="rounded-3xl">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white/60">Gas helper</div>
            <div className="mt-2 flex items-center gap-2">
              <StatusDot state={dotState} />
              <div className="text-sm font-extrabold truncate">{title}</div>
            </div>
            <div className="mt-2 text-xs text-white/70">
              Balance: <span className="text-white font-semibold">{balanceLabel}</span>
            </div>
            <div className="mt-2 text-[11px] text-white/55 leading-relaxed">
              {mounted && connected
                ? wrongNetwork
                  ? "Switch to Base Sepolia to mint."
                  : hasGas
                  ? "Gas OK — you can mint."
                  : "Request test ETH and refresh."
                : "Connect wallet to enable one-click switching."}
            </div>
          </div>

          <div className="shrink-0 h-10 w-10 rounded-2xl border border-white/10 bg-white/[0.06] flex items-center justify-center text-[#d4af37] shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
            ⛽
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={!mounted || !connected || isFetching}
            className="h-10 px-4 rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/10 transition text-sm font-semibold disabled:opacity-50"
          >
            {!mounted ? "Refresh" : isFetching ? "Refreshing…" : "Refresh"}
          </button>

          {mounted && connected && wrongNetwork ? (
            <button
              type="button"
              disabled={isSwitching}
              onClick={() => switchChainAsync({ chainId: baseSepolia.id }).catch(() => {})}
              className="h-10 px-4 rounded-2xl text-black font-extrabold hover:brightness-110 transition disabled:opacity-60 shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
            >
              {isSwitching ? "Switching…" : "Switch"}
            </button>
          ) : null}
        </div>
      </div>
    </GoldEdgeWrap>
  );

  const sidebarBottom = (
    <div className="space-y-3">
      <GoldEdgeWrap className="rounded-3xl">
        <div className="p-4">
          <p className="text-xs font-semibold text-white/60 mb-2">Quick steps</p>
          <ul className="text-[12px] text-white/70 space-y-2 leading-relaxed">
            <li>
              <span className="text-white/85 font-semibold">1)</span> Switch to{" "}
              <b>Base Sepolia</b>
            </li>
            <li>
              <span className="text-white/85 font-semibold">2)</span> Open a faucet and request{" "}
              <b>test ETH</b>
            </li>
            <li>
              <span className="text-white/85 font-semibold">3)</span> Return and press{" "}
              <b>Refresh</b>
            </li>
          </ul>
          <div className="mt-3 text-[11px] text-white/50">
            Tip: after claiming, wait 10–60s (testnet) and refresh.
          </div>
        </div>
      </GoldEdgeWrap>

      <Link
        href="/app/create"
        className="block w-full text-center px-5 py-3 rounded-2xl text-black font-extrabold hover:brightness-110 transition shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
      >
        Back to Mint
      </Link>
    </div>
  );

  return (
    <AppShell
      title="REALIFE"
      subtitle="Faucet • Base Sepolia"
      sidebarTopBadge={sidebarTopBadge}
      sidebarBottom={sidebarBottom}
    >
      {/* HERO CARD */}
      <GoldEdgeWrap className="rounded-[46px]">
        <div className="relative overflow-hidden">
          {/* extra scene glows */}
          <div className="pointer-events-none absolute -top-40 -right-40 h-[720px] w-[720px] rounded-full bg-[#d4af37]/14 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-56 -left-56 h-[820px] w-[820px] rounded-full bg-white/[0.06] blur-3xl" />

          {/* subtle grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.22) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />

          <div className="relative p-8 md:p-12">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="min-w-0">
                <Pill>
                  <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
                  Faucet ETH • Base Sepolia
                </Pill>

                <h1 className="mt-5 text-4xl md:text-5xl font-black leading-[1.05] tracking-[-0.02em]">
                  Get test ETH{" "}
                  <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]">
                    for gas
                  </span>
                </h1>

                <p className="mt-3 text-sm md:text-base text-white/70 max-w-2xl leading-relaxed">
                  Для минта нужен небольшой баланс <b>test ETH</b> в сети <b>Base Sepolia</b>.
                  Нажми <b>Switch</b> если сеть неправильная, затем открой любой faucet ниже.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {!connected ? (
                  <button
                    type="button"
                    onClick={() => openConnectModal?.()}
                    className="h-11 px-6 rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/10 transition font-semibold shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                  >
                    Connect wallet
                  </button>
                ) : (
                  <div className="h-11 inline-flex items-center px-5 rounded-2xl border border-white/10 bg-white/[0.06] text-sm font-semibold shadow-[0_18px_70px_rgba(0,0,0,0.28)]">
                    {shortAddr(address)}
                  </div>
                )}
              </div>
            </div>

            {/* STATUS STRIP — luxury */}
            <div className="mt-8 rounded-[38px] p-px overflow-hidden bg-[linear-gradient(135deg,rgba(247,231,167,0.30),rgba(212,175,55,0.14),rgba(184,135,10,0.10))]">
              <div className="rounded-[38px] border border-white/10 bg-[#0b0a09]/55 backdrop-blur-2xl p-5 md:p-6 shadow-[0_26px_90px_rgba(0,0,0,0.45)]">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusDot state={dotState} />
                      <div className="text-sm font-extrabold">{title}</div>

                      {mounted && connected && !wrongNetwork ? (
                        <span
                          className={[
                            "ml-2 text-xs font-semibold px-2.5 py-1 rounded-full border",
                            hasGas
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                              : "bg-rose-500/10 border-rose-500/20 text-rose-200",
                          ].join(" ")}
                        >
                          {hasGas ? "Gas OK" : "No gas"}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 text-xs text-white/70">
                      Base Sepolia balance:{" "}
                      <span className="text-white font-semibold">{balanceLabel}</span>
                    </div>

                    <div className="mt-1 text-[11px] text-white/55">
                      {mounted && connected
                        ? wrongNetwork
                          ? "Switch network to Base Sepolia to mint."
                          : hasGas
                          ? "Ready — go mint."
                          : "Request test ETH below, then Refresh."
                        : "Connect wallet to see balance + enable switch."}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => refetch()}
                      disabled={!mounted || !connected || isFetching}
                      className="h-11 px-5 rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/10 transition text-sm font-semibold disabled:opacity-50 shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                    >
                      {!mounted ? "Refresh" : isFetching ? "Refreshing…" : "Refresh"}
                    </button>

                    {mounted && connected && wrongNetwork ? (
                      <button
                        type="button"
                        disabled={isSwitching}
                        onClick={() =>
                          switchChainAsync({ chainId: baseSepolia.id }).catch(() => {})
                        }
                        className="h-11 px-5 rounded-2xl text-black font-extrabold hover:brightness-110 transition disabled:opacity-60 shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
                      >
                        {isSwitching ? "Switching…" : "Switch to Base Sepolia"}
                      </button>
                    ) : null}

                    <Link
                      href="/app/create"
                      className="h-11 px-5 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/10 transition text-sm font-semibold shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                    >
                      Open Create
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* FAUCETS GRID — premium tiles */}
            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FAUCETS.map((f, idx) => (
                <a
                  key={f.url}
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className={[
                    "group relative rounded-[30px] p-px overflow-hidden",
                    "bg-[linear-gradient(135deg,rgba(247,231,167,0.24),rgba(212,175,55,0.12),rgba(184,135,10,0.08))]",
                    "shadow-[0_22px_80px_rgba(0,0,0,0.45)]",
                    "transition duration-300 hover:-translate-y-[2px] hover:brightness-110",
                  ].join(" ")}
                >
                  <div className="relative rounded-[30px] border border-white/10 bg-[#0b0a09]/55 backdrop-blur-2xl p-5 overflow-hidden">
                    <div className="pointer-events-none absolute inset-0 opacity-90">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(212,175,55,0.10),transparent_45%)]" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_120%,rgba(255,255,255,0.06),transparent_55%)]" />
                    </div>

                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold leading-snug">
                          {f.name}
                        </div>
                        <div className="mt-2 text-[11px] text-white/60 break-all">
                          {f.url}
                        </div>
                      </div>

                      <div className="shrink-0 h-10 w-10 rounded-2xl border border-white/10 bg-white/[0.06] flex items-center justify-center text-[#d4af37] shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
                        ↗
                      </div>
                    </div>

                    <div className="relative mt-4 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.06] text-white/70">
                        Open faucet <span className="text-[#d4af37]">•</span> Request ETH
                      </div>

                      <div className="text-[11px] text-white/45">
                        #{String(idx + 1).padStart(2, "0")}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <div className="mt-6 text-xs text-white/55">
              Tip: если faucet спрашивает сеть — выбирай <b>Base Sepolia</b>. После пополнения
              нажми <b>Refresh</b>. Testnet only.
            </div>
          </div>
        </div>
      </GoldEdgeWrap>
    </AppShell>
  );
}
