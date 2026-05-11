import Link from "next/link";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import AiStudioClient from "./AiStudioClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Create with AI — GPT Image 2 & Sora 2 Pro",
  description:
    "Create premium AI visuals and videos for Realife products, services, delivery items, local offers, and NFT marketplace listings.",
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
        "relative overflow-hidden rounded-[22px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.38),rgba(212,175,55,0.18),rgba(184,135,10,0.10))]",
        "shadow-[0_34px_130px_rgba(0,0,0,0.60)]",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "relative overflow-hidden rounded-[22px]",
          "border border-white/10 bg-[#0b0a09]/62 backdrop-blur-2xl",
          "ring-1 ring-black/10",
          "before:pointer-events-none before:absolute before:inset-0",
          "before:bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.14),transparent_45%)]",
          "after:pointer-events-none after:absolute after:inset-0",
          "after:bg-[radial-gradient(circle_at_85%_115%,rgba(255,255,255,0.06),transparent_55%)]",
        ].join(" ")}
      >
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

export default function AiStudioPage() {
  const year = new Date().getFullYear();
  const aiApiBase = process.env.NEXT_PUBLIC_AI_API_BASE || "same app routes";

  return (
    <div className="space-y-4">
      <Reveal>
        <GoldEdgeWrap className="rounded-[22px]">
          <div className="relative overflow-hidden p-4 md:p-5">
            <div className="pointer-events-none absolute -top-32 -right-32 h-[320px] w-[320px] rounded-full bg-[#d4af37]/16 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -left-32 h-[320px] w-[320px] rounded-full bg-white/[0.06] blur-3xl" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-px w-[70%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#f7e7a7]/45 to-transparent" />

            <div className="relative">
              <div className="flex flex-wrap items-center gap-1.5">
                <Pill>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37] shadow-[0_0_0_4px_rgba(212,175,55,0.12)]" />
                  GPT Image 2 • Sora 2 Pro
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    Premium visuals
                  </span>
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    NFT-ready
                  </span>
                </Pill>
              </div>

              <h1 className="mt-3 max-w-5xl text-2xl font-black leading-[1.1] tracking-[-0.025em] sm:text-3xl md:text-[2rem]">
                Create premium AI visuals for{" "}
                <span className="bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] bg-clip-text text-transparent">
                  Realife listings
                </span>
              </h1>

              <p className="mt-2 max-w-4xl text-xs leading-relaxed text-white/65 md:text-sm">
                Generate luxury product images, NFT-style cards, service covers, and cinematic Sora videos for real-world goods, services, delivery items, and marketplace offers.
              </p>

              <div className="mt-3 grid max-w-5xl grid-cols-1 gap-2 md:grid-cols-3">
                <div className="rounded-lg border border-[#d4af37]/18 bg-[#d4af37]/8 px-3 py-2 text-[11px] leading-relaxed text-white/68">
                  <span className="font-extrabold text-white">GPT Image 2:</span>{" "}
                  product cards, service covers, NFT posters.
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] leading-relaxed text-white/62">
                  <span className="font-extrabold text-white">Sora 2 Pro:</span>{" "}
                  cinematic 12-second commercial videos.
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] leading-relaxed text-white/62">
                  <span className="font-extrabold text-white">Realife use:</span>{" "}
                  save for NFT creation and marketplace listings.
                </div>
              </div>

              <div className="mt-3 flex max-w-5xl flex-wrap gap-1">
                {[
                  "GPT Image 2",
                  "Sora 2 Pro",
                  "Product image",
                  "NFT card",
                  "Service cover",
                  "Local service",
                  "Commercial video",
                  "Reference upload",
                  "Prompt templates",
                  "12 sec video",
                ].map((x) => (
                  <span
                    key={x}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-white/70"
                  >
                    {x}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/app/create"
                  className="rounded-lg bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-3.5 py-2 text-xs font-extrabold text-black ring-1 ring-black/15 transition hover:brightness-110 shadow-[0_10px_36px_rgba(212,175,55,0.20)]"
                >
                  Open Create NFT
                </Link>

                <Link
                  href="/app"
                  className="rounded-lg border border-white/15 bg-white/[0.06] px-3.5 py-2 text-xs font-semibold backdrop-blur-2xl transition hover:bg-white/10"
                >
                  Back to App →
                </Link>
              </div>

              <div className="mt-3 rounded-lg border border-[#d4af37]/15 bg-[#d4af37]/8 px-3 py-2 text-[10px] text-white/60">
                Recommended:{" "}
                <span className="font-semibold text-white">
                  GPT Image 2 • 1:1 • High quality • Sora 2 Pro • 12 sec
                </span>
              </div>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={100}>
        <GoldEdgeWrap className="rounded-[22px]">
          <div className="p-4 md:p-5">
            <AiStudioClient />
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={180}>
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 pt-1 text-[11px] text-white/45">
          <div>© {year} Realife</div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="opacity-60">AI Studio</span>
            <span className="opacity-60">GPT Image 2</span>
            <span className="opacity-60">Sora 2 Pro</span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
