import Link from "next/link";
import type { ReactNode } from "react";
import Reveal from "@/components/Reveal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

type LearningCard = {
  title: string;
  subtitle: string;
  src: string;
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
      className={cx(
        "relative overflow-hidden rounded-[34px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.35),rgba(212,175,55,0.16),rgba(184,135,10,0.10))]",
        "shadow-[0_34px_130px_rgba(0,0,0,0.60)]",
        className
      )}
    >
      <div
        className={cx(
          "relative overflow-hidden rounded-[34px]",
          "border border-white/10 bg-[#0b0a09]/60 backdrop-blur-2xl",
          "ring-1 ring-black/10",
          "before:pointer-events-none before:absolute before:inset-0",
          "before:bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.12),transparent_45%)]",
          "after:pointer-events-none after:absolute after:inset-0",
          "after:bg-[radial-gradient(circle_at_85%_115%,rgba(255,255,255,0.06),transparent_55%)]",
          className
        )}
      >
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

function ActionLink({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
}) {
  if (primary) {
    return (
      <Link
        href={href}
        className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-6 py-3 font-extrabold text-black ring-1 ring-black/15 transition hover:brightness-110 shadow-[0_18px_60px_rgba(212,175,55,0.20)]"
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-3 font-semibold text-white/90 transition hover:bg-white/10 backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
    >
      {children}
    </Link>
  );
}

function SectionTitle({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: ReactNode;
  text: ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">
        {eyebrow}
      </div>

      <div className="mt-3 text-2xl font-black tracking-tight text-white/95 md:text-4xl">
        {title}
      </div>

      <div className="mt-4 max-w-2xl text-sm leading-relaxed text-white/60 md:text-base">
        {text}
      </div>
    </div>
  );
}

function VideoShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-[28px] border border-white/10 bg-black/30",
        "shadow-[0_24px_90px_rgba(0,0,0,0.45)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function PromoVideo({
  src,
  title,
  subtitle,
  ratio = "store",
  priority = false,
}: {
  src: string;
  title: string;
  subtitle?: string;
  ratio?: "video" | "square" | "portrait" | "store";
  priority?: boolean;
}) {
  return (
    <VideoShell
      className={cx(
        ratio === "portrait"
          ? "aspect-[9/16]"
          : ratio === "square"
            ? "aspect-square"
            : ratio === "store"
              ? "aspect-[720/834]"
              : "aspect-[16/10]",
        "group"
      )}
    >
      <video
        className="h-full w-full object-cover"
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload={priority ? "auto" : "metadata"}
        controls={false}
      />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.84),rgba(0,0,0,0.20),transparent)]" />

      <div className="pointer-events-none absolute bottom-4 left-4 right-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/90 backdrop-blur-xl">
          <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
          Video Preview
        </div>

        <div className="mt-3 text-lg font-black text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)] md:text-2xl">
          {title}
        </div>

        {subtitle ? (
          <div className="mt-1 max-w-xl text-xs leading-relaxed text-white/75 md:text-sm">
            {subtitle}
          </div>
        ) : null}
      </div>
    </VideoShell>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/75"
        >
          {item}
        </div>
      ))}
    </div>
  );
}

function InfoCard({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6">
      <div className="text-[11px] font-black uppercase tracking-[0.20em] text-white/45">
        {eyebrow}
      </div>

      <div className="mt-3 text-xl font-black leading-tight text-white/92 md:text-2xl">
        {title}
      </div>

      <div className="mt-3 text-sm leading-relaxed text-white/58">
        {text}
      </div>
    </div>
  );
}

