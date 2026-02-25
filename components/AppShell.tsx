"use client";

import React from "react";
import AppSidebar from "@/components/AppSidebar";

export default function AppShell({
  title,
  subtitle,
  sidebarTopBadge,
  sidebarBottom,
  children,
}: {
  title: string;
  subtitle?: string;
  sidebarTopBadge?: React.ReactNode;
  sidebarBottom?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#070606] text-white overflow-x-hidden">
      {/* VIP premium background */}
      <div className="pointer-events-none fixed inset-0">
        {/* deep vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_0%,rgba(0,0,0,0.55)_70%,rgba(0,0,0,0.85)_100%)]" />

        {/* gold spotlights */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.14),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(212,175,55,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_12%,rgba(212,175,55,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(255,255,255,0.05),transparent_60%)]" />

        {/* gold orbs */}
        <div className="absolute -top-72 -left-72 h-[920px] w-[920px] rounded-full bg-[#d4af37]/16 blur-3xl" />
        <div className="absolute -bottom-80 -right-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/10 blur-3xl" />
        <div className="absolute top-1/3 -right-72 h-[760px] w-[760px] rounded-full bg-white/[0.04] blur-3xl" />

        {/* premium grid (slightly finer) */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,.20) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.20) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />

        {/* micro-noise */}
        <div className="absolute inset-0 opacity-[0.045] bg-[radial-gradient(circle,rgba(255,255,255,.16)_1px,transparent_1px)] [background-size:18px_18px]" />

        {/* top shade to support TopBar */}
        <div className="absolute inset-x-0 top-0 h-56 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.70),transparent)]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 md:px-10 pt-10 pb-10 md:pt-14 md:pb-14 grid grid-cols-12 gap-10">
        <aside className="col-span-12 lg:col-span-3">
          <AppSidebar
            title={title}
            subtitle={subtitle}
            topBadge={sidebarTopBadge}
            bottom={sidebarBottom}
          />
        </aside>

        <section className="col-span-12 lg:col-span-9 space-y-6">
          {children}
        </section>
      </div>
    </main>
  );
}