"use client";

import Link from "next/link";
import React from "react";

function Reveal({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "motion-safe:animate-[fadeUp_.7s_ease-out_both]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function GoldEdgeCard({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "relative rounded-[40px] p-px overflow-hidden",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.40),rgba(212,175,55,0.18),rgba(184,135,10,0.12))]",
        "shadow-[0_34px_140px_rgba(0,0,0,0.60)]",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "relative rounded-[40px] overflow-hidden",
          "border border-white/10",
          "bg-[#0b0a09]/70 backdrop-blur-2xl",
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

function LuxPill({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-full",
        "border border-white/10 bg-white/[0.06] backdrop-blur-2xl",
        "px-3 py-1.5 text-[11px] font-semibold text-white/70",
        "shadow-[0_12px_40px_rgba(0,0,0,0.25)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-5 shadow-[0_22px_80px_rgba(0,0,0,0.35)] hover:bg-white/[0.06] transition">
      <div className="text-xs font-semibold text-white/60">{title}</div>
      <div className="mt-2 text-2xl font-extrabold tracking-tight text-white">
        {value}
      </div>
      <div className="mt-2 text-xs text-white/60">{hint}</div>
    </div>
  );
}

export default function AppPage() {
  return (
    <>
      {/* Global keyframes */}
      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* HERO */}
      <Reveal>
        <GoldEdgeCard className="rounded-[46px]">
          <div className="p-8 md:p-14">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <LuxPill>
                <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
                Premium creator economy • Testnet live
              </LuxPill>

              <div className="flex items-center gap-2">
                <Link
                  href="/app/create"
                  className={[
                    "px-4 py-2 rounded-2xl text-black text-sm font-extrabold",
                    "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
                    "shadow-[0_18px_60px_rgba(212,175,55,0.16)] ring-1 ring-black/15",
                    "hover:brightness-110 hover:-translate-y-[1px] transition active:translate-y-0",
                  ].join(" ")}
                >
                  Mint NFT
                </Link>

                <Link
                  href="/app/faucet"
                  className="px-4 py-2 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:-translate-y-[1px] transition active:translate-y-0 text-sm font-semibold"
                >
                  Get test ETH
                </Link>
              </div>
            </div>

            <h1 className="mt-7 text-4xl md:text-6xl font-black leading-[1.05] tracking-[-0.02em]">
              Realife — tokenize
              <br />
              <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]">
                real-world creativity
              </span>
            </h1>

            <p className="mt-5 text-sm md:text-base max-w-2xl text-white/65 leading-relaxed">
              Mint proof of work: art, craft, products, inventions, design, AI output.
              Upload → IPFS metadata → sign → on-chain NFT → verify.
            </p>

            <div className="mt-10 grid md:grid-cols-3 gap-4">
              <StatCard title="Network" value="Base Sepolia" hint="Fast & cheap testnet mints" />
              <StatCard title="Metadata" value="IPFS tokenURI" hint="Verifiable, permanent content" />
              <StatCard title="Flow" value="Prepare → Mint" hint="Success page + explorer proof" />
            </div>

            <div className="mt-10 rounded-[34px] p-px overflow-hidden bg-[linear-gradient(135deg,rgba(247,231,167,0.30),rgba(212,175,55,0.14),rgba(184,135,10,0.10))]">
              <div className="rounded-[34px] border border-white/10 bg-[#0b0a09]/65 backdrop-blur-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-sm font-extrabold text-white">
                    Ready to mint your first real-life creation?
                  </p>
                  <p className="text-xs text-white/60 mt-1">
                    Upload → Prepare (IPFS) → Sign → Mint → Success proof
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/app/create"
                    className="inline-flex justify-center px-7 py-3 rounded-2xl bg-white text-black font-extrabold hover:bg-gray-100 transition shadow-[0_18px_70px_rgba(0,0,0,0.35)]"
                  >
                    Start minting
                  </Link>

                  <Link
                    href="/app/faucet"
                    className="inline-flex justify-center px-7 py-3 rounded-2xl border border-white/10 bg-white/[0.04] font-extrabold hover:bg-white/[0.07] transition"
                  >
                    Faucet ETH
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </GoldEdgeCard>
      </Reveal>

      <div className="grid lg:grid-cols-3 gap-6">
        <Reveal className="lg:col-span-2">
          <GoldEdgeCard>
            <div className="p-8 md:p-10">
              <p className="text-xs font-semibold text-white/60">How it works</p>
              <h2 className="mt-2 text-2xl md:text-3xl font-black tracking-tight">
                Proof-first creator mint
              </h2>
              <p className="mt-2 text-sm text-white/65 max-w-2xl leading-relaxed">
                Make your NFT credible: add story, proof link, and category.
                Your creation becomes verifiable and shareable.
              </p>

              <div className="mt-8 grid md:grid-cols-3 gap-4">
                {[
                  { n: "01", t: "Create", d: "Real work: craft, art, product, AI." },
                  { n: "02", t: "Upload", d: "Media + title + proof → metadata." },
                  { n: "03", t: "Mint", d: "Sign tx → on-chain proof + success page." },
                ].map((s) => (
                  <div
                    key={s.n}
                    className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_22px_80px_rgba(0,0,0,0.35)] hover:bg-white/[0.06] transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black flex items-center justify-center font-extrabold text-xs shadow-[0_16px_50px_rgba(212,175,55,0.16)]">
                        {s.n}
                      </div>
                      <p className="text-sm font-extrabold">{s.t}</p>
                    </div>
                    <p className="mt-2 text-xs text-white/60 leading-relaxed">{s.d}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/app/create"
                  className={[
                    "inline-flex items-center justify-center px-6 py-3 rounded-2xl",
                    "text-black font-extrabold",
                    "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
                    "shadow-[0_18px_60px_rgba(212,175,55,0.16)] ring-1 ring-black/15",
                    "hover:brightness-110 hover:-translate-y-[1px] transition active:translate-y-0",
                  ].join(" ")}
                >
                  Go to mint
                </Link>

                <Link
                  href="/app/faucet"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-2xl border border-white/10 bg-white/[0.04] font-extrabold hover:bg-white/[0.07] hover:-translate-y-[1px] transition active:translate-y-0"
                >
                  Get test ETH
                </Link>
              </div>
            </div>
          </GoldEdgeCard>
        </Reveal>

        <Reveal>
          <GoldEdgeCard>
            <div className="p-8 md:p-10">
              <p className="text-xs font-semibold text-white/60">Roadmap</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight">What’s next</h3>
              <p className="mt-2 text-sm text-white/65 leading-relaxed">
                We’re building a reputation-driven creator economy.
              </p>

              <div className="mt-6 space-y-3">
                {[
                  { t: "Trading NFTs", d: "Marketplace + collections", soon: true },
                  { t: "Profile", d: "Creator identity + score", soon: true },
                  { t: "Rewards", d: "Airdrops / perks for creators", soon: true },
                ].map((x) => (
                  <div
                    key={x.t}
                    className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_22px_80px_rgba(0,0,0,0.35)] hover:bg-white/[0.06] transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-extrabold">{x.t}</p>
                      {x.soon && (
                        <span className="text-[11px] px-2 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white/70">
                          Soon
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-white/60">{x.d}</p>
                  </div>
                ))}
              </div>

              <Link
                href="/app/create"
                className="mt-6 inline-flex w-full justify-center px-6 py-3 rounded-2xl bg-white text-black font-extrabold hover:bg-gray-100 transition shadow-[0_18px_70px_rgba(0,0,0,0.35)]"
              >
                Mint now
              </Link>

              <div className="mt-4 text-[11px] text-white/45">
                Base Sepolia • IPFS • On-chain ownership proof
              </div>
            </div>
          </GoldEdgeCard>
        </Reveal>
      </div>

      <div className="text-xs text-white/45 px-2">
        Base Sepolia • IPFS • On-chain mint • Realife premium UI
      </div>
    </>
  );
}