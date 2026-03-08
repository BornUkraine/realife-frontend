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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://accurate-art-production.up.railway.app";
const PREPARE_URL = `${API_BASE.replace(/\/$/, "")}/api/mint/prepare`;

const CAFE_CONTRACT = process.env.NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT as `0x${string}` | undefined;
const ADMIN_WALLETS = (process.env.NEXT_PUBLIC_ADMIN_CREATE_WALLETS ||
  process.env.NEXT_PUBLIC_ADMIN_WALLETS ||
  "")
  .split(",")
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const ZERO_BYTES32 = `0x${"0".repeat(64)}` as const;

const STORE_CATEGORIES = [
  "Coffee",
  "Cacao",
  "Drink",
  "Food",
  "Merch",
  "Perfume",
  "Chocolate",
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
  return e?.shortMessage || e?.cause?.shortMessage || e?.cause?.message || e?.message || "Something went wrong";
}

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

  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:") || s.startsWith("blob:")) {
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
      // ignore
    }
  }
  return null;
}

function extractProductTokenIdFromReceipt(receipt: any, contract?: `0x${string}`): string | null {
  const logs = receipt?.logs ?? [];
  for (const log of logs) {
    try {
      if (contract && log?.address?.toLowerCase?.() !== contract.toLowerCase()) continue;

      const decoded = decodeEventLog({
        abi: cafeStoreAbi,
        data: log.data,
        topics: log.topics,
      });

      if (decoded?.eventName === "ProductCreated") {
        const args: any = decoded.args;
        const tokenId = args?.tokenId ?? args?.[0];
        if (typeof tokenId === "bigint") return tokenId.toString();
        if (typeof tokenId === "number") return String(tokenId);
        if (typeof tokenId === "string") return tokenId;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

/* ---------------- UI kit ---------------- */

function Pill({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/70 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
      {children}
    </div>
  );
}

function Card({ className = "", children }: { className?: string; children: ReactNode }) {
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
    if (!mounted || !balanceData) return 0;
    const s = formatUnits(balanceData.value, balanceData.decimals);
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }, [mounted, balanceData]);

  const balanceLabel = useMemo(() => {
    if (!mounted || !connected) return "—";
    if (isBalanceLoading) return "loading…";
    if (!balanceData) return `0 ${baseSepolia.nativeCurrency?.symbol ?? "ETH"}`;
    const s = formatUnits(balanceData.value, balanceData.decimals);
    return `${fmtEth(s)} ${balanceData.symbol ?? "ETH"}`;
  }, [mounted, connected, isBalanceLoading, balanceData]);

  const hasGas = connected && !wrongNetwork && balanceEth > 0;

  const { data: moderatorRoleRaw } = useReadContract({
    address: CAFE_CONTRACT,
    abi: cafeStoreAbi,
    functionName: "MODERATOR_ROLE",
    query: { enabled: Boolean(CAFE_CONTRACT) },
  });

  const moderatorRole =
    typeof moderatorRoleRaw === "string" && moderatorRoleRaw.startsWith("0x")
      ? (moderatorRoleRaw as `0x${string}`)
      : ZERO_BYTES32;

  const { data: hasModeratorRoleRaw } = useReadContract({
    address: CAFE_CONTRACT,
    abi: cafeStoreAbi,
    functionName: "hasRole",
    args: [moderatorRole, (address || ZERO_ADDRESS) as `0x${string}`],
    query: { enabled: Boolean(CAFE_CONTRACT && address && moderatorRole !== ZERO_BYTES32) },
  });

  const { data: nextTokenIdRaw, refetch: refetchNextTokenId } = useReadContract({
    address: CAFE_CONTRACT,
    abi: cafeStoreAbi,
    functionName: "nextTokenId",
    query: { enabled: Boolean(CAFE_CONTRACT) },
  });

  const allowlistOk = useMemo(() => {
    if (!address) return false;
    if (!ADMIN_WALLETS.length) return true;
    return ADMIN_WALLETS.includes(address.toLowerCase());
  }, [address]);

  const hasModeratorRole = Boolean(hasModeratorRoleRaw);
  const isAuthorized = connected && !wrongNetwork && allowlistOk && hasModeratorRole;

  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);

  const [category, setCategory] = useState<(typeof STORE_CATEGORIES)[number]>("Coffee");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [supply, setSupply] = useState<number>(100);
  const [price, setPrice] = useState("5");
  const [externalUrl, setExternalUrl] = useState("");

  const [step, setStep] = useState<"idle" | "preparing" | "signing" | "mining">("idle");
  const [error, setError] = useState<string>("");

  const [tokenURI, setTokenURI] = useState<string | null>(null);
  const [preparedKind, setPreparedKind] = useState<"image" | "video">("image");
  const [preparedMedia, setPreparedMedia] = useState<string | null>(null);
  const [preparedPoster, setPreparedPoster] = useState<string | null>(null);

  const [createdTokenId, setCreatedTokenId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  const [txMode, setTxMode] = useState<"create" | "toggle" | null>(null);
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>(undefined);

  const [manageTokenId, setManageTokenId] = useState("");
  const [manageNotice, setManageNotice] = useState("");
  const [toggleIntent, setToggleIntent] = useState<"enable" | "disable" | null>(null);

  const pickedKind = useMemo<"image" | "video">(
    () => (file?.type?.startsWith("video/") ? "video" : "image"),
    [file]
  );

  const effectivePreviewKind = tokenURI ? preparedKind : pickedKind;
  const effectivePreviewSrc = tokenURI ? preparedMedia || filePreviewUrl : filePreviewUrl;
  const effectivePoster = tokenURI ? preparedPoster : posterPreviewUrl;

  const refreshLabel = !mounted ? "Refresh" : isBalanceFetching ? "Refreshing…" : "Refresh";
  const requiredContractOk = Boolean(CAFE_CONTRACT);

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

  const nextTokenId = typeof nextTokenIdRaw === "bigint" ? nextTokenIdRaw : null;
  const manageTokenExists = Boolean(
    manageTokenIdBI && nextTokenId && manageTokenIdBI > 0n && manageTokenIdBI < nextTokenId
  );

  const {
    data: manageIsActiveRaw,
    isFetching: isManageStatusFetching,
    refetch: refetchManageStatus,
  } = useReadContract({
    address: CAFE_CONTRACT,
    abi: cafeStoreAbi,
    functionName: "isActive",
    args: [manageTokenIdBI ?? 0n],
    query: { enabled: Boolean(CAFE_CONTRACT && manageTokenIdBI && manageTokenExists) },
  });

  const manageIsActive = Boolean(manageIsActiveRaw);

  const canPrepare = Boolean(file && name.trim() && priceParsed !== null && requiredContractOk && isAuthorized);
  const canCreate = Boolean(tokenURI && priceParsed !== null && requiredContractOk && isAuthorized);

  const canManageToggle = Boolean(
    requiredContractOk &&
      isAuthorized &&
      manageTokenIdBI &&
      manageTokenExists &&
      txMode === null &&
      !isSwitching
  );

  const busy = step !== "idle" || isSwitching || txMode !== null;

  const { writeContractAsync, isPending: isWalletPromptOpen } = useWriteContract();

  const { isLoading: isReceiptLoading, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
    query: { enabled: Boolean(pendingTxHash) },
  });

  const isMiningCreate = txMode === "create" && isReceiptLoading;
  const isMiningToggle = txMode === "toggle" && isReceiptLoading;

  useEffect(() => {
    if (!isSuccess || !receipt || !txMode) return;

    if (txMode === "create") {
      if (savedRef.current) return;
      savedRef.current = true;

      (async () => {
        const tokenId = extractProductTokenIdFromReceipt(receipt, CAFE_CONTRACT);
        setCreatedTokenId(tokenId);
        setCreatedAt(new Date().toLocaleString());
        setStep("idle");

        try {
          const finalImage =
            persistableUrl(preparedKind === "video" ? preparedPoster : preparedMedia) ||
            persistableUrl(preparedMedia) ||
            null;

          if (CAFE_CONTRACT && tokenId) {
            await fetch("/api/mints", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                chainId: baseSepolia.id,
                contract: CAFE_CONTRACT,
                tokenId,
                txHash: pendingTxHash || "",
                tokenUri: tokenURI || "",
                name: name.trim() || "Realife Cafe Product",
                image: finalImage,
                verified: true,
                standard: "ERC1155",
                catalogOnly: true,
              }),
            });

            setManageTokenId(tokenId);
            setManageNotice("Product created and saved to local catalog cache.");
          }
        } catch {
          // ignore cache/db save errors in UI flow
        } finally {
          setPendingTxHash(undefined);
          setTxMode(null);
          setToggleIntent(null);
          void refetchNextTokenId();
          void refetchManageStatus();
        }
      })();
      return;
    }

    if (txMode === "toggle") {
      setManageNotice(
        toggleIntent === "disable"
          ? "Product successfully disabled in Cafe storefront."
          : "Product successfully enabled in Cafe storefront."
      );
      setPendingTxHash(undefined);
      setTxMode(null);
      setToggleIntent(null);
      void refetchNextTokenId();
      void refetchManageStatus();
    }
  }, [
    isSuccess,
    receipt,
    txMode,
    toggleIntent,
    pendingTxHash,
    tokenURI,
    preparedKind,
    preparedPoster,
    preparedMedia,
    name,
    refetchManageStatus,
    refetchNextTokenId,
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

  function onPickFile(f: File | null) {
    setError("");
    setTokenURI(null);
    setCreatedTokenId(null);
    setCreatedAt(null);
    setPreparedMedia(null);
    setPreparedPoster(null);
    savedRef.current = false;

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
    savedRef.current = false;

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

  function resetPreparedState() {
    setTokenURI(null);
    setPreparedMedia(null);
    setPreparedPoster(null);
    setCreatedTokenId(null);
    setCreatedAt(null);
    savedRef.current = false;
  }

  async function handlePrepare() {
    setError("");

    if (!CAFE_CONTRACT) {
      setError("Missing NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT in Railway/ENV");
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
      formData.append("description", description.trim() || `${name.trim()} • Realife Crypto Cafe`);
      formData.append("project", "Realife Crypto Cafe");
      formData.append("category", category);
      formData.append("supply", String(clampSupply(supply)));
      formData.append("proofUrl", externalUrl.trim());

      const res = await fetch(PREPARE_URL, { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Metadata preparation failed");

      const uri = data?.metadataUri || data?.tokenURI || data?.tokenUri || null;
      if (!uri || typeof uri !== "string") throw new Error("Backend didn't return metadataUri/tokenURI");

      setTokenURI(uri);

      const pKind: "image" | "video" =
        data?.preview?.kind === "video" ? "video" : data?.preview?.kind === "image" ? "image" : pickedKind;

      const pMedia = ipfsToHttp(data?.preview?.media || null, IPFS_GATEWAYS[0]) || null;
      const pPoster = ipfsToHttp(data?.preview?.poster || null, IPFS_GATEWAYS[0]) || null;

      setPreparedKind(pKind);
      setPreparedMedia(pMedia || filePreviewUrl);
      setPreparedPoster(pKind === "video" ? pPoster : null);

      const meta = await loadMetadataFromTokenUri(uri);
      const metaImage = typeof meta?.image === "string" ? meta.image : null;
      const metaAnim = typeof meta?.animation_url === "string" ? meta.animation_url : null;

      if (metaAnim) {
        setPreparedKind("video");
        setPreparedMedia(ipfsToHttp(metaAnim, IPFS_GATEWAYS[0]) || pMedia || filePreviewUrl);
        setPreparedPoster(ipfsToHttp(metaImage, IPFS_GATEWAYS[0]) || pPoster || null);
      } else if (metaImage) {
        setPreparedKind("image");
        setPreparedMedia(ipfsToHttp(metaImage, IPFS_GATEWAYS[0]) || pMedia || filePreviewUrl);
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
    if (!CAFE_CONTRACT) {
      setError("Missing NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT in Railway/ENV");
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

      if (balanceEth === 0) {
        setError("No gas on Base Sepolia. Open Faucet, get test ETH, then create.");
        return;
      }

      savedRef.current = false;
      setTxMode("create");
      setStep("signing");

      const hash = await writeContractAsync({
        address: CAFE_CONTRACT,
        abi: cafeStoreAbi,
        functionName: "createProduct",
        args: [BigInt(clampSupply(supply)), priceParsed, tokenURI],
      });

      if (hash) {
        setPendingTxHash(hash);
        setStep("mining");
      } else {
        setTxMode(null);
        setStep("idle");
      }
    } catch (e: any) {
      setError(prettyError(e));
      setTxMode(null);
      setPendingTxHash(undefined);
      setStep("idle");
    }
  }

  async function handleToggleProductStatus() {
    setError("");
    setManageNotice("");

    if (!CAFE_CONTRACT) {
      setError("Missing NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT in Railway/ENV");
      return;
    }
    if (!manageTokenIdBI) {
      setError("Enter a valid product token ID.");
      return;
    }
    if (!manageTokenExists) {
      setError("This tokenId does not exist in the cafe contract.");
      return;
    }
    if (!isAuthorized) {
      setError("This page is restricted to the admin moderator wallet.");
      return;
    }

    try {
      await ensureCorrectNetwork();

      if (balanceEth === 0) {
        setError("No gas on Base Sepolia. Open Faucet, get test ETH, then continue.");
        return;
      }

      setTxMode("toggle");
      setToggleIntent(manageIsActive ? "disable" : "enable");

      const hash = await writeContractAsync({
        address: CAFE_CONTRACT,
        abi: cafeStoreAbi,
        functionName: "toggleProductStatus",
        args: [manageTokenIdBI],
      });

      if (hash) {
        setPendingTxHash(hash);
      } else {
        setTxMode(null);
        setToggleIntent(null);
      }
    } catch (e: any) {
      setError(prettyError(e));
      setTxMode(null);
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
                  <span className="text-white/70">Contract:</span>
                  <span className="text-amber-200 font-extrabold">
                    {CAFE_CONTRACT ? shortAddr(CAFE_CONTRACT) : "missing"}
                  </span>
                </Pill>
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
                This route is hidden from navigation and is intended only for the wallet that owns admin/moderator
                access in <span className="text-white/75 font-semibold">RealifeCafeStore</span>.
              </div>

              <div className="mt-3 space-y-2 text-xs text-white/65">
                <div>
                  Connected wallet: <span className="font-semibold text-white">{address ? shortAddr(address) : "—"}</span>
                </div>
                <div>
                  Allowlist:{" "}
                  <span className={allowlistOk ? "font-semibold text-emerald-200" : "font-semibold text-rose-200"}>
                    {allowlistOk ? "OK" : "Blocked"}
                  </span>
                </div>
                <div>
                  Moderator role:{" "}
                  <span className={hasModeratorRole ? "font-semibold text-emerald-200" : "font-semibold text-rose-200"}>
                    {hasModeratorRole ? "Granted" : "Missing"}
                  </span>
                </div>
                <div>
                  Balance: <span className="font-semibold text-white">{balanceLabel}</span>
                </div>
                <div>
                  Next token id:{" "}
                  <span className="font-semibold text-white">{nextTokenId ? nextTokenId.toString() : "—"}</span>
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
                  onClick={() => switchChainAsync({ chainId: baseSepolia.id }).catch(() => {})}
                  className="h-10 px-4 rounded-2xl bg-white text-black hover:bg-gray-100 transition text-xs font-extrabold disabled:opacity-60 shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                >
                  {isSwitching ? "Switching…" : "Switch"}
                </button>
              ) : null}
            </div>
          </div>

          {!requiredContractOk ? (
            <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              Missing <b>NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT</b> in Railway env
            </div>
          ) : null}

          {!allowlistOk && ADMIN_WALLETS.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              This wallet is not in <b>NEXT_PUBLIC_ADMIN_CREATE_WALLETS</b>.
            </div>
          ) : null}

          {!hasModeratorRole && connected && !wrongNetwork ? (
            <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              Connected wallet does not have <b>MODERATOR_ROLE</b> in the cafe contract.
            </div>
          ) : null}
        </Card>

        <Card>
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight">Upload product media</div>
              <div className="text-[11px] text-white/55 mt-1">Image or video for token metadata.</div>
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
                  <div className="text-xs text-center text-white/60 px-3">{file ? "Preview" : "Click to upload"}</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold mb-1">Premium product upload</p>
                <p className="text-xs text-white/60 leading-relaxed">
                  Coffee, merch, perfume, cacao, food or video poster.
                </p>

                {file ? (
                  <p className="mt-3 text-xs font-semibold truncate">
                    Selected: <span className="text-white/70">{file.name}</span>
                  </p>
                ) : null}

                {tokenURI ? (
                  <p className="mt-3 text-xs">
                    ✅ Prepared tokenURI: <span className="text-white/70 break-all">{tokenURI}</span>
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
                  <div className="mt-1 text-[11px] text-white/55">Optional image preview for product videos.</div>
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
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={posterPreviewUrl} alt="Poster" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-white/45">No poster</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white/60">
                    {posterFile ? (
                      <span className="font-semibold text-white/80 truncate block">{posterFile.name}</span>
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
              <div className="text-sm font-extrabold tracking-tight">Store category</div>
              <div className="text-[11px] text-white/55 mt-1">Used inside metadata for the cafe storefront.</div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Required
            </Pill>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STORE_CATEGORIES.map((item) => {
              const active = category === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setCategory(item);
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
                  {item}
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight">Manage existing product</div>
              <div className="mt-1 text-[11px] text-white/55">
                Enable or disable a Cafe storefront item by token ID.
              </div>
            </div>

            <Pill>
              <span className={`h-2 w-2 rounded-full ${manageTokenExists ? (manageIsActive ? "bg-emerald-400" : "bg-rose-400") : "bg-white/40"}`} />
              {manageTokenExists ? (manageIsActive ? "Active" : "Disabled") : "Unknown"}
            </Pill>
          </div>

          <div className="mt-5">
            <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Product token ID</div>
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
              <div className="text-[11px] uppercase tracking-wider text-white/45 font-semibold">Exists</div>
              <div className="mt-1 text-sm font-black text-white/90">{manageTokenExists ? "Yes" : "No / not loaded"}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] uppercase tracking-wider text-white/45 font-semibold">Storefront status</div>
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
              <div className="text-[11px] uppercase tracking-wider text-white/45 font-semibold">Action</div>
              <div className="mt-1 text-sm font-black text-white/90">
                {manageTokenExists ? (manageIsActive ? "Disable product" : "Enable product") : "—"}
              </div>
            </div>
          </div>

          {createdTokenId ? (
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
            Disabling a product hides it from active storefront sales. It does not erase existing metadata or holders.
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight">Product name</div>
              <div className="text-[11px] text-white/55 mt-1">Visible title for the store item.</div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Required
            </Pill>
          </div>

          <input
            type="text"
            placeholder="Example: Cappuccino"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <div className="text-sm font-extrabold tracking-tight">Price (USDT)</div>
                  <div className="text-[11px] text-white/55 mt-1">6 decimals, same as MockUSDT/USDT.</div>
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
                  <div className="text-[11px] text-white/55 mt-1">Contract upper cap for this product.</div>
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
              <div className="text-[11px] text-white/55 mt-1">This text goes into token metadata.</div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-white/60" />
              Optional
            </Pill>
          </div>

          <textarea
            placeholder="Premium product description for the Realife cafe storefront..."
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
              <div className="text-[11px] text-white/55 mt-1">Optional website, menu, post or landing page.</div>
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
                  Token ID <span className="text-amber-200">#{createdTokenId}</span>
                </div>

                <div className="mt-2 text-sm text-white/65 leading-relaxed">
                  <span className="text-white font-semibold">{name || "Unnamed product"}</span> is now registered in the
                  store contract and cached in your local mint database.
                </div>

                <div className="mt-4 space-y-2 text-xs text-white/60">
                  <div>
                    Supply: <span className="font-semibold text-white">{clampSupply(supply)}</span>
                  </div>
                  <div>
                    Price: <span className="font-semibold text-white">{price || "0"} USDT</span>
                  </div>
                  <div>
                    Category: <span className="font-semibold text-white">{category}</span>
                  </div>
                  <div>
                    Prepared URI: <span className="font-semibold text-white break-all">{tokenURI || "—"}</span>
                  </div>
                  <div>
                    Created at: <span className="font-semibold text-white">{createdAt || "—"}</span>
                  </div>
                </div>

                <div className="mt-4 text-[11px] text-white/50">
                  This action creates a product entry only. NFT ownership is minted later to the buyer through{" "}
                  <span className="text-white/75">buyProduct()</span>.
                </div>
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
                    setCategory("Coffee");
                    setFile(null);
                    setPosterFile(null);
                    setTokenURI(null);
                    setPreparedMedia(null);
                    setPreparedPoster(null);
                    setCreatedTokenId(null);
                    setCreatedAt(null);
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
            <GhostButton disabled={busy || isWalletPromptOpen || !canPrepare} onClick={handlePrepare}>
              {step === "preparing" ? "Uploading → IPFS (prepare)…" : "1) Prepare metadata"}
            </GhostButton>

            <GoldButton disabled={busy || isWalletPromptOpen || !canCreate} onClick={handleCreateProduct}>
              {step === "signing"
                ? "Waiting for wallet signature…"
                : step === "mining" || isMiningCreate
                ? "Creating product on-chain…"
                : "2) Create Product (Admin)"}
            </GoldButton>
          </div>

          <div className="mt-4 text-[11px] text-white/55 leading-relaxed">
            Flow: upload media → prepare IPFS metadata → sign admin tx → product appears in{" "}
            <span className="text-white/75 font-semibold">RealifeCafeStore</span>.
          </div>

          <div className="mt-2 text-[11px] text-white/55 leading-relaxed">
            Need gas?{" "}
            <Link href="/app/faucet" className="text-[#d4af37] font-semibold hover:brightness-110 transition">
              Open faucet ↗
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}