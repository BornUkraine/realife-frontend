import Link from "next/link";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import AdminMintForm from "./MintForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
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

  const cafeContract =
    process.env.NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT || "not-set";

  const storeContract =
    process.env.NEXT_PUBLIC_REALIFE_STORE_CONTRACT || "not-set";

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
                  Private Admin Route • Base Sepolia
                </Pill>

                <Pill>
                  <span className="text-white/80 font-extrabold">
                    Realife Cafe + Realife NFT Store
                  </span>
                </Pill>

                <Pill>
                  <span className="text-amber-200 font-black">
                    Product create / toggle
                  </span>
                </Pill>

                <Pill>
                  <span className="text-amber-200 font-black">
                    Brand label in metadata
                  </span>
                </Pill>

                <Pill>
                  <span className="text-amber-200 font-black">
                    Store delivery flags
                  </span>
                </Pill>

                <Pill>
                  <span className="text-amber-200 font-black">
                    Delivery mint contract access
                  </span>
                </Pill>

                <Pill>
                  <span className="text-amber-200 font-black">
                    Support role manager
                  </span>
                </Pill>
              </div>

              <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-[-0.02em] md:text-6xl">
                Realife{" "}
                <span className="bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] bg-clip-text text-transparent">
                  Admin Control
                </span>
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/70 md:text-base">
                Hidden control panel for both{" "}
                <span className="font-semibold text-white">
                  RealifeCafeStore
                </span>{" "}
                and{" "}
                <span className="font-semibold text-white">
                  RealifeStore1155
                </span>
                . Upload premium metadata to IPFS, create new storefront
                products on-chain, manage visibility for existing items, control
                which public users can mint through the{" "}
                <span className="font-semibold text-white">
                  delivery mint contract
                </span>
                , and assign internal{" "}
                <span className="font-semibold text-white">
                  support / moderator / admin
                </span>{" "}
                access for delivery chats and order rooms.
              </p>

              <div className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70">
                <span className="font-semibold text-white">Cafe mode</span>{" "}
                stays under the native Realife brand.{" "}
                <span className="font-semibold text-white">Store mode</span> can
                optionally carry a different brand / project label in metadata
                and UI for testing, collabs or future partner drops.
              </div>

              <div className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70">
                For now you can keep one{" "}
                <span className="font-semibold text-white">
                  shared Store contract
                </span>{" "}
                on Base Sepolia and still show different brand labels per
                product. Separate contracts per project are optional later, not
                required now.
              </div>

              <div className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70">
                For{" "}
                <span className="font-semibold text-white">store products</span>,
                this panel configures the product itself plus delivery flags.
                Actual shipping, tracking, confirmation and escrow control
                happens later in the orders flow after purchase.
              </div>

              <div className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70">
                For{" "}
                <span className="font-semibold text-white">
                  public creator mint
                </span>
                , this panel grants or revokes access specifically for the{" "}
                <span className="font-extrabold text-amber-200">
                  delivery mint contract
                </span>
                . Standard public mint remains separate and public.
              </div>

              <div className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70">
                The same admin panel can now also manage{" "}
                <span className="font-semibold text-white">DB support roles</span>{" "}
                for your internal ops flow. That means selected users can later
                enter delivery rooms as support, read the full order context,
                view chat history, and reply as{" "}
                <span className="font-semibold text-white">SUPPORT</span>.
              </div>

              <div className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70">
                User lookup and access control can be tied to the user profile
                and wallet identity used inside your app flow.
              </div>

              <div className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70">
                Access is granted only to the connected wallet that matches your
                front-end allowlist and has{" "}
                <span className="font-extrabold text-amber-200">
                  MODERATOR_ROLE
                </span>{" "}
                in the selected contract. Support-role management is intended for
                the bootstrap admin / future DB-admin flow.
              </div>

              <div className="mt-4 grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/60">
                  Cafe contract:{" "}
                  <span className="break-all font-semibold text-white">
                    {cafeContract}
                  </span>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/60">
                  Store contract:{" "}
                  <span className="break-all font-semibold text-white">
                    {storeContract}
                  </span>
                </div>

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

              <div className="mt-4 max-w-4xl rounded-[24px] border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-xs text-sky-50/85">
                Current strategy: keep the real cafe, travel and event items
                under <span className="font-black text-sky-100">Realife</span>,
                while the Store can optionally test different{" "}
                <span className="font-black text-sky-100">brand labels</span>{" "}
                on product cards and NFT pages without fragmenting the contract
                architecture. Public user delivery mint access is explicitly
                tied to the{" "}
                <span className="font-black text-sky-100">
                  delivery mint contract
                </span>
                , not the standard one. Internal support access for order rooms
                is now intended to live in the database via{" "}
                <span className="font-black text-sky-100">supportRole</span>.
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/app/faucet"
                  className="rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-6 py-3 font-extrabold text-black shadow-[0_18px_60px_rgba(212,175,55,0.20)] ring-1 ring-black/15 transition hover:brightness-110"
                >
                  Get test ETH
                </Link>

                <a
                  href="https://sepolia.basescan.org/"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-3 font-semibold shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition hover:bg-white/10"
                >
                  Explorer ↗
                </a>

                <Link
                  href="/app/real-marketing"
                  className="rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-3 font-semibold shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition hover:bg-white/10"
                >
                  Real Marketing →
                </Link>

                <Link
                  href="/app"
                  className="rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-3 font-semibold shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition hover:bg-white/10"
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
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 pb-6 text-xs text-white/45">
          <div>© {year} Realife</div>

          <div className="flex items-center gap-4">
            <span className="opacity-60">Private route</span>
            <span className="opacity-60">ERC-1155 Storefronts</span>
            <span className="opacity-60">AccessControl</span>
            <span className="opacity-60">IPFS metadata</span>
            <span className="opacity-60">Cafe + Store control</span>
            <span className="opacity-60">Brand label</span>
            <span className="opacity-60">Delivery flags</span>
            <span className="opacity-60">Delivery mint contract access</span>
            <span className="opacity-60">Support roles</span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}