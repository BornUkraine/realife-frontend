"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { APP_NAV, isNavActive } from "@/components/appNav";
import { cn } from "@/lib/utils";

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
    "block w-full rounded-2xl px-4 py-3 text-sm font-semibold transition";

  if (!enabled) {
    return (
      <div
        className={cn(
          base,
          "opacity-45 cursor-not-allowed select-none",
          "hover:bg-transparent hover:text-white/70"
        )}
      >
        <div className="flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[11px] opacity-70">{badge || "Soon"}</span>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        base,
        active
          ? "bg-[#d4af37] text-black shadow-[0_18px_60px_rgba(212,175,55,0.22)]"
          : "text-white/80 hover:bg-white/10 hover:text-white"
      )}
      aria-current={active ? "page" : undefined}
    >
      {label}
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
  topBadge?: React.ReactNode;
  bottom?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="sticky top-8 rounded-[34px] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.55)] overflow-hidden">
      <div className="pointer-events-none absolute -top-28 -right-28 w-80 h-80 bg-[#d4af37]/14 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-24 w-80 h-80 bg-white/7 rounded-full blur-3xl" />

      <div className="relative p-6">
        <Link href="/app" className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl border border-white/10 bg-white/5 shadow-md flex items-center justify-center">
            <div className="w-10 h-10 rounded-2xl border-2 border-[#d4af37]/80 flex items-center justify-center font-extrabold">
              R
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-lg font-extrabold tracking-wide">{title}</p>
            <p className="text-xs text-white/60">
              {subtitle || "Premium creator app"}
            </p>
          </div>
        </Link>

        {topBadge ? (
          <div className="mb-5 rounded-3xl bg-white/5 border border-white/10 p-4">
            {topBadge}
          </div>
        ) : null}

        <nav className="space-y-2">
          {APP_NAV.map((item) => (
            <SidebarNavItem
              key={item.href}
              href={item.href}
              label={item.label}
              enabled={item.enabled ?? true}
              badge={item.badge}
              active={isNavActive(pathname, item.href)}
            />
          ))}
        </nav>

        {bottom ? <div className="mt-8">{bottom}</div> : null}
      </div>
    </div>
  );
}
