"use client";

import React, { ReactNode, useState } from "react";
import { SessionProvider } from "next-auth/react";

import { WagmiProvider } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
} from "@rainbow-me/rainbowkit";

import "@rainbow-me/rainbowkit/styles.css";

// ✅ ВАЖНО: config на уровне модуля — не пересоздаётся при ре-рендерах Providers
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;
if (!projectId) {
  throw new Error("Missing NEXT_PUBLIC_WC_PROJECT_ID in env");
}

const wagmiConfig = getDefaultConfig({
  appName: "Realife",
  projectId,
  chains: [baseSepolia],
  ssr: true, // ✅ важно для Next App Router, чтобы коннект не “схлопывался”
});

export default function Providers({ children }: { children: ReactNode }) {
  // ✅ QueryClient стабилен
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
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
    </SessionProvider>
  );
}