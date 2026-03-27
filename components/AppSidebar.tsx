"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { APP_NAV, isNavActive } from "@/components/appNav";

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

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
        "relative overflow-hidden rounded-[34px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.40),rgba(212,175,55,0.18),rgba(184,135,10,0.12))]",
        "shadow-[0_34px_140px_rgba(0,0,0,0.60)]",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "relative overflow-hidden rounded-[34px]",
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
  const base = cx(
    "group block w-full rounded-2xl",
    "px-4 py-3 text-sm font-semibold",
    "transition duration-200"
  );

  const activeCls = cx(
    "text-black",
    "border border-[#f3d46a]/45",
    "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
    "shadow-[0_18px_56px_rgba(212,175,55,0.18)]",
    "ring-1 ring-black/15"
  );

  const idleCls = cx(
    "text-white/85 hover:text-white",
    "border border-white/10",
    "bg-white/[0.04] hover:bg-white/[0.07]",
    "shadow-[0_14px_44px_rgba(0,0,0,0.32)]",
    "hover:-translate-y-[1px] active:translate-y-0"
  );

  const disabledCls = cx(
    "opacity-45 cursor-not-allowed select-none",
    "border border-white/10 bg-white/[0.03]"
  );

  const content = (
    <div className="flex items-center justify-between gap-3">
      <span className="truncate">{label}</span>

      {!enabled ? (
        <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[11px] text-white/70">
          {badge || "Soon"}
        </span>
      ) : active ? (
        <span className="rounded-full border border-black/10 bg-black/10 px-2 py-1 text-[11px]">
          Active
        </span>
      ) : (
        <span className="text-[11px] text-white/60 opacity-0 transition group-hover:opacity-100">
          →
        </span>
      )}
    </div>
  );

  if (!enabled) {
    return <div className={cx(base, disabledCls)}>{content}</div>;
  }

  return (
    <Link
      href={href}
      className={cx(base, active ? activeCls : idleCls)}
      aria-current={active ? "page" : undefined}
    >
      {content}
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
    <div className="lg:sticky lg:top-8 xl:top-10">
      <GoldEdgeCard>
        <div className="flex flex-col p-5 xl:p-6 lg:min-h-[calc(100vh-5rem)] xl:min-h-[calc(100vh-6rem)]">
          <Link
            href="/app"
            className="relative mb-8 flex items-center overflow-visible"
          >
            <div className="relative z-10 -ml-2 flex h-16 w-16 shrink-0 items-center justify-center">
              <img
                src="/brand/logo-mark.png"
                alt="Realife"
                className="h-full w-full scale-[4.5] object-contain mix-blend-screen"
                draggable={false}
              />
            </div>

            <div className="relative z-0 h-12 flex-1 overflow-visible">
              <img
                src="/brand/logo-wordmark.png"
                alt="Realife"
                className="absolute left-[-72px] top-1/2 w-[300px] max-w-none -translate-y-1/2 object-contain object-left mix-blend-screen"
                draggable={false}
              />
            </div>
          </Link>

          {(title || subtitle) && (
            <div className="mb-5">
              {title ? (
                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/38">
                  {title}
                </div>
              ) : null}

              {subtitle ? (
                <div className="mt-2 text-[12px] leading-relaxed text-white/52">
                  {subtitle}
                </div>
              ) : null}
            </div>
          )}

          {topBadge ? (
            <div className="mb-4 rounded-3xl border border-white/10 bg-white/5 p-4">
              {topBadge}
            </div>
          ) : null}

          <nav className="space-y-2.5">
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

          <div className="mt-auto pt-6">
            {bottom ? <div>{bottom}</div> : null}

            <div className="mt-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/36">
                Realife Layer
              </div>
              <div className="mt-2 text-[12px] leading-relaxed text-white/52">
                Premium app shell for minting, trading, profile identity, and
                delivery-aware NFT ownership.
              </div>
              <div className="mt-3 text-[11px] text-white/38">
                Base • IPFS • Real-world assets
              </div>
            </div>
          </div>
        </div>
      </GoldEdgeCard>
    </div>
  );
}