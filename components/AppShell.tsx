"use client";

import React from "react";
import AppSidebar from "@/components/AppSidebar";
import MobileBottomNav from "@/components/MobileBottomNav";

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
    <main className="relative min-h-screen bg-[#070605] text-white overflow-x-hidden">

      {/* ── Ambient background — классы анимаций из globals.css ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        {/* Виньетка */}
        <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_50%,transparent_20%,#040303_100%)] opacity-90" />

        {/* Анимированные орбы */}
        <div className="animate-orb-1 absolute -left-[10%] -top-[20%] h-[800px] w-[800px] rounded-full bg-[#C9A84C] blur-[140px]" />
        <div className="animate-orb-2 absolute -bottom-[20%] -right-[10%] h-[900px] w-[900px] rounded-full bg-[#C9A84C] blur-[160px]" />
        <div className="animate-top-glow absolute top-0 h-[420px] w-[620px] rounded-full bg-[#f7e7a7] blur-[120px]" />

        {/* Сетка */}
        <div
          className="absolute inset-0 z-0 opacity-[0.022]"
          style={{
            backgroundImage:
              "linear-gradient(to right,rgba(201,168,76,.3) 1px,transparent 1px)," +
              "linear-gradient(to bottom,rgba(201,168,76,.25) 1px,transparent 1px)",
            backgroundSize: "96px 96px",
            maskImage: "radial-gradient(ellipse at 50% 30%,black 20%,transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 30%,black 20%,transparent 70%)",
          }}
        />
      </div>

      {/* ── Layout ────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto w-full max-w-[1480px] px-3 pt-4 pb-8 sm:px-5 md:pt-6 md:pb-10 lg:px-6 2xl:px-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-6 xl:grid-cols-[210px_minmax(0,1fr)] xl:gap-7">

          <aside className="hidden min-w-0 lg:block">
            <AppSidebar
              title={title}
              subtitle={subtitle}
              topBadge={sidebarTopBadge}
              bottom={sidebarBottom}
            />
          </aside>

          <section className="min-w-0 space-y-4 md:space-y-5">
            {children}
          </section>

        </div>
      </div>

      <MobileBottomNav />
    </main>
  );
}