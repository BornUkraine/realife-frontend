import AppShell from "@/components/AppShell";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_PREFIX = "/u";

/* --------------------------------- UI Kit -------------------------------- */

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function shortAddr(addr?: string | null) {
  if (!addr) return "—";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-[30px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))]",
        "shadow-[0_24px_90px_rgba(0,0,0,0.55)]",
        className
      )}
    >
      <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#0b0a09]/55 backdrop-blur-2xl ring-1 ring-black/10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_0%,rgba(212,175,55,0.11),transparent_45%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_120%,rgba(255,255,255,0.06),transparent_55%)]" />
          <div className="absolute inset-0 opacity-[0.06] [mask-image:radial-gradient(circle_at_40%_30%,black,transparent_70%)] bg-[linear-gradient(to_right,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[length:64px_64px]" />
        </div>
        <div className="relative z-10 p-6 md:p-7">{children}</div>
      </div>
    </div>
  );
}

function StatusPill({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div
      className={cx(
        "text-[11px] font-semibold px-3 py-1.5 rounded-full border",
        ok
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
          : "border-white/10 bg-white/[0.06] text-white/60"
      )}
    >
      {text}
    </div>
  );
}

function Chip({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "gold";
}) {
  const cls =
    tone === "gold"
      ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
      : "border-white/10 bg-white/[0.06] text-white/70";

  return (
    <div className={cx("text-[11px] font-semibold px-3 py-1.5 rounded-full border", cls)}>
      {children}
    </div>
  );
}

function Avatar({
  src,
  fallback,
  size = "md",
}: {
  src?: string | null;
  fallback: string;
  size?: "sm" | "md" | "lg";
}) {
  const s = size === "lg" ? "h-16 w-16" : size === "sm" ? "h-12 w-12" : "h-14 w-14";

  return (
    <div
      className={cx(
        s,
        "rounded-2xl border border-white/10 bg-white/[0.06] overflow-hidden flex items-center justify-center",
        "shadow-[0_18px_70px_rgba(0,0,0,0.30)] ring-1 ring-black/15"
      )}
    >
      {src ? (
        <img
          src={src}
          alt={fallback}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="text-white/40 text-xs font-black">{fallback}</span>
      )}
    </div>
  );
}

function KeyValue({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">{label}</div>
      <div
        className={cx(
          "mt-1 text-sm font-extrabold text-white/85 truncate",
          mono ? "font-mono text-[13px]" : ""
        )}
      >
        {value}
      </div>
    </div>
  );
}

/* --------------------------------- Data ---------------------------------- */

// Выборка только необходимых полей
const userSelect = {
  id: true,
  handle: true,
  publicId: true,
  points: true,
  walletAddress: true,
  walletChainId: true,
  createdAt: true,
} as const;

function pickPublicKey(user: { handle: string | null; publicId: string | null }) {
  return user.handle || user.publicId || null;
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const key = decodeURIComponent(id || "").trim();

  // Поиск только по handle и publicId
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { handle: { equals: key, mode: "insensitive" } },
        { publicId: { equals: key, mode: "insensitive" } },
      ],
    },
    select: userSelect,
  });

  if (!user) notFound();

  const walletConnected = Boolean(user.walletAddress);

  // Имя: приоритет handle -> сокращенный адрес
  const displayName =
    user.handle ? `@${user.handle}` : 
    (user.walletAddress ? shortAddr(user.walletAddress) : "Realife user");

  // Аватарка теперь всегда null (соцсети отключены)
  const heroAvatar = null;

  const publicKey = pickPublicKey({
    handle: user.handle ?? null,
    publicId: user.publicId ?? null,
  });

  const publicUrl =
    publicKey && publicKey !== "tmp" ? `${PUBLIC_PREFIX}/${publicKey}` : null;

  return (
    <AppShell title="REALIFE" subtitle="Public profile">
      <main className="min-h-screen bg-[#060505] text-white overflow-x-hidden relative">
        {/* Ambient background */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.10),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(255,255,255,0.05),transparent_60%)]" />
          <div className="absolute -top-80 -left-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/10 blur-3xl animate-pulse" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "linear-gradient(to right, rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.22) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-6 py-10 space-y-6">
          {/* HERO */}
          <Card>
            <div className="flex items-center gap-5">
              <Avatar src={heroAvatar} fallback="RL" size="lg" />

              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Public Identity</div>

                <div className="mt-1 text-3xl md:text-5xl font-black tracking-tighter truncate leading-tight">
                  {displayName}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {user.handle && <Chip tone="gold">@{user.handle}</Chip>}
                  {user.publicId && user.publicId !== "tmp" && (
                    <Chip>{user.publicId}</Chip>
                  )}
                  <StatusPill ok={walletConnected} text={walletConnected ? "Wallet connected" : "Wallet not connected"} />
                  <StatusPill ok={false} text="No social links" />
                </div>

                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KeyValue label="Points" value={user.points ?? 0} />
                  <KeyValue label="Handle" value={user.handle ? `@${user.handle}` : "—"} />
                  <KeyValue
                    label="Public link"
                    value={
                      publicUrl ? (
                        <a className="text-white/85 hover:text-amber-400 transition" href={publicUrl}>
                          {publicUrl}
                        </a>
                      ) : (
                        "—"
                      )
                    }
                    mono
                  />
                  <KeyValue
                    label="EVM wallet"
                    value={user.walletAddress ? shortAddr(user.walletAddress) : "—"}
                    mono
                  />
                </div>

                <div className="mt-4 text-[11px] text-white/30 font-medium">
                  Full wallet:{" "}
                  <span className="text-white/50 font-mono">{user.walletAddress ?? "—"}</span>{" "}
                  {user.walletChainId ? (
                    <>
                      • Chain: <span className="text-white/50 font-bold">{user.walletChainId}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>

          <div className="text-[10px] font-black text-white/20 text-center uppercase tracking-[0.4em] pt-10">
            Realife Ecosystem • Profile ID: {user.id.slice(0, 8)}
          </div>
        </div>
      </main>
    </AppShell>
  );
}