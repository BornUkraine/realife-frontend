import { Suspense } from "react";
import SuccessClient from "./SuccessClient";

export default function Page() {
  return (
    <Suspense 
      fallback={
        <div className="flex h-64 items-center justify-center text-white/50 text-sm font-semibold animate-pulse">
          Loading success data…
        </div>
      }
    >
      <SuccessClient />
    </Suspense>
  );
}