export default function SocialLearningPage() {
  const learningCards: LearningCard[] = [
    {
      title: "Street crypto education",
      subtitle:
        "Real-world public outreach that introduces people to crypto in a simple, visual and human way.",
      src: "/videos/social-learning-1.mp4",
    },
    {
      title: "Wallets, payments and onboarding",
      subtitle:
        "Practical guidance around transactions, Web3 wallets, payments, transfers, DEX and CEX usage.",
      src: "/videos/social-learning-2.mp4",
    },
    {
      title: "Consulting and strategic orientation",
      subtitle:
        "Broader guidance across crypto, finance, business, cities, countries and real estate directions.",
      src: "/videos/social-learning-3.mp4",
    },
  ];

  return (
    <div className="space-y-6">
      <Reveal>
        <GoldEdgeWrap className="rounded-[40px]">
          <div className="relative overflow-hidden p-7 md:p-10">
            <div className="pointer-events-none absolute -top-44 -right-44 h-[560px] w-[560px] rounded-full bg-[#d4af37]/14 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-44 -left-44 h-[560px] w-[560px] rounded-full bg-white/[0.06] blur-3xl" />

            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <Pill>
                  <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
                  Social Learning
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    Crypto Education
                  </span>
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">Advisory</span>
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    Real-world onboarding
                  </span>
                </Pill>
              </div>

              <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-[-0.02em] md:text-6xl">
                Realife{" "}
                <span className="bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] bg-clip-text text-transparent">
                  Social Learning
                </span>
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/70 md:text-base">
                Realife Social Learning connects{" "}
                <span className="font-extrabold text-amber-100">
                  crypto education
                </span>
                ,{" "}
                <span className="font-extrabold text-amber-100">
                  real-world onboarding
                </span>{" "}
                and{" "}
                <span className="font-extrabold text-amber-100">
                  strategic consulting
                </span>
                .
              </p>

              <div className="mt-3 max-w-3xl text-sm leading-relaxed text-white/60 md:text-base">
                It helps people move from zero understanding to practical use:
                wallets, payments, transactions, Web3 tools, exchange
                navigation, DEX and CEX orientation, and broader guidance across
                crypto, finance, commercial opportunities, cities, countries
                and real estate directions.
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <ActionLink href="#learning-stories" primary>
                  Explore Stories
                </ActionLink>

                <ActionLink href="/app/trading">Open Trading →</ActionLink>

                <ActionLink href="/app/real-marketing">
                  Open Real Marketing
                </ActionLink>
              </div>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={100}>
        <GoldEdgeWrap className="rounded-[40px]">
          <div className="grid gap-6 p-6 md:grid-cols-[1.05fr_1fr] md:p-8 xl:p-10">
            <div className="flex flex-col justify-center">
              <SectionTitle
                eyebrow="Featured direction"
                title={
                  <>
                    Education, onboarding
                    <br />
                    and real-world crypto guidance
                  </>
                }
                text={
                  <>
                    Realife Social Learning is focused on helping people
                    understand and use cryptocurrency in real life. It combines
                    offline outreach, printed materials, wallet onboarding,
                    transaction support, payment education, Web3 tools, DEX and
                    CEX orientation, and broader strategic recommendations in a
                    more human and practical format.
                  </>
                }
              />

              <FeatureList
                items={[
                  "Crypto education for everyday people",
                  "Wallet onboarding and transaction support",
                  "Payments, transfers and Web3 tool guidance",
                  "DEX and CEX navigation in practical language",
                  "Strategic recommendations across crypto and finance",
                  "Offline outreach with real human interaction",
                ]}
              />

              <div className="mt-6 flex flex-wrap gap-3">
                <ActionLink href="#learning-stories" primary>
                  Watch Stories
                </ActionLink>

                <ActionLink href="/app/trading">Open Trading →</ActionLink>
              </div>
            </div>

            <div className="grid gap-4">
              <InfoCard
                eyebrow="Mission"
                title="Education before adoption"
                text="Realife Social Learning helps people understand crypto before they use it. The direction combines public education, practical onboarding and advisory support so that crypto becomes more understandable, more structured and closer to everyday life."
              />

              <InfoCard
                eyebrow="Coverage"
                title="From wallets to broader opportunities"
                text="The vertical covers everyday usage and broader strategic orientation: wallets, payments, transactions, exchanges, commercial thinking, cities, countries, market understanding and real-world opportunity mapping."
              />

              <InfoCard
                eyebrow="Format"
                title="Offline outreach with real interaction"
                text="Printed materials, live conversations, street communication and practical examples help explain crypto in a simple way and make onboarding feel more real, visual and human."
              />
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={160}>
        <GoldEdgeWrap className="rounded-[40px]">
          <div className="p-6 md:p-8 xl:p-10" id="learning-stories">
            <SectionTitle
              eyebrow="Learning stories"
              title={
                <>
                  Realife Social Learning
                  <br />
                  public education, advisory and onboarding
                </>
              }
              text={
                <>
                  These three story videos show how Realife brings crypto closer
                  to real people through printed materials, public explanation,
                  street interaction, advisory support and practical onboarding.
                </>
              }
            />

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {learningCards.map((item, index) => (
                <PromoVideo
                  key={item.title}
                  src={item.src}
                  title={item.title}
                  subtitle={item.subtitle}
                  ratio="store"
                  priority={index === 0}
                />
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <ActionLink href="/app/trading" primary>
                Open Trading
              </ActionLink>

              <ActionLink href="/app/real-marketing">
                Open Real Marketing
              </ActionLink>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={220}>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <GoldEdgeWrap className="xl:col-span-2">
            <div className="p-6 md:p-8">
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">
                What it covers
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <InfoCard
                  eyebrow="Education"
                  title="Practical crypto usage"
                  text="The page is focused on practical understanding: how to start, how to use wallets, how transfers work, how payments work, how Web3 tools feel in real life, and how to navigate exchanges more confidently."
                />

                <InfoCard
                  eyebrow="Advisory"
                  title="Strategic recommendations"
                  text="Beyond onboarding, Realife Social Learning also covers broader guidance across crypto, finance, business, cities, countries and real estate directions in a more structured and understandable way."
                />
              </div>
            </div>
          </GoldEdgeWrap>

          <GoldEdgeWrap>
            <div className="p-6 md:p-8">
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">
                Roadmap
              </div>

              <div className="mt-4 space-y-3">
                {[
                  { label: "Realife Social Learning", live: true },
                  { label: "Realife Crypto Cafe", live: true },
                  { label: "Realife NFT Store", live: true },
                  { label: "Realife Crypto Travel", live: false },
                  { label: "Realife Crypto Concert", live: false },
                  { label: "Realife Crypto Medicine", live: false },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-extrabold text-white/90">
                        {item.label}
                      </div>

                      <div
                        className={cx(
                          "rounded-full border px-2.5 py-1 text-[10px] font-black",
                          item.live
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                            : "border-white/10 bg-white/[0.05] text-white/55"
                        )}
                      >
                        {item.live ? "LIVE" : "SOON"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GoldEdgeWrap>
        </div>
      </Reveal>

      <Reveal delayMs={280}>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 pt-2 text-xs text-white/45">
          <div>Realife Ecosystem</div>

          <div className="flex items-center gap-4">
            <span className="opacity-60">Social Learning</span>
            <span className="opacity-60">Crypto Education</span>
            <span className="opacity-60">Advisory</span>
            <span className="opacity-60">Real-world onboarding</span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}