import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SuccessClient from "./SuccessClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function PremiumFallback() {
  return (
    <div className="relative overflow-hidden rounded-[22px] p-px bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))] shadow-[0_18px_70px_rgba(0,0,0,0.45)]">
      <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[#0b0a09]/15 backdrop-blur-2xl ring-1 ring-black/10 p-4 md:p-5">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_0%,rgba(212,175,55,0.10),transparent_45%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_120%,rgba(255,255,255,0.06),transparent_55%)]" />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl border border-white/10 bg-white/[0.06] animate-pulse" />
          <div className="min-w-0 flex-1">
            <div className="h-2.5 w-32 rounded bg-white/10 animate-pulse" />
            <div className="mt-1.5 h-2.5 w-52 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="h-7 w-24 rounded-lg bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] opacity-40 animate-pulse" />
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-11 rounded-lg border border-white/10 bg-white/[0.04] animate-pulse"
            />
          ))}
        </div>

        <div className="mt-4 text-[11px] text-white/60 font-semibold">
          Loading minted asset data…{" "}
          <span className="text-amber-200 font-extrabold">reward +10</span>
        </div>
      </div>
    </div>
  );
}

export default async function Page() {
  const session = await getServerSession(authOptions);

  const viewerKey =
    (session as any)?.user?.handle ||
    (session as any)?.user?.publicId ||
    (session as any)?.handle ||
    (session as any)?.publicId ||
    null;

  return (
    <Suspense fallback={<PremiumFallback />}>
      <SuccessClient viewerKey={viewerKey} />
    </Suspense>
  );
}