"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  useAccount,
  useBalance,
  useChainId,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { useWeb3Auth } from "@web3auth/modal/react";
import { baseSepolia } from "wagmi/chains";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { decodeEventLog, encodeFunctionData, formatUnits, toHex } from "viem";

import { realife1155Abi } from "@/lib/realife1155Abi";
import {
  BASE_SEPOLIA_USDC_ADDRESS,
  REALIFE_PROTECTED_MARKETPLACE_USDC_CONTRACT,
  REALIFE_PROTECTED_PAYMENT_USDC,
} from "@/lib/realifeProtectedUsdc";
import NftMedia from "@/components/NftMedia";

const REALIFE_PROJECT = "Realife" as const;

const CATEGORIES = [
  "Art / Collectible",
  "Creative & Design",
  "Marketing",
  "AI & Automation",
  "Development & Tech",
  "Business & Professional Services",
  "Education & Coaching",
  "Health & Wellness",
  "Beauty & Personal Care",
  "Home & Repair",
  "Travel & Tours",
  "Events & Tickets",
  "Logistics & Delivery",
  "Clothing & Merch",
  "Accessories & Jewelry",
  "Electronics & Gadgets",
  "Home & Decor",
  "Food & Beverage",
  "Sports & Outdoor",
  "Automotive",
  "Pet Products & Services",
  "Collectible Good",
  "Other Good",
  "Other Service",
  "Other",
] as const;

const ITEM_TYPE_SUGGESTIONS = [
  "Good",
  "T-shirt",
  "Hoodie",
  "Merch",
  "Accessory",
  "Jewelry",
  "Coffee",
  "Chocolate",
  "Drink",
  "Artwork",
  "Collectible",
  "Ticket",
  "Tour",
  "Travel Plan",
  "Website",
  "Portfolio",
  "Project",
  "Digital Service",
  "Consultation",
  "Coaching",
  "Training",
  "Lesson",
  "Local Service",
  "Offline Service",
  "Repair Service",
  "Fitness Session",
  "Personal Training",
] as const;

type MintCategory = (typeof CATEGORIES)[number];
type OfferType =
  | "collectible"
  | "physical_product"
  | "digital_service"
  | "online_session"
  | "local_service";
type DeliveryMode = "none" | "delivery";
type ActiveMintMode = "standard";
type FulfillmentType =
  | "PHYSICAL_GOOD"
  | "DIGITAL_SERVICE"
  | "ONLINE_SESSION"
  | "LOCAL_SERVICE"
  | null;
type SuggestedMarketType = "standard" | "protected";
type AiSuggestedPath = "collectible" | "service" | "physical_product" | null;

type AiSuggestion = {
  path: AiSuggestedPath;
  category: string | null;
  itemType: string | null;
  itemLabel: string | null;
  subcategory: string | null;
  title: string | null;
  brand: string | null;
  description: string | null;
  fulfillmentType: FulfillmentType;
  suggestedMarketType: SuggestedMarketType;
  reasoning: string | null;
  searchTags: string[];
} | null;


type Eip1193Provider = {
  request: (args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }) => Promise<unknown>;
};

function normalizeEvmAddress(v: unknown): `0x${string}` | undefined {
  const s = String(v || "").trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(s) ? (s as `0x${string}`) : undefined;
}

function normalizeTxHash(v: unknown): `0x${string}` | undefined {
  const s = String(v || "").trim().toLowerCase();
  return /^0x[a-f0-9]{64}$/.test(s) ? (s as `0x${string}`) : undefined;
}

function parseRpcChainId(v: unknown): number | undefined {
  const s = String(v || "").trim();
  if (!s) return undefined;
  const n = s.startsWith("0x") ? Number.parseInt(s, 16) : Number(s);
  return Number.isFinite(n) ? n : undefined;
}

async function readProviderChainId(provider: Eip1193Provider | null) {
  if (!provider) return undefined;
  const raw = await provider.request({ method: "eth_chainId" }).catch(() => null);
  return parseRpcChainId(raw);
}

async function ensureEmbeddedBaseSepolia(provider: Eip1193Provider | null) {
  if (!provider) {
    throw new Error(
      "Embedded wallet provider is not ready. Please click Continue with Google again."
    );
  }

  const currentChainId = await readProviderChainId(provider);
  if (currentChainId === baseSepolia.id) return;

  const chainIdHex = toHex(baseSepolia.id);

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (switchError: any) {
    const code = switchError?.code ?? switchError?.data?.originalError?.code;

    if (code !== 4902) throw switchError;

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: chainIdHex,
          chainName: baseSepolia.name,
          nativeCurrency: baseSepolia.nativeCurrency,
          rpcUrls: [...baseSepolia.rpcUrls.default.http],
          blockExplorerUrls: [baseSepolia.blockExplorers.default.url],
        },
      ],
    });

    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  }
}

const ONLINE_SESSION_HINTS = [
  "consultation",
  "coaching",
  "training",
  "lesson",
  "session",
  "call",
  "meeting",
  "mentoring",
  "tutoring",
  "fitness coaching",
  "yoga coaching",
  "online workout",
  "online yoga",
  "zoom",
  "remote",
  "online",
];

const DIGITAL_SERVICE_HINTS = [
  "website",
  "landing page",
  "portfolio",
  "project",
  "design",
  "branding",
  "logo",
  "development",
  "developer",
  "marketing",
  "seo",
  "smm",
  "automation",
  "ai agent",
  "ai automation",
  "digital service",
  "digital product",
  "presentation",
  "resume",
  "cv",
  "travel plan",
  "trip plan",
  "itinerary",
  "route plan",
  "guide pdf",
  "business service",
  "consulting",
  "legal",
  "accounting",
];

const LOCAL_SERVICE_HINTS = [
  "local service",
  "offline service",
  "offline",
  "in-person",
  "in person",
  "in_person",
  "local",
  "repair",
  "plumber",
  "electrician",
  "construction",
  "interior",
  "cleaning",
  "massage",
  "barber",
  "gym service",
  "fitness trainer",
  "personal trainer",
  "trainer in person",
  "offline fitness",
  "offline training",
  "fitness session",
  "personal training",
  "yoga in person",
  "tour",
  "city tour",
  "walking tour",
  "guide",
  "event entry",
  "ticket",
  "pass",
  "admission",
  "pet grooming",
  "pet walking",
];

const PHYSICAL_HINTS = [
  "shirt",
  "t-shirt",
  "hoodie",
  "jacket",
  "pants",
  "socks",
  "underwear",
  "coffee",
  "chocolate",
  "bag",
  "toy",
  "furniture",
  "device",
  "gadget",
  "cosmetic",
  "drink",
  "food",
  "bottle",
  "accessory",
  "product",
  "merch",
  "sneakers",
  "watch",
  "jewelry",
  "ring",
  "necklace",
  "bracelet",
  "cup",
  "mug",
  "cap",
  "hat",
  "car part",
];

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

