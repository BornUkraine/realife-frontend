import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfileClient from "../ProfileClient";
import type { ReactNode } from "react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function normalizeKey(raw: string) {
  const key = safeDecode(raw || "").trim();
  if (!key || key.length > 64) return null;
  if (key.includes("/")) return null;
  if (!/^[a-zA-Z0-9_.-]+$/.test(key)) return null;
  return key;
}

function shortAddr(addr?: string | null) {
  const s = String(addr || "").trim();
  if (!s) return "—";
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-[30px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.24),rgba(212,175,55,0.11),rgba(184,135,10,0.10))]",
        "shadow-[0_26px_100px_rgba(0,0,0,0.60)]",
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#0b0a09]/25 backdrop-blur-2xl ring-1 ring-black/10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_0%,rgba(212,175,55,0.12),transparent_45%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_86%_120%,rgba(255,255,255,0.06),transparent_55%)]" />
        </div>
        <div className="relative z-10 p-6 md:p-7">{children}</div>
      </div>
    </div>
  );
}

function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "ok" | "gold" }) {
  const cls =
    tone === "ok"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
      : tone === "gold"
        ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
        : "border-white/10 bg-white/[0.06] text-white/70";

  return <span className={cx("inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold", cls)}>{children}</span>;
}

function Avatar({ src, fallback }: { src?: string | null; fallback: string }) {
  return (
    <div className="h-20 w-20 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.06] shadow-[0_20px_80px_rgba(0,0,0,0.35)] ring-1 ring-black/15 flex items-center justify-center">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={fallback} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="text-sm font-black text-white/40">{fallback}</span>
      )}
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{label}</div>
      <div className={cx("mt-1 truncate text-sm font-bold text-white/85", mono && "font-mono text-[13px]")}>{value}</div>
    </div>
  );
}

const targetUserSelect = {
  id: true,
  createdAt: true,
  handle: true,
  publicId: true,
  points: true,
  walletAddress: true,
  walletChainId: true,
  authMethod: true,
  walletKind: true,
  embeddedWalletProvider: true,
  googleName: true,
  googleImage: true,
  twitterId: true,
  twitterUser: true,
  twitterName: true,
  twitterImage: true,
  discordId: true,
  discordUser: true,
  discordName: true,
  discordImage: true,
} as const;

export default async function SmartProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const key = normalizeKey(rawId);
  if (!key) notFound();

  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [
        { handle: { equals: key, mode: "insensitive" } },
        { publicId: { equals: key, mode: "insensitive" } },
      ],
    },
    select: targetUserSelect,
  });

  if (!targetUser) notFound();

  const session = await getServerSession(authOptions);
  const uid = (session as any)?.userId || (session as any)?.user?.id;

  const currentUser = uid
    ? await prisma.user.findUnique({
        where: { id: uid },
        select: { id: true, walletAddress: true },
      })
    : null;

  const isOwner = Boolean(
    currentUser &&
      (currentUser.id === targetUser.id ||
        (normAddr(currentUser.walletAddress) && normAddr(currentUser.walletAddress) === normAddr(targetUser.walletAddress))),
  );

  if (isOwner) {
    return <ProfileClient />;
  }

  const profileKey = targetUser.handle || targetUser.publicId || key;
  const nftsUrl = `/u/${encodeURIComponent(profileKey)}/nfts`;

  const displayName =
    targetUser.twitterName ||
    targetUser.discordName ||
    targetUser.googleName ||
    (targetUser.twitterUser ? `@${targetUser.twitterUser}` : null) ||
    (targetUser.discordUser ? `@${targetUser.discordUser}` : null) ||
    (targetUser.handle ? `@${targetUser.handle}` : null) ||
    shortAddr(targetUser.walletAddress);

  const avatar = targetUser.twitterImage || targetUser.discordImage || targetUser.googleImage || null;

  const nftCount = await prisma.holding.count({
    where: {
      userId: targetUser.id,
      amount: { gt: 0n },
      mint: { verified: true },
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            <Avatar src={avatar} fallback="RL" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white/55">Public profile</div>
              <h1 className="mt-1 truncate text-3xl font-black tracking-tight text-white md:text-4xl">{displayName}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                {targetUser.twitterUser && <Pill tone="gold">@{targetUser.twitterUser}</Pill>}
                {targetUser.discordUser && <Pill tone="gold">Discord @{targetUser.discordUser}</Pill>}
                {targetUser.googleName && <Pill>Google profile</Pill>}
                {targetUser.walletAddress && <Pill tone="ok">Wallet linked</Pill>}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
            <Link
              href={nftsUrl}
              className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-5 py-3 text-sm font-black text-black shadow-[0_18px_60px_rgba(212,175,55,0.18)] ring-1 ring-black/15 transition hover:-translate-y-px hover:brightness-110 active:translate-y-0"
            >
              View NFTs →
            </Link>
            <Link
              href="/app/profile"
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
            >
              Open my profile
            </Link>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="NFTs" value={nftCount} />
          <Field label="Points" value={targetUser.points ?? 0} />
          <Field label="Wallet" value={shortAddr(targetUser.walletAddress)} mono />
          <Field label="Profile ID" value={targetUser.publicId || "—"} mono />
        </div>
      </Card>

      <Card>
        <div className="text-sm leading-relaxed text-white/62">
          This is a public view of this Realife profile. Private controls, wallet actions, social linking,
          referrals, daily rewards, and settings are only visible to the owner of this profile.
        </div>
      </Card>
    </div>
  );
}
