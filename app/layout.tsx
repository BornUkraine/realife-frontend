import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";

import Providers from "./providers";
import TopBar from "@/components/TopBar";
import ReferralCapture from "@/components/ReferralCapture";

import { GeistSans, GeistMono } from "geist/font";

const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
  title: "Realife",
  description: "Tokenized real-world creativity",
  other: {
    "base:app_id": "69e678d9c2f43db9becf667b",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#070606",
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
          <ReferralCapture />

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
