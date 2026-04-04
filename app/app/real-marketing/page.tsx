import Link from "next/link";
import type { ReactNode } from "react";
import Reveal from "@/components/Reveal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

type StoreCard = {
  title: string;
  subtitle: string;
  src?: string;
  comingSoonTitle?: string;
  comingSoonText?: string;
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
          "after:bg-[radial-gradient(circle_at_85%_115%,rgba(255,255,255,0.06),transparent_55%)]"
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
      className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-3 font-semibold transition hover:bg-white/10 backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
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
  ratio = "video",
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

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.82),rgba(0,0,0,0.18),transparent)]" />

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

function StoryPlaceholderCard({
  eyebrow,
  title,
  text,
  ratio = "store",
}: {
  eyebrow: string;
  title: string;
  text: string;
  ratio?: "video" | "square" | "portrait" | "store";
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
              : "aspect-[16/10]"
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(212,175,55,0.24),transparent_38%),radial-gradient(circle_at_80%_84%,rgba(255,255,255,0.08),transparent_34%)]" />
      <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[length:26px_26px]" />

      <div className="relative flex h-full w-full flex-col justify-between p-5">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
          Coming Soon
        </div>

        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.20em] text-white/45">
            {eyebrow}
          </div>

          <div className="mt-3 text-2xl font-black leading-tight text-white/92">
            {title}
          </div>

          <div className="mt-3 text-sm leading-relaxed text-white/58">
            {text}
          </div>
        </div>
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

export default function RealMarketingPage() {
  const cafeVideo = "/videos/realife-cafe-web.mp4";

  const storeColumns: StoreCard[] = [
    {
      title: "Billions product universe",
      subtitle: "Premium packaging and collectible product presentation.",
      src: "/videos/billions_merged.mp4",
    },
    {
      title: "Coffee, cacao and everyday essentials",
      subtitle: "Closer product motion with luxury catalog feeling.",
      src: "/videos/rialo_merged.mp4",
    },
    {
      title: "Premium crypto branded t-shirts",
      subtitle:
        "Premium crypto-branded t-shirts with delivery, combining physical merch, brand identity and collectible ecosystem value.",
      src: "/videos/sentient_tshirt.mp4",
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
                  Real Marketing
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">Cafe + Store</span>
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    Video storefront
                  </span>
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    Premium vertical hub
                  </span>
                </Pill>
              </div>

              <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-[-0.02em] md:text-6xl">
                Realife{" "}
                <span className="bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] bg-clip-text text-transparent">
                  Marketing Hub
                </span>
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/70 md:text-base">
                Main hub for the first Realife directions —{" "}
                <span className="font-extrabold text-amber-100">
                  Realife Crypto Cafe
                </span>{" "}
                and{" "}
                <span className="font-extrabold text-amber-100">
                  Realife NFT Store
                </span>
                .
              </p>

              <div className="mt-3 max-w-3xl text-sm leading-relaxed text-white/60 md:text-base">
                Realife Crypto Cafe is a real-world cafe concept preparing to
                open, while Realife NFT Store is focused on products,
                collectibles, NFTs and premium branded commerce. This hub gives
                users a first look at both directions before entering each
                dedicated experience.
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <ActionLink href="/app/real-marketing/realife-cafe" primary>
                  Open Realife Cafe
                </ActionLink>

                <ActionLink href="/app/real-marketing/realife-store">
                  Open NFT Store
                </ActionLink>

                <ActionLink href="/app/trading">Open Trading →</ActionLink>
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
                eyebrow="Featured vertical"
                title={
                  <>
                    Realife Crypto Cafe
                    <br />
                    a real cafe concept opening soon
                  </>
                }
                text={
                  <>
                    Realife Crypto Cafe is a real-world concept built around
                    branded drinks, cacao, chocolate, merch and collectible
                    culture. It is one of the first physical directions inside
                    the Realife ecosystem and is preparing to open soon.
                  </>
                }
              />

              <FeatureList
                items={[
                  "Real cafe direction with branded products and atmosphere",
                  "Drinks, cacao, chocolate, merch and collectible drops",
                  "Bridge between physical experience and digital ownership",
                  "One of the first real-world expansions of the Realife ecosystem",
                ]}
              />

              <div className="mt-6 flex flex-wrap gap-3">
                <ActionLink href="/app/real-marketing/realife-cafe" primary>
                  Open Realife Cafe
                </ActionLink>

                <ActionLink href="/app/trading">Open Trading →</ActionLink>
              </div>
            </div>

            <PromoVideo
              src={cafeVideo}
              title="Realife Crypto Cafe"
              subtitle="Preview of the upcoming cafe direction inside the Realife ecosystem."
              priority
            />
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={160}>
        <GoldEdgeWrap className="rounded-[40px]">
          <div className="p-6 md:p-8 xl:p-10">
            <SectionTitle
              eyebrow="Storefront"
              title={
                <>
                  Realife NFT Store
                  <br />
                  products, collectibles and ownership
                </>
              }
              text={
                <>
                  Realife NFT Store is focused on product-driven commerce inside
                  the Realife ecosystem. It connects physical items,
                  collectible presentation, NFT-linked ownership, delivery flow
                  and secondary market potential in one premium storefront.
                </>
              }
            />

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {storeColumns.map((item, index) =>
                item.src ? (
                  <PromoVideo
                    key={item.title}
                    src={item.src}
                    title={item.title}
                    subtitle={item.subtitle}
                    ratio="store"
                    priority={index === 0}
                  />
                ) : (
                  <StoryPlaceholderCard
                    key={item.title}
                    eyebrow="Store Product Stories"
                    title={item.comingSoonTitle || item.title}
                    text={
                      item.comingSoonText ||
                      item.subtitle ||
                      "New product story videos will be added here soon."
                    }
                    ratio="store"
                  />
                )
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <ActionLink href="/app/real-marketing/realife-store" primary>
                Open NFT Store
              </ActionLink>

              <ActionLink href="/app/trading">Open Trading →</ActionLink>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={220}>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <GoldEdgeWrap className="xl:col-span-2">
            <div className="p-6 md:p-8">
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">
                Live verticals
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-lg font-extrabold text-white/90">
                      Realife Crypto Cafe
                    </div>
                    <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-200">
                      LIVE
                    </div>
                  </div>

                  <div className="mt-3 text-sm leading-relaxed text-white/55">
                    Real cafe direction with branded drinks, cacao, chocolate,
                    merch and future collectible drops.
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-lg font-extrabold text-white/90">
                      Realife NFT Store
                    </div>
                    <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-200">
                      LIVE
                    </div>
                  </div>

                  <div className="mt-3 text-sm leading-relaxed text-white/55">
                    Storefront for NFT-linked products, delivery-based items,
                    collectible packaging and secondary ecosystem support.
                  </div>
                </div>
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
            <span className="opacity-60">Real Marketing</span>
            <span className="opacity-60">Cafe</span>
            <span className="opacity-60">Store</span>
            <span className="opacity-60">Video showcase</span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}