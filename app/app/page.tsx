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
    d: "Create a product, service, delivery offer, branded item, local work, or digital service listing.",
  },
  {
    n: "02",
    t: "Tokenize",
    d: "Turn real-world value into an NFT-linked transaction right with metadata, proof, media, and category data.",
  },
  {
    n: "03",
    t: "Trade",
    d: "List, buy, sell, or transfer real-world value through the Realife marketplace.",
  },
  {
    n: "04",
    t: "Complete",
    d: "Use protected flows for delivery, service completion, buyer confirmation, escrow release, or refund paths.",
  },
] as const;

const WHO_IT_SERVES = [
  {
    title: "For creators",
    text: "Turn real work, creative output, media, products, or branded experiences into NFT-linked value.",
  },
  {
    title: "For workers and service providers",
    text: "Offer digital services, online sessions, local services, or real-world work through Web3 commerce flows.",
  },
  {
    title: "For businesses and brands",
    text: "Launch product-based experiences, campaigns, storefronts, branded drops, and tokenized commerce activations.",
  },
  {
    title: "For Web2 and crypto users",
    text: "Access real-world products and services through crypto payments, marketplace activity, and escrow-protected settlement.",
  },
] as const;

const CORE_MODULES = [
  {
    t: "Create Listing",
    d: "The creator and seller entry point for upload, AI assistance, metadata, minting, and NFT-linked transaction rights.",
    href: "/app/create",
  },
  {
    t: "Marketplace",
    d: "Move products, services, and real-world value through listings, trading, ownership, and protected commerce flows.",
    href: "/app/trading",
  },
  {
    t: "Profile",
    d: "Build identity, minted work, listings, ownership history, reputation, and stronger Web3 presence.",
    href: "/app/profile",
  },
  {
    t: "Real Marketing",
    d: "Open the ecosystem layer for campaigns, crypto brand collaborations, storefronts, product stories, and real-world activations.",
    href: REAL_MARKETING_HREF,
  },
] as const;

// ─── Design tokens ────────────────────────────────────────────────────────────
// Radius:  rounded-2xl (buttons/pills) · rounded-[28px] (cards) · rounded-[40px] (GoldEdgeCard)
// Opacity: /40 (labels/meta) · /60 (body text) · /75 (UI text)
// Weight:  font-black (h1/h2/h3) · font-bold (card titles) · font-extrabold (CTA buttons only)

// ─── GoldEdgeCard ─────────────────────────────────────────────────────────────
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
          "relative h-full overflow-hidden rounded-[40px]",
          "border border-white/10",
          "bg-[#0b0a09]/40 backdrop-blur-2xl",
          "ring-1 ring-black/10",
          "before:pointer-events-none before:absolute before:inset-0",
          "before:bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.12),transparent_45%)]",
          "after:pointer-events-none after:absolute after:inset-0",
          "after:bg-[radial-gradient(circle_at_85%_115%,rgba(255,255,255,0.06),transparent_55%)]",
        ].join(" ")}
      >
        <div className="relative z-10 h-full">{children}</div>
      </div>
    </div>
  );
}

// ─── LuxPill ──────────────────────────────────────────────────────────────────
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
        "px-3 py-1.5 text-[11px] font-semibold text-white/60",
        "shadow-[0_12px_40px_rgba(0,0,0,0.25)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
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
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl shadow-[0_22px_80px_rgba(0,0,0,0.35)] transition hover:bg-white/[0.06]">
      <div className="text-xs font-semibold text-white/40">{title}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-white">
        {value}
      </div>
      <div className="mt-2 text-xs text-white/60">{hint}</div>
    </div>
  );
}

// ─── MiniCard ─────────────────────────────────────────────────────────────────
function MiniCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.05] px-5 py-[18px] shadow-[0_22px_80px_rgba(0,0,0,0.35)] transition hover:bg-white/[0.07] md:px-6 md:py-5">
      <div className="text-[15px] font-bold tracking-tight text-white md:text-[16px]">
        {title}
      </div>
      <div className="mt-2.5 text-[13px] leading-[1.66] text-white/60 md:text-[14px]">
        {text}
      </div>
    </div>
  );
}

