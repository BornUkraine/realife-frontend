"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
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
import { decodeEventLog, formatUnits, parseUnits } from "viem";

import NftMedia from "@/components/NftMedia";
import { realife1155DeliveryAbi } from "@/lib/realife1155DeliveryAbi";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://accurate-art-production.up.railway.app";
const PREPARE_URL = `${API_BASE.replace(/\/$/, "")}/api/mint/prepare`;

const CAFE_CONTRACT =
  process.env.NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT as
    | `0x${string}`
    | undefined;

const STORE_CONTRACT =
  process.env.NEXT_PUBLIC_REALIFE_STORE_CONTRACT as
    | `0x${string}`
    | undefined;

const PUBLIC_STANDARD_MINT_CONTRACT =
  process.env.NEXT_PUBLIC_REALIFE_1155_NEW_CONTRACT as
    | `0x${string}`
    | undefined;

const PUBLIC_DELIVERY_MINT_CONTRACT =
  process.env.NEXT_PUBLIC_REALIFE_1155_DELIVERY_CONTRACT as
    | `0x${string}`
    | undefined;

const ADMIN_WALLETS = (
  process.env.NEXT_PUBLIC_ADMIN_CREATE_WALLETS ||
  process.env.NEXT_PUBLIC_ADMIN_WALLETS ||
  ""
)
  .split(",")
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;
const ZERO_BYTES32 = `0x${"0".repeat(64)}` as const;

const CAFE_CATEGORIES = [
  "Drink",
  "Food",
  "Packaged Goods",
  "Merch",
  "Perfume",
  "Chocolate",
  "Other",
] as const;

const STORE_CATEGORIES = [
  "Art",
  "Collectibles",
  "Fashion",
  "Food",
  "Packaged Goods",
  "Merch",
  "Perfume",
  "Antique",
  "Home Decor",
  "Other",
] as const;

const STORE_BRANDS = [
  "Realife",
  "Billions",
  "Sentient",
  "Neura",
  "Rialo",
  "Espresso",
  "Other",
] as const;

const RARITIES = ["Common", "Rare", "Epic", "Legendary"] as const;

const CAFE_ITEMS = [
  "Cappuccino",
  "Frappuccino",
  "Mochaccino",
  "Americano",
  "Doppio",
  "Espresso",
  "Latte",
  "Flat White",
  "Cold Brew",
  "Genesis Coffee",
  "Hot Chocolate",
  "Cacao Drink",
  "Pancakes",
  "Pancake Stack",
  "Blini",
  "Crepes",
  "Waffles",
  "Cheesecake",
  "Croissant",
  "Dessert Box",
  "Cheese Pack",
  "Coffee Pack",
  "Coffee Beans",
  "Ground Coffee",
  "Cacao Pack",
  "Oatmeal Pack",
  "Cereal Pack",
  "Chocolate Box",
  "Perfume",
  "Gift Box",
  "T-Shirt",
  "Hoodie",
  "Mug",
  "Tote Bag",
  "Cap",
  "Other",
] as const;

const STORE_ITEMS = [
  "Art Piece",
  "Painting",
  "Print",
  "Collectible",
  "Antique",
  "Vintage Item",
  "Fashion Item",
  "T-Shirt",
  "Hoodie",
  "Cap",
  "Bag",
  "Mug",
  "Perfume",
  "Chocolate Box",
  "Coffee Pack",
  "Cacao Pack",
  "Gift Box",
  "Decor Item",
  "Home Object",
  "Other",
] as const;

const cafeStoreAbi = [
  {
    type: "function",
    name: "MODERATOR_ROLE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "hasRole",
    stateMutability: "view",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "createProduct",
    stateMutability: "nonpayable",
    inputs: [
      { name: "supply", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "tokenURI", type: "string" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "toggleProductStatus",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "isActive",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "nextTokenId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "ProductCreated",
    anonymous: false,
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: false, name: "maxSupply", type: "uint256" },
      { indexed: false, name: "price", type: "uint256" },
      { indexed: false, name: "uri", type: "string" },
    ],
  },
] as const;

