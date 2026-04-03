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
      <div className="relative z-10 mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10 pt-8 pb-12">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[320px_minmax(0,1fr)] xl:gap-10">

          <aside className="min-w-0">
            <AppSidebar
              title={title}
              subtitle={subtitle}
              topBadge={sidebarTopBadge}
              bottom={sidebarBottom}
            />
          </aside>

          <section className="min-w-0 space-y-6">
            {children}
          </section>

        </div>
      </div>
    </main>
  );
}