function normText(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function humanFulfillmentType(v: FulfillmentType) {
  if (v === "PHYSICAL_GOOD") return "Physical good";
  if (v === "DIGITAL_SERVICE") return "Digital service";
  if (v === "ONLINE_SESSION") return "Online session";
  if (v === "LOCAL_SERVICE") return "Local / offline service";
  return "Collectible / standard NFT";
}

function humanOfferType(v: OfferType) {
  if (v === "physical_product") return "Good / item";
  if (v === "digital_service") return "Digital service";
  if (v === "online_session") return "Online session";
  if (v === "local_service") return "Local / offline service";
  return "Collectible / standard NFT";
}

function offerTypeToFulfillmentType(v: OfferType): FulfillmentType {
  if (v === "physical_product") return "PHYSICAL_GOOD";
  if (v === "digital_service") return "DIGITAL_SERVICE";
  if (v === "online_session") return "ONLINE_SESSION";
  if (v === "local_service") return "LOCAL_SERVICE";
  return null;
}

function offerTypeToDeliveryMode(v: OfferType): DeliveryMode {
  return v === "physical_product" ? "delivery" : "none";
}

function offerTypeFromAiSuggestion(s: AiSuggestion): OfferType | null {
  if (!s) return null;

  if (s.fulfillmentType === "PHYSICAL_GOOD" || s.path === "physical_product") {
    return "physical_product";
  }

  if (s.fulfillmentType === "LOCAL_SERVICE") return "local_service";
  if (s.fulfillmentType === "ONLINE_SESSION") return "online_session";
  if (s.fulfillmentType === "DIGITAL_SERVICE" || s.path === "service") {
    return "digital_service";
  }

  if (s.path === "collectible") return "collectible";
  return null;
}

function humanSuggestedMarketType(v: SuggestedMarketType) {
  return v === "protected" ? "Protected marketplace" : "Standard marketplace";
}

function humanAiPath(v: AiSuggestedPath) {
  if (v === "physical_product") return "Physical good";
  if (v === "service") return "Service";
  if (v === "collectible") return "Collectible";
  return "Unknown";
}

function normalizeFulfillmentType(v?: string | null): FulfillmentType {
  const s = normText(v);

  if (!s) return null;
  if (
    s === "physical_good" ||
    s === "physical good" ||
    s === "physical" ||
    s === "product"
  ) {
    return "PHYSICAL_GOOD";
  }
  if (s === "digital_service" || s === "digital service") {
    return "DIGITAL_SERVICE";
  }
  if (s === "online_session" || s === "online session") {
    return "ONLINE_SESSION";
  }
  if (
    s === "local_service" ||
    s === "local service" ||
    s === "offline service" ||
    s === "offline" ||
    s === "in person" ||
    s === "in-person"
  ) {
    return "LOCAL_SERVICE";
  }

  return null;
}

function normalizeSuggestedMarketType(
  v?: string | null
): SuggestedMarketType | null {
  const s = normText(v);
  if (s === "protected") return "protected";
  if (s === "standard") return "standard";
  return null;
}

function normalizeAiPath(v?: string | null): AiSuggestedPath {
  const s = normText(v);
  if (s === "physical_product" || s === "physical product") {
    return "physical_product";
  }
  if (s === "service") return "service";
  if (s === "collectible") return "collectible";
  return null;
}

function isPhysicalCategory(category: string) {
  const s = normText(category);
  return [
    "clothing & merch",
    "accessories & jewelry",
    "electronics & gadgets",
    "home & decor",
    "food & beverage",
    "beauty & personal care",
    "sports & outdoor",
    "automotive",
    "collectible good",
    "other good",
  ].includes(s);
}

function normalizeCategoryValue(v?: string | null): MintCategory {
  const s = normText(v);
  if (!s) return "Other";

  const direct = CATEGORIES.find((x) => normText(x) === s);
  if (direct) return direct;

  if (s === "art" || s === "painting" || s === "collectible") {
    return "Art / Collectible";
  }

  if (
    s === "creative & design" ||
    s === "creative and design" ||
    s === "design"
  ) {
    return "Creative & Design";
  }

  if (s === "marketing" || s === "promotion") return "Marketing";

  if (s === "ai & automation" || s === "ai / automation" || s === "ai work") {
    return "AI & Automation";
  }

  if (
    s === "development & tech" ||
    s === "development / tech" ||
    s === "tech"
  ) {
    return "Development & Tech";
  }

  if (
    s === "business & professional services" ||
    s === "business / professional services" ||
    s === "business services" ||
    s === "professional services" ||
    s === "consulting" ||
    s === "legal"
  ) {
    return "Business & Professional Services";
  }

  if (
    s === "education & coaching" ||
    s === "education / coaching" ||
    s === "education"
  ) {
    return "Education & Coaching";
  }

  if (s === "health & wellness" || s === "health / wellness") {
    return "Health & Wellness";
  }

  if (
    s === "beauty & personal care" ||
    s === "beauty / personal care" ||
    s === "beauty"
  ) {
    return "Beauty & Personal Care";
  }

  if (s === "home & repair" || s === "home / repair" || s === "repair") {
    return "Home & Repair";
  }

  if (
    s === "travel & tours" ||
    s === "travel / tours" ||
    s === "travel" ||
    s === "tours" ||
    s === "tourism"
  ) {
    return "Travel & Tours";
  }

  if (
    s === "events & tickets" ||
    s === "events / tickets" ||
    s === "event" ||
    s === "ticket" ||
    s === "tickets"
  ) {
    return "Events & Tickets";
  }

  if (
    s === "logistics & delivery" ||
    s === "logistics / delivery" ||
    s === "logistics"
  ) {
    return "Logistics & Delivery";
  }

  if (
    s === "clothing & merch" ||
    s === "clothing / merch" ||
    s === "clothing" ||
    s === "fashion" ||
    s === "apparel" ||
    s === "merch"
  ) {
    return "Clothing & Merch";
  }

  if (
    s === "accessories & jewelry" ||
    s === "accessories / jewelry" ||
    s === "accessories" ||
    s === "jewelry"
  ) {
    return "Accessories & Jewelry";
  }

  if (s === "electronics & gadgets" || s === "electronics" || s === "gadgets") {
    return "Electronics & Gadgets";
  }

  if (s === "home decor" || s === "home & decor") {
    return "Home & Decor";
  }

  if (s === "food" || s === "food & beverage" || s === "beverage") {
    return "Food & Beverage";
  }

  if (s === "sports" || s === "sports & outdoor") {
    return "Sports & Outdoor";
  }

  if (s === "automotive" || s === "auto") {
    return "Automotive";
  }

  if (
    s === "pet products & services" ||
    s === "pet products / services" ||
    s === "pets" ||
    s === "pet"
  ) {
    return "Pet Products & Services";
  }

  if (
    s === "collectible product" ||
    s === "collectible good" ||
    s === "collectible goods"
  ) {
    return "Collectible Good";
  }
  if (
    s === "other product" ||
    s === "product" ||
    s === "other good" ||
    s === "good" ||
    s === "goods"
  ) {
    return "Other Good";
  }
  if (s === "other service" || s === "service") return "Other Service";

  return "Other";
}

function inferFulfillmentType(params: {
  offerType: OfferType;
  category: string;
  itemType: string;
  itemLabel: string;
  subcategory: string;
}): FulfillmentType {
  const { offerType } = params;

  // Manual offer type is the source of truth. AI/category can help fill fields,
  // but the seller decides whether this is a collectible, product, or service.
  return offerTypeToFulfillmentType(offerType);
}

function inferSuggestedMarketType(
  fulfillmentType: FulfillmentType,
  deliveryMode: DeliveryMode
): SuggestedMarketType {
  if (deliveryMode === "delivery") return "protected";
  if (fulfillmentType) return "protected";
  return "standard";
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://accurate-art-production.up.railway.app";

const PREPARE_URL = `${API_BASE.replace(/\/$/, "")}/api/mint/prepare`;
const AI_SUGGEST_URL = `${API_BASE.replace(/\/$/, "")}/api/ai-suggest`;

const CONTRACT_1155_STANDARD =
  process.env.NEXT_PUBLIC_REALIFE_1155_NEW_CONTRACT as
    | `0x${string}`
    | undefined;

const PROTECTED_USDC_MARKETPLACE_CONTRACT =
  REALIFE_PROTECTED_MARKETPLACE_USDC_CONTRACT;

const PROTECTED_USDC_PAYMENT_SYMBOL = REALIFE_PROTECTED_PAYMENT_USDC.symbol;
const PROTECTED_USDC_PAYMENT_DECIMALS = REALIFE_PROTECTED_PAYMENT_USDC.decimals;

function shortAddress(v?: string | null) {
  const s = String(v || "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(s)) return "not set";
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}


/* ---------------- UI kit ---------------- */

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
        "relative inline-flex w-full items-center justify-center overflow-hidden",
        "rounded-2xl px-10 py-4",
        "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
        "text-black font-extrabold tracking-tight",
        "shadow-[0_22px_70px_rgba(212,175,55,0.18)] ring-1 ring-black/15",
        "transition duration-300 hover:-translate-y-px hover:brightness-110 active:translate-y-0",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:brightness-100",
        "before:absolute before:inset-0 before:bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.35),transparent)] before:translate-x-[-140%] before:transition before:duration-700 hover:before:translate-x-[140%]",
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
        "inline-flex w-full items-center justify-center rounded-2xl px-10 py-4",
        "border border-white/15 bg-white/[0.06] text-white font-extrabold",
        "backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)]",
        "transition duration-300 hover:-translate-y-px hover:bg-white/10 active:translate-y-0",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/* ---------------- helpers ---------------- */

function persistableUrl(input?: string | null) {
  const s = (input || "").trim();
  if (!s) return null;
  if (s.startsWith("blob:")) return null;
  return s;
}

const IPFS_GATEWAYS = [
  "https://nftstorage.link/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
] as const;

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

function normalizeTokenIdValue(v: unknown): string | null {
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "number") return String(v);
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function extractMintTokenIdFromReceipt(
  receipt: any,
  _mode: ActiveMintMode,
  contract?: `0x${string}`
): string | null {
  const logs = receipt?.logs ?? [];

  for (const log of logs) {
    try {
      if (contract && log?.address?.toLowerCase?.() !== contract.toLowerCase()) {
        continue;
      }

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
    } catch {
      //
    }
  }

  return null;
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
  offerType,
  deliveryMode,
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
  offerType: OfferType;
  deliveryMode: DeliveryMode;
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
              <span className="text-white/70">Offer:</span>
              <span className="text-white font-extrabold">
                {humanOfferType(offerType)}
              </span>
            </Pill>

            <Pill>
              <span className="text-white/70">Mint contract:</span>
              <span className="text-white font-extrabold">Standard</span>
            </Pill>

            <Pill>
              <span className="text-white/70">Later listing:</span>
              <span className="text-amber-200 font-extrabold">
                {humanSuggestedMarketType(suggestedMarketType)}
              </span>
            </Pill>

            {suggestedMarketType === "protected" ? (
              <Pill>
                <span className="text-white/70">Protected payment:</span>
                <span className="text-amber-200 font-extrabold">USDC</span>
              </Pill>
            ) : null}

            <Pill>
              <span className="text-white/70">NFT class:</span>
              <span className="text-white font-extrabold">
                {humanFulfillmentType(fulfillmentType)}
              </span>
            </Pill>

            <Pill>
              <span className="text-white/70">Fee:</span>
              <span className="text-amber-200 font-extrabold">
                {mintFeeWei > 0n
                  ? `${fmtEth(formatUnits(mintFeeWei, 18))} ETH`
                  : "0"}
              </span>
            </Pill>
          </div>

          <div className="mt-3 text-sm font-extrabold tracking-tight md:text-base">
            {locked
              ? !mounted
                ? "Connect wallet / Google to start"
                : !connected
                ? "Connect wallet / Google to start"
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

          <div className="mt-2 text-[11px] leading-relaxed text-white/60">
            Mint rewards:{" "}
            <span className="font-extrabold text-amber-200">+10 points</span>{" "}
            per mint.
            <span className="text-white/45"> Editions support supply 1..10000.</span>
          </div>

          <div className="mt-2 text-[11px] leading-relaxed text-white/55">
            Realife uses one public mint contract and writes good / service / delivery classification into metadata.
            <span className="text-white/45">
              {" "}
              Marketplace routing is handled later by the platform when you list
              the NFT.
            </span>
          </div>

          {suggestedMarketType === "protected" ? (
            <div className="mt-2 text-[11px] leading-relaxed text-white/55">
              Protected listings are routed to the USDC escrow contract: {" "}
              <span className="font-semibold text-amber-200">
                {shortAddress(PROTECTED_USDC_MARKETPLACE_CONTRACT)}
              </span>
              <span className="text-white/45">
                {" "}• payment token: {PROTECTED_USDC_PAYMENT_SYMBOL} / 6 decimals.
              </span>
            </div>
          ) : null}

          <div className="mt-2 text-[11px] leading-relaxed text-white/55">
            {suggestedMarketType === "protected" ? (
              <>
                This NFT is classified as{" "}
                <span className="font-semibold text-white/75">
                  {humanFulfillmentType(fulfillmentType)}
                </span>
                . It mints through the standard public NFT contract, while Realife
                metadata marks it for a later protected USDC listing / escrow flow.
              </>
            ) : (
              <>
                Standard collectible/public NFT flow is active. This edition
                mints through the standard public mint contract and later fits the
                normal standard marketplace flow.
              </>
            )}
          </div>

          <div className="mt-2 text-[11px] leading-relaxed text-white/55">
            {locked ? (
              wrongNetwork ? (
                <>
                  Wrong network — switch to{" "}
                  <span className="font-semibold text-white/75">
                    Base Sepolia
                  </span>
                  .
                </>
              ) : (
                <>Connect wallet or continue with Google, then follow: Prepare → Sign → Create → Verify.</>
              )
            ) : hasGas ? (
              <>
                Gas is OK. If you already prepared metadata — press{" "}
                <span className="font-semibold text-white/75">Create Edition</span>.
              </>
            ) : (
              <>
                No gas on Base Sepolia.{" "}
                <Link
                  href="/app/faucet"
                  className="font-semibold text-[#d4af37] transition hover:brightness-110"
                >
                  Faucet ↗
                </Link>{" "}
                then refresh.
              </>
            )}
          </div>
        </div>

        <div className="hidden shrink-0 flex-col items-end gap-2 md:flex">
          <div
            className={[
              "rounded-full border px-3 py-1.5 text-[11px] font-semibold",
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
              className="text-xs font-semibold text-[#d4af37] transition hover:brightness-110"
            >
              View tx ↗
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
        {items.map((it, idx) => {
          const isActive = it.active;
          const isOk = it.ok;
          const isDisabled = locked && idx > 0;

          return (
            <div
              key={it.k}
              className={[
                "relative overflow-hidden rounded-3xl border",
                "bg-[linear-gradient(180deg,rgba(0,0,0,0.30),rgba(0,0,0,0.22))]",
                isActive ? "border-white/20" : "border-white/10",
                "shadow-[0_18px_70px_rgba(0,0,0,0.30)]",
              ].join(" ")}
            >
              <div className="relative p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={[
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-black",
                        isOk
                          ? "bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] text-black"
                          : "border border-white/10 bg-white/[0.06] text-white",
                      ].join(" ")}
                    >
                      {isOk ? "✓" : it.n}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold tracking-tight">
                        {it.t}
                      </div>
                      <div className="truncate text-[11px] text-white/55">
                        {it.d}
                      </div>
                    </div>
                  </div>

                  <div
                    className={[
                      "rounded-full border px-2 py-1 text-[11px] font-semibold",
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
  const { data: session } = useSession();
  const { provider: web3AuthProviderRaw } = useWeb3Auth();

  const embeddedProvider = (web3AuthProviderRaw as Eip1193Provider | null) || null;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const posterInputRef = useRef<HTMLInputElement | null>(null);
  const pushedRef = useRef(false);

  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();

  const [embeddedChainId, setEmbeddedChainId] = useState<number | undefined>(undefined);

  const sessionUser = (session as any)?.user || null;
  const sessionWalletKind = String(sessionUser?.walletKind || "").toUpperCase();
  const embeddedWalletAddress = normalizeEvmAddress(sessionUser?.walletAddress);
  const externalWalletAddress = normalizeEvmAddress(address);

  const activeAddress = externalWalletAddress || embeddedWalletAddress;
  const activeWalletKind: "EXTERNAL" | "EMBEDDED" | null = externalWalletAddress
    ? "EXTERNAL"
    : embeddedWalletAddress && sessionWalletKind === "EMBEDDED"
    ? "EMBEDDED"
    : null;

  const connected = mounted ? Boolean(isConnected || embeddedWalletAddress) : false;
  const effectiveChainId = mounted
    ? activeWalletKind === "EMBEDDED"
      ? embeddedChainId
      : chainId
    : undefined;

  useEffect(() => {
    let cancelled = false;

    async function syncEmbeddedChain() {
      if (activeWalletKind !== "EMBEDDED" || !embeddedProvider) {
        setEmbeddedChainId(undefined);
        return;
      }

      const nextChainId = await readProviderChainId(embeddedProvider);
      if (!cancelled) setEmbeddedChainId(nextChainId);
    }

    void syncEmbeddedChain();

    return () => {
      cancelled = true;
    };
  }, [activeWalletKind, embeddedProvider]);

  const {
    data: balanceData,
    isLoading: isBalanceLoading,
    isFetching: isBalanceFetching,
    refetch: refetchBalance,
  } = useBalance({
    address: activeAddress,
    chainId: baseSepolia.id,
    query: { enabled: Boolean(activeAddress), refetchInterval: 12_000 },
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
    if (!balanceData) {
      return `0 ${baseSepolia.nativeCurrency?.symbol ?? "ETH"}`;
    }
    const s = formatUnits(balanceData.value, balanceData.decimals);
    return `${fmtEth(s)} ${balanceData.symbol ?? "ETH"}`;
  }, [mounted, connected, isBalanceLoading, balanceData]);

  const wrongNetwork =
    connected &&
    (activeWalletKind === "EMBEDDED"
      ? Boolean(effectiveChainId && effectiveChainId !== baseSepolia.id)
      : effectiveChainId !== baseSepolia.id);
  const hasGas = connected && !wrongNetwork && balanceEth > 0;

  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);

  const project = REALIFE_PROJECT;
  const [category, setCategory] = useState<MintCategory>("Other");
  const [subcategory, setSubcategory] = useState("");
  const [itemType, setItemType] = useState("");
  const [itemLabel, setItemLabel] = useState("");
  const [offerType, setOfferType] = useState<OfferType>("collectible");
  const deliveryMode = offerTypeToDeliveryMode(offerType);

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [supply, setSupply] = useState<number>(1);
  const [proofUrl, setProofUrl] = useState("");

  const [serviceCountry, setServiceCountry] = useState("");
  const [serviceCity, setServiceCity] = useState("");
  const [serviceArea, setServiceArea] = useState("");

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

  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestError, setAiSuggestError] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion>(null);

  const fulfillmentType = useMemo<FulfillmentType>(
    () =>
      inferFulfillmentType({
        offerType,
        category,
        itemType,
        itemLabel,
        subcategory,
      }),
    [offerType, category, itemType, itemLabel, subcategory]
  );

  const isLocalService = fulfillmentType === "LOCAL_SERVICE";

  const suggestedMarketType = useMemo<SuggestedMarketType>(
    () => inferSuggestedMarketType(fulfillmentType, deliveryMode),
    [fulfillmentType, deliveryMode]
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

  const previewSearchTags = useMemo(() => {
    const raw = [
      project,
      category,
      itemType.trim(),
      itemLabel.trim(),
      subcategory.trim(),
      brand.trim(),
      humanOfferType(offerType),
      suggestedMarketType === "protected" ? "protected flow" : "standard flow",
      isLocalService ? serviceCountry.trim() : "",
      isLocalService ? serviceCity.trim() : "",
      isLocalService ? serviceArea.trim() : "",
    ];

    return Array.from(
      new Set(raw.map((x) => String(x || "").trim()).filter(Boolean))
    ).slice(0, 12);
  }, [
    project,
    category,
    itemType,
    itemLabel,
    subcategory,
    brand,
    offerType,
    suggestedMarketType,
    isLocalService,
    serviceCountry,
    serviceCity,
    serviceArea,
  ]);

  const isDeliveryMode = deliveryMode === "delivery";
  const activeMintMode: ActiveMintMode = "standard";
  const activeMintContract = CONTRACT_1155_STANDARD;
  const activeMintAbi = realife1155Abi;
  const activeMintEnvName = "NEXT_PUBLIC_REALIFE_1155_NEW_CONTRACT";

  const { data: mintFeeWeiRaw } = useReadContract({
    address: activeMintContract,
    abi: activeMintAbi as any,
    functionName: "mintFeeWei" as any,
    query: { enabled: Boolean(activeMintContract) },
  });

  const mintFeeWei = (typeof mintFeeWeiRaw === "bigint"
    ? mintFeeWeiRaw
    : 0n) as bigint;

  function resetPreparedState() {
    setTokenURI(null);
    setPreparedMedia(null);
    setPreparedPoster(null);
    setPreviewCategory("Other");
    setSubmittedMintMode("standard");
    setSubmittedMintContract(undefined);
    setSubmittedTxHash(undefined);
    mintSubmitRef.current = false;
    pushedRef.current = false;
    if (step !== "idle") setStep("idle");
  }

  function clearAiSuggestion() {
    setAiSuggestion(null);
    setAiSuggestError("");
  }

  function clearFieldsForNewAsset() {
    setCategory("Other");
    setSubcategory("");
    setItemType("");
    setItemLabel("");
    setName("");
    setBrand("");
    setDescription("");
    setProofUrl("");
    setServiceCountry("");
    setServiceCity("");
    setServiceArea("");
    setPreviewCategory("Other");
  }

  // Note: we intentionally DO NOT clear serviceCountry/serviceCity/serviceArea
  // when isLocalService becomes false. The fields are still hidden / ignored
  // on prepare and on save (see isLocalService gates below), but keeping the
  // values lets the seller toggle offer types without losing typed input.

  function onPickFile(f: File | null) {
    setError("");
    clearAiSuggestion();
    resetPreparedState();
    clearFieldsForNewAsset();

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
    clearAiSuggestion();
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

  const [submittedTxHash, setSubmittedTxHash] = useState<`0x${string}` | undefined>(undefined);
  const mintSubmitRef = useRef(false);

  const { writeContractAsync, isPending: isWalletPromptOpen } = useWriteContract();

  const activeTxHash = submittedTxHash;

  const { isLoading: isMining, isSuccess, data: receipt } =
    useWaitForTransactionReceipt({
      hash: activeTxHash,
      query: { enabled: Boolean(activeTxHash) },
    });

  useEffect(() => {
    if (!isSuccess || !receipt) return;
    if (pushedRef.current) return;

    pushedRef.current = true;

    (async () => {
      const finalName = name.trim() || "Untitled NFT";
      const finalCategory = previewCategory || category;
      const targetMode = submittedMintMode;
      const targetContract = submittedMintContract;
      const targetDeliveryEnabled = deliveryMode === "delivery";

      const finalServiceCountry = isLocalService ? serviceCountry.trim() : "";
      const finalServiceCity = isLocalService ? serviceCity.trim() : "";
      const finalServiceArea = isLocalService ? serviceArea.trim() : "";

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
              txHash: activeTxHash || "",
              tokenUri: tokenURI || "",
              name: finalName,
              image: posterOrImage || null,
              verified: true,
              standard: "ERC1155",
              supply: clampSupply(supply),
              catalogOnly: false,
              deliveryEnabled: targetDeliveryEnabled,
              physicalItemIncluded: targetDeliveryEnabled,
              officialItem: false,
              category: finalCategory,
              subcategory: subcategory.trim() || null,
              fulfillmentType,
              suggestedMarketType,
              marketplaceContract:
                suggestedMarketType === "protected"
                  ? PROTECTED_USDC_MARKETPLACE_CONTRACT
                  : null,
              paymentTokenAddress:
                suggestedMarketType === "protected" ? BASE_SEPOLIA_USDC_ADDRESS : null,
              paymentSymbol:
                suggestedMarketType === "protected"
                  ? PROTECTED_USDC_PAYMENT_SYMBOL
                  : null,
              paymentDecimals:
                suggestedMarketType === "protected"
                  ? PROTECTED_USDC_PAYMENT_DECIMALS
                  : null,
              serviceCountry: finalServiceCountry || null,
              serviceCity: finalServiceCity || null,
              serviceArea: finalServiceArea || null,
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
      qp.set("itemType", itemType.trim());
      qp.set("item", itemLabel.trim());
      qp.set("brand", brand.trim());
      qp.set("delivery", targetDeliveryEnabled ? "1" : "0");
      qp.set("market", suggestedMarketType);
      if (suggestedMarketType === "protected") {
        qp.set("marketplaceContract", PROTECTED_USDC_MARKETPLACE_CONTRACT);
        qp.set("paymentToken", BASE_SEPOLIA_USDC_ADDRESS);
        qp.set("paymentSymbol", PROTECTED_USDC_PAYMENT_SYMBOL);
        qp.set("paymentDecimals", String(PROTECTED_USDC_PAYMENT_DECIMALS));
      }
      qp.set("fulfillmentType", fulfillmentType || "");
      qp.set("serviceCountry", finalServiceCountry);
      qp.set("serviceCity", finalServiceCity);
      qp.set("serviceArea", finalServiceArea);
      qp.set("tx", activeTxHash || "");
      qp.set("tokenId", tokenId || "");
      qp.set("standard", "ERC1155");
      qp.set("contract", targetContract || "");

      router.push(`/app/success?${qp.toString()}`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, receipt]);

  async function ensureCorrectNetwork() {
    if (!connected || !activeAddress) {
      openConnectModal?.();
      throw new Error("Connect wallet first.");
    }

    if (activeWalletKind === "EMBEDDED") {
      await ensureEmbeddedBaseSepolia(embeddedProvider);
      const nextChainId = await readProviderChainId(embeddedProvider);
      setEmbeddedChainId(nextChainId);
      return;
    }

    if (effectiveChainId !== baseSepolia.id) {
      await switchChainAsync({ chainId: baseSepolia.id });
    }
  }

  async function handleSwitchNetwork() {
    try {
      await ensureCorrectNetwork();
    } catch (e: any) {
      setError(prettyError(e));
    }
  }

  async function sendEmbeddedMintTransaction(amount: bigint, uri: string) {
    if (!embeddedProvider || !activeAddress) {
      throw new Error(
        "Embedded wallet provider is not ready. Please click Continue with Google again."
      );
    }

    const data = encodeFunctionData({
      abi: realife1155Abi as any,
      functionName: "createEdition" as any,
      args: [amount, uri],
    });

    const tx: Record<string, string> = {
      from: activeAddress,
      to: activeMintContract as `0x${string}`,
      data,
    };

    if (mintFeeWei > 0n) tx.value = toHex(mintFeeWei);

    const rawHash = await embeddedProvider.request({
      method: "eth_sendTransaction",
      params: [tx],
    });

    const hash = normalizeTxHash(rawHash);
    if (!hash) throw new Error("Embedded wallet did not return transaction hash.");

    setSubmittedTxHash(hash);
    return hash;
  }

  async function handleAiSuggest() {
    setAiSuggestError("");
    setError("");

    if (!file) {
      setAiSuggestError("Upload image first.");
      return;
    }

    if (file.type.startsWith("video/") && !posterFile) {
      setAiSuggestError("For AI suggest with video, add poster image first.");
      return;
    }

    setAiSuggesting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      if (posterFile) {
        formData.append("poster", posterFile);
      }

      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("project", project);
      formData.append("brand", brand.trim());
      formData.append("offerType", offerType);
      formData.append("deliveryMode", deliveryMode);

      const res = await fetch(AI_SUGGEST_URL, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.suggestion) {
        throw new Error(data?.message || "AI suggest failed");
      }

      const suggestionRaw = data.suggestion || {};

      const suggestion: AiSuggestion = {
        path: normalizeAiPath(suggestionRaw.path),
        category: suggestionRaw.category ? String(suggestionRaw.category) : null,
        itemType: suggestionRaw.itemType ? String(suggestionRaw.itemType) : null,
        itemLabel: suggestionRaw.itemLabel
          ? String(suggestionRaw.itemLabel)
          : null,
        subcategory: suggestionRaw.subcategory
          ? String(suggestionRaw.subcategory)
          : null,
        title: suggestionRaw.title ? String(suggestionRaw.title) : null,
        brand: suggestionRaw.brand ? String(suggestionRaw.brand) : null,
        description: suggestionRaw.description
          ? String(suggestionRaw.description)
          : null,
        fulfillmentType: normalizeFulfillmentType(suggestionRaw.fulfillmentType),
        suggestedMarketType:
          normalizeSuggestedMarketType(suggestionRaw.suggestedMarketType) ||
          "standard",
        reasoning: suggestionRaw.reasoning
          ? String(suggestionRaw.reasoning)
          : null,
        searchTags: Array.isArray(suggestionRaw.searchTags)
          ? suggestionRaw.searchTags
              .map((x: unknown) => String(x || "").trim())
              .filter(Boolean)
          : [],
      };

      setAiSuggestion(suggestion);
    } catch (e: any) {
      setAiSuggestError(prettyError(e));
      setAiSuggestion(null);
    } finally {
      setAiSuggesting(false);
    }
  }

  function applyAiSuggestion() {
    if (!aiSuggestion) return;

    resetPreparedState();

    const suggestedOfferType = offerTypeFromAiSuggestion(aiSuggestion);
    if (suggestedOfferType) {
      setOfferType(suggestedOfferType);
    }

    if (aiSuggestion.category) {
      setCategory(normalizeCategoryValue(aiSuggestion.category));
    }

    if (aiSuggestion.itemType) {
      setItemType(aiSuggestion.itemType);
    }

    if (aiSuggestion.itemLabel) {
      setItemLabel(aiSuggestion.itemLabel);
    }

    if (aiSuggestion.subcategory) {
      setSubcategory(aiSuggestion.subcategory);
    }

    if (aiSuggestion.brand !== null) {
      setBrand(aiSuggestion.brand);
    }

    if (aiSuggestion.title !== null) {
      setName(aiSuggestion.title);
    }

    if (aiSuggestion.description !== null) {
      setDescription(aiSuggestion.description);
    }
  }

  const requiredContractOk = Boolean(activeMintContract);
  const canPrepare = Boolean(file) && Boolean(name.trim()) && requiredContractOk;
  const canMint = Boolean(tokenURI) && requiredContractOk;
  const busy = step !== "idle" || isWalletPromptOpen || isMining || isSwitching;

  async function handlePrepare() {
    setError("");

    if (!activeMintContract) {
      setError(`Missing ${activeMintEnvName} in Railway/ENV`);
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
      formData.append("category", category);
      formData.append("subcategory", subcategory.trim());
      formData.append("itemType", itemType.trim());
      formData.append("item", itemLabel.trim());
      formData.append("brand", brand.trim());
      formData.append("offerType", offerType);
      formData.append("deliveryMode", deliveryMode);
      formData.append("deliveryEnabled", isDeliveryMode ? "true" : "false");
      formData.append(
        "physicalItemIncluded",
        isDeliveryMode ? "true" : "false"
      );
      formData.append("fulfillmentType", fulfillmentType || "");
      formData.append("suggestedMarketType", suggestedMarketType);
      formData.append(
        "marketplaceContract",
        suggestedMarketType === "protected" ? PROTECTED_USDC_MARKETPLACE_CONTRACT : ""
      );
      formData.append(
        "paymentTokenAddress",
        suggestedMarketType === "protected" ? BASE_SEPOLIA_USDC_ADDRESS : ""
      );
      formData.append(
        "paymentSymbol",
        suggestedMarketType === "protected" ? PROTECTED_USDC_PAYMENT_SYMBOL : ""
      );
      formData.append(
        "paymentDecimals",
        suggestedMarketType === "protected"
          ? String(PROTECTED_USDC_PAYMENT_DECIMALS)
          : ""
      );
      formData.append("serviceCountry", isLocalService ? serviceCountry.trim() : "");
      formData.append("serviceCity", isLocalService ? serviceCity.trim() : "");
      formData.append("serviceArea", isLocalService ? serviceArea.trim() : "");
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

      // NOTE: backend already returns final media URLs in data.preview.
      // We deliberately skip an IPFS round-trip on the freshly pinned CID
      // here (it can take 5-15s on a cold gateway) so mint stays fast.

      setPreviewCategory(data?.preview?.category || category);
      setStep("idle");
    } catch (e: any) {
      setError(prettyError(e));
      setStep("idle");
    }
  }

  async function handleOnchainCreate() {
    if (
      mintSubmitRef.current ||
      step === "signing" ||
      step === "mining" ||
      isWalletPromptOpen ||
      isMining
    ) {
      return;
    }

    setError("");

    if (!tokenURI) {
      setError("First click: Prepare (Upload → IPFS).");
      return;
    }

    if (!activeMintContract) {
      setError(`Missing ${activeMintEnvName} in Railway/ENV`);
      return;
    }

    if (!connected || !activeAddress) {
      openConnectModal?.();
      setError("Connect wallet first.");
      return;
    }

    // Do not refetch balance here. That extra RPC call can delay MetaMask / wallet
    // popup by many seconds on testnet. If the cached balance is already known to
    // be zero, block early; otherwise open the wallet immediately and let the
    // wallet/RPC surface the gas error if the balance changed.
    if (!isBalanceLoading && balanceData?.value === 0n) {
      setError(
        "No gas on Base Sepolia. Open Faucet, get test ETH, then create."
      );
      return;
    }

    mintSubmitRef.current = true;
    pushedRef.current = false;
    setSubmittedTxHash(undefined);
    setSubmittedMintMode(activeMintMode);
    setSubmittedMintContract(activeMintContract);
    setStep("signing");

    try {
      if (wrongNetwork) {
        await ensureCorrectNetwork();
      }

      const amount = BigInt(clampSupply(supply));

      const hash =
        activeWalletKind === "EMBEDDED"
          ? await sendEmbeddedMintTransaction(amount, tokenURI)
          : await writeContractAsync({
              address: activeMintContract,
              abi: realife1155Abi as any,
              functionName: "createEdition" as any,
              args: [amount, tokenURI],
              value: mintFeeWei > 0n ? mintFeeWei : undefined,
            });

      if (hash) {
        setSubmittedTxHash(hash as `0x${string}`);
        setStep("mining");
        void refetchBalance();
      } else {
        mintSubmitRef.current = false;
        setStep("idle");
      }
    } catch (e: any) {
      mintSubmitRef.current = false;
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
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      <Stepper
        mounted={mounted}
        connected={connected}
        wrongNetwork={wrongNetwork}
        hasGas={hasGas}
        tokenURI={tokenURI}
        txHash={activeTxHash}
        step={step}
        isMining={isMining}
        isSuccess={isSuccess}
        mintFeeWei={mintFeeWei}
        offerType={offerType}
        deliveryMode={deliveryMode}
        fulfillmentType={fulfillmentType}
        suggestedMarketType={suggestedMarketType}
      />

      <div className="space-y-8">
        <Card>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Upload your file
              </div>
              <div className="mt-1 text-[11px] text-white/55">
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
              "relative cursor-pointer overflow-hidden rounded-[26px] border-2 border-dashed",
              "border-white/15 bg-white/[0.04] p-6 transition",
              "hover:border-white/25 hover:bg-white/[0.06]",
            ].join(" ")}
          >
            <div className="relative flex items-center gap-5">
              <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_18px_70px_rgba(0,0,0,0.30)]">
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
                  <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs text-white/60">
                    {file ? "Preview" : "Click to upload"}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="mb-1 text-sm font-extrabold">Premium media upload</p>
                <p className="text-xs leading-relaxed text-white/60">
                  Click to upload. Video supported.
                </p>

                {file && (
                  <p className="mt-3 truncate text-xs font-semibold">
                    Selected: <span className="text-white/70">{file.name}</span>
                  </p>
                )}

                {tokenURI && (
                  <p className="mt-3 text-xs">
                    ✅ Prepared tokenURI:{" "}
                    <span className="break-all text-white/70">{tokenURI}</span>
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
                    Optional for mint prepare. For AI suggest on video, poster is
                    recommended.
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
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/30">
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

                <div className="min-w-0 flex-1">
                  <div className="text-xs text-white/60">
                    {posterFile ? (
                      <span className="block truncate font-semibold text-white/80">
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
                      className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-extrabold transition hover:bg-white/10"
                    >
                      Choose poster
                    </button>
                    {posterFile ? (
                      <button
                        type="button"
                        onClick={() => onPickPoster(null)}
                        className="rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-extrabold text-white/70 transition hover:bg-white/[0.06]"
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
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                AI assistant
              </div>
              <div className="mt-1 text-[11px] text-white/55">
                Detect category and item from your uploaded image.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Smart assist
            </Pill>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <GhostButton
              disabled={!file || aiSuggesting || busy}
              onClick={handleAiSuggest}
            >
              {aiSuggesting ? "AI analyzing…" : "Analyze image with AI"}
            </GhostButton>

            <GoldButton
              disabled={!aiSuggestion || aiSuggesting || busy}
              onClick={applyAiSuggestion}
            >
              Apply AI suggestion
            </GoldButton>
          </div>

          <div className="mt-3 text-[11px] leading-relaxed text-white/55">
            Best for product photos, merch, clothes, jewelry, travel cards,
            tickets, service cards, portfolios, websites, packaging, local /
            offline services, and other real-world items. For video, poster image
            is recommended.
          </div>

          {aiSuggestError ? (
            <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {aiSuggestError}
            </div>
          ) : null}

          {aiSuggestion ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-wrap gap-2">
                <Pill>
                  <span className="text-white/70">Path:</span>
                  <span className="font-extrabold text-white">
                    {humanAiPath(aiSuggestion.path)}
                  </span>
                </Pill>

                {aiSuggestion.fulfillmentType ? (
                  <Pill>
                    <span className="text-white/70">Class:</span>
                    <span className="font-extrabold text-white">
                      {humanFulfillmentType(aiSuggestion.fulfillmentType)}
                    </span>
                  </Pill>
                ) : null}

                <Pill>
                  <span className="text-white/70">Listing:</span>
                  <span className="font-extrabold text-amber-200">
                    {humanSuggestedMarketType(aiSuggestion.suggestedMarketType)}
                  </span>
                </Pill>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Category
                  </div>
                  <div className="mt-2 text-sm font-extrabold text-white">
                    {aiSuggestion.category || "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Item Type
                  </div>
                  <div className="mt-2 text-sm font-extrabold text-white">
                    {aiSuggestion.itemType || "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Item Label
                  </div>
                  <div className="mt-2 text-sm font-extrabold text-white">
                    {aiSuggestion.itemLabel || "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Subcategory
                  </div>
                  <div className="mt-2 text-sm font-extrabold text-white">
                    {aiSuggestion.subcategory || "—"}
                  </div>
                </div>
              </div>

              {aiSuggestion.description ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Description
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-white/70">
                    {aiSuggestion.description}
                  </div>
                </div>
              ) : null}

              {aiSuggestion.reasoning ? (
                <div className="mt-4 text-[12px] leading-relaxed text-white/65">
                  {aiSuggestion.reasoning}
                </div>
              ) : null}

              {aiSuggestion.searchTags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {aiSuggestion.searchTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-bold text-white/75"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>

        <Card>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Main category
              </div>
              <div className="mt-1 text-[11px] text-white/55">
                Main marketplace category for filtering and search.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Recommended
            </Pill>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    resetPreparedState();
                    setCategory(c);
                  }}
                  className={[
                    "flex items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-sm transition",
                    "shadow-[0_14px_50px_rgba(0,0,0,0.26)]",
                    active
                      ? "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black border-black/10 ring-1 ring-black/10"
                      : "border-white/10 bg-white/[0.06] text-white hover:bg-white/10",
                  ].join(" ")}
                >
                  <span className="font-extrabold text-left">{c}</span>
                  <span
                    className={[
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs",
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
            Selected: <span className="font-semibold text-white">{category}</span>
          </p>
        </Card>

        <Card>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Specific item / offer
              </div>
              <div className="mt-1 text-[11px] text-white/55">
                The exact thing being sold or represented.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Recommended
            </Pill>
          </div>

          <input
            type="text"
            placeholder="Example: Graphic T-shirt / Offline fitness session / Coffee bag / City walking tour / Event ticket"
            value={itemLabel}
            onChange={(e) => {
              resetPreparedState();
              setItemLabel(e.target.value);
            }}
            className={[
              "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white",
              "placeholder:text-white/35 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40",
            ].join(" ")}
          />
        </Card>

        <Card>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Item type
              </div>
              <div className="mt-1 text-[11px] text-white/55">
                Short type name. AI can suggest it from the image.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-white/60" />
              Flexible
            </Pill>
          </div>

          <input
            type="text"
            placeholder="Example: T-shirt / Tour / Ticket / Consultation / Website / Coffee / Offline Service"
            value={itemType}
            onChange={(e) => {
              resetPreparedState();
              setItemType(e.target.value);
            }}
            className={[
              "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white",
              "placeholder:text-white/35 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40",
            ].join(" ")}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {ITEM_TYPE_SUGGESTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  resetPreparedState();
                  setItemType(t);
                }}
                className={cx(
                  "rounded-full border px-3 py-1.5 text-[11px] font-bold transition",
                  normText(itemType) === normText(t)
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
                    : "border-white/10 bg-white/[0.06] text-white/75 hover:bg-white/[0.10]"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Subcategory / niche
              </div>
              <div className="mt-1 text-[11px] text-white/55">
                More precise niche for search and routing later.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-white/60" />
              Optional
            </Pill>
          </div>

          <input
            type="text"
            placeholder="Example: Streetwear / Personal training / Landing page / Handmade chocolate / City landmarks tour"
            value={subcategory}
            onChange={(e) => {
              resetPreparedState();
              setSubcategory(e.target.value);
            }}
            className={[
              "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white",
              "placeholder:text-white/35 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40",
            ].join(" ")}
          />
        </Card>

        <Card>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Offer type
              </div>
              <div className="mt-1 text-[11px] text-white/55">
                Choose what you are creating. This manual choice controls standard vs protected routing.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Required
            </Pill>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {[
              {
                key: "collectible" as const,
                title: "Collectible / NFT",
                text: "Art, meme, digital collectible, or experimental NFT. Usually standard marketplace.",
              },
              {
                key: "physical_product" as const,
                title: "Good / item",
                text: "Physical good, merch, food, accessory, ticket, or item with delivery/pickup.",
              },
              {
                key: "digital_service" as const,
                title: "Digital service",
                text: "Website, design, marketing, automation, research, or other remote work.",
              },
              {
                key: "online_session" as const,
                title: "Online session",
                text: "Consultation, coaching, lesson, training, call, or remote meeting.",
              },
              {
                key: "local_service" as const,
                title: "Local service",
                text: "Offline service, repair, tour, beauty, fitness, photo, cleaning, or in-person work.",
              },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setError("");
                  resetPreparedState();
                  setOfferType(option.key);
                }}
                className={[
                  "rounded-2xl border px-4 py-4 text-left transition shadow-[0_14px_50px_rgba(0,0,0,0.26)]",
                  offerType === option.key
                    ? "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black border-black/10 ring-1 ring-black/10"
                    : "border-white/10 bg-white/[0.06] text-white hover:bg-white/10",
                ].join(" ")}
              >
                <div className="text-sm font-extrabold">{option.title}</div>
                <div
                  className={
                    offerType === option.key
                      ? "mt-1 text-xs text-black/70"
                      : "mt-1 text-xs text-white/55"
                  }
                >
                  {option.text}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-amber-500/15 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-50/80">
            One public mint contract is used for everything. Goods and services become protected candidates through metadata; collectibles stay standard unless you choose a real good/service type.
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Local / offline service location
              </div>
              <div className="mt-1 text-[11px] text-white/55">
                Country, city, area / street where this service can be provided in real life.
              </div>
            </div>
            <Pill>
              <span
                className={cx(
                  "h-2 w-2 rounded-full",
                  isLocalService ? "bg-[#d4af37]" : "bg-white/30"
                )}
              />
              {isLocalService ? "Local service" : "Local only"}
            </Pill>
          </div>

          {!isLocalService ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[11px] leading-relaxed text-white/55">
              Country, city, area / street fields appear when{" "}
              <span className="font-semibold text-white/80">Offer type → Local service</span>{" "}
              is selected. They are saved into IPFS metadata so buyers can discover
              real-world offline services.
            </div>
          ) : null}

          <div
            className={cx(
              "grid grid-cols-1 gap-3 md:grid-cols-2",
              !isLocalService && "pointer-events-none mt-3 opacity-50"
            )}
          >
            <input
              type="text"
              placeholder="Country, example: United States"
              value={serviceCountry}
              disabled={!isLocalService}
              onChange={(e) => {
                resetPreparedState();
                setServiceCountry(e.target.value);
              }}
              className={[
                "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white",
                "placeholder:text-white/35 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40",
              ].join(" ")}
            />

            <input
              type="text"
              placeholder="City, example: Los Angeles"
              value={serviceCity}
              disabled={!isLocalService}
              onChange={(e) => {
                resetPreparedState();
                setServiceCity(e.target.value);
              }}
              className={[
                "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white",
                "placeholder:text-white/35 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40",
              ].join(" ")}
            />
          </div>

          <input
            type="text"
            placeholder="Area / street / district / service zone, example: West Hollywood, Sunset Blvd, Kyiv center"
            value={serviceArea}
            disabled={!isLocalService}
            onChange={(e) => {
              resetPreparedState();
              setServiceArea(e.target.value);
            }}
            className={cx(
              "mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white",
              "placeholder:text-white/35 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40",
              !isLocalService && "pointer-events-none opacity-50"
            )}
          />

          {isLocalService ? (
            <>
              <div className="mt-3 text-[11px] leading-relaxed text-white/55">
                This is not a buyer shipping address. This is a public discovery
                location for offline services. Exact meeting details can be shared
                later inside the protected order room.
              </div>

              <div className="mt-3 text-[11px] leading-relaxed text-white/55">
                Example:{" "}
                <span className="font-semibold text-white">
                  Offline fitness session • United States • Los Angeles • West Hollywood
                </span>
              </div>
            </>
          ) : null}
        </Card>

        <Card>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Routing preview
              </div>
              <div className="mt-1 text-[11px] text-white/55">
                This does not mint into a marketplace directly. It only stores
                enough metadata for later routing.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Auto
            </Pill>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                Mint contract
              </div>
              <div className="mt-2 text-sm font-extrabold text-white">
                Standard public mint contract
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                NFT class
              </div>
              <div className="mt-2 text-sm font-extrabold text-white">
                {humanFulfillmentType(fulfillmentType)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                Suggested listing
              </div>
              <div className="mt-2 text-sm font-extrabold text-amber-200">
                {humanSuggestedMarketType(suggestedMarketType)}
              </div>
            </div>
          </div>

          {isLocalService ? (
            <div className="mt-3 rounded-2xl border border-amber-500/15 bg-amber-500/10 p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-amber-100/70">
                Local service location
              </div>
              <div className="mt-2 text-sm font-extrabold text-white">
                {[serviceCity.trim(), serviceCountry.trim()]
                  .filter(Boolean)
                  .join(", ") || "Add country and city"}
              </div>
              {serviceArea.trim() ? (
                <div className="mt-1 text-xs text-white/60">
                  {serviceArea.trim()}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-3 text-[11px] leading-relaxed text-white/55">
            Category:{" "}
            <span className="font-semibold text-white">{category}</span>
            {itemType.trim() ? (
              <>
                {" · "}Item type:{" "}
                <span className="font-semibold text-white">{itemType.trim()}</span>
              </>
            ) : null}
            {itemLabel.trim() ? (
              <>
                {" · "}Item:{" "}
                <span className="font-semibold text-white">{itemLabel.trim()}</span>
              </>
            ) : null}
          </div>

          <div className="mt-2 text-[11px] leading-relaxed text-white/55">
            {suggestedMarketType === "protected" ? (
              <>
                Because this NFT is classified as{" "}
                <span className="font-semibold text-white">
                  {humanFulfillmentType(fulfillmentType)}
                </span>
                , later listing should go through protected USDC escrow / trust flow.
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
                    "h-2 w-2 rounded-full shadow-[0_0_0_6px_rgba(255,255,255,0.06)]",
                    !mounted || !connected
                      ? "bg-white/30"
                      : wrongNetwork
                      ? "bg-rose-400"
                      : "bg-emerald-400",
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
                  : "Connect wallet / Google to create"}
              </div>

              <div className="mt-2 text-xs text-white/65">
                Balance: <span className="font-semibold text-white">{balanceLabel}</span>
              </div>

              <div className="mt-2 text-[11px] leading-relaxed text-white/55">
                Create edition and earn{" "}
                <span className="font-extrabold text-amber-200">+10 points</span>.
                <span className="text-white/45"> Your editions will show in your gallery.</span>
              </div>

              <div className="mt-2 text-[11px] leading-relaxed text-white/55">
                {mounted && connected ? (
                  <>
                    {wrongNetwork
                      ? "One click switch, then create."
                      : hasGas
                      ? "Prepare → sign → tx mined → success."
                      : "Open faucet, claim test ETH, then refresh."}{" "}
                    <Link
                      href="/app/faucet"
                      className="font-semibold text-[#d4af37] transition hover:brightness-110"
                    >
                      Faucet ↗
                    </Link>
                  </>
                ) : (
                  <>
                    Connect wallet or continue with Google to enable balance check and create.
                    <span className="text-white/45"> Public mint flow.</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void refetchBalance();
                }}
                disabled={!mounted || !connected || isBalanceFetching}
                className="h-10 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-xs font-extrabold transition hover:bg-white/10 disabled:opacity-40 shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
              >
                {refreshLabel}
              </button>

              {!mounted || !connected ? (
                <button
                  type="button"
                  onClick={() => openConnectModal?.()}
                  className="h-10 rounded-2xl bg-white px-4 text-xs font-extrabold text-black transition hover:bg-gray-100 shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                >
                  Connect
                </button>
              ) : wrongNetwork ? (
                <button
                  type="button"
                  disabled={isSwitching}
                  onClick={() => void handleSwitchNetwork()}
                  className="h-10 rounded-2xl bg-white px-4 text-xs font-extrabold text-black transition hover:bg-gray-100 disabled:opacity-60 shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
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
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                NFT name / title
              </div>
              <div className="mt-1 text-[11px] text-white/55">
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
              "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white",
              "placeholder:text-white/35 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40",
            ].join(" ")}
          />
        </Card>

        <Card>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Brand / seller name
              </div>
              <div className="mt-1 text-[11px] text-white/55">
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
            placeholder="Example: Realife / Kyiv Custom Studio / Anna Design / My Coffee Shop"
            value={brand}
            onChange={(e) => {
              resetPreparedState();
              setBrand(e.target.value);
            }}
            className={[
              "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white",
              "placeholder:text-white/35 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40",
            ].join(" ")}
          />
        </Card>

        <Card>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Amount / supply
              </div>
              <div className="mt-1 text-[11px] text-white/55">
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
              "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white",
              "focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40",
            ].join(" ")}
          />
        </Card>

        <Card>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Description
              </div>
              <div className="mt-1 text-[11px] text-white/55">
                AI can help write this after upload.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-white/60" />
              Optional
            </Pill>
          </div>

          <textarea
            placeholder="Describe what the buyer gets, delivery/service details, and any proof or conditions..."
            value={description}
            onChange={(e) => {
              resetPreparedState();
              setDescription(e.target.value);
            }}
            className={[
              "min-h-[160px] w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white",
              "placeholder:text-white/35 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40",
            ].join(" ")}
          />
        </Card>

        <Card>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Proof / X link
              </div>
              <div className="mt-1 text-[11px] text-white/55">
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
              "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white",
              "placeholder:text-white/35 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40",
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
                : "2) Mint"}
            </GoldButton>
          </div>

          {mintFeeWei > 0n ? (
            <div className="mt-4 text-[11px] text-white/55">
              This contract requires fee:{" "}
              <span className="font-extrabold text-amber-200">
                {fmtEth(formatUnits(mintFeeWei, 18))} ETH
              </span>
            </div>
          ) : null}

          <div className="mt-3 text-[11px] leading-relaxed text-white/55">
            Offer type:{" "}
            <span className="font-semibold text-white">
              {humanOfferType(offerType)}
            </span>
            {" · "}
            Mint contract:{" "}
            <span className="font-semibold text-white">Standard</span>
            {" · "}
            NFT class:{" "}
            <span className="font-semibold text-white">
              {humanFulfillmentType(fulfillmentType)}
            </span>
            {" · "}
            Later listing:{" "}
            <span className="font-semibold text-amber-200">
              {humanSuggestedMarketType(suggestedMarketType)}
            </span>
            {" · "}
            Category: <span className="font-semibold text-white">{category}</span>
            {itemType.trim() ? (
              <>
                {" · "}Item type:{" "}
                <span className="font-semibold text-white">{itemType.trim()}</span>
              </>
            ) : null}
            {itemLabel.trim() ? (
              <>
                {" · "}Item:{" "}
                <span className="font-semibold text-white">{itemLabel.trim()}</span>
              </>
            ) : null}
            {brand.trim() ? (
              <>
                {" · "}Brand:{" "}
                <span className="font-semibold text-white">{brand.trim()}</span>
              </>
            ) : null}
            {isLocalService && (serviceCity.trim() || serviceCountry.trim()) ? (
              <>
                {" · "}Location:{" "}
                <span className="font-semibold text-white">
                  {[serviceCity.trim(), serviceCountry.trim()]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </>
            ) : null}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Live NFT preview
              </div>
              <div className="mt-1 text-[11px] text-white/55">
                Preview how the item structure looks before mint.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Live
            </Pill>
          </div>

          <div className="overflow-hidden rounded-[26px] border border-white/10 bg-black/30">
            <div className="relative aspect-[16/10]">
              {effectivePreviewSrc ? (
                <NftMedia
                  src={effectivePreviewSrc}
                  kind={effectivePreviewKind}
                  alt={name.trim() || "NFT preview"}
                  poster={effectivePreviewKind === "video" ? effectivePoster : null}
                  showControls={effectivePreviewKind === "video"}
                  className="h-full w-full"
                  roundedClass="rounded-none"
                  fit="contain"
                  mediaBgClass="bg-black"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-white/45">
                  Upload media to see preview
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.55),transparent_60%)]" />

              <div className="absolute bottom-3 left-3 right-3">
                <div className="truncate text-sm font-black text-white">
                  {name.trim() || "Untitled NFT"}
                </div>
                <div className="mt-1 truncate text-[11px] text-white/70">
                  {project} • {category}
                  {brand.trim() ? ` • ${brand.trim()}` : ""}
                  {isLocalService && serviceCity.trim()
                    ? ` • ${serviceCity.trim()}`
                    : ""}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                Specific item
              </div>
              <div className="mt-2 text-sm font-extrabold text-white">
                {itemLabel.trim() || "—"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                Item type
              </div>
              <div className="mt-2 text-sm font-extrabold text-white">
                {itemType.trim() || "—"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                NFT class
              </div>
              <div className="mt-2 text-sm font-extrabold text-white">
                {humanFulfillmentType(fulfillmentType)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                Suggested listing
              </div>
              <div className="mt-2 text-sm font-extrabold text-amber-200">
                {humanSuggestedMarketType(suggestedMarketType)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                Offer type
              </div>
              <div className="mt-2 text-sm font-extrabold text-white">
                {humanOfferType(offerType)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                Supply
              </div>
              <div className="mt-2 text-sm font-extrabold text-white">
                {clampSupply(supply)}
              </div>
            </div>

            {isLocalService ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:col-span-2">
                <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                  Service location
                </div>
                <div className="mt-2 text-sm font-extrabold text-white">
                  {[serviceCity.trim(), serviceCountry.trim()]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </div>
                {serviceArea.trim() ? (
                  <div className="mt-1 text-xs text-white/55">
                    {serviceArea.trim()}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
              Buyer search preview
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {previewSearchTags.length > 0 ? (
                previewSearchTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-bold text-white/75"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-white/45">
                  Fill category, item type, item, brand, niche, and location to build search context.
                </span>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
