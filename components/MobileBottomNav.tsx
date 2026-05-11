"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive } from "@/components/appNav";

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

// Five core items live in the bottom-nav. Less critical pages (FAQ, Contact,
// Social, Real Marketing, AI Studio) stay reachable from the More drawer or
// from inside Home / Profile.
type IconName =
  | "home"
  | "create"
  | "trade"
  | "profile"
  | "more";

const ITEMS: Array<{
  href: string;
  label: string;
  icon: IconName;
}> = [
  { href: "/app", label: "Home", icon: "home" },
  { href: "/app/trading", label: "Trade", icon: "trade" },
  { href: "/app/create", label: "Create", icon: "create" },
  { href: "/app/profile", label: "Profile", icon: "profile" },
  { href: "/app/orders", label: "Orders", icon: "more" },
];

function Icon({ name }: { name: IconName }) {
  const common = "h-5 w-5";

  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common} aria-hidden>
        <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "trade") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common} aria-hidden>
        <path d="M4 8h12l-3-3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 16H8l3 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "create") {
    // Plus icon — primary action, slightly larger
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-6 w-6" aria-hidden>
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "profile") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common} aria-hidden>
        <circle cx="12" cy="8" r="3.6" />
        <path d="M4.6 20c1.6-3.6 4.4-5.4 7.4-5.4s5.8 1.8 7.4 5.4" strokeLinecap="round" />
      </svg>
    );
  }
  // more / orders
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common} aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h5" strokeLinecap="round" />
    </svg>
  );
}

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Spacer so page content can scroll past the fixed bar without hiding */}
      <div className="h-[72px] lg:hidden" aria-hidden />

      <nav
        className={cx(
          "fixed inset-x-0 bottom-0 z-40 lg:hidden",
          // Premium dark glass with gold edge
          "border-t border-white/10",
          "bg-[#0a0806]/85 backdrop-blur-2xl",
          // iOS safe area inset
          "pb-[env(safe-area-inset-bottom)]"
        )}
        aria-label="Primary"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 px-2 pt-1.5 pb-1.5">
          {ITEMS.map((item) => {
            const active = isNavActive(pathname, item.href);
            const isCreate = item.icon === "create";

            if (isCreate) {
              // Primary CTA — gold pill that lifts above the bar
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="relative flex items-center justify-center"
                >
                  <span
                    className={cx(
                      "absolute -top-5 flex h-12 w-12 items-center justify-center rounded-full",
                      "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_50%,#b8870a_100%)]",
                      "text-[#0a0806] shadow-[0_10px_30px_rgba(201,168,76,0.45)] ring-1 ring-black/20",
                      "transition active:scale-95"
                    )}
                  >
                    <Icon name="create" />
                  </span>
                  <span className="pt-9 text-[10px] font-bold uppercase tracking-[0.08em] text-[#C9A84C]">
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex flex-col items-center justify-center gap-0.5 py-1 transition",
                  active ? "text-[#E8D5A0]" : "text-white/55 hover:text-white/85"
                )}
              >
                <Icon name={item.icon} />
                <span className={cx(
                  "text-[10px] font-semibold tracking-tight",
                  active && "text-[#E8D5A0]"
                )}>
                  {item.label}
                </span>
                {active ? (
                  <span className="mt-0.5 h-0.5 w-5 rounded-full bg-[#C9A84C]/80" aria-hidden />
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
