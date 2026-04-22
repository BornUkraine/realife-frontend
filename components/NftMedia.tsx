"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type MouseEvent } from "react";

/**
 * NFT media renderer.
 *
 * Goals of this version:
 *  - softer perceived loading for images
 *  - cleaner poster -> video handoff
 *  - lighter overlay / play affordance
 *  - keep the same public API so existing pages do not break
 */

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

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
  if (h.endsWith(".mypinata.cloud")) return true;
  return false;
}

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

function Placeholder({ visible }: { visible: boolean }) {
  return (
    <div
      className={cx(
        "pointer-events-none absolute inset-0 transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]" />
      <div className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.05)_35%,transparent_70%)]" />
    </div>
  );
}

function PlayBadge({ subtle = false }: { subtle?: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 text-xl font-black",
        subtle
          ? "bg-black/32 text-amber-100/95 shadow-[0_12px_40px_rgba(0,0,0,0.32)]"
          : "bg-black/42 text-amber-100 shadow-[0_18px_70px_rgba(0,0,0,0.45)] ring-1 ring-black/20",
        "backdrop-blur-md"
      )}
    >
      ▶
    </span>
  );
}

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
  const [imageLoaded, setImageLoaded] = useState(priority && kind === "image");

  useEffect(() => {
    setImageLoaded(priority && kind === "image");
  }, [kind, priority, src]);

  if (!src) {
    return (
      <div
        className={cx(
          "flex h-full w-full items-center justify-center border border-white/10",
          roundedClass,
          mediaBgClass,
          className
        )}
      >
        <div className="text-white/25 font-black">No media</div>
      </div>
    );
  }

  if (kind === "image") {
    const useOptimized = isOptimizable(src);

    return (
      <div
        className={cx(
          "relative flex h-full w-full items-center justify-center overflow-hidden",
          mediaBgClass,
          roundedClass,
          className
        )}
      >
        <Placeholder visible={!imageLoaded} />

        {useOptimized ? (
          <Image
            src={src}
            alt={alt || "NFT"}
            fill
            sizes={sizes}
            className={cx(
              "h-full w-full transition duration-500 ease-out",
              objectFit,
              imageLoaded ? "scale-100 opacity-100" : "scale-[1.012] opacity-0"
            )}
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            referrerPolicy="no-referrer"
            draggable={false}
            unoptimized={false}
            onLoad={() => setImageLoaded(true)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt || "NFT"}
            className={cx(
              "h-full w-full transition duration-500 ease-out",
              objectFit,
              imageLoaded ? "scale-100 opacity-100" : "scale-[1.012] opacity-0"
            )}
            referrerPolicy="no-referrer"
            draggable={false}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            onLoad={() => setImageLoaded(true)}
          />
        )}

        <div
          className={cx(
            "pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.18)_0%,transparent_38%)] transition-opacity duration-500",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      </div>
    );
  }

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
    />
  );
}

function LazyVideo({
  src,
  poster,
  showControls,
  objectFit,
  roundedClass,
  mediaBgClass,
  className,
  priority,
}: {
  src: string;
  poster?: string | null;
  showControls: boolean;
  objectFit: string;
  roundedClass: string;
  mediaBgClass: string;
  className: string;
  priority: boolean;
}) {
  const { ref: containerRef, inView } = useInViewport<HTMLDivElement>("200px");
  const vref = useRef<HTMLVideoElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [posterLoaded, setPosterLoaded] = useState(false);

  const shouldLoad = priority || inView;

  useEffect(() => {
    setPlaying(false);
    setVideoReady(false);
    setPosterLoaded(false);
  }, [poster, src]);

  useEffect(() => {
    const v = vref.current;
    if (!v || !shouldLoad) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    const onLoaded = () => setVideoReady(true);

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);
    v.addEventListener("loadeddata", onLoaded);
    v.addEventListener("canplay", onLoaded);

    setPlaying(!v.paused);
    if (v.readyState >= 2) setVideoReady(true);

    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("loadeddata", onLoaded);
      v.removeEventListener("canplay", onLoaded);
    };
  }, [shouldLoad]);

  const toggle = (e: MouseEvent<HTMLButtonElement | HTMLVideoElement>) => {
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

  const showPosterLayer = Boolean(poster) && (!shouldLoad || !videoReady);

  return (
    <div
      ref={containerRef}
      className={cx(
        "relative flex h-full w-full items-center justify-center overflow-hidden",
        mediaBgClass,
        roundedClass,
        className
      )}
    >
      <Placeholder visible={!videoReady && !posterLoaded} />

      {showPosterLayer ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster!}
          alt=""
          className={cx(
            "absolute inset-0 h-full w-full transition-opacity duration-300",
            objectFit,
            !shouldLoad || !videoReady ? "opacity-100" : "opacity-0"
          )}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          draggable={false}
          onLoad={() => setPosterLoaded(true)}
        />
      ) : null}

      {shouldLoad ? (
        <video
          ref={vref}
          src={src}
          poster={poster || undefined}
          playsInline
          preload={priority ? "auto" : "metadata"}
          controls={showControls}
          className={cx(
            "relative h-full w-full transition-opacity duration-500",
            objectFit,
            videoReady ? "opacity-100" : "opacity-0"
          )}
          onClick={toggle}
        />
      ) : poster ? null : (
        <div className="h-full w-full" />
      )}

      {shouldLoad ? (
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className={cx(
            "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
            playing ? "pointer-events-none opacity-0" : "opacity-100"
          )}
        >
          <PlayBadge />
        </button>
      ) : (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <PlayBadge subtle />
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.26)_0%,transparent_42%)]" />
    </div>
  );
}
