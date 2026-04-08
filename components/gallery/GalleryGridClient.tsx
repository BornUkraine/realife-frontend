"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import NftMedia from "@/components/NftMedia";
import QuickList1155 from "@/components/trading/QuickList1155";

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function shortAddr(addr?: string | null) {
  if (!addr) return "—";
  const s = String(addr);
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

type GalleryItem = {
  id: string;
  chainId: number;
  contract: string;
  tokenId: string;
  ownedAmount: string;
  updatedAt: string;
  name: string | null;
  tokenUri: string | null;
  kind: "image" | "video";
  media: string | null;
  poster: string | null;
  supply: string | null;
  isCafeNft: boolean;
  isStoreNft: boolean;
  isUser1155Nft: boolean;
  isDeliveryUserNft: boolean;
  href: string;
};

type PreviewState = {
  src: string;
  kind: "image" | "video";
  poster?: string | null;
  alt?: string;
} | null;

const quickListHoverClass =
  "invisible opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100";

const previewHoverClass =
  "invisible opacity-0 translate-y-1 pointer-events-none transition-all duration-200 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto";

export default function GalleryGridClient({
  items,
  isOwner,
}: {
  items: GalleryItem[];
  isOwner: boolean;
}) {
  const [preview, setPreview] = useState<PreviewState>(null);

  useEffect(() => {
    if (!preview) return;

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
      if (e.key === "Escape") setPreview(null);
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
  }, [preview]);

  return (
    <>
      <div
        className="reveal grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
        style={{ animationDelay: "90ms" }}
      >
        {items.map((x) => (
          <Link
            key={x.id}
            href={x.href}
            className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_24px_90px_rgba(0,0,0,0.55)] transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.08]"
          >
            <div className="relative aspect-square w-full bg-black">
              {x.media ? (
                <>
                  <div className="absolute right-3 top-3 z-20 flex flex-col items-end gap-2">
                    {isOwner ? (
                      <div className={cx("z-30", quickListHoverClass)}>
                        <QuickList1155
                          chainId={x.chainId}
                          contract={x.contract}
                          tokenId={String(x.tokenId)}
                          maxAmountHint={String(x.ownedAmount)}
                          name={x.name}
                        />
                      </div>
                    ) : null}

                    <div className={cx("z-20", previewHoverClass)}>
                      <button
                        type="button"
                        aria-label="Open full preview"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPreview({
                            src: x.media!,
                            kind: x.kind,
                            poster: x.kind === "video" ? x.poster : null,
                            alt: x.name || "NFT",
                          });
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-black/45 text-white/90 backdrop-blur-md shadow-[0_10px_35px_rgba(0,0,0,0.35)] transition-all duration-200 hover:scale-[1.04] hover:bg-black/60 active:scale-[0.98]"
                      >
                        <span className="text-lg leading-none">⤢</span>
                      </button>
                    </div>
                  </div>

                  <NftMedia
                    src={x.media}
                    kind={x.kind}
                    alt={x.name || "NFT"}
                    poster={x.kind === "video" ? x.poster : null}
                    showControls={false}
                    fit="contain"
                    className="h-full w-full"
                    roundedClass="rounded-none"
                    mediaBgClass="bg-black"
                  />

                  <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
                    {x.kind === "video" ? (
                      <div className="rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-bold text-amber-100">
                        VIDEO
                      </div>
                    ) : null}

                    <div
                      className={cx(
                        "rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-bold",
                        x.isCafeNft
                          ? "text-amber-100"
                          : x.isStoreNft
                          ? "text-sky-200"
                          : x.isDeliveryUserNft
                          ? "text-violet-200"
                          : "text-emerald-200"
                      )}
                    >
                      {x.isCafeNft
                        ? "CAFE"
                        : x.isStoreNft
                        ? "STORE"
                        : x.isDeliveryUserNft
                        ? "DELIVERY"
                        : "EDITION"}
                    </div>

                    <div className="rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-bold text-white/75">
                      Owned x{x.ownedAmount}
                    </div>
                  </div>

                  {x.supply ? (
                    <div className="absolute bottom-3 right-3 z-10 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-bold text-white/75">
                      Supply x{x.supply}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/25 font-bold">
                  No media
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.4)_0%,transparent_40%)] opacity-0 transition-opacity group-hover:opacity-100" />
            </div>

            <div className="p-5">
              <div className="truncate text-sm font-bold text-white/90">
                {x.name || `Token #${x.tokenId}`}
              </div>

              <div className="mt-1.5 flex items-center justify-between gap-2 text-[12px] text-white/40">
                <span className="truncate">{shortAddr(x.contract)}</span>
                <span className="font-mono">#{x.tokenId}</span>
              </div>

              {x.isCafeNft || x.isStoreNft ? (
                <div className="mt-3">
                  <span
                    className={cx(
                      "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold",
                      x.isCafeNft
                        ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
                        : "border-sky-500/20 bg-sky-500/10 text-sky-200"
                    )}
                  >
                    {x.isCafeNft ? "Cafe storefront" : "NFT Store"}
                  </span>
                </div>
              ) : null}

              <div className="mt-4 h-px bg-white/10" />

              <div className="mt-4 flex items-center justify-between text-[12px] font-bold text-amber-100/90 group-hover:text-amber-100">
                <span>View Details</span>
                <span>→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {preview ? (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setPreview(null);
            }}
            aria-label="Close"
            className="absolute right-4 top-4 z-[10000] inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-black/50 text-white backdrop-blur-md shadow-[0_10px_35px_rgba(0,0,0,0.35)] transition hover:scale-[1.04] hover:bg-black/70"
          >
            <span className="text-xl leading-none">✕</span>
          </button>

          <div className="absolute inset-x-0 top-0 z-[10000] pointer-events-none">
            <div className="mx-auto max-w-6xl px-5 pt-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[11px] font-bold text-white/70 backdrop-blur-md shadow-[0_10px_35px_rgba(0,0,0,0.25)]">
                <span>Fullscreen Preview</span>
                <span className="text-white/30">•</span>
                <span className={preview.kind === "video" ? "text-amber-100" : "text-white/75"}>
                  {preview.kind === "video" ? "VIDEO" : "IMAGE"}
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
              {preview.kind === "image" ? (
                <img
                  src={preview.src}
                  alt={preview.alt || "NFT"}
                  className="max-h-full max-w-full object-contain"
                  referrerPolicy="no-referrer"
                  draggable={false}
                />
              ) : (
                <video
                  src={preview.src}
                  poster={preview.poster || undefined}
                  controls
                  playsInline
                  preload="metadata"
                  className="max-h-full max-w-full object-contain"
                  autoPlay
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}