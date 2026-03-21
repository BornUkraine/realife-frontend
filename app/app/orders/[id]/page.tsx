import Link from "next/link";
import OrderRoomClient from "./OrderRoomClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

export default async function OrderRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-[#060505] text-white overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(255,255,255,0.05),transparent_60%)]" />
        <div className="absolute -top-80 -left-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/12 blur-3xl animate-pulse" />
        <div className="absolute -bottom-80 -right-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/10 blur-3xl animate-pulse" />
        <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[length:56px_56px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-10 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 font-black">
              Realife Delivery Room
            </div>
            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-white/95">
              Order Room
            </h1>
            <div className="mt-2 max-w-3xl text-[13px] text-white/55">
              Dedicated buyer ↔ seller ↔ support room for one delivery order.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/app/orders"
              className={cx(
                "px-4 py-2 rounded-2xl border border-white/12 bg-white/[0.06]",
                "hover:bg-white/[0.10] transition text-[12px] font-black text-white/85"
              )}
            >
              ← Back to orders
            </Link>

            <Link
              href="/app/profile"
              className={cx(
                "px-4 py-2 rounded-2xl border border-white/12 bg-white/[0.06]",
                "hover:bg-white/[0.10] transition text-[12px] font-black text-white/85"
              )}
            >
              Profile
            </Link>
          </div>
        </div>

        <OrderRoomClient orderId={id} />
      </div>
    </main>
  );
}