"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import NftMedia from "@/components/NftMedia";

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

export default function NftPreviewLightbox({
  src,
  kind,
  alt,
  poster,
  className = "",
  roundedClass = "rounded-none",
  showControls = true,
  fit = "contain",
  mediaBgClass = "bg-black",
  buttonClassName = "",
}: {
  src: string | null;
  kind: "image" | "video";
  alt?: string;
  poster?: string | null;
  className?: string;
  roundedClass?: string;
  showControls?: boolean;
  fit?: "contain" | "cover";
  mediaBgClass?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!src) {
    return (
      <div className={cx("group/nft-preview relative h-full w-full", className)}>
        <NftMedia
          src={src}
          kind={kind}
          alt={alt}
          poster={poster}
          className="h-full w-full"
          roundedClass={roundedClass}
          showControls={showControls}
          fit={fit}
          mediaBgClass={mediaBgClass}
        />
      </div>
    );
  }

  const modal =
    mounted && open
      ? createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <button
              type="button"
              aria-label="Close preview"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
              }}
              className={cx(
                "absolute right-4 top-4 z-[100000] inline-flex h-11 w-11 items-center justify-center rounded-xl",
                "border border-white/15 bg-black/50 text-white backdrop-blur-md",
                "shadow-[0_10px_35px_rgba(0,0,0,0.35)] transition hover:scale-[1.04] hover:bg-black/70"
              )}
            >
              <span className="text-xl leading-none">✕</span>
            </button>

            <div className="pointer-events-none absolute inset-x-0 top-0 z-[100000]">
              <div className="mx-auto max-w-6xl px-5 pt-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[11px] font-bold text-white/70 backdrop-blur-md shadow-[0_10px_35px_rgba(0,0,0,0.25)]">
                  <span>Fullscreen Preview</span>
                  <span className="text-white/30">•</span>
                  <span className={kind === "video" ? "text-amber-100" : "text-white/75"}>
                    {kind === "video" ? "VIDEO" : "IMAGE"}
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
                  src={src}
                  kind={kind}
                  alt={alt}
                  poster={poster}
                  className="h-full w-full"
                  roundedClass="rounded-none"
                  showControls={true}
                  fit="contain"
                  mediaBgClass={mediaBgClass}
                />
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className={cx("group/nft-preview relative h-full w-full", className)}>
        <NftMedia
          src={src}
          kind={kind}
          alt={alt}
          poster={poster}
          className="h-full w-full"
          roundedClass={roundedClass}
          showControls={showControls}
          fit={fit}
          mediaBgClass={mediaBgClass}
        />

        <button
          type="button"
          aria-label="Open fullscreen preview"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          className={cx(
            "absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-xl",
            "border border-white/15 bg-black/45 text-white/90 backdrop-blur-md",
            "shadow-[0_10px_35px_rgba(0,0,0,0.35)]",
            "transition-all duration-200 hover:scale-[1.04] hover:bg-black/60 active:scale-[0.98]",
            "opacity-0 translate-y-1 pointer-events-none",
            "group-hover/nft-preview:opacity-100 group-hover/nft-preview:translate-y-0 group-hover/nft-preview:pointer-events-auto",
            "group-focus-within/nft-preview:opacity-100 group-focus-within/nft-preview:translate-y-0 group-focus-within/nft-preview:pointer-events-auto",
            buttonClassName
          )}
        >
          <span className="text-lg leading-none">⤢</span>
        </button>
      </div>

      {modal}
    </>
  );
}