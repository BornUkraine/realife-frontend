"use client";

import { useEffect, useRef, useState } from "react";

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
}) {
  const vref = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);

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

  const objectFit = fit === "contain" ? "object-contain" : "object-cover";

  if (!src) {
    return (
      <div
        className={[
          "h-full w-full flex items-center justify-center",
          roundedClass,
          "border border-white/10",
          mediaBgClass,
          className,
        ].join(" ")}
      >
        <div className="text-white/25 font-black">No media</div>
      </div>
    );
  }

  if (kind === "image") {
    return (
      <div
        className={[
          "relative h-full w-full flex items-center justify-center overflow-hidden",
          mediaBgClass,
          roundedClass,
          className,
        ].join(" ")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || "NFT"}
          className={["h-full w-full", objectFit].join(" ")}
          referrerPolicy="no-referrer"
          draggable={false}
        />
      </div>
    );
  }

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
      className={[
        "relative h-full w-full flex items-center justify-center overflow-hidden",
        mediaBgClass,
        roundedClass,
        className,
      ].join(" ")}
    >
      <video
        ref={vref}
        src={src}
        poster={poster || undefined}
        playsInline
        preload="metadata"
        controls={showControls}
        className={["h-full w-full", objectFit].join(" ")}
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
    </div>
  );
}