// ─── PersonaSilhouette ────────────────────────────────────────────────────────
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
        "w-[128px] md:w-[150px] xl:w-[164px]",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute bottom-2 h-8 w-[82px] rounded-full bg-[#d4af37]/12 blur-2xl md:w-[98px]" />

      <div className="relative">
        <svg
          viewBox="0 0 220 360"
          className="h-[198px] w-[128px] md:h-[228px] md:w-[150px] xl:h-[246px] xl:w-[164px]"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={`${id}-backGlow`} cx="50%" cy="38%" r="65%">
              <stop offset="0%" stopColor="rgba(247,231,167,0.20)" />
              <stop offset="60%" stopColor="rgba(212,175,55,0.09)" />
              <stop offset="100%" stopColor="rgba(212,175,55,0)" />
            </radialGradient>
            <linearGradient id={`${id}-skin`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isWoman ? "#f2d9c6" : "#edd2bf"} />
              <stop offset="58%" stopColor={isWoman ? "#c99677" : "#c18e71"} />
              <stop offset="100%" stopColor={isWoman ? "#865e49" : "#794f3c"} />
            </linearGradient>
            <linearGradient id={`${id}-hair`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isWoman ? "#3f332e" : "#393735"} />
              <stop offset="100%" stopColor="#0f0d0d" />
            </linearGradient>
            <linearGradient id={`${id}-body`} x1="0%" y1="0%" x2="0%" y2="100%">
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
            <linearGradient id={`${id}-pants`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isWoman ? "#2f2b29" : "#353230"} />
              <stop offset="100%" stopColor="#090808" />
            </linearGradient>
            <linearGradient id={`${id}-arm`} x1="0%" y1="0%" x2="0%" y2="100%">
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

          <ellipse cx={isWoman ? 96 : 124} cy={isWoman ? 78 : 82} rx={isWoman ? 36 : 31} ry={isWoman ? 40 : 34} fill={`url(#${id}-hair)`} />
          {isWoman && (
            <path d="M69 88c-7 34 10 57 34 63 28 7 48-11 55-38 6-23 3-48-14-63-9-8-21-13-35-13-26 0-35 24-40 51z" fill={`url(#${id}-hair)`} />
          )}

          <ellipse cx={isWoman ? 108 : 110} cy={isWoman ? 90 : 92} rx={isWoman ? 25 : 24} ry={isWoman ? 30 : 28} fill={`url(#${id}-skin)`} />
          <rect x="100" y="118" width="20" height="22" rx="8" fill={`url(#${id}-skin)`} />

          {isWoman ? (
            <>
              <path d="M70 158c8-20 26-33 41-33h0c17 0 35 13 43 33l13 37c4 12-5 24-18 24H71c-13 0-22-12-18-24l17-37z" fill={`url(#${id}-body)`} />
              <path d="M90 145c6 8 12 12 20 12 8 0 15-4 20-12v42H90v-42z" fill="rgba(255,255,255,0.20)" />
              <path d="M80 218h60l10 78c2 16-10 30-27 30h-6c-18 0-30-14-28-31l6-77h-15z" fill={`url(#${id}-pants)`} />
              <path d="M148 148c12 2 23 10 27 22l17 45c3 9-2 18-11 21l-11 4-25-71 3-21z" fill={`url(#${id}-arm)`} />
              <circle cx="188" cy="214" r="10" fill={`url(#${id}-orb)`} />
              <circle cx="188" cy="214" r="18" fill="rgba(247,231,167,0.20)" filter={`url(#${id}-soft)`} />
            </>
          ) : (
            <>
              <path d="M74 154c8-18 24-31 36-31h0c14 0 30 12 38 31l16 40c5 13-5 27-19 27H74c-14 0-24-14-19-27l19-40z" fill={`url(#${id}-body)`} />
              <path d="M92 145h36v45H92z" fill="rgba(255,255,255,0.06)" />
              <path d="M82 220h56l11 81c2 14-9 27-24 27h-9c-16 0-27-13-25-29l7-79h-16z" fill={`url(#${id}-pants)`} />
              <path d="M72 160c-12 1-23 9-29 21l-17 43c-4 10 1 19 10 22l12 4 29-72-5-18z" fill={`url(#${id}-arm)`} />
              <circle cx="33" cy="226" r="10" fill={`url(#${id}-orb)`} />
              <circle cx="33" cy="226" r="18" fill="rgba(247,231,167,0.20)" filter={`url(#${id}-soft)`} />
            </>
          )}

          <ellipse cx="110" cy="342" rx="46" ry="10" fill="rgba(0,0,0,0.42)" />
        </svg>
      </div>

      <div className="mt-[-6px] rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[9px] font-semibold text-white/60 backdrop-blur-xl">
        {label}
      </div>
    </div>
  );
}

