import Link from "next/link";
import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import Reveal from "@/components/Reveal";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TradingClient from "./TradingClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function norm(v?: string | null) {
  const s = String(v || "").trim();
  return s ? s.toLowerCase() : "";
}

function pickViewerKey(
  u?: { handle: string | null; publicId: string | null } | null
) {
  if (!u) return null;
  if (u.handle && u.handle !== "tmp") return u.handle;
  if (u.publicId && u.publicId !== "tmp") return u.publicId;
  return null;
}

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
      className={[
        "relative overflow-hidden rounded-[34px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.35),rgba(212,175,55,0.16),rgba(184,135,10,0.10))]",
        "shadow-[0_34px_130px_rgba(0,0,0,0.60)]",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "relative overflow-hidden rounded-[34px]",
          "border border-white/10 bg-[#0b0a09]/60 backdrop-blur-2xl",
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

export default async function TradingPage() {
  const session = await getServerSession(authOptions);

  const viewerId =
    (session as any)?.user?.id || (session as any)?.userId || null;
  const sessionWallet = norm(
    (session as any)?.user?.walletAddress ||
      (session as any)?.walletAddress ||
      ""
  );

  let viewerKey: string | null = null;
  let viewerWallet: string | null = sessionWallet || null;

  if (viewerId) {
    const u = await prisma.user.findUnique({
      where: { id: viewerId },
      select: { handle: true, publicId: true, walletAddress: true },
    });

    viewerKey = pickViewerKey(u);
    viewerWallet = norm(viewerWallet || u?.walletAddress || "") || null;
  }

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
                  Realife Market
                </Pill>

                <Pill>
                  <span className="text-white/80 font-extrabold">
                    Unified NFT hub
                  </span>
                </Pill>

                <Pill>
                  <span className="text-white/80 font-extrabold">
                    Store + Cafe + Public Mint
                  </span>
                </Pill>

                <Pill>
                  <span className="text-white/80 font-extrabold">
                    Market + Activity
                  </span>
                </Pill>
              </div>

              <h1 className="mt-5 text-4xl md:text-6xl font-black leading-[1.05] tracking-[-0.02em]">
                Realife{" "}
                <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]">
                  Trading
                </span>
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/70 md:text-base">
                Premium unified trading hub for verified Realife NFTs across
                supported collections and contracts.
              </p>

              <div className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70">
                Browse the full market, filter collections more clearly, and
                switch between discovery and your own activity in one premium
                interface.
              </div>

              <div className="mt-3 max-w-3xl text-sm leading-relaxed text-white/60">
                Includes dedicated views for{" "}
                <span className="font-extrabold text-amber-100">
                  Realife Cafe
                </span>
                ,{" "}
                <span className="font-extrabold text-sky-100">
                  Realife Store
                </span>
                ,{" "}
                <span className="font-extrabold text-emerald-100">
                  Public Mint Standard
                </span>{" "}
                and{" "}
                <span className="font-extrabold text-violet-100">
                  Public Mint Delivery
                </span>
                .
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/app/real-marketing"
                  className={cx(
                    "px-6 py-3 rounded-2xl border border-white/15 bg-white/[0.06]",
                    "font-semibold hover:bg-white/10 transition backdrop-blur-2xl",
                    "shadow-[0_18px_70px_rgba(0,0,0,0.28)] text-amber-100/95"
                  )}
                >
                  Real Marketing
                </Link>

                <Link
                  href="/app/profile"
                  className={cx(
                    "px-6 py-3 rounded-2xl border border-white/15 bg-white/[0.06]",
                    "font-semibold hover:bg-white/10 transition backdrop-blur-2xl",
                    "shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                  )}
                >
                  Profile
                </Link>

                <Link
                  href="/"
                  className="px-6 py-3 rounded-2xl text-black font-extrabold hover:brightness-110 transition shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
                >
                  Home →
                </Link>
              </div>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={120}>
        <TradingClient viewerKey={viewerKey} viewerWallet={viewerWallet} />
      </Reveal>

      <Reveal delayMs={200}>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 pt-2 text-xs text-white/45">
          <div>Realife Ecosystem</div>
          <div className="flex items-center gap-4">
            <span className="opacity-60">Trading</span>
            <span className="opacity-60">Market</span>
            <span className="opacity-60">Collections</span>
            <span className="opacity-60">Activity</span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}