import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.userId) return NextResponse.json({ ok: false }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ ok: false }, { status: 404 });

  const now = new Date();
  const last = user.lastDailyAt;
  const can =
    !last || now.getTime() - new Date(last).getTime() > 24 * 60 * 60 * 1000;

  if (!can) {
    return NextResponse.json({ ok: false, message: "Already claimed" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      points: { increment: 10 },
      lastDailyAt: now,
    },
  });

  await prisma.pointEvent.create({
    data: { userId: user.id, type: "DAILY", points: 10 },
  });

  return NextResponse.json({ ok: true, add: 10 });
}
