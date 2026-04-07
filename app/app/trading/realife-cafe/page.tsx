import type { ReactNode } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import Reveal from "@/components/Reveal";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TradingClient from "../TradingClient";

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
          "before:bg-[radial-gradient(circle_at_18%_0%,rgba(245,158,11,0.12),transparent_45%)]",
          "after:pointer-events-none after:absolute after:inset-0",
          "after:bg-[radial-gradient(circle_at_85%_115%,rgba(255,255,255,0.06),transparent_55%)]",
        ].join(" ")}
      >
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

export default async function RealifeCafeTradingPage() {
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
            <div className="pointer-events-none absolute -top-44 -right-44 h-[560px] w-[560px] rounded-full bg-amber-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-44 -left-44 h-[560px] w-[560px] rounded-full bg-white/[0.06] blur-3xl" />

            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <Pill>
                  <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_0_6px_rgba(245,158,11,0.12)]" />
                  Realife Crypto Cafe
                </Pill>

                <Pill>
                  <span className="text-white/80 font-extrabold">
                    STANDARD marketplace
                  </span>
                </Pill>

                <Pill>
                  <span className="text-white/80 font-extrabold">
                    Trading only
                  </span>
                </Pill>

                <Pill>
                  <span className="text-white/80 font-extrabold">
                    No redemption
                  </span>
                </Pill>
              </div>

              <h1 className="mt-5 text-4xl md:text-6xl font-black leading-[1.05] tracking-[-0.02em]">
                Realife{" "}
                <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#fcd34d,#f59e0b,#d97706)]">
                  Crypto Cafe
                </span>
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/70 md:text-base">
                Secondary market page for cafe NFTs. This section is trading only.
                Drink, food, merch, or official redemption is not automatically guaranteed for secondary buyers.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/app/trading"
                  className={cx(
                    "px-6 py-3 rounded-2xl border border-white/15 bg-white/[0.06]",
                    "font-semibold hover:bg-white/10 transition backdrop-blur-2xl",
                    "shadow-[0_18px_70px_rgba(0,0,0,0.28)] text-white"
                  )}
                >
                  Back to Trading Hub
                </Link>
              </div>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={100}>
        <TradingClient
          viewerKey={viewerKey}
          viewerWallet={viewerWallet}
          initialMarketView="cafe"
          lockMarketView={true}
        />
      </Reveal>
    </div>
  );
}