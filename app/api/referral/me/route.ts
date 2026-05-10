import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function displayName(u: any) {
  return (
    u.twitterName ||
    u.discordName ||
    u.googleName ||
    (u.twitterUser ? `@${u.twitterUser}` : null) ||
    (u.discordUser ? `@${u.discordUser}` : null) ||
    (u.handle ? `@${u.handle}` : null) ||
    u.publicId ||
    null
  );
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId || (session as any)?.user?.id;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      points: true,
      walletAddress: true,

      handle: true,
      publicId: true,
      googleName: true,
      googleImage: true,
      twitterUser: true,
      twitterName: true,
      twitterImage: true,
      discordUser: true,
      discordName: true,
      discordImage: true,

      referralCode: true,
      referredById: true,
      referredAt: true,

      referredBy: {
        select: {
          id: true,
          handle: true,
          publicId: true,
          referralCode: true,
          googleName: true,
          googleImage: true,
          twitterUser: true,
          twitterName: true,
          twitterImage: true,
          discordUser: true,
          discordName: true,
          discordImage: true,
        },
      },

      _count: { select: { referrals: true } },
    },
  });

  if (!u) return NextResponse.json({ ok: false }, { status: 404 });

  const origin = String(process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  const inviteLink =
    origin && u.referralCode
      ? `${origin}/?ref=${encodeURIComponent(u.referralCode)}`
      : null;

  return NextResponse.json({
    ok: true,
    points: u.points ?? 0,
    walletAddress: u.walletAddress ?? null,

    displayName: displayName(u),
    avatar: u.twitterImage || u.discordImage || u.googleImage || null,

    referralCode: u.referralCode ?? null,
    referredByCode: u.referredBy?.referralCode ?? null,
    referredAt: u.referredAt ? u.referredAt.toISOString() : null,
    referredBy: u.referredBy
      ? {
          id: u.referredBy.id,
          code: u.referredBy.referralCode ?? null,
          label: displayName(u.referredBy),
          avatar: u.referredBy.twitterImage || u.referredBy.discordImage || u.referredBy.googleImage || null,
        }
      : null,
    invitedCount: u._count?.referrals ?? 0,
    inviteLink,
  });
}
