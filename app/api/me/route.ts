import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session: any = await getServerSession(authOptions);

  if (!session?.userId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      points: true,
      twitterUser: true,
      twitterName: true,
      twitterImage: true,
      discordUser: true,
      discordName: true,
      discordImage: true,
      lastDailyAt: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  return NextResponse.json({ ok: true, user });
}
