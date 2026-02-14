import { Suspense } from "react";
import SuccessClient from "./SuccessClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060505] text-white p-6">Loading…</div>}>
      <SuccessClient />
    </Suspense>
  );
}
