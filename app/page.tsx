"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useMemo } from "react";
import ConnectWallet from "@/components/ConnectWallet";

const REAL_MARKETING_HREF = "/app/real-marketing"; // если путь другой — поменяй тут

const CORE_FLOW = [
  { n: "01", t: "Create", d: "Create real work, products, packaging, media, or branded experiences." },
  { n: "02", t: "Mint", d: "Turn that real-world value into an NFT with metadata and on-chain proof." },
  { n: "03", t: "Trade", d: "List, collect, showcase, or move the asset through the Realife ecosystem." },
  { n: "04", t: "Deliver", d: "Connect digital ownership with physical products and real-world delivery." },
] as const;

const HERO_PROOFS = [
  { t: "On-chain mint", d: "Real tx + signature flow" },
  { t: "IPFS metadata", d: "Permanent collectible context" },
  { t: "Phygital ready", d: "Trade or connect to delivery" },
] as const;

const STORY_CARDS = [
  {
    label: "Creator Story",
    title: "Real work becomes digital value",
    text: "A real painting, created by hand, can become a collectible digital asset inside the Realife ecosystem.",
    image: "/brand/1.jpg",
    alt: "Creator standing with finished painting",
  },
  {
    label: "Creative Process",
    title: "Proof begins with the making",
    text: "Realife starts from authentic human effort — the process, the skill, and the story behind the finished work.",
    image: "/brand/2.jpg",
    alt: "Painting process close-up",
  },
  {
    label: "Collectible Presentation",
    title: "From artwork to premium asset",
    text: "A finished piece can be presented, packaged, and prepared as a collectible object with digital ownership value.",
    image: "/brand/3.jpg",
    alt: "Artwork with certificate and premium presentation",
  },
  {
    label: "Brand Collaboration",
    title: "Creative work can power campaigns",
    text: "Artists, makers, and brands can turn real creations into collectible stories, product concepts, and community activations.",
    image: "/brand/4.jpg",
    alt: "Creative collaboration session",
  },
  {
    label: "Creator Shipping",
    title: "Creators can send real value",
    text: "A work made at home can move beyond the studio — carefully prepared for delivery into the wider Realife economy.",
    image: "/brand/5.jpg",
    alt: "Creator sending a painting",
  },
  {
    label: "Collector Delivery",
    title: "Ownership arrives in the real world",
    text: "Realife connects digital ownership with physical delivery, so value can be experienced both on-chain and offline.",
    image: "/brand/6.jpg",
    alt: "Buyer receiving delivered artwork",
  },
  {
    label: "Accessible Web3",
    title: "Built for everyday creators",
    text: "Realife is designed for ordinary talented people — not only traders or developers, but anyone with real creative skill.",
    image: "/brand/7.jpg",
    alt: "Everyday creator with artwork in studio",
  },
] as const;

function cx(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(" ");
}

function Pill({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/72 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.25)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function GoldButton({
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
      className={cx(
        "relative inline-flex items-center justify-center overflow-hidden rounded-2xl px-7 py-4 text-black font-extrabold tracking-tight",
        "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_42%,#b8870a_100%)]",
        "shadow-[0_22px_70px_rgba(212,175,55,0.18)] ring-1 ring-black/15",
        "transition duration-300 hover:-translate-y-px hover:brightness-110 active:translate-y-0",
        "before:absolute before:inset-0 before:bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.35),transparent)]",
        "before:translate-x-[-140%] hover:before:translate-x-[140%] before:transition before:duration-700",
        className
      )}
    >
      <span className="relative z-10">{children}</span>
    </Link>
  );
}

function GhostButton({
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
      className={cx(
        "inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-7 py-4 text-white font-semibold backdrop-blur-2xl",
        "shadow-[0_18px_70px_rgba(0,0,0,0.28)] transition duration-300 hover:bg-white/[0.10] hover:-translate-y-px active:translate-y-0",
        className
      )}
    >
      {children}
    </Link>
  );
}

function Reveal({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cx("motion-safe:animate-[fadeUp_.7s_ease-out_both]", className)}>
      {children}
    </div>
  );
}

