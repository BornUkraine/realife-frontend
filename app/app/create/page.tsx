import Link from "next/link";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import MintForm from "./MintForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Create Realife NFT",
  robots: {
    index: false,
    follow: false,
  },
};

function Pill({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/70 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
      {children}
    </div>
  );
}

function GoldEdgeWrap({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-[34px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.35),rgba(212,175,55,0.16),rgba(184,135,10,0.10))]",
        "shadow-[0_34px_130px_rgba(0,0,0,0.60)]",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "relative overflow-hidden rounded-[34px]",
          "border border-white/10 bg-[#0b0a09]/60 backdrop-blur-2xl",
          "ring-1 ring-black/10",
          "before:pointer-events-none before:absolute before:inset-0",
          "before:bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.12),transparent_45%)]",
          "after:pointer-events-none after:absolute after:inset-0",
          "after:bg-[radial-gradient(circle_at_85%_115%,rgba(255,255,255,0.06),transparent_55%)]",
        ].join(" ")}
      >
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

export default function CreatePage() {
  const year = new Date().getFullYear();

  const publicStandardMintContract =
    process.env.NEXT_PUBLIC_REALIFE_1155_NEW_CONTRACT || "not-set";

  const publicProtectedUsdcMarketplace =
    process.env.NEXT_PUBLIC_REALIFE_PROTECTED_MARKETPLACE_USDC_CONTRACT ||
    "0x67e7472E48083DE3Ec8416CB8349448B1B39f1ae";

  const publicBaseSepoliaUsdc =
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_USDC_ADDRESS ||
    "0x036CbD53842c5426634e7929541eC2318f3dCF7e";


  return (
    <div className="space-y-4">
      <Reveal>
        <GoldEdgeWrap className="rounded-[22px]">
          <div className="relative overflow-hidden p-4 md:p-5">
            <div className="pointer-events-none absolute -top-32 -right-32 h-[320px] w-[320px] rounded-full bg-[#d4af37]/14 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -left-32 h-[320px] w-[320px] rounded-full bg-white/[0.06] blur-3xl" />

            <div className="relative">
              <div className="flex flex-wrap items-center gap-1.5">
                <Pill>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37] shadow-[0_0_0_4px_rgba(212,175,55,0.12)]" />
                  Base Sepolia
                </Pill>

                <Pill>
                  <span className="font-extrabold text-amber-200">USDC</span>
                  protected escrow
                </Pill>

                <Pill>
                  <span className="font-black text-amber-200">+10</span>
                  points per mint
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    ERC-1155 • IPFS
                  </span>
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    AI suggest
                  </span>
                </Pill>
              </div>

              <h1 className="mt-3 text-2xl font-black leading-[1.1] tracking-[-0.02em] sm:text-3xl md:text-[2rem]">
                Create{" "}
                <span className="bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] bg-clip-text text-transparent">
                  Realife NFT
                </span>
              </h1>

              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-white/65 md:text-sm">
                Prepare metadata → sign wallet tx → mint an ERC-1155 NFT on Base Sepolia.
                Use AI Suggest to auto-fill category, brand, and description from your image.
                Goods and services are marked for the protected USDC escrow flow when listed later.
              </p>

              <div className="mt-3 flex max-w-5xl flex-wrap gap-1">
                {[
                  "Clothing & Merch",
                  "Accessories & Jewelry",
                  "Travel & Tours",
                  "Events & Tickets",
                  "Business",
                  "Health & Wellness",
                  "Local Services",
                  "Home & Repair",
                  "Fitness",
                  "Food & Beverage",
                  "Beauty",
                  "Electronics",
                ].map((x) => (
                  <span
                    key={x}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-white/70"
                  >
                    {x}
                  </span>
                ))}
              </div>

              <div className="mt-3 max-w-4xl rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] text-white/55">
                Unified mint contract: {" "}
                <span className="break-all font-semibold text-white/90">
                  {publicStandardMintContract}
                </span>
              </div>

              <div className="mt-2 max-w-4xl rounded-lg border border-amber-300/15 bg-amber-300/[0.05] px-3 py-1.5 text-[10px] text-white/55">
                Protected USDC marketplace: {" "}
                <span className="break-all font-semibold text-amber-100">
                  {publicProtectedUsdcMarketplace}
                </span>
                <span className="text-white/35"> {" • "}USDC: </span>
                <span className="break-all font-semibold text-white/80">
                  {publicBaseSepoliaUsdc}
                </span>
              </div>

              <div className="mt-3 grid max-w-6xl grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-white/45">
                    Collectible
                  </div>
                  <div className="mt-1 text-[11px] font-extrabold text-white">
                    Standard flow
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-white/45">
                    Service
                  </div>
                  <div className="mt-1 text-[11px] font-extrabold text-white">
                    USDC escrow
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-white/45">
                    Local service
                  </div>
                  <div className="mt-1 text-[11px] font-extrabold text-white">
                    Country + area
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-white/45">
                    Good / item
                  </div>
                  <div className="mt-1 text-[11px] font-extrabold text-white">
                    Delivery flow
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/app/faucet"
                  className="rounded-lg bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-3.5 py-2 text-xs font-extrabold text-black ring-1 ring-black/15 transition hover:brightness-110 shadow-[0_10px_36px_rgba(212,175,55,0.20)]"
                >
                  Get test ETH
                </Link>

                <a
                  href="https://faucet.circle.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] px-3.5 py-2 text-xs font-semibold text-amber-100 backdrop-blur-2xl transition hover:bg-amber-300/[0.10]"
                >
                  Get test USDC ↗
                </a>

                <Link
                  href="/app"
                  className="rounded-lg border border-white/15 bg-white/[0.06] px-3.5 py-2 text-xs font-semibold backdrop-blur-2xl transition hover:bg-white/10"
                >
                  Back to App →
                </Link>

                <a
                  href="https://sepolia.basescan.org/"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/15 bg-white/[0.06] px-3.5 py-2 text-xs font-semibold backdrop-blur-2xl transition hover:bg-white/10"
                >
                  Explorer ↗
                </a>
              </div>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={100}>
        <GoldEdgeWrap className="rounded-[22px]">
          <div className="p-4 md:p-5">
            <MintForm />
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={200}>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 pt-2 text-xs text-white/45">
          <div>© {year} Realife</div>
          <div className="flex items-center gap-4">
            <span className="opacity-60">ERC-1155</span>
            <span className="opacity-60">IPFS</span>
            <span className="opacity-60">Public mint</span>
            <span className="opacity-60">Unified mint</span>
            <span className="opacity-60">Protected USDC services</span>
            <span className="opacity-60">Local / offline</span>
            <span className="opacity-60">AI suggest</span>
            <span className="opacity-60">Real-world categories</span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
