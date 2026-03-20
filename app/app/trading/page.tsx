import Link from "next/link";
import { getServerSession } from "next-auth";
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
    <main className="min-h-screen bg-[#060505] text-white overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(255,255,255,0.05),transparent_60%)]" />
        <div className="absolute -top-80 -left-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-80 -right-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/10 blur-3xl animate-pulse" />
        <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[length:56px_56px]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.65),transparent)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-10">
        <div className="reveal flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.26em] text-white/45 font-black">
              Realife Market
            </div>

            <div className="mt-2 text-3xl md:text-4xl font-black tracking-tight">
              Trading
            </div>

            <div className="mt-2 text-[13px] text-white/55 max-w-3xl leading-relaxed">
              Premium unified trading hub for verified Realife NFTs. Browse the
              full market or jump directly into dedicated views for{" "}
              <span className="text-amber-100 font-extrabold">
                Realife Cafe
              </span>
              ,{" "}
              <span className="text-sky-100 font-extrabold">
                Realife Store
              </span>
              ,{" "}
              <span className="text-emerald-100 font-extrabold">
                Public Mint Standard
              </span>{" "}
              and{" "}
              <span className="text-violet-100 font-extrabold">
                Public Mint Delivery
              </span>
              .
            </div>

            <div className="mt-3 text-[13px] text-white/50 max-w-3xl leading-relaxed">
              One page for discovery, filtering and your own activity. Market
              cards keep the premium Realife look while separating collections
              more clearly for users.
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Link
              href="/app/real-marketing"
              className="px-4 py-2 rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/10 font-extrabold transition text-amber-100/95 shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
            >
              Real Marketing
            </Link>

            <Link
              href="/"
              className="px-4 py-2 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 font-extrabold transition shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
            >
              Home
            </Link>
          </div>
        </div>

        <div className="reveal mt-8" style={{ animationDelay: "80ms" }}>
          <TradingClient viewerKey={viewerKey} viewerWallet={viewerWallet} />
        </div>

        <footer className="reveal pt-10 text-[10px] font-black text-white/20 text-center uppercase tracking-[0.4em]">
          Realife Ecosystem • Trading
        </footer>
      </div>
    </main>
  );
}