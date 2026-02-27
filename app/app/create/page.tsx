"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import Reveal from "@/components/Reveal";
import MintForm from "./MintForm";

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

  return (
    <div className="space-y-6">
      {/* HERO */}
      <Reveal>
        <GoldEdgeWrap className="rounded-[40px]">
          <div className="relative p-7 md:p-10 overflow-hidden">
            <div className="pointer-events-none absolute -top-44 -right-44 h-[560px] w-[560px] rounded-full bg-[#d4af37]/14 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-44 -left-44 h-[560px] w-[560px] rounded-full bg-white/[0.06] blur-3xl" />

            <div className="relative">
              <Pill>
                <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
                VIP Mint Studio • Base Sepolia • IPFS metadata
              </Pill>

              <h1 className="mt-5 text-4xl md:text-6xl font-black leading-[1.05] tracking-[-0.02em]">
                Mint NFT{" "}
                <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]">
                  proof
                </span>
              </h1>

              <p className="mt-4 text-sm md:text-base text-white/70 max-w-3xl leading-relaxed">
                Prepare (IPFS) → Sign → Mint → Verify. One premium flow, no extra noise.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/app/faucet"
                  className="px-6 py-3 rounded-2xl text-black font-extrabold hover:brightness-110 transition shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
                >
                  Get test ETH
                </Link>

                <Link
                  href="/app"
                  className="px-6 py-3 rounded-2xl border border-white/15 bg-white/[0.06] font-semibold hover:bg-white/10 transition backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                >
                  Back to App →
                </Link>

                <a
                  href="https://sepolia.basescan.org/"
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3 rounded-2xl border border-white/15 bg-white/[0.06] font-semibold hover:bg-white/10 transition backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                >
                  Explorer ↗
                </a>
              </div>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      {/* FORM */}
      <Reveal delayMs={120}>
        <GoldEdgeWrap className="rounded-[40px]">
          <div className="p-6 md:p-10">
            <MintForm />
          </div>
        </GoldEdgeWrap>
      </Reveal>

      {/* footer */}
      <Reveal delayMs={200}>
        <div className="pt-2 pb-6 text-xs text-white/45 flex flex-wrap items-center justify-between gap-4">
          <div>© {year} Realife</div>
          <div className="flex items-center gap-4">
            <span className="opacity-60">Base Sepolia</span>
            <span className="opacity-60">IPFS</span>
            <span className="opacity-60">On-chain mint</span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}