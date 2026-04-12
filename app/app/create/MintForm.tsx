"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useAccount,
  useBalance,
  useChainId,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { decodeEventLog, formatUnits } from "viem";

import { realife1155Abi } from "@/lib/realife1155Abi";
import { realife1155DeliveryAbi } from "@/lib/realife1155DeliveryAbi";
import NftMedia from "@/components/NftMedia";

const PROJECTS = [
  "Sentient",
  "Billions",
  "Rialo",
  "Neura",
  "Realife",
  "Other",
] as const;

const OFFER_TYPES = [
  {
    value: "collectible",
    title: "Collectible / standard NFT",
    subtitle:
      "Art, collectible, flex NFT, creative media, public edition without service obligation.",
  },
  {
    value: "physical_product",
    title: "Physical product",
    subtitle:
      "A real item, product, merch, packaged goods, object, fashion item, gadget or tangible good.",
  },
  {
    value: "digital_service",
    title: "Digital service",
    subtitle:
      "Website, design, AI work, digital deliverable, portfolio, project, audit, remote professional work.",
  },
  {
    value: "online_session",
    title: "Online session",
    subtitle:
      "Consultation, coaching, training, lesson, call, remote session or online meeting.",
  },
  {
    value: "local_service",
    title: "Local service",
    subtitle:
      "Offline / in-person local work: repair, installation, interior help, trainer, engineer, builder, etc.",
  },
] as const;

const SEARCH_CATEGORIES = [
  "Products / goods",
  "Professional services",
  "Creative / design",
  "AI / automation",
  "Education / coaching",
  "Wellness / fitness",
  "Local trades / repair",
  "Fashion / accessories",
  "Food / beverage",
  "Home / living",
  "Tech / gadgets",
  "Legal / consulting",
  "Logistics / transport",
  "Other",
] as const;

type OfferType =
  | "collectible"
  | "physical_product"
  | "digital_service"
  | "online_session"
  | "local_service";

type DeliveryMode = "none" | "delivery";
type ActiveMintMode = "standard" | "delivery";
type FulfillmentType =
  | "PHYSICAL_GOOD"
  | "DIGITAL_SERVICE"
  | "ONLINE_SESSION"
  | "LOCAL_SERVICE"
  | null;
type SuggestedMarketType = "standard" | "protected";

type AiSuggestion = {
  offerType: OfferType;
  category: (typeof SEARCH_CATEGORIES)[number];
  itemLabel: string;
  tags: string[];
  confidence: number;
  summary: string;
};

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://accurate-art-production.up.railway.app";

const PREPARE_URL = `${API_BASE.replace(/\/$/, "")}/api/mint/prepare`;

const CONTRACT_1155_STANDARD =
  process.env.NEXT_PUBLIC_REALIFE_1155_NEW_CONTRACT as
    | `0x${string}`
    | undefined;

const CONTRACT_1155_DELIVERY =
  process.env.NEXT_PUBLIC_REALIFE_1155_DELIVERY_CONTRACT as
    | `0x${string}`
    | undefined;

const IPFS_GATEWAYS = [
  "https://nftstorage.link/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
] as const;

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function clampSupply(n: number) {
  if (Number.isNaN(n)) return 1;
  return Math.max(1, Math.min(10000, Math.floor(n)));
}

function fmtEth(value?: string) {
  if (!value) return "0";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";
  return n.toFixed(5).replace(/0+$/, "").replace(/\.$/, "");
}

function prettyError(e: any) {
  return (
    e?.shortMessage ||
    e?.cause?.shortMessage ||
    e?.cause?.message ||
    e?.message ||
    "Something went wrong"
  );
}

function persistableUrl(input?: string | null) {
  const s = (input || "").trim();
  if (!s) return null;
  if (s.startsWith("blob:")) return null;
  return s;
}

function ipfsToHttp(u?: string | null, gw: string = IPFS_GATEWAYS[0]) {
  const s = (u || "").trim();
  if (!s) return null;

  if (
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s.startsWith("data:") ||
    s.startsWith("blob:")
  ) {
    return s;
  }

  if (s.startsWith("ipfs://")) {
    let p = s.slice("ipfs://".length);
    if (p.startsWith("ipfs/")) p = p.slice("ipfs/".length);
    return `${gw}${p}`;
  }

  if (s.startsWith("bafy") || s.startsWith("Qm")) {
    return `${gw}${s}`;
  }

  return s;
}

async function loadMetadataFromTokenUri(tokenUri: string): Promise<any | null> {
  for (const gw of IPFS_GATEWAYS) {
    const url = ipfsToHttp(tokenUri, gw);
    if (!url) continue;

    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) continue;
      const j = await r.json().catch(() => null);
      if (j && typeof j === "object") return j;
    } catch {
      //
    }
  }

  return null;
}

function normalizeTokenIdValue(v: unknown): string | null {
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "number") return String(v);
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function extractMintTokenIdFromReceipt(
  receipt: any,
  mode: ActiveMintMode,
  contract?: `0x${string}`
): string | null {
  const logs = receipt?.logs ?? [];

  for (const log of logs) {
    try {
      if (contract && log?.address?.toLowerCase?.() !== contract.toLowerCase()) {
        continue;
      }

      if (mode === "delivery") {
        const decoded = decodeEventLog({
          abi: realife1155DeliveryAbi,
          data: log.data,
          topics: log.topics,
        }) as { eventName?: string; args?: any };

        if (
          decoded.eventName === "ProductCreated" ||
          decoded.eventName === "EditionCreated" ||
          decoded.eventName === "DeliveryEditionCreated"
        ) {
          const args = decoded.args;
          return (
            normalizeTokenIdValue(args?.tokenId) ||
            normalizeTokenIdValue(args?.id) ||
            normalizeTokenIdValue(args?.editionId) ||
            normalizeTokenIdValue(args?.[0])
          );
        }
      } else {
        const decoded = decodeEventLog({
          abi: realife1155Abi,
          data: log.data,
          topics: log.topics,
        }) as { eventName?: string; args?: any };

        if (decoded.eventName === "EditionCreated") {
          const args = decoded.args;
          return (
            normalizeTokenIdValue(args?.tokenId) ||
            normalizeTokenIdValue(args?.id) ||
            normalizeTokenIdValue(args?.editionId) ||
            normalizeTokenIdValue(args?.[0])
          );
        }
      }
    } catch {
      //
    }
  }

  return null;
}

function humanOfferType(v: OfferType) {
  if (v === "physical_product") return "Physical product";
  if (v === "digital_service") return "Digital service";
  if (v === "online_session") return "Online session";
  if (v === "local_service") return "Local service";
  return "Collectible / standard NFT";
}

function humanFulfillmentType(v: FulfillmentType) {
  if (v === "PHYSICAL_GOOD") return "Physical good";
  if (v === "DIGITAL_SERVICE") return "Digital service";
  if (v === "ONLINE_SESSION") return "Online session";
  if (v === "LOCAL_SERVICE") return "Local service";
  return "Standard NFT";
}

function humanSuggestedMarketType(v: SuggestedMarketType) {
  return v === "protected" ? "Protected marketplace" : "Standard marketplace";
}

function inferFulfillmentType(params: {
  deliveryMode: DeliveryMode;
  offerType: OfferType;
}): FulfillmentType {
  const { deliveryMode, offerType } = params;

  if (deliveryMode === "delivery") return "PHYSICAL_GOOD";
  if (offerType === "digital_service") return "DIGITAL_SERVICE";
  if (offerType === "online_session") return "ONLINE_SESSION";
  if (offerType === "local_service") return "LOCAL_SERVICE";

  return null;
}

function inferSuggestedMarketType(params: {
  deliveryMode: DeliveryMode;
  offerType: OfferType;
  fulfillmentType: FulfillmentType;
}): SuggestedMarketType {
  const { deliveryMode, offerType, fulfillmentType } = params;

  if (deliveryMode === "delivery") return "protected";
  if (fulfillmentType) return "protected";

  // Physical product without delivery stays standard in current Realife routing
  // until seller explicitly uses delivery-enabled flow.
  if (offerType === "physical_product") return "standard";

  return "standard";
}

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

