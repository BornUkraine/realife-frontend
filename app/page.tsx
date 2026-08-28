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
      <div className="relative z-10 h-full">{children}</div>
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
  className = "",
}: {
  label: string;
  badge: string;
  title: string;
  text?: string;
  src: string;
  className?: string;
}) {
  return (
    <GlassCard className={cx("h-full rounded-[32px] before:rounded-[32px]", className)}>
      <div className="flex h-full min-w-0 flex-col p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm text-white/40">{label}</div>
            <div className="mt-1 text-2xl font-black tracking-tight">{title}</div>
          </div>
          <Pill className="shrink-0 bg-black/35">{badge}</Pill>
        </div>

        {text && <p className="mt-4 text-sm leading-relaxed text-white/60">{text}</p>}

        <div className="mt-5 aspect-[16/10] overflow-hidden rounded-[24px] border border-white/10 bg-black/55 xl:mt-auto xl:h-[260px] xl:aspect-auto">
          <video
            src={src}
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-contain object-center"
          />
        </div>
      </div>
    </GlassCard>
  );
}

const LIVE_FLOW_STEPS = [
  {
    number: "01",
    title: "AI Mint",
    description:
      "Photo or video becomes a structured offer with category, fulfillment, and search tags.",
    outcome: "Media → listing",
  },
  {
    number: "02",
    title: "AI Trading",
    description:
      "Natural-language buyer intent becomes safe filters and semantic marketplace matches.",
    outcome: "Intent → match",
  },
  {
    number: "03",
    title: "AI Delivery",
    description:
      "Order state becomes next steps, risk checks, and fulfillment guidance before payout.",
    outcome: "Fulfillment → USDC",
  },
] as const;

