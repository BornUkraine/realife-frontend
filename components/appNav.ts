export type AppNavItem = {
  label: string;
  href: string;
  enabled?: boolean;
  badge?: string; // optional
};

export const APP_NAV: AppNavItem[] = [
  { label: "Home", href: "/app", enabled: true },
  { label: "Create NFT", href: "/app/create", enabled: true },
  { label: "AI Studio", href: "/app/ai-studio", enabled: true },
  { label: "Trading NFTs", href: "/app/trading", enabled: true },
  { label: "Real Marketing", href: "/app/real-marketing", enabled: true },
  { label: "Social Learning", href: "/app/social", enabled: true },
  { label: "Profile", href: "/app/profile", enabled: true },
  { label: "Contact", href: "/app/contacts", enabled: true },
];

export function isNavActive(pathname: string, href: string) {
  if (!href || href.startsWith("/#")) return false;

  if (href === "/app") {
    return pathname === "/app";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}