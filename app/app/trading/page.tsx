import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import TradingClient from "./TradingClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    <main className="min-h-screen bg-[#060505] text-white overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(255,255,255,0.05),transparent_60%)]" />
        <div className="animate-orb-1 absolute -top-80 -left-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/12 blur-3xl" />
        <div className="animate-orb-2 absolute -bottom-80 -right-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[length:56px_56px]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.65),transparent)]" />
      </div>

      <div className="relative mx-auto max-w-[1480px] px-6 py-10 space-y-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.26em] text-white/40 font-black">
              Realife Trading
            </div>

            <h1 className="mt-3 text-3xl md:text-5xl font-black tracking-tight text-white">
              Premium NFT Market
            </h1>

            <div className="mt-4 max-w-4xl text-[14px] md:text-[15px] leading-relaxed text-white/60">
              Trade verified Realife NFTs across Public Mint, Realife Store and
              Realife Cafe collections. Store and Cafe secondary market pages are
              trading only. Official delivery or redemption remains available only
              through the original Real Marketing primary flow.
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[12px] font-black text-white/80">
              Public Standard
            </div>
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-[12px] font-black text-violet-100">
              Public Delivery
            </div>
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-[12px] font-black text-sky-100">
              Store Secondary
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-[12px] font-black text-amber-100">
              Cafe Secondary
            </div>
          </div>
        </div>

        <TradingClient
          viewerKey={viewerKey}
          viewerWallet={viewerWallet}
          initialMarketView="all"
          lockMarketView={false}
        />
      </div>
    </main>
  );
}