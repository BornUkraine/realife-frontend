import AppShell from "@/components/AppShell";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Публичные профили у тебя живут внутри /app/*
const PUBLIC_PREFIX = "/app/u";

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] p-px bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))] shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0a09]/55 backdrop-blur-2xl ring-1 ring-black/10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_0%,rgba(212,175,55,0.10),transparent_45%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_120%,rgba(255,255,255,0.06),transparent_55%)]" />
        </div>
        <div className="relative z-10 p-6">{children}</div>
      </div>
    </div>
  );
}

function StatusPill({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div
      className={[
        "text-[11px] font-semibold px-3 py-1.5 rounded-full border",
        ok
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
          : "border-white/10 bg-white/[0.06] text-white/60",
      ].join(" ")}
    >
      {text}
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.06] text-white/70">
      {children}
    </div>
  );
}

function Avatar({ src, fallback }: { src?: string | null; fallback: string }) {
  return (
    <div className="h-16 w-16 rounded-2xl border border-white/10 bg-white/[0.06] overflow-hidden flex items-center justify-center">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={fallback}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="text-white/40 text-xs font-bold">{fallback}</span>
      )}
    </div>
  );
}

const userSelect = {
  id: true,
  handle: true,
  publicId: true,
  points: true,

  twitterId: true,
  twitterUser: true,
  twitterName: true,
  twitterImage: true,

  discordId: true,
  discordUser: true,
  discordName: true,
  discordImage: true,

  createdAt: true,
} as const;

function pickPublicKey(user: {
  handle: string | null;
  twitterUser: string | null;
  publicId: string | null;
}) {
  // приоритет: ручной handle > X username > publicId
  return user.handle || user.twitterUser || user.publicId || "";
}

export default async function PublicProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const key = decodeURIComponent(params.id || "").trim();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { handle: key },
        { publicId: key },
        // важно: чтобы /app/u/born_voyage открывалось тоже
        { twitterUser: key },
        { discordUser: key },
      ],
    },
    select: userSelect,
  });

  if (!user) notFound();

  const twitterConnected = Boolean(user.twitterId);
  const discordConnected = Boolean(user.discordId);

  // Главный "человеческий" нейм — приоритет X
  const displayName =
    user.twitterName ||
    user.discordName ||
    user.twitterUser ||
    user.discordUser ||
    "Realife user";

  // Главная ава — приоритет X
  const avatar = user.twitterImage || user.discordImage || null;

  const publicKey = pickPublicKey(user);
  const publicUrl = publicKey ? `${PUBLIC_PREFIX}/${publicKey}` : null;

  // красивый X handle
  const xHandle = user.twitterUser ? `@${user.twitterUser}` : null;

  return (
    <AppShell title="REALIFE" subtitle="Public profile">
      <main className="min-h-screen bg-[#060505] text-white overflow-x-hidden">
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.10),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(255,255,255,0.05),transparent_60%)]" />
          <div className="absolute -top-80 -left-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/14 blur-3xl animate-pulse" />
          <div className="absolute -bottom-80 -right-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/10 blur-3xl animate-pulse" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.22) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 py-10 space-y-6">
          <Card>
            <div className="flex items-center gap-5">
              <Avatar src={avatar} fallback="RL" />

              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white/60">
                  Public profile
                </div>

                <div className="mt-1 text-3xl md:text-4xl font-black tracking-tight truncate">
                  {displayName}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {/* показываем X handle если есть */}
                  {xHandle ? <Chip>{xHandle}</Chip> : null}

                  {/* если у тебя есть ручной handle — покажем его */}
                  {user.handle ? <Chip>{`@${user.handle}`}</Chip> : null}

                  <Chip>{user.publicId ?? "no publicId"}</Chip>

                  <StatusPill
                    ok={twitterConnected}
                    text={twitterConnected ? "X connected" : "X not connected"}
                  />
                  <StatusPill
                    ok={discordConnected}
                    text={
                      discordConnected
                        ? "Discord connected"
                        : "Discord not connected"
                    }
                  />
                </div>

                <div className="mt-3 text-sm text-white/70">
                  Points:{" "}
                  <span className="font-extrabold text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]">
                    {user.points ?? 0}
                  </span>
                </div>

                <div className="mt-3 text-[12px] text-white/50">
                  Link:{" "}
                  <span className="text-white/70">
                    {publicUrl ?? "(no public url)"}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-extrabold">X</div>
                  <div className="text-xs text-white/60 mt-1">
                    Name + @username + avatar
                  </div>
                </div>
                <StatusPill
                  ok={twitterConnected}
                  text={twitterConnected ? "Connected" : "Not connected"}
                />
              </div>

              <div className="mt-4 flex items-center gap-4">
                <Avatar src={user.twitterImage} fallback="X" />
                <div className="min-w-0">
                  <div className="text-sm font-extrabold truncate">
                    {user.twitterName || "—"}
                  </div>
                  <div className="text-xs text-white/60 truncate">
                    {user.twitterUser ? `@${user.twitterUser}` : "—"}
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-extrabold">Discord</div>
                  <div className="text-xs text-white/60 mt-1">
                    Display + username + avatar
                  </div>
                </div>
                <StatusPill
                  ok={discordConnected}
                  text={discordConnected ? "Connected" : "Not connected"}
                />
              </div>

              <div className="mt-4 flex items-center gap-4">
                <Avatar src={user.discordImage} fallback="DS" />
                <div className="min-w-0">
                  <div className="text-sm font-extrabold truncate">
                    {user.discordName || "—"}
                  </div>
                  <div className="text-xs text-white/60 truncate">
                    {user.discordUser || "—"}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
