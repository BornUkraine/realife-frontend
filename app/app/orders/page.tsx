import Link from "next/link";
import OrdersClient from "./OrdersClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

export default function OrdersPage() {
  return (
    <main className="min-h-screen bg-[#060505] text-white overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(255,255,255,0.05),transparent_60%)]" />
        <div className="absolute -top-80 -left-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/12 blur-3xl animate-pulse" />
        <div className="absolute -bottom-80 -right-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/10 blur-3xl animate-pulse" />
        <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[length:56px_56px]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.65),transparent)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-10 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 font-black">
              Realife Delivery
            </div>

            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-white/95">
              Orders & Delivery
            </h1>

            <div className="mt-2 max-w-3xl text-[13px] text-white/55">
              Единый delivery-раздел для всех NFT с доставкой: store покупки,
              future public mint delivery и secondary trading delivery.
            </div>

            <div className="mt-3 max-w-3xl text-[13px] text-white/50 leading-relaxed">
              Здесь buyer и seller управляют shipping flow, tracking, confirmation
              и escrow-статусами в одной общей системе, без разделения на store-only
              логику.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/app/profile"
              className={cx(
                "px-4 py-2 rounded-2xl border border-white/12 bg-white/[0.06]",
                "hover:bg-white/[0.10] transition text-[12px] font-black text-white/85"
              )}
            >
              Profile
            </Link>

            <Link
              href="/app/real-marketing/realife-store"
              className={cx(
                "px-4 py-2 rounded-2xl border border-white/12 bg-white/[0.06]",
                "hover:bg-white/[0.10] transition text-[12px] font-black text-white/85"
              )}
            >
              Store
            </Link>

            <Link
              href="/app/trading"
              className={cx(
                "px-4 py-2 rounded-2xl border border-white/12 bg-white/[0.06]",
                "hover:bg-white/[0.10] transition text-[12px] font-black text-amber-100/90 hover:text-amber-100"
              )}
            >
              Open Trading →
            </Link>
          </div>
        </div>

        <OrdersClient />

        <footer className="pt-10 text-[10px] font-black text-white/20 text-center uppercase tracking-[0.4em]">
          Realife Ecosystem • Delivery Orders
        </footer>
      </div>
    </main>
  );
}