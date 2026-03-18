import Link from "next/link";
import StoreClient from "./StoreClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RealifeStorePage() {
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
        <div className="reveal flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.26em] text-white/45 font-black">
              Real Marketing
            </div>

            <div className="mt-2 text-3xl md:text-4xl font-black tracking-tight">
              Realife NFT Store
            </div>

            <div className="mt-2 text-[13px] text-white/55 max-w-2xl">
              Curated NFT storefront for real-world goods, collectibles, art, fashion,
              food and other approved products.
            </div>

            <div className="mt-3 text-[13px] text-white/50 max-w-3xl leading-relaxed">
              Today this storefront is centered around{" "}
              <span className="text-white/80 font-black">Realife</span>. It is also
              ready for future brand-based collections, where each NFT product can carry
              its own project or brand label inside metadata without requiring a separate
              storefront UI.
            </div>

            <div className="mt-3 text-[13px] text-white/50 max-w-3xl leading-relaxed">
              This page is focused on{" "}
              <span className="text-white/80 font-black">discovery and selection</span>.
              The full product flow — including delivery checkout, approval and purchase —
              opens on the dedicated NFT product page after the user selects an item.
            </div>
          </div>

          <div className="shrink-0 flex flex-wrap items-center gap-2">
            <Link
              href="/app/orders"
              className="px-4 py-2 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 font-extrabold transition shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
            >
              Orders & Delivery
            </Link>

            <Link
              href="/app/trading"
              className="px-4 py-2 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 font-extrabold transition shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
            >
              Trading
            </Link>

            <Link
              href="/app/create/admin"
              className="px-4 py-2 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 font-extrabold transition shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
            >
              Admin
            </Link>

            <Link
              href="/app"
              className="px-4 py-2 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 font-extrabold transition shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
            >
              App
            </Link>
          </div>
        </div>

        <div className="reveal mt-8" style={{ animationDelay: "80ms" }}>
          <StoreClient />
        </div>

        <footer className="reveal pt-10 text-[10px] font-black text-white/20 text-center uppercase tracking-[0.4em]">
          Realife Ecosystem • NFT Store
        </footer>
      </div>
    </main>
  );
}