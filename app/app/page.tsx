"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import Reveal from "@/components/Reveal";

const REAL_MARKETING_HREF = "/app/real-marketing";

const HOW_STEPS = [
  {
    n: "01",
    t: "Create",
    d: "Upload real work, products, packaging, media, or branded experiences.",
  },
  {
    n: "02",
    t: "Prepare",
    d: "Add metadata, proof, story, category, and collectible context.",
  },
  {
    n: "03",
    t: "Mint",
    d: "Connect wallet, sign tx, and create verifiable ownership.",
  },
  {
    n: "04",
    t: "Trade / Deliver",
    d: "Move the asset into market activity, utility, or physical fulfillment.",
  },
] as const;

const WHO_IT_SERVES = [
  {
    title: "For creators",
    text: "Turn real work into NFTs, proof, identity, and collectible market value.",
  },
  {
    title: "For crypto brands",
    text: "Launch campaigns, branded products, community activations, and tokenized experiences.",
  },
  {
    title: "For collectors",
    text: "Own, trade, and receive real-world value through a premium Web3 interface.",
  },
  {
    title: "For real-world workers",
    text: "Tailors, cooks, designers, makers, builders, and other skilled people can enter Web3 through proof of real output.",
  },
] as const;

const CORE_MODULES = [
  {
    t: "Create NFT",
    d: "The core creator entry point for upload, metadata, mint, and ownership proof.",
    href: "/app/create",
  },
  {
    t: "Trading",
    d: "Move into listings, collectible market logic, resale movement, and future liquidity flows.",
    href: "/app/trading",
  },
  {
    t: "Profile",
    d: "Build creator identity, minted work, social proof, and stronger collectible presence.",
    href: "/app/profile",
  },
  {
    t: "Real Marketing",
    d: "Open the ecosystem layer for campaigns, crypto brand collaborations, storefronts, and phygital activations.",
    href: REAL_MARKETING_HREF,
  },
] as const;

function GoldEdgeCard({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "relative rounded-[40px] overflow-hidden p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.40),rgba(212,175,55,0.18),rgba(184,135,10,0.12))]",
        "shadow-[0_34px_140px_rgba(0,0,0,0.60)]",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "relative overflow-hidden rounded-[40px]",
          "border border-white/10",
          "bg-[#0b0a09]/40 backdrop-blur-2xl",
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

function LuxPill({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-full",
        "border border-white/10 bg-white/[0.06] backdrop-blur-2xl",
        "px-3 py-1.5 text-[11px] font-semibold text-white/70",
        "shadow-[0_12px_40px_rgba(0,0,0,0.25)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl shadow-[0_22px_80px_rgba(0,0,0,0.35)] transition hover:bg-white/[0.06]">
      <div className="text-xs font-semibold text-white/60">{title}</div>
      <div className="mt-2 text-2xl font-extrabold tracking-tight text-white">
        {value}
      </div>
      <div className="mt-2 text-xs text-white/60">{hint}</div>
    </div>
  );
}

function MiniCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4 md:p-5 shadow-[0_22px_80px_rgba(0,0,0,0.35)] transition hover:bg-white/[0.06]">
      <div className="text-[14px] font-extrabold tracking-tight text-white">
        {title}
      </div>
      <div className="mt-2 text-[13px] leading-6 text-white/60">{text}</div>
    </div>
  );
}

