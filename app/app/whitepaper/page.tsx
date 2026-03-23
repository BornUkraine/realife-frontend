"use client";

import React, { useEffect, useMemo, useState } from "react";
import Reveal from "@/components/Reveal";

/* ---------------- UI (твой стиль) ---------------- */

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function GoldEdgeCard({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "relative rounded-[40px] p-px overflow-hidden",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.40),rgba(212,175,55,0.18),rgba(184,135,10,0.12))]",
        "shadow-[0_34px_140px_rgba(0,0,0,0.60)]",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "relative rounded-[40px] overflow-hidden",
          "border border-white/10",
          "bg-[#0b0a09]/50 backdrop-blur-2xl",
        ].join(" ")}
      >
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

function LuxPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/70">
      {children}
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-16 scroll-mt-32">
      <h2 className="text-2xl md:text-3xl font-black text-white">
        {title}
      </h2>

      <div className="mt-4 space-y-4 text-sm md:text-base text-white/65 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

/* ---------------- PAGE ---------------- */

export default function WhitepaperPage() {
  const [active, setActive] = useState("");

  const nav = useMemo(
    () => [
      { id: "abstract", label: "Abstract" },
      { id: "vision", label: "Vision" },
      { id: "problem", label: "Problem" },
      { id: "solution", label: "Solution" },
      { id: "economy", label: "Economy" },
      { id: "offline", label: "Offline" },
      { id: "roadmap", label: "Roadmap" },
      { id: "conclusion", label: "Conclusion" },
    ],
    []
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );

    nav.forEach((n) => {
      const el = document.getElementById(n.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [nav]);

  return (
    <div className="space-y-6">
      {/* HERO */}
      <Reveal>
        <GoldEdgeCard>
          <div className="p-8 md:p-12">
            <LuxPill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Realife Whitepaper
            </LuxPill>

            <h1 className="mt-6 text-4xl md:text-6xl font-black leading-[1.05]">
              NFTs backed by{" "}
              <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]">
                real life
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-white/65">
              Realife connects Web3 with real-world products, experiences and
              businesses — transforming NFTs into real value.
            </p>
          </div>
        </GoldEdgeCard>
      </Reveal>

      {/* MAIN */}
      <Reveal delayMs={120}>
        <GoldEdgeCard>
          <div className="flex gap-10 p-8 md:p-10">
            {/* SIDEBAR */}
            <aside className="hidden lg:block w-[220px] shrink-0">
              <div className="sticky top-28 space-y-2">
                {nav.map((n) => (
                  <a
                    key={n.id}
                    href={`#${n.id}`}
                    className={cx(
                      "block text-sm transition",
                      active === n.id
                        ? "text-white font-extrabold"
                        : "text-white/40 hover:text-white"
                    )}
                  >
                    {n.label}
                  </a>
                ))}
              </div>
            </aside>

            {/* CONTENT */}
            <div className="max-w-3xl">

              <Section id="abstract" title="Abstract">
                <p>
                  Realife connects Web3 with real business, creativity and
                  real-world value.
                </p>
                <p className="font-extrabold text-white/90">
                  NFTs are no longer abstract — they are tied to real products
                  and real experiences.
                </p>
              </Section>

              <Section id="vision" title="Vision">
                <p>
                  The bridge between everyday life and the digital future.
                </p>
              </Section>

              <Section id="problem" title="Problem">
                <ul className="list-disc pl-6 space-y-2">
                  <li>Speculation without real value</li>
                  <li>No connection to real products</li>
                </ul>
              </Section>

              <Section id="solution" title="Solution">
                <ul className="list-disc pl-6 space-y-2">
                  <li>Real-world NFT utility</li>
                  <li>Real-to-earn economy</li>
                </ul>
              </Section>

              <Section id="economy" title="Economy">
                <p>
                  Fees, reward pools and real-world revenue streams.
                </p>
              </Section>

              <Section id="offline" title="Offline Expansion">
                <ul className="list-disc pl-6 space-y-2">
                  <li>Crypto cafes</li>
                  <li>Products</li>
                  <li>Events</li>
                </ul>
              </Section>

              <Section id="roadmap" title="Roadmap">
                <p>
                  Expansion from MVP → real-world integration → global ecosystem.
                </p>
              </Section>

              <Section id="conclusion" title="Conclusion">
                <p className="font-extrabold text-white/90">
                  Realife connects blockchain with real life.
                </p>
              </Section>

            </div>
          </div>
        </GoldEdgeCard>
      </Reveal>
    </div>
  );
}