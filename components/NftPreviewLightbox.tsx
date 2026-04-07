"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!src) {
    return (
      <div className={cx("relative h-full w-full", className)}>
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

  return (
    <>
      <div className={cx("relative h-full w-full", className)}>
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
            "absolute top-4 right-4 z-20 inline-flex items-center justify-center",
            "h-11 w-11 rounded-xl",
            "border border-white/15 bg-black/45 text-white/90 backdrop-blur-md",
            "shadow-[0_10px_35px_rgba(0,0,0,0.35)] transition",
            "hover:scale-[1.04] hover:bg-black/60 active:scale-[0.98]",
            buttonClassName
          )}
        >
          <span className="text-lg leading-none">⤢</span>
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm"
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
              "absolute top-4 right-4 z-[10000] inline-flex items-center justify-center",
              "h-11 w-11 rounded-xl",
              "border border-white/15 bg-black/50 text-white backdrop-blur-md",
              "shadow-[0_10px_35px_rgba(0,0,0,0.35)] transition",
              "hover:scale-[1.04] hover:bg-black/70"
            )}
          >
            <span className="text-xl leading-none">✕</span>
          </button>

          <div
            className="absolute inset-x-0 top-0 z-[10000] pointer-events-none"
          >
            <div className="mx-auto max-w-6xl px-5 pt-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[11px] font-bold text-white/70 backdrop-blur-md shadow-[0_10px_35px_rgba(0,0,0,0.25)]">
                <span>Fullscreen Preview</span>
                {kind === "video" ? (
                  <>
                    <span className="text-white/30">•</span>
                    <span className="text-amber-100">VIDEO</span>
                  </>
                ) : (
                  <>
                    <span className="text-white/30">•</span>
                    <span className="text-white/75">IMAGE</span>
                  </>
                )}
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
            <div className="relative h-full w-full flex items-center justify-center">
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
        </div>
      ) : null}
    </>
  );
}