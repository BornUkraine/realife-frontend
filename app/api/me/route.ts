import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.userId) return NextResponse.json({ ok: false }, { status: 401 });

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

  return NextResponse.json({ ok: true, user });
}
