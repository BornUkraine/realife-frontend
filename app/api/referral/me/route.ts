import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      points: true,
      walletAddress: true, // server-verified wallet

      referralCode: true,
      referredById: true,
      referredAt: true,

      referredBy: { select: { referralCode: true } },

      // сколько людей ты пригласил
      _count: { select: { referrals: true } },
    },
  });

  if (!u) return NextResponse.json({ ok: false }, { status: 404 });

  const origin = String(process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  const inviteLink =
    origin && u.referralCode
      ? `${origin}/app/referrals?ref=${encodeURIComponent(u.referralCode)}`
      : null;

  return NextResponse.json({
    ok: true,
    points: u.points ?? 0,
    walletAddress: u.walletAddress ?? null,

    referralCode: u.referralCode ?? null,
    referredByCode: u.referredBy?.referralCode ?? null,
    invitedCount: u._count?.referrals ?? 0,
    inviteLink,
  });
}