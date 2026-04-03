"use client";

import Link from "next/link";
import ConnectWallet from "@/components/ConnectWallet";

export default function SidebarBottom() {
  return (
    <div className="space-y-2.5">

      {/* ── Wallet connect block ───────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
          Wallet
        </p>
        <ConnectWallet />
        <p className="mt-2.5 text-[11px] leading-relaxed text-white/40">
          MetaMask · OKX · Rabby · WalletConnect
        </p>
      </div>

      {/* ── Primary CTA: Create NFT ───────────────────────────────── */}
      <Link
        href="/app/create"
        className={[
          "flex w-full items-center justify-center rounded-2xl px-4 py-2.5",
          "text-[#0a0806] text-sm font-bold",
          "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_50%,#b8870a_100%)]",
          "shadow-[0_16px_60px_rgba(201,168,76,0.14)] ring-1 ring-black/15",
          "transition hover:brightness-105 hover:-translate-y-px active:translate-y-0",
        ].join(" ")}
      >
        Create NFT
      </Link>

      {/* ── Secondary: Faucet ─────────────────────────────────────── */}
      <Link
        href="/app/faucet"
        className={[
          "flex w-full items-center justify-center rounded-2xl px-4 py-2.5",
          "border border-white/[0.08] bg-white/[0.03]",
          "text-sm font-medium text-white/65",
          "transition hover:bg-white/[0.06] hover:text-white/85 hover:-translate-y-px active:translate-y-0",
        ].join(" ")}
      >
        Faucet ETH
      </Link>

    </div>
  );
}