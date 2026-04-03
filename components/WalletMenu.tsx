"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useBalance,
  useChainId,
  useDisconnect,
  useSignMessage,
  useSwitchChain,
} from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatUnits } from "viem";
import { signIn } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  User as UserIcon,
  Image as NftIcon,
  Settings as SettingsIcon,
  Droplet as FaucetIcon,
  LogOut as DisconnectIcon,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";

// ─── Utilities ────────────────────────────────────────────────────────────────

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
      if (!ref.current?.contains(e.target as Node)) onClose();
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

// ─── Types ────────────────────────────────────────────────────────────────────

type MeUser = {
  id?: string;
  walletAddress?: string | null;
  handle?: string | null;
  publicId?: string | null;
  publicUrl?: string | null;
};

function pickPublicKey(u?: MeUser | null) {
  const h = String(u?.handle || "").trim();
  const p = String(u?.publicId || "").trim();
  const handle = h && h !== "tmp" ? h : null;
  const publicId = p && p !== "tmp" ? p : null;
  return handle || publicId || null;
}

// ─── IconBox ──────────────────────────────────────────────────────────────────

function IconBox({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "rose" | "gold" | "red";
}) {
  const toneCls =
    tone === "rose"
      ? "text-rose-300 border-rose-300/20 bg-rose-300/10"
      : tone === "gold"
        ? "text-[#C9A84C] border-[#C9A84C]/20 bg-[#C9A84C]/10"
        : tone === "red"
          ? "text-red-300 border-red-300/20 bg-red-300/10"
          : "text-white/70 border-white/10 bg-white/[0.05]";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        "w-7 h-7 shrink-0 rounded-xl border",
        toneCls,
      )}
    >
      {children}
    </span>
  );
}

// ─── WalletMenu ───────────────────────────────────────────────────────────────

