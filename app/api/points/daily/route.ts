import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST() {
  const session: any = await getServerSession(authOptions);

  if (!session?.userId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: session.userId },
        select: { id: true, lastDailyAt: true },
      });

      if (!user) return { status: 404 as const, body: { ok: false } };

      const last = user.lastDailyAt ? new Date(user.lastDailyAt).getTime() : 0;
      const canClaim = !user.lastDailyAt || now.getTime() - last > DAY_MS;

      if (!canClaim) {
        return {
          status: 400 as const,
          body: { ok: false, message: "Already claimed" },
        };
      }

      await tx.user.update({
        where: { id: user.id },
        data: { points: { increment: 10 }, lastDailyAt: now },
      });

      await tx.pointEvent.create({
        data: { userId: user.id, type: "DAILY", points: 10 },
      });

      return { status: 200 as const, body: { ok: true, add: 10 } };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (e) {
    console.error("DAILY_ERROR", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