/* ---------------- UI ---------------- */

function Pill({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/70 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
      {children}
    </div>
  );
}

function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-[28px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.26),rgba(212,175,55,0.12),rgba(184,135,10,0.08))]",
        "shadow-[0_26px_100px_rgba(0,0,0,0.55)]",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "relative overflow-hidden rounded-[28px]",
          "border border-white/10 bg-[#0b0a09]/55 backdrop-blur-2xl",
          "ring-1 ring-black/10",
          "before:pointer-events-none before:absolute before:inset-0",
          "before:bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.10),transparent_45%)]",
          "after:pointer-events-none after:absolute after:inset-0",
          "after:bg-[radial-gradient(circle_at_85%_115%,rgba(255,255,255,0.06),transparent_55%)]",
        ].join(" ")}
      >
        <div className="relative z-10 p-6">{children}</div>
      </div>
    </div>
  );
}

function GoldButton({
  children,
  disabled,
  onClick,
  className = "",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "relative w-full inline-flex items-center justify-center overflow-hidden",
        "px-10 py-4 rounded-2xl",
        "text-black font-extrabold tracking-tight",
        "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
        "shadow-[0_22px_70px_rgba(212,175,55,0.18)]",
        "ring-1 ring-black/15",
        "transition duration-300 hover:brightness-110 hover:-translate-y-px",
        "active:translate-y-0",
        "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:brightness-100",
        "before:absolute before:inset-0 before:bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.35),transparent)]",
        "before:translate-x-[-140%] hover:before:translate-x-[140%] before:transition before:duration-700",
        className,
      ].join(" ")}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
}

function GhostButton({
  children,
  disabled,
  onClick,
  className = "",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "w-full inline-flex items-center justify-center",
        "px-10 py-4 rounded-2xl",
        "border border-white/15 bg-white/[0.06] text-white font-extrabold",
        "backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)]",
        "transition duration-300 hover:bg-white/10 hover:-translate-y-px",
        "active:translate-y-0",
        "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("Failed to read file"));
    fr.onload = () => resolve(String(fr.result || ""));
    fr.readAsDataURL(file);
  });
}

async function imageFileToOptimizedDataUrl(
  file: File,
  maxSide = 1280,
  quality = 0.86
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return readFileAsDataUrl(file);
  }

  const src = await readFileAsDataUrl(file);

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Failed to decode image"));
    el.src = src;
  });

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return src;

  const scale = Math.min(1, maxSide / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;

  const ctx = canvas.getContext("2d");
  if (!ctx) return src;

  ctx.drawImage(img, 0, 0, tw, th);

  return canvas.toDataURL("image/jpeg", quality);
}

