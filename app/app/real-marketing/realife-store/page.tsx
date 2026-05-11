// PATH: app/app/real-marketing/realife-store/page.tsx — Realife NFT Store page
// NOTE: Visual-density alignment for the new Realife AppShell. Transaction/data logic preserved.
import Link from "next/link";
import type { ReactNode } from "react";
import Reveal from "@/components/Reveal";
import StoreClient from "./StoreClient";

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
        "relative overflow-hidden rounded-[22px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.35),rgba(212,175,55,0.16),rgba(184,135,10,0.10))]",
        "shadow-[0_34px_130px_rgba(0,0,0,0.60)]",
        className
      )}
    >
      <div
        className={cx(
          "relative overflow-hidden rounded-[22px]",
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
        className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-4 py-2.5 font-extrabold text-black ring-1 ring-black/15 transition hover:brightness-110 shadow-[0_18px_60px_rgba(212,175,55,0.20)]"
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2.5 font-semibold backdrop-blur-2xl transition hover:bg-white/10 shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
    >
      {children}
    </Link>
  );
}

export default function RealifeStorePage() {
  return (
    <div className="space-y-4">
      <Reveal>
        <GoldEdgeWrap className="rounded-[22px]">
          <div className="relative overflow-hidden p-4 md:p-5">
            <div className="pointer-events-none absolute -top-36 -right-36 h-[420px] w-[420px] rounded-full bg-[#d4af37]/14 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-44 -left-44 h-[420px] w-[420px] rounded-full bg-white/[0.06] blur-3xl" />

            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <Pill>
                  <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
                  Real Marketing
                </Pill>

                <Pill>
                  <span className="text-white/80 font-extrabold">
                    NFT Store
                  </span>
                </Pill>

                <Pill>
                  <span className="text-white/80 font-extrabold">
                    Discovery + Selection
                  </span>
                </Pill>

                <Pill>
                  <span className="text-white/80 font-extrabold">
                    Delivery-ready products
                  </span>
                </Pill>
              </div>

              <h1 className="mt-4 text-2xl font-black leading-[1.08] tracking-[-0.02em] sm:text-3xl md:text-[2rem]">
                Realife{" "}
                <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]">
                  NFT Store
                </span>
              </h1>

              <p className="mt-4 max-w-3xl text-sm md:text-base text-white/70 leading-relaxed">
                Curated NFT storefront for real-world goods, collectibles, art,
                fashion, food and other approved products across the Realife
                ecosystem.
              </p>

              <div className="mt-3 max-w-3xl text-sm md:text-base text-white/60 leading-relaxed">
                This page is focused on discovery and selection. The full
                purchase flow — including delivery checkout, approval and final
                purchase — continues on the dedicated NFT product page after a
                user selects an item.
              </div>

              <div className="mt-3 max-w-3xl text-sm md:text-base text-white/55 leading-relaxed">
                Today the storefront is centered around{" "}
                <span className="font-extrabold text-white/85">Realife</span>,
                while remaining ready for future brand-based collections and
                broader product verticals.
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <ActionLink href="/app/orders" primary>
                  Orders & Delivery
                </ActionLink>

                <ActionLink href="/app/trading">Open Trading</ActionLink>

                <ActionLink href="/app/create/admin">Admin</ActionLink>

                <ActionLink href="/app/real-marketing">
                  Marketing Hub
                </ActionLink>
              </div>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={120}>
        <StoreClient />
      </Reveal>

      <Reveal delayMs={200}>
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 pt-1 text-xs text-white/45">
          <div>Realife Ecosystem</div>
          <div className="flex items-center gap-3">
            <span className="opacity-60">Store</span>
            <span className="opacity-60">Collectibles</span>
            <span className="opacity-60">Delivery</span>
            <span className="opacity-60">NFT Products</span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}