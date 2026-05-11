"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { APP_NAV, isNavActive } from "@/components/appNav";

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

// ─── GoldEdgeCard ─────────────────────────────────────────────────────────────
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
        "relative rounded-3xl p-px overflow-hidden",
        "bg-[linear-gradient(145deg,rgba(247,231,167,0.38),rgba(201,168,76,0.16),rgba(184,135,10,0.10))]",
        "shadow-[0_22px_90px_rgba(0,0,0,0.55)]",
        className,
      )}
    >
      <div
        className={cx(
          "relative rounded-3xl overflow-hidden",
          "border border-white/[0.07]",
          "bg-[#0a0806]/72 backdrop-blur-2xl",
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

// ─── Nav icons — outline SVG, sized 16×16 ────────────────────────────────────
function NavIcon({ href }: { href: string }) {
  const cls = "h-4 w-4 shrink-0";

  if (href === "/app") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={cls} aria-hidden>
        <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (href === "/app/create") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={cls} aria-hidden>
        <path d="M12 4v3M12 17v3M4 12h3M17 12h3" strokeLinecap="round" />
        <path d="m6.5 6.5 2 2M15.5 15.5l2 2M17.5 6.5l-2 2M8.5 15.5l-2 2" strokeLinecap="round" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  if (href === "/app/ai-studio") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={cls} aria-hidden>
        <path d="M5 19 19 5" strokeLinecap="round" />
        <path d="M15 5h4v4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 9.5 7.5 8 9 6.5 10.5 8 9 9.5Z" />
      </svg>
    );
  }
  if (href === "/app/trading") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={cls} aria-hidden>
        <path d="M4 8h12l-3-3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 16H8l3 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (href === "/app/real-marketing") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={cls} aria-hidden>
        <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z" strokeLinejoin="round" />
        <path d="M15 8a4 4 0 0 1 0 8" strokeLinecap="round" />
      </svg>
    );
  }
  if (href === "/app/social") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={cls} aria-hidden>
        <circle cx="9" cy="9" r="3" />
        <path d="M3 19c1.2-2.8 3.4-4.2 6-4.2s4.8 1.4 6 4.2" strokeLinecap="round" />
        <circle cx="17" cy="7" r="2.4" />
        <path d="M15.5 14c1.6.4 3 1.6 3.8 3.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (href === "/app/profile") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={cls} aria-hidden>
        <circle cx="12" cy="8" r="3.4" />
        <path d="M5 20c1.4-3.4 4-5.2 7-5.2s5.6 1.8 7 5.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (href === "/faq") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={cls} aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7" strokeLinecap="round" />
        <circle cx="12" cy="17" r="0.8" fill="currentColor" />
      </svg>
    );
  }
  if (href === "/app/contacts") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={cls} aria-hidden>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="m3 8 9 6 9-6" strokeLinejoin="round" />
      </svg>
    );
  }

  // Fallback dot
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cls} aria-hidden>
      <circle cx="12" cy="12" r="3" />
    </svg>
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
    "group relative flex w-full items-center gap-2.5",
    "rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium",
    "transition-all duration-150",
  );

  // Active accent: gold left rule. Use inline style to avoid Tailwind border conflicts.
  const activeStyle = {
    borderLeft: "2px solid #C9A84C",
    paddingLeft: "8px",
  };

  const activeCls = cx(
    "text-[#F0E4BF]",
    "border border-[rgba(201,168,76,0.22)]",
    "bg-[rgba(201,168,76,0.08)]",
  );

  const idleCls = cx(
    "text-white/65 hover:text-white",
    "border border-transparent hover:border-white/[0.07]",
    "hover:bg-white/[0.04]",
  );

  const disabledCls = cx(
    "cursor-not-allowed select-none opacity-40",
    "border border-transparent text-white/40",
  );

  const content = (
    <>
      <span
        className={cx(
          "shrink-0 transition-colors",
          active ? "text-[#C9A84C]" : "text-white/55 group-hover:text-white/85",
        )}
      >
        <NavIcon href={href} />
      </span>

      <span className="truncate flex-1">{label}</span>

      {!enabled ? (
        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-medium text-white/45">
          {badge ?? "Soon"}
        </span>
      ) : active ? (
        <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-[#C9A84C]" aria-hidden />
      ) : null}
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
    <div className="sticky top-20">
      <GoldEdgeCard>
        <div className="p-3 xl:p-4">

          {/* ── Logo ──────────────────────────────────────────────── */}
          <Link
            href="/app"
            className="mb-3 flex items-center relative overflow-visible"
          >
            <div className="z-10 shrink-0 relative w-10 h-10 flex items-center justify-center -ml-1">
              <Image
                src="/brand/logo-mark.png"
                alt="Realife"
                width={240}
                height={240}
                priority
                quality={90}
                sizes="240px"
                className="h-full w-full object-contain mix-blend-screen scale-[3.2]"
                draggable={false}
              />
            </div>
            <div className="relative flex-1 h-8 overflow-visible z-0">
              <Image
                src="/brand/logo-wordmark.png"
                alt="Realife"
                width={560}
                height={120}
                priority
                quality={90}
                sizes="560px"
                className="absolute left-[-48px] top-1/2 h-auto w-[200px] max-w-none -translate-y-1/2 object-contain object-left mix-blend-screen"
                draggable={false}
              />
            </div>
          </Link>

          {/* ── Section label ─────────────────────────────────────── */}
          {(title || subtitle) && (
            <div className="mb-2.5 border-b border-white/[0.06] pb-2.5">
              {title && (
                <p className="text-[9px] font-semibold uppercase tracking-[0.20em] text-white/35">
                  {title}
                </p>
              )}
              {subtitle && (
                <p className="mt-0.5 text-[10.5px] leading-snug text-white/45">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {/* ── Top badge slot ─────────────────────────────────────── */}
          {topBadge && (
            <div className="mb-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] p-2">
              {topBadge}
            </div>
          )}

          {/* ── Navigation ────────────────────────────────────────── */}
          <nav className="space-y-0.5">
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
            <div className="mt-3 border-t border-white/[0.06] pt-3">
              {bottom}
            </div>
          )}

        </div>
      </GoldEdgeCard>
    </div>
  );
}
