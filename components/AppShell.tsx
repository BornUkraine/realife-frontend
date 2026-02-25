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
    <main className="relative min-h-screen bg-[#070606] text-white overflow-hidden">
      {/* premium background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-56 -left-56 h-190 w-190 rounded-full bg-[#d4af37]/18 blur-3xl" />
        <div className="absolute -bottom-56 -right-56 h-190 w-190 rounded-full bg-[#d4af37]/12 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(212,175,55,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_92%,rgba(255,255,255,0.05),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.25) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 md:px-10 py-10 md:py-14 grid grid-cols-12 gap-10">
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