function LiveFlowCard() {
  return (
    <GlassCard className="h-full rounded-[32px] before:rounded-[32px]">
      <div className="flex h-full min-h-[360px] flex-col p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
              Test the live AI flow
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight">
              Start the full commerce lifecycle
            </div>
          </div>
          <Pill className="shrink-0 bg-black/35">Live MVP</Pill>
        </div>

        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/55">
          One wallet-controlled path from visual media to a protected real-world order
          and stablecoin settlement.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 p-2.5">
          <div className="min-w-0 px-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
              Protected test flow
            </div>
            <div className="mt-0.5 text-xs font-semibold text-white/75">
              AI guides. Your wallet approves.
            </div>
          </div>
          <div className="shrink-0">
            <ConnectWallet />
          </div>
        </div>

        <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
          <div className="pointer-events-none absolute left-[12%] right-[12%] top-[27px] hidden h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.7),transparent)] sm:block" />
          {LIVE_FLOW_STEPS.map((step, index) => (
            <div
              key={step.title}
              className="relative z-10 flex min-h-[176px] min-w-0 flex-col rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(16,14,12,0.97),rgba(8,7,6,0.9))] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.24)]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-black text-[#d4af37]">{step.number}</div>
                <span
                  className={cx(
                    "h-2 w-2 rounded-full shadow-[0_0_0_5px_rgba(212,175,55,0.08)]",
                    index === LIVE_FLOW_STEPS.length - 1 ? "bg-[#2775ca]" : "bg-[#d4af37]"
                  )}
                />
              </div>
              <div className="mt-3 text-sm font-bold tracking-tight text-white">
                {step.title}
              </div>
              <div className="mt-1.5 text-[11px] leading-relaxed text-white/55">
                {step.description}
              </div>
              <div
                className={cx(
                  "mt-auto pt-4 text-[10px] font-bold uppercase tracking-[0.1em]",
                  index === LIVE_FLOW_STEPS.length - 1 ? "text-[#6da8e8]" : "text-[#d4af37]/80"
                )}
              >
                {step.outcome}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#d4af37]/15 bg-[#d4af37]/[0.06] px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/75">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 text-[10px] text-[#d4af37]">
              ✓
            </span>
            AI proposes. You approve.
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
            Escrow controls value
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

const LIFECYCLE_STEPS = [
  "Goods or Service",
  "AI Mint",
  "AI Trading",
  "AI Delivery",
  "USDC Payout",
] as const;

function LifecycleBanner() {
  return (
    <GlassCard className="mt-8 w-full min-w-0 max-w-full overflow-hidden rounded-[32px] before:rounded-[32px]">
      <div className="p-3 sm:p-4">
        <div className="relative aspect-[5/2] min-h-[140px] w-full overflow-hidden rounded-[24px] bg-black/55 sm:aspect-[22/5] sm:min-h-0">
          <Image
            src="/brand/realife-ai-commerce-lifecycle-usdc.png"
            alt="Realife lifecycle from goods or services through AI Mint, AI Trading and AI Delivery to a USDC payout"
            fill
            priority
            className="object-contain object-center sm:object-cover"
            sizes="(max-width: 1024px) 100vw, 1280px"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.08),transparent_14%,transparent_86%,rgba(0,0,0,0.08))]" />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {LIFECYCLE_STEPS.map((step, index) => (
            <div
              key={step}
              className={cx(
                "flex min-w-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-center text-[11px] font-semibold text-white/70",
                index === LIFECYCLE_STEPS.length - 1 && "col-span-2 sm:col-span-1"
              )}
            >
              <span
                className={cx(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  index === LIFECYCLE_STEPS.length - 1
                    ? "bg-[#2775ca] shadow-[0_0_0_4px_rgba(39,117,202,0.14)]"
                    : "bg-[#d4af37] shadow-[0_0_0_4px_rgba(212,175,55,0.1)]"
                )}
              />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}


const SHORT_FAQS = [
  {
    q: "What makes Realife AI-native?",
    a: "Realife connects four AI systems across one commerce lifecycle: multimodal listing creation, persistent visual enrichment, natural-language marketplace discovery, and AI-guided order, delivery, and service fulfillment.",
  },
  {
    q: "What does the AI do during listing creation?",
    a: "A seller uploads a photo or video, and multimodal AI suggests structured listing data such as title, category, brand, description, fulfillment type, marketplace type, reasoning, and search tags.",
  },
  {
    q: "How does AI improve marketplace discovery?",
    a: "Realife enriches listings with a persistent semantic index and lets buyers describe what they need naturally. AI converts buyer intent into structured marketplace filters and relevant results.",
  },
  {
    q: "How does AI help after a purchase?",
    a: "The AI order assistant explains transaction status, next steps, delivery or service checklists, possible risks, and suggested messages while protected escrow logic remains deterministic and user-controlled.",
  },
  {
    q: "Why does Realife also use blockchain and escrow?",
    a: "AI makes commerce easier to understand and navigate. NFT-linked transaction rights, stablecoin-ready payments, and escrow add verifiable ownership, protected settlement, and clearer fulfillment rules.",
  },
  {
    q: "Can I test Realife now?",
    a: "Yes. Realife is a live MVP on Base Sepolia testnet, so reviewers can test AI-assisted minting, marketplace discovery, and protected commerce flows without using real funds.",
  },
] as const;

const FOOTER_GROUPS = [
  {
    title: "Product",
    links: [
      { label: "AI Marketplace", href: "/app/trading" },
      { label: "Create with AI", href: "/app/create" },
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
    <Reveal className="mt-24">
      <section>
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-4 min-w-0">
            <SectionHeading
              label="FAQ"
              title="Questions about the AI commerce system"
              text="A direct explanation of what each AI system does, how the protected commerce layer works, and how reviewers can test the live Base Sepolia MVP."
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <GoldButton href="/faq">Read full FAQ</GoldButton>
              <GhostButton href="/dispute-policy">Dispute policy</GhostButton>
            </div>
          </div>

          <div className="grid gap-4 lg:col-span-8 min-w-0 md:grid-cols-2">
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
    <footer className="mt-16 pb-10">
      <GlassCard className="rounded-[32px] before:rounded-[32px]">
        <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-12">
          <div className="lg:col-span-4 min-w-0">
            <div className="text-2xl font-black tracking-tight">REALIFE</div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/55">
              Open AI infrastructure for real-world commerce: multimodal listing creation,
              semantic discovery, guided fulfillment, and escrow-backed settlement.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["AI-native", "Open code", "Base Sepolia MVP", "Escrow"].map((x) => (
                <Pill key={x} className="bg-black/35">
                  {x}
                </Pill>
              ))}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-3 lg:col-span-8 min-w-0">
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

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-white/35">
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

      <div className="relative z-30 mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8 lg:py-10">
        <Reveal>
          <section>
            <div className="grid items-stretch gap-6 md:gap-10 xl:grid-cols-12">
              <div className="min-w-0 xl:col-span-7">
                <Pill>
                  <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
                  Open AI infrastructure for real-world commerce
                </Pill>

                <h1 className="mt-5 break-words text-3xl font-black leading-[1.05] tracking-[-0.025em] sm:text-4xl md:text-5xl lg:text-[3.4rem] xl:text-[3.8rem]">
                  AI-Native Commerce for{" "}
                  <span className="bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] bg-clip-text text-transparent">
                    Real-World Goods & Services
                  </span>
                </h1>

                <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">
                  Realife connects four AI systems across the full commerce lifecycle:
                  multimodal listing creation, persistent visual enrichment, natural-language
                  marketplace discovery, and AI-guided order, delivery, and service fulfillment.
                </p>

                <p className="mt-3 max-w-2xl text-xs leading-relaxed text-white/50 md:text-sm">
                  AI makes real-world commerce understandable. NFT-linked transaction rights,
                  stablecoin-ready payments, and escrow protect ownership, settlement, and
                  fulfillment while users stay in control.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {[
                    "AI-generated listings",
                    "Multimodal enrichment",
                    "Natural-language discovery",
                    "AI-guided fulfillment",
                    "Escrow protection",
                    "Live on Base Sepolia",
                  ].map((x) => (
                    <Pill key={x}>{x}</Pill>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap gap-4">
                  <GoldButton href="/app/create">Create with AI</GoldButton>
                  <GhostButton href="/app/trading">Explore AI marketplace</GhostButton>
                </div>
              </div>

              <div className="min-w-0 xl:col-span-5">
                <LiveFlowCard />
              </div>
            </div>

            <LifecycleBanner />

            <div className="mt-8 grid items-stretch gap-6 md:gap-10 xl:grid-cols-2">
              <div className="min-w-0">
                <VideoCard
                  label="AI commerce demo"
                  badge="Live MVP"
                  title="One AI pipeline from image to fulfillment"
                  text="Upload visual content, generate structured marketplace data, enrich the listing for semantic discovery, search in natural language, and receive AI guidance during protected fulfillment."
                  src="/videos/realife-main-hero.mp4"
                />
              </div>

              <div className="min-w-0">
                <VideoCard
                  label="Human value layer"
                  badge="AI + People"
                  title="Technology built around real work"
                  text="Realife applies AI to products, services, creators, local sellers, buyers, delivery, and the human decisions that make real-world commerce possible."
                  src="/videos/realife-vision.mp4"
                />
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal className="mt-24">
          <section>
            <SectionHeading
              label="The Realife AI stack"
              title="Four connected AI systems across one commerce lifecycle"
              text="Realife is not a marketplace with an AI button. Its AI systems work together from the first visual input through discovery, transaction, delivery, and service completion."
              center
            />

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                [
                  "01 · AI Minting Assistant",
                  "Multimodal AI understands a product or service photo or video and suggests title, category, brand, description, fulfillment type, marketplace type, reasoning, and search tags.",
                ],
                [
                  "02 · AI Visual Enrichment",
                  "After minting, AI creates a persistent visual and semantic index so each listing becomes machine-understandable and discoverable beyond manually entered keywords.",
                ],
                [
                  "03 · AI Trading Search",
                  "Buyers describe what they need naturally. AI converts their intent into structured filters for category, market type, fulfillment, location, price, and sorting.",
                ],
                [
                  "04 · AI Fulfillment Assistant",
                  "During an active order, AI explains status, next steps, delivery or service checklists, possible risks, and suggested communication without controlling funds.",
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
                <div className="lg:col-span-7 min-w-0">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-white/40">Flow video</div>
                      <div className="text-2xl font-black tracking-tight">
                        How the AI commerce pipeline works
                      </div>
                    </div>
                    <Pill className="bg-black/35">Flow</Pill>
                  </div>

                  <p className="mb-5 text-sm leading-relaxed text-white/60">
                    Realife turns visual content into structured commerce, keeps that meaning
                    in a semantic index, understands buyer intent, and guides fulfillment while
                    deterministic blockchain and escrow rules protect the transaction.
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

                <div className="lg:col-span-5 min-w-0">
                  <SectionHeading
                    label="End-to-end AI commerce"
                    title="Understand, enrich, discover, and fulfill"
                    text="One connected path from a seller's photo or video to a protected real-world transaction."
                  />

                  <div className="mt-6 grid gap-3">
                    {[
                      [
                        "01",
                        "Understand",
                        "Multimodal AI analyzes a product or service image or video and creates structured listing suggestions.",
                      ],
                      [
                        "02",
                        "Enrich",
                        "AI builds a persistent semantic index that improves machine understanding and marketplace discovery.",
                      ],
                      [
                        "03",
                        "Discover",
                        "Natural-language buyer intent becomes structured marketplace filters and relevant results.",
                      ],
                      [
                        "04",
                        "Fulfill",
                        "AI guides next steps, delivery or service checklists, risks, and communication while escrow protects settlement.",
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
              title="An AI commerce system with a verifiable trust layer"
              text="Realife combines AI-generated listings, semantic marketplace intelligence, natural-language discovery, and guided fulfillment with stablecoin payments, tokenized rights, branded commerce, and protected settlement."
            />

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              <GlassCard className="h-full">
                <div className="flex h-full flex-col p-8">
                  <Pill className="bg-black/35">Brand commerce layer</Pill>
                  <h3 className="mt-5 text-3xl font-black tracking-tight">Real Marketing</h3>
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
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="text-2xl font-black tracking-tight">Realife Store</div>
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

        <Reveal className="mt-24">
          <section>
            <SectionHeading
              label="Human story"
              title="Real people. Real products. Real value."
              text="A visual layer that shows the human side of ownership, making, service, delivery, and tokenized commerce inside the Realife world."
            />

            <div className="mt-10 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7 min-w-0">
                <StoryCard item={STORY_CARDS[0]} imageClassName="aspect-[16/12]" />
              </div>
              <div className="lg:col-span-5 min-w-0">
                <StoryCard item={STORY_CARDS[1]} imageClassName="aspect-[4/5]" />
              </div>
              <div className="lg:col-span-5 min-w-0">
                <StoryCard item={STORY_CARDS[2]} imageClassName="aspect-[4/5]" />
              </div>
              <div className="lg:col-span-7 min-w-0">
                <StoryCard item={STORY_CARDS[3]} imageClassName="aspect-[16/12]" />
              </div>
              <div className="lg:col-span-6 min-w-0">
                <StoryCard item={STORY_CARDS[4]} imageClassName="aspect-[16/12]" />
              </div>
              <div className="lg:col-span-6 min-w-0">
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
                        "Built for artists, makers, workers, sellers, and communities",
                        "Bridge between offline value and on-chain transaction rights",
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

        <ShortFaqSection />

        <Reveal className="mt-24">
          <section>
            <GlassCard className="rounded-[36px] before:rounded-[36px]">
              <div className="grid items-center gap-8 p-8 md:p-12 lg:grid-cols-12">
                <div className="lg:col-span-8 min-w-0">
                  <SectionHeading
                    label="Start"
                    title="Experience the full AI commerce lifecycle"
                    text="Upload a photo or video, let AI build the listing and semantic index, search naturally, and use AI guidance through protected delivery or service fulfillment."
                  />
                </div>
                <div className="lg:col-span-4 min-w-0">
                  <div className="flex flex-col gap-3">
                    <GoldButton href="/app/create" className="w-full">
                      Create with AI
                    </GoldButton>
                    <GhostButton href="/app/trading" className="w-full">
                      Explore AI marketplace
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
