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
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.40),rgba(212,175,55,0.18),rgba(184,135,10,0.12))]",
        "shadow-[0_34px_140px_rgba(0,0,0,0.60)]",
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
          "before:bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.12),transparent_45%)]",
          "after:pointer-events-none after:absolute after:inset-0",
          "after:bg-[radial-gradient(circle_at_85%_115%,rgba(255,255,255,0.06),transparent_55%)]",
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
    "group block w-full rounded-2xl px-4 py-2.5 text-sm font-semibold transition duration-200";

  const activeCls = [
    "text-black",
    "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
    "shadow-[0_18px_56px_rgba(212,175,55,0.16)]",
    "ring-1 ring-black/15",
  ].join(" ");

  const idleCls = [
    "text-white/85 hover:text-white",
    "border border-white/10 bg-white/[0.04] hover:bg-white/[0.07]",
    "shadow-[0_14px_44px_rgba(0,0,0,0.32)]",
    "hover:-translate-y-[1px] active:translate-y-0",
  ].join(" ");

  const disabledCls =
    "opacity-45 cursor-not-allowed select-none border border-white/10 bg-white/[0.03]";

  if (!enabled) {
    return (
      <div className={`${base} ${disabledCls}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="truncate">{label}</span>
          <span className="text-[11px] px-2 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white/70">
            {badge || "Soon"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`${base} ${active ? activeCls : idleCls}`}
      aria-current={active ? "page" : undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="truncate">{label}</span>
        {active ? (
          <span className="text-[11px] px-2 py-1 rounded-full bg-black/10 border border-black/10">
            Active
          </span>
        ) : (
          <span className="opacity-0 group-hover:opacity-100 text-[11px] text-white/60 transition">
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
        <div className="p-5 xl:p-6">
          <Link href="/app" className="flex items-center mb-8 relative overflow-visible">
            <div className="z-10 shrink-0 relative w-16 h-16 flex items-center justify-center -ml-2">
              <img
                src="/brand/logo-mark.png"
                alt="Realife"
                className="w-full h-full object-contain mix-blend-screen scale-[4.5]"
                draggable={false}
              />
            </div>

            <div className="relative flex-1 h-12 overflow-visible z-0">
              <img
                src="/brand/logo-wordmark.png"
                alt="Realife"
                className="absolute top-1/2 left-[-72px] -translate-y-1/2 w-[300px] max-w-none object-contain object-left mix-blend-screen"
                draggable={false}
              />
            </div>
          </Link>

          {(title || subtitle) && (
            <div className="mb-5">
              {title ? (
                <div className="text-[11px] uppercase tracking-[0.24em] text-white/38 font-black">
                  {title}
                </div>
              ) : null}
              {subtitle ? (
                <div className="mt-2 text-[12px] text-white/52 leading-relaxed">
                  {subtitle}
                </div>
              ) : null}
            </div>
          )}

          {topBadge ? (
            <div className="mb-4 rounded-3xl bg-white/5 border border-white/10 p-4">
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

          {bottom ? <div className="mt-6">{bottom}</div> : null}
        </div>
      </GoldEdgeCard>
    </div>
  );
}