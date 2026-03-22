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
    <main className="relative min-h-screen overflow-x-hidden bg-[#070606] text-white">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes slow-float {
            0%, 100% { transform: translate(0px, 0px) scale(1); opacity: 0.15; }
            50% { transform: translate(-50px, 40px) scale(1.1); opacity: 0.35; }
          }
          @keyframes slow-float-reverse {
            0%, 100% { transform: translate(0px, 0px) scale(1); opacity: 0.10; }
            50% { transform: translate(50px, -40px) scale(1.15); opacity: 0.30; }
          }
          @keyframes slow-pulse-top {
            0%, 100% { opacity: 0.05; transform: scale(1) translateX(-50%); }
            50% { opacity: 0.25; transform: scale(1.1) translateX(-48%); }
          }

          .animate-orb-1 { animation: slow-float 12s ease-in-out infinite; }
          .animate-orb-2 { animation: slow-float-reverse 15s ease-in-out infinite; }
          .animate-top-glow { animation: slow-pulse-top 10s ease-in-out infinite; left: 50%; }
        `,
        }}
      />

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_50%,transparent_20%,#040303_100%)] opacity-90" />

        <div className="animate-orb-1 absolute -left-[10%] -top-[30%] h-[800px] w-[800px] rounded-full bg-[#d4af37] blur-[140px]" />
        <div className="animate-orb-2 absolute -bottom-[20%] -right-[10%] h-[900px] w-[900px] rounded-full bg-[#d4af37] blur-[160px]" />
        <div className="animate-top-glow absolute top-0 h-[400px] w-[600px] rounded-full bg-[#f7e7a7] blur-[120px]" />

        <div
          className="absolute inset-0 z-0 opacity-[0.028]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(212,175,55,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(212,175,55,0.18) 1px, transparent 1px)",
            backgroundSize: "96px 96px",
            maskImage:
              "radial-gradient(ellipse at 50% 42%, black 26%, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at 50% 42%, black 26%, transparent 78%)",
          }}
        />

        <div className="absolute inset-0 z-20 bg-[radial-gradient(circle,rgba(255,255,255,1)_1px,transparent_1px)] opacity-[0.03] mix-blend-screen [background-size:12px_12px]" />
      </div>

      <div className="relative z-30 mx-auto w-full max-w-[1760px] px-4 pb-8 pt-8 sm:px-6 lg:px-8 lg:pb-10 lg:pt-10 2xl:px-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[316px_minmax(0,1fr)] lg:gap-7 xl:grid-cols-[332px_minmax(0,1fr)] xl:gap-8 2xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="min-w-0">
            <AppSidebar
              title={title}
              subtitle={subtitle}
              topBadge={sidebarTopBadge}
              bottom={sidebarBottom}
            />
          </aside>

          <section className="min-w-0 space-y-6 xl:space-y-7">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}