"use client";

import React, { ReactNode, useMemo, useState } from "react";
import { SessionProvider } from "next-auth/react";

import { WagmiProvider } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig, darkTheme } from "@rainbow-me/rainbowkit";

import { WEB3AUTH_NETWORK, type Web3AuthOptions } from "@web3auth/modal";
import { Web3AuthProvider, type Web3AuthContextConfig } from "@web3auth/modal/react";

import "@rainbow-me/rainbowkit/styles.css";

// ✅ НЕ КИДАЕМ throw на уровне модуля
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "";

// Web2 embedded wallet onboarding through Web3Auth / MetaMask Embedded Wallets.
// If NEXT_PUBLIC_WEB3AUTH_CLIENT_ID is empty, Realife keeps working with the old
// RainbowKit wallet flow and simply does not render the Google embedded wallet button.
const web3AuthClientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID ?? "";

function getWeb3AuthNetwork() {
  const raw = String(process.env.NEXT_PUBLIC_WEB3AUTH_NETWORK || "sapphire_devnet").toLowerCase();
  if (raw === "sapphire_mainnet" || raw === "mainnet" || raw === "production") {
    return WEB3AUTH_NETWORK.SAPPHIRE_MAINNET;
  }
  return WEB3AUTH_NETWORK.SAPPHIRE_DEVNET;
}

function MaybeWeb3AuthProvider({ children }: { children: ReactNode }) {
  const config = useMemo<Web3AuthContextConfig | null>(() => {
    if (!web3AuthClientId) return null;

    const web3AuthOptions: Web3AuthOptions = {
      clientId: web3AuthClientId,
      web3AuthNetwork: getWeb3AuthNetwork(),
    };

    return { web3AuthOptions };
  }, []);

  if (!config) return <>{children}</>;

  return <Web3AuthProvider config={config}>{children}</Web3AuthProvider>;
}

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  // ✅ wagmiConfig создаём один раз на клиенте
  const wagmiConfig = useMemo(() => {
    return getDefaultConfig({
      appName: "Realife",
      projectId: projectId || "missing",
      chains: [baseSepolia],
      ssr: true,
    });
  }, []);

  // ✅ Понятный экран вместо крэша
  if (!projectId) {
    return (
      <div className="min-h-screen bg-[#070606] text-white flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-2xl p-6">
          <div className="text-lg font-extrabold">Missing env</div>
          <div className="mt-2 text-sm text-white/70">
            Set <span className="font-mono text-white/90">NEXT_PUBLIC_WC_PROJECT_ID</span> in Railway → Variables
            and redeploy.
          </div>
        </div>
      </div>
    );
  }

  return (
    <SessionProvider>
      <MaybeWeb3AuthProvider>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider
              modalSize="compact"
              theme={darkTheme({
                accentColor: "#d4af37",
                accentColorForeground: "#070606",
                borderRadius: "large",
                overlayBlur: "small",
              })}
            >
              {children}
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </MaybeWeb3AuthProvider>
    </SessionProvider>
  );
}
