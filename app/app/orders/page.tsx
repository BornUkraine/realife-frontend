import Link from "next/link";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import OrdersClient from "./OrdersClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Orders | Realife",
  robots: {
    index: false,
    follow: false,
  },
};

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

export default function OrdersPage() {
  const year = new Date().getFullYear();

  const protectedUsdcMarketplaceContract =
    process.env.NEXT_PUBLIC_REALIFE_PROTECTED_MARKETPLACE_USDC_CONTRACT ||
    "not-set";

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
                  Orders center
                </Pill>

                <Pill>
                  <span className="font-extrabold text-emerald-200">
                    Protected USDC escrow
                  </span>
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    Delivery + services
                  </span>
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    Buyer / Seller / Support
                  </span>
                </Pill>
              </div>

              <h1 className="mt-3 text-2xl font-black leading-[1.1] tracking-[-0.02em] sm:text-3xl md:text-[2rem]">
                Orders{" "}
                <span className="bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] bg-clip-text text-transparent">
                  & Fulfillment
                </span>
              </h1>

              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-white/65 md:text-sm">
                Manage physical delivery, digital services, online sessions and
                local work from one Realife order center. Protected marketplace
                orders use USDC escrow until completion, release or refund.
              </p>

              <div className="mt-3 flex max-w-5xl flex-wrap gap-1">
                {[
                  "Physical goods",
                  "Digital services",
                  "Online sessions",
                  "Local services",
                  "Shipping updates",
                  "Buyer confirmation",
                  "USDC payout",
                  "Refund path",
                ].map((x) => (
                  <span
                    key={x}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-white/70"
                  >
                    {x}
                  </span>
                ))}
              </div>

              <div className="mt-3 max-w-4xl space-y-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] text-white/55">
                <div>
                  Protected USDC marketplace:{" "}
                  <span className="break-all font-semibold text-emerald-100">
                    {protectedUsdcMarketplaceContract}
                  </span>
                </div>
                <div>
                  Fee model:{" "}
                  <span className="font-semibold text-white/85">
                    2.5% seller-side platform fee on completed protected trades
                  </span>
                </div>
              </div>

              <div className="mt-3 grid max-w-6xl grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-white/45">
                    Physical
                  </div>
                  <div className="mt-1 text-[11px] font-extrabold text-white">
                    Shipping flow
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-white/45">
                    Service
                  </div>
                  <div className="mt-1 text-[11px] font-extrabold text-white">
                    Completion flow
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-white/45">
                    Protected
                  </div>
                  <div className="mt-1 text-[11px] font-extrabold text-white">
                    USDC escrow
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-white/45">
                    Support
                  </div>
                  <div className="mt-1 text-[11px] font-extrabold text-white">
                    Dispute notes
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/app/trading"
                  className="rounded-lg bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-3.5 py-2 text-xs font-extrabold text-black ring-1 ring-black/15 transition hover:brightness-110 shadow-[0_10px_36px_rgba(212,175,55,0.20)]"
                >
                  Open Trading →
                </Link>

                <Link
                  href="/app/real-marketing/realife-store"
                  className="rounded-lg border border-white/15 bg-white/[0.06] px-3.5 py-2 text-xs font-semibold backdrop-blur-2xl transition hover:bg-white/10"
                >
                  Store
                </Link>

                <Link
                  href="/app/profile"
                  className="rounded-lg border border-white/15 bg-white/[0.06] px-3.5 py-2 text-xs font-semibold backdrop-blur-2xl transition hover:bg-white/10"
                >
                  Profile
                </Link>
              </div>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={100}>
        <GoldEdgeWrap className="rounded-[22px]">
          <div className="p-4 md:p-5">
            <OrdersClient />
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={200}>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 pt-2 text-xs text-white/45">
          <div>© {year} Realife</div>
          <div className="flex items-center gap-4">
            <span className="opacity-60">Orders</span>
            <span className="opacity-60">Delivery</span>
            <span className="opacity-60">Services</span>
            <span className="opacity-60">USDC escrow</span>
            <span className="opacity-60">Support</span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
