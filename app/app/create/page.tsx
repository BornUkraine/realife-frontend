import Link from "next/link";
import type { ReactNode } from "react";
import MintForm from "./MintForm";

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

export default function CreatePage() {
  const year = new Date().getFullYear();

  return (
    <main className="min-h-screen bg-[#060505] text-white overflow-hidden">
      {/* Ultra premium background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(255,255,255,0.05),transparent_60%)]" />
        <div className="absolute -top-80 -left-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/14 blur-3xl animate-pulse" />
        <div className="absolute -bottom-80 -right-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/10 blur-3xl animate-pulse" />

        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.22) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />

        <div className="absolute inset-0 opacity-[0.055] bg-[radial-gradient(circle,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.65),transparent)]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-10">
        {/* TOP NAV */}
        <header className="flex items-center justify-between gap-6">
          <Link href="/app" className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl border border-white/10 bg-white/[0.06] flex items-center justify-center shadow-[0_16px_60px_rgba(212,175,55,0.12)]">
              <span className="text-lg font-extrabold text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]">
                R
              </span>
            </div>
            <div className="leading-tight min-w-0">
              <div className="text-base font-extrabold tracking-[0.22em] truncate">
                REALIFE
              </div>
              <div className="text-xs text-white/60 -mt-0.5 truncate">
                Mint Studio • IPFS + On-chain proof
              </div>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-white/70">
            <Link href="/app" className="hover:text-white transition">
              Home
            </Link>
            <Link href="/app/create" className="text-white">
              Create
            </Link>
            <Link href="/app/faucet" className="hover:text-white transition">
              Faucet
            </Link>
            <span className="opacity-50 cursor-not-allowed">Trading</span>
            <span className="opacity-50 cursor-not-allowed">Profile</span>
          </div>

          <Link
            href="/app"
            className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/15 bg-white/[0.06] font-semibold hover:bg-white/10 transition backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
          >
            Back to App
          </Link>
        </header>

        {/* HERO STRIP (compact, no big faucet block) */}
        <section className="mt-10">
          <GoldEdgeWrap className="rounded-[40px]">
            <div className="relative p-7 md:p-10">
              <div className="pointer-events-none absolute -top-44 -right-44 h-[560px] w-[560px] rounded-full bg-[#d4af37]/14 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-44 -left-44 h-[560px] w-[560px] rounded-full bg-white/[0.06] blur-3xl" />

              <div className="relative">
                <Pill>
                  <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
                  VIP Mint Studio • Base Sepolia • IPFS metadata
                </Pill>

                <h1 className="mt-5 text-4xl md:text-6xl font-black leading-[1.05] tracking-[-0.02em]">
                  Mint NFT{" "}
                  <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]">
                    proof
                  </span>
                </h1>

                <p className="mt-4 text-sm md:text-base text-white/70 max-w-3xl leading-relaxed">
                  Prepare (IPFS) → Sign → Mint → Verify. One premium flow, no extra noise.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/app/faucet"
                    className="px-6 py-3 rounded-2xl text-black font-extrabold hover:brightness-110 transition shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
                  >
                    Get test ETH
                  </Link>

                  <Link
                    href="/app"
                    className="px-6 py-3 rounded-2xl border border-white/15 bg-white/[0.06] font-semibold hover:bg-white/10 transition backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                  >
                    Open App →
                  </Link>

                  <a
                    href="https://sepolia.basescan.org/"
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-3 rounded-2xl border border-white/15 bg-white/[0.06] font-semibold hover:bg-white/10 transition backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                  >
                    Explorer ↗
                  </a>
                </div>
              </div>
            </div>
          </GoldEdgeWrap>
        </section>

        {/* FORM */}
        <section className="mt-8">
          <GoldEdgeWrap className="rounded-[40px]">
            <div className="p-6 md:p-10">
              <MintForm />
            </div>
          </GoldEdgeWrap>
        </section>

        <footer className="mt-12 pb-8 text-xs text-white/45 flex flex-wrap items-center justify-between gap-4">
          <div>© {year} Realife</div>
          <div className="flex items-center gap-4">
            <span className="opacity-60">Base Sepolia</span>
            <span className="opacity-60">IPFS</span>
            <span className="opacity-60">On-chain mint</span>
          </div>
        </footer>
      </div>
    </main>
  );
}