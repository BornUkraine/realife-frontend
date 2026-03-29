"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import Reveal from "@/components/Reveal";

const REAL_MARKETING_HREF = "/app/real-marketing";

const HOW_STEPS = [
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
    d: "Move the asset into market activity, utility, or physical fulfillment.",
  },
] as const;

const WHO_IT_SERVES = [
  {
    title: "For creators",
    text: "Turn real work into NFTs, proof, identity, and collectible market value.",
  },
  {
    title: "For crypto brands",
    text: "Launch campaigns, branded products, community activations, and tokenized experiences.",
  },
  {
    title: "For collectors",
    text: "Own, trade, and receive real-world value through a premium Web3 interface.",
  },
  {
    title: "For real-world workers",
    text: "Tailors, cooks, designers, makers, builders, and other skilled people can enter Web3 through proof of real output.",
  },
] as const;

const CORE_MODULES = [
  {
    t: "Create NFT",
    d: "The core creator entry point for upload, metadata, mint, and ownership proof.",
    href: "/app/create",
  },
  {
    t: "Trading",
    d: "Move into listings, collectible market logic, resale movement, and future liquidity flows.",
    href: "/app/trading",
  },
  {
    t: "Profile",
    d: "Build creator identity, minted work, social proof, and stronger collectible presence.",
    href: "/app/profile",
  },
  {
    t: "Real Marketing",
    d: "Open the ecosystem layer for campaigns, crypto brand collaborations, storefronts, and phygital activations.",
    href: REAL_MARKETING_HREF,
  },
] as const;

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
        "relative overflow-hidden rounded-[34px] p-px md:rounded-[40px]",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.40),rgba(212,175,55,0.18),rgba(184,135,10,0.12))]",
        "shadow-[0_34px_140px_rgba(0,0,0,0.60)]",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "relative overflow-hidden rounded-[34px] md:rounded-[40px]",
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
        "px-3.5 py-1.5 text-[11px] font-semibold text-white/70",
        "shadow-[0_12px_40px_rgba(0,0,0,0.25)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function PrimaryButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center justify-center rounded-2xl px-6 py-3",
        "font-extrabold text-black",
        "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
        "shadow-[0_18px_60px_rgba(212,175,55,0.16)] ring-1 ring-black/15",
        "transition hover:-translate-y-[1px] hover:brightness-110 active:translate-y-0",
        className,
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function SecondaryButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center justify-center rounded-2xl border border-white/10",
        "bg-white/[0.04] px-6 py-3 font-extrabold",
        "transition hover:-translate-y-[1px] hover:bg-white/[0.07] active:translate-y-0",
        className,
      ].join(" ")}
    >
      {children}
    </Link>
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
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl shadow-[0_22px_80px_rgba(0,0,0,0.35)] transition hover:bg-white/[0.06]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/52">
        {title}
      </div>
      <div className="mt-3 text-xl font-black leading-tight tracking-tight text-white md:text-2xl">
        {value}
      </div>
      <div className="mt-2 text-sm leading-relaxed text-white/60">{hint}</div>
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
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_22px_80px_rgba(0,0,0,0.35)] transition hover:bg-white/[0.06]">
      <div className="text-[15px] font-extrabold tracking-tight text-white">
        {title}
      </div>
      <div className="mt-2 text-sm leading-relaxed text-white/62">{text}</div>
    </div>
  );
}

