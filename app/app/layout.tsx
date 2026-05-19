// PATH: app/app/layout.tsx
//
// CHANGED: added the `modal` parallel-route slot so the OpenSea-style
// intercepting modal (app/app/@modal/...) can render on top of any page
// inside the /app section (trading, profile, etc).
//
// Everything else is identical to your original file.

import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default function AppLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return (
    <AppShell title="REALIFE" subtitle="premium creator app">
      {children}
      {modal}
    </AppShell>
  );
}
