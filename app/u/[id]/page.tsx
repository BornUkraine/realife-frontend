import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import Reveal from "@/components/Reveal";

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
    <div
      className={cx(
        "text-[11px] font-semibold px-3 py-1.5 rounded-full border",
        cls
      )}
    >
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
  const s =
    size === "lg" ? "h-16 w-16" : size === "sm" ? "h-12 w-12" : "h-14 w-14";
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
    <div className="space-y-8">
      <Reveal>
        <GoldEdgeWrap className="rounded-[44px]">
          <div className="relative overflow-hidden p-7 md:p-10">
            <div className="pointer-events-none absolute -top-44 -right-44 h-[560px] w-[560px] rounded-full bg-[#d4af37]/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-44 -left-44 h-[560px] w-[560px] rounded-full bg-white/[0.04] blur-3xl" />

            <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
              <Avatar src={heroAvatar} fallback="RL" size="lg" />

              <div className="min-w-0 flex-1">
                <Pill>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]" />
                  Verified public identity
                </Pill>

                <h1 className="mt-4 truncate text-3xl font-black leading-tight tracking-tighter md:text-5xl">
                  {displayName}
                </h1>

                <div className="mt-4 flex flex-wrap gap-2">
                  {xHandle ? <Chip tone="gold">{xHandle}</Chip> : null}
                  {dcHandle ? <Chip tone="brand">{dcHandle}</Chip> : null}
                  {user.handle && user.handle !== user.twitterUser ? (
                    <Chip>@{user.handle}</Chip>
                  ) : null}

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

                <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <KeyValue label="Points" value={user.points ?? 0} />
                  <KeyValue label="NFTs" value={nftCount} />
                  <KeyValue
                    label="Public Link"
                    value={
                      publicUrl ? (
                        <span className="text-amber-400/90">{publicKey}</span>
                      ) : (
                        "—"
                      )
                    }
                    mono
                  />
                  <KeyValue
                    label="EVM Wallet"
                    value={shortAddr(user.walletAddress)}
                    mono
                  />
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {xUrl ? (
                    <a
                      href={xUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-3 font-extrabold backdrop-blur-2xl transition hover:bg-white/10 hover:-translate-y-px active:translate-y-0 shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                    >
                      Open X ↗
                    </a>
                  ) : null}

                  {publicUrl ? (
                    <Link
                      href={publicUrl}
                      className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-5 py-3 font-extrabold text-black ring-1 ring-black/15 transition hover:brightness-110 shadow-[0_18px_60px_rgba(212,175,55,0.20)]"
                    >
                      Public URL
                    </Link>
                  ) : null}

                  {nftsUrl ? (
                    <Link
                      href={nftsUrl}
                      className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-5 py-3 text-[13px] font-extrabold text-black ring-1 ring-black/15 transition hover:brightness-110 hover:-translate-y-px active:translate-y-0 shadow-[0_18px_60px_rgba(212,175,55,0.18)]"
                    >
                      NFTs →
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <Reveal delayMs={110}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="ring-1 ring-white/5">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-sm font-extrabold">X (Twitter)</div>
                <div className="mt-1 text-xs text-white/60">
                  Verified Social Identity
                </div>
              </div>
              <StatusPill
                ok={twitterConnected}
                text={twitterConnected ? "Active" : "Unlinked"}
              />
            </div>

            {twitterConnected ? (
              <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <Avatar src={user.twitterImage} fallback="X" size="md" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-extrabold text-white/90">
                    {user.twitterName || "—"}
                  </div>
                  <div className="truncate font-mono text-xs text-white/40">
                    @{user.twitterUser}
                  </div>
                </div>
                {xUrl ? (
                  <a
                    href={xUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-xs font-semibold text-[#d4af37] transition hover:brightness-110"
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
                    <div className="truncate text-sm font-extrabold text-white/80">
                      Not connected
                    </div>
                    <div className="mt-0.5 text-xs text-white/40">
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
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-sm font-extrabold">Discord</div>
                <div className="mt-1 text-xs text-white/60">
                  Verified Social Identity
                </div>
              </div>
              <StatusPill
                ok={discordConnected}
                text={discordConnected ? "Active" : "Unlinked"}
              />
            </div>

            {discordConnected ? (
              <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <Avatar src={user.discordImage} fallback="DC" size="md" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-extrabold text-white/90">
                    {user.discordName || "—"}
                  </div>
                  <div className="truncate font-mono text-xs text-white/40">
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
                    <div className="truncate text-sm font-extrabold text-white/80">
                      Not connected
                    </div>
                    <div className="mt-0.5 text-xs text-white/40">
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
      </Reveal>

      <Reveal delayMs={190}>
        <footer className="pt-6 text-center text-[10px] font-black uppercase tracking-[0.4em] text-white/20">
          Realife Ecosystem • Identity Verified
        </footer>
      </Reveal>
    </div>
  );
}