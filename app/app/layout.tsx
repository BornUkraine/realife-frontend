import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell title="REALIFE" subtitle="premium creator app">
      {children}
    </AppShell>
  );
}