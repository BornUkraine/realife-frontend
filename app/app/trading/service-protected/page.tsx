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
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-white/70 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
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
        "relative overflow-hidden rounded-[22px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.35),rgba(212,175,55,0.16),rgba(184,135,10,0.10))]",
        "shadow-[0_34px_130px_rgba(0,0,0,0.60)]",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "relative overflow-hidden rounded-[22px]",
          "border border-white/10 bg-[#0b0a09]/60 backdrop-blur-2xl",
          "ring-1 ring-black/10",
          "before:pointer-events-none before:absolute before:inset-0",
          "before:bg-[radial-gradient(circle_at_18%_0%,rgba(139,92,246,0.12),transparent_45%)]",
          "after:pointer-events-none after:absolute after:inset-0",
          "after:bg-[radial-gradient(circle_at_85%_115%,rgba(255,255,255,0.06),transparent_55%)]",
        ].join(" ")}
      >
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

export default async function ServiceProtectedTradingPage() {
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
    <div className="space-y-4">
      <Reveal>
        <GoldEdgeWrap className="rounded-[22px]">
          <div className="relative overflow-hidden p-4 md:p-5">
            <div className="pointer-events-none absolute -top-32 -right-32 h-[320px] w-[320px] rounded-full bg-violet-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -left-32 h-[320px] w-[320px] rounded-full bg-white/[0.06] blur-3xl" />

            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <Pill>
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_0_4px_rgba(139,92,246,0.12)]" />
                  Services Protected
                </Pill>

                <Pill>
                  <span className="text-white/80 font-extrabold">
                    Protected mint contract
                  </span>
                </Pill>

                <Pill>
                  <span className="text-white/80 font-extrabold">
                    PROTECTED service escrow
                  </span>
                </Pill>
              </div>

              <h1 className="mt-3 text-2xl sm:text-3xl md:text-[2rem] font-black leading-[1.05] tracking-[-0.02em]">
                Service{" "}
                <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#c4b5fd,#8b5cf6,#7c3aed)]">
                  Protected
                </span>
              </h1>

              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-white/65 md:text-sm">
                Service NFTs minted through the protected quantity ERC-1155 contract and listed through the PROTECTED USDC escrow flow. This page is focused on digital services, online sessions, local/offline services and buyer confirmation.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/app/trading"
                  className={cx(
                    "px-3.5 py-2 text-xs rounded-lg border border-white/15 bg-white/[0.06]",
                    "font-semibold hover:bg-white/10 transition backdrop-blur-2xl",
                    " text-white"
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
          initialMarketView="publicProtected"
          lockMarketView={true}
        />
      </Reveal>
    </div>
  );
}