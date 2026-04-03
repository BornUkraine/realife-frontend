"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { cn } from "@/lib/utils";

// Shared base for all state buttons
const btnBase = cn(
  "h-9 px-3.5 rounded-xl",
  "border border-white/[0.08] bg-white/[0.05] backdrop-blur-xl",
  "text-sm font-medium text-white/75",
  "transition hover:bg-white/[0.09] hover:text-white active:scale-[0.98]",
  "flex items-center gap-2",
);

export default function ConnectWallet() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;

        // ── Pre-mount skeleton ─────────────────────────────────────
        if (!mounted) {
          return (
            <div className="h-9 w-28 rounded-xl bg-white/[0.06] animate-pulse" />
          );
        }

        // ── Not connected ──────────────────────────────────────────
        if (!connected) {
          return (
            <button type="button" onClick={openConnectModal} className={btnBase}>
              Connect wallet
            </button>
          );
        }

        // ── Wrong network ──────────────────────────────────────────
        if (chain?.unsupported) {
          return (
            <button
              type="button"
              onClick={openChainModal}
              className={cn(
                "h-9 px-3.5 rounded-xl",
                "border border-rose-500/20 bg-rose-500/10",
                "text-sm font-medium text-rose-300",
                "transition hover:bg-rose-500/15 active:scale-[0.98]",
                "flex items-center gap-2",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400 ring-[3px] ring-white/[0.06]" />
              Wrong network
            </button>
          );
        }

        // ── Connected ──────────────────────────────────────────────
        return (
          <div className="flex items-center gap-2">

            {/* Chain selector */}
            <button
              type="button"
              onClick={openChainModal}
              className={btnBase}
              title={chain?.name}
              aria-label="Change network"
            >
              {chain?.hasIcon && chain?.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={chain?.name ?? "chain"}
                  src={chain.iconUrl}
                  className="w-4.5 h-4.5 rounded-full"
                />
              ) : (
                <span className="text-xs text-white/50">⛓</span>
              )}
            </button>

            {/* Account button */}
            <button
              type="button"
              onClick={openAccountModal}
              className={btnBase}
              aria-label="Account menu"
            >
              {/* Avatar initial */}
              <span className="w-5 h-5 rounded-full bg-[rgba(201,168,76,0.15)] border border-[rgba(201,168,76,0.25)] flex items-center justify-center text-[10px] font-semibold text-[#C9A84C]">
                {account.displayName?.slice(0, 1).toUpperCase()}
              </span>

              <span className="text-sm font-medium">{account.displayName}</span>

              <span className="text-[10px] text-white/35">▾</span>
            </button>

          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}