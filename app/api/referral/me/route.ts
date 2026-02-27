import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeCode(raw: string) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.userId;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      points: true,
      referralCode: true,
      referredById: true,
      referredAt: true,
      referredBy: { select: { referralCode: true } },
      _count: { select: { referrals: true } },
    },
  });

  if (!u) return NextResponse.json({ ok: false }, { status: 404 });

  const origin =
    (process.env.NEXTAUTH_URL || "").replace(/\/$/, "") ||
    "";

  const inviteLink =
    origin && u.referralCode ? `${origin}/app/referrals?ref=${encodeURIComponent(u.referralCode)}` : null;

  // pull pending ref from cookie-less place: localStorage is handled client-side,
  // but we can still return null and let page read from localStorage.
  // We'll try query param persistence on client.

  return NextResponse.json({
    ok: true,
    points: u.points ?? 0,
    referralCode: u.referralCode ?? null,
    referredByCode: u.referredBy?.referralCode ? normalizeCode(u.referredBy.referralCode) : null,
    invitedCount: u._count?.referrals ?? 0,
    inviteLink,
    pendingRef: null,
  });
}