import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Providers from "./providers";
import TopBar from "@/components/TopBar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Realife",
  description: "Tokenized real-world creativity",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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

          {/* ✅ никаких контейнеров здесь — AppShell рулит сеткой */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
