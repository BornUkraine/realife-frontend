"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useBalance, useChainId, useDisconnect, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatUnits } from "viem";
import { cn } from "@/lib/utils";

function shortAddr(a?: `0x${string}` | string) {
  if (!a) return "";
  return `${a.slice(0, 4)}…${a.slice(-4)}`;
}

function fmtEth(value?: string) {
  if (!value) return "0";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";
  // pill — чуть короче, чтобы не шумело
  return n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

function useOnClickOutsideAndEsc(onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return ref;
}

export default function WalletMenu() {
  const mounted = useMounted();

  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();

  // keep stable first paint
  const connected = mounted ? isConnected : false;
  const needsBaseSepolia = connected && chainId !== baseSepolia.id;

  const { data: balanceData, isLoading: balLoading } = useBalance({
    address,
    chainId: baseSepolia.id,
    query: { enabled: Boolean(address), refetchInterval: 12_000 },
  });

  const balLabel = useMemo(() => {
    if (!mounted || !connected) return "—";
    if (balLoading) return "loading…";
    if (!balanceData) return `0 ${baseSepolia.nativeCurrency?.symbol ?? "ETH"}`;
    const raw = formatUnits(balanceData.value, balanceData.decimals);
    return `${fmtEth(raw)} ${balanceData.symbol ?? "ETH"}`;
  }, [mounted, connected, balLoading, balanceData]);

  // compact label for pill
  const pillBalance = useMemo(() => {
    if (!mounted || !connected) return "";
    if (balLoading) return "…";
    if (!balanceData) return "0 ETH";
    const raw = formatUnits(balanceData.value, balanceData.decimals);
    return `${fmtEth(raw)} ${balanceData.symbol ?? "ETH"}`;
  }, [mounted, connected, balLoading, balanceData]);

  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const wrapRef = useOnClickOutsideAndEsc(close);

  const onSwitch = useCallback(async () => {
    try {
      await switchChainAsync({ chainId: baseSepolia.id });
    } catch {}
  }, [switchChainAsync]);

  const onPillClick = useCallback(() => {
    if (!mounted) return;
    if (!connected) {
      openConnectModal?.();
      return;
    }
    setOpen((v) => !v);
  }, [mounted, connected, openConnectModal]);

  const itemBase =
    "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-2xl " +
    "text-sm font-semibold text-white/85 " +
    "transition duration-200 " +
    "hover:bg-white/[0.06] hover:text-white " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/25";

  return (
    <div ref={wrapRef} className="relative">
      {/* PILL — matches TopBar status block + shows mini balance */}
      <button
        type="button"
        onClick={onPillClick}
        className={cn(
          "relative h-10",
          "rounded-2xl p-px overflow-hidden",
          "bg-[linear-gradient(135deg,rgba(247,231,167,0.40),rgba(212,175,55,0.18),rgba(184,135,10,0.12))]",
          "shadow-[0_18px_70px_rgba(0,0,0,0.35)]"
        )}
      >
        <div
          className={cn(
            "relative h-full rounded-2xl",
            "border border-white/10 bg-[#0b0a09]/70 backdrop-blur-2xl",
            "ring-1 ring-black/10",
            "px-3 flex items-center gap-2",
            "transition duration-200 hover:bg-[#0b0a09]/80"
          )}
        >
          {/* inner shine */}
          <div className="pointer-events-none absolute inset-0 opacity-90">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.10),transparent_45%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_115%,rgba(255,255,255,0.06),transparent_55%)]" />
          </div>

          <div className="relative z-10 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xs font-black text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              {/* IMPORTANT: prevent hydration mismatch */}
              {connected && address ? address.slice(2, 3).toUpperCase() : "?"}
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <div className="text-sm font-semibold text-white whitespace-nowrap">
                {connected ? shortAddr(address) : "Connect"}
              </div>

              {/* mini balance (desktop-ish). Only after mount to avoid hydration mismatch */}
              {mounted && connected ? (
                <span className="hidden sm:inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-white/70">
                  {pillBalance}
                </span>
              ) : null}
            </div>

            <div className="text-xs text-white/70 ml-1">▾</div>
          </div>
        </div>
      </button>

      {/* DROPDOWN (lux gold-edge) */}
      {open ? (
        <div
          className={cn(
            "absolute right-0 mt-2 w-[320px]",
            "rounded-3xl p-px overflow-hidden",
            "bg-[linear-gradient(135deg,rgba(247,231,167,0.40),rgba(212,175,55,0.18),rgba(184,135,10,0.12))]",
            "shadow-[0_28px_110px_rgba(0,0,0,0.70)]"
          )}
        >
          <div
            className={cn(
              "relative rounded-3xl overflow-hidden",
              "bg-[#0b0a09]/92 backdrop-blur-2xl",
              "ring-1 ring-white/10",
              "before:pointer-events-none before:absolute before:inset-0",
              "before:bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.16),transparent_45%)]",
              "after:pointer-events-none after:absolute after:inset-0",
              "after:bg-[radial-gradient(circle_at_85%_115%,rgba(255,255,255,0.06),transparent_55%)]"
            )}
          >
            <div className="relative">
              {/* HEADER */}
              <div className="px-4 py-3 border-b border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold truncate text-white">
                      {shortAddr(address) || "Wallet"}
                    </div>
                    <div className="text-xs text-white/70 mt-1">
                      Balance:{" "}
                      <span className="text-white/85 font-semibold">{balLabel}</span>
                    </div>
                  </div>

                  {needsBaseSepolia ? (
                    <button
                      type="button"
                      onClick={onSwitch}
                      disabled={isSwitching}
                      className={cn(
                        "px-3 py-2 rounded-xl text-xs font-extrabold",
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

              {/* LINKS */}
              <div className="p-2">
                <Link href="/app/profile" onClick={close} className={itemBase}>
                  <span className="flex items-center gap-3">
                    <span className="text-lg">👤</span>
                    <span>Profile</span>
                  </span>
                  <span className="text-white/35">→</span>
                </Link>

                <Link href="/app/settings" onClick={close} className={itemBase}>
                  <span className="flex items-center gap-3">
                    <span className="text-lg">⚙️</span>
                    <span>Settings</span>
                  </span>
                  <span className="text-white/35">→</span>
                </Link>

                <div className="my-2 h-px bg-white/10" />

                <Link
                  href="/app/faucet"
                  onClick={close}
                  className={cn(itemBase, "bg-white/[0.03]", "hover:bg-white/[0.07]")}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-lg">⛽</span>
                    <span>Get test ETH</span>
                  </span>
                  <span className="text-[#d4af37] font-extrabold">↗</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    disconnect();
                    close();
                  }}
                  className={cn(
                    itemBase,
                    "mt-1",
                    "hover:bg-red-500/12",
                    "text-red-100 hover:text-red-50"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-lg">↩</span>
                    <span>Log out</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
