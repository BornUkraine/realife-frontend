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
    <main className="min-h-screen bg-[#070606] text-white overflow-x-hidden relative">
      
      {/* 🔥 ПЛАВНЫЕ АНИМАЦИИ ДЛЯ ПРЕМИУМ-ФОНА */}
      <style>{`
        @keyframes slow-float {
          0%, 100% { transform: translate(0px, 0px) scale(1); opacity: 0.15; }
          50% { transform: translate(-30px, 20px) scale(1.05); opacity: 0.25; }
        }
        @keyframes slow-float-reverse {
          0%, 100% { transform: translate(0px, 0px) scale(1); opacity: 0.10; }
          50% { transform: translate(30px, -20px) scale(1.1); opacity: 0.20; }
        }
        @keyframes slow-pulse-top {
          0%, 100% { opacity: 0.05; }
          50% { opacity: 0.15; }
        }
        .animate-orb-1 { animation: slow-float 15s ease-in-out infinite; }
        .animate-orb-2 { animation: slow-float-reverse 18s ease-in-out infinite; }
        .animate-top-glow { animation: slow-pulse-top 10s ease-in-out infinite; }
      `}</style>

      {/* VIP Premium Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        
        {/* 1. Deep Core Vignette - Создает глубокий черный цвет по краям */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_20%,#040303_100%)] z-10 opacity-90" />

        {/* 2. Luxury Ambient Gold Orbs - Огромные, сверхразмытые пятна (ТЕПЕРЬ ЖИВЫЕ!) */}
        {/* Верхний левый угол */}
        <div className="animate-orb-1 absolute -top-[30%] -left-[10%] h-[800px] w-[800px] rounded-full bg-[#d4af37] blur-[140px]" />
        {/* Нижний правый угол */}
        <div className="animate-orb-2 absolute -bottom-[20%] -right-[10%] h-[900px] w-[900px] rounded-full bg-[#d4af37] blur-[160px]" />
        {/* Мягкий центральный верхний подсвет для TopBar */}
        <div className="animate-top-glow absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-[#f7e7a7] blur-[120px]" />

        {/* 3. Premium Fading Grid - Сетка, которая плавно исчезает к краям */}
        <div
          className="absolute inset-0 opacity-[0.06] z-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            // Маска заставляет сетку исчезать по краям экрана
            maskImage: "radial-gradient(ellipse at 50% 40%, black 20%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 20%, transparent 70%)",
          }}
        />

        {/* 4. Micro-noise - Добавляет текстуру дорогих материалов */}
        <div className="absolute inset-0 opacity-[0.03] z-20 mix-blend-screen bg-[radial-gradient(circle,rgba(255,255,255,1)_1px,transparent_1px)] [background-size:12px_12px]" />

      </div>

      {/* Content Layout */}
      <div className="relative z-30 max-w-7xl mx-auto px-6 md:px-10 pt-10 pb-10 md:pt-14 md:pb-14 grid grid-cols-12 gap-10">
        
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