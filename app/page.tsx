"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useMemo } from "react";
import ConnectWallet from "@/components/ConnectWallet";

const REAL_MARKETING_HREF = "/app/real-marketing";

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
        "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06]",
        "px-3 py-1.5 text-[11px] font-semibold text-white/65 backdrop-blur-2xl",
        "shadow-[0_12px_40px_rgba(0,0,0,0.25)]",
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
        "relative inline-flex items-center justify-center overflow-hidden rounded-2xl px-7 py-4 font-extrabold tracking-tight text-black",
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
        "inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-7 py-4 font-semibold text-white/90 backdrop-blur-2xl",
        "shadow-[0_18px_70px_rgba(0,0,0,0.28)] transition duration-300 hover:bg-white/10 hover:-translate-y-px active:translate-y-0",
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
      {text && <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60">{text}</p>}
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
        <div className="mt-2 text-sm leading-relaxed text-white/60">{item.text}</div>
      </div>
    </GlassCard>
  );
}

function VideoCard({
  label,
  badge,
  title,
  text,
  src,
  aspect = "aspect-[4/3]",
  className = "",
}: {
  label: string;
  badge: string;
  title: string;
  text?: string;
  src: string;
  aspect?: string;
  className?: string;
}) {
  return (
    <GlassCard className={cx("rounded-[32px] before:rounded-[32px]", className)}>
      <div className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-white/40">{label}</div>
            <div className="mt-1 text-2xl font-black tracking-tight">{title}</div>
          </div>
          <Pill className="bg-black/35">{badge}</Pill>
        </div>

        {text && <p className="mt-4 text-sm leading-relaxed text-white/60">{text}</p>}

        <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-black/30">
          <video
            src={src}
            autoPlay
            loop
            muted
            playsInline
            className={cx(aspect, "w-full object-cover object-center")}
          />
        </div>
      </div>
    </GlassCard>
  );
}

