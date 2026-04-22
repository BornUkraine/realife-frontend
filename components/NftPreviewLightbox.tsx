"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
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
  const [mounted, setMounted] = useState(false);
  const [portalMounted, setPortalMounted] = useState(false);
  const [portalVisible, setPortalVisible] = useState(false);

  const closeTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const close = useCallback(() => {
    if (!portalMounted) return;

    setPortalVisible(false);

    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setPortalMounted(false);
    }, 180);
  }, [portalMounted]);

  const open = useCallback(() => {
    if (!src) return;

    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);

    setPortalMounted(true);
    rafRef.current = window.requestAnimationFrame(() => {
      setPortalVisible(true);
    });
  }, [src]);

  useEffect(() => {
    if (!portalMounted) return;

    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;

    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyTouchAction = body.style.touchAction;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.touchAction = "none";
    html.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    window.addEventListener("keydown", onKey);

    return () => {
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      body.style.touchAction = prevBodyTouchAction;
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
  }, [close, portalMounted]);

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
    mounted && portalMounted
      ? createPortal(
          <div
            className={cx(
              "fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md transition-opacity duration-180",
              portalVisible ? "opacity-100" : "opacity-0"
            )}
            onClick={close}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[100000] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.45),transparent)]">
              <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 pb-6 pt-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[11px] font-bold text-white/72 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-md">
                  <span>Fullscreen Preview</span>
                  <span className="text-white/25">•</span>
                  <span className={kind === "video" ? "text-amber-100" : "text-white/78"}>
                    {kind === "video" ? "VIDEO" : "IMAGE"}
                  </span>
                </div>

                <div className="hidden rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[11px] font-semibold text-white/46 backdrop-blur-md sm:block">
                  Press Esc to close
                </div>
              </div>
            </div>

            <button
              type="button"
              aria-label="Close preview"
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                e.stopPropagation();
                close();
              }}
              className={cx(
                "absolute right-4 top-4 z-[100001] inline-flex h-11 w-11 items-center justify-center rounded-2xl",
                "border border-white/15 bg-black/45 text-white/92 backdrop-blur-md",
                "shadow-[0_12px_38px_rgba(0,0,0,0.35)] transition-all duration-200",
                "hover:scale-[1.03] hover:bg-black/60 active:scale-[0.98]"
              )}
            >
              <span className="text-xl leading-none">✕</span>
            </button>

            <div
              className="flex h-full w-full items-center justify-center p-4 sm:p-6 md:p-10"
              onClick={(e: MouseEvent<HTMLDivElement>) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <div
                className={cx(
                  "relative flex h-full w-full items-center justify-center transition-all duration-200",
                  portalVisible
                    ? "translate-y-0 scale-100 opacity-100"
                    : "translate-y-2 scale-[0.985] opacity-0"
                )}
              >
                <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_62%)]" />
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
                  priority
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

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-[linear-gradient(to_top,rgba(0,0,0,0.26),transparent)] opacity-0 transition-opacity duration-200 group-hover/nft-preview:opacity-100 group-focus-within/nft-preview:opacity-100" />

        <button
          type="button"
          aria-label="Open fullscreen preview"
          onClick={(e: MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            e.stopPropagation();
            open();
          }}
          className={cx(
            "absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-2xl",
            "border border-white/15 bg-black/42 text-white/92 backdrop-blur-md",
            "shadow-[0_12px_38px_rgba(0,0,0,0.35)] transition-all duration-200",
            "hover:scale-[1.03] hover:bg-black/58 active:scale-[0.98]",
            "opacity-100 md:opacity-0 md:translate-y-1 md:pointer-events-none",
            "md:group-hover/nft-preview:opacity-100 md:group-hover/nft-preview:translate-y-0 md:group-hover/nft-preview:pointer-events-auto",
            "md:group-focus-within/nft-preview:opacity-100 md:group-focus-within/nft-preview:translate-y-0 md:group-focus-within/nft-preview:pointer-events-auto",
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