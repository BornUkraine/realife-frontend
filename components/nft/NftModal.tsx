"use client";

// PATH: components/nft/NftModal.tsx
//
// OpenSea-style overlay used by the intercepting route
// app/app/@modal/(.)nft/[chainId]/[contract]/[tokenId]/page.tsx
//
// It receives the (server-rendered) <NftDetail variant="modal" /> as children
// and shows it as a big card floating over the gallery. Closing it just pops
// the intercepted route off the history stack (router.back()), so the user
// lands back exactly where they were — same as OpenSea / Instagram.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

export default function NftModal({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const closingRef = useRef(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    // let the fade-out play, then drop the intercepted route
    window.setTimeout(() => {
      router.back();
    }, 180);
  }, [router]);

  // Portal target + body scroll lock
  useEffect(() => {
    setMounted(true);
    const r = requestAnimationFrame(() => setVisible(true));

    const { overflow, paddingRight } = document.body.style;
    const scrollbar =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    return () => {
      cancelAnimationFrame(r);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, []);

  // Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto overscroll-contain"
      style={{
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={close}
        className={[
          "fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className={[
          "relative z-[121] my-4 w-full max-w-[1500px] px-3 sm:my-6 sm:px-5",
          "transition-all duration-200",
          visible
            ? "translate-y-0 opacity-100"
            : "translate-y-3 opacity-0",
        ].join(" ")}
      >
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#070606] shadow-[0_40px_120px_rgba(0,0,0,0.7)] ring-1 ring-white/5">
          {/* Close button */}
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 z-[122] flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/70 backdrop-blur-md transition hover:bg-black/70 hover:text-white"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          {/* Server-rendered NFT detail (variant="modal") */}
          <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain sm:max-h-[calc(100dvh-3rem)]">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