export default function HomePage() {
  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070606] text-white">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_50%,transparent_20%,#040303_100%)] opacity-90" />
        <div className="animate-orb-1 absolute -left-[10%] -top-[20%] h-[800px] w-[800px] rounded-full bg-[#d4af37] blur-[140px]" />
        <div className="animate-orb-2 absolute -bottom-[20%] -right-[10%] h-[900px] w-[900px] rounded-full bg-[#d4af37] blur-[160px]" />
        <div className="animate-top-glow absolute top-0 h-[420px] w-[620px] rounded-full bg-[#f7e7a7] blur-[120px]" />
        <div
          className="absolute inset-0 z-0 opacity-[0.028]"
          style={{
            backgroundImage:
              "linear-gradient(to right,rgba(212,175,55,0.22) 1px,transparent 1px),linear-gradient(to bottom,rgba(212,175,55,0.18) 1px,transparent 1px)",
            backgroundSize: "96px 96px",
            maskImage: "radial-gradient(ellipse at 50% 42%,black 26%,transparent 78%)",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 42%,black 26%,transparent 78%)",
          }}
        />
        <div className="absolute inset-0 z-20 bg-[radial-gradient(circle,rgba(255,255,255,1)_1px,transparent_1px)] opacity-[0.03] mix-blend-screen [background-size:12px_12px]" />
      </div>

      <div className="relative z-30 mx-auto max-w-7xl px-6 py-8 md:py-10">
        <Reveal>
          <section className="grid items-start gap-10 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <Pill>
                <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
                Realife platform
              </Pill>

              <h1 className="mt-6 text-4xl font-black leading-[1.02] tracking-[-0.03em] md:text-7xl">
                Real World Value NFT Marketplace with{" "}
                <span className="bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] bg-clip-text text-transparent">
                  AI and Escrow
                </span>{" "}
                for Services & Delivery
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/60 md:text-lg">
                Realife transforms real-world work, products, and services into
                on-chain assets with marketplace utility, AI assistance, and
                escrow-backed completion or physical delivery.
              </p>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/50 md:text-base">
                Built for creators, brands, workers, and collectors who want real
                value, not only digital speculation.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {[
                  "On-chain proof",
                  "AI assistance",
                  "Service escrow",
                  "Delivery escrow",
                ].map((x) => (
                  <Pill key={x}>{x}</Pill>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <GoldButton href="/app/create">Start minting</GoldButton>
                <GhostButton href="/app/trading">Open marketplace</GhostButton>
              </div>

              <GlassCard className="mt-8">
                <div className="grid gap-4 p-5 md:grid-cols-12 md:items-center">
                  <div className="md:col-span-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                      Creator access
                    </div>
                    <div className="mt-3">
                      <ConnectWallet />
                    </div>
                  </div>

                  <div className="md:col-span-8">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        ["Category", "RWV NFT marketplace"],
                        ["AI", "Integrated platform assistant"],
                        ["Trust layer", "Escrow for services and delivery"],
                      ].map(([t, d]) => (
                        <div
                          key={t}
                          className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                        >
                          <div className="text-sm font-bold tracking-tight">{t}</div>
                          <div className="mt-1 text-xs leading-relaxed text-white/60">{d}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>

            <div className="lg:col-span-6">
              <div className="grid gap-4">
                <VideoCard
                  label="Main video"
                  badge="Hero"
                  title="Realife in motion"
                  text="A premium introduction to the platform vision — real value, digital ownership, and a stronger trust layer for service or delivery outcomes."
                  src="/videos/realife-main-hero.mp4"
                  aspect="aspect-[4/3]"
                />

                <VideoCard
                  label="Second video"
                  badge="People / Vision"
                  title="Real-world value"
                  text="A supporting visual layer focused on people, atmosphere, movement, and the human side of the Realife economy."
                  src="/videos/realife-vision.mp4"
                  aspect="aspect-[16/10]"
                />
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal className="mt-24">
          <section>
            <SectionHeading
              label="What Realife means"
              title="Real value connected to digital ownership"
              text="A premium ecosystem for real-world work, products, services, marketplace utility, and escrow-backed completion."
              center
            />

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                [
                  "Real-world work",
                  "Human effort, skill, and creative output can become market-ready digital ownership.",
                ],
                [
                  "Real products",
                  "Physical goods and branded objects can connect to collectible NFT utility and ownership.",
                ],
                [
                  "Real services",
                  "Service-based value can move through protected flows inside the Realife platform.",
                ],
                [
                  "Escrow and delivery",
                  "Realife supports trusted service completion and physical delivery-oriented settlement.",
                ],
              ].map(([t, d]) => (
                <GlassCard key={t}>
                  <div className="p-5">
                    <div className="text-lg font-black tracking-tight">{t}</div>
                    <div className="mt-2 text-sm leading-relaxed text-white/60">{d}</div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal className="mt-24">
          <section>
            <GlassCard className="rounded-[36px] before:rounded-[36px]">
              <div className="grid items-center gap-8 p-6 md:p-10 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-white/40">Flow video</div>
                      <div className="text-2xl font-black tracking-tight">
                        How Realife works
                      </div>
                    </div>
                    <Pill className="bg-black/35">Flow</Pill>
                  </div>

                  <p className="mb-5 text-sm leading-relaxed text-white/60">
                    This section explains the operating logic of the platform —
                    from real-world creation to minting, trading, and escrow-backed
                    completion or delivery.
                  </p>

                  <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/30">
                    <video
                      src="/videos/realife-service-delivery-flow.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="aspect-[16/10] w-full object-cover object-center"
                    />
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <SectionHeading
                    label="How Realife works"
                    title="Create, mint, trade, and complete"
                    text="From real-world value to NFT ownership, marketplace activity, and escrow-backed service or delivery outcomes."
                  />

                  <div className="mt-6 grid gap-3">
                    {[
                      ["01", "Create", "Create real work, products, packaging, or services."],
                      ["02", "Mint", "Turn value into an NFT with metadata and on-chain proof."],
                      ["03", "Trade", "Move the asset through the Realife marketplace and ecosystem."],
                      [
                        "04",
                        "Complete",
                        "Use escrow for service completion or physical delivery with clearer trust flows.",
                      ],
                    ].map(([n, t, d]) => (
                      <div
                        key={n}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] text-xs font-extrabold text-black">
                            {n}
                          </div>
                          <div className="text-sm font-bold">{t}</div>
                        </div>
                        <div className="mt-2 text-xs leading-relaxed text-white/60">{d}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          </section>
        </Reveal>

        <Reveal className="mt-24">
          <section>
            <SectionHeading
              label="Inside the ecosystem"
              title="More than minting"
              text="Realife expands beyond creator minting into branded campaigns, storefront experiences, premium product stories, and real-world utility."
            />

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              <GlassCard className="h-full">
                <div className="flex h-full flex-col p-8">
                  <Pill className="bg-black/35">Brand collaboration layer</Pill>
                  <h3 className="mt-5 text-3xl font-black tracking-tight">Real Marketing</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/60">
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
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/75"
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
                    <div className="text-2xl font-black tracking-tight">
                      Realife Crypto Cafe
                    </div>
                    <div className="mt-2 text-sm leading-relaxed text-white/60">
                      A premium storefront concept for branded goods, collectible
                      atmosphere, and phygital experiences.
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
                    <div className="mt-2 text-sm leading-relaxed text-white/60">
                      Tokenized real-world products, branded packaging, and collectible
                      ownership stories.
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </section>
        </Reveal>

        <Reveal className="mt-24">
          <section>
            <SectionHeading
              label="Human story"
              title="Real people. Real products. Real value."
              text="A visual layer that shows the human side of ownership, making, service, and delivery inside the Realife world."
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
                  <div className="relative min-h-[420px] bg-[#120f0d] md:col-span-5">
                    <Image
                      src={STORY_CARDS[6].image}
                      alt={STORY_CARDS[6].alt}
                      fill
                      className="object-contain object-center p-4"
                      sizes="(max-width: 768px) 100vw, 40vw"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.16),rgba(0,0,0,0.02))]" />
                  </div>
                  <div className="p-8 md:col-span-7 md:p-10">
                    <Pill>{STORY_CARDS[6].label}</Pill>
                    <h3 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">
                      {STORY_CARDS[6].title}
                    </h3>
                    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/60 md:text-base">
                      {STORY_CARDS[6].text}
                    </p>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {[
                        "Not only for traders or developers",
                        "Built for artists, makers, workers, and communities",
                        "Bridge between offline talent and digital ownership",
                        "A premium layer for real human contribution",
                      ].map((x) => (
                        <div
                          key={x}
                          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/75"
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

        <Reveal className="mt-24">
          <section>
            <GlassCard className="rounded-[36px] before:rounded-[36px]">
              <div className="grid items-center gap-8 p-8 md:p-12 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <SectionHeading
                    label="Start"
                    title="Bring real-world value on-chain"
                    text="Create NFTs for real products, services, and branded experiences with AI assistance, marketplace utility, and escrow-backed flows."
                  />
                </div>
                <div className="lg:col-span-4">
                  <div className="flex flex-col gap-3">
                    <GoldButton href="/app/create" className="w-full">
                      Start minting
                    </GoldButton>
                    <GhostButton href="/app/trading" className="w-full">
                      Open marketplace
                    </GhostButton>
                    <GhostButton href={REAL_MARKETING_HREF} className="w-full">
                      Explore Real Marketing
                    </GhostButton>
                  </div>
                </div>
              </div>
            </GlassCard>
          </section>
        </Reveal>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 pb-10 text-xs text-white/40">
          <div>© {year} Realife</div>
          <div className="flex flex-wrap items-center gap-4 opacity-60">
            <span>AI assistance</span>
            <span>On-chain mint</span>
            <span>Service escrow</span>
            <span>Delivery escrow</span>
            <span>Real World Value</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
