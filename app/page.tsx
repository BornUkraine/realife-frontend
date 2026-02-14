"use client";

import Link from "next/link";
import { useMemo } from "react";
import ConnectWallet from "@/components/ConnectWallet";

const HIGHLIGHTS = [
  { t: "On-chain mint", d: "Real tx + signature on Base Sepolia" },
  { t: "IPFS tokenURI", d: "Permanent metadata for credibility" },
  { t: "Premium flow", d: "Prepare → Mint → Verify → Share" },
] as const;

const STEPS = [
  {
    n: "01",
    t: "Create something real",
    d: "Art, craft, product, invention, design, AI output — real effort becomes proof.",
  },
  {
    n: "02",
    t: "Prepare (Upload → IPFS)",
    d: "Upload media + story + proof link → generate metadataURI (tokenURI).",
  },
  {
    n: "03",
    t: "Mint on-chain",
    d: "Wallet signs a transaction → token is minted and traceable on explorer.",
  },
  {
    n: "04",
    t: "Build reputation",
    d: "Each mint strengthens your creator profile and unlocks future features.",
  },
] as const;

const ROADMAP = [
  { t: "Creator Profile", d: "Show your minted NFTs + creator score", soon: true },
  { t: "Collections", d: "Group NFTs, highlight real-world series", soon: true },
  { t: "Trading", d: "Secondary market + listings", soon: true },
] as const;

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[11px] font-semibold text-white/70 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
      {children}
    </div>
  );
}

function GoldButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "relative inline-flex items-center justify-center overflow-hidden",
        "px-7 py-4 rounded-2xl",
        "text-black font-extrabold tracking-tight",
        "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_42%,#b8870a_100%)]",
        "shadow-[0_22px_70px_rgba(212,175,55,0.18)]",
        "ring-1 ring-black/15",
        "transition duration-300 hover:brightness-110 hover:-translate-y-px",
        "active:translate-y-0",
        // shine
        "before:absolute before:inset-0 before:bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.35),transparent)]",
        "before:translate-x-[-140%] hover:before:translate-x-[140%] before:transition before:duration-700",
        className,
      ].join(" ")}
    >
      <span className="relative z-10">{children}</span>
    </Link>
  );
}

function GhostButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "relative inline-flex items-center justify-center overflow-hidden",
        "px-7 py-4 rounded-2xl",
        "border border-white/15 bg-white/6 text-white font-semibold",
        "backdrop-blur-2xl",
        "shadow-[0_18px_70px_rgba(0,0,0,0.28)]",
        "transition duration-300 hover:bg-white/10 hover:-translate-y-px",
        "active:translate-y-0",
        className,
      ].join(" ")}
    >
      <span className="relative z-10">{children}</span>
    </Link>
  );
}

