"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { cn } from "@/lib/utils";

export default function ConnectWallet() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!ready) {
          return <div className="h-10 w-32 rounded-2xl bg-white/10 animate-pulse" />;
        }

        if (!connected) {
          return (
            <button
              type="button"
              onClick={openConnectModal}
              className={cn(
                "h-10 px-4 rounded-2xl",
                "border border-white/10 bg-white/10 backdrop-blur-xl",
                "hover:bg-white/15 active:bg-white/20 transition",
                "text-sm font-semibold text-white"
              )}
            >
              Connect
            </button>
          );
        }

        if (chain?.unsupported) {
          return (
            <button
              type="button"
              onClick={openChainModal}
              className={cn(
                "h-10 px-4 rounded-2xl",
                "bg-red-500/15 border border-red-500/20",
                "hover:bg-red-500/20 active:bg-red-500/25 transition",
                "text-sm font-semibold text-red-200"
              )}
            >
              Wrong network
            </button>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openChainModal}
              className={cn(
                "h-10 px-3 rounded-2xl",
                "border border-white/10 bg-white/10 backdrop-blur-xl",
                "hover:bg-white/15 active:bg-white/20 transition",
                "text-sm font-semibold text-white",
                "flex items-center gap-2"
              )}
              title={chain?.name}
              aria-label="Change network"
            >
              {chain?.hasIcon && chain?.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={chain?.name ?? "chain"} src={chain.iconUrl} className="w-5 h-5 rounded-full" />
              ) : (
                <span className="text-xs opacity-80">⛓</span>
              )}
            </button>

            <button
              type="button"
              onClick={openAccountModal}
              className={cn(
                "h-10 px-3 rounded-2xl",
                "border border-white/10 bg-white/10 backdrop-blur-xl",
                "hover:bg-white/15 active:bg-white/20 transition",
                "text-sm font-semibold text-white",
                "flex items-center gap-2"
              )}
              aria-label="Account menu"
            >
              <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-xs">
                {account.displayName?.slice(0, 1).toUpperCase()}
              </span>

              <span className="text-sm font-semibold">{account.displayName}</span>
              <span className="text-xs opacity-70">▾</span>
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
