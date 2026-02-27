import type { Metadata } from "next";
import "./globals.css";

import Providers from "./providers";
import TopBar from "@/components/TopBar";

// ✅ локальный Geist (без скачивания с fonts.gstatic.com на билде)
import { GeistSans, GeistMono } from "geist/font";

export const metadata: Metadata = {
  title: "Realife",
  description: "Tokenized real-world creativity",
};

/**
 * ✅ FIX build/prerender:
 * Next не будет пытаться SSG/ISR для страниц с wagmi/rainbowkit
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={[
          "min-h-screen bg-[#070606] text-white antialiased",
          GeistSans.variable,
          GeistMono.variable,
        ].join(" ")}
      >
        <Providers>
          <div className="sticky top-0 z-50">
            <TopBar />
            <div className="h-px bg-white/10" />
          </div>

          {children}
        </Providers>
      </body>
    </html>
  );
}