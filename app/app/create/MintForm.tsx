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
} from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { decodeEventLog, formatUnits } from "viem";

import { REALIFE_ABI } from "@/lib/realifeAbi";

const PROJECTS = ["Sentient", "Billions", "Rialo", "Neura", "Realife", "Other"] as const;

const CATEGORIES = [
  "Marketing work",
  "Hype / Promo",
  "Charity / Social",
  "Educational",
  "Personal creative",
  "AI work",
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

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://accurate-art-production.up.railway.app";
const PREPARE_URL = `${API_BASE.replace(/\/$/, "")}/api/mint/prepare`;

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_REALIFE_CONTRACT as
  | `0x${string}`
  | undefined;

function Pill({ children }: { children: React.ReactNode }) {
  return (
    // 🔥 Золотисто-черный фон для плашек
    <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/20 bg-[#1a1405]/80 px-3 py-1.5 text-[11px] font-semibold text-[#f7e7a7] backdrop-blur-2xl shadow-[0_4px_20px_rgba(212,175,55,0.1)]">
      {children}
    </div>
  );
}

function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-[28px] p-px",
        // Мягкая золотая окантовка снаружи
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.25),rgba(212,175,55,0.1),rgba(184,135,10,0.05))]",
        "shadow-[0_26px_80px_rgba(10,8,0,0.8)]", // Тень с легким теплым (коричневатым) оттенком черного
        className,
      ].join(" ")}
    >
      <div
        className={[
          "relative overflow-hidden rounded-[28px]",
          // 🔥 Идеальный золотисто-черный градиент для фона самой карточки
          "border border-[#d4af37]/15 bg-[linear-gradient(135deg,rgba(26,20,5,0.75),rgba(11,10,9,0.85))] backdrop-blur-2xl",
          "ring-1 ring-black/40",
          "before:pointer-events-none before:absolute before:inset-0",
          "before:bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.08),transparent_45%)]",
          "after:pointer-events-none after:absolute after:inset-0",
          "after:bg-[radial-gradient(circle_at_85%_115%,rgba(212,175,55,0.03),transparent_55%)]",
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
        "shadow-[0_16px_40px_rgba(212,175,55,0.25)]",
        "ring-1 ring-black/15",
        "transition duration-300 hover:brightness-110 hover:-translate-y-px",
        "active:translate-y-0",
        "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:brightness-100",
        "before:absolute before:inset-0 before:bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.4),transparent)]",
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
        // 🔥 Теплый золотисто-черный "Ghost"
        "border border-[#d4af37]/30 bg-[#1a1405]/60 text-[#f7e7a7] font-extrabold",
        "backdrop-blur-2xl shadow-[0_18px_40px_rgba(0,0,0,0.4)]",
        "transition duration-300 hover:bg-[#d4af37]/10 hover:-translate-y-px",
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
  try {
    const logs = receipt?.logs ?? [];
    for (const log of logs) {
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
    }
  } catch {
    // ignore
  }
  return null;
}

/** only persist stable urls (not blob:) */
function persistableImageUrl(input?: string | null) {
  const s = (input || "").trim();
  if (!s) return null;
  if (s.startsWith("blob:")) return null;
  return s;
}

/** VIP Stepper */
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
      t: "Mint",
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
          <Pill>
            <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.15)]" />
            VIP Mint Flow
          </Pill>

          <div className="mt-3 text-sm md:text-base font-extrabold tracking-tight text-white">
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

          <div className="mt-2 text-[11px] text-[#d4af37]/70 leading-relaxed">
            {locked ? (
              <>
                {wrongNetwork ? (
                  <>
                    Wrong network — switch to{" "}
                    <span className="text-[#f7e7a7] font-semibold">Base Sepolia</span>.
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
                    <span className="text-[#f7e7a7] font-semibold">Mint</span>.
                  </>
                ) : (
                  <>
                    No gas on Base Sepolia.{" "}
                    <Link
                      href="/app/faucet"
                      className="text-[#f7e7a7] font-semibold hover:brightness-110 transition underline"
                    >
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
                ? "border-[#d4af37]/20 bg-[#1a1405]/60 text-[#d4af37]/60"
                : hasGas
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-rose-500/30 bg-rose-500/10 text-rose-300",
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
                "relative rounded-3xl border overflow-hidden transition-all duration-300",
                // 🔥 Плашки шагов тоже тепло-черные
                "bg-[linear-gradient(180deg,rgba(26,20,5,0.6),rgba(11,10,9,0.8))] backdrop-blur-md",
                isActive ? "border-[#d4af37]/40 shadow-[0_10px_30px_rgba(212,175,55,0.1)]" : "border-[#d4af37]/10",
              ].join(" ")}
            >
              <div className="pointer-events-none absolute inset-0">
                <div
                  className={[
                    "absolute inset-0 opacity-90 transition-opacity",
                    isOk
                      ? "bg-[radial-gradient(circle_at_20%_0%,rgba(212,175,55,0.15),transparent_50%)]"
                      : "bg-[radial-gradient(circle_at_20%_0%,rgba(212,175,55,0.03),transparent_50%)]",
                  ].join(" ")}
                />
                {isActive ? (
                  <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#d4af37]/15 blur-3xl" />
                ) : null}
              </div>

              <div className="relative p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={[
                        "h-9 w-9 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 transition-colors",
                        isOk
                          ? "text-black bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)] shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                          : "text-[#d4af37]/60 bg-[#1a1405] border border-[#d4af37]/20",
                      ].join(" ")}
                    >
                      {isOk ? "✓" : it.n}
                    </div>

                    <div className="min-w-0">
                      <div className={["text-sm font-extrabold tracking-tight truncate transition-colors", isActive || isOk ? "text-[#f7e7a7]" : "text-[#d4af37]/50"].join(" ")}>{it.t}</div>
                      <div className="text-[11px] text-[#d4af37]/40 truncate transition-colors">{it.d}</div>
                    </div>
                  </div>

                  <div
                    className={[
                      "text-[11px] font-semibold px-2 py-1 rounded-full border transition-colors",
                      isDisabled
                        ? "border-[#d4af37]/10 bg-[#1a1405]/40 text-[#d4af37]/30"
                        : isActive
                        ? "border-[#d4af37]/40 bg-[#d4af37]/10 text-[#f7e7a7]"
                        : "border-[#d4af37]/20 bg-[#1a1405]/60 text-[#d4af37]/60",
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
    if (!balanceData) return `0 ${baseSepolia.nativeCurrency?.symbol ?? "ETH"}`;
    const s = formatUnits(balanceData.value, balanceData.decimals);
    return `${fmtEth(s)} ${balanceData.symbol ?? "ETH"}`;
  }, [mounted, connected, isBalanceLoading, balanceData]);

  const wrongNetwork = connected && effectiveChainId !== baseSepolia.id;
  const hasGas = connected && !wrongNetwork && balanceEth > 0;

  const refreshLabel = !mounted ? "Refresh" : isBalanceFetching ? "Refreshing…" : "Refresh";

  // form state
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  const [project, setProject] = useState<(typeof PROJECTS)[number]>("Realife");
  const [categories, setCategories] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [supply, setSupply] = useState<number>(1);
  const [proofUrl, setProofUrl] = useState("");

  const [step, setStep] = useState<"idle" | "preparing" | "signing" | "mining">("idle");
  const [error, setError] = useState<string>("");

  const [tokenURI, setTokenURI] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewCategory, setPreviewCategory] = useState<string>("Other");

  const selectedCategoryLabel = useMemo(
    () => (categories.length ? categories.join(", ") : "Other"),
    [categories]
  );

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function onPickFile(f: File | null) {
    setError("");
    setTokenURI(null);
    setFile(f);

    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);

    if (!f) {
      setFilePreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(f);
    setFilePreviewUrl(url);

    pushedRef.current = false;
  }

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  const { data: txHash, writeContractAsync, isPending: isWalletPromptOpen } = useWriteContract();

  const { isLoading: isMining, isSuccess, data: receipt } = useWaitForTransactionReceipt({
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

      const tokenId = extractTokenIdFromReceipt(receipt, CONTRACT_ADDRESS);
      const imageForQuery = persistableImageUrl(previewImage) || "";

      try {
        if (CONTRACT_ADDRESS && tokenId) {
          const r = await fetch("/api/mints", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              chainId: baseSepolia.id,
              contract: CONTRACT_ADDRESS,
              tokenId,
              txHash: txHash || "",
              tokenUri: tokenURI || "",
              name: finalName,
              image: imageForQuery || null,
              verified: true,
            }),
          });

          if (!r.ok) {
            const t = await r.text().catch(() => "");
            console.error("SAVE_MINT_FAILED", r.status, t);
          }
        }
      } catch (e) {
        console.error("SAVE_MINT_EXCEPTION", e);
      }

      router.push(
        `/app/success?name=${encodeURIComponent(finalName)}&image=${encodeURIComponent(
          imageForQuery
        )}&category=${encodeURIComponent(finalCategory)}&project=${encodeURIComponent(
          project
        )}&tx=${encodeURIComponent(txHash || "")}&tokenId=${encodeURIComponent(tokenId || "")}`
      );
    })();
  }, [
    isSuccess,
    receipt,
    name,
    previewCategory,
    selectedCategoryLabel,
    project,
    txHash,
    tokenURI,
    previewImage,
    router,
  ]);

  async function ensureCorrectNetwork() {
    if (!connected) {
      openConnectModal?.();
      throw new Error("Connect wallet first.");
    }
    if (effectiveChainId !== baseSepolia.id) {
      await switchChainAsync({ chainId: baseSepolia.id });
    }
  }

  const canPrepare = Boolean(file) && Boolean(name.trim()) && Boolean(CONTRACT_ADDRESS);
  const canMint = Boolean(tokenURI) && Boolean(CONTRACT_ADDRESS);

  const busy =
    step === "preparing" ||
    step === "signing" ||
    step === "mining" ||
    isWalletPromptOpen ||
    isMining ||
    isSwitching;

  async function handlePrepare() {
    setError("");

    if (!CONTRACT_ADDRESS) {
      setError("Missing NEXT_PUBLIC_REALIFE_CONTRACT in .env.local");
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
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("project", project);
      formData.append("category", selectedCategoryLabel);
      formData.append("supply", String(clampSupply(supply)));
      formData.append("proofUrl", proofUrl.trim());

      const res = await fetch(PREPARE_URL, { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.message || "Mint preparation failed");

      const uri =
        data?.metadataUri ||
        data?.tokenURI ||
        data?.tokenUri ||
        data?.preview?.metadataUri ||
        data?.preview?.tokenURI ||
        null;

      if (!uri || typeof uri !== "string") {
        throw new Error("Backend didn't return metadataUri/tokenURI");
      }

      setTokenURI(uri);
      setPreviewImage(data?.preview?.image || filePreviewUrl || null);
      setPreviewCategory(data?.preview?.category || selectedCategoryLabel);

      setStep("idle");
    } catch (e: any) {
      setError(prettyError(e));
      setStep("idle");
    }
  }

  async function handleOnchainMint() {
    setError("");

    if (!CONTRACT_ADDRESS) {
      setError("Missing NEXT_PUBLIC_REALIFE_CONTRACT in .env.local");
      return;
    }
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

      setStep("signing");

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: REALIFE_ABI,
        functionName: "mint",
        args: [tokenURI],
      });

      if (hash) setStep("mining");
    } catch (e: any) {
      setError(prettyError(e));
      setStep("idle");
    }
  }

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
      />

      {/* LEFT */}
      <div className="space-y-8">
        {/* PROJECT */}
        <Card>
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight text-[#f7e7a7]">Select project</div>
              <div className="text-[11px] text-[#d4af37]/60 mt-1">
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
                  onClick={() => setProject(p)}
                  className={[
                    "px-4 py-2.5 rounded-2xl border text-sm font-extrabold transition-all",
                    active
                      ? "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black border-[#d4af37] shadow-[0_4px_20px_rgba(212,175,55,0.25)]"
                      : "bg-[#1a1405]/50 border-[#d4af37]/20 hover:bg-[#d4af37]/10 text-[#d4af37]/80 backdrop-blur-md", // 🔥 Золотисто-черная кнопка
                  ].join(" ")}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </Card>

        {/* UPLOAD */}
        <Card>
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight text-[#f7e7a7]">Upload your file</div>
              <div className="text-[11px] text-[#d4af37]/60 mt-1">
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
              "border-[#d4af37]/30 bg-[#1a1405]/40 backdrop-blur-md", // 🔥 Золотисто-черная зона загрузки
              "p-6 cursor-pointer transition-all",
              "hover:bg-[#d4af37]/10 hover:border-[#d4af37]/50",
            ].join(" ")}
          >
            <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 bg-[#d4af37]/10 rounded-full blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-28 w-80 h-80 bg-white/[0.02] rounded-full blur-3xl" />

            <div className="relative flex gap-5 items-center">
              <div className="w-28 h-28 rounded-2xl bg-[#0b0a09]/80 border border-[#d4af37]/20 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                {filePreviewUrl && file?.type?.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={filePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : filePreviewUrl && file?.type?.startsWith("video/") ? (
                  <video className="w-full h-full object-cover" src={filePreviewUrl} muted playsInline />
                ) : (
                  <div className="text-xs text-center text-[#d4af37]/50 px-3 font-semibold">
                    {file ? "Preview" : "Click to upload"}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold mb-1 text-[#f7e7a7]">Premium media upload</p>
                <p className="text-xs text-[#d4af37]/60 leading-relaxed">
                  Click to select high-quality asset.
                </p>

                {file && (
                  <p className="mt-3 text-xs font-semibold truncate text-[#d4af37]">
                    Selected: <span className="text-[#f7e7a7]">{file.name}</span>
                  </p>
                )}

                {tokenURI && (
                  <p className="mt-3 text-xs font-semibold">
                    <span className="text-emerald-400 mr-1">✓</span> <span className="text-[#f7e7a7]">IPFS Ready</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* CATEGORIES */}
        <Card>
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight text-[#f7e7a7]">Category</div>
              <div className="text-[11px] text-[#d4af37]/60 mt-1">Choose one or more to enrich metadata.</div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]/40" />
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
                    "flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border text-sm transition-all",
                    active
                      ? "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black border-[#d4af37] shadow-[0_4px_20px_rgba(212,175,55,0.25)]"
                      : "bg-[#1a1405]/50 border-[#d4af37]/20 hover:bg-[#d4af37]/10 text-[#d4af37]/80 backdrop-blur-md", // 🔥 Золотисто-черная кнопка
                  ].join(" ")}
                >
                  <span className="font-extrabold">{c}</span>
                  <span
                    className={[
                      "w-5 h-5 rounded-md border flex items-center justify-center text-xs transition-colors",
                      active ? "border-black/35 bg-black/10" : "border-[#d4af37]/20 bg-[#0b0a09]/60",
                    ].join(" ")}
                  >
                    {active ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* RIGHT */}
      <div className="space-y-6 lg:sticky lg:top-8">
        
        {/* STATUS */}
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Pill>
                <span
                  className={[
                    "h-2 w-2 rounded-full",
                    !mounted || !connected
                      ? "bg-[#d4af37]/40"
                      : wrongNetwork
                      ? "bg-rose-400"
                      : "bg-emerald-400",
                    "shadow-[0_0_0_6px_rgba(212,175,55,0.06)]",
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

              <div className="mt-3 text-sm font-extrabold tracking-tight text-[#f7e7a7]">
                {mounted && connected
                  ? wrongNetwork
                    ? "Switch to Base Sepolia"
                    : hasGas
                    ? "Gas OK — ready to mint"
                    : "No gas — request test ETH"
                  : "Connect wallet to mint"}
              </div>

              <div className="mt-2 text-xs text-[#d4af37]/80">
                Balance: <span className="font-semibold text-[#f7e7a7]">{balanceLabel}</span>
              </div>

              <div className="mt-2 text-[11px] text-[#d4af37]/60 leading-relaxed">
                {mounted && connected ? (
                  <>
                    {wrongNetwork
                      ? "One click switch, then mint."
                      : hasGas
                      ? "Prepare → sign → tx mined → success."
                      : "Open faucet, claim test ETH, then refresh."}{" "}
                    <Link
                      href="/app/faucet"
                      className="text-[#f7e7a7] font-semibold hover:brightness-110 transition underline"
                    >
                      Faucet ↗
                    </Link>
                  </>
                ) : (
                  <>
                    Connect wallet to enable switching, balance check and mint.{" "}
                    <span className="text-[#d4af37]/50">(VIP flow)</span>
                  </>
                )}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => refetchBalance()}
                disabled={!mounted || !connected || isBalanceFetching}
                className="h-10 px-4 rounded-2xl border border-[#d4af37]/20 bg-[#1a1405]/60 hover:bg-[#d4af37]/10 backdrop-blur-md transition text-xs font-extrabold text-[#f7e7a7] disabled:opacity-40"
              >
                {refreshLabel}
              </button>

              {!mounted || !connected ? (
                <button
                  type="button"
                  onClick={() => openConnectModal?.()}
                  className="h-10 px-4 rounded-2xl bg-[linear-gradient(135deg,#f7e7a7,#d4af37)] text-black hover:brightness-110 transition text-xs font-extrabold"
                >
                  Connect
                </button>
              ) : wrongNetwork ? (
                <button
                  type="button"
                  disabled={isSwitching}
                  onClick={() => switchChainAsync({ chainId: baseSepolia.id }).catch(() => {})}
                  className="h-10 px-4 rounded-2xl bg-[linear-gradient(135deg,#f7e7a7,#d4af37)] text-black hover:brightness-110 transition text-xs font-extrabold disabled:opacity-60"
                >
                  {isSwitching ? "Switching…" : "Switch"}
                </button>
              ) : null}
            </div>
          </div>

          {!CONTRACT_ADDRESS && (
            <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              Missing <b>NEXT_PUBLIC_REALIFE_CONTRACT</b> in <code>.env.local</code>
            </div>
          )}
        </Card>

        {/* NAME */}
        <Card>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight text-[#f7e7a7]">NFT name / Title</div>
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
              "bg-[#1a1405]/60 border border-[#d4af37]/20 text-[#f7e7a7] backdrop-blur-md", // 🔥 Золотисто-черный инпут
              "placeholder:text-[#d4af37]/40",
              "focus:outline-none focus:ring-1 focus:ring-[#d4af37]/50 focus:border-[#d4af37]/60 transition-all",
            ].join(" ")}
          />
        </Card>

        {/* SUPPLY */}
        <Card>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight text-[#f7e7a7]">Amount / Supply</div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]/40" />
              Meta
            </Pill>
          </div>

          <input
            type="number"
            min={1}
            max={10000}
            value={supply}
            onChange={(e) => setSupply(clampSupply(Number(e.target.value)))}
            className={[
              "w-full rounded-2xl px-4 py-3 text-sm",
              "bg-[#1a1405]/60 border border-[#d4af37]/20 text-[#f7e7a7] backdrop-blur-md", // 🔥 Золотисто-черный инпут
              "focus:outline-none focus:ring-1 focus:ring-[#d4af37]/50 focus:border-[#d4af37]/60 transition-all",
            ].join(" ")}
          />
        </Card>

        {/* DESCRIPTION */}
        <Card>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight text-[#f7e7a7]">Description</div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]/40" />
              Optional
            </Pill>
          </div>

          <textarea
            placeholder="Tell the story of your work..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={[
              "w-full rounded-2xl px-4 py-3 text-sm min-h-[120px]",
              "bg-[#1a1405]/60 border border-[#d4af37]/20 text-[#f7e7a7] backdrop-blur-md", // 🔥 Золотисто-черный инпут
              "placeholder:text-[#d4af37]/40",
              "focus:outline-none focus:ring-1 focus:ring-[#d4af37]/50 focus:border-[#d4af37]/60 transition-all",
              "resize-none",
            ].join(" ")}
          />
        </Card>

        {/* PROOF */}
        <Card>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-sm font-extrabold tracking-tight text-[#f7e7a7]">Proof / X link</div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]/40" />
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
              "bg-[#1a1405]/60 border border-[#d4af37]/20 text-[#f7e7a7] backdrop-blur-md", // 🔥 Золотисто-черный инпут
              "placeholder:text-[#d4af37]/40",
              "focus:outline-none focus:ring-1 focus:ring-[#d4af37]/50 focus:border-[#d4af37]/60 transition-all",
            ].join(" ")}
          />
        </Card>

        {error && (
          <div className="rounded-[24px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 shadow-[0_4px_20px_rgba(225,29,72,0.2)] backdrop-blur-md">
            {error}
          </div>
        )}

        {/* ACTIONS */}
        <Card>
          <div className="space-y-3">
            <GhostButton disabled={busy || !canPrepare} onClick={handlePrepare}>
              {step === "preparing" ? "Uploading → IPFS (prepare)…" : "1) Prepare (Upload → IPFS)"}
            </GhostButton>

            <GoldButton disabled={busy || !canMint} onClick={handleOnchainMint}>
              {step === "signing"
                ? "Waiting for wallet signature…"
                : step === "mining" || isMining
                ? "Minting on-chain (mining)…"
                : "2) Mint On-chain (Signature + Gas)"}
            </GoldButton>

            {txHash && (
              <div className="mt-4 text-center">
                <a
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-[#f7e7a7] hover:text-white transition"
                >
                  View tx on BaseScan ↗
                </a>
              </div>
            )}
          </div>
        </Card>

        {/* PREVIEW */}
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#d4af37]/60">Preview</div>
              <div className="mt-1 text-sm font-extrabold truncate text-[#f7e7a7]">{name.trim() || "Untitled NFT"}</div>
              <div className="mt-1 text-xs text-[#d4af37]/60 truncate">
                {project} • {selectedCategoryLabel} • Supply {clampSupply(supply)}
              </div>
            </div>

            <div className="w-16 h-16 rounded-2xl bg-[#1a1405]/60 backdrop-blur-md border border-[#d4af37]/20 overflow-hidden flex items-center justify-center shadow-[0_4px_20px_rgba(212,175,55,0.1)]">
              {filePreviewUrl && file?.type?.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={filePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-black text-[#d4af37]/40">NFT</span>
              )}
            </div>
          </div>

          <p className="mt-3 text-[11px] text-[#d4af37]/50">
            Tokenization = media + IPFS metadata + on-chain ownership.
          </p>
        </Card>
      </div>
    </div>
  );
}