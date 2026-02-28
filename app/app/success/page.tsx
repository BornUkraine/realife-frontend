import { Suspense } from "react";
import SuccessClient from "./SuccessClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function PremiumFallback() {
  return (
    <div className="relative overflow-hidden rounded-[34px] p-px bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))] shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
      <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#0b0a09]/15 backdrop-blur-2xl ring-1 ring-black/10 p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_0%,rgba(212,175,55,0.10),transparent_45%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_120%,rgba(255,255,255,0.06),transparent_55%)]" />
        </div>

        <div className="relative flex items-center gap-4">
          <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/[0.06] animate-pulse" />
          <div className="min-w-0 flex-1">
            <div className="h-3 w-40 rounded bg-white/10 animate-pulse" />
            <div className="mt-2 h-3 w-64 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="h-9 w-28 rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] opacity-40 animate-pulse" />
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-2xl border border-white/10 bg-white/[0.04] animate-pulse"
            />
          ))}
        </div>

        <div className="mt-6 text-xs text-white/60 font-semibold">
          Loading success data… <span className="text-amber-200 font-extrabold">reward +10</span>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PremiumFallback />}>
      <SuccessClient />
    </Suspense>
  );
}