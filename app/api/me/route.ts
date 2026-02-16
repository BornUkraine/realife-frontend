import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SessionExtra = { userId?: string; linkError?: string };

function randomId(len = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function ensurePublicId(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { publicId: true } });
  if (u?.publicId) return u.publicId;

  for (let i = 0; i < 10; i++) {
    const pid = `rl_${randomId(6)}`;
    const taken = await prisma.user.findUnique({ where: { publicId: pid }, select: { id: true } });
    if (!taken) {
      await prisma.user.update({ where: { id: userId }, data: { publicId: pid } });
      return pid;
    }
  }
  throw new Error("PUBLIC_ID_GENERATION_FAILED");
}

export async function GET() {
  const session = (await getServerSession(authOptions)) as SessionExtra | null;

  if (!session?.userId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // на всякий случай (если миграция сделала publicId nullable)
  await ensurePublicId(session.userId);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
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

      lastDailyAt: true,
      createdAt: true,
    },
  });

  if (!user) return NextResponse.json({ ok: false }, { status: 404 });

  const publicUrl = user.handle
    ? `/u/${user.handle}`
    : user.publicId
    ? `/u/${user.publicId}`
    : null;

  return NextResponse.json({
    ok: true,
    user: { ...user, publicUrl },
    linkError: session.linkError ?? null,
  });
}
