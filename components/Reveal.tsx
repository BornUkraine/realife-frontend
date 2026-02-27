"use client";

import React from "react";

export default function Reveal({
  className = "",
  children,
  delayMs = 0,
}: {
  className?: string;
  children: React.ReactNode;
  delayMs?: number;
}) {
  return (
    <div
      className={["reveal", className].filter(Boolean).join(" ")}
      style={{
        animation: "fadeUp .7s ease-out both",
        animationDelay: `${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
}