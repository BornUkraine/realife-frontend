"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type FitMode = "contain" | "cover";

export default function NftMedia({
  src,
  kind,
  alt,
  poster,
  className = "",
  roundedClass = "rounded-[26px]",
  showControls = true,
  fit = "contain",
  enableExpand = true,
}: {
  src: string | null;
  kind: "image" | "video";
  alt?: string;
  poster?: string | null;
  className?: string;
  roundedClass?: string;
  showControls?: boolean;
  fit?: FitMode;
  enableExpand?: boolean;
}) {
  const vref = useRef<HTMLVideoElement | null>(null);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);

  const mediaFitClass = useMemo(
    () => (fit === "cover" ? "object-cover" : "object-contain"),
    [fit]
  );

  useEffect(() => {
    const v = vref.current;
    if (!v) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);

    setPlaying(!v.paused);

    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
    };
  }, [src]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!src) {
    return (
      <div
        className={[
          "h-full w-full flex items-center justify-center",
          roundedClass,
          "bg-black/30 border border-white/10",
          className,
        ].join(" ")}
      >
        <div className="text-white/25 font-black">No media</div>
      </div>
    );
  }

  const openModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!enableExpand) return;
    setOpen(true);
  };

  const closeModal = () => {
    const mv = modalVideoRef.current;
    if (mv) mv.pause();
    setOpen(false);
  };

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const v = vref.current;
    if (!v) return;

    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  return (
    <>
      <div
        className={[
          "relative h-full w-full overflow-hidden bg-black",
          roundedClass,
          className,
        ].join(" ")}
      >
        {kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt || "NFT"}
            className={["h-full w-full bg-black", mediaFitClass].join(" ")}
            referrerPolicy="no-referrer"
            draggable={false}
          />
        ) : (
          <>
            <video
              ref={vref}
              src={src}
              poster={poster || undefined}
              playsInline
              preload="metadata"
              controls={showControls}
              className={["absolute inset-0 h-full w-full bg-black", mediaFitClass].join(
                " "
              )}
              onClick={toggle}
            />

            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? "Pause" : "Play"}
              className={[
                "absolute inset-0 flex items-center justify-center transition",
                playing ? "opacity-0 pointer-events-none" : "opacity-100",
              ].join(" ")}
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

            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.45)_0%,transparent_45%)]" />
          </>
        )}

        {enableExpand ? (
          <button
            type="button"
            onClick={openModal}
            aria-label="Open fullscreen"
            className={[
              "absolute right-3 top-3 z-20 inline-flex items-center justify-center",
              "h-10 w-10 rounded-xl",
              "border border-white/15 bg-black/45 text-white/90 backdrop-blur-md",
              "shadow-[0_10px_35px_rgba(0,0,0,0.35)] transition",
              "hover:scale-[1.04] hover:bg-black/60",
              "active:scale-[0.98]",
            ].join(" ")}
          >
            <span className="text-lg leading-none">⤢</span>
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm"
          onClick={closeModal}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              closeModal();
            }}
            aria-label="Close"
            className={[
              "absolute right-4 top-4 z-[10000] inline-flex items-center justify-center",
              "h-11 w-11 rounded-xl",
              "border border-white/15 bg-black/50 text-white backdrop-blur-md",
              "shadow-[0_10px_35px_rgba(0,0,0,0.35)] transition",
              "hover:scale-[1.04] hover:bg-black/70",
            ].join(" ")}
          >
            <span className="text-xl leading-none">✕</span>
          </button>

          <div
            className="flex h-full w-full items-center justify-center p-4 sm:p-6 md:p-10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="relative flex h-full w-full items-center justify-center">
              {kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={alt || "NFT"}
                  className="max-h-full max-w-full object-contain"
                  referrerPolicy="no-referrer"
                  draggable={false}
                />
              ) : (
                <video
                  ref={modalVideoRef}
                  src={src}
                  poster={poster || undefined}
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