"use client";

import Link from "next/link";
import Reveal from "@/components/Reveal";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { baseSepolia } from "wagmi/chains";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function Pill({ children }: { children: React.ReactNode }) {
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
  children: React.ReactNode;
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
          "border border-white/10 bg-[#0b0a09]/15 backdrop-blur-2xl",
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
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))]",
        "shadow-[0_24px_90px_rgba(0,0,0,0.55)]",
        className,
      ].join(" ")}
    >
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0a09]/15 backdrop-blur-2xl ring-1 ring-black/10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_0%,rgba(212,175,55,0.10),transparent_45%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_120%,rgba(255,255,255,0.06),transparent_55%)]" />
        </div>
        <div className="relative z-10 p-6">{children}</div>
      </div>
    </div>
  );
}

function GoldButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "relative inline-flex items-center justify-center overflow-hidden",
        "px-6 py-3 rounded-2xl",
        "text-black font-extrabold tracking-tight",
        "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
        "shadow-[0_22px_70px_rgba(212,175,55,0.18)]",
        "ring-1 ring-black/15",
        "transition duration-300 hover:brightness-110 hover:-translate-y-px",
        "active:translate-y-0",
        "before:absolute before:inset-0 before:bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.35),transparent)]",
        "before:translate-x-[-140%] hover:before:translate-x-[140%] before:transition before:duration-700",
        className,
      ].join(" ")}
    >
      <span className="relative z-10">{children}</span>
    </Link>
  );
}

function GhostButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center justify-center",
        "px-6 py-3 rounded-2xl",
        "border border-white/15 bg-white/[0.06] text-white font-extrabold",
        "backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)]",
        "transition duration-300 hover:bg-white/10 hover:-translate-y-px",
        "active:translate-y-0",
        className,
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function shortAddr(a?: string) {
  if (!a) return "—";
  if (!a.startsWith("0x")) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://accurate-art-production.up.railway.app";
const IPFS_GATEWAY = (process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://nftstorage.link").replace(/\/$/, "");

/** allow blob:, data:, ipfs:// and http(s) + /ipfs/... */
function safeUrl(input?: string) {
  const url = (input || "").trim();
  if (!url) return "";

  if (url.startsWith("blob:") || url.startsWith("data:")) return url;

  if (url.startsWith("/ipfs/")) return `${IPFS_GATEWAY}${url}`;

  if (url.startsWith("ipfs://")) {
    const rest = url.replace("ipfs://", "");
    const cidPath = rest.startsWith("ipfs/") ? rest.replace("ipfs/", "") : rest;
    return `${IPFS_GATEWAY}/ipfs/${cidPath}`;
  }

  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") return url;
    return "";
  } catch {
    return "";
  }
}

function isVideoUrl(url: string) {
  const u = url.toLowerCase();
  const clean = u.split("?")[0].split("#")[0];
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".mov") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".m4v") ||
    u.startsWith("data:video/")
  );
}

/** Premium play/pause overlay (no ugly controls) */
function VideoPlayOverlay({
  src,
  poster,
  className = "",
}: {
  src: string;
  poster?: string;
  className?: string;
}) {
  const vref = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPlaying(false);
    const v = vref.current;
    if (!v) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);

    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const toggle = () => {
    const v = vref.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  return (
    <div className={["absolute inset-0", className].join(" ")}>
      <video
        ref={vref}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
        onClick={toggle}
      />
      <button
        type="button"
        onClick={toggle}
        className={[
          "absolute inset-0 flex items-center justify-center",
          "transition",
          playing ? "opacity-0 pointer-events-none" : "opacity-100",
        ].join(" ")}
        aria-label={playing ? "Pause" : "Play"}
      >
        <span
          className={[
            "inline-flex items-center justify-center",
            "h-14 w-14 rounded-2xl",
            "border border-white/15 bg-black/35 backdrop-blur-md",
            "shadow-[0_18px_70px_rgba(0,0,0,0.45)]",
            "ring-1 ring-black/20",
          ].join(" ")}
        >
          <span className="text-amber-200 font-black text-xl">▶</span>
        </span>
      </button>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.55),transparent_55%)]" />
    </div>
  );
}

