import Link from "next/link";
import nextDynamic from "next/dynamic";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import Reveal from "@/components/Reveal";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Split the heavy ~57KB TradingClient (+ wagmi/viem) out of the initial
// HTML payload. It only renders on the client anyway.
const TradingClient = nextDynamic(() => import("./TradingClient"), {
  ssr: false,
  loading: () => <TradingSkeleton />,
});

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

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
        prefetch={false}
        className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-6 py-3 font-extrabold text-black ring-1 ring-black/15 transition hover:brightness-110 shadow-[0_18px_60px_rgba(212,175,55,0.20)]"
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      prefetch={false}
      className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-3 font-semibold transition hover:bg-white/10 backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
    >
      {children}
    </Link>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "gold" | "violet" | "sky";
}) {
  const toneClass =
    tone === "gold"
      ? "text-amber-100"
      : tone === "violet"
      ? "text-violet-100"
      : tone === "sky"
      ? "text-sky-100"
      : "text-white/90";

  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/45">
        {label}
      </div>
      <div className={cx("mt-3 text-lg font-black tracking-tight", toneClass)}>
        {value}
      </div>
    </div>
  );
}

// Lightweight skeleton shown while TradingClient chunk is downloading
function TradingSkeleton() {
  return (
    <div className="rounded-[34px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
      <div className="h-10 w-56 rounded-xl bg-white/[0.06] animate-pulse" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/5] rounded-[26px] border border-white/10 bg-white/[0.04] animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

export default async function TradingPage() {
  const session = await getServerSession(authOptions);

  const viewerKey =
    (session as any)?.user?.handle ||
    (session as any)?.user?.publicId ||
    (session as any)?.handle ||
    (session as any)?.publicId ||
    null;

  const viewerWallet =
    (session as any)?.user?.walletAddress ||
    (session as any)?.walletAddress ||
    null;

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
                  Realife NFT Trading
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    Secondary market
                  </span>
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    STANDARD + PROTECTED
                  </span>
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    Premium trading hub
                  </span>
                </Pill>
              </div>

              <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-[-0.02em] md:text-6xl">
                Realife{" "}
                <span className="bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] bg-clip-text text-transparent">
                  NFT Trading
                </span>
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/70 md:text-base">
                Dedicated trading page for{" "}
                <span className="font-extrabold text-amber-100">
                  Realife NFTs
                </span>
                , focused on secondary listings, holder activity and premium
                collectible trading across supported contracts and market flows.
              </p>

              <div className="mt-3 max-w-3xl text-sm leading-relaxed text-white/60 md:text-base">
                This page is specifically for{" "}
                <span className="font-extrabold text-white/85">NFT trading</span>
                , not the primary product market. Real Marketing remains the
                original primary flow for official storefront purchase,
                delivery and redemption, while this section is the secondary
                trading hub for listed NFTs.
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <ActionLink href="/app/trading" primary>
                  Open NFT Trading
                </ActionLink>

                <ActionLink href="/app/real-marketing">
                  Open Real Marketing
                </ActionLink>
              </div>

              <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatCard
                  label="Page role"
                  value="NFT Trading Hub"
                  tone="gold"
                />
                <StatCard
                  label="Market flows"
                  value="Standard + Protected"
                  tone="violet"
                />
                <StatCard
                  label="Related hub"
                  value="Real Marketing"
                  tone="sky"
                />
              </div>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={120}>
        <Suspense fallback={<TradingSkeleton />}>
          <TradingClient
            viewerKey={viewerKey}
            viewerWallet={viewerWallet}
            initialMarketView="all"
            lockMarketView={false}
          />
        </Suspense>
      </Reveal>

      <Reveal delayMs={180}>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 pt-2 text-xs text-white/45">
          <div>Realife NFT Trading</div>
          <div className="flex items-center gap-4">
            <span className="opacity-60">Secondary market</span>
            <span className="opacity-60">STANDARD</span>
            <span className="opacity-60">PROTECTED</span>
            <span className="opacity-60">Store + Cafe resale</span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}