function PersonaSilhouette({
  variant,
  label,
  className = "",
}: {
  variant: "woman" | "man";
  label: string;
  className?: string;
}) {
  const id = React.useId().replace(/:/g, "");
  const isWoman = variant === "woman";

  return (
    <div
      className={[
        "relative flex flex-col items-center justify-end",
        "w-[170px] md:w-[210px] xl:w-[228px]",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute bottom-2 h-10 w-[110px] rounded-full bg-[#d4af37]/15 blur-2xl md:w-[136px]" />

      <div className="relative">
        <svg
          viewBox="0 0 220 360"
          className="h-[260px] w-[170px] md:h-[320px] md:w-[210px] xl:h-[344px] xl:w-[228px]"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={`${id}-backGlow`} cx="50%" cy="38%" r="65%">
              <stop offset="0%" stopColor="rgba(247,231,167,0.26)" />
              <stop offset="60%" stopColor="rgba(212,175,55,0.12)" />
              <stop offset="100%" stopColor="rgba(212,175,55,0)" />
            </radialGradient>

            <linearGradient
              id={`${id}-skin`}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor={isWoman ? "#f2d9c6" : "#edd2bf"} />
              <stop offset="58%" stopColor={isWoman ? "#c99677" : "#c18e71"} />
              <stop offset="100%" stopColor={isWoman ? "#865e49" : "#794f3c"} />
            </linearGradient>

            <linearGradient
              id={`${id}-hair`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor={isWoman ? "#3f332e" : "#393735"} />
              <stop offset="100%" stopColor="#0f0d0d" />
            </linearGradient>

            <linearGradient
              id={`${id}-body`}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              {isWoman ? (
                <>
                  <stop offset="0%" stopColor="rgba(243,240,233,0.96)" />
                  <stop offset="32%" stopColor="rgba(216,192,162,0.64)" />
                  <stop offset="58%" stopColor="rgba(36,33,30,0.94)" />
                  <stop offset="100%" stopColor="rgba(10,9,9,0.98)" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="rgba(188,185,181,0.34)" />
                  <stop offset="32%" stopColor="rgba(76,72,68,0.82)" />
                  <stop offset="62%" stopColor="rgba(25,23,22,0.96)" />
                  <stop offset="100%" stopColor="rgba(9,8,8,0.99)" />
                </>
              )}
            </linearGradient>

            <linearGradient
              id={`${id}-pants`}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor={isWoman ? "#2f2b29" : "#353230"} />
              <stop offset="100%" stopColor="#090808" />
            </linearGradient>

            <linearGradient
              id={`${id}-arm`}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor={isWoman ? "#ebe3d8" : "#bdb8b1"} />
              <stop offset="100%" stopColor="#1c1918" />
            </linearGradient>

            <radialGradient id={`${id}-orb`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff6d5" />
              <stop offset="45%" stopColor="#f7e7a7" />
              <stop offset="85%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="rgba(212,175,55,0)" />
            </radialGradient>

            <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>

          <circle cx="110" cy="170" r="104" fill={`url(#${id}-backGlow)`} />

          <ellipse
            cx={isWoman ? 96 : 124}
            cy={isWoman ? 78 : 82}
            rx={isWoman ? 36 : 31}
            ry={isWoman ? 40 : 34}
            fill={`url(#${id}-hair)`}
          />
          {isWoman && (
            <path
              d="M69 88c-7 34 10 57 34 63 28 7 48-11 55-38 6-23 3-48-14-63-9-8-21-13-35-13-26 0-35 24-40 51z"
              fill={`url(#${id}-hair)`}
            />
          )}

          <ellipse
            cx={isWoman ? 108 : 110}
            cy={isWoman ? 90 : 92}
            rx={isWoman ? 25 : 24}
            ry={isWoman ? 30 : 28}
            fill={`url(#${id}-skin)`}
          />

          <rect
            x="100"
            y="118"
            width="20"
            height="22"
            rx="8"
            fill={`url(#${id}-skin)`}
          />

          {isWoman ? (
            <>
              <path
                d="M70 158c8-20 26-33 41-33h0c17 0 35 13 43 33l13 37c4 12-5 24-18 24H71c-13 0-22-12-18-24l17-37z"
                fill={`url(#${id}-body)`}
              />
              <path
                d="M90 145c6 8 12 12 20 12 8 0 15-4 20-12v42H90v-42z"
                fill="rgba(255,255,255,0.20)"
              />
              <path
                d="M80 218h60l10 78c2 16-10 30-27 30h-6c-18 0-30-14-28-31l6-77h-15z"
                fill={`url(#${id}-pants)`}
              />
              <path
                d="M148 148c12 2 23 10 27 22l17 45c3 9-2 18-11 21l-11 4-25-71 3-21z"
                fill={`url(#${id}-arm)`}
              />
              <circle cx="188" cy="214" r="10" fill={`url(#${id}-orb)`} />
              <circle
                cx="188"
                cy="214"
                r="18"
                fill="rgba(247,231,167,0.25)"
                filter={`url(#${id}-soft)`}
              />
            </>
          ) : (
            <>
              <path
                d="M74 154c8-18 24-31 36-31h0c14 0 30 12 38 31l16 40c5 13-5 27-19 27H74c-14 0-24-14-19-27l19-40z"
                fill={`url(#${id}-body)`}
              />
              <path
                d="M92 145h36v45H92z"
                fill="rgba(255,255,255,0.06)"
              />
              <path
                d="M82 220h56l11 81c2 14-9 27-24 27h-9c-16 0-27-13-25-29l7-79h-16z"
                fill={`url(#${id}-pants)`}
              />
              <path
                d="M72 160c-12 1-23 9-29 21l-17 43c-4 10 1 19 10 22l12 4 29-72-5-18z"
                fill={`url(#${id}-arm)`}
              />
              <circle cx="33" cy="226" r="10" fill={`url(#${id}-orb)`} />
              <circle
                cx="33"
                cy="226"
                r="18"
                fill="rgba(247,231,167,0.25)"
                filter={`url(#${id}-soft)`}
              />
            </>
          )}

          <ellipse
            cx="110"
            cy="342"
            rx="46"
            ry="10"
            fill="rgba(0,0,0,0.42)"
          />
        </svg>
      </div>

      <div className="mt-[-8px] rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] font-semibold text-white/72 backdrop-blur-xl">
        {label}
      </div>
    </div>
  );
}

function DuoEcosystemScene() {
  return (
    <div className="relative mt-6 overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.34)] md:p-6 xl:p-7">
      <style jsx>{`
        @keyframes duoFloatA {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(-1deg);
          }
        }
        @keyframes duoFloatB {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-12px) rotate(1deg);
          }
        }
        @keyframes duoPulse {
          0%,
          100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.08);
          }
        }
        @keyframes duoBeam {
          0%,
          100% {
            opacity: 0.24;
            filter: brightness(1);
          }
          50% {
            opacity: 0.95;
            filter: brightness(1.28);
          }
        }
        @keyframes duoDrift {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(0, -8px, 0);
          }
        }
        @keyframes duoOrbit {
          0%,
          100% {
            transform: translateY(0px);
            opacity: 0.5;
          }
          50% {
            transform: translateY(-9px);
            opacity: 1;
          }
        }
        @keyframes duoRotate {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
        .duo-float-a {
          animation: duoFloatA 5.7s ease-in-out infinite;
        }
        .duo-float-b {
          animation: duoFloatB 6s ease-in-out infinite 0.28s;
        }
        .duo-pulse {
          animation: duoPulse 3.8s ease-in-out infinite;
        }
        .duo-beam {
          animation: duoBeam 4.6s ease-in-out infinite;
        }
        .duo-drift {
          animation: duoDrift 6.2s ease-in-out infinite;
        }
        .duo-orbit {
          animation: duoOrbit 4.3s ease-in-out infinite;
        }
        .duo-rotate {
          animation: duoRotate 18s linear infinite;
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-56px] top-[-56px] h-[220px] w-[220px] rounded-full bg-[#d4af37]/[0.13] blur-[95px]" />
        <div className="absolute right-[-36px] bottom-[-60px] h-[220px] w-[220px] rounded-full bg-[#f7e7a7]/[0.08] blur-[100px]" />
        <div className="absolute inset-x-0 bottom-0 h-[130px] bg-[linear-gradient(180deg,transparent,rgba(212,175,55,0.11))]" />
        <div className="absolute inset-x-[10%] bottom-[18px] h-[110px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.12),transparent_68%)] blur-[34px]" />
      </div>

      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">
            Human layer
          </p>
          <p className="mt-1 text-sm font-extrabold text-white">
            Real people entering a premium on-chain ecosystem
          </p>
        </div>

        <LuxPill className="bg-black/25">
          Motion feel • interface presence
        </LuxPill>
      </div>

      <div className="relative mt-5 min-h-[320px] md:min-h-[380px] xl:min-h-[410px]">
        <div className="duo-orbit absolute left-[10%] top-[74px] z-10 h-3 w-3 rounded-full bg-[#f7e7a7]/80 shadow-[0_0_20px_rgba(247,231,167,0.7)]" />
        <div
          className="duo-orbit absolute right-[10%] top-[94px] z-10 h-2.5 w-2.5 rounded-full bg-[#d4af37]/80 shadow-[0_0_18px_rgba(212,175,55,0.7)]"
          style={{ animationDelay: "0.65s" }}
        />
        <div
          className="duo-orbit absolute left-[26%] top-[178px] z-10 h-2 w-2 rounded-full bg-white/75 shadow-[0_0_14px_rgba(255,255,255,0.35)]"
          style={{ animationDelay: "1.1s" }}
        />
        <div
          className="duo-orbit absolute right-[28%] top-[188px] z-10 h-2 w-2 rounded-full bg-white/75 shadow-[0_0_14px_rgba(255,255,255,0.35)]"
          style={{ animationDelay: "0.9s" }}
        />

        <div className="duo-drift absolute left-1/2 top-[18px] z-20 w-[230px] -translate-x-1/2 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.025))] p-4 backdrop-blur-2xl shadow-[0_32px_88px_rgba(0,0,0,0.36)] md:w-[270px] xl:w-[294px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">
                Live ecosystem
              </p>
              <p className="mt-1 text-sm font-extrabold text-white">
                Mint ↔ Market ↔ Delivery
              </p>
            </div>
            <div className="duo-pulse mt-1 h-2.5 w-2.5 rounded-full bg-[#f7e7a7] shadow-[0_0_0_8px_rgba(247,231,167,0.12)]" />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] font-semibold text-white/75">
              Create
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] font-semibold text-white/75">
              Mint
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] font-semibold text-white/75">
              Trade
            </div>
          </div>

          <div className="mt-4 relative h-[88px] overflow-hidden rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_50%_15%,rgba(247,231,167,0.16),transparent_56%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]">
            <div className="duo-rotate absolute left-1/2 top-1/2 h-[64px] w-[64px] rounded-full border border-[#f7e7a7]/25" />
            <div
              className="duo-rotate absolute left-1/2 top-1/2 h-[44px] w-[44px] rounded-full border border-[#d4af37]/35"
              style={{ animationDuration: "12s" }}
            />
            <div className="duo-pulse absolute left-1/2 top-1/2 h-[16px] w-[16px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f7e7a7]/70 shadow-[0_0_18px_rgba(247,231,167,0.5)]" />
            <div className="absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-[linear-gradient(90deg,transparent,rgba(247,231,167,0.44),transparent)]" />
          </div>
        </div>

        <div className="duo-beam absolute left-[100px] top-[188px] z-10 hidden h-px w-[170px] rotate-[12deg] bg-[linear-gradient(90deg,rgba(212,175,55,0.02),rgba(247,231,167,0.72),rgba(212,175,55,0.02))] md:block xl:left-[118px] xl:w-[190px]" />
        <div className="duo-beam absolute right-[100px] top-[188px] z-10 hidden h-px w-[170px] -rotate-[12deg] bg-[linear-gradient(90deg,rgba(212,175,55,0.02),rgba(247,231,167,0.72),rgba(212,175,55,0.02))] md:block xl:right-[118px] xl:w-[190px]" />

        <div className="absolute inset-x-0 bottom-[64px] z-[1] h-px bg-[linear-gradient(90deg,transparent,rgba(247,231,167,0.22),transparent)]" />

        <div className="absolute bottom-0 left-[-6px] z-20 md:left-[4px]">
          <PersonaSilhouette
            variant="woman"
            label="Mint intent"
            className="duo-float-a"
          />
        </div>

        <div className="absolute bottom-0 right-[-6px] z-20 md:right-[4px]">
          <PersonaSilhouette
            variant="man"
            label="Market flow"
            className="duo-float-b"
          />
        </div>
      </div>
    </div>
  );
}

export default function AppPage() {
  return (
    <div className="relative isolate">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-140px] top-[80px] h-[360px] w-[360px] rounded-full bg-[#d4af37]/[0.10] blur-[120px]" />
        <div className="absolute right-[-160px] top-[240px] h-[460px] w-[460px] rounded-full bg-[#b8870a]/[0.10] blur-[145px]" />
        <div className="absolute left-[22%] top-[760px] h-[430px] w-[430px] rounded-full bg-[#f7e7a7]/[0.05] blur-[155px]" />
        <div className="absolute right-[8%] top-[1180px] h-[340px] w-[340px] rounded-full bg-[#d4af37]/[0.06] blur-[130px]" />

        <div className="absolute inset-x-0 top-[220px] h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.18),transparent)]" />
        <div className="absolute inset-x-0 top-[760px] h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.12),transparent)]" />
        <div className="absolute inset-x-0 top-[1320px] h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.10),transparent)]" />
      </div>

      <div className="space-y-6">
        <Reveal>
          <GoldEdgeCard className="rounded-[46px]">
            <div className="p-8 md:p-14">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <LuxPill>
                  <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
                  Tokenized real-world assets • App live
                </LuxPill>

                <div className="flex items-center gap-2">
                  <Link
                    href="/app/create"
                    className={[
                      "rounded-2xl px-4 py-2 text-sm font-extrabold text-black",
                      "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
                      "shadow-[0_18px_60px_rgba(212,175,55,0.16)] ring-1 ring-black/15",
                      "transition hover:-translate-y-[1px] hover:brightness-110 active:translate-y-0",
                    ].join(" ")}
                  >
                    Mint NFT
                  </Link>

                  <Link
                    href="/app/faucet"
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold transition hover:-translate-y-[1px] hover:bg-white/[0.07] active:translate-y-0"
                  >
                    Get test ETH
                  </Link>
                </div>
              </div>

              <h1 className="mt-7 text-4xl font-black leading-[1.03] tracking-[-0.03em] md:text-6xl">
                Realife — the premium app layer for
                <br />
                <span className="bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] bg-clip-text text-transparent">
                  real-world NFT assets
                </span>
              </h1>

              <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/65 md:text-base">
                This is where real-world work, products, packaging, branded
                experiences, and creator output become structured, minted,
                tradable, and ready for delivery-aware ownership. Built for
                creators, crypto brands, collectors, and real-world skill
                economies.
              </p>

              <div className="mt-10 grid gap-4 md:grid-cols-3">
                <StatCard
                  title="Core Loop"
                  value="Create → Mint"
                  hint="Turn real value into on-chain ownership"
                />
                <StatCard
                  title="Market Layer"
                  value="Trade → Deliver"
                  hint="Move from collectible asset to real-world utility"
                />
                <StatCard
                  title="Positioning"
                  value="Phygital-ready NFTs"
                  hint="Tokenized real-world assets for Web3"
                />
              </div>

              <div className="mt-10 overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,rgba(247,231,167,0.30),rgba(212,175,55,0.14),rgba(184,135,10,0.10))] p-px">
                <div className="flex flex-col gap-4 rounded-[34px] border border-white/10 bg-[#0b0a09]/50 p-6 backdrop-blur-2xl md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-extrabold text-white">
                      Create → Mint → Trade → Deliver
                    </p>
                    <p className="mt-1 text-xs text-white/60">
                      Tokenized real-world assets for creators, crypto brands,
                      collectors, and delivery-aware ownership.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/app/create"
                      className={[
                        "inline-flex items-center justify-center rounded-2xl px-7 py-3",
                        "font-extrabold text-black",
                        "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
                        "shadow-[0_18px_60px_rgba(212,175,55,0.16)] ring-1 ring-black/15",
                        "transition hover:-translate-y-[1px] hover:brightness-110 active:translate-y-0",
                      ].join(" ")}
                    >
                      Start minting
                    </Link>

                    <Link
                      href={REAL_MARKETING_HREF}
                      className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-7 py-3 font-extrabold transition hover:bg-white/[0.07]"
                    >
                      Enter Real Marketing
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </GoldEdgeCard>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-12 lg:items-start xl:gap-7">
          <div className="lg:col-span-8">
            <Reveal className="w-full" delayMs={90}>
              <GoldEdgeCard className="w-full">
                <div className="p-8 md:p-10">
                  <p className="text-xs font-semibold text-white/60">
                    How it works
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
                    A creator-first path into on-chain ownership
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">
                    Realife keeps the experience understandable for normal
                    people while preserving the core Web3 logic: wallet,
                    metadata, mint, collectible ownership, market movement, and
                    physical delivery when the tokenized asset maps to something
                    real.
                  </p>

                  <div className="mt-8 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                    {HOW_STEPS.map((s) => (
                      <div
                        key={s.n}
                        className="flex flex-col rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_22px_80px_rgba(0,0,0,0.35)] transition hover:bg-white/[0.06]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-xs font-extrabold text-black shadow-[0_16px_50px_rgba(212,175,55,0.16)]">
                            {s.n}
                          </div>
                          <p className="text-sm font-extrabold">{s.t}</p>
                        </div>
                        <p className="mt-3 flex-1 text-xs leading-relaxed text-white/60">
                          {s.d}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-8">
                    <div className="overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,rgba(247,231,167,0.26),rgba(212,175,55,0.12),rgba(184,135,10,0.08))] p-px">
                      <div className="rounded-[30px] border border-white/10 bg-[#0b0a09]/55 p-5 backdrop-blur-2xl">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                          <div className="max-w-2xl">
                            <p className="text-sm font-extrabold text-white">
                              Not only a collectible flow
                            </p>
                            <p className="mt-2 text-xs leading-relaxed text-white/65">
                              Realife can keep an NFT purely digital or connect
                              it to real-world fulfillment — products,
                              packaging, creator-made objects, branded drops,
                              and delivery-aware tokenized ownership.
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <LuxPill className="bg-black/25">
                              Proof of real work
                            </LuxPill>
                            <LuxPill className="bg-black/25">
                              Market-ready ownership
                            </LuxPill>
                            <LuxPill className="bg-black/25">
                              Delivery-aware NFTs
                            </LuxPill>
                          </div>
                        </div>
                      </div>
                    </div>

                    <DuoEcosystemScene />

                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        href="/app/create"
                        className={[
                          "inline-flex items-center justify-center rounded-2xl px-6 py-3",
                          "font-extrabold text-black",
                          "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
                          "shadow-[0_18px_60px_rgba(212,175,55,0.16)] ring-1 ring-black/15",
                          "transition hover:-translate-y-[1px] hover:brightness-110 active:translate-y-0",
                        ].join(" ")}
                      >
                        Go to mint
                      </Link>

                      <Link
                        href="/app/trading"
                        className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 font-extrabold transition hover:-translate-y-[1px] hover:bg-white/[0.07] active:translate-y-0"
                      >
                        Open market
                      </Link>
                    </div>
                  </div>
                </div>
              </GoldEdgeCard>
            </Reveal>
          </div>

          <div className="lg:col-span-4">
            <Reveal className="w-full" delayMs={150}>
              <GoldEdgeCard className="w-full">
                <div className="flex flex-col p-8 md:p-10">
                  <div>
                    <p className="text-xs font-semibold text-white/60">
                      Who it serves
                    </p>
                    <h3 className="mt-2 text-2xl font-black tracking-tight">
                      Creators, crypto brands, collectors — and real-world
                      workers
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/65">
                      Realife is not just a mint page. It is the working surface
                      of a larger ecosystem connecting digital ownership with
                      real production, campaigns, commerce, and delivery.
                    </p>

                    <div className="mt-6 space-y-3">
                      {WHO_IT_SERVES.map((item) => (
                        <MiniCard
                          key={item.title}
                          title={item.title}
                          text={item.text}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto pt-6 text-[11px] leading-relaxed text-white/45">
                    Base • IPFS • creator economy • delivery-aware NFTs • social
                    onboarding into Web3
                  </div>
                </div>
              </GoldEdgeCard>
            </Reveal>
          </div>
        </div>

        <Reveal className="mt-6">
          <GoldEdgeCard>
            <div className="p-8 md:p-10">
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div>
                  <p className="text-xs font-semibold text-white/60">
                    Core modules
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
                    Move through the ecosystem with clarity
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">
                    Each module has a clear role: mint, present, trade, connect
                    with brands, and build stronger creator identity with
                    real-world utility.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {CORE_MODULES.map((x) => (
                  <div
                    key={x.t}
                    className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_22px_80px_rgba(0,0,0,0.35)] transition hover:bg-white/[0.06]"
                  >
                    <div className="text-lg font-black tracking-tight">
                      {x.t}
                    </div>
                    <div className="mt-2 text-sm leading-relaxed text-white/65">
                      {x.d}
                    </div>
                    <Link
                      href={x.href}
                      className="mt-5 inline-flex rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/[0.08]"
                    >
                      Open →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </GoldEdgeCard>
        </Reveal>

        <Reveal className="mt-6">
          <GoldEdgeCard>
            <div className="p-8 md:p-10">
              <p className="text-xs font-semibold text-white/60">
                Inside the ecosystem
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
                Beyond minting: real-world verticals inside Realife
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/65">
                Realife expands beyond creator minting into branded campaigns,
                storefront experiences, tokenized product stories, and
                delivery-ready NFT ownership connected to the real world.
              </p>

              <div className="mt-8 grid gap-4 lg:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_22px_80px_rgba(0,0,0,0.35)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                    Brand collaboration layer
                  </p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight">
                    Real Marketing
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/65">
                    The ecosystem hub for creator campaigns, crypto brand
                    collaborations, Crypto Cafe, Realife Store, and phygital
                    drops.
                  </p>

                  <div className="mt-5 grid gap-3">
                    {[
                      "Campaigns and branded experiences",
                      "Collectible product storytelling",
                      "Delivery-ready NFT activations",
                    ].map((x) => (
                      <div
                        key={x}
                        className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/76"
                      >
                        {x}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <Link
                      href={REAL_MARKETING_HREF}
                      className={[
                        "inline-flex w-full items-center justify-center rounded-2xl px-6 py-3",
                        "font-extrabold text-black",
                        "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
                        "shadow-[0_18px_60px_rgba(212,175,55,0.16)] ring-1 ring-black/15",
                        "transition hover:-translate-y-[1px] hover:brightness-110 active:translate-y-0",
                      ].join(" ")}
                    >
                      Enter Real Marketing
                    </Link>
                  </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
                  <div className="relative aspect-[4/5] w-full">
                    <Image
                      src="/brand/realife-crypto-cafe.jpg"
                      alt="Realife Crypto Cafe"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.62),rgba(0,0,0,0.08))]" />
                    <div className="absolute left-4 top-4">
                      <LuxPill className="bg-black/35">Crypto Cafe</LuxPill>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <div className="text-xl font-black tracking-tight">
                        Realife Crypto Cafe
                      </div>
                      <div className="mt-2 text-sm leading-relaxed text-white/70">
                        A premium storefront concept for branded goods,
                        collectible atmosphere, and phygital experiences.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
                  <div className="relative aspect-[4/5] w-full">
                    <Image
                      src="/brand/realife-store.jpg"
                      alt="Realife Store"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.62),rgba(0,0,0,0.08))]" />
                    <div className="absolute left-4 top-4">
                      <LuxPill className="bg-black/35">Realife Store</LuxPill>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <div className="text-xl font-black tracking-tight">
                        Tokenized product stories
                      </div>
                      <div className="mt-2 text-sm leading-relaxed text-white/70">
                        Real-world products, branded packaging, and collectible
                        ownership experiences inside the ecosystem.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GoldEdgeCard>
        </Reveal>

        <Reveal className="mt-6">
          <GoldEdgeCard>
            <div className="p-8 md:p-12">
              <div className="grid items-center gap-6 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <p className="text-xs font-semibold text-white/60">Vision</p>
                  <h2 className="mt-2 text-3xl font-black leading-[1.05] tracking-tight md:text-4xl">
                    We are building a Web3 surface where{" "}
                    <span className="bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] bg-clip-text text-transparent">
                      real people, real products, and real work
                    </span>{" "}
                    become on-chain value.
                  </h2>
                  <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/65 md:text-base">
                    Realife is designed to feel premium for investors and simple
                    for users: clean flow, strong storytelling, real-world
                    relevance, creator participation, and crypto-native
                    ownership with room for physical delivery.
                  </p>
                </div>

                <div className="lg:col-span-4">
                  <div className="flex flex-col gap-3">
                    <Link
                      href="/app/create"
                      className={[
                        "inline-flex w-full items-center justify-center rounded-2xl px-6 py-3",
                        "font-extrabold text-black",
                        "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
                        "shadow-[0_18px_60px_rgba(212,175,55,0.16)] ring-1 ring-black/15",
                        "transition hover:-translate-y-[1px] hover:brightness-110 active:translate-y-0",
                      ].join(" ")}
                    >
                      Mint now
                    </Link>

                    <Link
                      href={REAL_MARKETING_HREF}
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 font-extrabold transition hover:bg-white/[0.07]"
                    >
                      Explore Real Marketing
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </GoldEdgeCard>
        </Reveal>

        <div className="mt-6 px-2 text-xs text-white/45">
          Realife premium UI • on-chain mint • IPFS metadata • tokenized
          real-world assets • delivery-aware ownership
        </div>
      </div>
    </div>
  );
}