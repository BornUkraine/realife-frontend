"use client";

import Link from "next/link";
import Reveal from "@/components/Reveal";
import NftMedia from "@/components/NftMedia";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
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

function shortAddr(a?: string | null) {
  if (!a) return "—";
  if (!a.startsWith("0x")) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function safeUrl(input?: string | null) {
  const url = String(input || "").trim();
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

function humanFulfillmentType(v?: string | null) {
  const x = String(v || "").trim().toUpperCase();
  if (x === "PHYSICAL_GOOD") return "Physical good";
  if (x === "DIGITAL_SERVICE") return "Digital service";
  if (x === "ONLINE_SESSION") return "Online session";
  if (x === "LOCAL_SERVICE") return "Local service";
  return "";
}

function humanMarketType(v?: string | null) {
  const x = String(v || "").trim().toLowerCase();
  if (x === "protected") return "Protected marketplace";
  if (x === "standard") return "Standard marketplace";
  return "";
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://accurate-art-production.up.railway.app";

const IPFS_GATEWAY = (
  process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://nftstorage.link"
).replace(/\/$/, "");

export default function SuccessClient({
  viewerKey: initialViewerKey = null,
}: {
  viewerKey?: string | null;
}) {
  const mounted = useMounted();
  const sp = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const fullChainId = baseSepolia.id;

  const sessionUser = ((session as any)?.user || {}) as any;
  const sessionViewerKey = String(
    sessionUser?.handle ||
      sessionUser?.publicId ||
      (session as any)?.handle ||
      (session as any)?.publicId ||
      ""
  ).trim();
  const sessionWalletAddress = String(sessionUser?.walletAddress || "").trim();
  const sessionWalletKind = String(sessionUser?.walletKind || "").trim().toUpperCase();
  const sessionEmbeddedProvider = String(
    sessionUser?.embeddedWalletProvider || ""
  ).trim();

  const [resolvedViewerKey, setResolvedViewerKey] = useState(
    initialViewerKey || ""
  );
  const [previewOpen, setPreviewOpen] = useState(false);

  const standard = "ERC1155";

  const qpContract = useMemo(() => (sp.get("contract") || "").trim(), [sp]);

  const contract = useMemo(() => {
    if (qpContract && qpContract.startsWith("0x")) return qpContract;
    return (
      process.env.NEXT_PUBLIC_REALIFE_1155_NEW_CONTRACT ||
      process.env.NEXT_PUBLIC_REALIFE_1155_DELIVERY_CONTRACT ||
      ""
    ).trim();
  }, [qpContract]);

  const initialName = useMemo(
    () => (sp.get("name") || "Untitled NFT").trim(),
    [sp]
  );
  const initialCategory = useMemo(
    () => (sp.get("category") || "Other").trim(),
    [sp]
  );
  const initialProject = useMemo(
    () => (sp.get("project") || "Realife").trim(),
    [sp]
  );
  const initialBrand = useMemo(() => (sp.get("brand") || "").trim(), [sp]);
  const initialItemType = useMemo(
    () => (sp.get("itemType") || "").trim(),
    [sp]
  );
  const initialSubcategory = useMemo(
    () => (sp.get("subcategory") || "").trim(),
    [sp]
  );
  const initialFulfillmentType = useMemo(
    () => (sp.get("fulfillmentType") || "").trim(),
    [sp]
  );
  const initialSuggestedMarketType = useMemo(
    () => (sp.get("market") || "").trim(),
    [sp]
  );

  const initialDelivery = useMemo(() => {
    const v = (sp.get("delivery") || "").trim();
    return v === "1" || v.toLowerCase() === "true"
      ? "With delivery"
      : "Without delivery";
  }, [sp]);

  const qpKind = useMemo(() => (sp.get("kind") || "").toLowerCase(), [sp]);

  const rawPoster = useMemo(() => sp.get("image") || "", [sp]);
  const posterUrl = useMemo(() => safeUrl(rawPoster), [rawPoster]);

  const rawMedia = useMemo(() => sp.get("media") || sp.get("image") || "", [sp]);
  const initialMedia = useMemo(() => safeUrl(rawMedia), [rawMedia]);

  const initialKind = useMemo<"image" | "video">(() => {
    if (qpKind === "video" || qpKind === "image") return qpKind;
    return initialMedia && isVideoUrl(initialMedia) ? "video" : "image";
  }, [qpKind, initialMedia]);

  const tx = useMemo(() => (sp.get("tx") || "").trim(), [sp]);
  const tokenId = useMemo(() => (sp.get("tokenId") || "").trim(), [sp]);

  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState(initialCategory);
  const [project, setProject] = useState(initialProject);
  const [brand, setBrand] = useState(initialBrand);
  const [itemType, setItemType] = useState(initialItemType);
  const [subcategory, setSubcategory] = useState(initialSubcategory);
  const [deliveryLabel, setDeliveryLabel] = useState(initialDelivery);
  const [deliveryEnabled, setDeliveryEnabled] = useState(
    initialDelivery === "With delivery"
  );
  const [physicalItemIncluded, setPhysicalItemIncluded] = useState(
    initialDelivery === "With delivery"
  );
  const [fulfillmentType, setFulfillmentType] = useState(initialFulfillmentType);
  const [suggestedMarketType, setSuggestedMarketType] = useState(
    initialSuggestedMarketType
  );

  const [mediaUrl, setMediaUrl] = useState(initialMedia);
  const [mediaKind, setMediaKind] = useState<"image" | "video">(initialKind);

  const basescanTx = tx ? `https://sepolia.basescan.org/tx/${tx}` : "";
  const nftHref =
    tokenId && contract
      ? `/nft/${fullChainId}/${contract}/${encodeURIComponent(tokenId)}`
      : "/app/trading";
  const galleryHref = resolvedViewerKey
    ? `/u/${resolvedViewerKey}/nfts`
    : "/app/profile";

  const walletProofLabel = useMemo(() => {
    if (!sessionWalletAddress) return "";
    if (sessionWalletKind === "EMBEDDED") {
      return sessionEmbeddedProvider
        ? `${sessionEmbeddedProvider} embedded wallet`
        : "Embedded wallet";
    }
    return "External wallet";
  }, [sessionEmbeddedProvider, sessionWalletAddress, sessionWalletKind]);

  const [copied, setCopied] = useState<"" | "tx" | "link">("");

  useEffect(() => {
    if (initialViewerKey) {
      setResolvedViewerKey(initialViewerKey);
      return;
    }

    if (sessionViewerKey) {
      setResolvedViewerKey(sessionViewerKey);
      return;
    }

    if (sessionStatus === "loading") return;

    let alive = true;

    async function loadMe() {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!alive) return;

        const key =
          data?.user?.handle ||
          data?.user?.publicId ||
          data?.handle ||
          data?.publicId ||
          "";

        if (key) setResolvedViewerKey(String(key));
      } catch {
        //
      }
    }

    if (mounted) {
      loadMe();
    }

    return () => {
      alive = false;
    };
  }, [initialViewerKey, mounted, sessionStatus, sessionViewerKey]);

  useEffect(() => {
    if (!previewOpen) return;

    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;

    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;
    const prevHtmlOverflow = html.style.overflow;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    html.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewOpen(false);
    };

    window.addEventListener("keydown", onKey);

    return () => {
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      html.style.overflow = prevHtmlOverflow;

      window.removeEventListener("keydown", onKey);

      requestAnimationFrame(() => {
        window.scrollTo({
          top: scrollY,
          left: 0,
          behavior: "auto",
        });
      });
    };
  }, [previewOpen]);

  useEffect(() => {
    let alive = true;

    async function hydrateFromBackend1155() {
      if (!tokenId) return;

      const base = (API_BASE || "").replace(/\/$/, "");
      if (!base) return;

      try {
        let url = "";

        if (contract && contract.startsWith("0x")) {
          url = `${base}/metadata1155/${encodeURIComponent(contract)}/${encodeURIComponent(
            tokenId
          )}`;
        } else {
          url = `${base}/metadata1155/${encodeURIComponent(tokenId)}`;
        }

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;

        const json = await res.json();
        if (!alive) return;

        const backendContract = String(json?.contract || "").trim().toLowerCase();
        const expectedContract = String(contract || "").trim().toLowerCase();

        if (expectedContract && backendContract && backendContract !== expectedContract) {
          return;
        }

        const img = safeUrl(json?.image);
        const anim = safeUrl(
          json?.animation_url || json?.animationUrl || json?.animation
        );

        if (anim) {
          setMediaUrl(anim);
          setMediaKind("video");
        } else if (img) {
          setMediaUrl(img);
          setMediaKind(isVideoUrl(img) ? "video" : "image");
        }

        if (typeof json?.name === "string" && json.name.trim()) {
          setName(json.name.trim());
        }
        if (typeof json?.category === "string" && json.category.trim()) {
          setCategory(json.category.trim());
        }
        if (typeof json?.project === "string" && json.project.trim()) {
          setProject(json.project.trim());
        }
        if (typeof json?.brand === "string" && json.brand.trim()) {
          setBrand(json.brand.trim());
        }
        if (typeof json?.itemType === "string" && json.itemType.trim()) {
          setItemType(json.itemType.trim());
        }
        if (typeof json?.subcategory === "string" && json.subcategory.trim()) {
          setSubcategory(json.subcategory.trim());
        }
        if (typeof json?.fulfillmentType === "string" && json.fulfillmentType.trim()) {
          setFulfillmentType(json.fulfillmentType.trim());
        }
        if (
          typeof json?.suggestedMarketType === "string" &&
          json.suggestedMarketType.trim()
        ) {
          setSuggestedMarketType(json.suggestedMarketType.trim());
        }

        const hydratedDeliveryEnabled = Boolean(json?.deliveryEnabled);
        const hydratedPhysicalItemIncluded = Boolean(json?.physicalItemIncluded);

        const hydratedDeliveryMode =
          String(json?.deliveryMode || "").trim().toLowerCase() === "delivery"
            ? "With delivery"
            : hydratedDeliveryEnabled || hydratedPhysicalItemIncluded
            ? "With delivery"
            : "Without delivery";

        setDeliveryEnabled(hydratedDeliveryEnabled);
        setPhysicalItemIncluded(hydratedPhysicalItemIncluded);
        setDeliveryLabel(hydratedDeliveryMode);

        const attrs: Array<{ trait_type?: string; value?: any }> = Array.isArray(
          json?.attributes
        )
          ? json.attributes
          : [];

        const cat = attrs.find(
          (a) => (a.trait_type || "").toLowerCase() === "category"
        )?.value;

        const proj = attrs.find(
          (a) => (a.trait_type || "").toLowerCase() === "project"
        )?.value;

        const br = attrs.find(
          (a) => (a.trait_type || "").toLowerCase() === "brand"
        )?.value;

        const itemTypeAttr = attrs.find(
          (a) => (a.trait_type || "").toLowerCase() === "item type"
        )?.value;

        const subcategoryAttr = attrs.find(
          (a) => (a.trait_type || "").toLowerCase() === "subcategory"
        )?.value;

        const fulfillmentTypeAttr = attrs.find(
          (a) => (a.trait_type || "").toLowerCase() === "fulfillment type"
        )?.value;

        const deliveryModeAttr = attrs.find(
          (a) => (a.trait_type || "").toLowerCase() === "delivery mode"
        )?.value;

        const deliveryEnabledAttr = attrs.find(
          (a) => (a.trait_type || "").toLowerCase() === "delivery enabled"
        )?.value;

        const physicalAttr = attrs.find(
          (a) =>
            (a.trait_type || "").toLowerCase() === "physical item included"
        )?.value;

        const suggestedMarketAttr = attrs.find(
          (a) => (a.trait_type || "").toLowerCase() === "suggested market"
        )?.value;

        if (cat && String(cat).trim()) setCategory(String(cat).trim());
        if (proj && String(proj).trim()) setProject(String(proj).trim());
        if (br && String(br).trim()) setBrand(String(br).trim());
        if (itemTypeAttr && String(itemTypeAttr).trim()) {
          setItemType(String(itemTypeAttr).trim());
        }
        if (subcategoryAttr && String(subcategoryAttr).trim()) {
          setSubcategory(String(subcategoryAttr).trim());
        }
        if (fulfillmentTypeAttr && String(fulfillmentTypeAttr).trim()) {
          setFulfillmentType(String(fulfillmentTypeAttr).trim());
        }
        if (deliveryModeAttr && String(deliveryModeAttr).trim()) {
          setDeliveryLabel(String(deliveryModeAttr).trim());
        }
        if (deliveryEnabledAttr !== undefined) {
          setDeliveryEnabled(
            String(deliveryEnabledAttr).trim().toLowerCase() === "yes"
          );
        }
        if (physicalAttr !== undefined) {
          setPhysicalItemIncluded(
            String(physicalAttr).trim().toLowerCase() === "yes"
          );
        }
        if (suggestedMarketAttr && String(suggestedMarketAttr).trim()) {
          const raw = String(suggestedMarketAttr).trim().toLowerCase();
          setSuggestedMarketType(raw === "protected" ? "protected" : "standard");
        }
      } catch {
        //
      }
    }

    hydrateFromBackend1155();

    return () => {
      alive = false;
    };
  }, [tokenId, contract]);

  async function copyText(kind: "tx" | "link") {
    if (!mounted) return;
    const text = kind === "tx" ? tx : basescanTx;
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(""), 1200);
    } catch {
      //
    }
  }

  const heroTitle = useMemo(() => {
    const base = name || "Untitled NFT";
    return base.length > 52 ? `${base.slice(0, 52)}…` : base;
  }, [name]);

  const fulfillmentLabel = humanFulfillmentType(fulfillmentType);
  const suggestedMarketLabel = humanMarketType(suggestedMarketType);

  const previewModal =
    mounted && previewOpen && mediaUrl
      ? createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-sm"
            onClick={() => setPreviewOpen(false)}
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPreviewOpen(false);
              }}
              aria-label="Close preview"
              className="absolute right-4 top-4 z-[100000] inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-black/50 text-white backdrop-blur-md shadow-[0_10px_35px_rgba(0,0,0,0.35)] transition hover:scale-[1.04] hover:bg-black/70"
            >
              <span className="text-xl leading-none">✕</span>
            </button>

            <div className="absolute inset-x-0 top-0 z-[100000] pointer-events-none">
              <div className="mx-auto max-w-6xl px-5 pt-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[11px] font-bold text-white/70 backdrop-blur-md shadow-[0_10px_35px_rgba(0,0,0,0.25)]">
                  <span>Fullscreen Preview</span>
                  <span className="text-white/30">•</span>
                  <span
                    className={
                      mediaKind === "video" ? "text-amber-100" : "text-white/75"
                    }
                  >
                    {mediaKind === "video" ? "VIDEO" : "IMAGE"}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="flex h-full w-full items-center justify-center p-4 sm:p-6 md:p-10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <div className="relative flex h-full w-full items-center justify-center">
                <NftMedia
                  src={mediaUrl}
                  kind={mediaKind}
                  alt={name || "NFT"}
                  poster={mediaKind === "video" ? posterUrl || null : null}
                  className="h-full w-full"
                  roundedClass="rounded-none"
                  showControls={true}
                  fit="contain"
                  mediaBgClass="bg-black"
                />
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className="space-y-6">
        <Reveal>
          <GoldEdgeWrap className="rounded-[44px]">
            <div className="relative p-7 md:p-10">
              <div className="relative flex flex-col gap-8">
                <div className="flex flex-col lg:flex-row gap-8 lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <Pill>
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]" />
                      Mint confirmed • Base Sepolia • Explorer proof
                    </Pill>

                    {walletProofLabel ? (
                      <Pill>
                        <span className="text-white/55">Wallet:</span>
                        <span className="font-extrabold text-white/80">
                          {walletProofLabel}
                        </span>
                        <span className="font-mono text-white/60">
                          {shortAddr(sessionWalletAddress)}
                        </span>
                      </Pill>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Pill>
                        <span className="text-white/80 font-extrabold">{standard}</span>
                      </Pill>

                      {contract ? (
                        <Pill>
                          <span className="text-white/55">Contract:</span>
                          <span className="text-white/80 font-extrabold">
                            {shortAddr(contract)}
                          </span>
                        </Pill>
                      ) : null}

                      <Pill>
                        <span className="text-white/55">Mode:</span>
                        <span className="text-white/80 font-extrabold">
                          {deliveryLabel}
                        </span>
                      </Pill>

                      {itemType ? (
                        <Pill>
                          <span className="text-white/55">Item type:</span>
                          <span className="text-white/80 font-extrabold">
                            {itemType}
                          </span>
                        </Pill>
                      ) : null}

                      {fulfillmentLabel ? (
                        <Pill>
                          <span className="text-white/55">Class:</span>
                          <span className="text-white/80 font-extrabold">
                            {fulfillmentLabel}
                          </span>
                        </Pill>
                      ) : null}

                      {suggestedMarketLabel ? (
                        <Pill>
                          <span className="text-white/55">Later listing:</span>
                          <span className="text-amber-200 font-extrabold">
                            {suggestedMarketLabel}
                          </span>
                        </Pill>
                      ) : null}

                      <Pill>
                        <span className="text-amber-200 font-black">+10</span>
                        reward
                      </Pill>
                    </div>

                    <h1 className="mt-5 text-4xl md:text-6xl font-black leading-[1.05] tracking-[-0.02em]">
                      Success{" "}
                      <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]">
                        verified
                      </span>
                    </h1>

                    <p className="mt-4 text-sm md:text-base text-white/70 max-w-2xl leading-relaxed">
                      Your edition is on-chain. Open the NFT page, jump to your
                      gallery, or keep the transaction link as permanent proof.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <GoldButton href={nftHref}>Open NFT page</GoldButton>
                      <GhostButton href={galleryHref}>My NFT gallery</GhostButton>
                      <GhostButton href="/app/create">Mint another</GhostButton>

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

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white/45">Context:</span>
                        <span className="font-semibold text-white/85">
                          {project} • {category}
                        </span>
                        {subcategory ? (
                          <span className="font-semibold text-white/70">
                            • {subcategory}
                          </span>
                        ) : null}
                        {brand ? (
                          <span className="font-semibold text-white/70">• {brand}</span>
                        ) : null}
                      </div>

                      {tokenId ? (
                        <div className="flex items-center gap-2">
                          <span className="text-white/45">Token ID:</span>
                          <span className="font-semibold text-white/85">{tokenId}</span>
                        </div>
                      ) : null}

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white/45">Delivery:</span>
                        <span className="font-semibold text-white/85">{deliveryLabel}</span>
                        {deliveryEnabled ? (
                          <span className="font-semibold text-emerald-200">
                            • delivery enabled
                          </span>
                        ) : null}
                        {physicalItemIncluded ? (
                          <span className="font-semibold text-amber-200">
                            • physical item
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="w-full lg:w-[440px]">
                    <Card className="rounded-[32px]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white/60">
                            NFT preview
                          </div>
                          <div className="mt-1 text-lg font-black tracking-tight truncate">
                            {name || "Untitled NFT"}
                          </div>
                          <div className="mt-1 text-xs text-white/60 truncate">
                            {project} • {category}
                            {brand ? ` • ${brand}` : ""}
                          </div>
                        </div>

                        <div className="shrink-0 px-3 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-200 text-[11px] font-semibold">
                          Minted
                        </div>
                      </div>

                      <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-black/30">
                        <div className="relative aspect-[16/10]">
                          {mediaUrl ? (
                            <>
                              <NftMedia
                                src={mediaUrl}
                                kind={mediaKind}
                                alt={name || "NFT media"}
                                poster={mediaKind === "video" ? posterUrl || null : null}
                                className="h-full w-full"
                                roundedClass="rounded-none"
                                showControls={mediaKind === "video"}
                                fit="contain"
                                mediaBgClass="bg-black"
                              />

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setPreviewOpen(true);
                                }}
                                aria-label="Open fullscreen preview"
                                className="absolute right-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-black/45 text-white/90 backdrop-blur-md shadow-[0_10px_35px_rgba(0,0,0,0.35)] transition hover:scale-[1.04] hover:bg-black/60 active:scale-[0.98]"
                              >
                                <span className="text-lg leading-none">⤢</span>
                              </button>
                            </>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-white/45">
                              No preview media
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 text-[11px] text-white/50">
                        Fullscreen preview available
                      </div>

                      <div className="mt-5 grid grid-cols-1 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                          <div className="text-[11px] font-semibold text-white/55">
                            Transaction
                          </div>
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
                          <div className="text-[11px] font-semibold text-white/55">
                            Explorer link
                          </div>
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

                      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {brand ? (
                          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                            <div className="text-[11px] font-semibold text-white/55">
                              Brand
                            </div>
                            <div className="mt-1 text-sm font-extrabold text-white/85">
                              {brand}
                            </div>
                          </div>
                        ) : null}

                        {itemType ? (
                          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                            <div className="text-[11px] font-semibold text-white/55">
                              Item type
                            </div>
                            <div className="mt-1 text-sm font-extrabold text-white/85">
                              {itemType}
                            </div>
                          </div>
                        ) : null}

                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                          <div className="text-[11px] font-semibold text-white/55">
                            Delivery mode
                          </div>
                          <div className="mt-1 text-sm font-extrabold text-white/85">
                            {deliveryLabel}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                          <div className="text-[11px] font-semibold text-white/55">
                            Physical item
                          </div>
                          <div className="mt-1 text-sm font-extrabold text-white/85">
                            {physicalItemIncluded ? "Yes" : "No"}
                          </div>
                        </div>

                        {fulfillmentLabel ? (
                          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 md:col-span-2">
                            <div className="text-[11px] font-semibold text-white/55">
                              NFT class / routing
                            </div>
                            <div className="mt-1 text-sm font-extrabold text-white/85">
                              {fulfillmentLabel}
                              {suggestedMarketLabel ? ` • ${suggestedMarketLabel}` : ""}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <GoldButton href={nftHref} className="flex-1 min-w-[180px]">
                          Open NFT page
                        </GoldButton>
                        <GhostButton
                          href={galleryHref}
                          className="flex-1 min-w-[180px]"
                        >
                          My NFT gallery
                        </GhostButton>
                      </div>

                      <div className="mt-5 text-[11px] text-white/45">
                        Proof = poster + IPFS media + IPFS metadata + on-chain mint.
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </GoldEdgeWrap>
        </Reveal>
      </div>

      {previewModal}
    </>
  );
}