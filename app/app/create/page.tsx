import Link from "next/link";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import MintForm from "./MintForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Create Realife NFT",
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

export default function CreatePage() {
  const year = new Date().getFullYear();

  const publicStandardMintContract =
    process.env.NEXT_PUBLIC_REALIFE_1155_NEW_CONTRACT || "not-set";

  const publicDeliveryMintContract =
    process.env.NEXT_PUBLIC_REALIFE_1155_DELIVERY_CONTRACT || "not-set";

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
                  Public Mint • Base Sepolia • IPFS metadata
                </Pill>

                <Pill>
                  <span className="text-amber-200 font-black">+10</span>
                  points per mint
                </Pill>

                <Pill>
                  <span className="text-white/80 font-extrabold">
                    ERC-1155 NFT
                  </span>
                </Pill>

                <Pill>
                  <span className="text-white/80 font-extrabold">
                    Standard + delivery mint contracts
                  </span>
                </Pill>
              </div>

              <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-[-0.02em] md:text-6xl">
                Create{" "}
                <span className="bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] bg-clip-text text-transparent">
                  Realife NFT
                </span>
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/70 md:text-base">
                Prepare metadata on IPFS → sign wallet tx → mint an ERC-1155 NFT
                on Base Sepolia.
              </p>

              <div className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70">
                Create NFTs for{" "}
                <span className="font-semibold text-white">
                  products, services, portfolios, projects, websites,
                </span>{" "}
                digital work, and physical goods.
              </div>

              <div className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70">
                This page does{" "}
                <span className="font-semibold text-white">
                  not choose a marketplace directly
                </span>
                . It only creates the NFT and stores metadata/classification that
                the platform can use later when you list the NFT.
              </div>

              <div className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70">
                <span className="font-semibold text-white">
                  Standard mint contract
                </span>{" "}
                is used for normal collectible NFTs and also for service-style
                NFTs such as{" "}
                <span className="font-semibold text-white">
                  consultation, training, website, portfolio, project, digital
                  service
                </span>
                . Those NFTs can still mint normally here, and later the site
                can route them into the protected marketplace flow when listed.
              </div>

              <div className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70">
                <span className="font-semibold text-white">
                  Delivery mint contract
                </span>{" "}
                is only for approved seller wallets. It is the restricted mint
                flow for physical delivery-enabled items. Regular users cannot
                freely mint into that contract.
              </div>

              <div className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70">
                Mint and earn{" "}
                <span className="font-extrabold text-amber-200">+10 points</span>.
                <span className="text-white/55">
                  {" "}
                  More mints → more points → stronger creator reputation.
                </span>
              </div>

              <div className="mt-4 grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/60">
                  Public standard mint contract:{" "}
                  <span className="break-all font-semibold text-white">
                    {publicStandardMintContract}
                  </span>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/60">
                  Public delivery mint contract:{" "}
                  <span className="break-all font-semibold text-white">
                    {publicDeliveryMintContract}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid max-w-5xl grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Standard collectible flow
                  </div>
                  <div className="mt-2 text-sm font-extrabold text-white">
                    Mint via standard contract
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-white/60">
                    Art, collectible, public NFT. Later usually lists on the
                    standard marketplace.
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Service / trust flow
                  </div>
                  <div className="mt-2 text-sm font-extrabold text-white">
                    Mint via standard contract
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-white/60">
                    Consultation, website, portfolio, project, digital service,
                    training. Later the platform can route listing into the
                    protected marketplace.
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Physical delivery flow
                  </div>
                  <div className="mt-2 text-sm font-extrabold text-white">
                    Mint via delivery contract
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-white/60">
                    Only for approved seller wallets. Used for delivery-enabled
                    physical items and protected trust flow.
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/app/faucet"
                  className="rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-6 py-3 font-extrabold text-black ring-1 ring-black/15 transition hover:brightness-110 shadow-[0_18px_60px_rgba(212,175,55,0.20)]"
                >
                  Get test ETH
                </Link>

                <Link
                  href="/app"
                  className="rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-3 font-semibold backdrop-blur-2xl transition hover:bg-white/10 shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                >
                  Back to App →
                </Link>

                <a
                  href="https://sepolia.basescan.org/"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-3 font-semibold backdrop-blur-2xl transition hover:bg-white/10 shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                >
                  Explorer ↗
                </a>
              </div>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={120}>
        <GoldEdgeWrap className="rounded-[40px]">
          <div className="p-6 md:p-10">
            <MintForm />
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={200}>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 pb-6 text-xs text-white/45">
          <div>© {year} Realife</div>
          <div className="flex items-center gap-4">
            <span className="opacity-60">ERC-1155</span>
            <span className="opacity-60">IPFS</span>
            <span className="opacity-60">Public mint</span>
            <span className="opacity-60">Standard + delivery</span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}