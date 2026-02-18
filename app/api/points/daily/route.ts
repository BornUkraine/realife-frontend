import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// UTC "today" boundaries (стабильно для сервера)
function startOfTodayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}
function startOfTomorrowUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0));
}

export async function POST() {
  // Благодаря нашему next-auth.d.ts здесь не нужен :any
  const session = await getServerSession(authOptions);

  if (!session?.userId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const now = new Date();
  const todayStart = startOfTodayUTC(now);
  const tomorrowStart = startOfTomorrowUTC(now);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Ищем юзера и проверяем, существует ли он
      const user = await tx.user.findUnique({
        where: { id: session.userId }, // TS знает, что userId — это string
        select: { id: true, points: true, lastDailyAt: true },
      });

      if (!user) {
        return { status: 404 as const, body: { ok: false } };
      }

      // ✅ Самый надёжный анти-дабл: проверяем запись в логах за сегодня
      // Это лучше, чем просто проверять lastDailyAt, так как защищает от сбоев даты
      const already = await tx.pointEvent.findFirst({
        where: {
          userId: user.id,
          type: "DAILY",
          createdAt: {
            gte: todayStart,
            lt: tomorrowStart,
          },
        },
        select: { id: true },
      });

      if (already) {
        return {
          status: 400 as const,
          body: { 
            ok: false, 
            message: "Already claimed today", 
            points: user.points ?? 0 
          },
        };
      }

      // Обновляем баланс
      const updated = await tx.user.update({
        where: { id: user.id },
        data: { 
          points: { increment: 10 }, 
          lastDailyAt: now 
        },
        select: { points: true },
      });

      // Записываем событие в историю
      await tx.pointEvent.create({
        data: { 
          userId: user.id, 
          type: "DAILY", 
          points: 10 
        },
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