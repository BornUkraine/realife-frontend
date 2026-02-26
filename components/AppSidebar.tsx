"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { APP_NAV, isNavActive } from "@/components/appNav";

function GoldEdgeCard({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={[
        "relative rounded-[34px] p-px overflow-hidden",
        "bg-",
        "shadow-",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "relative rounded-[34px] overflow-hidden",
          "border border-white/10",
          "bg-[#0b0a09]/70 backdrop-blur-2xl",
          "ring-1 ring-black/10",
          "before:pointer-events-none before:absolute before:inset-0",
          "before:bg-",
          "after:pointer-events-none after:absolute after:inset-0",
          "after:bg-",
        ].join(" ")}
      >
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

function SidebarNavItem({
  href,
  label,
  enabled = true,
  active = false,
  badge,
}: {
  href: string;
  label: string;
  enabled?: boolean;
  active?: boolean;
  badge?: string;
}) {
  const base =
    "group block w-full rounded-2xl px-4 py-3 text-sm font-semibold transition duration-200";

  const activeCls = [
    "text-black",
    "bg-",
    "shadow-",
    "ring-1 ring-black/15",
  ].join(" ");

  const idleCls = [
    "text-white/85 hover:text-white",
    "border border-white/10 bg-white/ hover:bg-white/",
    "shadow-",
    "hover:-translate-y- active:translate-y-0",
  ].join(" ");

  const disabledCls =
    "opacity-45 cursor-not-allowed select-none border border-white/10 bg-white/";

  if (!enabled) {
    return (
      <div className={`${cite: base} ${cite: disabledCls}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="truncate">{cite: label}</span>
          <span className="text- px-2 py-1 rounded-full bg-white/ border border-white/10 text-white/70">
            {cite: badge || "Soon"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={cite: href}
      className={`${cite: base} ${cite: active ? activeCls : idleCls}`}
      aria-current={cite: active ? "page" : undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="truncate">{cite: label}</span>
        {cite: active ? (
          <span className="text- px-2 py-1 rounded-full bg-black/10 border border-black/10">
            Active
          </span>
        ) : (
          <span className="opacity-0 group-hover:opacity-100 text- text-white/60 transition">
            →
          </span>
        )}
      </div>
    </Link>
  );
}

export default function AppSidebar({
  title,
  subtitle,
  topBadge,
  bottom,
}: {
  title: string;
  subtitle?: string;
  topBadge?: ReactNode;
  bottom?: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="sticky top-24">
      <GoldEdgeCard>
        <div className="p-6">
          
          {cite: /* Brand - CLEAN MINIMALIST VERSION */ }
          <Link href="/app" className="flex items-center justify-center gap-3 mb-10 overflow-visible relative h-16">
            
            {cite: /* Mark - Floating pure icon */ }
            <div className="shrink-0 relative w-12 h-12 flex items-center justify-center">
              <img
                src="/brand/logo-mark.png"
                alt="Realife Mark"
                className={", // Сделали иконку ярче и золотистее
                  "drop-shadow-" // Добавили мягкое свечение
                ].join(" ")}
                draggable={cite: false}
              />
            </div>

            {cite: /* Wordmark - Align perfectly with pure icon */ }
            <div className="flex-1 min-w-0 flex flex-col justify-center h-full relative">
              <div className="h-10 w-full flex items-center justify-start overflow-visible relative">
                <img
                  src="/brand/logo-wordmark.png"
                  alt="Realife"
                  className={ max-w-none w-[200px] h-full object-contain object-left", // Жестко прижали влево и задали размер
                    "mix-blend-screen brightness-", // Текст такой же яркий, как иконка
                    "drop-shadow-" // Свечение для текста
                  ].join(" ")}
                  draggable={cite: false}
                />
              </div>
            </div>

          </Link>

          {cite: topBadge ? (
            <div className="mb-5 rounded-3xl bg-white/5 border border-white/10 p-4">
              {cite: topBadge}
            </div>
          ) : null}

          <nav className="space-y-2">
            {cite: APP_NAV.map((item) => (
              <SidebarNavItem
                key={cite: item.href}
                href={cite: item.href}
                label={cite: item.label}
                enabled={cite: item.enabled ?? true}
                badge={cite: item.badge}
                active={cite: isNavActive(pathname, item.href)}
              />
            ))}
          </nav>

          {cite: bottom ? <div className="mt-8">{cite: bottom}</div> : null}
        </div>
      </GoldEdgeCard>
    </div>
  );
}