function TiltCard({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={["group relative perspective-1000", className].join(" ")}>
      <div
        className={[
          "transition-transform duration-300 ease-out will-change-transform",
          "group-hover:transform-[rotateX(4deg)_rotateY(-6deg)_translateY(-2px)]",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}

function Reveal({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={["motion-safe:animate-[fadeUp_.7s_ease-out_both]", className].join(" ")}>
      {children}
    </div>
  );
}

function GlassCard({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "relative rounded-[28px] border border-white/10",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))]",
        "backdrop-blur-2xl",
        "shadow-[0_28px_120px_rgba(0,0,0,0.38)]",
        "overflow-hidden",
        // gold edge (premium border)
        "before:absolute before:inset-0 before:rounded-[28px] before:p-px",
        "before:bg-[linear-gradient(135deg,rgba(247,231,167,0.35),rgba(212,175,55,0.18),rgba(184,135,10,0.12))]",
        "before:[mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)]",
        "before:[-webkit-mask-composite:xor] before:mask-exclude",
        // subtle inner shine
        "after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_25%_0%,rgba(212,175,55,0.14),transparent_45%)]",
        className,
      ].join(" ")}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default function HomePage() {
  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <main className="min-h-screen bg-[#060505] text-white overflow-hidden">
      {/* Global keyframes */}
      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Ultra premium background */}
      <div className="pointer-events-none fixed inset-0">
        {/* deep vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(255,255,255,0.05),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(212,175,55,0.10),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(212,175,55,0.08),transparent_55%)]" />

        {/* gold orbs */}
        <div className="absolute -top-80 -left-80 h-96 w-96 rounded-full bg-[#d4af37]/14 blur-3xl animate-pulse" />
        <div className="absolute -bottom-80 -right-80 h-96 w-96 rounded-full bg-[#d4af37]/10 blur-3xl animate-pulse" />

        {/* premium grid */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.22) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />

        {/* micro noise */}
        <div className="absolute inset-0 opacity-[0.055] bg-[radial-gradient(circle,rgba(255,255,255,.18)_1px,transparent_1px)] bg-size-[18px_18px]" />

        {/* top spotlight */}
        <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.65),transparent)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-10">
        {/* HERO */}
        <Reveal>
          <section className="mt-6 grid lg:grid-cols-12 gap-10 items-center">
            {/* LEFT */}
            <div className="lg:col-span-7">
              <Pill>
                <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
                VIP creator mint • Base Sepolia • IPFS tokenURI
              </Pill>

              <h1 className="mt-6 text-4xl md:text-6xl font-black leading-[1.05] tracking-[-0.02em]">
                Realife turns{" "}
                <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]">
                  real-life work
                </span>
                <br />
                into on-chain proof.
              </h1>

              <p className="mt-6 text-base md:text-lg text-white/70 max-w-2xl leading-relaxed">
                Upload your creation, store metadata on IPFS, then mint a verifiable NFT on-chain.
                Built like premium crypto apps — clean flow, real signatures, and explorer
                verification.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <GoldButton href="/app/create">Mint your first NFT</GoldButton>
                <GhostButton href="/app">Open the App</GhostButton>

                <a
                  href="https://www.alchemy.com/faucets/base-sepolia"
                  target="_blank"
                  rel="noreferrer"
                  className={[
                    "relative inline-flex items-center justify-center overflow-hidden",
                    "px-7 py-4 rounded-2xl",
                    "border border-white/15 bg-black/25 text-white font-semibold",
                    "backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)]",
                    "transition duration-300 hover:bg-white/10 hover:-translate-y-px",
                    "active:translate-y-0",
                  ].join(" ")}
                >
                  Get test ETH ↗
                </a>
              </div>

              {/* wallet + microstatus */}
              <div className="mt-10 grid md:grid-cols-12 gap-4">
                <TiltCard className="md:col-span-5">
                  <GlassCard>
                    <div className="p-5">
                      <div className="text-[11px] font-semibold text-white/60">Wallet</div>
                      <div className="mt-2">
                        <ConnectWallet />
                      </div>
                      <div className="mt-3 text-[11px] text-white/55 leading-relaxed">
                        Connect to mint on-chain (MetaMask / OKX / Rabby / WalletConnect).
                      </div>
                    </div>
                  </GlassCard>
                </TiltCard>

                <TiltCard className="md:col-span-7">
                  <GlassCard>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[11px] font-semibold text-white/60">Premium flow</div>
                          <div className="mt-1 text-sm font-semibold tracking-tight">
                            Prepare → Sign → Mint → Verify
                          </div>
                          <div className="mt-2 text-[11px] text-white/55">
                            Tip: mint requires Base Sepolia ETH gas.
                          </div>
                        </div>

                        <a
                          href="https://www.alchemy.com/faucets/base-sepolia"
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] hover:brightness-110 transition"
                        >
                          Faucet ↗
                        </a>
                      </div>

                      <div className="mt-4 grid sm:grid-cols-3 gap-3">
                        {HIGHLIGHTS.map((x) => (
                          <div
                            key={x.t}
                            className={[
                              "rounded-2xl border border-white/10",
                              "bg-[linear-gradient(180deg,rgba(0,0,0,0.30),rgba(0,0,0,0.22))]",
                              "p-4 transition duration-300",
                              "hover:-translate-y-px hover:bg-black/30",
                              "shadow-[0_18px_70px_rgba(0,0,0,0.25)]",
                            ].join(" ")}
                          >
                            <div className="text-sm font-semibold tracking-tight">{x.t}</div>
                            <div className="mt-1 text-xs text-white/60 leading-relaxed">{x.d}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </GlassCard>
                </TiltCard>
              </div>
            </div>

            {/* RIGHT: VIP card */}
            <TiltCard className="lg:col-span-5">
              <GlassCard className="rounded-[38px] before:rounded-[38px]">
                <div className="p-8">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-white/60">How it works</div>
                      <div className="text-xl font-black tracking-tight">Proof-first creator mint</div>
                    </div>

                    <div className="text-[11px] px-3 py-1.5 rounded-full bg-black/35 border border-white/10 text-white/70">
                      VIP UI
                    </div>
                  </div>

                  <div className="mt-8 space-y-4">
                    {STEPS.map((s) => (
                      <div
                        key={s.n}
                        className={[
                          "rounded-3xl border border-white/10",
                          "bg-[linear-gradient(180deg,rgba(0,0,0,0.30),rgba(0,0,0,0.22))]",
                          "p-5 transition duration-300",
                          "hover:-translate-y-px hover:bg-black/30",
                          "shadow-[0_20px_80px_rgba(0,0,0,0.28)]",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-2xl bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] text-black flex items-center justify-center font-black shadow-[0_16px_50px_rgba(212,175,55,0.16)]">
                            {s.n}
                          </div>
                          <div className="font-semibold tracking-tight">{s.t}</div>
                        </div>
                        <div className="mt-2 text-sm text-white/60 leading-relaxed">{s.d}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 rounded-3xl border border-white/10 bg-black/25 p-5 shadow-[0_22px_90px_rgba(0,0,0,0.28)]">
                    <div className="text-[11px] font-semibold text-white/60">Next</div>
                    <div className="mt-1 text-sm font-semibold tracking-tight">
                      Creator profile + your NFTs
                    </div>
                    <div className="mt-2 text-xs text-white/55 leading-relaxed">
                      You said you want profile & NFT display — this design is ready for it.
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <GoldButton href="/app/create" className="px-6 py-3">
                        Start minting
                      </GoldButton>
                      <GhostButton href="/app/faucet" className="px-6 py-3">
                        Get gas
                      </GhostButton>
                    </div>
                  </div>

                  <div className="mt-6 text-[11px] text-white/45">
                    Tokenization = IPFS media + IPFS metadata + on-chain ownership.
                  </div>
                </div>
              </GlassCard>
            </TiltCard>
          </section>
        </Reveal>

        {/* ROADMAP */}
        <Reveal className="mt-14">
          <section>
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <div>
                <Pill>
                  <span className="h-2 w-2 rounded-full bg-white/50" />
                  Roadmap
                </Pill>
                <h2 className="mt-4 text-2xl md:text-3xl font-black tracking-tight">
                  What’s coming next
                </h2>
                <p className="mt-2 text-sm text-white/65 max-w-2xl leading-relaxed">
                  Build a reputation-driven creator economy: profile, collections, and trading.
                </p>
              </div>

              <Link
                href="/app"
                className="px-5 py-3 rounded-2xl border border-white/15 bg-white/6 text-sm font-semibold backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.25)] hover:bg-white/10 hover:-translate-y-px transition active:translate-y-0"
              >
                Enter App →
              </Link>
            </div>

            <div className="mt-6 grid md:grid-cols-3 gap-4">
              {ROADMAP.map((x) => (
                <TiltCard key={x.t}>
                  <GlassCard>
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-black tracking-tight">{x.t}</div>
                        {x.soon ? (
                          <span className="text-[11px] px-2 py-1 rounded-full bg-black/35 border border-white/10 text-white/70">
                            Soon
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 text-sm text-white/65 leading-relaxed">{x.d}</div>
                      <div className="mt-4 h-px bg-white/10" />
                      <div className="mt-4 text-[11px] text-white/50">
                        Powered by Base Sepolia • Designed for premium UX
                      </div>
                    </div>
                  </GlassCard>
                </TiltCard>
              ))}
            </div>
          </section>
        </Reveal>

        {/* FOOTER */}
        <footer className="mt-16 pb-10 text-xs text-white/45 flex flex-wrap items-center justify-between gap-4">
          <div>© {year} Realife</div>
          <div className="flex items-center gap-4">
            <span className="opacity-60">Base Sepolia</span>
            <span className="opacity-60">IPFS tokenURI</span>
            <span className="opacity-60">On-chain mint</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
