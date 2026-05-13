"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAccount, useBalance, useChainId, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { formatUnits } from "viem";
import { cn } from "@/lib/utils";
import WalletMenu from "./WalletMenu";
import Web2EmbeddedLogin from "./Web2EmbeddedLogin";

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

function normalizeEvmAddress(v: unknown): `0x${string}` | undefined {
  const s = String(v || "").trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(s) ? (s as `0x${string}`) : undefined;
}

function shortAddr(addr?: string | null) {
  const s = String(addr || "").trim();
  if (!s) return "—";
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function initialsFrom(name?: string | null, email?: string | null) {
  const base = String(name || email || "G").trim();
  const first = base.replace(/[^a-zA-Z0-9А-Яа-яЁё]/g, "").slice(0, 1);
  return (first || "G").toUpperCase();
}

// ─── Icons ────────────────────────────────────────────────────────────────────

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

function FaucetIcon({ className = "" }: { className?: string }) {
  // Simple droplet — outline, matches other utility icons.
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12 3.5c-3.2 4-5.5 6.6-5.5 9.5a5.5 5.5 0 0 0 11 0c0-2.9-2.3-5.5-5.5-9.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 13.5c0 1.4 1 2.5 2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AiIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12 3.5l1.45 4.2 4.2 1.45-4.2 1.45L12 14.8l-1.45-4.2-4.2-1.45 4.2-1.45L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 14.5l.75 2.25 2.25.75-2.25.75-.75 2.25-.75-2.25-2.25-.75 2.25-.75.75-2.25ZM5.5 14.75l.55 1.7 1.7.55-1.7.55-.55 1.7-.55-1.7-1.7-.55 1.7-.55.55-1.7Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TradeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M7 7h10l-2.2-2.2M17 17H7l2.2 2.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 7c-2.2 0-4 1.8-4 4M7 17c2.2 0 4-1.8 4-4"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ProfileIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12 12.2a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M4.75 20.2c.8-3.65 3.45-5.55 7.25-5.55s6.45 1.9 7.25 5.55"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
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
  children: ReactNode;
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
    <Link
      href="/"
      aria-label="Realife"
      className="group inline-flex min-w-0 items-center"
    >
      {/* Mobile: logo-mark.png (circular medallion) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-mark.png"
        alt="Realife"
        className="block h-10 w-10 object-contain transition group-hover:opacity-90 sm:hidden"
        draggable={false}
      />

      {/* Desktop: logo-wordmark.png (REALIFE + R lockup) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-wordmark.png"
        alt="Realife"
        className="hidden h-10 w-auto object-contain transition group-hover:opacity-90 sm:block"
        draggable={false}
      />
    </Link>
  );
}

// ─── Web2 embedded wallet menu ────────────────────────────────────────────────

const WEB2_MENU_LINKS = [
  { href: "/app/ai-studio", label: "AI Studio", icon: AiIcon },
  { href: "/app/create", label: "Create NFT", icon: PlusIcon },
  { href: "/app/trading", label: "Trading NFTs", icon: TradeIcon },
  { href: "/app/orders", label: "My Orders", icon: OrdersIcon },
  { href: "/app/profile", label: "Profile", icon: ProfileIcon },
];

function Web2EmbeddedAccountMenu({
  compact = false,
  walletAddress,
  userName,
  userEmail,
}: {
  compact?: boolean;
  walletAddress?: string | null;
  userName?: string | null;
  userEmail?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true);
    try {
      await signOut({ redirect: false });
      setOpen(false);
    } finally {
      setDisconnecting(false);
    }
  }, []);

  const displayName = String(userName || userEmail || "Google Wallet").trim();
  const avatarText = initialsFrom(userName, userEmail);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center justify-center rounded-xl",
          "border border-white/10 bg-white/[0.05] backdrop-blur-xl",
          "text-white/82 shadow-[0_12px_48px_rgba(0,0,0,0.22)] transition",
          "hover:bg-white/10 hover:text-white",
          compact ? "h-9 w-9" : "h-9 gap-2 px-3.5",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Google embedded wallet"
      >
        <span className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.11))] text-[11px] font-black text-amber-100">
          {avatarText}
          {/* green indicator is inside the Web2 button, like wallet connect */}
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#0a0806] bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" />
        </span>

        {!compact ? (
          <span className="min-w-0 text-left">
            <span className="block max-w-[122px] truncate text-[12px] font-black leading-none text-white/90">
              Google Wallet
            </span>
            <span className="mt-0.5 block max-w-[122px] truncate text-[10px] font-semibold leading-none text-white/45">
              {shortAddr(walletAddress)}
            </span>
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={cn(
            "absolute right-0 z-[90] mt-2 w-[286px] overflow-hidden rounded-[24px] p-px",
            "bg-[linear-gradient(145deg,rgba(247,231,167,0.34),rgba(201,168,76,0.14),rgba(184,135,10,0.08))]",
            "shadow-[0_28px_100px_rgba(0,0,0,0.58)]",
          )}
          role="menu"
        >
          <div className="rounded-[24px] border border-white/[0.08] bg-[#0a0806]/95 p-3 backdrop-blur-2xl">
            <div className="rounded-[18px] border border-emerald-500/15 bg-emerald-500/[0.07] p-3">
              <div className="flex items-center gap-3">
                <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-300/20 bg-black/30 text-sm font-black text-emerald-100">
                  {avatarText}
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#0a0806] bg-emerald-400" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-black text-white/92">
                    {displayName}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] font-semibold text-emerald-100/70">
                    Embedded Web3 wallet connected
                  </div>
                </div>
              </div>

              <div className="mt-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 font-mono text-[11px] text-white/62">
                {shortAddr(walletAddress)}
              </div>
            </div>

            <div className="mt-2 grid grid-cols-1 gap-1">
              {WEB2_MENU_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl px-3 py-2.5",
                      "border border-transparent text-sm font-bold text-white/72 transition",
                      "hover:border-white/10 hover:bg-white/[0.055] hover:text-white",
                    )}
                    role="menuitem"
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-amber-100/80 group-hover:bg-white/[0.07]">
                      <Icon className="h-[16px] w-[16px]" />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    <span className="text-white/30 group-hover:text-white/60">→</span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-2 border-t border-white/[0.07] pt-2">
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className={cn(
                  "flex w-full items-center justify-center rounded-2xl px-3 py-2.5",
                  "border border-rose-500/15 bg-rose-500/[0.06] text-sm font-black text-rose-100/85",
                  "transition hover:bg-rose-500/[0.10] disabled:cursor-wait disabled:opacity-55",
                )}
                role="menuitem"
              >
                {disconnecting ? "Disconnecting…" : "Disconnect Google"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Skeleton shown before hydration ─────────────────────────────────────────

function TopBarSkeleton() {
  return (
    <div className="border-b border-white/10 bg-[#0a0806]/65 backdrop-blur-2xl">
      <div className="mx-auto w-full max-w-[1480px] px-3 py-2.5 sm:px-5 lg:px-6 2xl:px-8">
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

  const { data: session } = useSession();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();

  const sessionUser = (session as any)?.user || null;
  const sessionWalletKind = String(sessionUser?.walletKind || "").toUpperCase();
  const embeddedWalletAddress = normalizeEvmAddress(sessionUser?.walletAddress);
  const externalWalletAddress = normalizeEvmAddress(address);

  // One clear auth surface:
  // - external wallet connected  => WalletMenu only, hide Web2 Google
  // - Web2 embedded connected    => Web2 menu only, hide WalletMenu
  // - disconnected               => show Google login + Connect Wallet
  const externalWalletConnected = mounted && Boolean(isConnected && externalWalletAddress);
  const web2EmbeddedConnected =
    mounted &&
    !externalWalletConnected &&
    Boolean(embeddedWalletAddress) &&
    (sessionWalletKind === "EMBEDDED" || sessionWalletKind === "WEB2" || Boolean(sessionUser));

  const effectiveAddress = externalWalletAddress || embeddedWalletAddress;
  const effectiveChainId = externalWalletConnected ? chainId : baseSepolia.id;

  const { data: balanceData, isLoading, refetch, isFetching } = useBalance({
    address: effectiveAddress,
    chainId: effectiveChainId ?? baseSepolia.id,
    query: {
      enabled: mounted && Boolean(effectiveAddress),
      refetchInterval: 12_000,
    },
  });

  const connected = mounted && Boolean(effectiveAddress);
  const wrongNetwork = externalWalletConnected && chainId !== baseSepolia.id;

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

  // Faucet is now a utility button — always visible after mount.
  // Previously it appeared only when the wallet was low on gas; with the
  // SidebarBottom removed it lives permanently in the top bar.
  const showGetEth = mounted;
  const canSwitch = externalWalletConnected && typeof switchChainAsync === "function";

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
      <div
        className="pointer-events-none absolute inset-x-0 -top-20 z-0 mx-auto h-20 w-[700px] rounded-full bg-[#C9A84C]/12 blur-3xl"
        aria-hidden
      />

      <div className="relative border-b border-white/10 bg-[#0a0806]/65 backdrop-blur-2xl">
        <div className="mx-auto w-full max-w-[1480px] px-3 py-2.5 sm:px-5 lg:px-6 2xl:px-8">
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
                      "inline-flex h-9 w-9 items-center justify-center rounded-xl",
                      "border border-white/10 bg-white/[0.05] backdrop-blur-xl",
                      "text-white/75 transition hover:bg-white/10 hover:text-white",
                    )}
                    aria-label="Faucet ETH"
                  >
                    <FaucetIcon className="h-[17px] w-[17px]" />
                  </Link>
                )}

                {web2EmbeddedConnected ? (
                  <Web2EmbeddedAccountMenu
                    compact
                    walletAddress={embeddedWalletAddress}
                    userName={sessionUser?.name}
                    userEmail={sessionUser?.email}
                  />
                ) : externalWalletConnected ? null : (
                  <Web2EmbeddedLogin compact />
                )}

                {!web2EmbeddedConnected ? <WalletMenu /> : null}
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
                    "inline-flex h-9 items-center gap-2 rounded-xl px-3.5",
                    "border border-white/10 bg-white/[0.05] backdrop-blur-xl",
                    "text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white",
                  )}
                >
                  <FaucetIcon className="h-[16px] w-[16px]" />
                  <span>Faucet ETH</span>
                </Link>
              )}

              {web2EmbeddedConnected ? (
                <Web2EmbeddedAccountMenu
                  walletAddress={embeddedWalletAddress}
                  userName={sessionUser?.name}
                  userEmail={sessionUser?.email}
                />
              ) : externalWalletConnected ? null : (
                <Web2EmbeddedLogin />
              )}

              {!web2EmbeddedConnected ? <WalletMenu /> : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
