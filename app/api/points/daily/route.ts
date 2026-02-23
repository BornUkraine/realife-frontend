import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * UTC "today" boundaries (stable for server)
 */
function startOfTodayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}
function startOfTomorrowUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0));
}

export async function POST() {
  const session = await getServerSession(authOptions);

  // Your next-auth.d.ts should provide session.userId
  const userId = session?.userId;
  if (!userId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const now = new Date();
  const todayStart = startOfTodayUTC(now);
  const tomorrowStart = startOfTomorrowUTC(now);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Ensure user exists
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, points: true, lastDailyAt: true },
      });

      if (!user) {
        return { status: 404 as const, body: { ok: false } };
      }

      // ✅ Strong idempotency: check event log for today (UTC)
      const already = await tx.pointEvent.findFirst({
        where: {
          userId: user.id,
          type: "DAILY",
          createdAt: { gte: todayStart, lt: tomorrowStart },
        },
        select: { id: true },
      });

      if (already) {
        return {
          status: 400 as const,
          body: { ok: false, message: "Already claimed today", points: user.points ?? 0 },
        };
      }

      // Update points + lastDailyAt
      const updated = await tx.user.update({
        where: { id: user.id },
        data: { points: { increment: 10 }, lastDailyAt: now },
        select: { points: true },
      });

      // Write event log
      await tx.pointEvent.create({
        data: { userId: user.id, type: "DAILY", points: 10 },
      });

      return {
        status: 200 as const,
        body: { ok: true, add: 10, points: updated.points ?? 0 },
      };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (e) {
    console.error("DAILY_ERROR", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}