const storeAdminAbi = [
  {
    type: "function",
    name: "MODERATOR_ROLE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "hasRole",
    stateMutability: "view",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "createOfficialProduct",
    stateMutability: "nonpayable",
    inputs: [
      { name: "supply", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "tokenURI", type: "string" },
      { name: "_deliveryEnabled", type: "bool" },
      { name: "_physicalItemIncluded", type: "bool" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "createSellerProduct",
    stateMutability: "nonpayable",
    inputs: [
      { name: "supply", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "tokenURI", type: "string" },
      { name: "_deliveryEnabled", type: "bool" },
      { name: "_physicalItemIncluded", type: "bool" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "toggleProductStatus",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "isActive",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "nextTokenId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "ProductCreated",
    anonymous: false,
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: true, name: "seller", type: "address" },
      { indexed: false, name: "maxSupply", type: "uint256" },
      { indexed: false, name: "price", type: "uint256" },
      { indexed: false, name: "uri", type: "string" },
      { indexed: false, name: "deliveryEnabled", type: "bool" },
      { indexed: false, name: "physicalItemIncluded", type: "bool" },
      { indexed: false, name: "officialItem", type: "bool" },
    ],
  },
] as const;

type ProductMode = "cafe" | "store";
type StoreBrand = (typeof STORE_BRANDS)[number];

type DeliveryAccessUser = {
  id: string;
  handle: string | null;
  publicId: string | null;
  walletAddress: string;
  approvedPhysicalSeller: boolean;
  approvedPhysicalAt: string | null;
  approvedPhysicalNote: string | null;
  userExists?: boolean;
};

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function fmtEth(value?: string) {
  if (!value) return "0";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";
  return n.toFixed(5).replace(/0+$/, "").replace(/\.$/, "");
}

function clampSupply(n: number) {
  if (Number.isNaN(n)) return 1;
  return Math.max(1, Math.min(1_000_000, Math.floor(n)));
}

function shortAddr(a?: string | null) {
  if (!a) return "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
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

function isAddressLike(v?: string | null) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(v || "").trim());
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

function extractProductTokenIdFromReceipt(
  receipt: any,
  abi: readonly any[],
  contract?: `0x${string}`
): string | null {
  const logs = receipt?.logs ?? [];
  for (const log of logs) {
    try {
      if (contract && log?.address?.toLowerCase?.() !== contract.toLowerCase()) {
        continue;
      }

      const decoded = decodeEventLog({
        abi,
        data: log.data,
        topics: log.topics,
      }) as { eventName?: string; args?: any };

      if (
        decoded?.eventName === "ProductCreated" ||
        decoded?.eventName === "EditionCreated"
      ) {
        const args: any = decoded.args;
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

function deliveryAccessRoute(key: string) {
  return `/api/admin/users/${encodeURIComponent(key)}/delivery-access`;
}

export default function AdminMintForm() {
  const mounted = useMounted();
  const savedRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const posterInputRef = useRef<HTMLInputElement | null>(null);

  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();

  const connected = mounted ? isConnected : false;
  const effectiveChainId = mounted ? chainId : undefined;
  const wrongNetwork = connected && effectiveChainId !== baseSepolia.id;

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
    if (!mounted || !balanceData) return null;
    const s = formatUnits(balanceData.value, balanceData.decimals);
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }, [mounted, balanceData]);

  const balanceLabel = useMemo(() => {
    if (!mounted || !connected) return "—";
    if (isBalanceLoading) return "loading…";
    if (!balanceData) {
      return `— ${baseSepolia.nativeCurrency?.symbol ?? "ETH"}`;
    }
    const s = formatUnits(balanceData.value, balanceData.decimals);
    return `${fmtEth(s)} ${balanceData.symbol ?? "ETH"}`;
  }, [mounted, connected, isBalanceLoading, balanceData]);

  const [productMode, setProductMode] = useState<ProductMode>("cafe");
  const [storeBrand, setStoreBrand] = useState<StoreBrand>("Realife");

  const selectedContract =
    productMode === "cafe" ? CAFE_CONTRACT : STORE_CONTRACT;
  const selectedAbi = productMode === "cafe" ? cafeStoreAbi : storeAdminAbi;
  const selectedLabel =
    productMode === "cafe" ? "Realife Cafe" : "Realife NFT Store";
  const selectedCollectionDefault =
    productMode === "cafe"
      ? "Realife Crypto Cafe"
      : storeBrand === "Other"
      ? "Partner NFT Store"
      : `${storeBrand} NFT Store`;
  const selectedStorefrontHref =
    productMode === "cafe"
      ? "/app/real-marketing/realife-cafe"
      : "/app/real-marketing/realife-store";
  const selectedCategories =
    productMode === "cafe" ? CAFE_CATEGORIES : STORE_CATEGORIES;
  const selectedItems = productMode === "cafe" ? CAFE_ITEMS : STORE_ITEMS;
  const effectiveProjectBrand = productMode === "store" ? storeBrand : "Realife";

  const { data: moderatorRoleRaw } = useReadContract({
    address: selectedContract,
    abi: selectedAbi as any,
    functionName: "MODERATOR_ROLE",
    query: { enabled: Boolean(selectedContract) },
  });

  const moderatorRole =
    typeof moderatorRoleRaw === "string" &&
    moderatorRoleRaw.startsWith("0x")
      ? (moderatorRoleRaw as `0x${string}`)
      : ZERO_BYTES32;

  const { data: hasModeratorRoleRaw } = useReadContract({
    address: selectedContract,
    abi: selectedAbi as any,
    functionName: "hasRole",
    args: [moderatorRole, (address || ZERO_ADDRESS) as `0x${string}`],
    query: {
      enabled: Boolean(
        selectedContract && address && moderatorRole !== ZERO_BYTES32
      ),
    },
  });

  const { data: nextTokenIdRaw, refetch: refetchNextTokenId } =
    useReadContract({
      address: selectedContract,
      abi: selectedAbi as any,
      functionName: "nextTokenId",
      query: { enabled: Boolean(selectedContract) },
    });

  const allowlistOk = useMemo(() => {
    if (!address) return false;
    if (!ADMIN_WALLETS.length) return true;
    return ADMIN_WALLETS.includes(address.toLowerCase());
  }, [address]);

  const hasModeratorRole = Boolean(hasModeratorRoleRaw);
  const isAuthorized =
    connected && !wrongNetwork && allowlistOk && hasModeratorRole;

  const canUseDeliveryAccessManager =
    connected && !wrongNetwork && allowlistOk;

  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);

  const [category, setCategory] = useState<string>(CAFE_CATEGORIES[0]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [supply, setSupply] = useState<number>(100);
  const [price, setPrice] = useState("5");
  const [externalUrl, setExternalUrl] = useState("");

  const [collection, setCollection] = useState("Realife Crypto Cafe");
  const [item, setItem] = useState<string>(CAFE_ITEMS[0]);
  const [rarity, setRarity] =
    useState<(typeof RARITIES)[number]>("Common");

  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [physicalItemIncluded, setPhysicalItemIncluded] = useState(true);
  const [officialItem, setOfficialItem] = useState(true);

  const [step, setStep] = useState<"idle" | "preparing" | "signing" | "mining">(
    "idle"
  );
  const [error, setError] = useState<string>("");

  const [tokenURI, setTokenURI] = useState<string | null>(null);
  const [preparedKind, setPreparedKind] = useState<"image" | "video">("image");
  const [preparedMedia, setPreparedMedia] = useState<string | null>(null);
  const [preparedPoster, setPreparedPoster] = useState<string | null>(null);

  const [createdTokenId, setCreatedTokenId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [createdMode, setCreatedMode] = useState<ProductMode | null>(null);
  const [createdBrand, setCreatedBrand] = useState<string | null>(null);

  const [txMode, setTxMode] = useState<"create" | "toggle" | "deliveryAccess" | null>(null);
  const [txTarget, setTxTarget] = useState<ProductMode | null>(null);
  const [pendingTxHash, setPendingTxHash] = useState<
    `0x${string}` | undefined
  >(undefined);

  const [manageTokenId, setManageTokenId] = useState("");
  const [manageNotice, setManageNotice] = useState("");
  const [toggleIntent, setToggleIntent] = useState<"enable" | "disable" | null>(
    null
  );

  const [deliveryLookup, setDeliveryLookup] = useState("");
  const [deliveryLookupLoading, setDeliveryLookupLoading] = useState(false);
  const [deliveryLookupError, setDeliveryLookupError] = useState("");
  const [deliveryLookupNotice, setDeliveryLookupNotice] = useState("");
  const [deliveryAccessUser, setDeliveryAccessUser] = useState<DeliveryAccessUser | null>(null);
  const [deliveryAccessNote, setDeliveryAccessNote] = useState("");
  const [deliveryAccessSaving, setDeliveryAccessSaving] = useState(false);

  const [pendingDeliveryAccessLookupKey, setPendingDeliveryAccessLookupKey] = useState<string | null>(null);
  const [pendingDeliveryAccessWallet, setPendingDeliveryAccessWallet] = useState<`0x${string}` | null>(null);
  const [pendingDeliveryAccessAllowed, setPendingDeliveryAccessAllowed] = useState<boolean | null>(null);
  const [pendingDeliveryAccessNote, setPendingDeliveryAccessNote] = useState("");
  const [pendingDeliveryAccessUserExists, setPendingDeliveryAccessUserExists] = useState(false);

  const pickedKind = useMemo<"image" | "video">(
    () => (file?.type?.startsWith("video/") ? "video" : "image"),
    [file]
  );

  const effectivePreviewKind = tokenURI ? preparedKind : pickedKind;
  const effectivePreviewSrc = tokenURI
    ? preparedMedia || filePreviewUrl
    : filePreviewUrl;
  const effectivePoster = tokenURI ? preparedPoster : posterPreviewUrl;

  const refreshLabel =
    !mounted ? "Refresh" : isBalanceFetching ? "Refreshing…" : "Refresh";
  const requiredContractOk = Boolean(selectedContract);

  const priceParsed = useMemo(() => {
    const raw = price.trim().replace(",", ".");
    if (!raw) return null;
    try {
      return parseUnits(raw, 6);
    } catch {
      return null;
    }
  }, [price]);

  const manageTokenIdBI = useMemo(() => {
    const v = manageTokenId.trim();
    if (!/^\d+$/.test(v)) return null;
    try {
      const bi = BigInt(v);
      return bi > 0n ? bi : null;
    } catch {
      return null;
    }
  }, [manageTokenId]);

  const nextTokenId =
    typeof nextTokenIdRaw === "bigint" ? nextTokenIdRaw : null;
  const manageTokenExists = Boolean(
    manageTokenIdBI &&
      nextTokenId &&
      manageTokenIdBI > 0n &&
      manageTokenIdBI < nextTokenId
  );

  const {
    data: manageIsActiveRaw,
    isFetching: isManageStatusFetching,
    refetch: refetchManageStatus,
  } = useReadContract({
    address: selectedContract,
    abi: selectedAbi as any,
    functionName: "isActive",
    args: [manageTokenIdBI ?? 0n],
    query: {
      enabled: Boolean(selectedContract && manageTokenIdBI && manageTokenExists),
    },
  });

  const manageIsActive = Boolean(manageIsActiveRaw);

  const resolvedDeliveryWallet = useMemo(() => {
    const raw = String(deliveryAccessUser?.walletAddress || "").trim();
    return isAddressLike(raw) ? (raw as `0x${string}`) : undefined;
  }, [deliveryAccessUser]);

  const {
    data: deliveryOnchainAllowedRaw,
    isLoading: isDeliveryOnchainLoading,
    isFetching: isDeliveryOnchainFetching,
    refetch: refetchDeliveryOnchainAccess,
  } = useReadContract({
    address: PUBLIC_DELIVERY_MINT_CONTRACT,
    abi: realife1155DeliveryAbi as any,
    functionName: "allowedDeliveryMinters" as any,
    args: [resolvedDeliveryWallet ?? ZERO_ADDRESS],
    query: { enabled: Boolean(PUBLIC_DELIVERY_MINT_CONTRACT && resolvedDeliveryWallet) },
  });

  const deliveryOnchainAllowed = Boolean(deliveryOnchainAllowedRaw);
  const deliveryStateMismatch =
    Boolean(deliveryAccessUser) &&
    Boolean(resolvedDeliveryWallet) &&
    Boolean(PUBLIC_DELIVERY_MINT_CONTRACT) &&
    !isDeliveryOnchainLoading &&
    deliveryAccessUser!.approvedPhysicalSeller !== deliveryOnchainAllowed;

  const canPrepare = Boolean(
    file &&
      name.trim() &&
      collection.trim() &&
      item &&
      rarity &&
      priceParsed !== null &&
      requiredContractOk &&
      isAuthorized
  );

  const canCreate = Boolean(
    tokenURI &&
      collection.trim() &&
      item &&
      rarity &&
      priceParsed !== null &&
      requiredContractOk &&
      isAuthorized
  );

  const canManageToggle = Boolean(
    requiredContractOk &&
      isAuthorized &&
      manageTokenIdBI &&
      manageTokenExists &&
      txMode === null &&
      !isSwitching
  );

  const deliveryMintContractReady = Boolean(PUBLIC_DELIVERY_MINT_CONTRACT);

  const busy = step !== "idle" || isSwitching || txMode !== null;

  const { writeContractAsync, isPending: isWalletPromptOpen } =
    useWriteContract();

  const { isLoading: isReceiptLoading, isSuccess, data: receipt } =
    useWaitForTransactionReceipt({
      hash: pendingTxHash,
      query: { enabled: Boolean(pendingTxHash) },
    });

  const isMiningCreate = txMode === "create" && isReceiptLoading;
  const isMiningToggle = txMode === "toggle" && isReceiptLoading;
  const isMiningDeliveryAccess = txMode === "deliveryAccess" && isReceiptLoading;

  useEffect(() => {
    if (productMode === "cafe") {
      setStoreBrand("Realife");
      setCollection("Realife Crypto Cafe");
      setCategory(CAFE_CATEGORIES[0]);
      setItem(CAFE_ITEMS[0]);
      setDeliveryEnabled(false);
      setPhysicalItemIncluded(false);
      setOfficialItem(true);
    } else {
      setStoreBrand("Realife");
      setCollection("Realife NFT Store");
      setCategory(STORE_CATEGORIES[0]);
      setItem(STORE_ITEMS[0]);
      setDeliveryEnabled(true);
      setPhysicalItemIncluded(true);
      setOfficialItem(true);
    }

    setManageTokenId("");
    setManageNotice("");
    setError("");
    setCreatedTokenId(null);
    setCreatedAt(null);
    setCreatedMode(null);
    setCreatedBrand(null);
    savedRef.current = false;
    setTokenURI(null);
    setPreparedMedia(null);
    setPreparedPoster(null);
  }, [productMode]);

  useEffect(() => {
    if (productMode !== "store") return;

    const knownDefaults = STORE_BRANDS.map((brand) =>
      brand === "Other" ? "Partner NFT Store" : `${brand} NFT Store`
    );

    const current = collection.trim();
    if (!current || knownDefaults.includes(current)) {
      setCollection(
        storeBrand === "Other" ? "Partner NFT Store" : `${storeBrand} NFT Store`
      );
    }
  }, [productMode, storeBrand, collection]);

  useEffect(() => {
    if (productMode !== "store") return;

    if (!deliveryEnabled && physicalItemIncluded) {
      setPhysicalItemIncluded(false);
    }
  }, [productMode, deliveryEnabled, physicalItemIncluded]);

  useEffect(() => {
    if (!isSuccess || !receipt || !txMode) return;

    if (txMode === "create" && txTarget) {
      if (savedRef.current) return;
      savedRef.current = true;

      (async () => {
        const targetAbi = txTarget === "cafe" ? cafeStoreAbi : storeAdminAbi;
        const targetContract =
          txTarget === "cafe" ? CAFE_CONTRACT : STORE_CONTRACT;

        const tokenId = extractProductTokenIdFromReceipt(
          receipt,
          targetAbi,
          targetContract
        );

        setCreatedTokenId(tokenId);
        setCreatedAt(new Date().toLocaleString());
        setCreatedMode(txTarget);
        setCreatedBrand(txTarget === "store" ? storeBrand : "Realife");
        setStep("idle");

        try {
          const finalImage =
            persistableUrl(
              preparedKind === "video" ? preparedPoster : preparedMedia
            ) ||
            persistableUrl(preparedMedia) ||
            null;

          if (targetContract && tokenId) {
            const saveRes = await fetch("/api/mints", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                chainId: baseSepolia.id,
                contract: targetContract,
                tokenId,
                txHash: pendingTxHash || "",
                tokenUri: tokenURI || "",
                name:
                  name.trim() ||
                  `${txTarget === "cafe" ? "Realife Cafe" : "Realife Store"} Product`,
                image: finalImage,
                verified: true,
                standard: "ERC1155",
                catalogOnly: true,
                deliveryEnabled:
                  txTarget === "store" ? Boolean(deliveryEnabled) : false,
                physicalItemIncluded:
                  txTarget === "store" ? Boolean(physicalItemIncluded) : false,
                officialItem:
                  txTarget === "store" ? Boolean(officialItem) : false,
              }),
            });

            if (!saveRes.ok) {
              const saveData = await saveRes.json().catch(() => null);
              console.warn("[ADMIN_PRODUCT_SAVE_WARNING]", saveData || saveRes.status);
            }

            setManageTokenId(tokenId);
            setManageNotice(
              `${txTarget === "cafe" ? "Cafe" : "Store"} product created and saved to local catalog cache.`
            );
          }
        } catch (e) {
          console.warn("[ADMIN_PRODUCT_SAVE_ERROR]", e);
        } finally {
          setPendingTxHash(undefined);
          setTxMode(null);
          setTxTarget(null);
          setToggleIntent(null);
          void refetchNextTokenId();
          void refetchManageStatus();
        }
      })();

      return;
    }

    if (txMode === "toggle" && txTarget) {
      setManageNotice(
        toggleIntent === "disable"
          ? `${txTarget === "cafe" ? "Cafe" : "Store"} product successfully disabled.`
          : `${txTarget === "cafe" ? "Cafe" : "Store"} product successfully enabled.`
      );
      setPendingTxHash(undefined);
      setTxMode(null);
      setTxTarget(null);
      setToggleIntent(null);
      void refetchNextTokenId();
      void refetchManageStatus();
      return;
    }

    if (txMode === "deliveryAccess") {
      (async () => {
        try {
          if (
            pendingDeliveryAccessAllowed === null ||
            !pendingDeliveryAccessWallet ||
            !pendingDeliveryAccessLookupKey
          ) {
            throw new Error("Missing pending delivery access context.");
          }

          if (pendingDeliveryAccessAllowed || pendingDeliveryAccessUserExists) {
            const r = await fetch(
              deliveryAccessRoute(pendingDeliveryAccessLookupKey),
              {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  approvedPhysicalSeller: pendingDeliveryAccessAllowed,
                  note: pendingDeliveryAccessAllowed ? pendingDeliveryAccessNote : "",
                }),
              }
            );

            const data = await r.json().catch(() => null);
            if (!r.ok || !data?.ok || !data?.user) {
              throw new Error(
                data?.error || data?.message || "Failed to sync delivery access to DB"
              );
            }

            const u = data.user as DeliveryAccessUser;
            setDeliveryAccessUser(u);
            setDeliveryAccessNote(String(u.approvedPhysicalNote || ""));
          } else {
            setDeliveryAccessUser((prev) =>
              prev
                ? {
                    ...prev,
                    approvedPhysicalSeller: false,
                    approvedPhysicalAt: null,
                    approvedPhysicalNote: null,
                    userExists: false,
                  }
                : prev
            );
            setDeliveryAccessNote("");
          }

          setDeliveryLookupNotice(
            pendingDeliveryAccessAllowed
              ? "Delivery mint access granted on-chain and synced to DB."
              : "Delivery mint access revoked on-chain and synced to DB."
          );
          setDeliveryLookupError("");
          await refetchDeliveryOnchainAccess();
        } catch (e: any) {
          setDeliveryLookupError(prettyError(e));
          setDeliveryLookupNotice("");
        } finally {
          setPendingTxHash(undefined);
          setTxMode(null);
          setTxTarget(null);
          setToggleIntent(null);
          setPendingDeliveryAccessLookupKey(null);
          setPendingDeliveryAccessWallet(null);
          setPendingDeliveryAccessAllowed(null);
          setPendingDeliveryAccessNote("");
          setPendingDeliveryAccessUserExists(false);
          setDeliveryAccessSaving(false);
        }
      })();
    }
  }, [
    isSuccess,
    receipt,
    txMode,
    txTarget,
    toggleIntent,
    pendingTxHash,
    tokenURI,
    preparedKind,
    preparedPoster,
    preparedMedia,
    name,
    storeBrand,
    deliveryEnabled,
    physicalItemIncluded,
    officialItem,
    refetchManageStatus,
    refetchNextTokenId,
    pendingDeliveryAccessAllowed,
    pendingDeliveryAccessLookupKey,
    pendingDeliveryAccessNote,
    pendingDeliveryAccessUserExists,
    pendingDeliveryAccessWallet,
    refetchDeliveryOnchainAccess,
  ]);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
      if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
    };
  }, [filePreviewUrl, posterPreviewUrl]);

  useEffect(() => {
    setManageNotice("");
  }, [manageTokenId]);

  function resetPreparedState() {
    setTokenURI(null);
    setPreparedMedia(null);
    setPreparedPoster(null);
    setCreatedTokenId(null);
    setCreatedAt(null);
    setCreatedMode(null);
    setCreatedBrand(null);
    savedRef.current = false;
  }

  function onPickFile(f: File | null) {
    setError("");
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

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function openPosterPicker() {
    posterInputRef.current?.click();
  }

  async function ensureCorrectNetwork() {
    if (!connected) {
      openConnectModal?.();
      throw new Error("Connect wallet first.");
    }
    if (effectiveChainId !== baseSepolia.id) {
      await switchChainAsync({ chainId: baseSepolia.id });
    }
  }

  async function resolveDeliveryAccessUser() {
    setDeliveryLookupError("");
    setDeliveryLookupNotice("");

    const raw = deliveryLookup.trim();
    if (!raw) {
      setDeliveryLookupError("Enter user id, publicId, handle or wallet.");
      return;
    }

    setDeliveryLookupLoading(true);

    try {
      const res = await fetch(deliveryAccessRoute(raw), {
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok || !data?.user) {
        if (res.status === 403) {
          throw new Error("Admin API access denied for this wallet/session.");
        }
        throw new Error(data?.error || "User not found.");
      }

      const u = data.user as DeliveryAccessUser;
      setDeliveryAccessUser(u);
      setDeliveryAccessNote(String(u.approvedPhysicalNote || ""));
      setDeliveryLookupNotice("User resolved for delivery mint access.");
      setDeliveryLookupError("");
    } catch (e: any) {
      setDeliveryAccessUser(null);
      setDeliveryAccessNote("");
      setDeliveryLookupError(prettyError(e));
      setDeliveryLookupNotice("");
    } finally {
      setDeliveryLookupLoading(false);
    }
  }

  async function handleDeliveryAccessUpdate(nextAllowed: boolean) {
    if (!deliveryAccessUser) {
      setDeliveryLookupError("Resolve a user first.");
      return;
    }

    if (!resolvedDeliveryWallet) {
      setDeliveryLookupError("Resolved user wallet is missing or invalid.");
      return;
    }

    if (!deliveryMintContractReady || !PUBLIC_DELIVERY_MINT_CONTRACT) {
      setDeliveryLookupError("Missing NEXT_PUBLIC_REALIFE_1155_DELIVERY_CONTRACT.");
      return;
    }

    if (!canUseDeliveryAccessManager) {
      setDeliveryLookupError("Connect the admin wallet on Base Sepolia and make sure it is allowlisted.");
      return;
    }

    setDeliveryLookupError("");
    setDeliveryLookupNotice("");
    setDeliveryAccessSaving(true);

    try {
      await ensureCorrectNetwork();

      const freshBalance = await refetchBalance();
      if (freshBalance.data?.value === 0n) {
        setDeliveryLookupError("No gas on Base Sepolia. Open Faucet, get test ETH, then continue.");
        setDeliveryAccessSaving(false);
        return;
      }

      setTxMode("deliveryAccess");
      setPendingDeliveryAccessLookupKey(
        deliveryAccessUser.userExists ? deliveryAccessUser.id : resolvedDeliveryWallet
      );
      setPendingDeliveryAccessWallet(resolvedDeliveryWallet);
      setPendingDeliveryAccessAllowed(nextAllowed);
      setPendingDeliveryAccessNote(deliveryAccessNote.trim());
      setPendingDeliveryAccessUserExists(Boolean(deliveryAccessUser.userExists));

      const hash = await writeContractAsync({
        address: PUBLIC_DELIVERY_MINT_CONTRACT,
        abi: realife1155DeliveryAbi as any,
        functionName: "setAllowedDeliveryMinter" as any,
        args: [resolvedDeliveryWallet, nextAllowed],
      });

      if (hash) {
        setPendingTxHash(hash);
      } else {
        setTxMode(null);
        setPendingDeliveryAccessLookupKey(null);
        setPendingDeliveryAccessWallet(null);
        setPendingDeliveryAccessAllowed(null);
        setPendingDeliveryAccessNote("");
        setPendingDeliveryAccessUserExists(false);
        setDeliveryAccessSaving(false);
      }
    } catch (e: any) {
      setDeliveryLookupError(prettyError(e));
      setDeliveryLookupNotice("");
      setTxMode(null);
      setPendingTxHash(undefined);
      setPendingDeliveryAccessLookupKey(null);
      setPendingDeliveryAccessWallet(null);
      setPendingDeliveryAccessAllowed(null);
      setPendingDeliveryAccessNote("");
      setPendingDeliveryAccessUserExists(false);
      setDeliveryAccessSaving(false);
    }
  }

  async function handlePrepare() {
    setError("");

    if (!selectedContract) {
      setError(
        productMode === "cafe"
          ? "Missing NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT in Railway/ENV"
          : "Missing NEXT_PUBLIC_REALIFE_STORE_CONTRACT in Railway/ENV"
      );
      return;
    }

    if (!file) {
      setError("Upload product media first.");
      return;
    }

    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (!collection.trim()) {
      setError("Collection is required.");
      return;
    }

    if (!item) {
      setError("Item is required.");
      return;
    }

    if (!rarity) {
      setError("Rarity is required.");
      return;
    }

    if (!priceParsed || priceParsed < 0n) {
      setError("Enter a valid USDT price.");
      return;
    }

    if (!isAuthorized) {
      setError("This page is restricted to the admin moderator wallet.");
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
      formData.append(
        "description",
        description.trim() || `${name.trim()} • ${collection.trim()}`
      );
      formData.append("project", effectiveProjectBrand);
      formData.append("brandProject", effectiveProjectBrand);
      formData.append("category", category);
      formData.append("collection", collection.trim());
      formData.append("item", item);
      formData.append("drink", item);
      formData.append("rarity", rarity);
      formData.append("supply", String(clampSupply(supply)));
      formData.append("proofUrl", externalUrl.trim());
      formData.append("externalUrl", externalUrl.trim());
      formData.append("vertical", productMode);
      formData.append(
        "deliveryEnabled",
        productMode === "store" && deliveryEnabled ? "true" : "false"
      );
      formData.append(
        "physicalItemIncluded",
        productMode === "store" && physicalItemIncluded ? "true" : "false"
      );
      formData.append(
        "officialItem",
        productMode === "store" && officialItem ? "true" : "false"
      );

      const res = await fetch(PREPARE_URL, { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Metadata preparation failed");
      }

      const uri =
        data?.metadataUri || data?.tokenURI || data?.tokenUri || null;
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

      setStep("idle");
    } catch (e: any) {
      setError(prettyError(e));
      setStep("idle");
    }
  }

  async function handleCreateProduct() {
    setError("");

    if (!tokenURI) {
      setError("First click: Prepare (Upload → IPFS).");
      return;
    }

    if (!selectedContract) {
      setError(
        productMode === "cafe"
          ? "Missing NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT in Railway/ENV"
          : "Missing NEXT_PUBLIC_REALIFE_STORE_CONTRACT in Railway/ENV"
      );
      return;
    }

    if (!collection.trim()) {
      setError("Collection is required.");
      return;
    }

    if (!item) {
      setError("Item is required.");
      return;
    }

    if (!rarity) {
      setError("Rarity is required.");
      return;
    }

    if (!priceParsed || priceParsed < 0n) {
      setError("Enter a valid USDT price.");
      return;
    }

    if (!isAuthorized) {
      setError("This page is restricted to the admin moderator wallet.");
      return;
    }

    try {
      await ensureCorrectNetwork();

      const freshBalance = await refetchBalance();
      if (freshBalance.data?.value === 0n) {
        setError("No gas on Base Sepolia. Open Faucet, get test ETH, then create.");
        return;
      }

      savedRef.current = false;
      setTxMode("create");
      setTxTarget(productMode);
      setStep("signing");

      const hash =
        productMode === "cafe"
          ? await writeContractAsync({
              address: selectedContract,
              abi: cafeStoreAbi,
              functionName: "createProduct",
              args: [BigInt(clampSupply(supply)), priceParsed, tokenURI],
            })
          : await writeContractAsync({
              address: selectedContract,
              abi: storeAdminAbi,
              functionName: officialItem
                ? "createOfficialProduct"
                : "createSellerProduct",
              args: [
                BigInt(clampSupply(supply)),
                priceParsed,
                tokenURI,
                deliveryEnabled,
                physicalItemIncluded,
              ],
            });

      if (hash) {
        setPendingTxHash(hash);
        setStep("mining");
      } else {
        setTxMode(null);
        setTxTarget(null);
        setStep("idle");
      }
    } catch (e: any) {
      setError(prettyError(e));
      setTxMode(null);
      setTxTarget(null);
      setPendingTxHash(undefined);
      setStep("idle");
    }
  }

  async function handleToggleProductStatus() {
    setError("");
    setManageNotice("");

    if (!selectedContract) {
      setError(
        productMode === "cafe"
          ? "Missing NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT in Railway/ENV"
          : "Missing NEXT_PUBLIC_REALIFE_STORE_CONTRACT in Railway/ENV"
      );
      return;
    }

    if (!manageTokenIdBI) {
      setError("Enter a valid product token ID.");
      return;
    }

    if (!manageTokenExists) {
      setError("This tokenId does not exist in the selected contract.");
      return;
    }

    if (!isAuthorized) {
      setError("This page is restricted to the admin moderator wallet.");
      return;
    }

    try {
      await ensureCorrectNetwork();

      const freshBalance = await refetchBalance();
      if (freshBalance.data?.value === 0n) {
        setError("No gas on Base Sepolia. Open Faucet, get test ETH, then continue.");
        return;
      }

      setTxMode("toggle");
      setTxTarget(productMode);
      setToggleIntent(manageIsActive ? "disable" : "enable");

      const hash = await writeContractAsync({
        address: selectedContract,
        abi: selectedAbi as any,
        functionName: "toggleProductStatus",
        args: [manageTokenIdBI],
      });

      if (hash) {
        setPendingTxHash(hash);
      } else {
        setTxMode(null);
        setTxTarget(null);
        setToggleIntent(null);
      }
    } catch (e: any) {
      setError(prettyError(e));
      setTxMode(null);
      setTxTarget(null);
      setToggleIntent(null);
      setPendingTxHash(undefined);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <div className="space-y-8">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Pill>
                  <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
                  Admin Store Access
                </Pill>

                <Pill>
                  <span className="text-white/80 font-extrabold">Base Sepolia</span>
                </Pill>

                <Pill>
                  <span className="text-white/70">Mode:</span>
                  <span className="text-amber-200 font-extrabold">{selectedLabel}</span>
                </Pill>

                <Pill>
                  <span className="text-white/70">Contract:</span>
                  <span className="text-amber-200 font-extrabold">
                    {selectedContract ? shortAddr(selectedContract) : "missing"}
                  </span>
                </Pill>

                {productMode === "store" ? (
                  <Pill>
                    <span className="text-white/70">Brand:</span>
                    <span className="text-amber-200 font-extrabold">{storeBrand}</span>
                  </Pill>
                ) : null}
              </div>

              <div className="mt-4 text-sm md:text-base font-extrabold tracking-tight">
                {!mounted || !connected
                  ? "Connect the admin wallet"
                  : wrongNetwork
                  ? "Switch to Base Sepolia"
                  : isAuthorized
                  ? "Authorized moderator wallet"
                  : "Access denied"}
              </div>

              <div className="mt-2 text-[11px] text-white/55 leading-relaxed">
                One private admin route for both{" "}
                <span className="text-white/75 font-semibold">Realife Cafe</span> and{" "}
                <span className="text-white/75 font-semibold">Realife NFT Store</span>.
              </div>

              {productMode === "store" ? (
                <div className="mt-3 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-[11px] text-sky-50/85 leading-relaxed">
                  Store mode can keep one shared Store contract on Base Sepolia while each product still carries its own{" "}
                  <span className="font-black text-sky-100">brand / project label</span> in metadata and UI.
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[11px] text-white/65 leading-relaxed">
                  Cafe mode stays under the native{" "}
                  <span className="font-black text-white/85">Realife</span> brand.
                </div>
              )}

              <div className="mt-3 space-y-2 text-xs text-white/65">
                <div>
                  Connected wallet:{" "}
                  <span className="font-semibold text-white">
                    {address ? shortAddr(address) : "—"}
                  </span>
                </div>
                <div>
                  Allowlist:{" "}
                  <span
                    className={
                      allowlistOk
                        ? "font-semibold text-emerald-200"
                        : "font-semibold text-rose-200"
                    }
                  >
                    {allowlistOk ? "OK" : "Blocked"}
                  </span>
                </div>
                <div>
                  Moderator role:{" "}
                  <span
                    className={
                      hasModeratorRole
                        ? "font-semibold text-emerald-200"
                        : "font-semibold text-rose-200"
                    }
                  >
                    {hasModeratorRole ? "Granted" : "Missing"}
                  </span>
                </div>
                <div>
                  Balance: <span className="font-semibold text-white">{balanceLabel}</span>
                </div>
                <div>
                  Next token id:{" "}
                  <span className="font-semibold text-white">
                    {nextTokenId ? nextTokenId.toString() : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void refetchBalance();
                  void refetchNextTokenId();
                  void refetchManageStatus();
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

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setProductMode("cafe")}
              className={[
                "px-4 py-3 rounded-2xl border text-sm font-extrabold transition",
                productMode === "cafe"
                  ? "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black border-black/10 ring-1 ring-black/10"
                  : "bg-white/[0.06] border-white/10 hover:bg-white/10 text-white",
              ].join(" ")}
            >
              Realife Cafe
            </button>

            <button
              type="button"
              onClick={() => setProductMode("store")}
              className={[
                "px-4 py-3 rounded-2xl border text-sm font-extrabold transition",
                productMode === "store"
                  ? "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black border-black/10 ring-1 ring-black/10"
                  : "bg-white/[0.06] border-white/10 hover:bg-white/10 text-white",
              ].join(" ")}
            >
              Realife NFT Store
            </button>
          </div>

          {!requiredContractOk ? (
            <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              Missing{" "}
              <b>
                {productMode === "cafe"
                  ? "NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT"
                  : "NEXT_PUBLIC_REALIFE_STORE_CONTRACT"}
              </b>{" "}
              in Railway env
            </div>
          ) : null}

          {!allowlistOk && ADMIN_WALLETS.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              This wallet is not in <b>NEXT_PUBLIC_ADMIN_CREATE_WALLETS</b>.
            </div>
          ) : null}

          {!hasModeratorRole && connected && !wrongNetwork ? (
            <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              Connected wallet does not have <b>MODERATOR_ROLE</b> in the selected contract.
            </div>
          ) : null}

          {connected && !wrongNetwork && balanceEth === null ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/70">
              Wallet balance is still loading. You can refresh once if needed.
            </div>
          ) : null}
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight">Delivery Mint Access Manager</div>
              <div className="mt-1 text-[11px] text-white/55">
                Grant or revoke access for the public user mint form to use the{" "}
                <span className="font-black text-white/85">delivery mint contract</span>.
              </div>
            </div>

            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Admin only
            </Pill>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] uppercase tracking-wider text-white/45 font-semibold">
                Public standard mint contract
              </div>
              <div className="mt-1 text-sm font-black text-white/90 break-all">
                {PUBLIC_STANDARD_MINT_CONTRACT || "not-set"}
              </div>
              <div className="mt-2 text-[11px] text-white/55">
                Standard public mint is available without this special access.
              </div>
            </div>

            <div
              className={`rounded-2xl border p-4 ${
                deliveryMintContractReady
                  ? "border-emerald-500/20 bg-emerald-500/10"
                  : "border-rose-500/20 bg-rose-500/10"
              }`}
            >
              <div className="text-[11px] uppercase tracking-wider text-white/45 font-semibold">
                Public delivery mint contract
              </div>
              <div className="mt-1 text-sm font-black text-white/90 break-all">
                {PUBLIC_DELIVERY_MINT_CONTRACT || "not-set"}
              </div>
              <div className="mt-2 text-[11px] text-white/55">
                This access should unlock minting through the delivery contract only.
              </div>
            </div>
          </div>

          {!deliveryMintContractReady ? (
            <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              Missing <b>NEXT_PUBLIC_REALIFE_1155_DELIVERY_CONTRACT</b>. On-chain delivery access management cannot work until this env is set.
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
            <div className="text-[12px] font-black text-sky-100">
              New access flow
            </div>
            <div className="mt-2 space-y-2 text-[12px] text-sky-50/85 leading-relaxed">
              <div>
                • standard public mint stays separate and does not need this access
              </div>
              <div>
                • grant / revoke first changes the{" "}
                <span className="font-black text-sky-100">delivery contract allowlist on-chain</span>
              </div>
              <div>
                • after successful tx, the panel syncs{" "}
                <span className="font-black text-sky-100">approvedPhysicalSeller</span> in DB
              </div>
              <div>
                • you can now see DB status and on-chain allowlist status separately
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
              User lookup
            </div>
            <input
              type="text"
              placeholder="User id / publicId / handle / 0xwallet"
              value={deliveryLookup}
              onChange={(e) => {
                setDeliveryLookup(e.target.value);
                setDeliveryLookupError("");
                setDeliveryLookupNotice("");
              }}
              className={[
                "mt-2 w-full rounded-2xl px-4 py-3 text-sm",
                "bg-white/[0.04] border border-white/10 text-white",
                "placeholder:text-white/35",
                "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-white/20",
              ].join(" ")}
            />
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <GhostButton
              disabled={!canUseDeliveryAccessManager || deliveryLookupLoading || deliveryAccessSaving || !deliveryLookup.trim()}
              onClick={resolveDeliveryAccessUser}
            >
              {deliveryLookupLoading ? "Resolving user…" : "Resolve user"}
            </GhostButton>

            <GhostButton
              disabled={!canUseDeliveryAccessManager || deliveryLookupLoading || deliveryAccessSaving || !deliveryAccessUser}
              onClick={resolveDeliveryAccessUser}
            >
              Refresh access
            </GhostButton>
          </div>

          <div className="mt-3 text-[11px] text-white/50 leading-relaxed">
            Search supports <span className="text-white/75 font-semibold">database user id</span>,{" "}
            <span className="text-white/75 font-semibold">publicId</span>,{" "}
            <span className="text-white/75 font-semibold">handle</span> or{" "}
            <span className="text-white/75 font-semibold">wallet address</span>.
          </div>

          {!canUseDeliveryAccessManager && connected && !wrongNetwork ? (
            <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              Delivery access manager uses front-end wallet allowlist plus delivery contract admin permissions. This panel does not depend on current Cafe/Store mode role checks.
            </div>
          ) : null}

          {deliveryLookupError ? (
            <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {deliveryLookupError}
            </div>
          ) : null}

          {deliveryLookupNotice ? (
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {deliveryLookupNotice}
            </div>
          ) : null}

          {deliveryAccessUser ? (
            <>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-wider text-white/45 font-semibold">
                    User
                  </div>
                  <div className="mt-1 text-sm font-black text-white/90">
                    {deliveryAccessUser.handle
                      ? `@${deliveryAccessUser.handle}`
                      : deliveryAccessUser.publicId || deliveryAccessUser.id}
                  </div>
                  <div className="mt-2 text-xs text-white/60 break-all">
                    DB id: <span className="text-white/85">{deliveryAccessUser.id}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-wider text-white/45 font-semibold">
                    Wallet
                  </div>
                  <div className="mt-1 text-sm font-black text-white/90">
                    {shortAddr(deliveryAccessUser.walletAddress)}
                  </div>
                  <div className="mt-2 text-xs text-white/60 break-all">
                    <span className="text-white/85">{deliveryAccessUser.walletAddress}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-wider text-white/45 font-semibold">
                    DB delivery access
                  </div>
                  <div
                    className={`mt-1 text-sm font-black ${
                      deliveryAccessUser.approvedPhysicalSeller
                        ? "text-emerald-200"
                        : "text-white/90"
                    }`}
                  >
                    {deliveryAccessUser.approvedPhysicalSeller ? "Approved" : "Not approved"}
                  </div>
                  <div className="mt-2 text-[11px] text-white/55">
                    App-level profile flag stored in database.
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-wider text-white/45 font-semibold">
                    On-chain allowlist
                  </div>
                  <div
                    className={`mt-1 text-sm font-black ${
                      isDeliveryOnchainLoading || isDeliveryOnchainFetching
                        ? "text-white"
                        : deliveryOnchainAllowed
                        ? "text-emerald-200"
                        : "text-rose-200"
                    }`}
                  >
                    {isDeliveryOnchainLoading || isDeliveryOnchainFetching
                      ? "Checking…"
                      : deliveryOnchainAllowed
                      ? "Allowed"
                      : "Not allowed"}
                  </div>
                  <div className="mt-2 text-[11px] text-white/55">
                    Read directly from the delivery mint contract.
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-wider text-white/45 font-semibold">
                    Approved at
                  </div>
                  <div className="mt-1 text-sm font-black text-white/90">
                    {deliveryAccessUser.approvedPhysicalAt
                      ? new Date(deliveryAccessUser.approvedPhysicalAt).toLocaleString()
                      : "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-wider text-white/45 font-semibold">
                    User row
                  </div>
                  <div className="mt-1 text-sm font-black text-white/90">
                    {deliveryAccessUser.userExists === false ? "Virtual wallet only" : "Existing DB user"}
                  </div>
                </div>
              </div>

              {deliveryStateMismatch ? (
                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  DB flag and on-chain allowlist are not in sync for this wallet.
                </div>
              ) : null}

              <div className="mt-5">
                <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                  Admin note
                </div>
                <textarea
                  placeholder="Optional note for why this wallet can mint through the delivery contract"
                  value={deliveryAccessNote}
                  onChange={(e) => setDeliveryAccessNote(e.target.value)}
                  className={[
                    "mt-2 w-full rounded-2xl px-4 py-3 text-sm min-h-[120px]",
                    "bg-white/[0.04] border border-white/10 text-white",
                    "placeholder:text-white/35",
                    "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-white/20",
                    "resize-none",
                  ].join(" ")}
                />
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                <GoldButton
                  disabled={
                    !canUseDeliveryAccessManager ||
                    !deliveryMintContractReady ||
                    !resolvedDeliveryWallet ||
                    deliveryAccessSaving ||
                    deliveryLookupLoading ||
                    isWalletPromptOpen ||
                    isMiningDeliveryAccess
                  }
                  onClick={() => handleDeliveryAccessUpdate(true)}
                >
                  {txMode === "deliveryAccess" && pendingDeliveryAccessAllowed === true
                    ? isMiningDeliveryAccess
                      ? "Granting on-chain…"
                      : "Waiting for wallet signature…"
                    : "Grant delivery mint access"}
                </GoldButton>

                <GhostButton
                  disabled={
                    !canUseDeliveryAccessManager ||
                    !deliveryMintContractReady ||
                    !resolvedDeliveryWallet ||
                    deliveryAccessSaving ||
                    deliveryLookupLoading ||
                    isWalletPromptOpen ||
                    isMiningDeliveryAccess
                  }
                  onClick={() => handleDeliveryAccessUpdate(false)}
                >
                  {txMode === "deliveryAccess" && pendingDeliveryAccessAllowed === false
                    ? isMiningDeliveryAccess
                      ? "Revoking on-chain…"
                      : "Waiting for wallet signature…"
                    : "Revoke delivery mint access"}
                </GhostButton>
              </div>
            </>
          ) : null}
        </Card>

        <Card>
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight">Upload product media</div>
              <div className="text-[11px] text-white/55 mt-1">
                Image or video for token metadata.
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
                    poster={effectivePreviewKind === "video" ? effectivePoster : null}
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
                <p className="text-sm font-extrabold mb-1">Premium product upload</p>
                <p className="text-xs text-white/60 leading-relaxed">
                  {productMode === "cafe"
                    ? "Coffee, packaged goods, merch, perfume, food or video poster."
                    : "Art, collectibles, fashion, antiques, packaged goods, merch or video poster."}
                </p>

                {file ? (
                  <p className="mt-3 text-xs font-semibold truncate">
                    Selected: <span className="text-white/70">{file.name}</span>
                  </p>
                ) : null}

                {tokenURI ? (
                  <p className="mt-3 text-xs">
                    ✅ Prepared tokenURI:{" "}
                    <span className="text-white/70 break-all">{tokenURI}</span>
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {file?.type?.startsWith("video/") ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-extrabold">Poster (thumbnail)</div>
                  <div className="mt-1 text-[11px] text-white/55">
                    Optional image preview for product videos.
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
                      "Upload a thumbnail for the video preview."
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
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                {productMode === "cafe" ? "Cafe category" : "Store category"}
              </div>
              <div className="text-[11px] text-white/55 mt-1">
                Used inside metadata for the selected storefront.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Required
            </Pill>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {selectedCategories.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategory(cat);
                    resetPreparedState();
                  }}
                  className={[
                    "px-4 py-2.5 rounded-2xl border text-sm font-extrabold transition",
                    "shadow-[0_16px_40px_rgba(0,0,0,0.35)]",
                    active
                      ? "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black border-black/10 ring-1 ring-black/10"
                      : "bg-white/[0.06] border-white/10 hover:bg-white/10 text-white",
                  ].join(" ")}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </Card>

        {productMode === "store" ? (
          <Card>
            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-sm font-extrabold tracking-tight">Store brand / project</div>
                <div className="text-[11px] text-white/55 mt-1">
                  This label goes into metadata and later appears in store / NFT UI.
                </div>
              </div>
              <Pill>
                <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
                Store only
              </Pill>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {STORE_BRANDS.map((brand) => {
                const active = storeBrand === brand;
                return (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => {
                      setStoreBrand(brand);
                      resetPreparedState();
                    }}
                    className={[
                      "px-4 py-2.5 rounded-2xl border text-sm font-extrabold transition",
                      "shadow-[0_16px_40px_rgba(0,0,0,0.35)]",
                      active
                        ? "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black border-black/10 ring-1 ring-black/10"
                        : "bg-white/[0.06] border-white/10 hover:bg-white/10 text-white",
                    ].join(" ")}
                  >
                    {brand}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
              <div className="text-[12px] font-black text-sky-100">
                Shared contract, separate brand label
              </div>
              <div className="mt-2 text-[12px] text-sky-50/85 leading-relaxed">
                You do not need a separate Store contract for every test brand right now. This selector only changes the{" "}
                <span className="font-black text-sky-100">metadata / UI brand label</span> while products still live
                under the same shared Realife Store contract on Base Sepolia.
              </div>
            </div>
          </Card>
        ) : null}

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight">Manage existing product</div>
              <div className="mt-1 text-[11px] text-white/55">
                Enable or disable a {selectedLabel} item by token ID.
              </div>
            </div>

            <Pill>
              <span
                className={`h-2 w-2 rounded-full ${
                  manageTokenExists
                    ? manageIsActive
                      ? "bg-emerald-400"
                      : "bg-rose-400"
                    : "bg-white/40"
                }`}
              />
              {manageTokenExists
                ? manageIsActive
                  ? "Active"
                  : "Disabled"
                : "Unknown"}
            </Pill>
          </div>

          <div className="mt-5">
            <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
              Product token ID
            </div>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Example: 4"
              value={manageTokenId}
              onChange={(e) => setManageTokenId(e.target.value.replace(/[^\d]/g, ""))}
              className={[
                "mt-2 w-full rounded-2xl px-4 py-3 text-sm",
                "bg-white/[0.04] border border-white/10 text-white",
                "placeholder:text-white/35",
                "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-white/20",
              ].join(" ")}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] uppercase tracking-wider text-white/45 font-semibold">
                Exists
              </div>
              <div className="mt-1 text-sm font-black text-white/90">
                {manageTokenExists ? "Yes" : "No / not loaded"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] uppercase tracking-wider text-white/45 font-semibold">
                Storefront status
              </div>
              <div className="mt-1 text-sm font-black text-white/90">
                {!manageTokenIdBI
                  ? "Enter token"
                  : !manageTokenExists
                  ? "Not found"
                  : isManageStatusFetching
                  ? "Loading…"
                  : manageIsActive
                  ? "Enabled"
                  : "Disabled"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] uppercase tracking-wider text-white/45 font-semibold">
                Action
              </div>
              <div className="mt-1 text-sm font-black text-white/90">
                {manageTokenExists
                  ? manageIsActive
                    ? "Disable product"
                    : "Enable product"
                  : "—"}
              </div>
            </div>
          </div>

          {createdTokenId && createdMode === productMode ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setManageTokenId(createdTokenId)}
                className="px-4 py-2 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 transition text-xs font-extrabold"
              >
                Use last created token #{createdTokenId}
              </button>
            </div>
          ) : null}

          {manageNotice ? (
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {manageNotice}
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            <GoldButton
              disabled={!canManageToggle || isWalletPromptOpen || isMiningToggle}
              onClick={handleToggleProductStatus}
            >
              {txMode === "toggle"
                ? toggleIntent === "disable"
                  ? isMiningToggle
                    ? "Disabling product on-chain…"
                    : "Waiting for wallet signature…"
                  : isMiningToggle
                  ? "Enabling product on-chain…"
                  : "Waiting for wallet signature…"
                : manageTokenExists
                ? manageIsActive
                  ? "Disable product"
                  : "Enable product"
                : "Toggle product status"}
            </GoldButton>

            <GhostButton
              disabled={!manageTokenIdBI || !requiredContractOk}
              onClick={() => {
                void refetchNextTokenId();
                void refetchManageStatus();
              }}
            >
              Refresh product status
            </GhostButton>
          </div>

          <div className="mt-4 text-[11px] text-white/55 leading-relaxed">
            Disabling a product hides it from active storefront sales. It does not erase existing metadata, holders or
            past orders.
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight">Product name</div>
              <div className="text-[11px] text-white/55 mt-1">
                Visible title for the store item.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Required
            </Pill>
          </div>

          <input
            type="text"
            placeholder={
              productMode === "cafe"
                ? "Example: Cappuccino"
                : "Example: Vintage Realife Tee"
            }
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              resetPreparedState();
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
              <div className="text-sm font-extrabold tracking-tight">Collection</div>
              <div className="text-[11px] text-white/55 mt-1">
                Main collection name for metadata.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Required
            </Pill>
          </div>

          <input
            type="text"
            placeholder={selectedCollectionDefault}
            value={collection}
            onChange={(e) => {
              setCollection(e.target.value);
              resetPreparedState();
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <div className="text-sm font-extrabold tracking-tight">Item</div>
                  <div className="text-[11px] text-white/55 mt-1">
                    Universal product type for metadata.
                  </div>
                </div>
                <Pill>
                  <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
                  Required
                </Pill>
              </div>

              <select
                value={item}
                onChange={(e) => {
                  setItem(e.target.value);
                  resetPreparedState();
                }}
                className={[
                  "w-full rounded-2xl px-4 py-3 text-sm",
                  "bg-white/[0.04] border border-white/10 text-white",
                  "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-white/20",
                ].join(" ")}
              >
                {selectedItems.map((it) => (
                  <option key={it} value={it} className="bg-[#111] text-white">
                    {it}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <div className="text-sm font-extrabold tracking-tight">Rarity</div>
                  <div className="text-[11px] text-white/55 mt-1">
                    Metadata rarity level.
                  </div>
                </div>
                <Pill>
                  <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
                  Required
                </Pill>
              </div>

              <select
                value={rarity}
                onChange={(e) => {
                  setRarity(e.target.value as (typeof RARITIES)[number]);
                  resetPreparedState();
                }}
                className={[
                  "w-full rounded-2xl px-4 py-3 text-sm",
                  "bg-white/[0.04] border border-white/10 text-white",
                  "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-white/20",
                ].join(" ")}
              >
                {RARITIES.map((r) => (
                  <option key={r} value={r} className="bg-[#111] text-white">
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {productMode === "store" ? (
          <Card>
            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-sm font-extrabold tracking-tight">Store delivery flags</div>
                <div className="text-[11px] text-white/55 mt-1">
                  These flags affect the Store storefront product config only.
                </div>
              </div>
              <Pill>
                <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
                Store only
              </Pill>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  const next = !deliveryEnabled;
                  setDeliveryEnabled(next);
                  if (!next) setPhysicalItemIncluded(false);
                  resetPreparedState();
                }}
                className={[
                  "px-4 py-3 rounded-2xl border text-sm font-extrabold transition",
                  deliveryEnabled
                    ? "bg-emerald-500/12 border-emerald-500/20 text-emerald-100"
                    : "bg-white/[0.06] border-white/10 hover:bg-white/10 text-white",
                ].join(" ")}
              >
                Delivery: {deliveryEnabled ? "ON" : "OFF"}
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = !physicalItemIncluded;
                  setPhysicalItemIncluded(next);
                  if (next) setDeliveryEnabled(true);
                  resetPreparedState();
                }}
                className={[
                  "px-4 py-3 rounded-2xl border text-sm font-extrabold transition",
                  physicalItemIncluded
                    ? "bg-amber-500/12 border-amber-500/20 text-amber-100"
                    : "bg-white/[0.06] border-white/10 hover:bg-white/10 text-white",
                ].join(" ")}
              >
                Physical item: {physicalItemIncluded ? "ON" : "OFF"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOfficialItem((v) => !v);
                  resetPreparedState();
                }}
                className={[
                  "px-4 py-3 rounded-2xl border text-sm font-extrabold transition",
                  officialItem
                    ? "bg-white/[0.12] border-white/15 text-white"
                    : "bg-white/[0.06] border-white/10 hover:bg-white/10 text-white",
                ].join(" ")}
              >
                Official: {officialItem ? "ON" : "OFF"}
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
              <div className="text-[12px] font-black text-sky-100">
                What this block controls
              </div>
              <div className="mt-2 space-y-2 text-[12px] text-sky-50/85 leading-relaxed">
                <div>
                  • <span className="font-black">deliveryEnabled</span> — product is treated as delivery-capable in the
                  Store UI.
                </div>
                <div>
                  • <span className="font-black">physicalItemIncluded</span> — buyer is purchasing an NFT linked to a
                  real physical item.
                </div>
                <div>
                  • <span className="font-black">officialItem</span> — defines whether admin create path calls the
                  official or seller store method.
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="text-[12px] font-black text-amber-100">
                What this block does NOT control
              </div>
              <div className="mt-2 space-y-2 text-[12px] text-amber-50/85 leading-relaxed">
                <div>• shipping address collection</div>
                <div>• tracking code / carrier / shipped status</div>
                <div>• buyer delivery confirmation</div>
                <div>• escrow release / refund flow</div>
              </div>
              <div className="mt-3 text-[11px] text-amber-50/80 leading-relaxed">
                Those actions happen later in the orders flow after purchase.
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[12px] font-black text-white/85">
                Important ABI note
              </div>
              <div className="mt-2 text-[12px] text-white/65 leading-relaxed">
                Your Store contract uses{" "}
                <span className="font-black text-white/85">createOfficialProduct()</span> /{" "}
                <span className="font-black text-white/85">createSellerProduct()</span>{" "}
                instead of <span className="font-black text-white/85">createProduct()</span>.
              </div>
            </div>
          </Card>
        ) : null}

        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <div className="text-sm font-extrabold tracking-tight">Price (USDT)</div>
                  <div className="text-[11px] text-white/55 mt-1">
                    6 decimals, same as MockUSDT/USDT.
                  </div>
                </div>
                <Pill>
                  <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
                  Required
                </Pill>
              </div>

              <input
                type="text"
                inputMode="decimal"
                placeholder="5"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  resetPreparedState();
                }}
                className={[
                  "w-full rounded-2xl px-4 py-3 text-sm",
                  "bg-white/[0.04] border border-white/10 text-white",
                  "placeholder:text-white/35",
                  "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-white/20",
                ].join(" ")}
              />

              <div className="mt-2 text-[11px] text-white/55">
                Parsed value:{" "}
                <span className="text-amber-200 font-extrabold">
                  {priceParsed !== null ? priceParsed.toString() : "invalid"}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <div className="text-sm font-extrabold tracking-tight">Max supply</div>
                  <div className="text-[11px] text-white/55 mt-1">
                    Contract upper cap for this product.
                  </div>
                </div>
                <Pill>
                  <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
                  Required
                </Pill>
              </div>

              <input
                type="number"
                min={1}
                max={1000000}
                value={supply}
                onChange={(e) => {
                  setSupply(clampSupply(Number(e.target.value)));
                  resetPreparedState();
                }}
                className={[
                  "w-full rounded-2xl px-4 py-3 text-sm",
                  "bg-white/[0.04] border border-white/10 text-white",
                  "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-white/20",
                ].join(" ")}
              />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight">Description</div>
              <div className="text-[11px] text-white/55 mt-1">
                This text goes into token metadata.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-white/60" />
              Optional
            </Pill>
          </div>

          <textarea
            placeholder={
              productMode === "cafe"
                ? "Premium product description for the Realife cafe storefront..."
                : "Curated description for the Realife NFT Store product..."
            }
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              resetPreparedState();
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
              <div className="text-sm font-extrabold tracking-tight">External / proof link</div>
              <div className="text-[11px] text-white/55 mt-1">
                Optional website, post, landing page or proof link.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-white/60" />
              Optional
            </Pill>
          </div>

          <input
            type="url"
            placeholder="https://..."
            value={externalUrl}
            onChange={(e) => {
              setExternalUrl(e.target.value);
              resetPreparedState();
            }}
            className={[
              "w-full rounded-2xl px-4 py-3 text-sm",
              "bg-white/[0.04] border border-white/10 text-white",
              "placeholder:text-white/35",
              "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-white/20",
            ].join(" ")}
          />
        </Card>

        {error ? (
          <div className="rounded-[24px] border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
            {error}
          </div>
        ) : null}

        {createdTokenId ? (
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Pill>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]" />
                  Product created
                </Pill>

                <div className="mt-4 text-lg font-black tracking-tight">
                  {createdMode === "cafe" ? "Cafe" : "Store"} token ID{" "}
                  <span className="text-amber-200">#{createdTokenId}</span>
                </div>

                <div className="mt-2 text-sm text-white/65 leading-relaxed">
                  <span className="text-white font-semibold">
                    {name || "Unnamed product"}
                  </span>{" "}
                  is now registered in the selected contract and cached in your local mint database.
                </div>

                <div className="mt-4 space-y-2 text-xs text-white/60">
                  {createdBrand ? (
                    <div>
                      Brand / Project:{" "}
                      <span className="font-semibold text-white">{createdBrand}</span>
                    </div>
                  ) : null}
                  <div>
                    Collection: <span className="font-semibold text-white">{collection}</span>
                  </div>
                  <div>
                    Item: <span className="font-semibold text-white">{item}</span>
                  </div>
                  <div>
                    Rarity: <span className="font-semibold text-white">{rarity}</span>
                  </div>
                  <div>
                    Supply:{" "}
                    <span className="font-semibold text-white">
                      {clampSupply(supply)}
                    </span>
                  </div>
                  <div>
                    Price: <span className="font-semibold text-white">{price || "0"} USDT</span>
                  </div>
                  <div>
                    Category: <span className="font-semibold text-white">{category}</span>
                  </div>
                  {createdMode === "store" ? (
                    <>
                      <div>
                        Delivery enabled:{" "}
                        <span className="font-semibold text-white">
                          {deliveryEnabled ? "Yes" : "No"}
                        </span>
                      </div>
                      <div>
                        Physical item included:{" "}
                        <span className="font-semibold text-white">
                          {physicalItemIncluded ? "Yes" : "No"}
                        </span>
                      </div>
                      <div>
                        Official item:{" "}
                        <span className="font-semibold text-white">
                          {officialItem ? "Yes" : "No"}
                        </span>
                      </div>
                    </>
                  ) : null}
                  <div>
                    Prepared URI:{" "}
                    <span className="font-semibold text-white break-all">
                      {tokenURI || "—"}
                    </span>
                  </div>
                  <div>
                    Created at:{" "}
                    <span className="font-semibold text-white">{createdAt || "—"}</span>
                  </div>
                </div>

                <div className="mt-4 text-[11px] text-white/50">
                  This action creates a catalog product entry only. NFT ownership is minted later to the buyer through{" "}
                  <span className="text-white/75">buyProduct()</span>.
                </div>

                {createdMode === "store" ? (
                  <div className="mt-3 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-[11px] text-sky-50/85 leading-relaxed">
                    Store delivery control continues later in the orders flow: shipping data is collected from buyer
                    checkout, seller adds tracking, buyer confirms delivery, and escrow state is updated there.
                  </div>
                ) : null}
              </div>

              <div className="shrink-0 flex flex-col gap-2">
                {pendingTxHash && txMode === "create" ? (
                  <a
                    href={`https://sepolia.basescan.org/tx/${pendingTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-2xl text-black font-extrabold hover:brightness-110 transition shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15 text-xs"
                  >
                    View tx ↗
                  </a>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setName("");
                    setDescription("");
                    setSupply(100);
                    setPrice("5");
                    setExternalUrl("");
                    setCategory(
                      productMode === "cafe"
                        ? CAFE_CATEGORIES[0]
                        : STORE_CATEGORIES[0]
                    );
                    setCollection(
                      productMode === "cafe"
                        ? "Realife Crypto Cafe"
                        : storeBrand === "Other"
                        ? "Partner NFT Store"
                        : `${storeBrand} NFT Store`
                    );
                    setItem(productMode === "cafe" ? CAFE_ITEMS[0] : STORE_ITEMS[0]);
                    setRarity("Common");
                    setDeliveryEnabled(productMode === "store");
                    setPhysicalItemIncluded(productMode === "store");
                    setOfficialItem(true);
                    setFile(null);
                    setPosterFile(null);
                    setTokenURI(null);
                    setPreparedMedia(null);
                    setPreparedPoster(null);
                    setCreatedTokenId(null);
                    setCreatedAt(null);
                    setCreatedMode(null);
                    setCreatedBrand(null);
                    setError("");
                    savedRef.current = false;

                    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
                    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);

                    setFilePreviewUrl(null);
                    setPosterPreviewUrl(null);
                  }}
                  className="px-4 py-2 rounded-2xl border border-white/15 bg-white/[0.06] font-semibold hover:bg-white/10 transition text-xs"
                >
                  Create next product
                </button>
              </div>
            </div>
          </Card>
        ) : null}

        <Card>
          <div className="space-y-3">
            <GhostButton
              disabled={busy || isWalletPromptOpen || !canPrepare}
              onClick={handlePrepare}
            >
              {step === "preparing"
                ? "Uploading → IPFS (prepare)…"
                : "1) Prepare metadata"}
            </GhostButton>

            <GoldButton
              disabled={busy || isWalletPromptOpen || !canCreate}
              onClick={handleCreateProduct}
            >
              {step === "signing"
                ? "Waiting for wallet signature…"
                : step === "mining" || isMiningCreate
                ? "Creating product on-chain…"
                : `2) Create ${productMode === "cafe" ? "Cafe" : "Store"} Product`}
            </GoldButton>
          </div>

          <div className="mt-4 text-[11px] text-white/55 leading-relaxed">
            Flow: upload media → prepare IPFS metadata → sign admin tx → product appears in{" "}
            <span className="text-white/75 font-semibold">{selectedLabel}</span>.
          </div>

          {productMode === "store" ? (
            <>
              <div className="mt-2 text-[11px] text-white/55 leading-relaxed">
                Mint form creates the Store product and saves the delivery flags. Shipping, tracking, buyer confirmation
                and escrow actions are handled after purchase in the Store orders flow.
              </div>
              <div className="mt-2 text-[11px] text-white/55 leading-relaxed">
                Selected brand label for this product:{" "}
                <span className="text-amber-200 font-semibold">{storeBrand}</span>.
              </div>
            </>
          ) : null}

          <div className="mt-2 text-[11px] text-white/55 leading-relaxed">
            Need gas?{" "}
            <Link
              href="/app/faucet"
              className="text-[#d4af37] font-semibold hover:brightness-110 transition"
            >
              Open faucet ↗
            </Link>
          </div>

          <div className="mt-3 text-[11px] text-white/55 leading-relaxed">
            Storefront:{" "}
            <Link
              href={selectedStorefrontHref}
              className="text-amber-200 font-semibold hover:brightness-110 transition"
            >
              Open {selectedLabel} →
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}