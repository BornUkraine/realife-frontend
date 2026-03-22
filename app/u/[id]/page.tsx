import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* --------------------------------- UI Kit -------------------------------- */

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function shortAddr(addr?: string | null) {
  if (!addr) return "—";
  const s = String(addr);
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/70 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
      {children}
    </div>
  );
}

function GoldEdgeWrap({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-[34px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.35),rgba(212,175,55,0.16),rgba(184,135,10,0.10))]",
        "shadow-[0_34px_130px_rgba(0,0,0,0.60)]",
        className
      )}
    >
      <div
        className={cx(
          "relative overflow-hidden rounded-[34px]",
          "border border-white/10 bg-[#0b0a09]/15 backdrop-blur-2xl",
          "ring-1 ring-black/10",
          "before:pointer-events-none before:absolute before:inset-0",
          "before:bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.12),transparent_45%)]",
          "after:pointer-events-none after:absolute after:inset-0",
          "after:bg-[radial-gradient(circle_at_85%_115%,rgba(255,255,255,0.06),transparent_55%)]"
        )}
      >
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-[30px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))]",
        "shadow-[0_24px_90px_rgba(0,0,0,0.55)]",
        className
      )}
    >
      <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#0b0a09]/15 backdrop-blur-2xl ring-1 ring-black/10">
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
  tone?: "muted" | "gold" | "brand";
}) {
  const cls =
    tone === "gold"
      ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
      : tone === "brand"
      ? "border-white/15 bg-white/[0.08] text-white/80"
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
        // eslint-disable-next-line @next/next/no-img-element
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
      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
        {label}
      </div>
      <div
        className={cx(
          "mt-1 text-sm font-extrabold text-white/85 truncate",
          mono && "font-mono text-[13px]"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
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

  discordId: true,
  discordUser: true,
  discordName: true,
  discordImage: true,
} as const;

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const key = safeDecode(id || "").trim();
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

  const nftCount = await prisma.holding.count({
    where: {
      userId: user.id,
      amount: { gt: 0n },
      mint: { verified: true },
    },
  });

  const walletConnected = Boolean(user.walletAddress);
  const twitterConnected = Boolean(user.twitterId);
  const discordConnected = Boolean(user.discordId);

  const xHandle = user.twitterUser ? `@${user.twitterUser}` : null;
  const dcHandle = user.discordUser ? `@${user.discordUser}` : null;

  const displayName =
    user.twitterName ||
    user.discordName ||
    xHandle ||
    dcHandle ||
    (user.handle ? `@${user.handle}` : null) ||
    shortAddr(user.walletAddress);

  const heroAvatar = user.twitterImage || user.discordImage || null;

  const publicKey = user.handle || user.publicId || null;
  const publicUrl = publicKey && publicKey !== "tmp" ? `/u/${publicKey}` : null;
  const nftsUrl = publicUrl ? `${publicUrl}/nfts` : null;

  const xUrl = user.twitterUser ? `https://x.com/${user.twitterUser}` : null;

  return (
    <main className="min-h-screen bg-[#060505] text-white overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(255,255,255,0.05),transparent_60%)]" />
        <div className="absolute -top-80 -left-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/12 blur-3xl animate-pulse" />
        <div className="absolute -bottom-80 -right-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/10 blur-3xl animate-pulse" />

        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.22) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div className="absolute inset-0 opacity-[0.055] bg-[radial-gradient(circle,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.65),transparent)]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-10 space-y-8">
        <GoldEdgeWrap className="reveal rounded-[44px]">
          <div className="relative p-7 md:p-10">
            <div className="pointer-events-none absolute -top-44 -right-44 h-[560px] w-[560px] rounded-full bg-[#d4af37]/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-44 -left-44 h-[560px] w-[560px] rounded-full bg-white/[0.04] blur-3xl" />

            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar src={heroAvatar} fallback="RL" size="lg" />

              <div className="min-w-0 flex-1">
                <Pill>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]" />
                  Verified public identity
                </Pill>

                <div className="mt-4 text-3xl md:text-5xl font-black tracking-tighter truncate leading-tight">
                  {displayName}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {xHandle && <Chip tone="gold">{xHandle}</Chip>}
                  {dcHandle && <Chip tone="brand">{dcHandle}</Chip>}
                  {user.handle && user.handle !== user.twitterUser && <Chip>@{user.handle}</Chip>}

                  <StatusPill
                    ok={walletConnected}
                    text={walletConnected ? "Wallet Linked" : "No Wallet"}
                  />
                  <StatusPill
                    ok={twitterConnected}
                    text={twitterConnected ? "X Verified" : "X Unlinked"}
                  />
                  <StatusPill
                    ok={discordConnected}
                    text={discordConnected ? "Discord Linked" : "Discord Unlinked"}
                  />
                </div>

                <div className="mt-7 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KeyValue label="Points" value={user.points ?? 0} />
                  <KeyValue label="NFTs" value={nftCount} />
                  <KeyValue
                    label="Public Link"
                    value={publicUrl ? <span className="text-amber-400/90">{publicKey}</span> : "—"}
                    mono
                  />
                  <KeyValue label="EVM Wallet" value={shortAddr(user.walletAddress)} mono />
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {xUrl ? (
                    <a
                      href={xUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/15 bg-white/[0.06] font-extrabold backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)] hover:bg-white/10 hover:-translate-y-px transition active:translate-y-0"
                    >
                      Open X ↗
                    </a>
                  ) : null}

                  {publicUrl ? (
                    <Link
                      href={publicUrl}
                      className="inline-flex items-center justify-center px-5 py-3 rounded-2xl text-black font-extrabold hover:brightness-110 transition shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
                    >
                      Public URL
                    </Link>
                  ) : null}

                  {nftsUrl ? (
                    <Link
                      href={nftsUrl}
                      className="inline-flex items-center justify-center px-5 py-3 rounded-2xl text-[13px] font-extrabold text-black
                        bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]
                        shadow-[0_18px_60px_rgba(212,175,55,0.18)]
                        ring-1 ring-black/15 hover:brightness-110 hover:-translate-y-px active:translate-y-0 transition"
                    >
                      NFTs →
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </GoldEdgeWrap>

        <div className="reveal grid md:grid-cols-2 gap-6" style={{ animationDelay: "110ms" }}>
          <Card className="ring-1 ring-white/5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-sm font-extrabold">X (Twitter)</div>
                <div className="text-xs text-white/60 mt-1">Verified Social Identity</div>
              </div>
              <StatusPill ok={twitterConnected} text={twitterConnected ? "Active" : "Unlinked"} />
            </div>

            {twitterConnected ? (
              <div className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                <Avatar src={user.twitterImage} fallback="X" size="md" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold truncate text-white/90">
                    {user.twitterName || "—"}
                  </div>
                  <div className="text-xs text-white/40 font-mono truncate">
                    @{user.twitterUser}
                  </div>
                </div>
                {xUrl ? (
                  <a
                    href={xUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-xs font-semibold text-[#d4af37] hover:brightness-110 transition"
                  >
                    View ↗
                  </a>
                ) : null}
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_0%,rgba(212,175,55,0.10),transparent_55%)]" />
                  <div className="absolute inset-0 opacity-[0.06] [mask-image:radial-gradient(circle_at_40%_30%,black,transparent_70%)] bg-[linear-gradient(to_right,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[length:72px_72px]" />
                </div>

                <div className="relative z-10 flex items-center gap-4">
                  <Avatar src={null} fallback="X" size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-extrabold truncate text-white/80">Not connected</div>
                    <div className="text-xs text-white/40 mt-0.5">
                      This user hasn’t linked X yet.
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Chip>🔒 Private</Chip>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Chip>Coming soon</Chip>
                  <Chip tone="gold">Identity-ready</Chip>
                </div>
              </div>
            )}
          </Card>

          <Card className="ring-1 ring-white/5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-sm font-extrabold">Discord</div>
                <div className="text-xs text-white/60 mt-1">Verified Social Identity</div>
              </div>
              <StatusPill ok={discordConnected} text={discordConnected ? "Active" : "Unlinked"} />
            </div>

            {discordConnected ? (
              <div className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                <Avatar src={user.discordImage} fallback="DC" size="md" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold truncate text-white/90">
                    {user.discordName || "—"}
                  </div>
                  <div className="text-xs text-white/40 font-mono truncate">
                    {user.discordUser ? `@${user.discordUser}` : "—"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_0%,rgba(212,175,55,0.10),transparent_55%)]" />
                  <div className="absolute inset-0 opacity-[0.06] [mask-image:radial-gradient(circle_at_40%_30%,black,transparent_70%)] bg-[linear-gradient(to_right,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[length:72px_72px]" />
                </div>

                <div className="relative z-10 flex items-center gap-4">
                  <Avatar src={null} fallback="DC" size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-extrabold truncate text-white/80">Not connected</div>
                    <div className="text-xs text-white/40 mt-0.5">
                      This user hasn’t linked Discord yet.
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Chip>🔒 Private</Chip>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Chip>Coming soon</Chip>
                  <Chip tone="gold">Identity-ready</Chip>
                </div>
              </div>
            )}
          </Card>
        </div>

        <footer
          className="reveal pt-6 text-[10px] font-black text-white/20 text-center uppercase tracking-[0.4em]"
          style={{ animationDelay: "190ms" }}
        >
          Realife Ecosystem • Identity Verified
        </footer>
      </div>
    </main>
  );
}