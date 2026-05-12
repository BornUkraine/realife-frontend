import Link from "next/link";
import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import Reveal from "@/components/Reveal";
import { authOptions } from "@/lib/auth";
import TradingClient from "./TradingClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
        className="inline-flex items-center justify-center rounded-lg bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-3.5 py-2 text-xs font-extrabold text-black ring-1 ring-black/15 transition hover:brightness-110 shadow-[0_10px_36px_rgba(212,175,55,0.20)]"
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      prefetch={false}
      className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] px-3.5 py-2 text-xs font-semibold transition hover:bg-white/10 backdrop-blur-2xl"
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
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/45">
        {label}
      </div>
      <div className={cx("mt-1.5 text-xs font-black tracking-tight md:text-sm", toneClass)}>
        {value}
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
    <div className="space-y-4">
      <Reveal>
        <GoldEdgeWrap className="rounded-[22px]">
          <div className="relative overflow-hidden p-4 md:p-5">
            <div className="pointer-events-none absolute -top-32 -right-32 h-[320px] w-[320px] rounded-full bg-[#d4af37]/14 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -left-32 h-[320px] w-[320px] rounded-full bg-white/[0.06] blur-3xl" />

            <div className="relative">
              <div className="flex flex-wrap items-center gap-1.5">
                <Pill>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37] shadow-[0_0_0_4px_rgba(212,175,55,0.12)]" />
                  Realife Trading
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    AI search
                  </span>
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    USDC Protected Escrow
                  </span>
                </Pill>
              </div>

              <h1 className="mt-3 text-2xl font-black leading-[1.1] tracking-[-0.02em] sm:text-3xl md:text-[2rem]">
                Trade{" "}
                <span className="bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] bg-clip-text text-transparent">
                  real-world NFTs
                </span>
              </h1>

              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-white/65 md:text-sm">
                Service Protected and Goods Protected now use USDC escrow on Base Sepolia.
                Public Standard remains the normal NFT trading flow. Cafe and Store resale stay at the end.
                Everything minted through the unified ERC-1155 contract and routed by metadata.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <ActionLink href="/app/trading/service-protected" primary>
                  Service Protected
                </ActionLink>

                <ActionLink href="/app/trading/public-delivery">
                  Goods Protected
                </ActionLink>

                <ActionLink href="/app/trading/public-standard">
                  Public Standard
                </ActionLink>

                <ActionLink href="/app/real-marketing">
                  Real Marketing
                </ActionLink>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <StatCard
                  label="Main flow"
                  value="USDC escrow"
                  tone="gold"
                />
                <StatCard
                  label="Goods flow"
                  value="USDC goods"
                  tone="violet"
                />
                <StatCard
                  label="Resale"
                  value="Standard + Cafe/Store"
                  tone="sky"
                />
              </div>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={120}>
        <TradingClient
          viewerKey={viewerKey}
          viewerWallet={viewerWallet}
          initialMarketView="all"
          lockMarketView={false}
        />
      </Reveal>

      <Reveal delayMs={180}>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 pt-2 text-xs text-white/45">
          <div>Realife NFT Trading</div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="opacity-60">AI search</span>
            <span className="opacity-60">Secondary market</span>
            <span className="opacity-60">Service Protected / USDC</span>
            <span className="opacity-60">Goods Protected / USDC</span>
            <span className="opacity-60">Public Standard</span>
            <span className="opacity-60">Cafe resale</span>
            <span className="opacity-60">Store resale</span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}