function GlassCard({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-[28px] border border-white/10",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))]",
        "backdrop-blur-2xl shadow-[0_28px_120px_rgba(0,0,0,0.38)]",
        "before:absolute before:inset-0 before:rounded-[28px] before:p-px",
        "before:bg-[linear-gradient(135deg,rgba(247,231,167,0.35),rgba(212,175,55,0.18),rgba(184,135,10,0.12))]",
        "before:[mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)]",
        "before:[-webkit-mask-composite:xor] before:mask-exclude",
        "after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_25%_0%,rgba(212,175,55,0.14),transparent_45%)]",
        className
      )}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function SectionHeading({
  label,
  title,
  text,
  center = false,
}: {
  label: string;
  title: string;
  text?: string;
  center?: boolean;
}) {
  return (
    <div className={cx(center && "mx-auto text-center")}>
      <Pill>
        <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_4px_rgba(212,175,55,0.12)]" />
        {label}
      </Pill>
      <h2 className="mt-5 text-3xl font-black tracking-tight md:text-5xl">{title}</h2>
      {text ? <p className="mt-4 max-w-3xl text-base text-white/60">{text}</p> : null}
    </div>
  );
}

function StoryCard({
  item,
  className = "",
  imageClassName = "",
}: {
  item: (typeof STORY_CARDS)[number];
  className?: string;
  imageClassName?: string;
}) {
  return (
    <GlassCard className={className}>
      <div className={cx("relative overflow-hidden", imageClassName || "aspect-[16/11]")}>
        <Image
          src={item.image}
          alt={item.alt}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.58),rgba(0,0,0,0.06))]" />
        <div className="absolute left-4 top-4">
          <Pill className="bg-black/35">{item.label}</Pill>
        </div>
      </div>

      <div className="p-6">
        <div className="text-2xl font-black tracking-tight">{item.title}</div>
        <div className="mt-2 text-sm leading-relaxed text-white/65">{item.text}</div>
      </div>
    </GlassCard>
  );
}