export default function SuccessClient() {
  const mounted = useMounted();
  const sp = useSearchParams();

  const standard = useMemo(() => (sp.get("standard") || "ERC721").toUpperCase(), [sp]);
  const is1155 = standard === "ERC1155";

  // ✅ contract comes from query (set by MintForm). fallback to 721 env if missing.
  const qpContract = useMemo(() => (sp.get("contract") || "").trim(), [sp]);
  const contract = useMemo(() => {
    if (qpContract && qpContract.startsWith("0x")) return qpContract;
    // fallback: old links (erc721)
    const fallback = process.env.NEXT_PUBLIC_REALIFE_CONTRACT || "";
    return fallback;
  }, [qpContract]);

  const initialName = useMemo(() => (sp.get("name") || "Untitled NFT").trim(), [sp]);
  const initialCategory = useMemo(() => (sp.get("category") || "Other").trim(), [sp]);
  const initialProject = useMemo(() => (sp.get("project") || "Realife").trim(), [sp]);

  // ✅ poster + media + kind
  const qpKind = useMemo(() => (sp.get("kind") || "").toLowerCase(), [sp]);

  // poster in ?image=
  const rawPoster = useMemo(() => sp.get("image") || "", [sp]);
  const posterUrl = useMemo(() => safeUrl(rawPoster), [rawPoster]);

  // media in ?media= (fallback to image)
  const rawMedia = useMemo(() => sp.get("media") || sp.get("image") || "", [sp]);
  const initialMedia = useMemo(() => safeUrl(rawMedia), [rawMedia]);

  const initialKind = useMemo<"image" | "video">(() => {
    if (qpKind === "video" || qpKind === "image") return qpKind;
    return initialMedia && isVideoUrl(initialMedia) ? "video" : "image";
  }, [qpKind, initialMedia]);

  const tx = useMemo(() => (sp.get("tx") || "").trim(), [sp]);
  const tokenId = useMemo(() => (sp.get("tokenId") || "").trim(), [sp]);

  const initialEarned = useMemo(() => {
    const n = Number((sp.get("earned") || "0").trim());
    return Number.isFinite(n) ? n : 0;
  }, [sp]);

  const initialPoints = useMemo(() => {
    const raw = (sp.get("points") || "").trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [sp]);

  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState(initialCategory);
  const [project, setProject] = useState(initialProject);

  const [mediaUrl, setMediaUrl] = useState(initialMedia);
  const [mediaKind, setMediaKind] = useState<"image" | "video">(initialKind);

  const [earned, setEarned] = useState<number>(initialEarned);
  const [pointsAfter, setPointsAfter] = useState<number | null>(initialPoints);

  const savedKeyRef = useRef<string>("");

  const basescanTx = tx ? `https://sepolia.basescan.org/tx/${tx}` : "";
  const [copied, setCopied] = useState<"" | "tx" | "link">("");

  // ✅ Ensure mint is saved (idempotent) + pull earned/points if backend returns them
  useEffect(() => {
    const key = tokenId && tx && contract ? `${contract}:${tokenId}:${tx}` : "";
    if (!key) return;

    if (savedKeyRef.current === key) return;
    savedKeyRef.current = key;

    // save stable image for DB: poster for video, media for image
    const posterToSave = posterUrl && !posterUrl.startsWith("blob:") ? posterUrl : null;
    const imageToSave =
      mediaKind === "image" && mediaUrl && !mediaUrl.startsWith("blob:")
        ? mediaUrl
        : posterToSave;

    (async () => {
      try {
        const r = await fetch("/api/mints", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({
            chainId: baseSepolia.id,
            contract: contract,
            tokenId,
            txHash: tx,
            name: name || null,
            image: imageToSave,
            verified: true,
            standard, // ✅ so you can store it if you want
          }),
        });

        const j = await r.json().catch(() => ({} as any));
        if (r.ok && j?.ok) {
          const add = Number(j?.add || 0) || 0;
          if (add > 0 && earned === 0) setEarned(add);
          if (typeof j?.points === "number") setPointsAfter(j.points);
        }
      } catch {
        // ignore
      }
    })();
  }, [tokenId, tx, name, mediaUrl, mediaKind, posterUrl, earned, contract, standard]);

  // ✅ Hydrate from backend /metadata/:tokenId ONLY for ERC-721 (your backend uses ownerOf)
  useEffect(() => {
    let alive = true;

    async function hydrateFromBackend() {
      if (!tokenId) return;
      if (is1155) return; // ✅ don't call ERC-721 metadata endpoint for 1155

      // If we already have actual video url and kind=video — nothing to do
      if (mediaKind === "video" && mediaUrl) return;

      const base = (API_BASE || "").replace(/\/$/, "");
      if (!base) return;

      try {
        const res = await fetch(`${base}/metadata/${encodeURIComponent(tokenId)}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();

        if (!alive) return;

        const img = safeUrl(json?.image);
        const anim = safeUrl(json?.animation_url || json?.animationUrl || json?.animation);

        // prefer animation_url (video)
        if (anim) {
          setMediaUrl(anim);
          setMediaKind("video");
        } else if (img && !mediaUrl) {
          setMediaUrl(img);
          setMediaKind(isVideoUrl(img) ? "video" : "image");
        }

        if (typeof json?.name === "string" && json.name.trim()) setName(json.name.trim());

        const attrs: Array<{ trait_type?: string; value?: any }> = Array.isArray(json?.attributes) ? json.attributes : [];
        const cat = attrs.find((a) => (a.trait_type || "").toLowerCase() === "category")?.value;
        const proj = attrs.find((a) => (a.trait_type || "").toLowerCase() === "project")?.value;

        if (cat && String(cat).trim()) setCategory(String(cat).trim());
        if (proj && String(proj).trim()) setProject(String(proj).trim());
      } catch {
        // ignore
      }
    }

    hydrateFromBackend();
    return () => {
      alive = false;
    };
  }, [tokenId, mediaUrl, mediaKind, is1155]);

  async function copyText(kind: "tx" | "link") {
    if (!mounted) return;
    const text = kind === "tx" ? tx : basescanTx;
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(""), 1200);
    } catch {
      // ignore
    }
  }

  const heroTitle = useMemo(() => {
    const base = name || "Untitled NFT";
    return base.length > 52 ? `${base.slice(0, 52)}…` : base;
  }, [name]);

  return (
    <div className="space-y-6">
      <Reveal>
        <GoldEdgeWrap className="rounded-[44px]">
          <div className="relative p-7 md:p-10">
            <div className="relative flex flex-col lg:flex-row gap-8 lg:items-start lg:justify-between">
              <div className="min-w-0">
                <Pill>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]" />
                  Mint confirmed • Base Sepolia • Explorer proof
                </Pill>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill>
                    <span className="text-white/80 font-extrabold">{standard}</span>
                  </Pill>
                  {contract ? (
                    <Pill>
                      <span className="text-white/55">Contract:</span>
                      <span className="text-white/80 font-extrabold">{shortAddr(contract)}</span>
                    </Pill>
                  ) : null}
                </div>

                <h1 className="mt-5 text-4xl md:text-6xl font-black leading-[1.05] tracking-[-0.02em]">
                  Success{" "}
                  <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]">
                    verified
                  </span>
                </h1>

                <p className="mt-4 text-sm md:text-base text-white/70 max-w-2xl leading-relaxed">
                  Your mint is on-chain. Keep the transaction link as permanent proof.
                </p>

                {/* Reward banner */}
                <div className="mt-6 flex flex-wrap gap-2">
                  {earned > 0 ? (
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-100">
                      ✨ You earned <span className="font-black">+{earned}</span> points
                      {typeof pointsAfter === "number" ? (
                        <span className="text-emerald-200/90">• Balance: {pointsAfter}</span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/70">
                      Mint rewards: <span className="text-amber-200 font-black">+10 points</span> per mint
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <GoldButton href="/app/create">Mint another</GoldButton>
                  <GhostButton href="/app">Back to App</GhostButton>

                  {basescanTx ? (
                    <a
                      href={basescanTx}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center px-6 py-3 rounded-2xl border border-white/15 bg-white/[0.06] font-extrabold backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)] hover:bg-white/10 hover:-translate-y-px transition active:translate-y-0"
                    >
                      View on BaseScan ↗
                    </a>
                  ) : null}
                </div>

                <div className="mt-6 flex flex-col gap-2 text-xs text-white/60">
                  <div className="flex items-center gap-2">
                    <span className="text-white/45">Title:</span>
                    <span className="font-semibold text-white/85">{heroTitle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/45">Context:</span>
                    <span className="font-semibold text-white/85">
                      {project} • {category}
                    </span>
                  </div>
                  {tokenId ? (
                    <div className="flex items-center gap-2">
                      <span className="text-white/45">Token ID:</span>
                      <span className="font-semibold text-white/85">{tokenId}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Preview */}
              <div className="w-full lg:w-[420px]">
                <Card className="rounded-[32px]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white/60">NFT preview</div>
                      <div className="mt-1 text-lg font-black tracking-tight truncate">
                        {name || "Untitled NFT"}
                      </div>
                      <div className="mt-1 text-xs text-white/60 truncate">
                        {project} • {category}
                      </div>
                    </div>

                    <div className="shrink-0 px-3 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-200 text-[11px] font-semibold">
                      Minted
                    </div>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-black/30">
                    <div className="relative aspect-[16/10]">
                      {mediaUrl ? (
                        mediaKind === "video" ? (
                          <VideoPlayOverlay src={mediaUrl} poster={posterUrl || undefined} />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mediaUrl}
                            alt="NFT media"
                            className="absolute inset-0 h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        )
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-white/45">
                          No preview media
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.55),transparent_55%)]" />
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                      <div className="text-[11px] font-semibold text-white/55">Transaction</div>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <div className="text-sm font-extrabold text-white/85 truncate">
                          {tx ? shortAddr(tx) : "—"}
                        </div>
                        <button
                          type="button"
                          onClick={() => copyText("tx")}
                          disabled={!mounted || !tx}
                          className="h-9 px-3 rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/10 transition text-xs font-extrabold disabled:opacity-40"
                        >
                          {copied === "tx" ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                      <div className="text-[11px] font-semibold text-white/55">Explorer link</div>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <div className="text-sm font-extrabold text-white/85 truncate">
                          {basescanTx ? "BaseScan /tx/…" : "—"}
                        </div>
                        <button
                          type="button"
                          onClick={() => copyText("link")}
                          disabled={!mounted || !basescanTx}
                          className="h-9 px-3 rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/10 transition text-xs font-extrabold disabled:opacity-40"
                        >
                          {copied === "link" ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 text-[11px] text-white/45">
                    Proof = poster + IPFS media + IPFS metadata + on-chain ownership.
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>
    </div>
  );
}