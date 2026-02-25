"use client";

import Link from "next/link";
import ConnectWallet from "@/components/ConnectWallet";

export default function SidebarBottom() {
  const contract = process.env.NEXT_PUBLIC_REALIFE_CONTRACT;

  return (
    <>
      {/* Wallet */}
      <div className="space-y-3">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.35)]">
          <p className="text-xs font-semibold text-white/60 mb-2">Wallet</p>
          <ConnectWallet />
          <p className="mt-2 text-[11px] text-white/55">
            Connect to mint on-chain (MetaMask / OKX / Rabby / WalletConnect).
          </p>
        </div>

        <Link
          href="/app/create"
          className={[
            "w-full inline-flex items-center justify-center px-4 py-3 rounded-2xl",
            "text-black text-sm font-extrabold",
            "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
            "shadow-[0_22px_80px_rgba(212,175,55,0.16)] ring-1 ring-black/15",
            "hover:brightness-110 hover:-translate-y-[1px] transition active:translate-y-0",
          ].join(" ")}
        >
          Create NFT
        </Link>

        <Link
          href="/app/faucet"
          className="w-full inline-flex items-center justify-center px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:-translate-y-[1px] transition active:translate-y-0 text-sm font-semibold"
        >
          Faucet ETH
        </Link>
      </div>

      {/* Mini status */}
      <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-xs font-semibold text-white/65 mb-1">Network</p>
        <p className="text-[11px] text-white/55 leading-relaxed">
          Base Sepolia • IPFS metadata • on-chain mint
        </p>

        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3">
          <p className="text-[11px] font-semibold text-white/60">Contract</p>
          <p className="mt-1 text-[11px] text-white/55 break-all font-mono">
            {contract || "Set NEXT_PUBLIC_REALIFE_CONTRACT"}
          </p>
        </div>
      </div>

      <div className="mt-6 text-[11px] text-white/40">
        Tip: mint needs test ETH on <b>Base Sepolia</b>.
      </div>
    </>
  );
}