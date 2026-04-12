import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";

import Providers from "./providers";
import TopBar from "@/components/TopBar";

import { GeistSans, GeistMono } from "geist/font";

const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
  title: "Realife",
  description: "Tokenized real-world creativity",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={[
          "min-h-screen bg-[#070606] text-white antialiased",
          geistSans.variable,
          geistMono.variable,
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