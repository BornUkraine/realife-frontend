export type AppNavItem = {
  label: string;
  href: string;
  enabled?: boolean;
  badge?: string; // optional
};

export const APP_NAV: AppNavItem[] = [
  { label: "Home", href: "/app", enabled: true },
  { label: "Create NFT", href: "/app/create", enabled: true },
  { label: "Trading NFTs", href: "/app/trading", enabled: false, badge: "Soon" },
  { label: "Real Marketing", href: "/app/real-marketing", enabled: false, badge: "Soon" },
  { label: "Social Learning", href: "/app/social-learning", enabled: false, badge: "Soon" },
  { label: "Profile", href: "/app/profile", enabled: true },
  { label: "Contact", href: "/#contact", enabled: true },
];

export function isNavActive(pathname: string, href: string) {
  if (!href || href.startsWith("/#")) return false;
  return pathname === href;
}