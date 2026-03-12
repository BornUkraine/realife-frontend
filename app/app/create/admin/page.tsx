import Link from "next/link";
import type { ReactNode } from "react";
import Reveal from "@/components/Reveal";
import AdminMintForm from "./MintForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Realife Admin Control",
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

export default function AdminCreatePage() {
  const year = new Date().getFullYear();
  const cafeContract = process.env.NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT || "not-set";
  const storeContract = process.env.NEXT_PUBLIC_REALIFE_STORE_CONTRACT || "not-set";

  return (
    <div className="space-y-6">
      <Reveal>
        <GoldEdgeWrap className="rounded-[40px]">
          <div className="relative p-7 md:p-10 overflow-hidden">
            <div className="pointer-events-none absolute -top-44 -right-44 h-[560px] w-[560px] rounded-full bg-[#d4af37]/14 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-44 -left-44 h-[560px] w-[560px] rounded-full bg-white/[0.06] blur-3xl" />

            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <Pill>
                  <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
                  Private Admin Route • Base Sepolia
                </Pill>

                <Pill>
                  <span className="text-white/80 font-extrabold">Realife Cafe + Realife NFT Store</span>
                </Pill>

                <Pill>
                  <span className="text-amber-200 font-black">createProduct()</span>
                </Pill>

                <Pill>
                  <span className="text-amber-200 font-black">toggleProductStatus()</span>
                </Pill>
              </div>

              <h1 className="mt-5 text-4xl md:text-6xl font-black leading-[1.05] tracking-[-0.02em]">
                Realife{" "}
                <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]">
                  Admin Control
                </span>
              </h1>

              <p className="mt-4 text-sm md:text-base text-white/70 max-w-3xl leading-relaxed">
                Hidden control panel for both <span className="text-white font-semibold">RealifeCafeStore</span> and{" "}
                <span className="text-white font-semibold">RealifeStore1155</span>. Upload premium metadata to IPFS,
                create new storefront products on-chain, and manage visibility for existing items.
              </p>

              <div className="mt-3 text-sm text-white/70 max-w-3xl leading-relaxed">
                This private page supports <span className="text-white font-semibold">cafe products</span> and{" "}
                <span className="text-white font-semibold">curated store goods</span> like art, collectibles, merch,
                perfume, fashion, antiques, packaged goods and other approved items.
              </div>

              <div className="mt-3 text-sm text-white/70 max-w-3xl leading-relaxed">
                Access is granted only to the connected wallet that matches your front-end allowlist and has{" "}
                <span className="text-amber-200 font-extrabold">MODERATOR_ROLE</span> in the selected contract.
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/60">
                  Cafe contract: <span className="font-semibold text-white break-all">{cafeContract}</span>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/60">
                  Store contract: <span className="font-semibold text-white break-all">{storeContract}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/app/faucet"
                  className="px-6 py-3 rounded-2xl text-black font-extrabold hover:brightness-110 transition shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
                >
                  Get test ETH
                </Link>

                <a
                  href="https://sepolia.basescan.org/"
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3 rounded-2xl border border-white/15 bg-white/[0.06] font-semibold hover:bg-white/10 transition backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                >
                  Explorer ↗
                </a>

                <Link
                  href="/app/real-marketing"
                  className="px-6 py-3 rounded-2xl border border-white/15 bg-white/[0.06] font-semibold hover:bg-white/10 transition backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                >
                  Real Marketing →
                </Link>

                <Link
                  href="/app"
                  className="px-6 py-3 rounded-2xl border border-white/15 bg-white/[0.06] font-semibold hover:bg-white/10 transition backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                >
                  Back to App →
                </Link>
              </div>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={120}>
        <GoldEdgeWrap className="rounded-[40px]">
          <div className="p-6 md:p-10">
            <AdminMintForm />
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={200}>
        <div className="pt-2 pb-6 text-xs text-white/45 flex flex-wrap items-center justify-between gap-4">
          <div>© {year} Realife</div>
          <div className="flex items-center gap-4">
            <span className="opacity-60">Private route</span>
            <span className="opacity-60">ERC-1155 Storefronts</span>
            <span className="opacity-60">AccessControl</span>
            <span className="opacity-60">IPFS metadata</span>
            <span className="opacity-60">Cafe + Store control</span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}