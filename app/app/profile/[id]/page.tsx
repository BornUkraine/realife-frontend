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

function cleanHandle(v?: string | null) {
  return String(v || "").replace(/^@+/, "").trim();
}

function formatDate(v?: Date | string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en", { month: "short", year: "numeric" });
}

function resolveMediaUrl(src?: string | null) {
  const v = String(src || "").trim();
  if (!v) return null;
  if (v.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${v.replace("ipfs://", "")}`;
  return v;
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

function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "ok" | "gold" | "warn" }) {
  const cls =
    tone === "ok"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
      : tone === "gold"
        ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
        : tone === "warn"
          ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
          : "border-white/10 bg-white/[0.06] text-white/70";

  return <span className={cx("inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold", cls)}>{children}</span>;
}

function Avatar({ src, fallback, className = "" }: { src?: string | null; fallback: string; className?: string }) {
  return (
    <div
      className={cx(
        "flex h-20 w-20 items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.06] shadow-[0_20px_80px_rgba(0,0,0,0.35)] ring-1 ring-black/15",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={fallback} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="text-sm font-black text-white/40">{fallback}</span>
      )}
    </div>
  );
}

function SocialIcon({ kind }: { kind: "x" | "discord" }) {
  if (kind === "x") {
    return (
      <svg width="17" height="17" viewBox="0 0 1200 1227" fill="none" aria-hidden="true">
        <path
          d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.802 750.218L842.672 1226.37H1200L714.163 519.284ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.828Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg width="19" height="19" viewBox="0 0 256 199" fill="none" aria-hidden="true">
      <path
        d="M216.856 16.597A208.502 208.502 0 0 0 164.042 0c-2.204 3.97-4.81 9.289-6.59 13.506a193.512 193.512 0 0 0-58.902 0C96.77 9.289 94.13 3.97 91.93 0a207.853 207.853 0 0 0-52.818 16.597C5.615 67.028-3.49 116.113 1.052 164.49c22.274 16.52 43.834 26.58 65.027 33.17 5.27-7.185 9.95-14.81 13.98-22.822-7.66-2.9-14.97-6.46-21.95-10.61 1.84-1.35 3.64-2.76 5.4-4.2 42.34 19.77 88.26 19.77 130.1 0 1.78 1.46 3.6 2.86 5.43 4.2-6.99 4.16-14.32 7.72-21.99 10.63 4.03 7.99 8.72 15.62 13.98 22.8 21.21-6.59 42.78-16.65 65.05-33.19 5.32-56.11-9.1-104.74-38.76-147.893ZM85.5 135.1c-12.5 0-22.9-11.5-22.9-25.6 0-14.1 10.1-25.6 22.9-25.6 12.8 0 23.2 11.6 22.9 25.6 0 14.1-10.1 25.6-22.9 25.6Zm85 0c-12.5 0-22.9-11.5-22.9-25.6 0-14.1 10.1-25.6 22.9-25.6 12.8 0 23.2 11.6 22.9 25.6 0 14.1-10.1 25.6-22.9 25.6Z"
        fill="currentColor"
      />
    </svg>
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

function SocialCard({
  kind,
  title,
  subtitle,
  avatar,
  username,
  href,
  connected,
}: {
  kind: "x" | "discord";
  title: string;
  subtitle: string;
  avatar?: string | null;
  username?: string | null;
  href?: string | null;
  connected: boolean;
}) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.052] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.24)] ring-1 ring-black/10 md:p-6">
      <div className="flex items-center gap-4 md:gap-5">
        <div className="relative shrink-0">
          <Avatar
            src={avatar}
            fallback={title.slice(0, 1)}
            className="h-[92px] w-[92px] rounded-[26px] md:h-[104px] md:w-[104px]"
          />
          <div className="absolute -right-2 -bottom-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-[#1b170d]/95 text-white shadow-[0_14px_45px_rgba(0,0,0,0.45)] ring-1 ring-amber-400/10">
            <SocialIcon kind={kind} />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="truncate text-base font-black text-white/90">{title}</div>
            <Pill tone={connected ? "ok" : "muted"}>{connected ? "Connected" : "Not linked"}</Pill>
          </div>
          <div className="mt-2 truncate text-sm text-white/55">
            {connected ? subtitle : "No public social account linked yet."}
          </div>
          {username && <div className="mt-2 truncate font-mono text-sm font-black text-amber-100/95">@{cleanHandle(username)}</div>}
        </div>
      </div>

      {href && connected && (
        <Link
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-white/15 bg-white/[0.065] px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
        >
          Open profile ↗
        </Link>
      )}
    </div>
  );
}

function NftPreviewCard({ nft }: { nft: PublicNftPreview }) {
  const img = resolveMediaUrl(nft.image);
  return (
    <Link
      href={`/app/trading/${encodeURIComponent(nft.mintId)}`}
      className="group overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.045] transition hover:-translate-y-0.5 hover:bg-white/[0.07]"
    >
      <div className="aspect-square bg-white/[0.04]">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={nft.name || `NFT #${nft.tokenId}`} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" referrerPolicy="no-referrer" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-black text-white/35">NFT</div>
        )}
      </div>
      <div className="p-3">
        <div className="truncate text-sm font-black text-white/85">{nft.name || `NFT #${nft.tokenId}`}</div>
        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-white/50">
          <span className="truncate">Token #{nft.tokenId}</span>
          <span className="font-mono">x{nft.amount}</span>
        </div>
      </div>
    </Link>
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

