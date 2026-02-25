import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";
import SidebarBottom from "@/components/SidebarBottom";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      title="REALIFE"
      subtitle="premium creator app"
      sidebarBottom={<SidebarBottom />}
    >
      {children}
    </AppShell>
  );
}