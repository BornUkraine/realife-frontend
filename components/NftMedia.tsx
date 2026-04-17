"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * NFT media renderer.
 *
 * Improvements over previous version:
 *  - Uses next/image for images (automatic resize/AVIF/WebP, lazy by default)
 *  - Video: preload="none" until in viewport (saves N HTTP requests on grids)
 *  - Smaller LCP payload
 *
 * Notes:
 *  - `src` must be an http(s) URL (resolve IPFS upstream, before passing here).
 *  - To keep next/image working for arbitrary NFT gateways, add their hosts
 *    to remotePatterns in next.config.js. If a domain isn't whitelisted, we
 *    fall back to unoptimized <img>.
 */

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

// --------- Whitelist for next/image optimization ---------
// Keep in sync with next.config.js remotePatterns.
const OPTIMIZED_HOSTS = new Set<string>([
  "gateway.pinata.cloud",
  "cloudflare-ipfs.com",
  "nftstorage.link",
  "ipfs.io",
  "cf-ipfs.com",
  "w3s.link",
  "dweb.link",
]);

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

function isOptimizable(url: string | null | undefined): boolean {
  const h = hostOf(url);
  if (!h) return false;
  if (OPTIMIZED_HOSTS.has(h)) return true;
  // Allow dedicated pinata subdomains like "xxx.mypinata.cloud"
  if (h.endsWith(".mypinata.cloud")) return true;
  return false;
}

// --------- Hook: intersection observer (for lazy video) ---------
function useInViewport<T extends Element>(rootMargin = "200px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}

// ====================================================================

export default function NftMedia({
  src,
  kind,
  alt,
  poster,
  className = "",
  roundedClass = "rounded-[26px]",
  showControls = true,
  fit = "contain",
  mediaBgClass = "bg-black",
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw",
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
  priority?: boolean;
  sizes?: string;
}) {
  const objectFit = fit === "contain" ? "object-contain" : "object-cover";

  // ---- Empty state ----
  if (!src) {
    return (
      <div
        className={cx(
          "h-full w-full flex items-center justify-center",
          roundedClass,
          "border border-white/10",
          mediaBgClass,
          className
        )}
      >
        <div className="text-white/25 font-black">No media</div>
      </div>
    );
  }

  // ==================================================================
  // IMAGE MODE
  // ==================================================================
  if (kind === "image") {
    const useOptimized = isOptimizable(src);

    return (
      <div
        className={cx(
          "relative h-full w-full flex items-center justify-center overflow-hidden",
          mediaBgClass,
          roundedClass,
          className
        )}
      >
        {useOptimized ? (
          <Image
            src={src}
            alt={alt || "NFT"}
            fill
            sizes={sizes}
            className={cx("h-full w-full", objectFit)}
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            referrerPolicy="no-referrer"
            draggable={false}
            unoptimized={false}
          />
        ) : (
          // Fallback for non-whitelisted hosts
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt || "NFT"}
            className={cx("h-full w-full", objectFit)}
            referrerPolicy="no-referrer"
            draggable={false}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
          />
        )}
      </div>
    );
  }

  // ==================================================================
  // VIDEO MODE (lazy)
  // ==================================================================
  return (
    <LazyVideo
      src={src}
      poster={poster}
      showControls={showControls}
      objectFit={objectFit}
      roundedClass={roundedClass}
      mediaBgClass={mediaBgClass}
      className={className}
      priority={priority}
      sizes={sizes}
    />
  );
}

// --------------------------------------------------------------------

function LazyVideo({
  src,
  poster,
  showControls,
  objectFit,
  roundedClass,
  mediaBgClass,
  className,
  priority,
  sizes,
}: {
  src: string;
  poster?: string | null;
  showControls: boolean;
  objectFit: string;
  roundedClass: string;
  mediaBgClass: string;
  className: string;
  priority: boolean;
  sizes: string;
}) {
  const { ref: containerRef, inView } = useInViewport<HTMLDivElement>("200px");
  const vref = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // Only after in-view do we set the real src (otherwise grid of 24 videos
  // makes 24 preload requests immediately)
  const shouldLoad = priority || inView;

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
  }, [shouldLoad]);

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
    <div
      ref={containerRef}
      className={cx(
        "relative h-full w-full flex items-center justify-center overflow-hidden",
        mediaBgClass,
        roundedClass,
        className
      )}
    >
      {shouldLoad ? (
        <video
          ref={vref}
          src={src}
          poster={poster || undefined}
          playsInline
          preload="metadata"
          controls={showControls}
          className={cx("h-full w-full", objectFit)}
          onClick={toggle}
        />
      ) : poster ? (
        // Show poster as a static image while video is not in viewport
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          className={cx("h-full w-full", objectFit)}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          draggable={false}
        />
      ) : (
        <div className="h-full w-full" />
      )}

      {shouldLoad ? (
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className={cx(
            "absolute inset-0 flex items-center justify-center transition",
            playing ? "opacity-0 pointer-events-none" : "opacity-100"
          )}
        >
          <span
            className={cx(
              "inline-flex items-center justify-center",
              "h-14 w-14 rounded-2xl",
              "border border-white/15 bg-black/35 backdrop-blur-md",
              "shadow-[0_18px_70px_rgba(0,0,0,0.45)]",
              "ring-1 ring-black/20"
            )}
          >
            <span className="text-amber-200 font-black text-xl">▶</span>
          </span>
        </button>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className={cx(
              "inline-flex items-center justify-center",
              "h-14 w-14 rounded-2xl",
              "border border-white/15 bg-black/35 backdrop-blur-md",
              "shadow-[0_18px_70px_rgba(0,0,0,0.45)]"
            )}
          >
            <span className="text-amber-200 font-black text-xl">▶</span>
          </span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.45)_0%,transparent_45%)]" />
    </div>
  );
}
