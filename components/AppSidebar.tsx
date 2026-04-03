"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { APP_NAV, isNavActive } from "@/components/appNav";

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

// ─── GoldEdgeCard ─────────────────────────────────────────────────────────────
// Thin gradient border that reads as a premium physical edge.
function GoldEdgeCard({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "relative rounded-[28px] p-px overflow-hidden",
        "bg-[linear-gradient(145deg,rgba(247,231,167,0.38),rgba(201,168,76,0.16),rgba(184,135,10,0.10))]",
        "shadow-[0_28px_120px_rgba(0,0,0,0.55)]",
        className,
      )}
    >
      <div
        className={cx(
          "relative rounded-[28px] overflow-hidden",
          "border border-white/[0.07]",
          "bg-[#0a0806]/72 backdrop-blur-2xl",
          // Radial inner highlights — top-left warm, bottom-right cool
          "before:pointer-events-none before:absolute before:inset-0",
          "before:bg-[radial-gradient(circle_at_15%_0%,rgba(201,168,76,0.10),transparent_42%)]",
          "after:pointer-events-none after:absolute after:inset-0",
          "after:bg-[radial-gradient(circle_at_88%_110%,rgba(255,255,255,0.05),transparent_50%)]",
        )}
      >
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

// ─── SidebarNavItem ───────────────────────────────────────────────────────────
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
  const base = cx(
    "group relative flex w-full items-center justify-between gap-3",
    "rounded-xl px-4 py-2.5 text-sm font-medium",
    "transition-all duration-200",
  );

  // ── Active: gold left-rule + subtle warm surface
  // Using inline style for border-left to avoid Tailwind conflicts with border shorthand.
  const activeStyle = {
    borderLeft: "2px solid #C9A84C",
    paddingLeft: "14px", // compensate 2px border so text doesn't shift
  };

  const activeCls = cx(
    "text-[#F0E4BF]",
    "border border-[rgba(201,168,76,0.22)]",
    "bg-[rgba(201,168,76,0.08)]",
  );

  const idleCls = cx(
    "text-white/60 hover:text-white/90",
    "border border-transparent hover:border-white/[0.07]",
    "hover:bg-white/[0.04]",
    "hover:-translate-y-px active:translate-y-0",
  );

  const disabledCls = cx(
    "cursor-not-allowed select-none opacity-40",
    "border border-transparent text-white/40",
  );

  const content = (
    <>
      <span className="truncate">{label}</span>

      {!enabled ? (
        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-white/50">
          {badge ?? "Soon"}
        </span>
      ) : active ? (
        <span className="shrink-0 rounded-full border border-[rgba(201,168,76,0.25)] bg-[rgba(201,168,76,0.12)] px-2 py-0.5 text-[10px] font-medium text-[#C9A84C]">
          Active
        </span>
      ) : (
        <span className="shrink-0 text-[11px] text-white/40 opacity-0 transition-opacity group-hover:opacity-100">
          →
        </span>
      )}
    </>
  );

  if (!enabled) {
    return <div className={cx(base, disabledCls)}>{content}</div>;
  }

  return (
    <Link
      href={href}
      style={active ? activeStyle : undefined}
      className={cx(base, active ? activeCls : idleCls)}
      aria-current={active ? "page" : undefined}
    >
      {content}
    </Link>
  );
}

// ─── AppSidebar ───────────────────────────────────────────────────────────────
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

          {/* ── Logo ──────────────────────────────────────────────── */}
          <Link
            href="/app"
            className="mb-7 flex items-center relative overflow-visible"
          >
            {/* Logo mark */}
            <div className="z-10 shrink-0 relative w-14 h-14 flex items-center justify-center -ml-1.5">
              <img
                src="/brand/logo-mark.png"
                alt="Realife"
                className="w-full h-full object-contain mix-blend-screen scale-[4.2]"
                draggable={false}
              />
            </div>
            {/* Wordmark — absolute-positioned so it can overflow */}
            <div className="relative flex-1 h-11 overflow-visible z-0">
              <img
                src="/brand/logo-wordmark.png"
                alt="Realife"
                className="absolute top-1/2 left-[-64px] -translate-y-1/2 w-[280px] max-w-none object-contain object-left mix-blend-screen"
                draggable={false}
              />
            </div>
          </Link>

          {/* ── Section label ─────────────────────────────────────── */}
          {(title || subtitle) && (
            <div className="mb-4 border-b border-white/[0.06] pb-4">
              {title && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
                  {title}
                </p>
              )}
              {subtitle && (
                <p className="mt-1.5 text-[12px] leading-relaxed text-white/48">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {/* ── Top badge slot ─────────────────────────────────────── */}
          {topBadge && (
            <div className="mb-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3.5">
              {topBadge}
            </div>
          )}

          {/* ── Navigation ────────────────────────────────────────── */}
          <nav className="space-y-1">
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

          {/* ── Bottom slot ───────────────────────────────────────── */}
          {bottom && (
            <div className="mt-5 border-t border-white/[0.06] pt-5">
              {bottom}
            </div>
          )}

        </div>
      </GoldEdgeCard>
    </div>
  );
}