export default function HomePage() {
  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070606] text-white">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes fadeUp {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes slow-float {
              0%, 100% { transform: translate(0px, 0px) scale(1); opacity: 0.15; }
              50% { transform: translate(-50px, 40px) scale(1.1); opacity: 0.35; }
            }
            @keyframes slow-float-reverse {
              0%, 100% { transform: translate(0px, 0px) scale(1); opacity: 0.10; }
              50% { transform: translate(50px, -40px) scale(1.15); opacity: 0.30; }
            }
            @keyframes slow-pulse-top {
              0%, 100% { opacity: 0.05; transform: scale(1) translateX(-50%); }
              50% { opacity: 0.25; transform: scale(1.1) translateX(-48%); }
            }
            .animate-orb-1 { animation: slow-float 12s ease-in-out infinite; }
            .animate-orb-2 { animation: slow-float-reverse 15s ease-in-out infinite; }
            .animate-top-glow { animation: slow-pulse-top 10s ease-in-out infinite; left: 50%; }
          `,
        }}
      />

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_50%,transparent_20%,#040303_100%)] opacity-90" />
        <div className="animate-orb-1 absolute -left-[10%] -top-[20%] h-[800px] w-[800px] rounded-full bg-[#d4af37] blur-[140px]" />
        <div className="animate-orb-2 absolute -bottom-[20%] -right-[10%] h-[900px] w-[900px] rounded-full bg-[#d4af37] blur-[160px]" />
        <div className="animate-top-glow absolute top-0 h-[420px] w-[620px] rounded-full bg-[#f7e7a7] blur-[120px]" />
        <div
          className="absolute inset-0 z-0 opacity-[0.028]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(212,175,55,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(212,175,55,0.18) 1px, transparent 1px)",
            backgroundSize: "96px 96px",
            maskImage: "radial-gradient(ellipse at 50% 42%, black 26%, transparent 78%)",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 42%, black 26%, transparent 78%)",
          }}
        />
        <div className="absolute inset-0 z-20 bg-[radial-gradient(circle,rgba(255,255,255,1)_1px,transparent_1px)] opacity-[0.03] mix-blend-screen [background-size:12px_12px]" />
      </div>

      <div className="relative z-30 mx-auto max-w-7xl px-6 py-8 md:py-10">
        {/* top bar */}
        <Reveal>
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-10 w-[210px]">
                <Image
                  src="/brand/logo-wordmark.png"
                  alt="Realife"
                  fill
                  className="object-contain object-left"
                  sizes="210px"
                />
              </div>
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/app"
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/[0.08]"
              >
                App
              </Link>
              <Link
                href={REAL_MARKETING_HREF}
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/[0.08]"
              >
                Real Marketing
              </Link>
              <Link
                href="/app/trading"
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/[0.08]"
              >
                Trading
              </Link>
            </div>
          </header>
        </Reveal>

        {/* hero */}
        <Reveal>
          <section className="grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <Pill>
                <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
                Tokenized real-world assets
              </Pill>

              <h1 className="mt-6 text-4xl font-black leading-[1.02] tracking-[-0.03em] md:text-7xl">
                Create, mint, trade, and{" "}
                <span className="bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] bg-clip-text text-transparent">
                  deliver
                </span>{" "}
                real-world value.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/72 md:text-lg">
                Realife turns real-world work, products, and branded experiences into NFTs for
                creators, crypto brands, and collectors. It is a premium Web3 ecosystem where
                human effort becomes collectible ownership, market-ready assets, and real-world utility.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <GoldButton href="/app/create">Mint your first NFT</GoldButton>
                <GhostButton href="/app">Open the App</GhostButton>
                <GhostButton href={REAL_MARKETING_HREF}>Enter Real Marketing</GhostButton>
              </div>

              <div className="mt-10 grid gap-4 md:grid-cols-12">
                <GlassCard className="md:col-span-5">
                  <div className="p-5">
                    <div className="text-[11px] font-semibold text-white/60">Wallet</div>
                    <div className="mt-3">
                      <ConnectWallet />
                    </div>
                    <div className="mt-3 text-[11px] leading-relaxed text-white/55">
                      Connect wallet, prepare metadata, mint on-chain, and move into market or delivery flows.
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="md:col-span-7">
                  <div className="p-5">
                    <div className="text-[11px] font-semibold text-white/60">Crypto-native proof</div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {HERO_PROOFS.map((x) => (
                        <div
                          key={x.t}
                          className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.30),rgba(0,0,0,0.22))] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.25)]"
                        >
                          <div className="text-sm font-semibold tracking-tight">{x.t}</div>
                          <div className="mt-1 text-xs leading-relaxed text-white/60">{x.d}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>

            <div className="lg:col-span-6">
              <GlassCard className="rounded-[36px] before:rounded-[36px]">
                <div className="p-6 md:p-8">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-white/60">Main video</div>
                      <div className="text-2xl font-black tracking-tight">Realife in motion</div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[11px] text-white/70">
                      Hero
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-white/65">
                    The core loop: create something real, mint it, trade it, and connect digital ownership
                    with real-world delivery and collectible value.
                  </p>

                  <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-black/30">
                    <video
                      src="/videos/realife-hero-cropped.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="aspect-[4/3] w-full object-cover object-center"
                    />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-sm font-bold tracking-tight">Creators</div>
                      <div className="mt-1 text-xs leading-relaxed text-white/58">
                        Real work becomes NFTs, proof, reputation, and market-ready assets.
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-sm font-bold tracking-tight">Crypto brands</div>
                      <div className="mt-1 text-xs leading-relaxed text-white/58">
                        Campaigns, branded products, collectible stories, and community activations.
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-sm font-bold tracking-tight">Collectors</div>
                      <div className="mt-1 text-xs leading-relaxed text-white/58">
                        Own, trade, and receive tokenized real-world value inside a premium UX.
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-sm font-bold tracking-tight">Phygital utility</div>
                      <div className="mt-1 text-xs leading-relaxed text-white/58">
                        Digital ownership can stay on-chain or move into physical delivery and goods.
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </section>
        </Reveal>

        {/* core strip */}
        <Reveal className="mt-24">
          <section>
            <GlassCard className="rounded-[36px] before:rounded-[36px]">
              <div className="p-6 md:p-10">
                <SectionHeading
                  label="Core value flow"
                  title="Create → Mint → Trade → Deliver"
                  text="Tokenized real-world assets for creators, crypto brands, and collectors."
                  center
                />

                <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {CORE_FLOW.map((x) => (
                    <div
                      key={x.n}
                      className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_22px_80px_rgba(0,0,0,0.35)] transition hover:bg-white/[0.06]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] text-xs font-extrabold text-black shadow-[0_16px_50px_rgba(212,175,55,0.16)]">
                          {x.n}
                        </div>
                        <p className="text-sm font-extrabold">{x.t}</p>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-white/60">{x.d}</p>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </section>
        </Reveal>

        {/* ecosystem */}
        <Reveal className="mt-24">
          <section>
            <SectionHeading
              label="Inside the ecosystem"
              title="Beyond minting: real-world verticals inside Realife"
              text="Realife expands beyond creator minting into branded campaigns, storefront experiences, and tokenized product stories."
            />

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              <GlassCard className="h-full">
                <div className="flex h-full flex-col p-8">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0">
                      <Image
                        src="/brand/logo-mark.png"
                        alt="Realife mark"
                        fill
                        className="object-contain"
                        sizes="40px"
                      />
                    </div>
                    <Pill className="bg-black/35">Brand collaboration layer</Pill>
                  </div>

                  <h3 className="mt-5 text-3xl font-black tracking-tight">Real Marketing</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/65">
                    The ecosystem hub for creator campaigns, crypto brand collaborations,
                    Crypto Cafe, and Realife Store.
                  </p>

                  <div className="mt-6 grid gap-3">
                    {[
                      "Campaigns for crypto projects",
                      "Product storytelling and vertical launches",
                      "Bridge between creators and Web3 brands",
                    ].map((x) => (
                      <div
                        key={x}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/76"
                      >
                        {x}
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-8">
                    <GoldButton href={REAL_MARKETING_HREF} className="w-full">
                      Enter Real Marketing
                    </GoldButton>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="overflow-hidden">
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
                    <Pill className="bg-black/40">Crypto Cafe</Pill>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="text-2xl font-black tracking-tight">Realife Crypto Cafe</div>
                    <div className="mt-2 text-sm leading-relaxed text-white/70">
                      A premium storefront concept for branded goods, collectible atmosphere, and phygital experiences.
                    </div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="overflow-hidden">
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
                    <Pill className="bg-black/40">Realife Store</Pill>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="text-2xl font-black tracking-tight">Realife Store</div>
                    <div className="mt-2 text-sm leading-relaxed text-white/70">
                      Tokenized real-world products, branded packaging, and collectible ownership stories.
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </section>
        </Reveal>

        {/* crypto/ui showcase */}
        <Reveal className="mt-24">
          <section>
            <GlassCard className="rounded-[36px] before:rounded-[36px]">
              <div className="grid items-center gap-8 p-6 md:p-10 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <SectionHeading
                    label="Crypto / UI showcase"
                    title="From real creation to verified ownership"
                    text="Realife combines wallet connection, metadata preparation, on-chain minting, and market or delivery-ready outcomes."
                  />

                  <div className="mt-6 grid gap-3">
                    {[
                      ["Wallet connected", "User enters the creator flow"],
                      ["Metadata prepared", "Media, story, proof, and context"],
                      ["Mint verified", "On-chain ownership and collectible proof"],
                      ["Ready for market or delivery", "Digital and real-world utility"],
                    ].map(([t, d]) => (
                      <div
                        key={t}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                      >
                        <div className="text-sm font-bold tracking-tight">{t}</div>
                        <div className="mt-1 text-xs leading-relaxed text-white/60">{d}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <div className="rounded-[30px] p-px bg-[linear-gradient(135deg,rgba(247,231,167,0.35),rgba(212,175,55,0.16),rgba(184,135,10,0.12))]">
                    <div className="rounded-[30px] border border-white/10 bg-[#0b0a09]/75 p-4 backdrop-blur-2xl">
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        {["Create NFT", "Marketplace", "Delivery"].map((tab, i) => (
                          <div
                            key={tab}
                            className={cx(
                              "rounded-full border px-3 py-1.5 text-[11px] font-semibold",
                              i === 0
                                ? "border-[#d4af37] bg-[#d4af37] text-black"
                                : "border-white/10 bg-white/[0.04] text-white/70"
                            )}
                          >
                            {tab}
                          </div>
                        ))}
                      </div>

                      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]">
                        <div className="grid gap-4 p-5 md:grid-cols-12">
                          <div className="md:col-span-7">
                            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                                Create asset
                              </div>
                              <div className="mt-3 space-y-3">
                                {[
                                  ["Asset type", "Real-world artwork"],
                                  ["Title", "Mountain lake painting"],
                                  ["Category", "Art / collectible"],
                                  ["Utility", "Trade or delivery-ready"],
                                ].map(([k, v]) => (
                                  <div
                                    key={k}
                                    className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
                                  >
                                    <div className="text-[10px] font-semibold uppercase text-white/45">{k}</div>
                                    <div className="mt-1 text-sm font-medium text-white/88">{v}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="md:col-span-5">
                            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                                Status
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {["Wallet connected", "IPFS metadata", "Base Sepolia", "Mint verified"].map((x) => (
                                  <div
                                    key={x}
                                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/82"
                                  >
                                    {x}
                                  </div>
                                ))}
                              </div>

                              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                <div className="text-sm font-bold tracking-tight">Creator-ready interface</div>
                                <div className="mt-2 text-xs leading-relaxed text-white/60">
                                  Clean enough for normal people, structured enough for Web3 logic, and premium enough for investor demos.
                                </div>
                              </div>

                              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                <div className="text-sm font-bold tracking-tight">Real-world utility layer</div>
                                <div className="mt-2 text-xs leading-relaxed text-white/60">
                                  The asset can remain collectible, move into trading, or connect to physical delivery.
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        {[
                          ["Creator UI", "Simple flow for real people"],
                          ["On-chain proof", "Metadata + wallet + ownership"],
                          ["RWA utility", "Trade, collect, and deliver"],
                        ].map(([t, d]) => (
                          <div key={t} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                            <div className="text-sm font-bold tracking-tight">{t}</div>
                            <div className="mt-1 text-xs leading-relaxed text-white/60">{d}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </section>
        </Reveal>

        {/* story/photos */}
        <Reveal className="mt-24">
          <section>
            <SectionHeading
              label="Human story"
              title="Real creators. Real objects. Real delivery."
              text="Realife is not built around speculation first. It starts with people, skill, effort, products, and the movement of value into Web3."
            />

            <div className="mt-10 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <StoryCard item={STORY_CARDS[0]} imageClassName="aspect-[16/12]" />
              </div>
              <div className="lg:col-span-5">
                <StoryCard item={STORY_CARDS[1]} imageClassName="aspect-[4/5]" />
              </div>

              <div className="lg:col-span-5">
                <StoryCard item={STORY_CARDS[2]} imageClassName="aspect-[4/5]" />
              </div>
              <div className="lg:col-span-7">
                <StoryCard item={STORY_CARDS[3]} imageClassName="aspect-[16/12]" />
              </div>

              <div className="lg:col-span-6">
                <StoryCard item={STORY_CARDS[4]} imageClassName="aspect-[16/12]" />
              </div>
              <div className="lg:col-span-6">
                <StoryCard item={STORY_CARDS[5]} imageClassName="aspect-[16/12]" />
              </div>
            </div>

            <div className="mt-6">
              <GlassCard className="overflow-hidden">
                <div className="grid items-center gap-0 md:grid-cols-12">
                  <div className="relative min-h-[380px] md:col-span-5">
                    <Image
                      src={STORY_CARDS[6].image}
                      alt={STORY_CARDS[6].alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 40vw"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.42),rgba(0,0,0,0.04))]" />
                  </div>

                  <div className="p-8 md:col-span-7 md:p-10">
                    <Pill>{STORY_CARDS[6].label}</Pill>
                    <h3 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">
                      {STORY_CARDS[6].title}
                    </h3>
                    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65 md:text-base">
                      {STORY_CARDS[6].text}
                    </p>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {[
                        "Not only for traders or developers",
                        "Built for artists, makers, workers, and communities",
                        "Bridge between offline talent and Web3 economy",
                        "A social layer for real human contribution",
                      ].map((x) => (
                        <div
                          key={x}
                          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/76"
                        >
                          {x}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </section>
        </Reveal>

        {/* final mission */}
        <Reveal className="mt-24">
          <section>
            <GlassCard className="rounded-[36px] before:rounded-[36px]">
              <div className="grid items-center gap-8 p-8 md:p-12 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <SectionHeading
                    label="Mission"
                    title="A premium Web3 ecosystem built around real value"
                    text="Realife helps creators, crypto projects, and collectors move beyond pure speculation into tokenized real-world assets, branded experiences, and delivery-aware ownership."
                  />
                </div>

                <div className="lg:col-span-4">
                  <div className="flex flex-col gap-3">
                    <GoldButton href="/app/create" className="w-full">
                      Start minting
                    </GoldButton>
                    <GhostButton href={REAL_MARKETING_HREF} className="w-full">
                      Explore Real Marketing
                    </GhostButton>
                    <GhostButton href="/app/trading" className="w-full">
                      Open trading
                    </GhostButton>
                  </div>
                </div>
              </div>
            </GlassCard>
          </section>
        </Reveal>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 pb-10 text-xs text-white/45">
          <div>© {year} Realife</div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="opacity-60">Base Sepolia</span>
            <span className="opacity-60">IPFS metadata</span>
            <span className="opacity-60">On-chain mint</span>
            <span className="opacity-60">Tokenized real-world assets</span>
          </div>
        </footer>
      </div>
    </main>
  );
}