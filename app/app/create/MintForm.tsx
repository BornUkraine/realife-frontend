"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

import { REALIFE_ABI } from "@/lib/realifeAbi";
import { REALIFE_1155_ABI } from "@/lib/realife1155Abi";
import NftMedia from "@/components/NftMedia";

const PROJECTS = ["Sentient", "Billions", "Rialo", "Neura", "Realife", "Other"] as const;

const CATEGORIES = [
  "Marketing work",
  "Hype / Promo",
  "Charity / Social",
  "Educational",
  "Personal creative",
  "AI work",
] as const;

type MintMode = "erc721" | "erc1155";

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

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://accurate-art-production.up.railway.app";
const PREPARE_URL = `${API_BASE.replace(/\/$/, "")}/api/mint/prepare`;

// ERC-721
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_REALIFE_CONTRACT as
  | `0x${string}`
  | undefined;

// ERC-1155
const CONTRACT_1155 = process.env.NEXT_PUBLIC_REALIFE_1155_CONTRACT as
  | `0x${string}`
  | undefined;

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/70 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
      {children}
    </div>
  );
}

function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
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
  children: React.ReactNode;
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
  children: React.ReactNode;
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

/** Extract ERC-721 tokenId from Transfer event logs */
function extractTokenIdFromReceipt(receipt: any, contract?: `0x${string}`): string | null {
  const logs = receipt?.logs ?? [];
  for (const log of logs) {
    try {
      if (contract && log?.address?.toLowerCase?.() !== contract.toLowerCase()) continue;

      const decoded = decodeEventLog({
        abi: REALIFE_ABI,
        data: log.data,
        topics: log.topics,
      });

      if (decoded?.eventName === "Transfer") {
        const args: any = decoded.args;
        const tokenId = args?.tokenId ?? args?.[2];

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

/** Extract ERC-1155 tokenId from EditionCreated event */
function extractEditionTokenIdFromReceipt(
  receipt: any,
  contract?: `0x${string}`
): string | null {
  const logs = receipt?.logs ?? [];
  for (const log of logs) {
    try {
      if (contract && log?.address?.toLowerCase?.() !== contract.toLowerCase()) continue;

      const decoded = decodeEventLog({
        abi: REALIFE_1155_ABI,
        data: log.data,
        topics: log.topics,
      });

      if (decoded?.eventName === "EditionCreated") {
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

/** only persist stable urls (not blob:) */
function persistableUrl(input?: string | null) {
  const s = (input || "").trim();
  if (!s) return null;
  if (s.startsWith("blob:")) return null;
  return s;
}

/** IPFS helpers */
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
      // next
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
  mode,
  verified,
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
  mode: MintMode;
  verified: boolean;
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
    { k: "prepare", n: "01", t: "Prepare", d: "Upload → IPFS", ok: Boolean(tokenURI), active: stage === 1 && !isSuccess },
    { k: "sign", n: "02", t: "Sign", d: "Wallet signature", ok: step !== "idle" && (stage >= 2 || isMining || isSuccess), active: stage === 2 && !isSuccess },
    { k: "mint", n: "03", t: mode === "erc1155" ? "Create Edition" : "Mint", d: "Tx mining", ok: Boolean(txHash) && (isMining || isSuccess || stage >= 3), active: stage === 3 && !isSuccess },
    { k: "verify", n: "04", t: "Verify", d: "Explorer proof", ok: isSuccess, active: stage === 4 || isSuccess },
  ] as const;

  const locked = !mounted || !connected || wrongNetwork;

  const modeLabel = mode === "erc1155" ? "Edition (ERC-1155)" : "Unique (ERC-721)";

  return (
    <Card className="lg:col-span-2">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
              VIP Mint Flow
            </Pill>

            <Pill>
              <span className="text-white/80 font-extrabold">{modeLabel}</span>
            </Pill>

            {mode === "erc1155" ? (
              <Pill>
                <span
                  className={[
                    "h-2 w-2 rounded-full",
                    verified ? "bg-emerald-400" : "bg-rose-400",
                    "shadow-[0_0_0_6px_rgba(255,255,255,0.06)]",
                  ].join(" ")}
                />
                {verified ? "Verified Creator" : "Locked (Need 3 NFTs)"}
              </Pill>
            ) : null}
          </div>

          <div className="mt-3 text-sm md:text-base font-extrabold tracking-tight">
            {locked
              ? !mounted
                ? "Connect wallet to start"
                : !connected
                ? "Connect wallet to start"
                : "Switch to Base Sepolia"
              : isSuccess
              ? "Mint complete — verified on-chain"
              : step === "preparing"
              ? "Preparing metadata on IPFS…"
              : step === "signing"
              ? "Waiting for wallet signature…"
              : step === "mining" || isMining
              ? "Minting on-chain (mining)…"
              : tokenURI
              ? hasGas
                ? "Ready to sign & mint"
                : "Get test ETH to mint"
              : "Prepare your NFT"}
          </div>

          <div className="mt-2 text-[11px] text-white/60 leading-relaxed">
            Mint rewards: <span className="text-amber-200 font-extrabold">+10 points</span> per NFT.
            <span className="text-white/45"> More mints → more points → higher reputation.</span>
          </div>

          <div className="mt-2 text-[11px] text-white/55 leading-relaxed">
            {locked ? (
              <>
                {wrongNetwork ? (
                  <>
                    Wrong network — switch to <span className="text-white/75 font-semibold">Base Sepolia</span>.
                  </>
                ) : (
                  <>Connect wallet and follow the flow: Prepare → Sign → Mint → Verify.</>
                )}
              </>
            ) : (
              <>
                {hasGas ? (
                  <>
                    Gas is OK. If you already prepared metadata — press{" "}
                    <span className="text-white/75 font-semibold">
                      {mode === "erc1155" ? "Create Edition" : "Mint"}
                    </span>
                    .
                  </>
                ) : (
                  <>
                    No gas on Base Sepolia.{" "}
                    <Link href="/app/faucet" className="text-[#d4af37] font-semibold hover:brightness-110 transition">
                      Faucet ↗
                    </Link>{" "}
                    then refresh.
                  </>
                )}
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
                      <div className="text-sm font-extrabold tracking-tight truncate">{it.t}</div>
                      <div className="text-[11px] text-white/55 truncate">{it.d}</div>
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

  const { data: balanceData, isLoading: isBalanceLoading, isFetching: isBalanceFetching, refetch: refetchBalance } =
    useBalance({
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

  const wrongNetwork = connected && effectiveChainId !== baseSepolia.id;
  const hasGas = connected && !wrongNetwork && balanceEth > 0;

  // ✅ mint mode
  const [mode, setMode] = useState<MintMode>("erc721");

  // ERC-1155 verified check (contract knows the rules)
  const { data: isVerified1155 } = useReadContract({
    address: CONTRACT_1155,
    abi: REALIFE_1155_ABI,
    functionName: "isVerified",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && CONTRACT_1155) },
  });
  const verified = Boolean(isVerified1155);

  // form state
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  // ✅ poster upload (only for video)
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);

  const [project, setProject] = useState<(typeof PROJECTS)[number]>("Realife");
  const [categories, setCategories] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [supply, setSupply] = useState<number>(1);
  const [proofUrl, setProofUrl] = useState("");

  const [step, setStep] = useState<"idle" | "preparing" | "signing" | "mining">("idle");
  const [error, setError] = useState<string>("");

  const [tokenURI, setTokenURI] = useState<string | null>(null);

  // prepared preview (after prepare)
  const [preparedKind, setPreparedKind] = useState<"image" | "video">("image");
  const [preparedMedia, setPreparedMedia] = useState<string | null>(null);
  const [preparedPoster, setPreparedPoster] = useState<string | null>(null);
  const [previewCategory, setPreviewCategory] = useState<string>("Other");

  const selectedCategoryLabel = useMemo(() => (categories.length ? categories.join(", ") : "Other"), [categories]);

  const pickedKind = useMemo<"image" | "video">(() => (file?.type?.startsWith("video/") ? "video" : "image"), [file]);

  const effectivePreviewKind = tokenURI ? preparedKind : pickedKind;
  const effectivePreviewSrc = tokenURI ? preparedMedia || filePreviewUrl : filePreviewUrl;
  const effectivePoster = tokenURI ? preparedPoster : posterPreviewUrl;

  function toggleCategory(cat: string) {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  function onPickFile(f: File | null) {
    setError("");
    setTokenURI(null);

    setPreparedMedia(null);
    setPreparedPoster(null);

    // cleanup old blob URLs
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

    // reset push guard if user re-starts flow
    pushedRef.current = false;
  }

  function onPickPoster(f: File | null) {
    setError("");

    if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);

    setPosterFile(f);
    if (!f) {
      setPosterPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(f);
    setPosterPreviewUrl(url);
  }

  // cleanup object URLs
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

  const { data: txHash, writeContractAsync, isPending: isWalletPromptOpen } = useWriteContract();

  const { isLoading: isMining, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: Boolean(txHash) },
  });

  // on success: save mint and redirect
  useEffect(() => {
    if (!isSuccess || !receipt) return;
    if (pushedRef.current) return;

    pushedRef.current = true;

    (async () => {
      const finalName = name.trim() || "Untitled NFT";
      const finalCategory = previewCategory || selectedCategoryLabel;

      const usedContract = mode === "erc721" ? CONTRACT_ADDRESS : CONTRACT_1155;

      const tokenId =
        mode === "erc721"
          ? extractTokenIdFromReceipt(receipt, CONTRACT_ADDRESS)
          : extractEditionTokenIdFromReceipt(receipt, CONTRACT_1155);

      // for DB & success query:
      const posterOrImage =
        effectivePreviewKind === "video" ? persistableUrl(preparedPoster) : persistableUrl(preparedMedia);

      const mediaForQuery = persistableUrl(preparedMedia);

      try {
        if (usedContract && tokenId) {
          await fetch("/api/mints", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              chainId: baseSepolia.id,
              contract: usedContract,
              tokenId,
              txHash: txHash || "",
              tokenUri: tokenURI || "",
              name: finalName,
              image: posterOrImage || null,
              verified: true,

              // optional (если API/БД пока не принимает — просто проигнорится из-за try/catch)
              standard: mode === "erc721" ? "ERC721" : "ERC1155",
              supply: mode === "erc1155" ? clampSupply(supply) : 1,
            }),
          });
        }
      } catch {
        // ignore
      }

      const qp = new URLSearchParams();
      qp.set("name", finalName);
      qp.set("image", posterOrImage || "");
      qp.set("media", mediaForQuery || "");
      qp.set("kind", effectivePreviewKind);
      qp.set("category", finalCategory);
      qp.set("project", project);
      qp.set("tx", txHash || "");
      qp.set("tokenId", tokenId || "");
      qp.set("standard", mode === "erc721" ? "ERC721" : "ERC1155");
      qp.set("contract", usedContract || "");

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

  const requiredContractOk = mode === "erc721" ? Boolean(CONTRACT_ADDRESS) : Boolean(CONTRACT_1155);

  const canPrepare = Boolean(file) && Boolean(name.trim()) && requiredContractOk;
  const canMint = Boolean(tokenURI) && requiredContractOk;

  const busy = step !== "idle" || isWalletPromptOpen || isMining || isSwitching;

  async function handlePrepare() {
    setError("");

    // Prepare не требует контракта, но мы блокируем UX если env не задан,
    // иначе юзер подготовит tokenURI и потом не сможет минтить.
    if (mode === "erc721" && !CONTRACT_ADDRESS) {
      setError("Missing NEXT_PUBLIC_REALIFE_CONTRACT in Railway/ENV");
      return;
    }
    if (mode === "erc1155" && !CONTRACT_1155) {
      setError("Missing NEXT_PUBLIC_REALIFE_1155_CONTRACT in Railway/ENV");
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

      // ✅ only send poster when video AND poster chosen
      if (file.type.startsWith("video/") && posterFile) {
        formData.append("poster", posterFile);
      }

      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("project", project);
      formData.append("category", selectedCategoryLabel);
      formData.append("supply", String(clampSupply(supply)));
      formData.append("proofUrl", proofUrl.trim());

      const res = await fetch(PREPARE_URL, { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Mint preparation failed");

      const uri = data?.metadataUri || data?.tokenURI || data?.tokenUri || null;
      if (!uri || typeof uri !== "string") throw new Error("Backend didn't return metadataUri/tokenURI");

      setTokenURI(uri);

      // Prefer backend preview (it already knows poster/media)
      const pKind: "image" | "video" =
        data?.preview?.kind === "video" ? "video" : data?.preview?.kind === "image" ? "image" : pickedKind;

      const pMedia = ipfsToHttp(data?.preview?.media || null, IPFS_GATEWAYS[0]) || null;
      const pPoster = ipfsToHttp(data?.preview?.poster || null, IPFS_GATEWAYS[0]) || null;

      setPreparedKind(pKind);
      setPreparedMedia(pMedia || filePreviewUrl);
      setPreparedPoster(pKind === "video" ? pPoster : null);

      // optional: use tokenURI metadata to refine (marketplace style)
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

      setPreviewCategory(data?.preview?.category || selectedCategoryLabel);
      setStep("idle");
    } catch (e: any) {
      setError(prettyError(e));
      setStep("idle");
    }
  }

  async function handleOnchainMint() {
    setError("");

    if (!tokenURI) {
      setError("First click: Prepare (Upload → IPFS).");
      return;
    }

    try {
      await ensureCorrectNetwork();

      if (balanceEth === 0) {
        setError("No gas on Base Sepolia. Open Faucet, get test ETH, then mint.");
        return;
      }

      // Extra gate for 1155
      if (mode === "erc1155" && !verified) {
        setError("Editions are locked. Mint 3 ERC-721 NFTs to become Verified Creator.");
        return;
      }

      setStep("signing");

      if (mode === "erc721") {
        if (!CONTRACT_ADDRESS) {
          setError("Missing NEXT_PUBLIC_REALIFE_CONTRACT in Railway/ENV");
          setStep("idle");
          return;
        }

        const hash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: REALIFE_ABI,
          functionName: "mint",
          args: [tokenURI],
        });

        if (hash) setStep("mining");
        return;
      }

      // mode === "erc1155"
      if (!CONTRACT_1155) {
        setError("Missing NEXT_PUBLIC_REALIFE_1155_CONTRACT in Railway/ENV");
        setStep("idle");
        return;
      }

      const amount = BigInt(clampSupply(supply));

      const hash = await writeContractAsync({
        address: CONTRACT_1155,
        abi: REALIFE_1155_ABI,
        functionName: "createEdition",
        args: [amount, tokenURI],
      });

      if (hash) setStep("mining");
    } catch (e: any) {
      setError(prettyError(e));
      setStep("idle");
    }
  }

  const refreshLabel = !mounted ? "Refresh" : isBalanceFetching ? "Refreshing…" : "Refresh";

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
        mode={mode}
        verified={verified}
      />

      {/* LEFT */}
      <div className="space-y-8">
        {/* MODE */}
        <Card>
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight">Mint type</div>
              <div className="text-[11px] text-white/55 mt-1">
                Unique = ERC-721. Editions = ERC-1155 (Verified creators only).
              </div>
            </div>

            {mode === "erc1155" ? (
              <Pill>
                <span className={["h-2 w-2 rounded-full", verified ? "bg-emerald-400" : "bg-rose-400"].join(" ")} />
                {verified ? "Verified" : "Locked"}
              </Pill>
            ) : (
              <Pill>
                <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
                Open
              </Pill>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setMode("erc721");
                setSupply(1);
                setError("");
              }}
              className={[
                "px-4 py-2.5 rounded-2xl border text-sm font-extrabold transition",
                "shadow-[0_16px_40px_rgba(0,0,0,0.35)]",
                mode === "erc721"
                  ? "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black border-black/10 ring-1 ring-black/10"
                  : "bg-white/[0.06] border-white/10 hover:bg-white/10 text-white",
              ].join(" ")}
            >
              Unique (ERC-721)
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("erc1155");
                if (supply < 2) setSupply(20);
                setError("");
              }}
              className={[
                "px-4 py-2.5 rounded-2xl border text-sm font-extrabold transition",
                "shadow-[0_16px_40px_rgba(0,0,0,0.35)]",
                mode === "erc1155"
                  ? "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black border-black/10 ring-1 ring-black/10"
                  : "bg-white/[0.06] border-white/10 hover:bg-white/10 text-white",
              ].join(" ")}
            >
              Edition (ERC-1155)
            </button>
          </div>

          {mode === "erc1155" && !verified ? (
            <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              Editions are locked. Mint <b>3</b> unique NFTs (ERC-721) to become Verified Creator.
            </div>
          ) : null}
        </Card>

        {/* PROJECT */}
        <Card>
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight">Select project</div>
              <div className="text-[11px] text-white/55 mt-1">Choose the context for your mint (premium metadata).</div>
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
                  onClick={() => setProject(p)}
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

        {/* UPLOAD MEDIA */}
        <Card>
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight">Upload your file</div>
              <div className="text-[11px] text-white/55 mt-1">Photo / video / design / product image (token media).</div>
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
                <p className="text-sm font-extrabold mb-1">Premium media upload</p>
                <p className="text-xs text-white/60 leading-relaxed">Click to upload. Video supported.</p>

                {file && (
                  <p className="mt-3 text-xs font-semibold truncate">
                    Selected: <span className="text-white/70">{file.name}</span>
                  </p>
                )}

                {tokenURI && (
                  <p className="mt-3 text-xs">
                    ✅ Prepared tokenURI: <span className="text-white/70 break-all">{tokenURI}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ✅ POSTER upload (only if video) */}
          {file?.type?.startsWith("video/") ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-extrabold">Poster (thumbnail)</div>
                  <div className="mt-1 text-[11px] text-white/55">
                    Optional. If you skip it, backend may auto-generate poster.
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

        {/* CATEGORIES */}
        <Card>
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight">Category</div>
              <div className="text-[11px] text-white/55 mt-1">Choose one or more to enrich metadata.</div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-white/60" />
              Optional
            </Pill>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CATEGORIES.map((c) => {
              const active = categories.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCategory(c)}
                  className={[
                    "flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border text-sm transition",
                    "shadow-[0_14px_50px_rgba(0,0,0,0.26)]",
                    active
                      ? "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black border-black/10 ring-1 ring-black/10"
                      : "bg-white/[0.06] border-white/10 hover:bg-white/10 text-white",
                  ].join(" ")}
                >
                  <span className="font-extrabold">{c}</span>
                  <span
                    className={[
                      "w-5 h-5 rounded-md border flex items-center justify-center text-xs",
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
            Selected: <span className="font-semibold text-white">{selectedCategoryLabel}</span>
          </p>
        </Card>
      </div>

      {/* RIGHT */}
      <div className="space-y-6">
        {/* STATUS */}
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Pill>
                <span
                  className={[
                    "h-2 w-2 rounded-full",
                    !mounted || !connected ? "bg-white/30" : wrongNetwork ? "bg-rose-400" : "bg-emerald-400",
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
                    ? "Gas OK — ready to mint"
                    : "No gas — request test ETH"
                  : "Connect wallet to mint"}
              </div>

              <div className="mt-2 text-xs text-white/65">
                Balance: <span className="font-semibold text-white">{balanceLabel}</span>
              </div>

              <div className="mt-2 text-[11px] text-white/55 leading-relaxed">
                Mint an NFT and earn <span className="text-amber-200 font-extrabold">+10 points</span>.
                <span className="text-white/45"> The more you mint — the higher your score.</span>
              </div>

              <div className="mt-2 text-[11px] text-white/55 leading-relaxed">
                {mounted && connected ? (
                  <>
                    {wrongNetwork
                      ? "One click switch, then mint."
                      : hasGas
                      ? "Prepare → sign → tx mined → success."
                      : "Open faucet, claim test ETH, then refresh."}{" "}
                    <Link href="/app/faucet" className="text-[#d4af37] font-semibold hover:brightness-110 transition">
                      Faucet ↗
                    </Link>
                  </>
                ) : (
                  <>
                    Connect wallet to enable switching, balance check and mint.{" "}
                    <span className="text-white/45">(VIP flow)</span>
                  </>
                )}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => refetchBalance()}
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

          {mode === "erc721" && !CONTRACT_ADDRESS && (
            <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              Missing <b>NEXT_PUBLIC_REALIFE_CONTRACT</b> in Railway env
            </div>
          )}

          {mode === "erc1155" && !CONTRACT_1155 && (
            <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              Missing <b>NEXT_PUBLIC_REALIFE_1155_CONTRACT</b> in Railway env
            </div>
          )}
        </Card>

        {/* NAME */}
        <Card>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight">NFT name / Title</div>
              <div className="text-[11px] text-white/55 mt-1">Public title on-chain.</div>
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
            onChange={(e) => setName(e.target.value)}
            className={[
              "w-full rounded-2xl px-4 py-3 text-sm",
              "bg-white/[0.04] border border-white/10 text-white",
              "placeholder:text-white/35",
              "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-white/20",
            ].join(" ")}
          />
        </Card>

        {/* SUPPLY */}
        <Card>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight">Amount / Supply</div>
              <div className="text-[11px] text-white/55 mt-1">
                {mode === "erc721" ? "ERC-721 is always 1." : "ERC-1155 editions: set supply (e.g. 20)."}
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-white/60" />
              Meta
            </Pill>
          </div>

          <input
            type="number"
            min={1}
            max={10000}
            value={supply}
            onChange={(e) => setSupply(clampSupply(Number(e.target.value)))}
            disabled={mode === "erc721"}
            className={[
              "w-full rounded-2xl px-4 py-3 text-sm",
              "bg-white/[0.04] border border-white/10 text-white",
              "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-white/20",
              mode === "erc721" ? "opacity-60 cursor-not-allowed" : "",
            ].join(" ")}
          />
        </Card>

        {/* DESCRIPTION */}
        <Card>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight">Description</div>
              <div className="text-[11px] text-white/55 mt-1">Story builds credibility.</div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-white/60" />
              Optional
            </Pill>
          </div>

          <textarea
            placeholder="Tell the story of your work..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={[
              "w-full rounded-2xl px-4 py-3 text-sm min-h-[160px]",
              "bg-white/[0.04] border border-white/10 text-white",
              "placeholder:text-white/35",
              "focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 focus:border-white/20",
              "resize-none",
            ].join(" ")}
          />
        </Card>

        {/* PROOF */}
        <Card>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight">Proof / X link</div>
              <div className="text-[11px] text-white/55 mt-1">Optional proof URL.</div>
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
            onChange={(e) => setProofUrl(e.target.value)}
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

        {/* ACTIONS */}
        <Card>
          <div className="space-y-3">
            <GhostButton disabled={busy || !canPrepare} onClick={handlePrepare}>
              {step === "preparing" ? "Uploading → IPFS (prepare)…" : "1) Prepare (Upload → IPFS)"}
            </GhostButton>

            <GoldButton disabled={busy || !canMint || (mode === "erc1155" && !verified)} onClick={handleOnchainMint}>
              {step === "signing"
                ? "Waiting for wallet signature…"
                : step === "mining" || isMining
                ? "Minting on-chain (mining)…"
                : mode === "erc1155"
                ? "2) Create Edition (ERC-1155)"
                : "2) Mint On-chain (ERC-721)"}
            </GoldButton>
          </div>
        </Card>
      </div>
    </div>
  );
}