// ─── DuoEcosystemScene ────────────────────────────────────────────────────────
// Animations live in globals.css (.duo-float-a, .duo-beam, etc.)
function DuoEcosystemScene() {
  return (
    <div className="relative mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012))] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.30)] md:p-5">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-46px] top-[-46px] h-[170px] w-[170px] rounded-full bg-[#d4af37]/[0.10] blur-[80px]" />
        <div className="absolute right-[-24px] bottom-[-42px] h-[170px] w-[170px] rounded-full bg-[#f7e7a7]/[0.06] blur-[84px]" />
        <div className="absolute inset-x-0 bottom-0 h-[90px] bg-[linear-gradient(180deg,transparent,rgba(212,175,55,0.08))]" />
        <div className="absolute inset-x-[12%] bottom-[12px] h-[74px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.08),transparent_68%)] blur-[28px]" />
      </div>

      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.20em] text-white/40">
            Human layer
          </p>
          <p className="mt-1 text-[13px] font-bold text-white">
            Real people entering on-chain commerce
          </p>
        </div>
        <LuxPill className="bg-black/20 px-2.5 py-1 text-[10px]">
          App flow
        </LuxPill>
      </div>

      <div className="relative mt-4 min-h-[220px] md:min-h-[250px] xl:min-h-[270px]">
        <div className="duo-orbit absolute left-[13%] top-[58px] z-10 h-2.5 w-2.5 rounded-full bg-[#f7e7a7]/75 shadow-[0_0_16px_rgba(247,231,167,0.65)]" />
        <div className="duo-orbit absolute right-[13%] top-[70px] z-10 h-2 w-2 rounded-full bg-[#d4af37]/75 shadow-[0_0_14px_rgba(212,175,55,0.65)]" style={{ animationDelay: "0.65s" }} />
        <div className="duo-orbit absolute left-[29%] top-[136px] z-10 h-1.5 w-1.5 rounded-full bg-white/70 shadow-[0_0_10px_rgba(255,255,255,0.35)]" style={{ animationDelay: "1.1s" }} />
        <div className="duo-orbit absolute right-[30%] top-[142px] z-10 h-1.5 w-1.5 rounded-full bg-white/70 shadow-[0_0_10px_rgba(255,255,255,0.35)]" style={{ animationDelay: "0.9s" }} />

        <div className="duo-drift absolute left-1/2 top-[10px] z-20 w-[188px] -translate-x-1/2 rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] p-3.5 shadow-[0_24px_72px_rgba(0,0,0,0.32)] backdrop-blur-2xl md:w-[214px] xl:w-[230px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/40">
                Live ecosystem
              </p>
              <p className="mt-1 text-[12px] font-bold text-white md:text-[13px]">
                Tokenize ↔ Market ↔ Escrow
              </p>
            </div>
            <div className="duo-pulse mt-1 h-2 w-2 rounded-full bg-[#f7e7a7] shadow-[0_0_0_6px_rgba(247,231,167,0.10)]" />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {["Create", "Trade", "Settle"].map((label) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-black/25 px-2.5 py-1.5 text-[10px] font-semibold text-white/75">
                {label}
              </div>
            ))}
          </div>

          <div className="relative mt-3 h-[58px] overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_50%_15%,rgba(247,231,167,0.13),transparent_56%),linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.01))]">
            <div className="duo-rotate absolute left-1/2 top-1/2 h-[42px] w-[42px] rounded-full border border-[#f7e7a7]/22" />
            <div className="duo-rotate absolute left-1/2 top-1/2 h-[28px] w-[28px] rounded-full border border-[#d4af37]/28" style={{ animationDuration: "12s" }} />
            <div className="duo-pulse absolute left-1/2 top-1/2 h-[10px] w-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f7e7a7]/70 shadow-[0_0_14px_rgba(247,231,167,0.45)]" />
            <div className="absolute inset-x-5 top-1/2 h-px -translate-y-1/2 bg-[linear-gradient(90deg,transparent,rgba(247,231,167,0.32),transparent)]" />
          </div>
        </div>

        <div className="duo-beam absolute left-[82px] top-[130px] z-10 hidden h-px w-[98px] rotate-[11deg] bg-[linear-gradient(90deg,rgba(212,175,55,0.02),rgba(247,231,167,0.58),rgba(212,175,55,0.02))] md:block" />
        <div className="duo-beam absolute right-[82px] top-[130px] z-10 hidden h-px w-[98px] -rotate-[11deg] bg-[linear-gradient(90deg,rgba(212,175,55,0.02),rgba(247,231,167,0.58),rgba(212,175,55,0.02))] md:block" />
        <div className="absolute inset-x-0 bottom-[44px] z-[1] h-px bg-[linear-gradient(90deg,transparent,rgba(247,231,167,0.16),transparent)]" />

        <div className="absolute bottom-0 left-0 z-20">
          <PersonaSilhouette variant="woman" label="Create" className="duo-float-a" />
        </div>
        <div className="absolute bottom-0 right-0 z-20">
          <PersonaSilhouette variant="man" label="Market" className="duo-float-b" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AppPage() {
  return (
    <div className="relative isolate">
      {/* Ambient background */}
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
        {/* ── Hero ──────────────────────────────────────────────── */}
        <Reveal>
          <GoldEdgeCard>
            <div className="p-8 md:p-14">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <LuxPill>
                  <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
                  Stablecoin escrow commerce • App live
                </LuxPill>

                <div className="flex items-center gap-2">
                  <Link
                    href="/app/create"
                    className="rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-4 py-2 text-sm font-extrabold text-black shadow-[0_18px_60px_rgba(212,175,55,0.16)] ring-1 ring-black/15 transition hover:-translate-y-px hover:brightness-110 active:translate-y-0"
                  >
                    Create listing
                  </Link>
                  <Link
                    href="/app/faucet"
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold transition hover:-translate-y-px hover:bg-white/[0.07] active:translate-y-0"
                  >
                    Get test ETH
                  </Link>
                </div>
              </div>

              <h1 className="mt-7 text-4xl font-black leading-[1.03] tracking-[-0.03em] md:text-6xl">
                Realife — the app layer for
                <br />
                <span className="bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] bg-clip-text text-transparent">
                  real-world crypto commerce
                </span>
              </h1>

              <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/60 md:text-base">
                Realife connects crypto payments, NFT-linked transaction rights,
                marketplace activity, AI-assisted listing tools, and escrow-protected
                fulfillment for real-world products, services, and delivery.
              </p>

              <p className="mt-4 max-w-3xl text-xs leading-relaxed text-white/45 md:text-sm">
                Designed for stablecoin-powered commerce. The current Base Sepolia
                testnet uses test ETH for simplified testing while the platform
                architecture is built around real-world settlement and protected flows.
              </p>

              <div className="mt-10 grid gap-4 md:grid-cols-3">
                <StatCard
                  title="Commerce Layer"
                  value="Products + Services"
                  hint="Real-world value connected to crypto payments"
                />
                <StatCard
                  title="Trust Layer"
                  value="Escrow Logic"
                  hint="Protected completion, delivery, refund, and release flows"
                />
                <StatCard
                  title="NFT Role"
                  value="Transaction Rights"
                  hint="NFTs can represent proof, access, ownership, and claims"
                />
              </div>

              <div className="mt-10 overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,rgba(247,231,167,0.30),rgba(212,175,55,0.14),rgba(184,135,10,0.10))] p-px">
                <div className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-[#0b0a09]/50 p-6 backdrop-blur-2xl md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">
                      Create → Tokenize → Trade → Settle
                    </p>
                    <p className="mt-1 text-xs text-white/60">
                      Real-world products and services become NFT-linked transaction
                      rights with marketplace utility and escrow-backed fulfillment.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/app/create"
                      className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-7 py-3 font-extrabold text-black shadow-[0_18px_60px_rgba(212,175,55,0.16)] ring-1 ring-black/15 transition hover:-translate-y-px hover:brightness-110 active:translate-y-0"
                    >
                      Create listing
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

        {/* ── How it works + Who it serves ──────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch xl:gap-7">
          <div className="lg:col-span-8">
            <Reveal className="h-full w-full" delayMs={90}>
              <GoldEdgeCard className="h-full w-full">
                <div className="h-full p-8 md:p-10">
                  <p className="text-xs font-semibold text-white/40">How it works</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
                    A practical path from real-world value to on-chain commerce
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
                    Realife keeps the experience understandable for normal people
                    while preserving the core Web3 logic: wallet connection,
                    metadata, NFT-linked rights, marketplace movement, and protected
                    completion when the listing maps to a real product or service.
                  </p>

                  <div className="mt-8 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                    {HOW_STEPS.map((s) => (
                      <div
                        key={s.n}
                        className="flex min-h-[160px] flex-col rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_22px_80px_rgba(0,0,0,0.35)] transition hover:bg-white/[0.065] md:min-h-[176px] md:p-6"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-[11px] font-extrabold text-black shadow-[0_16px_50px_rgba(212,175,55,0.16)]">
                            {s.n}
                          </div>
                          <p className="text-[15px] font-bold leading-tight text-white md:text-[16px]">
                            {s.t}
                          </p>
                        </div>
                        <p className="mt-4 flex-1 text-[12.5px] leading-[1.65] text-white/60 md:text-[13px]">
                          {s.d}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-9">
                    <div className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,rgba(247,231,167,0.26),rgba(212,175,55,0.12),rgba(184,135,10,0.08))] p-px">
                      <div className="rounded-[28px] border border-white/10 bg-[#0b0a09]/55 p-5 backdrop-blur-2xl">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                          <div className="max-w-2xl">
                            <p className="text-sm font-bold text-white">
                              Not just NFT collectibles
                            </p>
                            <p className="mt-2 text-xs leading-relaxed text-white/60">
                              Realife uses NFTs as transaction rights and proof
                              objects for real-world commerce — products, services,
                              digital work, local work, branded drops, and delivery-aware
                              settlement.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <LuxPill className="bg-black/25">NFT-linked rights</LuxPill>
                            <LuxPill className="bg-black/25">Escrow commerce</LuxPill>
                            <LuxPill className="bg-black/25">Real-world utility</LuxPill>
                          </div>
                        </div>
                      </div>
                    </div>

                    <DuoEcosystemScene />

                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        href="/app/create"
                        className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-6 py-3 font-extrabold text-black shadow-[0_18px_60px_rgba(212,175,55,0.16)] ring-1 ring-black/15 transition hover:-translate-y-px hover:brightness-110 active:translate-y-0"
                      >
                        Create listing
                      </Link>
                      <Link
                        href="/app/trading"
                        className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 font-extrabold transition hover:-translate-y-px hover:bg-white/[0.07] active:translate-y-0"
                      >
                        Open marketplace
                      </Link>
                    </div>
                  </div>
                </div>
              </GoldEdgeCard>
            </Reveal>
          </div>

          <div className="lg:col-span-4">
            <Reveal className="h-full w-full" delayMs={150}>
              <GoldEdgeCard className="h-full w-full">
                <div className="flex h-full min-h-[100%] flex-col p-9 md:p-11">
                  <div>
                    <p className="text-[13px] font-semibold text-white/40">Who it serves</p>
                    <h3 className="mt-2 text-[28px] font-black leading-[1.08] tracking-tight md:text-[32px]">
                      Creators, workers, brands, businesses, Web2 users, and crypto users
                    </h3>
                    <p className="mt-3 text-[14px] leading-[1.72] text-white/60 md:text-[15px]">
                      Realife is not just a mint page. It is an app layer for
                      real-world crypto commerce, connecting digital ownership with
                      real products, services, campaigns, fulfillment, and escrow.
                    </p>
                    <div className="mt-7 space-y-3.5">
                      {WHO_IT_SERVES.map((item) => (
                        <MiniCard key={item.title} title={item.title} text={item.text} />
                      ))}
                    </div>
                  </div>
                  <div className="mt-auto pt-6 text-[11px] leading-relaxed text-white/40">
                    Base Sepolia • AI-assisted minting • NFT-linked rights • marketplace • service escrow • delivery flows
                  </div>
                </div>
              </GoldEdgeCard>
            </Reveal>
          </div>
        </div>

        {/* ── Core modules ──────────────────────────────────────── */}
        <Reveal className="mt-6">
          <GoldEdgeCard>
            <div className="p-8 md:p-10">
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div>
                  <p className="text-xs font-semibold text-white/40">Core modules</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
                    Move through the Realife commerce ecosystem
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
                    Each module has a clear role: create listings, tokenize real-world
                    value, trade assets, manage identity, connect with brands, and
                    move toward escrow-protected fulfillment.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {CORE_MODULES.map((x) => (
                  <div
                    key={x.t}
                    className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_22px_80px_rgba(0,0,0,0.35)] transition hover:bg-white/[0.06]"
                  >
                    <div className="text-lg font-bold tracking-tight">{x.t}</div>
                    <div className="mt-2 text-sm leading-relaxed text-white/60">{x.d}</div>
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

        {/* ── Ecosystem verticals ───────────────────────────────── */}
        <Reveal className="mt-6">
          <GoldEdgeCard>
            <div className="p-8 md:p-10">
              <p className="text-xs font-semibold text-white/40">Inside the ecosystem</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
                Beyond trading: real-world verticals inside Realife
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/60">
                Realife expands beyond NFT minting into branded campaigns, storefront
                experiences, tokenized product stories, delivery-ready commerce, and
                stablecoin-oriented real-world utility.
              </p>

              <div className="mt-8 grid gap-4 lg:grid-cols-3">
                {/* Real Marketing */}
                <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_22px_80px_rgba(0,0,0,0.35)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                    Brand commerce layer
                  </p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight">Real Marketing</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/60">
                    The ecosystem hub for creator campaigns, crypto brand collaborations,
                    Crypto Cafe, Realife Store, product activations, and real-world commerce stories.
                  </p>
                  <div className="mt-5 grid gap-3">
                    {[
                      "Campaigns and branded experiences",
                      "Product storytelling and storefronts",
                      "Bridge between Web2 value and Web3 commerce",
                    ].map((x) => (
                      <div key={x} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/75">
                        {x}
                      </div>
                    ))}
                  </div>
                  <div className="mt-6">
                    <Link
                      href={REAL_MARKETING_HREF}
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-6 py-3 font-extrabold text-black shadow-[0_18px_60px_rgba(212,175,55,0.16)] ring-1 ring-black/15 transition hover:-translate-y-px hover:brightness-110 active:translate-y-0"
                    >
                      Enter Real Marketing
                    </Link>
                  </div>
                </div>

                {/* Crypto Cafe */}
                <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04]">
                  <div className="relative aspect-[4/5] w-full">
                    <Image src="/brand/realife-crypto-cafe.jpg" alt="Realife Crypto Cafe" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 33vw" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.62),rgba(0,0,0,0.08))]" />
                    <div className="absolute left-4 top-4">
                      <LuxPill className="bg-black/35">Crypto Cafe</LuxPill>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <div className="text-xl font-black tracking-tight">Realife Crypto Cafe</div>
                      <div className="mt-2 text-sm leading-relaxed text-white/60">
                        A premium storefront concept for branded goods, community culture,
                        crypto-native commerce, and real-world experiences.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Store */}
                <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04]">
                  <div className="relative aspect-[4/5] w-full">
                    <Image src="/brand/realife-store.jpg" alt="Realife Store" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 33vw" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.62),rgba(0,0,0,0.08))]" />
                    <div className="absolute left-4 top-4">
                      <LuxPill className="bg-black/35">Realife Store</LuxPill>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <div className="text-xl font-black tracking-tight">Tokenized product stories</div>
                      <div className="mt-2 text-sm leading-relaxed text-white/60">
                        Real-world products, branded packaging, NFT-linked ownership,
                        and marketplace-ready commerce inside the ecosystem.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GoldEdgeCard>
        </Reveal>

        {/* ── Vision ────────────────────────────────────────────── */}
        <Reveal className="mt-6">
          <GoldEdgeCard>
            <div className="p-8 md:p-12">
              <div className="grid items-center gap-6 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <p className="text-xs font-semibold text-white/40">Vision</p>
                  <h2 className="mt-2 text-3xl font-black leading-[1.05] tracking-tight md:text-4xl">
                    We are building a Web3 commerce layer where{" "}
                    <span className="bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] bg-clip-text text-transparent">
                      real people, real products, and real services
                    </span>{" "}
                    can move on-chain.
                  </h2>
                  <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/60 md:text-base">
                    Realife is designed to feel premium for investors and simple for users:
                    real-world commerce, crypto payments, NFT-linked rights, AI-assisted
                    creation, marketplace activity, and escrow protection for products,
                    services, and delivery.
                  </p>
                </div>
                <div className="lg:col-span-4">
                  <div className="flex flex-col gap-3">
                    <Link
                      href="/app/create"
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-6 py-3 font-extrabold text-black shadow-[0_18px_60px_rgba(212,175,55,0.16)] ring-1 ring-black/15 transition hover:-translate-y-px hover:brightness-110 active:translate-y-0"
                    >
                      Create listing
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

        <div className="mt-6 px-2 text-xs text-white/40">
          Realife premium UI • AI-assisted minting • NFT-linked transaction rights • marketplace • protected escrow • real-world commerce
        </div>
      </div>
    </div>
  );
}
