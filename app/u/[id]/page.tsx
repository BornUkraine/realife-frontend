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

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-[30px] p-px bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))] shadow-[0_24px_90px_rgba(0,0,0,0.55)]",
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

function Chip({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "gold" }) {
  const cls =
    tone === "gold"
      ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
      : "border-white/10 bg-white/[0.06] text-white/70";
  return <div className={cx("text-[11px] font-semibold px-3 py-1.5 rounded-full border", cls)}>{children}</div>;
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
        "rounded-2xl border border-white/10 bg-white/[0.06] overflow-hidden flex items-center justify-center shadow-[0_18px_70px_rgba(0,0,0,0.30)] ring-1 ring-black/15"
      )}
    >
      {src ? (
        <img src={src} alt={fallback} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="text-white/40 text-xs font-black">{fallback}</span>
      )}
    </div>
  );
}

function KeyValue({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">{label}</div>
      <div className={cx("mt-1 text-sm font-extrabold text-white/85 truncate", mono ? "font-mono text-[13px]" : "")}>
        {value}
      </div>
    </div>
  );
}

/* --------------------------------- Data ---------------------------------- */

const userSelect = {
  id: true,
  handle: true,
  publicId: true,
  points: true,
  walletAddress: true,
  walletChainId: true,

  twitterId: true,
  twitterUser: true,
  twitterName: true,
  twitterImage: true,
} as const;

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export default async function PublicProfilePage({ params }: { params: { id: string } }) {
  const key = safeDecode(params.id || "").trim();
  if (!key) notFound();

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
  const twitterConnected = Boolean(user.twitterId);

  const xHandle = user.twitterUser ? `@${user.twitterUser}` : null;

  const displayName =
    user.twitterName ||
    xHandle ||
    (user.handle ? `@${user.handle}` : null) ||
    shortAddr(user.walletAddress);

  const heroAvatar = user.twitterImage || null;

  const publicKey = user.handle || user.publicId || null;
  const publicUrl = publicKey && publicKey !== "tmp" ? `${PUBLIC_PREFIX}/${publicKey}` : null;

  return (
    <AppShell title="REALIFE" subtitle="Public identity profile">
      <main className="min-h-screen bg-[#060505] text-white overflow-x-hidden relative">
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.10),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(255,255,255,0.05),transparent_60%)]" />
          <div className="absolute -top-80 -left-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/10 blur-3xl animate-pulse" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.22) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-6 py-10 space-y-6">
          <Card>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar src={heroAvatar} fallback="RL" size="lg" />

              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Verified Profile</div>

                <div className="mt-1 text-3xl md:text-5xl font-black tracking-tighter truncate leading-tight">
                  {displayName}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {user.twitterUser && <Chip tone="gold">@{user.twitterUser}</Chip>}
                  {user.handle && user.handle !== user.twitterUser && <Chip>@{user.handle}</Chip>}
                  <StatusPill ok={walletConnected} text={walletConnected ? "Wallet Linked" : "No Wallet"} />
                  <StatusPill ok={twitterConnected} text={twitterConnected ? "X Verified" : "X Unlinked"} />
                </div>

                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KeyValue label="Points" value={user.points ?? 0} />
                  <KeyValue label="ID" value={user.publicId || "—"} mono />
                  <KeyValue
                    label="Public Link"
                    value={publicUrl ? <span className="text-amber-400/90">{publicKey}</span> : "—"}
                    mono
                  />
                  <KeyValue label="EVM Wallet" value={shortAddr(user.walletAddress)} mono />
                </div>
              </div>
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {twitterConnected && (
              <Card className="ring-1 ring-white/5">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-sm font-extrabold">X (Twitter)</div>
                    <div className="text-xs text-white/60 mt-1">Verified Social Identity</div>
                  </div>
                  <StatusPill ok={true} text="Active" />
                </div>
                <div className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                  <Avatar src={user.twitterImage} fallback="X" size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-extrabold truncate text-white/90">{user.twitterName || "—"}</div>
                    <div className="text-xs text-white/40 font-mono truncate">@{user.twitterUser}</div>
                  </div>
                </div>
              </Card>
            )}

            <div className="rounded-[30px] border border-white/5 bg-white/[0.02] p-8 flex flex-col items-center justify-center text-center">
              <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <span className="text-white/20 text-xl">🔒</span>
              </div>
              <div className="text-xs font-bold text-white/30 uppercase tracking-widest">More links coming soon</div>
            </div>
          </div>

          <div className="text-[10px] font-black text-white/20 text-center uppercase tracking-[0.4em] pt-10">
            Realife Ecosystem • Identity Verified
          </div>
        </div>
      </main>
    </AppShell>
  );
}