export default function AppPage() {
  return (
    <div className="relative isolate">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-140px] top-[80px] h-[360px] w-[360px] rounded-full bg-[#d4af37]/[0.10] blur-[120px]" />
        <div className="absolute right-[-160px] top-[240px] h-[460px] w-[460px] rounded-full bg-[#b8870a]/[0.10] blur-[145px]" />
        <div className="absolute left-[22%] top-[760px] h-[430px] w-[430px] rounded-full bg-[#f7e7a7]/[0.05] blur-[155px]" />
        <div className="absolute right-[8%] top-[1180px] h-[340px] w-[340px] rounded-full bg-[#d4af37]/[0.06] blur-[130px]" />

        <div className="absolute inset-x-0 top-[220px] h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.18),transparent)]" />
        <div className="absolute inset-x-0 top-[760px] h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.12),transparent)]" />
        <div className="absolute inset-x-0 top-[1320px] h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.10),transparent)]" />
      </div>

      <div className="mx-auto max-w-[1400px] space-y-8 2xl:max-w-[1480px]">
        <Reveal>
          <GoldEdgeCard>
            <div className="grid gap-0 xl:grid-cols-[minmax(0,1.2fr)_420px]">
              <div className="p-8 md:p-12 xl:p-14 xl:pr-10">
                <div className="flex flex-wrap items-center gap-3">
                  <LuxPill>
                    <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
                    Tokenized real-world assets • App live
                  </LuxPill>

                  <LuxPill className="bg-black/20">
                    Base • IPFS • delivery-aware NFTs
                  </LuxPill>
                </div>

                <h1 className="mt-7 max-w-4xl text-4xl font-black leading-[1.02] tracking-[-0.035em] md:text-6xl">
                  Realife — the premium app layer for
                  <br />
                  <span className="bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] bg-clip-text text-transparent">
                    real-world NFT assets
                  </span>
                </h1>

                <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/65 md:text-base">
                  This is where real-world work, products, packaging, branded
                  experiences, and creator output become structured, minted,
                  tradable, and ready for delivery-aware ownership. Built for
                  creators, crypto brands, collectors, and real-world skill
                  economies.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <PrimaryButton href="/app/create">Mint NFT</PrimaryButton>

                  <SecondaryButton href="/app/faucet">
                    Get test ETH
                  </SecondaryButton>

                  <SecondaryButton href={REAL_MARKETING_HREF}>
                    Enter Real Marketing
                  </SecondaryButton>
                </div>

                <div className="mt-8 flex flex-wrap gap-2.5">
                  {[
                    "Creator-first UX",
                    "Proof of real work",
                    "Phygital-ready",
                    "Premium Web3 surface",
                  ].map((x) => (
                    <LuxPill key={x} className="bg-black/20">
                      {x}
                    </LuxPill>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/8 p-8 md:p-10 xl:border-l xl:border-t-0 xl:p-12">
                <div className="grid gap-5">
                  <StatCard
                    title="Core Loop"
                    value="Create → Mint"
                    hint="Turn real value into on-chain ownership."
                  />
                  <StatCard
                    title="Market Layer"
                    value="Trade → Deliver"
                    hint="Move from collectible asset to real-world utility."
                  />
                  <StatCard
                    title="Positioning"
                    value="Phygital-ready NFTs"
                    hint="Tokenized real-world assets designed for Web3."
                  />
                </div>

                <div className="mt-6 overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,rgba(247,231,167,0.30),rgba(212,175,55,0.14),rgba(184,135,10,0.10))] p-px">
                  <div className="rounded-[30px] border border-white/10 bg-[#0b0a09]/50 p-6 backdrop-blur-2xl">
                    <p className="text-sm font-extrabold text-white">
                      Create → Mint → Trade → Deliver
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-white/62">
                      Tokenized real-world assets for creators, crypto brands,
                      collectors, and delivery-aware ownership.
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <PrimaryButton href="/app/create" className="w-full">
                        Start minting
                      </PrimaryButton>

                      <SecondaryButton href="/app/trading" className="w-full">
                        Open market
                      </SecondaryButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GoldEdgeCard>
        </Reveal>

        <div className="grid items-start gap-8 lg:grid-cols-12 xl:gap-10">
          <Reveal className="lg:col-span-8" delayMs={90}>
            <GoldEdgeCard className="h-full">
              <div className="p-8 md:p-10 xl:p-12">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                  How it works
                </p>
                <h2 className="mt-3 max-w-3xl text-2xl font-black tracking-tight md:text-3xl">
                  A creator-first path into on-chain ownership
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/65 md:text-base">
                  Realife keeps the experience understandable for normal people
                  while preserving the core Web3 logic: wallet, metadata, mint,
                  collectible ownership, market movement, and physical delivery
                  when the tokenized asset maps to something real.
                </p>

                <div className="mt-8 grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
                  {HOW_STEPS.map((s) => (
                    <div
                      key={s.n}
                      className="flex min-h-[190px] flex-col rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_22px_80px_rgba(0,0,0,0.35)] transition hover:bg-white/[0.06]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-xs font-extrabold text-black shadow-[0_16px_50px_rgba(212,175,55,0.16)]">
                          {s.n}
                        </div>
                        <p className="text-base font-extrabold tracking-tight">
                          {s.t}
                        </p>
                      </div>

                      <p className="mt-3 text-sm leading-relaxed text-white/62">
                        {s.d}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,rgba(247,231,167,0.26),rgba(212,175,55,0.12),rgba(184,135,10,0.08))] p-px">
                  <div className="rounded-[30px] border border-white/10 bg-[#0b0a09]/55 p-6 backdrop-blur-2xl">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="max-w-2xl">
                        <p className="text-base font-extrabold text-white">
                          Not only a collectible flow
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-white/65">
                          Realife can keep an NFT purely digital or connect it
                          to real-world fulfillment — products, packaging,
                          creator-made objects, branded drops, and delivery-aware
                          tokenized ownership.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2.5">
                        <LuxPill className="bg-black/25">
                          Proof of real work
                        </LuxPill>
                        <LuxPill className="bg-black/25">
                          Market-ready ownership
                        </LuxPill>
                        <LuxPill className="bg-black/25">
                          Delivery-aware NFTs
                        </LuxPill>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <PrimaryButton href="/app/create">Go to mint</PrimaryButton>

                  <SecondaryButton href="/app/trading">
                    Open market
                  </SecondaryButton>
                </div>
              </div>
            </GoldEdgeCard>
          </Reveal>

          <Reveal className="lg:col-span-4" delayMs={150}>
            <div className="lg:sticky lg:top-6">
              <GoldEdgeCard className="h-full">
                <div className="p-8 md:p-10">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                    Who it serves
                  </p>
                  <h3 className="mt-3 text-2xl font-black tracking-tight">
                    Creators, crypto brands, collectors — and real-world workers
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/65">
                    Realife is not just a mint page. It is the working surface
                    of a larger ecosystem connecting digital ownership with real
                    production, campaigns, commerce, and delivery.
                  </p>

                  <div className="mt-7 space-y-4">
                    {WHO_IT_SERVES.map((item) => (
                      <MiniCard
                        key={item.title}
                        title={item.title}
                        text={item.text}
                      />
                    ))}
                  </div>

                  <div className="mt-7 border-t border-white/8 pt-5 text-[11px] leading-relaxed text-white/45">
                    Base • IPFS • creator economy • delivery-aware NFTs • social
                    onboarding into Web3
                  </div>
                </div>
              </GoldEdgeCard>
            </div>
          </Reveal>
        </div>

        <Reveal>
          <GoldEdgeCard>
            <div className="p-8 md:p-10 xl:p-12">
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                    Core modules
                  </p>
                  <h2 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">
                    Move through the ecosystem with clarity
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65">
                    Each module has a clear role: mint, present, trade, connect
                    with brands, and build stronger creator identity with
                    real-world utility.
                  </p>
                </div>
              </div>

              <div className="mt-7 grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
                {CORE_MODULES.map((x) => (
                  <div
                    key={x.t}
                    className="flex h-full flex-col rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_22px_80px_rgba(0,0,0,0.35)] transition hover:bg-white/[0.06]"
                  >
                    <div className="text-lg font-black tracking-tight">
                      {x.t}
                    </div>
                    <div className="mt-3 text-sm leading-relaxed text-white/65">
                      {x.d}
                    </div>
                    <Link
                      href={x.href}
                      className="mt-6 inline-flex w-fit rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/[0.08]"
                    >
                      Open →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </GoldEdgeCard>
        </Reveal>

        <Reveal>
          <GoldEdgeCard>
            <div className="p-8 md:p-10 xl:p-12">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                Inside the ecosystem
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">
                Beyond minting: real-world verticals inside Realife
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/65">
                Realife expands beyond creator minting into branded campaigns,
                storefront experiences, tokenized product stories, and
                delivery-ready NFT ownership connected to the real world.
              </p>

              <div className="mt-8 grid gap-5 lg:grid-cols-3 xl:gap-6">
                <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_22px_80px_rgba(0,0,0,0.35)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                    Brand collaboration layer
                  </p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight">
                    Real Marketing
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/65">
                    The ecosystem hub for creator campaigns, crypto brand
                    collaborations, Crypto Cafe, Realife Store, and phygital
                    drops.
                  </p>

                  <div className="mt-5 grid gap-3">
                    {[
                      "Campaigns and branded experiences",
                      "Collectible product storytelling",
                      "Delivery-ready NFT activations",
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
                    <PrimaryButton href={REAL_MARKETING_HREF} className="w-full">
                      Enter Real Marketing
                    </PrimaryButton>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04]">
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
                      <div className="mt-2 text-sm leading-relaxed text-white/70">
                        A premium storefront concept for branded goods,
                        collectible atmosphere, and phygital experiences.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04]">
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
                      <div className="mt-2 text-sm leading-relaxed text-white/70">
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

        <Reveal>
          <GoldEdgeCard>
            <div className="p-8 md:p-12">
              <div className="grid items-center gap-8 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                    Vision
                  </p>
                  <h2 className="mt-3 text-3xl font-black leading-[1.05] tracking-tight md:text-4xl">
                    We are building a Web3 surface where{" "}
                    <span className="bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] bg-clip-text text-transparent">
                      real people, real products, and real work
                    </span>{" "}
                    become on-chain value.
                  </h2>
                  <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/65 md:text-base">
                    Realife is designed to feel premium for investors and simple
                    for users: clean flow, strong storytelling, real-world
                    relevance, creator participation, and crypto-native
                    ownership with room for physical delivery.
                  </p>
                </div>

                <div className="lg:col-span-4">
                  <div className="flex flex-col gap-3">
                    <PrimaryButton href="/app/create" className="w-full">
                      Mint now
                    </PrimaryButton>

                    <SecondaryButton
                      href={REAL_MARKETING_HREF}
                      className="w-full"
                    >
                      Explore Real Marketing
                    </SecondaryButton>
                  </div>
                </div>
              </div>
            </div>
          </GoldEdgeCard>
        </Reveal>

        <div className="px-2 text-xs text-white/45">
          Realife premium UI • on-chain mint • IPFS metadata • tokenized
          real-world assets • delivery-aware ownership
        </div>
      </div>
    </div>
  );
}