"use client";

import React, { ReactNode, useMemo, useState } from "react";
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

export default function Providers({ children }: { children: ReactNode }) {
  // ✅ QueryClient должен быть стабилен между рендерами
  const [queryClient] = useState(() => new QueryClient());

  const config = useMemo(() => {
    const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;
    if (!projectId) {
      throw new Error("Missing NEXT_PUBLIC_WC_PROJECT_ID in .env.local");
    }

    return getDefaultConfig({
      appName: "Realife",
      projectId,
      chains: [baseSepolia],
      ssr: false, // ✅ стабильнее для App Router + wallet UI
    });
  }, []);

  return (
    <SessionProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider
            modalSize="compact"
            theme={darkTheme({
              accentColor: "#d4af37", // gold
              accentColorForeground: "#070606", // black
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
