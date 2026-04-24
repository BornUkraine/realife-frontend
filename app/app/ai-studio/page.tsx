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
        "relative overflow-hidden rounded-[34px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.38),rgba(212,175,55,0.18),rgba(184,135,10,0.10))]",
        "shadow-[0_34px_130px_rgba(0,0,0,0.60)]",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "relative overflow-hidden rounded-[34px]",
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
    <div className="space-y-6">
      <Reveal>
        <GoldEdgeWrap className="rounded-[40px]">
          <div className="relative overflow-hidden p-7 md:p-10">
            <div className="pointer-events-none absolute -top-44 -right-44 h-[560px] w-[560px] rounded-full bg-[#d4af37]/16 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-44 -left-44 h-[560px] w-[560px] rounded-full bg-white/[0.06] blur-3xl" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-px w-[70%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#f7e7a7]/45 to-transparent" />

            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <Pill>
                  <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
                  Create with AI • GPT Image 2 & Sora 2 Pro
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    Premium media workflow
                  </span>
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    Product + service visuals
                  </span>
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    NFT-ready covers
                  </span>
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    Sora commercial videos
                  </span>
                </Pill>
              </div>

              <h1 className="mt-5 max-w-5xl text-4xl font-black leading-[1.02] tracking-[-0.035em] md:text-6xl">
                Create premium AI visuals and videos for{" "}
                <span className="bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] bg-clip-text text-transparent">
                  Realife listings
                </span>
              </h1>

              <p className="mt-5 max-w-4xl text-sm leading-relaxed text-white/72 md:text-base">
                Generate luxury product images, NFT-style product cards, service
                promotion covers, local offline service visuals, and cinematic
                Sora videos for real-world goods, services, delivery items,
                online sessions, and marketplace offers.
              </p>

              <div className="mt-4 max-w-4xl text-sm leading-relaxed text-white/66">
                This studio is designed for sellers and creators. Write what you
                want to sell, choose a premium preset, upload a reference image if
                needed, and create polished media that can later be used in Realife
                NFT and marketplace workflows.
              </div>

              <div className="mt-4 grid max-w-5xl grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-[24px] border border-[#d4af37]/18 bg-[#d4af37]/8 px-4 py-3 text-xs leading-relaxed text-white/68">
                  <span className="font-extrabold text-white">
                    GPT Image 2:
                  </span>{" "}
                  premium product cards, service covers, local visuals, NFT
                  posters, and marketplace-ready listing media.
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3 text-xs leading-relaxed text-white/62">
                  <span className="font-extrabold text-white">
                    Sora 2 Pro:
                  </span>{" "}
                  cinematic 12-second commercial videos with premium camera
                  movement, lighting, and final hero shots.
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3 text-xs leading-relaxed text-white/62">
                  <span className="font-extrabold text-white">
                    Realife use:
                  </span>{" "}
                  save generated media for NFT creation, service offers, product
                  listings, and Web3 marketplace presentation.
                </div>
              </div>

              <div className="mt-5 flex max-w-5xl flex-wrap gap-2">
                {[
                  "GPT Image 2",
                  "Sora 2 Pro",
                  "Premium product image",
                  "NFT product card",
                  "Service cover",
                  "Local service visual",
                  "Luxury commercial video",
                  "Reference product upload",
                  "Reference face upload",
                  "Prompt templates",
                  "Seller tutorial",
                  "High quality default",
                  "12 sec video mode",
                ].map((x) => (
                  <span
                    key={x}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-white/75"
                  >
                    {x}
                  </span>
                ))}
              </div>

              <div className="mt-6 grid max-w-6xl grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Step 1
                  </div>
                  <div className="mt-2 text-sm font-extrabold text-white">
                    Choose premium preset
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-white/60">
                    Product, service, local service, or luxury NFT poster style.
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Step 2
                  </div>
                  <div className="mt-2 text-sm font-extrabold text-white">
                    Write clear selling prompt
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-white/60">
                    Describe what you sell, who it is for, style, mood, city, and
                    exact text if needed.
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Step 3
                  </div>
                  <div className="mt-2 text-sm font-extrabold text-white">
                    Add reference image
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-white/60">
                    Use product photos, logos, faces, or brand references for
                    more accurate image and video direction.
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Step 4
                  </div>
                  <div className="mt-2 text-sm font-extrabold text-white">
                    Use in Realife
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-white/60">
                    Save the generated media for NFT creation, listings, service
                    offers, or marketplace visuals.
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/app/create"
                  className="rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-6 py-3 font-extrabold text-black ring-1 ring-black/15 transition hover:brightness-110 shadow-[0_18px_60px_rgba(212,175,55,0.20)]"
                >
                  Open Create NFT
                </Link>

                <Link
                  href="/app"
                  className="rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-3 font-semibold backdrop-blur-2xl transition hover:bg-white/10 shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                >
                  Back to App →
                </Link>
              </div>

              <div className="mt-4 grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/60">
                  AI API base:{" "}
                  <span className="break-all font-semibold text-white">
                    {aiApiBase}
                  </span>
                </div>

                <div className="rounded-[24px] border border-[#d4af37]/15 bg-[#d4af37]/8 px-4 py-3 text-xs text-white/60">
                  Recommended setup:{" "}
                  <span className="font-semibold text-white">
                    GPT Image 2 • 1:1 • High quality • Sora 2 Pro • 12 sec
                  </span>
                </div>
              </div>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={120}>
        <GoldEdgeWrap className="rounded-[40px]">
          <div className="p-6 md:p-10">
            <AiStudioClient />
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={200}>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 pt-2 text-xs text-white/45">
          <div>© {year} Realife</div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="opacity-60">AI Studio</span>
            <span className="opacity-60">GPT Image 2</span>
            <span className="opacity-60">Sora 2 Pro</span>
            <span className="opacity-60">Premium Images</span>
            <span className="opacity-60">Prompt tutorial</span>
            <span className="opacity-60">Reference upload</span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
