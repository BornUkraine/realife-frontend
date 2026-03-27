"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import Reveal from "@/components/Reveal";

const REAL_MARKETING_HREF = "/app/real-marketing";

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
          "bg-[#0b0a09]/40 backdrop-blur-2xl",
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

function MiniCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_22px_80px_rgba(0,0,0,0.35)] hover:bg-white/[0.06] transition">
      <div className="text-sm font-extrabold tracking-tight">{title}</div>
      <div className="mt-2 text-xs text-white/60 leading-relaxed">{text}</div>
    </div>
  );
}

export default function AppPage() {
  return (
    <>
      {/* HERO */}
      <Reveal>
        <GoldEdgeCard className="rounded-[46px]">
          <div className="p-8 md:p-14">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <LuxPill>
                <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
                Tokenized real-world assets • App live
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

            <h1 className="mt-7 text-4xl md:text-6xl font-black leading-[1.03] tracking-[-0.03em]">
              Realife — the premium app layer for
              <br />
              <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]">
                real-world NFT assets
              </span>
            </h1>

            <p className="mt-5 text-sm md:text-base max-w-3xl text-white/65 leading-relaxed">
              This is where real-world work, products, packaging, and branded
              experiences become structured, minted, tradable, and ready for
              delivery-aware ownership. Built for creators, crypto brands, and
              collectors.
            </p>

            <div className="mt-10 grid md:grid-cols-3 gap-4">
              <StatCard
                title="Core Loop"
                value="Create → Mint"
                hint="Turn real value into on-chain ownership"
              />
              <StatCard
                title="Market Layer"
                value="Trade → Deliver"
                hint="Move from collectible asset to real-world utility"
              />
              <StatCard
                title="Positioning"
                value="RWA in NFT form"
                hint="Tokenized real-world assets for Web3"
              />
            </div>

            <div className="mt-10 rounded-[34px] p-px overflow-hidden bg-[linear-gradient(135deg,rgba(247,231,167,0.30),rgba(212,175,55,0.14),rgba(184,135,10,0.10))]">
              <div className="rounded-[34px] border border-white/10 bg-[#0b0a09]/50 backdrop-blur-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-sm font-extrabold text-white">
                    Create → Mint → Trade → Deliver
                  </p>
                  <p className="text-xs text-white/60 mt-1">
                    Tokenized real-world assets for creators, crypto brands, and
                    collectors.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/app/create"
                    className={[
                      "inline-flex items-center justify-center px-7 py-3 rounded-2xl",
                      "text-black font-extrabold",
                      "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
                      "shadow-[0_18px_60px_rgba(212,175,55,0.16)] ring-1 ring-black/15",
                      "hover:brightness-110 hover:-translate-y-[1px] transition active:translate-y-0",
                    ].join(" ")}
                  >
                    Start minting
                  </Link>

                  <Link
                    href={REAL_MARKETING_HREF}
                    className="inline-flex items-center justify-center px-7 py-3 rounded-2xl border border-white/10 bg-white/[0.04] font-extrabold hover:bg-white/[0.07] transition"
                  >
                    Enter Real Marketing
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </GoldEdgeCard>
      </Reveal>

      {/* HOW IT WORKS + MARKET POSITION */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Reveal className="lg:col-span-2" delayMs={90}>
          <GoldEdgeCard>
            <div className="p-8 md:p-10">
              <p className="text-xs font-semibold text-white/60">How it works</p>
              <h2 className="mt-2 text-2xl md:text-3xl font-black tracking-tight">
                A creator-first path into on-chain ownership
              </h2>
              <p className="mt-2 text-sm text-white/65 max-w-2xl leading-relaxed">
                Realife keeps the experience understandable for normal people
                while preserving the core Web3 logic: wallet, metadata, mint,
                collectible ownership, market movement, and future delivery.
              </p>

              <div className="mt-8 grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  {
                    n: "01",
                    t: "Create",
                    d: "Upload real work, products, packaging, media, or branded experiences.",
                  },
                  {
                    n: "02",
                    t: "Prepare",
                    d: "Add metadata, proof, story, category, and collectible context.",
                  },
                  {
                    n: "03",
                    t: "Mint",
                    d: "Connect wallet, sign tx, and create verifiable ownership.",
                  },
                  {
                    n: "04",
                    t: "Trade / Deliver",
                    d: "Move the asset into market activity or physical fulfillment.",
                  },
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
                    <p className="mt-2 text-xs text-white/60 leading-relaxed">
                      {s.d}
                    </p>
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
                  href="/app/trading"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-2xl border border-white/10 bg-white/[0.04] font-extrabold hover:bg-white/[0.07] hover:-translate-y-[1px] transition active:translate-y-0"
                >
                  Open market
                </Link>
              </div>
            </div>
          </GoldEdgeCard>
        </Reveal>

        <Reveal delayMs={150}>
          <GoldEdgeCard>
            <div className="p-8 md:p-10">
              <p className="text-xs font-semibold text-white/60">Who it serves</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight">
                Creators, crypto brands, collectors
              </h3>
              <p className="mt-2 text-sm text-white/65 leading-relaxed">
                Realife is not just a mint page. It is the working surface of a
                larger ecosystem.
              </p>

              <div className="mt-6 space-y-3">
                <MiniCard
                  title="For creators"
                  text="Turn real work into NFTs, proof, identity, and collectible market value."
                />
                <MiniCard
                  title="For crypto brands"
                  text="Launch campaigns, branded products, community activations, and tokenized experiences."
                />
                <MiniCard
                  title="For collectors"
                  text="Own, trade, and receive real-world value through a premium Web3 interface."
                />
              </div>

              <div className="mt-6 text-[11px] text-white/45">
                Base • IPFS • creator economy • phygital-ready structure
              </div>
            </div>
          </GoldEdgeCard>
        </Reveal>
      </div>

      {/* CORE MODULES */}
      <Reveal className="mt-6">
        <GoldEdgeCard>
          <div className="p-8 md:p-10">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-xs font-semibold text-white/60">Core modules</p>
                <h2 className="mt-2 text-2xl md:text-3xl font-black tracking-tight">
                  Move through the ecosystem with clarity
                </h2>
                <p className="mt-2 text-sm text-white/65 max-w-2xl leading-relaxed">
                  Each module has a clear role: mint, present, trade, and build
                  stronger creator identity and real-world utility.
                </p>
              </div>
            </div>

            <div className="mt-6 grid md:grid-cols-3 gap-4">
              {[
                {
                  t: "Create NFT",
                  d: "The core creator entry point for upload, metadata, mint, and ownership proof.",
                  href: "/app/create",
                },
                {
                  t: "Trading",
                  d: "Move into listings, collectible market logic, and future liquidity flows.",
                  href: "/app/trading",
                },
                {
                  t: "Profile",
                  d: "Build creator identity, minted work, and stronger collectible presence.",
                  href: "/app/profile",
                },
              ].map((x) => (
                <div
                  key={x.t}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_22px_80px_rgba(0,0,0,0.35)] hover:bg-white/[0.06] transition"
                >
                  <div className="text-lg font-black tracking-tight">{x.t}</div>
                  <div className="mt-2 text-sm text-white/65 leading-relaxed">
                    {x.d}
                  </div>
                  <Link
                    href={x.href}
                    className="mt-5 inline-flex rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold hover:bg-white/[0.08] transition"
                  >
                    Open →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </GoldEdgeCard>
      </Reveal>

      {/* REAL MARKETING + CAFE + STORE */}
      <Reveal className="mt-6">
        <GoldEdgeCard>
          <div className="p-8 md:p-10">
            <p className="text-xs font-semibold text-white/60">Inside the ecosystem</p>
            <h2 className="mt-2 text-2xl md:text-3xl font-black tracking-tight">
              Beyond minting: real-world verticals inside Realife
            </h2>
            <p className="mt-2 text-sm text-white/65 max-w-3xl leading-relaxed">
              Realife expands beyond creator minting into branded campaigns,
              storefront experiences, and tokenized product stories.
            </p>

            <div className="mt-8 grid lg:grid-cols-3 gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_22px_80px_rgba(0,0,0,0.35)]">
                <p className="text-xs font-semibold text-white/55 uppercase tracking-[0.18em]">
                  Brand collaboration layer
                </p>
                <h3 className="mt-2 text-2xl font-black tracking-tight">
                  Real Marketing
                </h3>
                <p className="mt-3 text-sm text-white/65 leading-relaxed">
                  The ecosystem hub for creator campaigns, crypto brand
                  collaborations, Crypto Cafe, and Realife Store.
                </p>

                <div className="mt-5 grid gap-3">
                  {[
                    "Campaigns and branded experiences",
                    "Collectible product storytelling",
                    "Bridge between creators and crypto communities",
                  ].map((x) => (
                    <div
                      key={x}
                      className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/76"
                    >
                      {x}
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <Link
                    href={REAL_MARKETING_HREF}
                    className={[
                      "inline-flex w-full items-center justify-center px-6 py-3 rounded-2xl",
                      "text-black font-extrabold",
                      "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
                      "shadow-[0_18px_60px_rgba(212,175,55,0.16)] ring-1 ring-black/15",
                      "hover:brightness-110 hover:-translate-y-[1px] transition active:translate-y-0",
                    ].join(" ")}
                  >
                    Enter Real Marketing
                  </Link>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
                <div className="relative aspect-[4/5] w-full">
                  <Image
                    src="/brand/realife-crypto-cafe.jpg"
                    alt="Realife Crypto Cafe"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.62),rgba(0,0,0,0.08))]" />
                  <div className="absolute left-4 top-4">
                    <LuxPill className="bg-black/35">Crypto Cafe</LuxPill>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="text-xl font-black tracking-tight">
                      Realife Crypto Cafe
                    </div>
                    <div className="mt-2 text-sm text-white/70 leading-relaxed">
                      A premium storefront concept for branded goods,
                      collectible atmosphere, and phygital experiences.
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
                <div className="relative aspect-[4/5] w-full">
                  <Image
                    src="/brand/realife-store.jpg"
                    alt="Realife Store"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.62),rgba(0,0,0,0.08))]" />
                  <div className="absolute left-4 top-4">
                    <LuxPill className="bg-black/35">Realife Store</LuxPill>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="text-xl font-black tracking-tight">
                      Tokenized product stories
                    </div>
                    <div className="mt-2 text-sm text-white/70 leading-relaxed">
                      Real-world products, branded packaging, and collectible
                      ownership experiences inside the ecosystem.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GoldEdgeCard>
      </Reveal>

      {/* FINAL BLOCK */}
      <Reveal className="mt-6">
        <GoldEdgeCard>
          <div className="p-8 md:p-12">
            <div className="grid lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-8">
                <p className="text-xs font-semibold text-white/60">Vision</p>
                <h2 className="mt-2 text-3xl md:text-4xl font-black tracking-tight leading-[1.05]">
                  We are building a Web3 surface where{" "}
                  <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]">
                    real people, real products, and real work
                  </span>{" "}
                  become on-chain value.
                </h2>
                <p className="mt-4 text-sm md:text-base text-white/65 max-w-3xl leading-relaxed">
                  Realife is designed to feel premium for investors and simple
                  for users: clean flow, strong storytelling, real-world
                  relevance, and crypto-native ownership.
                </p>
              </div>

              <div className="lg:col-span-4">
                <div className="flex flex-col gap-3">
                  <Link
                    href="/app/create"
                    className={[
                      "inline-flex w-full items-center justify-center px-6 py-3 rounded-2xl",
                      "text-black font-extrabold",
                      "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
                      "shadow-[0_18px_60px_rgba(212,175,55,0.16)] ring-1 ring-black/15",
                      "hover:brightness-110 hover:-translate-y-[1px] transition active:translate-y-0",
                    ].join(" ")}
                  >
                    Mint now
                  </Link>

                  <Link
                    href={REAL_MARKETING_HREF}
                    className="inline-flex w-full items-center justify-center px-6 py-3 rounded-2xl border border-white/10 bg-white/[0.04] font-extrabold hover:bg-white/[0.07] transition"
                  >
                    Explore Real Marketing
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </GoldEdgeCard>
      </Reveal>

      <div className="mt-6 text-xs text-white/45 px-2">
        Realife premium UI • on-chain mint • IPFS metadata • tokenized real-world assets
      </div>
    </>
  );
}