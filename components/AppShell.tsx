"use client";

import React from "react";
import AppSidebar from "@/components/AppSidebar";

const DESKTOP_SCALE = 0.65;

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

          .app-shell-scale {
            width: 100%;
            transform: none;
            transform-origin: top left;
          }

          @media (min-width: 1280px) {
            .app-shell-scale {
              width: ${100 / DESKTOP_SCALE}%;
              transform: scale(${DESKTOP_SCALE});
              transform-origin: top left;
            }
          }
        `,
        }}
      />

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_50%,transparent_20%,#040303_100%)] opacity-90" />

        <div className="animate-orb-1 absolute -top-[30%] -left-[10%] h-[800px] w-[800px] rounded-full bg-[#d4af37] blur-[140px]" />
        <div className="animate-orb-2 absolute -bottom-[20%] -right-[10%] h-[900px] w-[900px] rounded-full bg-[#d4af37] blur-[160px]" />
        <div className="animate-top-glow absolute top-0 h-[400px] w-[600px] rounded-full bg-[#f7e7a7] blur-[120px]" />

        <div className="absolute left-[-180px] top-[90px] h-[1200px] w-[520px] rounded-full bg-[#d4af37] opacity-[0.14] blur-[170px]" />
        <div className="absolute left-[90px] top-[140px] h-[900px] w-[260px] rounded-full bg-[#f7e7a7] opacity-[0.08] blur-[120px]" />

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

      <div className="app-shell-scale">
        <div className="relative z-30 mx-auto w-full max-w-[1720px] px-4 pt-8 pb-8 sm:px-6 lg:px-8 2xl:px-10 md:pt-10 md:pb-10">
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)] xl:gap-8">
            <aside className="min-w-0 lg:self-start">
              <AppSidebar
                title={title}
                subtitle={subtitle}
                topBadge={sidebarTopBadge}
                bottom={sidebarBottom}
              />
            </aside>

            <section className="min-w-0 space-y-6">{children}</section>
          </div>
        </div>
      </div>
    </main>
  );
}