"use client";

import React, { ReactNode, useMemo, useState } from "react";
import { SessionProvider } from "next-auth/react";

import { WagmiProvider } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig, darkTheme } from "@rainbow-me/rainbowkit";

import "@rainbow-me/rainbowkit/styles.css";

// ✅ НЕ КИДАЕМ throw на уровне модуля
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "";

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