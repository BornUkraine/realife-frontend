import Link from "next/link";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import AiStudioClient from "./AiStudioClient";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Create with AI — Images & Video",
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

export default function AiStudioPage() {
  const year = new Date().getFullYear();
  const aiApiBase = process.env.NEXT_PUBLIC_AI_API_BASE || "same app routes";

  return (
    <div className="space-y-6">
      <Reveal>
        <GoldEdgeWrap className="rounded-[40px]">
          <div className="relative overflow-hidden p-7 md:p-10">
            <div className="pointer-events-none absolute -top-44 -right-44 h-[560px] w-[560px] rounded-full bg-[#d4af37]/14 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-44 -left-44 h-[560px] w-[560px] rounded-full bg-white/[0.06] blur-3xl" />

            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <Pill>
                  <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
                  Create with AI • Images & Video
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    Beginner seller tutorial
                  </span>
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    Product + service prompts
                  </span>
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    Reference image upload
                  </span>
                </Pill>

                <Pill>
                  <span className="font-extrabold text-white/80">
                    AI image + video workflow
                  </span>
                </Pill>
              </div>

              <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-[-0.02em] md:text-6xl">
                Create with AI{" "}
                <span className="bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] bg-clip-text text-transparent">
                  Images & Video
                </span>
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/70 md:text-base">
                Generate premium visuals for your Realife listing. Create product
                images, service promotion visuals, and short videos for goods,
                services, delivery items, online sessions, or local offers.
              </p>

              <div className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70">
                This page is designed for beginners. You can write what you want
                to sell, upload your face photo, product image, logo, or another
                reference image, and generate AI visuals for a listing.
              </div>

              <div className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70">
                If your offer is a local offline service, include the{" "}
                <span className="font-semibold text-white">city and country</span>.
                If it is a product, describe the product clearly. If it is a
                service, describe what you do, for whom, and what result the
                buyer gets.
              </div>

              <div className="mt-4 flex max-w-5xl flex-wrap gap-2">
                {[
                  "Product image",
                  "Service promo image",
                  "Local service visual",
                  "Luxury commercial video",
                  "Reference face upload",
                  "Reference product upload",
                  "Prompt templates",
                  "Seller tutorial",
                ].map((x) => (
                  <span
                    key={x}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-white/75"
                  >
                    {x}
                  </span>
                ))}
              </div>

              <div className="mt-4 grid max-w-6xl grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Step 1
                  </div>
                  <div className="mt-2 text-sm font-extrabold text-white">
                    Describe what you want to sell
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-white/60">
                    Write what the product or service is, who it is for, and how
                    you want it to look.
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Step 2
                  </div>
                  <div className="mt-2 text-sm font-extrabold text-white">
                    Add a reference image
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-white/60">
                    Upload your face, product photo, logo, or another image if you
                    want more accurate output.
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Step 3
                  </div>
                  <div className="mt-2 text-sm font-extrabold text-white">
                    Generate image or video
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-white/60">
                    Create listing visuals, product commercials, or service promo
                    media directly from your prompt.
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Step 4
                  </div>
                  <div className="mt-2 text-sm font-extrabold text-white">
                    Use later in Realife
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-white/60">
                    You can later use the generated media inside a listing, service,
                    or NFT workflow.
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

                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/60">
                  Recommended use: <span className="font-semibold text-white">Create listing visuals first, then mint or attach later</span>
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
          <div className="flex items-center gap-4">
            <span className="opacity-60">AI Studio</span>
            <span className="opacity-60">Images</span>
            <span className="opacity-60">Video</span>
            <span className="opacity-60">Prompt tutorial</span>
            <span className="opacity-60">Reference upload</span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