function Stepper({
  mounted,
  connected,
  wrongNetwork,
  hasGas,
  tokenURI,
  txHash,
  step,
  isMining,
  isSuccess,
  mintFeeWei,
  approvedPhysicalSeller,
  deliveryMode,
  activeMintMode,
  deliveryOnchainApproved,
  deliveryAccessLoading,
  offerType,
  fulfillmentType,
  suggestedMarketType,
}: {
  mounted: boolean;
  connected: boolean;
  wrongNetwork: boolean;
  hasGas: boolean;
  tokenURI: string | null;
  txHash?: `0x${string}` | undefined;
  step: "idle" | "preparing" | "signing" | "mining";
  isMining: boolean;
  isSuccess: boolean;
  mintFeeWei: bigint;
  approvedPhysicalSeller: boolean;
  deliveryMode: DeliveryMode;
  activeMintMode: ActiveMintMode;
  deliveryOnchainApproved: boolean;
  deliveryAccessLoading: boolean;
  offerType: OfferType;
  fulfillmentType: FulfillmentType;
  suggestedMarketType: SuggestedMarketType;
}) {
  const stage = useMemo(() => {
    if (!mounted) return 0;
    if (!connected) return 0;
    if (wrongNetwork) return 0;
    if (step === "preparing") return 1;
    if (tokenURI) return 1;
    if (step === "signing") return 2;
    if (step === "mining" || isMining) return 3;
    if (isSuccess) return 4;
    return 0;
  }, [mounted, connected, wrongNetwork, step, tokenURI, isMining, isSuccess]);

  const items = [
    {
      k: "prepare",
      n: "01",
      t: "Prepare",
      d: "Upload → IPFS",
      ok: Boolean(tokenURI),
      active: stage === 1 && !isSuccess,
    },
    {
      k: "sign",
      n: "02",
      t: "Sign",
      d: "Wallet signature",
      ok: step !== "idle" && (stage >= 2 || isMining || isSuccess),
      active: stage === 2 && !isSuccess,
    },
    {
      k: "mint",
      n: "03",
      t: "Create Edition",
      d: "Tx mining",
      ok: Boolean(txHash) && (isMining || isSuccess || stage >= 3),
      active: stage === 3 && !isSuccess,
    },
    {
      k: "verify",
      n: "04",
      t: "Verify",
      d: "Explorer proof",
      ok: isSuccess,
      active: stage === 4 || isSuccess,
    },
  ] as const;

  const locked = !mounted || !connected || wrongNetwork;

  return (
    <Card className="lg:col-span-2">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
              Public Mint Flow
            </Pill>

            <Pill>
              <span className="text-white/80 font-extrabold">
                Edition (ERC-1155)
              </span>
            </Pill>

            <Pill>
              <span className="text-white/70">Offer path:</span>
              <span className="text-white font-extrabold">
                {humanOfferType(offerType)}
              </span>
            </Pill>

            <Pill>
              <span className="text-white/70">NFT class:</span>
              <span className="text-white font-extrabold">
                {humanFulfillmentType(fulfillmentType)}
              </span>
            </Pill>

            <Pill>
              <span className="text-white/70">Mode:</span>
              <span className="text-white font-extrabold">
                {deliveryMode === "delivery"
                  ? "With delivery"
                  : "Without delivery"}
              </span>
            </Pill>

            <Pill>
              <span className="text-white/70">Mint contract:</span>
              <span className="text-white font-extrabold">
                {activeMintMode === "delivery" ? "Delivery" : "Standard"}
              </span>
            </Pill>

            <Pill>
              <span className="text-white/70">Later listing:</span>
              <span className="text-amber-200 font-extrabold">
                {humanSuggestedMarketType(suggestedMarketType)}
              </span>
            </Pill>

            <Pill>
              <span className="text-white/70">Delivery DB access:</span>
              <span
                className={
                  approvedPhysicalSeller
                    ? "text-emerald-200 font-extrabold"
                    : "text-white/70 font-extrabold"
                }
              >
                {approvedPhysicalSeller ? "Approved" : "Standard"}
              </span>
            </Pill>

            {deliveryMode === "delivery" ? (
              <Pill>
                <span className="text-white/70">On-chain allowlist:</span>
                <span
                  className={
                    deliveryAccessLoading
                      ? "text-white font-extrabold"
                      : deliveryOnchainApproved
                      ? "text-emerald-200 font-extrabold"
                      : "text-rose-200 font-extrabold"
                  }
                >
                  {deliveryAccessLoading
                    ? "Checking"
                    : deliveryOnchainApproved
                    ? "Granted"
                    : "Missing"}
                </span>
              </Pill>
            ) : null}

            <Pill>
              <span className="text-white/70">Fee:</span>
              <span className="text-amber-200 font-extrabold">
                {mintFeeWei > 0n
                  ? `${fmtEth(formatUnits(mintFeeWei, 18))} ETH`
                  : "0"}
              </span>
            </Pill>
          </div>

          <div className="mt-3 text-sm md:text-base font-extrabold tracking-tight">
            {locked
              ? !mounted
                ? "Connect wallet to start"
                : !connected
                ? "Connect wallet to start"
                : "Switch to Base Sepolia"
              : isSuccess
              ? "Created — verified on-chain"
              : step === "preparing"
              ? "Preparing metadata on IPFS…"
              : step === "signing"
              ? "Waiting for wallet signature…"
              : step === "mining" || isMining
              ? "Creating edition on-chain (mining)…"
              : tokenURI
              ? hasGas
                ? "Ready to sign & create edition"
                : "Get test ETH to create"
              : "Prepare your NFT"}
          </div>

          <div className="mt-2 text-[11px] text-white/60 leading-relaxed">
            Mint rewards:{" "}
            <span className="text-amber-200 font-extrabold">+10 points</span>{" "}
            per mint.
            <span className="text-white/45">
              {" "}
              Editions support supply 1..10000.
            </span>
          </div>

          <div className="mt-2 text-[11px] text-white/55 leading-relaxed">
            This page chooses the{" "}
            <span className="text-white/75 font-semibold">mint contract</span>{" "}
            and writes NFT classification into metadata.
            <span className="text-white/45">
              {" "}
              Marketplace routing is handled later by the platform when you list
              the NFT.
            </span>
          </div>

          <div className="mt-2 text-[11px] text-white/55 leading-relaxed">
            {deliveryMode === "delivery" ? (
              approvedPhysicalSeller ? (
                deliveryAccessLoading ? (
                  <>Delivery wallet access is being checked on-chain…</>
                ) : deliveryOnchainApproved ? (
                  <>
                    Delivery mode is enabled for this wallet. The NFT will be
                    minted through the restricted delivery mint contract and
                    later should use protected delivery / trust flow.
                  </>
                ) : (
                  <>
                    Your app profile is approved, but the wallet is not yet
                    allowlisted on-chain for the delivery mint contract.
                  </>
                )
              ) : (
                <>
                  Delivery mode is reserved for approved seller wallets. Switch
                  to <span className="text-white/75 font-semibold">Without delivery</span>.
                </>
              )
            ) : suggestedMarketType === "protected" ? (
              <>
                This NFT is classified as{" "}
                <span className="text-white/75 font-semibold">
                  {humanFulfillmentType(fulfillmentType)}
                </span>
                . It still mints through the standard public mint contract, but
                later the platform can route it to the{" "}
                <span className="text-white/75 font-semibold">
                  Protected marketplace
                </span>
                .
              </>
            ) : offerType === "physical_product" ? (
              <>
                This looks like a physical product, but since delivery mode is
                not enabled it will still mint through the standard public mint
                flow. Turn on delivery later only if this wallet is approved.
              </>
            ) : (
              <>
                Standard collectible/public NFT flow is active. This edition
                will mint through the standard public mint contract and later
                fits the normal standard marketplace flow.
              </>
            )}
          </div>

          <div className="mt-2 text-[11px] text-white/55 leading-relaxed">
            {locked ? (
              wrongNetwork ? (
                <>
                  Wrong network — switch to{" "}
                  <span className="text-white/75 font-semibold">
                    Base Sepolia
                  </span>
                  .
                </>
              ) : (
                <>Connect wallet and follow the flow: Prepare → Sign → Create → Verify.</>
              )
            ) : hasGas ? (
              <>
                Gas is OK. If you already prepared metadata — press{" "}
                <span className="text-white/75 font-semibold">
                  Create Edition
                </span>
                .
              </>
            ) : (
              <>
                No gas on Base Sepolia.{" "}
                <Link
                  href="/app/faucet"
                  className="text-[#d4af37] font-semibold hover:brightness-110 transition"
                >
                  Faucet ↗
                </Link>{" "}
                then refresh.
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 hidden md:flex flex-col items-end gap-2">
          <div
            className={[
              "px-3 py-1.5 rounded-full border text-[11px] font-semibold",
              locked
                ? "border-white/10 bg-white/[0.06] text-white/60"
                : hasGas
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/20 bg-rose-500/10 text-rose-200",
            ].join(" ")}
          >
            {locked ? "Locked" : hasGas ? "Gas OK" : "No gas"}
          </div>

          {txHash ? (
            <a
              href={`https://sepolia.basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-[#d4af37] hover:brightness-110 transition"
            >
              View tx ↗
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        {items.map((it, idx) => {
          const isActive = it.active;
          const isOk = it.ok;
          const isDisabled = locked && idx > 0;

          return (
            <div
              key={it.k}
              className={[
                "relative rounded-3xl border overflow-hidden",
                "bg-[linear-gradient(180deg,rgba(0,0,0,0.30),rgba(0,0,0,0.22))]",
                isActive ? "border-white/20" : "border-white/10",
                "shadow-[0_18px_70px_rgba(0,0,0,0.30)]",
              ].join(" ")}
            >
              <div className="relative p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={[
                        "h-9 w-9 rounded-2xl flex items-center justify-center font-black text-xs shrink-0",
                        isOk
                          ? "text-black bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]"
                          : "text-white bg-white/[0.06] border border-white/10",
                      ].join(" ")}
                    >
                      {isOk ? "✓" : it.n}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold tracking-tight truncate">
                        {it.t}
                      </div>
                      <div className="text-[11px] text-white/55 truncate">
                        {it.d}
                      </div>
                    </div>
                  </div>

                  <div
                    className={[
                      "text-[11px] font-semibold px-2 py-1 rounded-full border",
                      isDisabled
                        ? "border-white/10 bg-white/[0.06] text-white/45"
                        : isActive
                        ? "border-white/15 bg-white/[0.08] text-white/75"
                        : "border-white/10 bg-white/[0.06] text-white/55",
                    ].join(" ")}
                  >
                    {isDisabled ? "Locked" : isOk ? "Done" : isActive ? "Now" : "Next"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function MintForm() {
  const mounted = useMounted();
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const posterInputRef = useRef<HTMLInputElement | null>(null);
  const pushedRef = useRef(false);

  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();

  const connected = mounted ? isConnected : false;
  const effectiveChainId = mounted ? chainId : undefined;

  const {
    data: balanceData,
    isLoading: isBalanceLoading,
    isFetching: isBalanceFetching,
    refetch: refetchBalance,
  } = useBalance({
    address,
    chainId: baseSepolia.id,
    query: { enabled: Boolean(address), refetchInterval: 12_000 },
  });

  const balanceEth = useMemo(() => {
    if (!mounted || !balanceData) return 0;
    const s = formatUnits(balanceData.value, balanceData.decimals);
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }, [mounted, balanceData]);

  const balanceLabel = useMemo(() => {
    if (!mounted || !connected) return "—";
    if (isBalanceLoading) return "loading…";
    if (!balanceData)
      return `0 ${baseSepolia.nativeCurrency?.symbol ?? "ETH"}`;
    const s = formatUnits(balanceData.value, balanceData.decimals);
    return `${fmtEth(s)} ${balanceData.symbol ?? "ETH"}`;
  }, [mounted, connected, isBalanceLoading, balanceData]);

  const wrongNetwork = connected && effectiveChainId !== baseSepolia.id;
  const hasGas = connected && !wrongNetwork && balanceEth > 0;

  const [approvedPhysicalSeller, setApprovedPhysicalSeller] = useState(false);
  const [approvedPhysicalAt, setApprovedPhysicalAt] = useState<string | null>(
    null
  );
  const [approvedPhysicalNote, setApprovedPhysicalNote] = useState("");
  const [meLoaded, setMeLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      setMeLoaded(false);

      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = await res.json().catch(() => null);

        if (cancelled) return;

        if (res.ok && data?.ok && data?.user) {
          setApprovedPhysicalSeller(Boolean(data.user.approvedPhysicalSeller));
          setApprovedPhysicalAt(
            data.user.approvedPhysicalAt
              ? String(data.user.approvedPhysicalAt)
              : null
          );
          setApprovedPhysicalNote(String(data.user.approvedPhysicalNote || ""));
        } else {
          setApprovedPhysicalSeller(false);
          setApprovedPhysicalAt(null);
          setApprovedPhysicalNote("");
        }
      } catch {
        if (!cancelled) {
          setApprovedPhysicalSeller(false);
          setApprovedPhysicalAt(null);
          setApprovedPhysicalNote("");
        }
      } finally {
        if (!cancelled) setMeLoaded(true);
      }
    }

    if (mounted) loadMe();

    return () => {
      cancelled = true;
    };
  }, [mounted, address]);

  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);

  const [project, setProject] = useState<(typeof PROJECTS)[number]>("Realife");

  const [offerType, setOfferType] = useState<OfferType>("collectible");
  const [searchCategory, setSearchCategory] = useState<string>("Other");
  const [subcategory, setSubcategory] = useState("");
  const [itemLabel, setItemLabel] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("none");

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [supply, setSupply] = useState<number>(1);
  const [proofUrl, setProofUrl] = useState("");

  const [step, setStep] = useState<"idle" | "preparing" | "signing" | "mining">(
    "idle"
  );
  const [error, setError] = useState("");

  const [tokenURI, setTokenURI] = useState<string | null>(null);
  const [preparedKind, setPreparedKind] = useState<"image" | "video">("image");
  const [preparedMedia, setPreparedMedia] = useState<string | null>(null);
  const [preparedPoster, setPreparedPoster] = useState<string | null>(null);
  const [previewCategory, setPreviewCategory] = useState<string>("Other");

  const [submittedMintMode, setSubmittedMintMode] =
    useState<ActiveMintMode>("standard");
  const [submittedMintContract, setSubmittedMintContract] = useState<
    `0x${string}` | undefined
  >(undefined);

  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const selectedCategoryLabel = useMemo(
    () => (searchCategory?.trim() ? searchCategory.trim() : "Other"),
    [searchCategory]
  );

  const fulfillmentType = useMemo<FulfillmentType>(
    () =>
      inferFulfillmentType({
        deliveryMode,
        offerType,
      }),
    [deliveryMode, offerType]
  );

  const suggestedMarketType = useMemo<SuggestedMarketType>(
    () =>
      inferSuggestedMarketType({
        deliveryMode,
        offerType,
        fulfillmentType,
      }),
    [deliveryMode, offerType, fulfillmentType]
  );

  const pickedKind = useMemo<"image" | "video">(
    () => (file?.type?.startsWith("video/") ? "video" : "image"),
    [file]
  );

  const effectivePreviewKind = tokenURI ? preparedKind : pickedKind;
  const effectivePreviewSrc = tokenURI
    ? preparedMedia || filePreviewUrl
    : filePreviewUrl;
  const effectivePoster = tokenURI ? preparedPoster : posterPreviewUrl;

  const isDeliveryMode = deliveryMode === "delivery";
  const activeMintMode: ActiveMintMode = isDeliveryMode ? "delivery" : "standard";
  const activeMintContract =
    activeMintMode === "delivery" ? CONTRACT_1155_DELIVERY : CONTRACT_1155_STANDARD;
  const activeMintAbi =
    activeMintMode === "delivery" ? realife1155DeliveryAbi : realife1155Abi;
  const activeMintEnvName =
    activeMintMode === "delivery"
      ? "NEXT_PUBLIC_REALIFE_1155_DELIVERY_CONTRACT"
      : "NEXT_PUBLIC_REALIFE_1155_NEW_CONTRACT";

  const { data: mintFeeWeiRaw } = useReadContract({
    address: activeMintContract,
    abi: activeMintAbi as any,
    functionName: "mintFeeWei" as any,
    query: { enabled: Boolean(activeMintContract) },
  });

  const mintFeeWei = (typeof mintFeeWeiRaw === "bigint"
    ? mintFeeWeiRaw
    : 0n) as bigint;

  const {
    data: deliveryOnchainApprovedRaw,
    isLoading: isDeliveryAccessLoading,
    isFetching: isDeliveryAccessFetching,
    refetch: refetchDeliveryOnchainAccess,
  } = useReadContract({
    address: CONTRACT_1155_DELIVERY,
    abi: realife1155DeliveryAbi as any,
    functionName: "allowedDeliveryMinters" as any,
    args: [((address || ZERO_ADDRESS) as `0x${string}`)],
    query: { enabled: Boolean(CONTRACT_1155_DELIVERY && address) },
  });

  const deliveryOnchainApproved = Boolean(deliveryOnchainApprovedRaw);

  const deliveryDbBlocked = isDeliveryMode && !approvedPhysicalSeller;
  const deliveryChainBlocked =
    isDeliveryMode &&
    Boolean(CONTRACT_1155_DELIVERY) &&
    Boolean(address) &&
    !isDeliveryAccessLoading &&
    !deliveryOnchainApproved;

  const deliveryBlocked = deliveryDbBlocked || deliveryChainBlocked;

  function resetPreparedState() {
    setTokenURI(null);
    setPreparedMedia(null);
    setPreparedPoster(null);
    setPreviewCategory("Other");
    setSubmittedMintMode("standard");
    setSubmittedMintContract(undefined);
    pushedRef.current = false;
    if (step !== "idle") setStep("idle");
  }

  useEffect(() => {
    if (!approvedPhysicalSeller && deliveryMode === "delivery") {
      setDeliveryMode("none");
      resetPreparedState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvedPhysicalSeller]);

  function onPickFile(f: File | null) {
    setError("");
    setAiError("");
    setAiSuggestion(null);
    resetPreparedState();

    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);

    setFile(f);
    setPosterFile(null);
    setPosterPreviewUrl(null);

    if (!f) {
      setFilePreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(f);
    setFilePreviewUrl(url);
  }

  function onPickPoster(f: File | null) {
    setError("");
    setAiError("");
    setAiSuggestion(null);
    resetPreparedState();

    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);

    setPosterFile(f);
    if (!f) {
      setPosterPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(f);
    setPosterPreviewUrl(url);
  }

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
      if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
    };
  }, [filePreviewUrl, posterPreviewUrl]);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function openPosterPicker() {
    posterInputRef.current?.click();
  }

  function applyAiSuggestion() {
    if (!aiSuggestion) return;

    setOfferType(aiSuggestion.offerType);
    setSearchCategory(aiSuggestion.category);
    if (!itemLabel.trim()) {
      setItemLabel(aiSuggestion.itemLabel);
    } else {
      setItemLabel(aiSuggestion.itemLabel);
    }
    setTagsText(aiSuggestion.tags.join(", "));
  }

  async function handleAiSuggest() {
    setAiError("");
    setAiSuggestion(null);

    const sourceFile =
      file?.type?.startsWith("image/")
        ? file
        : posterFile?.type?.startsWith("image/")
        ? posterFile
        : null;

    if (!sourceFile) {
      setAiError(
        file?.type?.startsWith("video/")
          ? "For video, upload a poster image first so AI can analyze the NFT visually."
          : "Upload an image first."
      );
      return;
    }

    setAiLoading(true);

    try {
      const imageDataUrl = await imageFileToOptimizedDataUrl(sourceFile, 1280, 0.86);

      const res = await fetch("/api/ai-suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          imageDataUrl,
          name: name.trim(),
          description: description.trim(),
          brand: brand.trim(),
          offerType,
          category: selectedCategoryLabel,
          subcategory: subcategory.trim(),
          itemLabel: itemLabel.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok || !data?.suggestion) {
        throw new Error(data?.error || "AI suggestion failed");
      }

      setAiSuggestion(data.suggestion as AiSuggestion);
    } catch (e: any) {
      setAiError(prettyError(e));
    } finally {
      setAiLoading(false);
    }
  }

  const { data: txHash, writeContractAsync, isPending: isWalletPromptOpen } =
    useWriteContract();

  const { isLoading: isMining, isSuccess, data: receipt } =
    useWaitForTransactionReceipt({
      hash: txHash,
      query: { enabled: Boolean(txHash) },
    });

  useEffect(() => {
    if (!isSuccess || !receipt) return;
    if (pushedRef.current) return;

    pushedRef.current = true;

    (async () => {
      const finalName = name.trim() || "Untitled NFT";
      const finalCategory = previewCategory || selectedCategoryLabel;
      const targetMode = submittedMintMode;
      const targetContract = submittedMintContract;

      const tokenId = extractMintTokenIdFromReceipt(
        receipt,
        targetMode,
        targetContract
      );

      const posterOrImage =
        effectivePreviewKind === "video"
          ? persistableUrl(preparedPoster)
          : persistableUrl(preparedMedia);

      const mediaForQuery =
        persistableUrl(preparedMedia) || persistableUrl(filePreviewUrl);

      try {
        if (targetContract && tokenId) {
          const saveRes = await fetch("/api/mints", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              chainId: baseSepolia.id,
              contract: targetContract,
              tokenId,
              txHash: txHash || "",
              tokenUri: tokenURI || "",
              name: finalName,
              image: posterOrImage || null,
              verified: true,
              standard: "ERC1155",
              supply: clampSupply(supply),
              catalogOnly: false,
              deliveryEnabled: targetMode === "delivery",
              physicalItemIncluded: targetMode === "delivery",
              officialItem: false,
              category: finalCategory,
              subcategory: subcategory.trim() || null,
              fulfillmentType,
              suggestedMarketType,
            }),
          });

          if (!saveRes.ok) {
            const saveData = await saveRes.json().catch(() => null);
            console.warn("[PUBLIC_MINT_SAVE_WARNING]", saveData || saveRes.status);
          }
        }
      } catch (e) {
        console.warn("[PUBLIC_MINT_SAVE_ERROR]", e);
      }

      const qp = new URLSearchParams();
      qp.set("name", finalName);
      qp.set("image", posterOrImage || "");
      qp.set("media", mediaForQuery || "");
      qp.set("kind", effectivePreviewKind);
      qp.set("category", finalCategory);
      qp.set("subcategory", subcategory.trim());
      qp.set("project", project);
      qp.set("itemType", itemLabel.trim() || humanOfferType(offerType));
      qp.set("brand", brand.trim());
      qp.set("delivery", targetMode === "delivery" ? "1" : "0");
      qp.set("market", suggestedMarketType);
      qp.set("fulfillmentType", fulfillmentType || "");
      qp.set("tx", txHash || "");
      qp.set("tokenId", tokenId || "");
      qp.set("standard", "ERC1155");
      qp.set("contract", targetContract || "");

      router.push(`/app/success?${qp.toString()}`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, receipt]);

  async function ensureCorrectNetwork() {
    if (!connected) {
      openConnectModal?.();
      throw new Error("Connect wallet first.");
    }
    if (effectiveChainId !== baseSepolia.id) {
      await switchChainAsync({ chainId: baseSepolia.id });
    }
  }

  const requiredContractOk = Boolean(activeMintContract);
  const canPrepare =
    Boolean(file) && Boolean(name.trim()) && requiredContractOk && !deliveryBlocked;
  const canMint = Boolean(tokenURI) && requiredContractOk && !deliveryBlocked;
  const busy = step !== "idle" || isWalletPromptOpen || isMining || isSwitching;

  async function handlePrepare() {
    setError("");

    if (!activeMintContract) {
      setError(`Missing ${activeMintEnvName} in Railway/ENV`);
      return;
    }

    if (deliveryDbBlocked) {
      setError("Delivery mode is available only for approved seller wallets.");
      return;
    }

    if (deliveryChainBlocked) {
      setError(
        "This wallet is not allowlisted on-chain for the delivery mint contract."
      );
      return;
    }

    if (!file) {
      setError("Please upload a file (photo/video/design).");
      return;
    }

    if (!name.trim()) {
      setError("NFT name is required.");
      return;
    }

    setStep("preparing");

    try {
      const formData = new FormData();
      formData.append("file", file);

      if (file.type.startsWith("video/") && posterFile) {
        formData.append("poster", posterFile);
      }

      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("project", project);
      formData.append("category", selectedCategoryLabel);
      formData.append("subcategory", subcategory.trim());
      formData.append("itemType", itemLabel.trim() || humanOfferType(offerType));
      formData.append("brand", brand.trim());
      formData.append("deliveryMode", deliveryMode);
      formData.append("deliveryEnabled", isDeliveryMode ? "true" : "false");
      formData.append(
        "physicalItemIncluded",
        isDeliveryMode ? "true" : "false"
      );
      formData.append("offerType", offerType);
      formData.append("tags", tagsText.trim());
      formData.append("fulfillmentType", fulfillmentType || "");
      formData.append("suggestedMarketType", suggestedMarketType);
      formData.append("supply", String(clampSupply(supply)));
      formData.append("proofUrl", proofUrl.trim());

      const res = await fetch(PREPARE_URL, { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Mint preparation failed");
      }

      const uri = data?.metadataUri || data?.tokenURI || data?.tokenUri || null;
      if (!uri || typeof uri !== "string") {
        throw new Error("Backend didn't return metadataUri/tokenURI");
      }

      setTokenURI(uri);

      const pKind: "image" | "video" =
        data?.preview?.kind === "video"
          ? "video"
          : data?.preview?.kind === "image"
          ? "image"
          : pickedKind;

      const pMedia =
        ipfsToHttp(data?.preview?.media || null, IPFS_GATEWAYS[0]) || null;
      const pPoster =
        ipfsToHttp(data?.preview?.poster || null, IPFS_GATEWAYS[0]) || null;

      setPreparedKind(pKind);
      setPreparedMedia(pMedia || filePreviewUrl);
      setPreparedPoster(pKind === "video" ? pPoster : null);

      const meta = await loadMetadataFromTokenUri(uri);
      const metaImage = typeof meta?.image === "string" ? meta.image : null;
      const metaAnim =
        typeof meta?.animation_url === "string" ? meta.animation_url : null;

      if (metaAnim) {
        setPreparedKind("video");
        setPreparedMedia(
          ipfsToHttp(metaAnim, IPFS_GATEWAYS[0]) || pMedia || filePreviewUrl
        );
        setPreparedPoster(
          ipfsToHttp(metaImage, IPFS_GATEWAYS[0]) || pPoster || null
        );
      } else if (metaImage) {
        setPreparedKind("image");
        setPreparedMedia(
          ipfsToHttp(metaImage, IPFS_GATEWAYS[0]) || pMedia || filePreviewUrl
        );
        setPreparedPoster(null);
      }

      setPreviewCategory(data?.preview?.category || selectedCategoryLabel);
      setStep("idle");
    } catch (e: any) {
      setError(prettyError(e));
      setStep("idle");
    }
  }

  async function handleOnchainCreate() {
    setError("");

    if (!tokenURI) {
      setError("First click: Prepare (Upload → IPFS).");
      return;
    }

    if (!activeMintContract) {
      setError(`Missing ${activeMintEnvName} in Railway/ENV`);
      return;
    }

    if (activeMintMode === "delivery") {
      if (!approvedPhysicalSeller) {
        setError("Delivery mode is available only for approved seller wallets.");
        return;
      }

      const freshAllowed = await refetchDeliveryOnchainAccess();
      if (!freshAllowed.data) {
        setError(
          "This wallet is not allowlisted on-chain for the delivery mint contract."
        );
        return;
      }
    }

    try {
      await ensureCorrectNetwork();

      const freshBalance = await refetchBalance();
      if (freshBalance.data?.value === 0n) {
        setError(
          "No gas on Base Sepolia. Open Faucet, get test ETH, then create."
        );
        return;
      }

      pushedRef.current = false;
      setSubmittedMintMode(activeMintMode);
      setSubmittedMintContract(activeMintContract);
      setStep("signing");

      const amount = BigInt(clampSupply(supply));

      const hash =
        activeMintMode === "delivery"
          ? await writeContractAsync({
              address: activeMintContract,
              abi: realife1155DeliveryAbi as any,
              functionName: "createDeliveryEdition" as any,
              args: [amount, tokenURI],
              value: mintFeeWei > 0n ? mintFeeWei : undefined,
            })
          : await writeContractAsync({
              address: activeMintContract,
              abi: realife1155Abi as any,
              functionName: "createEdition" as any,
              args: [amount, tokenURI],
              value: mintFeeWei > 0n ? mintFeeWei : undefined,
            });

      if (hash) setStep("mining");
    } catch (e: any) {
      setError(prettyError(e));
      setSubmittedMintMode("standard");
      setSubmittedMintContract(undefined);
      setStep("idle");
    }
  }

  const refreshLabel = !mounted
    ? "Refresh"
    : isBalanceFetching
    ? "Refreshing…"
    : "Refresh";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <Stepper
        mounted={mounted}
        connected={connected}
        wrongNetwork={wrongNetwork}
        hasGas={hasGas}
        tokenURI={tokenURI}
        txHash={txHash}
        step={step}
        isMining={isMining}
        isSuccess={isSuccess}
        mintFeeWei={mintFeeWei}
        approvedPhysicalSeller={approvedPhysicalSeller}
        deliveryMode={deliveryMode}
        activeMintMode={activeMintMode}
        deliveryOnchainApproved={deliveryOnchainApproved}
        deliveryAccessLoading={
          isDeliveryAccessLoading || isDeliveryAccessFetching
        }
        offerType={offerType}
        fulfillmentType={fulfillmentType}
        suggestedMarketType={suggestedMarketType}
      />

      <div className="space-y-8">
        <Card>
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Select project
              </div>
              <div className="text-[11px] text-white/55 mt-1">
                Choose the context for your mint.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Required
            </Pill>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PROJECTS.map((p) => {
              const active = project === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    resetPreparedState();
                    setProject(p);
                  }}
                  className={[
                    "px-4 py-2.5 rounded-2xl border text-sm font-extrabold transition",
                    "shadow-[0_16px_40px_rgba(0,0,0,0.35)]",
                    active
                      ? "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black border-black/10 ring-1 ring-black/10"
                      : "bg-white/[0.06] border-white/10 hover:bg-white/10 text-white",
                  ].join(" ")}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Upload your file
              </div>
              <div className="text-[11px] text-white/55 mt-1">
                Photo / video / design / product image.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Required
            </Pill>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,video/*"
            onChange={(e) => onPickFile(e.target.files?.[0] || null)}
          />

          <div
            role="button"
            tabIndex={0}
            onClick={openFilePicker}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") openFilePicker();
            }}
            className={[
              "relative overflow-hidden rounded-[26px] border-2 border-dashed",
              "border-white/15 bg-white/[0.04]",
              "p-6 cursor-pointer transition",
              "hover:bg-white/[0.06] hover:border-white/25",
            ].join(" ")}
          >
            <div className="relative flex gap-5 items-center">
              <div className="w-28 h-28 rounded-2xl bg-white/[0.06] border border-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow-[0_18px_70px_rgba(0,0,0,0.30)]">
                {effectivePreviewSrc ? (
                  <NftMedia
                    src={effectivePreviewSrc}
                    kind={effectivePreviewKind}
                    alt="Preview"
                    poster={
                      effectivePreviewKind === "video" ? effectivePoster : null
                    }
                    showControls={effectivePreviewKind === "video"}
                    className="h-full w-full"
                    roundedClass="rounded-2xl"
                  />
                ) : (
                  <div className="text-xs text-center text-white/60 px-3">
                    {file ? "Preview" : "Click to upload"}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold mb-1">
                  Premium media upload
                </p>
                <p className="text-xs text-white/60 leading-relaxed">
                  Click to upload. Video supported.
                </p>

                {file && (
                  <p className="mt-3 text-xs font-semibold truncate">
                    Selected:{" "}
                    <span className="text-white/70">{file.name}</span>
                  </p>
                )}

                {tokenURI && (
                  <p className="mt-3 text-xs">
                    ✅ Prepared tokenURI:{" "}
                    <span className="text-white/70 break-all">{tokenURI}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {file?.type?.startsWith("video/") ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-extrabold">Poster (thumbnail)</div>
                  <div className="mt-1 text-[11px] text-white/55">
                    Optional for mint preview, but recommended for AI suggestion.
                  </div>
                </div>
                <Pill>
                  <span className="h-2 w-2 rounded-full bg-white/60" />
                  Optional
                </Pill>
              </div>

              <input
                ref={posterInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => onPickPoster(e.target.files?.[0] || null)}
              />

              <div className="mt-4 flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl border border-white/10 bg-black/30 overflow-hidden flex items-center justify-center">
                  {posterPreviewUrl ? (
                    <img
                      src={posterPreviewUrl}
                      alt="Poster"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-white/45">No poster</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white/60">
                    {posterFile ? (
                      <span className="font-semibold text-white/80 truncate block">
                        {posterFile.name}
                      </span>
                    ) : (
                      "Upload an image thumbnail for your video."
                    )}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={openPosterPicker}
                      className="px-4 py-2 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 transition text-xs font-extrabold"
                    >
                      Choose poster
                    </button>
                    {posterFile ? (
                      <button
                        type="button"
                        onClick={() => onPickPoster(null)}
                        className="px-4 py-2 rounded-2xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.06] transition text-xs font-extrabold text-white/70"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                AI assistant
              </div>
              <div className="text-[11px] text-white/55 mt-1">
                Analyze the uploaded NFT image and suggest offer path, search
                category, item label and tags.
              </div>
            </div>

            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Smart assist
            </Pill>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <GhostButton
              disabled={aiLoading || !file}
              onClick={handleAiSuggest}
              className="md:w-auto md:px-6"
            >
              {aiLoading ? "Analyzing image…" : "Suggest with AI"}
            </GhostButton>

            {aiSuggestion ? (
              <GoldButton
                onClick={applyAiSuggestion}
                className="md:w-auto md:px-6"
              >
                Apply AI suggestion
              </GoldButton>
            ) : null}
          </div>

          {aiError ? (
            <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {aiError}
            </div>
          ) : null}

          {aiSuggestion ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Pill>
                  <span className="text-white/70">Offer:</span>
                  <span className="text-white font-extrabold">
                    {humanOfferType(aiSuggestion.offerType)}
                  </span>
                </Pill>

                <Pill>
                  <span className="text-white/70">Category:</span>
                  <span className="text-white font-extrabold">
                    {aiSuggestion.category}
                  </span>
                </Pill>

                <Pill>
                  <span className="text-white/70">Confidence:</span>
                  <span className="text-amber-200 font-extrabold">
                    {Math.round(aiSuggestion.confidence * 100)}%
                  </span>
                </Pill>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Suggested item
                  </div>
                  <div className="mt-2 text-sm font-extrabold text-white">
                    {aiSuggestion.itemLabel}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Suggested tags
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {aiSuggestion.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-bold text-white/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 text-[12px] leading-relaxed text-white/60">
                {aiSuggestion.summary}
              </div>

              {aiSuggestion.offerType === "physical_product" &&
              approvedPhysicalSeller &&
              deliveryMode !== "delivery" ? (
                <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-[12px] text-emerald-100">
                  AI thinks this looks like a physical product. Since this wallet
                  is approved, you can switch to <span className="font-black">With delivery</span>{" "}
                  to mint it in the delivery-enabled physical flow.
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>

        <Card>
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Offer path
              </div>
              <div className="text-[11px] text-white/55 mt-1">
                Main route that defines how the NFT should behave later.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Required
            </Pill>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {OFFER_TYPES.map((entry) => {
              const active = offerType === entry.value;

              return (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => {
                    resetPreparedState();
                    setOfferType(entry.value);
                  }}
                  className={cx(
                    "rounded-2xl border px-4 py-4 text-left transition shadow-[0_14px_50px_rgba(0,0,0,0.26)]",
                    active
                      ? "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black border-black/10 ring-1 ring-black/10"
                      : "bg-white/[0.06] border-white/10 hover:bg-white/10 text-white"
                  )}
                >
                  <div className="text-sm font-extrabold">{entry.title}</div>
                  <div
                    className={
                      active
                        ? "text-black/70 text-xs mt-1"
                        : "text-white/55 text-xs mt-1"
                    }
                  >
                    {entry.subtitle}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-3 text-xs text-white/60">
            Selected offer path:{" "}
            <span className="font-semibold text-white">
              {humanOfferType(offerType)}
            </span>
          </div>
        </Card>

        <Card>
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Search category
              </div>
              <div className="text-[11px] text-white/55 mt-1">
                Broad marketplace search bucket for filtering later.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-white/60" />
              Optional
            </Pill>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SEARCH_CATEGORIES.map((c) => {
              const active = searchCategory === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    resetPreparedState();
                    setSearchCategory(c);
                  }}
                  className={[
                    "flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border text-sm transition",
                    "shadow-[0_14px_50px_rgba(0,0,0,0.26)]",
                    active
                      ? "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black border-black/10 ring-1 ring-black/10"
                      : "bg-white/[0.06] border-white/10 hover:bg-white/10 text-white",
                  ].join(" ")}
                >
                  <span className="font-extrabold text-left">{c}</span>
                  <span
                    className={[
                      "w-5 h-5 rounded-md border flex items-center justify-center text-xs shrink-0",
                      active ? "border-black/35 bg-black/10" : "border-white/25",
                    ].join(" ")}
                  >
                    {active ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-white/60">
            Selected category:{" "}
            <span className="font-semibold text-white">{selectedCategoryLabel}</span>
          </p>
        </Card>

        <Card>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Subcategory / niche
              </div>
              <div className="text-[11px] text-white/55 mt-1">
                Optional precision for routing and buyer search later.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-white/60" />
              Optional
            </Pill>
          </div>

          <input
            type="text"
            placeholder="Example: Yoga coach, Toy figure, Luxury T-shirt, Plumbing help, Landing page"
            value={subcategory}
            onChange={(e) => {
              resetPreparedState();
              setSubcategory(e.target.value);
            }}
            className={[
              "w-full rounded-2xl px-4 py-3 text-sm",
              "bg-white/[0.04] border border-white/10 text-white",
              "placeholder:text-white/35",
              "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-white/20",
            ].join(" ")}
          />
        </Card>

        <Card>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Item label
              </div>
              <div className="text-[11px] text-white/55 mt-1">
                Free text item name. AI can suggest it from the uploaded image.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Required
            </Pill>
          </div>

          <input
            type="text"
            placeholder="Example: Toy, Coffee bag, Consultation, Yoga session, Website, T-shirt"
            value={itemLabel}
            onChange={(e) => {
              resetPreparedState();
              setItemLabel(e.target.value);
            }}
            className={[
              "w-full rounded-2xl px-4 py-3 text-sm",
              "bg-white/[0.04] border border-white/10 text-white",
              "placeholder:text-white/35",
              "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-white/20",
            ].join(" ")}
          />

          <div className="mt-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
              Tags
            </div>
            <input
              type="text"
              placeholder="comma separated tags, optional"
              value={tagsText}
              onChange={(e) => {
                resetPreparedState();
                setTagsText(e.target.value);
              }}
              className={[
                "mt-2 w-full rounded-2xl px-4 py-3 text-sm",
                "bg-white/[0.04] border border-white/10 text-white",
                "placeholder:text-white/35",
                "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-white/20",
              ].join(" ")}
            />
          </div>
        </Card>

        <Card>
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Delivery option
              </div>
              <div className="text-[11px] text-white/55 mt-1">
                Choose whether this edition is standard or delivery-enabled.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Required
            </Pill>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setError("");
                resetPreparedState();
                setDeliveryMode("none");
              }}
              className={[
                "rounded-2xl border px-4 py-4 text-left transition shadow-[0_14px_50px_rgba(0,0,0,0.26)]",
                deliveryMode === "none"
                  ? "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black border-black/10 ring-1 ring-black/10"
                  : "bg-white/[0.06] border-white/10 hover:bg-white/10 text-white",
              ].join(" ")}
            >
              <div className="text-sm font-extrabold">Without delivery</div>
              <div
                className={
                  deliveryMode === "none"
                    ? "text-black/70 text-xs mt-1"
                    : "text-white/55 text-xs mt-1"
                }
              >
                Standard public mint. Includes normal collectibles and also
                service-style NFTs that can later route to Protected flow.
              </div>
            </button>

            <button
              type="button"
              disabled={!approvedPhysicalSeller}
              onClick={() => {
                if (!approvedPhysicalSeller) return;
                setError("");
                resetPreparedState();
                setDeliveryMode("delivery");
              }}
              className={[
                "rounded-2xl border px-4 py-4 text-left transition shadow-[0_14px_50px_rgba(0,0,0,0.26)]",
                !approvedPhysicalSeller
                  ? "bg-white/[0.03] border-white/10 text-white/45 cursor-not-allowed"
                  : deliveryMode === "delivery"
                  ? "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black border-black/10 ring-1 ring-black/10"
                  : "bg-white/[0.06] border-white/10 hover:bg-white/10 text-white",
              ].join(" ")}
            >
              <div className="text-sm font-extrabold">With delivery</div>
              <div
                className={
                  !approvedPhysicalSeller
                    ? "text-white/40 text-xs mt-1"
                    : deliveryMode === "delivery"
                    ? "text-black/70 text-xs mt-1"
                    : "text-white/55 text-xs mt-1"
                }
              >
                Delivery-enabled physical item flow. Available only for approved
                seller wallets.
              </div>
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/65">
            {meLoaded ? (
              <>
                <div>
                  Delivery DB access:{" "}
                  <span
                    className={
                      approvedPhysicalSeller
                        ? "text-emerald-200 font-extrabold"
                        : "text-white font-extrabold"
                    }
                  >
                    {approvedPhysicalSeller ? "approved" : "standard wallet"}
                  </span>
                  {approvedPhysicalAt ? (
                    <>
                      {" "}
                      • enabled at{" "}
                      <span className="text-white">
                        {new Date(approvedPhysicalAt).toLocaleString()}
                      </span>
                    </>
                  ) : null}
                  {approvedPhysicalNote ? (
                    <>
                      {" "}
                      • note:{" "}
                      <span className="text-white">{approvedPhysicalNote}</span>
                    </>
                  ) : null}
                </div>

                <div className="mt-2">
                  Delivery contract allowlist:{" "}
                  <span
                    className={
                      isDeliveryAccessLoading || isDeliveryAccessFetching
                        ? "text-white font-extrabold"
                        : deliveryOnchainApproved
                        ? "text-emerald-200 font-extrabold"
                        : "text-rose-200 font-extrabold"
                    }
                  >
                    {isDeliveryAccessLoading || isDeliveryAccessFetching
                      ? "checking…"
                      : deliveryOnchainApproved
                      ? "granted"
                      : "missing"}
                  </span>
                </div>

                {!approvedPhysicalSeller ? (
                  <div className="mt-2">
                    Mint with delivery is disabled until admin approval.
                  </div>
                ) : !deliveryOnchainApproved ? (
                  <div className="mt-2 text-rose-200">
                    Your profile is approved, but the wallet still needs
                    on-chain allowlist access for the delivery mint contract.
                  </div>
                ) : null}
              </>
            ) : (
              <>Checking delivery access…</>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Routing preview
              </div>
              <div className="text-[11px] text-white/55 mt-1">
                This does not mint into a marketplace. It only classifies the
                NFT so the platform can later choose the correct listing flow.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Auto
            </Pill>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/50 uppercase tracking-[0.16em]">
                Offer path
              </div>
              <div className="mt-2 text-sm font-extrabold text-white">
                {humanOfferType(offerType)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/50 uppercase tracking-[0.16em]">
                Mint contract
              </div>
              <div className="mt-2 text-sm font-extrabold text-white">
                {activeMintMode === "delivery"
                  ? "Delivery mint contract"
                  : "Standard mint contract"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/50 uppercase tracking-[0.16em]">
                NFT class
              </div>
              <div className="mt-2 text-sm font-extrabold text-white">
                {humanFulfillmentType(fulfillmentType)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] text-white/50 uppercase tracking-[0.16em]">
                Suggested listing
              </div>
              <div className="mt-2 text-sm font-extrabold text-amber-200">
                {humanSuggestedMarketType(suggestedMarketType)}
              </div>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-white/55 leading-relaxed">
            {deliveryMode === "delivery" ? (
              <>
                Delivery mode forces the NFT into the delivery-enabled physical
                item flow and later it should use protected escrow / trust
                mechanics.
              </>
            ) : suggestedMarketType === "protected" ? (
              <>
                Because this NFT is classified as{" "}
                <span className="text-white font-semibold">
                  {humanFulfillmentType(fulfillmentType)}
                </span>
                , later listing should go through protected escrow / trust flow.
              </>
            ) : offerType === "physical_product" ? (
              <>
                Physical product path is selected, but delivery is still off.
                So mint stays standard for now until seller uses delivery-enabled
                flow.
              </>
            ) : (
              <>
                This NFT looks like a normal collectible/public NFT, so later
                listing can use the standard marketplace.
              </>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Pill>
                <span
                  className={[
                    "h-2 w-2 rounded-full",
                    !mounted || !connected
                      ? "bg-white/30"
                      : wrongNetwork
                      ? "bg-rose-400"
                      : "bg-emerald-400",
                    "shadow-[0_0_0_6px_rgba(255,255,255,0.06)]",
                  ].join(" ")}
                />
                {mounted
                  ? connected
                    ? wrongNetwork
                      ? "Wrong network"
                      : "Base Sepolia"
                    : "Connect wallet"
                  : "Connect wallet"}
              </Pill>

              <div className="mt-3 text-sm font-extrabold tracking-tight">
                {mounted && connected
                  ? wrongNetwork
                    ? "Switch to Base Sepolia"
                    : hasGas
                    ? "Gas OK — ready to create"
                    : "No gas — request test ETH"
                  : "Connect wallet to create"}
              </div>

              <div className="mt-2 text-xs text-white/65">
                Balance:{" "}
                <span className="font-semibold text-white">{balanceLabel}</span>
              </div>

              <div className="mt-2 text-[11px] text-white/55 leading-relaxed">
                Create edition and earn{" "}
                <span className="text-amber-200 font-extrabold">+10 points</span>.
                <span className="text-white/45">
                  {" "}
                  Your editions will show in your gallery.
                </span>
              </div>

              <div className="mt-2 text-[11px] text-white/55 leading-relaxed">
                {mounted && connected ? (
                  <>
                    {wrongNetwork
                      ? "One click switch, then create."
                      : hasGas
                      ? "Prepare → sign → tx mined → success."
                      : "Open faucet, claim test ETH, then refresh."}{" "}
                    <Link
                      href="/app/faucet"
                      className="text-[#d4af37] font-semibold hover:brightness-110 transition"
                    >
                      Faucet ↗
                    </Link>
                  </>
                ) : (
                  <>
                    Connect wallet to enable switching, balance check and create.
                    <span className="text-white/45"> Public mint flow.</span>
                  </>
                )}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void refetchBalance();
                  void refetchDeliveryOnchainAccess();
                }}
                disabled={!mounted || !connected || isBalanceFetching}
                className="h-10 px-4 rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/10 transition text-xs font-extrabold disabled:opacity-40 shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
              >
                {refreshLabel}
              </button>

              {!mounted || !connected ? (
                <button
                  type="button"
                  onClick={() => openConnectModal?.()}
                  className="h-10 px-4 rounded-2xl bg-white text-black hover:bg-gray-100 transition text-xs font-extrabold shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                >
                  Connect
                </button>
              ) : wrongNetwork ? (
                <button
                  type="button"
                  disabled={isSwitching}
                  onClick={() =>
                    switchChainAsync({ chainId: baseSepolia.id }).catch(() => {})
                  }
                  className="h-10 px-4 rounded-2xl bg-white text-black hover:bg-gray-100 transition text-xs font-extrabold disabled:opacity-60 shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                >
                  {isSwitching ? "Switching…" : "Switch"}
                </button>
              ) : null}
            </div>
          </div>

          {!activeMintContract && (
            <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              Missing <b>{activeMintEnvName}</b> in Railway env
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                NFT name / Title
              </div>
              <div className="text-[11px] text-white/55 mt-1">
                Public title on-chain.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Required
            </Pill>
          </div>

          <input
            type="text"
            placeholder="Create a name for your NFT"
            value={name}
            onChange={(e) => {
              resetPreparedState();
              setName(e.target.value);
            }}
            className={[
              "w-full rounded-2xl px-4 py-3 text-sm",
              "bg-white/[0.04] border border-white/10 text-white",
              "placeholder:text-white/35",
              "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-white/20",
            ].join(" ")}
          />
        </Card>

        <Card>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Brand / Maker
              </div>
              <div className="text-[11px] text-white/55 mt-1">
                Brand, studio, creator mark or collection name.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-white/60" />
              Optional
            </Pill>
          </div>

          <input
            type="text"
            placeholder="Example: Atelier Realife / Custom Studio / Crypto Cafe / Fashion Brand"
            value={brand}
            onChange={(e) => {
              resetPreparedState();
              setBrand(e.target.value);
            }}
            className={[
              "w-full rounded-2xl px-4 py-3 text-sm",
              "bg-white/[0.04] border border-white/10 text-white",
              "placeholder:text-white/35",
              "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-white/20",
            ].join(" ")}
          />
        </Card>

        <Card>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Amount / Supply
              </div>
              <div className="text-[11px] text-white/55 mt-1">
                ERC-1155 editions: set supply.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-white/60" />
              Required
            </Pill>
          </div>

          <input
            type="number"
            min={1}
            max={10000}
            value={supply}
            onChange={(e) => {
              resetPreparedState();
              setSupply(clampSupply(Number(e.target.value)));
            }}
            className={[
              "w-full rounded-2xl px-4 py-3 text-sm",
              "bg-white/[0.04] border border-white/10 text-white",
              "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-white/20",
            ].join(" ")}
          />
        </Card>

        <Card>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Description
              </div>
              <div className="text-[11px] text-white/55 mt-1">
                Story builds credibility.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-white/60" />
              Optional
            </Pill>
          </div>

          <textarea
            placeholder="Tell the story of your work, product or service..."
            value={description}
            onChange={(e) => {
              resetPreparedState();
              setDescription(e.target.value);
            }}
            className={[
              "w-full rounded-2xl px-4 py-3 text-sm min-h-[160px]",
              "bg-white/[0.04] border border-white/10 text-white",
              "placeholder:text-white/35",
              "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-white/20",
              "resize-none",
            ].join(" ")}
          />
        </Card>

        <Card>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Proof / X link
              </div>
              <div className="text-[11px] text-white/55 mt-1">
                Optional proof URL.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-white/60" />
              Optional
            </Pill>
          </div>

          <input
            type="url"
            placeholder="https://x.com/yourpostlink"
            value={proofUrl}
            onChange={(e) => {
              resetPreparedState();
              setProofUrl(e.target.value);
            }}
            className={[
              "w-full rounded-2xl px-4 py-3 text-sm",
              "bg-white/[0.04] border border-white/10 text-white",
              "placeholder:text-white/35",
              "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-white/20",
            ].join(" ")}
          />
        </Card>

        {error && (
          <div className="rounded-[24px] border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
            {error}
          </div>
        )}

        <Card>
          <div className="space-y-3">
            <GhostButton disabled={busy || !canPrepare} onClick={handlePrepare}>
              {step === "preparing"
                ? "Uploading → IPFS (prepare)…"
                : "1) Prepare (Upload → IPFS)"}
            </GhostButton>

            <GoldButton disabled={busy || !canMint} onClick={handleOnchainCreate}>
              {step === "signing"
                ? "Waiting for wallet signature…"
                : step === "mining" || isMining
                ? "Creating on-chain (mining)…"
                : activeMintMode === "delivery"
                ? "2) Mint via delivery contract"
                : "2) Mint"}
            </GoldButton>
          </div>

          {mintFeeWei > 0n ? (
            <div className="mt-4 text-[11px] text-white/55">
              This contract requires fee:{" "}
              <span className="text-amber-200 font-extrabold">
                {fmtEth(formatUnits(mintFeeWei, 18))} ETH
              </span>
            </div>
          ) : null}

          <div className="mt-3 text-[11px] text-white/55 leading-relaxed">
            Current path:{" "}
            <span className="text-white font-semibold">
              {humanOfferType(offerType)}
            </span>
            {" · "}
            Mint contract:{" "}
            <span className="text-white font-semibold">
              {activeMintMode === "delivery" ? "Delivery" : "Standard"}
            </span>
            {" · "}
            NFT class:{" "}
            <span className="text-white font-semibold">
              {humanFulfillmentType(fulfillmentType)}
            </span>
            {" · "}
            Later listing:{" "}
            <span className="text-amber-200 font-semibold">
              {humanSuggestedMarketType(suggestedMarketType)}
            </span>
            {" · "}
            Item:{" "}
            <span className="text-white font-semibold">
              {itemLabel.trim() || "Not set"}
            </span>
            {brand.trim() ? (
              <>
                {" · "}
                Brand:{" "}
                <span className="text-white font-semibold">{brand.trim()}</span>
              </>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}