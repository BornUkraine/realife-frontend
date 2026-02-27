"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import MintForm from "./MintForm";

function Pill({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/20 bg-[#1a1405]/80 px-3 py-1.5 text-[11px] font-semibold text-[#f7e7a7] backdrop-blur-2xl shadow-[0_4px_20px_rgba(212,175,55,0.1)]">
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
        // 🔥 Мягкая золотая окантовка (как в обновленном MintForm)
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.25),rgba(212,175,55,0.1),rgba(184,135,10,0.05))]",
        "shadow-[0_26px_80px_rgba(10,8,0,0.8)]", // Теплая глубокая тень
        className,
      ].join(" ")}
    >
      <div
        className={[
          "relative overflow-hidden rounded-[34px]",
          // 🔥 Идеальный золотисто-черный градиент для фона
          "border border-[#d4af37]/15 bg-[linear-gradient(135deg,rgba(26,20,5,0.75),rgba(11,10,9,0.85))] backdrop-blur-2xl",
          "ring-1 ring-black/40",
          "before:pointer-events-none before:absolute before:inset-0",
          // Легчайший внутренний блик
          "before:bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.08),transparent_45%)]",
          "after:pointer-events-none after:absolute after:inset-0",
          "after:bg-[radial-gradient(circle_at_85%_115%,rgba(212,175,55,0.03),transparent_55%)]",
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
      <GoldEdgeWrap className="rounded-[40px]">
        <div className="relative p-7 md:p-10 overflow-hidden">
          {/* 🔥 Аккуратный теплый блик */}
          <div className="pointer-events-none absolute -top-44 -right-44 h-[560px] w-[560px] rounded-full bg-[#d4af37]/05 blur-3xl" />

          <div className="relative">
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.15)]" />
              VIP Mint Studio • Base Sepolia • IPFS metadata
            </Pill>

            <h1 className="mt-5 text-4xl md:text-6xl font-black leading-[1.05] tracking-[-0.02em] text-white">
              Mint NFT{" "}
              <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                proof
              </span>
            </h1>

            <p className="mt-4 text-sm md:text-base text-[#d4af37]/70 max-w-3xl leading-relaxed">
              Prepare (IPFS) → Sign → Mint → Verify. One premium flow, no extra noise.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/app/faucet"
                className="px-6 py-3 rounded-2xl text-black font-extrabold hover:brightness-110 transition shadow-[0_12px_40px_rgba(212,175,55,0.25)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
              >
                Get test ETH
              </Link>

              <Link
                href="/app"
                className="px-6 py-3 rounded-2xl border border-[#d4af37]/30 bg-[#1a1405]/60 text-[#f7e7a7] font-semibold hover:bg-[#d4af37]/10 transition backdrop-blur-2xl shadow-[0_18px_40px_rgba(0,0,0,0.4)]"
              >
                Back to App →
              </Link>

              <a
                href="https://sepolia.basescan.org/"
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3 rounded-2xl border border-[#d4af37]/30 bg-[#1a1405]/60 text-[#f7e7a7] font-semibold hover:bg-[#d4af37]/10 transition backdrop-blur-2xl shadow-[0_18px_40px_rgba(0,0,0,0.4)]"
              >
                Explorer ↗
              </a>
            </div>
          </div>
        </div>
      </GoldEdgeWrap>

      {/* FORM */}
      <GoldEdgeWrap className="rounded-[40px]">
        <div className="p-6 md:p-10">
          <MintForm />
        </div>
      </GoldEdgeWrap>

      {/* footer */}
      <div className="pt-2 pb-6 text-xs text-[#d4af37]/50 flex flex-wrap items-center justify-between gap-4">
        <div>© {year} Realife</div>
        <div className="flex items-center gap-4">
          <span className="hover:text-[#d4af37]/80 transition-colors">Base Sepolia</span>
          <span className="hover:text-[#d4af37]/80 transition-colors">IPFS</span>
          <span className="hover:text-[#d4af37]/80 transition-colors">On-chain mint</span>
        </div>
      </div>
    </div>
  );
}