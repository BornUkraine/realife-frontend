"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

type NavItem = {
  label: string;
  href?: string;
  soon?: boolean;
  match?: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Home",
    href: "/app",
    match: (pathname) => pathname === "/app",
  },
  {
    label: "Create NFT",
    href: "/app/create",
    match: (pathname) => pathname.startsWith("/app/create"),
  },
  {
    label: "Trading NFTs",
    href: "/app/trading",
    match: (pathname) => pathname.startsWith("/app/trading"),
  },
  {
    label: "Real Marketing",
    href: "/app/real-marketing",
    match: (pathname) => pathname.startsWith("/app/real-marketing"),
  },
  {
    label: "Social Learning",
    soon: true,
    match: (pathname) => pathname.startsWith("/app/social-learning"),
  },
  {
    label: "Profile",
    href: "/app/profile",
    match: (pathname) => pathname.startsWith("/app/profile"),
  },
  {
    label: "Contact",
    href: "/app/contact",
    match: (pathname) => pathname.startsWith("/app/contact"),
  },
];

function LogoMark() {
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full border border-[#f3d46a]/70 bg-[radial-gradient(circle_at_30%_30%,rgba(255,224,130,0.16),rgba(212,175,55,0.06)_45%,rgba(0,0,0,0.18)_100%)] shadow-[0_0_30px_rgba(212,175,55,0.18),inset_0_0_20px_rgba(255,220,120,0.08)]">
        <div className="pointer-events-none absolute inset-[6px] rounded-full border border-[#f3d46a]/18" />
        <div className="text-center leading-none">
          <div className="text-[34px] font-black tracking-[-0.06em] text-[#f1c84a] drop-shadow-[0_0_18px_rgba(241,200,74,0.22)]">
            R
          </div>
          <div className="-mt-0.5 text-[8px] font-bold uppercase tracking-[0.28em] text-[#f3d46a]/90">
            Realife
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <div className="truncate text-[22px] font-black uppercase tracking-[0.06em] text-[#f1c84a] drop-shadow-[0_0_18px_rgba(241,200,74,0.20)]">
          REALIFE ®
        </div>
      </div>
    </div>
  );
}

function NavPill({
  label,
  href,
  active,
  soon,
}: {
  label: string;
  href?: string;
  active?: boolean;
  soon?: boolean;
}) {
  const baseClass = cx(
    "group relative flex min-h-[58px] w-full items-center justify-between rounded-[20px] px-5",
    "border backdrop-blur-xl transition-all duration-200",
    "shadow-[0_18px_50px_rgba(0,0,0,0.24)]",
    active
      ? [
          "border-[#f1c84a]/55",
          "bg-[linear-gradient(135deg,rgba(241,200,74,0.95),rgba(214,171,53,0.90))]",
          "text-[#15120a]",
          "shadow-[0_16px_40px_rgba(212,175,55,0.26),inset_0_1px_0_rgba(255,245,200,0.22)]",
        ].join(" ")
      : [
          "border-white/10",
          "bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]",
          "text-white/88",
          "hover:border-[#f1c84a]/25",
          "hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]",
          "hover:text-white",
        ].join(" ")
  );

  const content = (
    <>
      <span
        className={cx(
          "truncate text-[15px] font-semibold tracking-[-0.01em]",
          active ? "text-[#15120a]" : "text-inherit"
        )}
      >
        {label}
      </span>

      {soon ? (
        <span
          className={cx(
            "ml-3 inline-flex shrink-0 items-center rounded-full px-3 py-1 text-[11px] font-bold",
            active
              ? "bg-black/12 text-[#15120a]/80"
              : "border border-white/10 bg-white/[0.05] text-white/45"
          )}
        >
          Soon
        </span>
      ) : active ? (
        <span className="ml-3 inline-flex shrink-0 items-center rounded-full bg-black/14 px-3 py-1 text-[11px] font-bold text-[#15120a]">
          Active
        </span>
      ) : null}
    </>
  );

  if (!href || soon) {
    return <div className={cx(baseClass, soon && "cursor-default opacity-80")}>{content}</div>;
  }

  return (
    <Link href={href} className={baseClass}>
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
    <div
      className={cx(
        "relative overflow-hidden rounded-[34px] border border-[#f1c84a]/10",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))]",
        "p-5 sm:p-6",
        "shadow-[0_24px_90px_rgba(0,0,0,0.40),inset_0_1px_0_rgba(255,255,255,0.04)]",
        "backdrop-blur-2xl"
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(247,231,167,0.18),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(212,175,55,0.12),transparent_28%),linear-gradient(135deg,rgba(212,175,55,0.10),transparent_36%,transparent_64%,rgba(212,175,55,0.08))]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.035),transparent_18%,transparent_82%,rgba(0,0,0,0.18))]" />
      </div>

      <div className="relative z-10">
        <LogoMark />

        <div className="mt-8 space-y-2">
          <div className="text-[12px] font-black uppercase tracking-[0.34em] text-white/42">
            {title || "REALIFE"}
          </div>

          {subtitle ? (
            <div className="max-w-[18rem] text-[15px] leading-6 text-white/68">
              {subtitle}
            </div>
          ) : null}

          {topBadge ? <div className="pt-1">{topBadge}</div> : null}
        </div>

        <nav className="mt-7 space-y-3">
          {NAV_ITEMS.map((item) => {
            const active = item.match ? item.match(pathname) : Boolean(item.href && pathname === item.href);

            return (
              <NavPill
                key={item.label}
                label={item.label}
                href={item.href}
                active={active}
                soon={item.soon}
              />
            );
          })}
        </nav>

        {bottom ? <div className="mt-6">{bottom}</div> : null}
      </div>
    </div>
  );
}