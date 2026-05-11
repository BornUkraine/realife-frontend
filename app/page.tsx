// PATH: app/page.tsx — Public Home / Landing page outside AppShell
"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useMemo } from "react";
import ConnectWallet from "@/components/ConnectWallet";

const REAL_MARKETING_HREF = "/app/real-marketing";

const STORY_CARDS = [
  {
    label: "Creator Story",
    title: "Real work becomes tokenized value",
    text: "A real painting, product, or service can become an NFT-linked transaction right inside the Realife ecosystem.",
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
    label: "Product Presentation",
    title: "From real asset to on-chain commerce",
    text: "A finished item or service can be presented, packaged, and connected to digital ownership, marketplace activity, and fulfillment.",
    image: "/brand/3.jpg",
    alt: "Artwork with certificate and premium presentation",
  },
  {
    label: "Brand Collaboration",
    title: "Real-world value can power campaigns",
    text: "Artists, makers, sellers, workers, and brands can turn real creations into tokenized product stories and community activations.",
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
    title: "Ownership reaches the real world",
    text: "Realife connects on-chain transaction rights with physical delivery, so value can be experienced both digitally and offline.",
    image: "/brand/6.jpg",
    alt: "Buyer receiving delivered artwork",
  },
  {
    label: "Accessible Web3",
    title: "Built for everyday sellers and creators",
    text: "Realife is designed for ordinary talented people — not only traders or developers, but anyone with real products, services, or skills.",
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
        "relative inline-flex items-center justify-center overflow-hidden rounded-2xl px-4 py-2.5 text-xs font-extrabold tracking-tight text-black",
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
        "inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-xs font-semibold text-white/90 backdrop-blur-2xl",
        "shadow-[0_12px_44px_rgba(0,0,0,0.24)] transition duration-300 hover:bg-white/10 hover:-translate-y-px active:translate-y-0",
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
        "relative overflow-hidden rounded-[22px] border border-white/10",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))]",
        "backdrop-blur-2xl shadow-[0_24px_100px_rgba(0,0,0,0.34)]",
        "before:absolute before:inset-0 before:rounded-[22px] before:p-px",
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
      <h2 className="mt-3 text-2xl font-black tracking-tight md:text-[2rem]">{title}</h2>
      {text && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/60">{text}</p>}
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
      <div className="p-4">
        <div className="text-xl font-black tracking-tight">{item.title}</div>
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
    <GlassCard className={cx("rounded-[22px] before:rounded-[22px]", className)}>
      <div className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-white/40">{label}</div>
            <div className="mt-1 text-xl font-black tracking-tight">{title}</div>
          </div>
          <Pill className="bg-black/35">{badge}</Pill>
        </div>

        {text && <p className="mt-3 text-sm leading-relaxed text-white/60">{text}</p>}

        <div className="mt-4 overflow-hidden rounded-[18px] border border-white/10 bg-black/30">
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


const SHORT_FAQS = [
  {
    q: "What is Realife?",
    a: "Realife is a stablecoin escrow marketplace for real-world goods and services. Buyers can pay through protected commerce flows, while sellers deliver products, services, or work before funds are released.",
  },
  {
    q: "Is Realife only an NFT marketplace?",
    a: "No. Realife uses NFTs as receipts and tokenized transaction rights connected to real products, services, orders, delivery, and outcomes — not only as speculative collectibles.",
  },
  {
    q: "Why does Realife use NFT receipts?",
    a: "An NFT receipt can represent what was purchased, who owns the transaction right, what needs to be fulfilled, and what evidence or order state is connected to the deal.",
  },
  {
    q: "How does escrow protect buyers and sellers?",
    a: "Buyer funds can stay in escrow until delivery or service completion is confirmed. Sellers get a clearer payment path, and buyers are not forced to trust direct transfers blindly.",
  },
  {
    q: "What happens if there is a dispute?",
    a: "The funds stay in escrow while Realife reviews order state, delivery proof, service evidence, deadlines, messages, and buyer/seller confirmation before release, refund, or another resolution path.",
  },
  {
    q: "Is Realife live on mainnet?",
    a: "Realife is currently a live MVP on Base Sepolia testnet. Mainnet stablecoin commerce requires further security hardening, legal/compliance review, and production escrow readiness.",
  },
] as const;

const FOOTER_GROUPS = [
  {
    title: "Product",
    links: [
      { label: "Marketplace", href: "/app/trading" },
      { label: "Create NFT listing", href: "/app/create" },
      { label: "Real Marketing", href: REAL_MARKETING_HREF },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Trust & Safety",
    links: [
      { label: "Dispute Policy", href: "/dispute-policy" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "X / Twitter", href: "https://x.com/Born__Voyage", external: true },
      { label: "GitHub", href: "https://github.com/BornUkraine", external: true },
      { label: "Live MVP", href: "https://realife.live", external: true },
    ],
  },
] as const;

function ShortFaqSection() {
  return (
    <Reveal className="mt-5 md:mt-5">
      <section>
        <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-4">
            <SectionHeading
              label="FAQ"
              title="Questions buyers, sellers, and investors ask first"
              text="A short trust layer before users enter the app. The full FAQ explains escrow, NFT receipts, services, delivery, fees, testnet status, and dispute flows."
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <GoldButton href="/faq">Read full FAQ</GoldButton>
              <GhostButton href="/dispute-policy">Dispute policy</GhostButton>
            </div>
          </div>

          <div className="grid gap-3 lg:col-span-8 md:grid-cols-2">
            {SHORT_FAQS.map((item) => (
              <GlassCard key={item.q}>
                <div className="p-5">
                  <div className="text-base font-black tracking-tight text-white">{item.q}</div>
                  <p className="mt-3 text-sm leading-relaxed text-white/60">{item.a}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>
    </Reveal>
  );
}

function SiteFooter({ year }: { year: number }) {
  return (
    <footer className="mt-5 pb-8">
      <GlassCard className="rounded-[22px] before:rounded-[22px]">
        <div className="grid gap-4 p-4 md:p-5 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="text-xl font-black tracking-tight">REALIFE</div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/55">
              The trust layer for stablecoin commerce: tokenized real-world goods,
              services, NFT receipts, protected orders, and escrow-backed settlement.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {["Base Sepolia MVP", "Escrow", "NFT receipts", "USDC-ready"].map((x) => (
                <Pill key={x} className="bg-black/35">
                  {x}
                </Pill>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:col-span-8">
            {FOOTER_GROUPS.map((group) => (
              <div key={group.title}>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#d4af37]">
                  {group.title}
                </div>
                <div className="mt-4 grid gap-3">
                  {group.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      target={"external" in link && link.external ? "_blank" : undefined}
                      rel={"external" in link && link.external ? "noreferrer" : undefined}
                      className="text-sm text-white/55 transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-white/35">
        <div>© {year} Realife. All rights reserved.</div>
        <div className="max-w-3xl leading-relaxed">
          Realife is currently a testnet MVP. This website is not financial, legal, tax, or
          investment advice. Mainnet commerce, escrow, custody, and compliance flows may
          require additional review, restrictions, partners, and user verification.
        </div>
      </div>
    </footer>
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

      <div className="relative z-30 mx-auto max-w-7xl px-4 py-4 sm:px-6 md:py-5 lg:py-6">
        <Reveal>
          <section className="grid items-start gap-4 md:gap-5 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <Pill>
                <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
                Tokenized real-world commerce
              </Pill>

              <h1 className="mt-3 text-3xl font-black leading-[1.05] tracking-[-0.025em] sm:text-4xl md:text-[2.8rem] lg:text-[3.1rem]">
                Stablecoin Escrow Marketplace for{" "}
                <span className="bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] bg-clip-text text-transparent">
                  Tokenized Real-World Goods & Services
                </span>
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65 md:text-[15px]">
                Realife lets users buy and sell real-world goods, services, and delivery
                through stablecoin-ready payments, NFT-linked transaction rights, and escrow
                protection until fulfillment is completed.
              </p>

              <p className="mt-3 max-w-2xl text-xs leading-relaxed text-white/50 md:text-sm">
                NFTs on Realife are not only collectibles. They can represent transaction
                rights connected to real products, services, delivery, fulfillment, and
                protected settlement.
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {[
                  "Stablecoin payments",
                  "Tokenized goods & services",
                  "NFT-linked rights",
                  "Service escrow",
                  "Delivery escrow",
                  "Live on Base Sepolia",
                ].map((x) => (
                  <Pill key={x}>{x}</Pill>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <GoldButton href="/app/create">Create NFT listing</GoldButton>
                <GhostButton href="/app/trading">Open marketplace</GhostButton>
              </div>

              <GlassCard className="mt-5">
                <div className="grid gap-3 p-5 md:grid-cols-12 md:items-center">
                  <div className="md:col-span-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                      Start with wallet
                    </div>
                    <div className="mt-3">
                      <ConnectWallet />
                    </div>
                  </div>

                  <div className="md:col-span-8">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        ["Category", "Stablecoin escrow marketplace"],
                        ["NFT role", "Transaction rights and proof"],
                        ["Trust layer", "Escrow for services and delivery"],
                      ].map(([t, d]) => (
                        <div
                          key={t}
                          className="rounded-xl border border-white/10 bg-white/[0.04] p-3"
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
              <div className="grid gap-3">
                <VideoCard
                  label="Main video"
                  badge="Hero"
                  title="Realife in motion"
                  text="A premium introduction to stablecoin-powered real-world commerce, NFT-linked transaction rights, and escrow-backed trust for products, services, and delivery."
                  src="/videos/realife-main-hero.mp4"
                  aspect="aspect-[4/3]"
                />

                <VideoCard
                  label="Second video"
                  badge="People / Vision"
                  title="Real-world value"
                  text="A supporting visual layer focused on people, work, products, service providers, and the human side of tokenized commerce."
                  src="/videos/realife-vision.mp4"
                  aspect="aspect-[16/10]"
                />
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal className="mt-5 md:mt-5">
          <section>
            <SectionHeading
              label="What Realife means"
              title="The stablecoin escrow layer for tokenized real-world commerce"
              text="Realife connects stablecoin-ready payments, NFT-linked transaction rights, marketplace activity, and escrow-protected fulfillment for products, services, and delivery."
              center
            />

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                [
                  "Stablecoin commerce",
                  "Crypto users can spend digital money on real-world products, services, and fulfillment without relying only on speculative markets.",
                ],
                [
                  "NFT-linked rights",
                  "NFTs can represent access, ownership proof, purchase claims, service rights, and tradable transaction records.",
                ],
                [
                  "Real services",
                  "Digital, online, and local services can move through protected order flows with clearer completion logic.",
                ],
                [
                  "Escrow protection",
                  "Payments can be held until delivery or service completion is confirmed, reducing trust gaps between buyers and sellers.",
                ],
              ].map(([t, d]) => (
                <GlassCard key={t}>
                  <div className="p-5">
                    <div className="text-base font-black tracking-tight">{t}</div>
                    <div className="mt-2 text-sm leading-relaxed text-white/60">{d}</div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal className="mt-5 md:mt-5">
          <section>
            <GlassCard className="rounded-[22px] before:rounded-[22px]">
              <div className="grid items-center gap-4 p-4 md:p-5 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-white/40">Flow video</div>
                      <div className="text-xl font-black tracking-tight">
                        How Realife works
                      </div>
                    </div>
                    <Pill className="bg-black/35">Flow</Pill>
                  </div>

                  <p className="mb-5 text-sm leading-relaxed text-white/60">
                    This section explains the operating logic of the platform —
                    from real-world value to NFT-linked transaction rights,
                    marketplace activity, and escrow-backed completion or delivery.
                  </p>

                  <div className="overflow-hidden rounded-[22px] border border-white/10 bg-black/30">
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
                    title="Create, tokenize, trade, and complete"
                    text="From real-world products or services to NFT-linked transaction rights, stablecoin-ready payments, and escrow-backed settlement."
                  />

                  <div className="mt-6 grid gap-3">
                    {[
                      [
                        "01",
                        "Create",
                        "Create a real product, service, delivery offer, branded item, or local work listing.",
                      ],
                      [
                        "02",
                        "Tokenize",
                        "Mint an NFT-linked transaction right with metadata, media, ownership proof, and marketplace utility.",
                      ],
                      [
                        "03",
                        "Trade",
                        "List, buy, sell, or transfer real-world value through the Realife marketplace.",
                      ],
                      [
                        "04",
                        "Settle",
                        "Use escrow flows for service completion, buyer confirmation, refund paths, or physical delivery.",
                      ],
                    ].map(([n, t, d]) => (
                      <div
                        key={n}
                        className="rounded-xl border border-white/10 bg-white/[0.04] p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] text-xs font-extrabold text-black">
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

        <Reveal className="mt-5 md:mt-5">
          <section>
            <SectionHeading
              label="Inside the ecosystem"
              title="More than a marketplace"
              text="Realife expands beyond NFT minting into tokenized real-world commerce, stablecoin payments, branded storefronts, service flows, delivery logic, product stories, and practical utility."
            />

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <GlassCard className="h-full">
                <div className="flex h-full flex-col p-4">
                  <Pill className="bg-black/35">Brand commerce layer</Pill>
                  <h3 className="mt-5 text-2xl font-black tracking-tight">Real Marketing</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/60">
                    The ecosystem hub for creator campaigns, crypto brand collaborations,
                    Crypto Cafe, Realife Store, and real-world product activations.
                  </p>
                  <div className="mt-6 grid gap-3">
                    {[
                      "Campaigns for crypto projects",
                      "Product storytelling and vertical launches",
                      "Bridge between sellers, creators, and Web3 brands",
                    ].map((x) => (
                      <div
                        key={x}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white/75"
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
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="text-xl font-black tracking-tight">
                      Realife Crypto Cafe
                    </div>
                    <div className="mt-2 text-sm leading-relaxed text-white/60">
                      A premium storefront concept for branded goods, collectible
                      atmosphere, and crypto-native real-world experiences.
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
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="text-xl font-black tracking-tight">Realife Store</div>
                    <div className="mt-2 text-sm leading-relaxed text-white/60">
                      Tokenized real-world products, branded packaging, stablecoin
                      commerce, and NFT-linked ownership stories.
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </section>
        </Reveal>

        <Reveal className="mt-5 md:mt-5">
          <section>
            <SectionHeading
              label="Human story"
              title="Real people. Real products. Real value."
              text="A visual layer that shows the human side of ownership, making, service, delivery, and tokenized commerce inside the Realife world."
            />

            <div className="mt-5 grid gap-4 lg:grid-cols-12">
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
                  <div className="relative min-h-[320px] bg-[#120f0d] md:col-span-5">
                    <Image
                      src={STORY_CARDS[6].image}
                      alt={STORY_CARDS[6].alt}
                      fill
                      className="object-contain object-center p-4"
                      sizes="(max-width: 768px) 100vw, 40vw"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.16),rgba(0,0,0,0.02))]" />
                  </div>
                  <div className="p-4 md:col-span-7 md:p-10">
                    <Pill>{STORY_CARDS[6].label}</Pill>
                    <h3 className="mt-5 text-2xl font-black tracking-tight md:text-[2rem]">
                      {STORY_CARDS[6].title}
                    </h3>
                    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/60 md:text-base">
                      {STORY_CARDS[6].text}
                    </p>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {[
                        "Not only for traders or developers",
                        "Built for artists, makers, workers, sellers, and communities",
                        "Bridge between offline value and on-chain transaction rights",
                        "A premium layer for real human contribution",
                      ].map((x) => (
                        <div
                          key={x}
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white/75"
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

        <ShortFaqSection />

        <Reveal className="mt-5 md:mt-5">
          <section>
            <GlassCard className="rounded-[22px] before:rounded-[22px]">
              <div className="grid items-center gap-4 p-4 md:p-5 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <SectionHeading
                    label="Start"
                    title="Bring tokenized real-world commerce on-chain"
                    text="Create NFT-linked listings for products, services, and branded experiences with AI assistance, marketplace utility, stablecoin-ready payments, and escrow-backed flows."
                  />
                </div>
                <div className="lg:col-span-4">
                  <div className="flex flex-col gap-3">
                    <GoldButton href="/app/create" className="w-full">
                      Create NFT listing
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

        <SiteFooter year={year} />
      </div>
    </main>
  );
}