export default function WalletMenu() {
  const mounted = useMounted();

  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();

  // address is more stable than isConnected (avoids flicker on reconnect)
  const connected = mounted && Boolean(address);

  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();

  const needsBaseSepolia = connected && chainId !== baseSepolia.id;

  const { data: balanceData, isLoading: balLoading } = useBalance({
    address,
    chainId: baseSepolia.id,
    query: { enabled: mounted && Boolean(address), refetchInterval: 12_000 },
  });

  const balLabel = useMemo(() => {
    if (!mounted || !connected) return "—";
    if (balLoading) return "loading…";
    if (!balanceData) return `0 ${baseSepolia.nativeCurrency?.symbol ?? "ETH"}`;
    return `${fmtEth(formatUnits(balanceData.value, balanceData.decimals))} ${balanceData.symbol ?? "ETH"}`;
  }, [mounted, connected, balLoading, balanceData]);

  const pillBalance = useMemo(() => {
    if (!mounted || !connected) return "";
    if (balLoading) return "…";
    if (!balanceData) return "0 ETH";
    return `${fmtEth(formatUnits(balanceData.value, balanceData.decimals))} ${balanceData.symbol ?? "ETH"}`;
  }, [mounted, connected, balLoading, balanceData]);

  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const wrapRef = useOnClickOutsideAndEsc(close);

  const onSwitch = useCallback(async () => {
    try { await switchChainAsync({ chainId: baseSepolia.id }); } catch {}
  }, [switchChainAsync]);

  const onPillClick = useCallback(() => {
    if (!mounted) return;
    if (!connected) { openConnectModal?.(); return; }
    setOpen((v) => !v);
  }, [mounted, connected, openConnectModal]);

  // ── /api/me ────────────────────────────────────────────────────────────────

  const [meUser, setMeUser] = useState<MeUser | null>(null);
  const [meLoading, setMeLoading] = useState(false);

  async function serverMe(): Promise<MeUser | null> {
    try {
      const r = await fetch("/api/me", { cache: "no-store" });
      if (!r.ok) return null;
      return ((await r.json().catch(() => null))?.user as MeUser) || null;
    } catch { return null; }
  }

  const myKey = useMemo(() => pickPublicKey(meUser), [meUser]);
  const myNftsHref = useMemo(
    () => (myKey ? `/u/${myKey}/nfts` : "/app/profile"),
    [myKey],
  );

  // Preload /me when menu opens
  useEffect(() => {
    if (!open || meUser || !mounted || !connected || meLoading) return;
    (async () => {
      setMeLoading(true);
      try { const u = await serverMe(); if (u) setMeUser(u); }
      finally { setMeLoading(false); }
    })();
  }, [open, meUser, mounted, connected, meLoading]);

  // ── Auto wallet-verify on connect ─────────────────────────────────────────

  const triedVerifyRef = useRef(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!mounted || !connected || !address || triedVerifyRef.current || verifying) return;
    (async () => {
      const existing = await serverMe();
      if (existing?.walletAddress) {
        setMeUser(existing);
        triedVerifyRef.current = true;
        return;
      }
      triedVerifyRef.current = true;
      setVerifying(true);
      try {
        const nr = await fetch(`/api/auth/wallet/nonce?address=${address}`, { cache: "no-store" });
        const nj = await nr.json();
        if (!nr.ok || !nj?.message) throw new Error("nonce_failed");
        const signature = await signMessageAsync({ message: nj.message });
        const res = await signIn("wallet", {
          redirect: false,
          address,
          signature,
          chainId: String(chainId ?? ""),
        });
        if (res?.error) throw new Error(res.error);
        const after = await serverMe();
        if (after) setMeUser(after);
      } catch {
        triedVerifyRef.current = false; // allow retry
      } finally {
        setVerifying(false);
      }
    })();
  }, [mounted, connected, address, chainId, signMessageAsync, verifying]);

  // ── Shared menu-item class ─────────────────────────────────────────────────

  const itemBase = cn(
    "w-full flex items-center justify-between gap-3",
    "px-3 py-2.5 rounded-xl",
    "text-sm font-medium text-white/70",
    "transition-all duration-150",
    "hover:bg-white/[0.055] hover:text-white",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/30",
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div ref={wrapRef} className="relative">

      {/* ── Pill trigger ────────────────────────────────────────── */}
      <button
        type="button"
        onClick={onPillClick}
        aria-expanded={open}
        aria-label={connected ? `Wallet menu — ${shortAddr(address)}` : "Connect wallet"}
        className={cn(
          "relative h-9",
          "rounded-xl p-px overflow-hidden",
          "bg-[linear-gradient(135deg,rgba(247,231,167,0.36),rgba(201,168,76,0.16),rgba(184,135,10,0.10))]",
          "shadow-[0_10px_40px_rgba(0,0,0,0.28)]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/40",
        )}
      >
        <div
          className={cn(
            "relative h-full rounded-xl",
            "border border-white/[0.08] bg-[#0a0806]/72 backdrop-blur-2xl",
            "px-3 flex items-center gap-2",
            "transition duration-150 hover:bg-[#0a0806]/85",
          )}
        >
          {/* Inner warm highlight */}
          <div className="pointer-events-none absolute inset-0 rounded-xl overflow-hidden" aria-hidden>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(201,168,76,0.08),transparent_40%)]" />
          </div>

          <div className="relative z-10 flex items-center gap-2">
            {/* Avatar initial */}
            <div className="w-6 h-6 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center text-xs font-semibold text-white/80">
              {connected && address ? address.slice(2, 3).toUpperCase() : "?"}
            </div>

            <span className="text-sm font-medium text-white whitespace-nowrap">
              {connected ? shortAddr(address) : "Connect wallet"}
            </span>

            {mounted && connected && (
              <span className="hidden sm:inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[11px] text-white/55">
                {pillBalance}
              </span>
            )}

            {verifying ? (
              <span className="text-[10px] text-white/45 ml-0.5">verifying…</span>
            ) : (
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-white/45 ml-0.5 transition-transform duration-200",
                  open && "rotate-180",
                )}
              />
            )}
          </div>
        </div>
      </button>

      {/* ── Dropdown ────────────────────────────────────────────── */}
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 mt-2 w-[300px] z-50",
            "rounded-[24px] p-px overflow-hidden",
            "bg-[linear-gradient(145deg,rgba(247,231,167,0.34),rgba(201,168,76,0.14),rgba(184,135,10,0.08))]",
            "shadow-[0_24px_90px_rgba(0,0,0,0.65)]",
          )}
        >
          <div
            className={cn(
              "relative rounded-[24px] overflow-hidden",
              "bg-[#0a0806]/94 backdrop-blur-2xl",
              "border border-white/[0.07]",
              "before:pointer-events-none before:absolute before:inset-0",
              "before:bg-[radial-gradient(circle_at_15%_0%,rgba(201,168,76,0.11),transparent_42%)]",
            )}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/[0.07]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {shortAddr(address) || "Wallet"}
                  </p>
                  <p className="text-xs text-white/45 mt-0.5">
                    Balance:{" "}
                    <span className="font-semibold text-white/70">{balLabel}</span>
                  </p>
                  {verifying && (
                    <p className="text-[11px] text-white/38 mt-0.5">
                      Creating profile…
                    </p>
                  )}
                </div>

                {needsBaseSepolia && (
                  <button
                    type="button"
                    onClick={onSwitch}
                    disabled={isSwitching}
                    className={cn(
                      "shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold",
                      "text-[#0a0806]",
                      "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_50%,#b8870a_100%)]",
                      "shadow-[0_8px_30px_rgba(201,168,76,0.12)]",
                      "transition hover:brightness-105 disabled:opacity-50",
                    )}
                  >
                    {isSwitching ? "Switching…" : "Switch"}
                  </button>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="p-2" role="group">

              <Link href="/app/profile" onClick={close} className={itemBase} role="menuitem">
                <span className="flex items-center gap-3">
                  <IconBox><UserIcon className="w-[15px] h-[15px]" /></IconBox>
                  Profile
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-white/28" />
              </Link>

              <Link href={myNftsHref} onClick={close} className={itemBase} role="menuitem">
                <span className="flex items-center gap-3">
                  <IconBox tone="rose"><NftIcon className="w-[15px] h-[15px]" /></IconBox>
                  My NFTs
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-white/28" />
              </Link>

              <Link href="/app/settings" onClick={close} className={itemBase} role="menuitem">
                <span className="flex items-center gap-3">
                  <IconBox><SettingsIcon className="w-[15px] h-[15px]" /></IconBox>
                  Settings
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-white/28" />
              </Link>

              <div className="my-1.5 h-px bg-white/[0.07]" role="separator" />

              <Link
                href="/app/faucet"
                onClick={close}
                className={cn(itemBase, "bg-white/[0.025] hover:bg-white/[0.055]")}
                role="menuitem"
              >
                <span className="flex items-center gap-3">
                  <IconBox tone="gold"><FaucetIcon className="w-[15px] h-[15px]" /></IconBox>
                  Get test ETH
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#C9A84C]/60" />
              </Link>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  disconnect();
                  triedVerifyRef.current = false;
                  setMeUser(null);
                  close();
                }}
                className={cn(
                  itemBase,
                  "mt-0.5 text-red-300/70 hover:text-red-200 hover:bg-red-500/[0.09]",
                )}
              >
                <span className="flex items-center gap-3">
                  <IconBox tone="red"><DisconnectIcon className="w-[15px] h-[15px]" /></IconBox>
                  Disconnect
                </span>
              </button>

              {!myKey && (
                <p className="px-3 pt-2 pb-1 text-[11px] text-white/30 leading-relaxed">
                  {meLoading
                    ? "Loading profile…"
                    : "Set a handle in Profile to get a public /u/<id>/nfts link."}
                </p>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}