type PublicNftPreview = {
  mintId: string;
  tokenId: string;
  name: string | null;
  image: string | null;
  amount: string;
};

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

  const profileKey = targetUser.handle || targetUser.publicId || key;
  const encodedProfileKey = encodeURIComponent(profileKey);
  const appProfileUrl = `/app/profile/${encodedProfileKey}`;
  const nftsUrl = `/app/profile/${encodedProfileKey}/nfts`;

  const twitterUser = cleanHandle(targetUser.twitterUser);
  const discordUser = cleanHandle(targetUser.discordUser);

  const displayName =
    targetUser.twitterName ||
    targetUser.discordName ||
    targetUser.googleName ||
    (twitterUser ? `@${twitterUser}` : null) ||
    (discordUser ? `@${discordUser}` : null) ||
    (targetUser.handle ? `@${targetUser.handle}` : null) ||
    shortAddr(targetUser.walletAddress);

  const avatar = targetUser.twitterImage || targetUser.discordImage || targetUser.googleImage || null;

  const [nftCount, activeListingsCount, recentHoldings] = await Promise.all([
    prisma.holding.count({
      where: {
        userId: targetUser.id,
        amount: { gt: 0n },
        mint: { verified: true },
      },
    }),
    prisma.listing.count({
      where: {
        sellerId: targetUser.id,
        amountRemaining: { gt: 0n },
        adminHidden: false,
      },
    }),
    prisma.holding.findMany({
      where: {
        userId: targetUser.id,
        amount: { gt: 0n },
        mint: { verified: true },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        amount: true,
        tokenId: true,
        mint: {
          select: {
            id: true,
            name: true,
            image: true,
            metaImage: true,
            tokenId: true,
          },
        },
      },
    }),
  ]);

  const nftPreview: PublicNftPreview[] = recentHoldings.map((h) => ({
    mintId: h.mint.id,
    tokenId: h.mint.tokenId || h.tokenId,
    name: h.mint.name,
    image: h.mint.metaImage || h.mint.image,
    amount: h.amount.toString(),
  }));

  if (isOwner) {
    return (
      <ProfileClient
        ownerProfile={{
          profileKey,
          publicUrl: appProfileUrl,
          nftsUrl,
          displayName,
          avatar,
          nftCount,
          activeListingsCount,
          points: targetUser.points ?? 0,
          walletAddress: targetUser.walletAddress,
          joinedLabel: formatDate(targetUser.createdAt),
          nftPreview,
          twitterUser: twitterUser || null,
          twitterName: targetUser.twitterName,
          twitterImage: targetUser.twitterImage,
          discordUser: discordUser || null,
          discordName: targetUser.discordName,
          discordImage: targetUser.discordImage,
          googleName: targetUser.googleName,
          googleImage: targetUser.googleImage,
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            <Avatar src={avatar} fallback="RL" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white/55">Public Realife profile</div>
              <h1 className="mt-1 truncate text-3xl font-black tracking-tight text-white md:text-4xl">{displayName}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                {twitterUser && <Pill tone="gold">X @{twitterUser}</Pill>}
                {discordUser && <Pill tone="gold">Discord @{discordUser}</Pill>}
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
              View this profile’s NFTs →
            </Link>
            {currentUser ? (
              <Link
                href="/app/profile"
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
              >
                Back to my profile
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Field label="NFTs" value={nftCount} />
          <Field label="Active listings" value={activeListingsCount} />
          <Field label="Points" value={targetUser.points ?? 0} />
          <Field label="Wallet" value={shortAddr(targetUser.walletAddress)} mono />
          <Field label="Joined" value={formatDate(targetUser.createdAt)} />
        </div>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="lg:min-h-[470px]">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-black text-white">Social identity</div>
              <div className="mt-1 text-sm text-white/55">Public trust signals linked by the profile owner.</div>
            </div>
            <Pill tone={twitterUser || discordUser ? "ok" : "muted"}>{twitterUser || discordUser ? "Verified socials" : "No socials yet"}</Pill>
          </div>

          <div className="grid gap-4">
            <SocialCard
              kind="x"
              title="X / Twitter"
              subtitle={targetUser.twitterName || (twitterUser ? `@${twitterUser}` : "Linked X account")}
              avatar={targetUser.twitterImage}
              username={twitterUser}
              href={twitterUser ? `https://x.com/${twitterUser}` : null}
              connected={Boolean(twitterUser || targetUser.twitterId)}
            />
            <SocialCard
              kind="discord"
              title="Discord"
              subtitle={targetUser.discordName || (discordUser ? `@${discordUser}` : "Linked Discord account")}
              avatar={targetUser.discordImage}
              username={discordUser}
              connected={Boolean(discordUser || targetUser.discordId)}
            />
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-black text-white">NFTs held by this profile</div>
              <div className="mt-1 text-sm text-white/55">Public NFT holdings connected to this Realife account.</div>
            </div>
            <Pill tone={nftCount > 0 ? "gold" : "muted"}>{nftCount} NFTs</Pill>
          </div>

          {nftPreview.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {nftPreview.map((nft) => (
                <NftPreviewCard key={nft.mintId} nft={nft} />
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55">
              This profile has no public verified NFT holdings yet.
            </div>
          )}

          <Link
            href={nftsUrl}
            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
          >
            Open full NFT gallery →
          </Link>
        </Card>
      </div>

      <Card>
        <div className="text-sm leading-relaxed text-white/62">
          This is the public view of this Realife profile. Private controls, wallet actions, social linking,
          referral stats, daily rewards, and settings are only visible to the owner of this profile.
        </div>
      </Card>
    </div>
  );
}
