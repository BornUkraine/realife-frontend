// app/api/profile/email/request-code/route.ts
//
// Пользователь вводит email в профиле → нажимает Send code.
// Эндпоинт сохраняет email как unverified, генерирует 6-значный код
// и шлёт его на этот email. Юзер вводит код через /verify-code.
//
// Rate limit: не больше 5 кодов за 15 минут на одного юзера.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateCode,
  getCodeExpiresAt,
  isValidEmail,
  normalizeEmail,
  sendVerificationCode,
} from "@/lib/emailVerification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 минут
const RATE_LIMIT_MAX = 5;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const uid =
      (session as any)?.userId || (session as any)?.user?.id || null;

    if (!uid) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const emailRaw = String(body?.email || "").trim();
    const email = normalizeEmail(emailRaw);

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_EMAIL" },
        { status: 400 }
      );
    }

    // Rate limit: подсчитываем сколько кодов запросил юзер за последние 15 мин
    const recentCount = await prisma.emailVerificationCode.count({
      where: {
        userId: uid,
        createdAt: { gt: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
      },
    });

    if (recentCount >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        {
          ok: false,
          error: "RATE_LIMIT",
          message: "Too many code requests. Please wait 15 minutes.",
        },
        { status: 429 }
      );
    }

    const code = generateCode();
    const expiresAt = getCodeExpiresAt();

    // Очищаем старые коды для этого юзера+email и создаём новый
    await prisma.$transaction(async (tx) => {
      await tx.emailVerificationCode.deleteMany({
        where: { userId: uid, email },
      });

      await tx.emailVerificationCode.create({
        data: {
          userId: uid,
          email,
          code,
          expiresAt,
        },
      });

      // Сохраняем email на User как unverified (если ещё не сохранён или другой)
      await tx.user.update({
        where: { id: uid },
        data: {
          contactEmail: email,
          contactEmailVerifiedAt: null, // обнуляем верификацию при смене email
        },
      });
    });

    // Шлём код. Если RESEND_API_KEY не настроен — sendVerificationCode
    // тихо логирует и возвращает ok:false, но мы всё равно отвечаем 200,
    // чтобы юзер не видел внутренней проблемы конфигурации.
    const sendResult = await sendVerificationCode({ email, code });

    if (!sendResult.ok) {
      console.error(
        "[email/request-code] failed to send:",
        sendResult.error
      );
      // НЕ откатываем код в БД — но просим юзера попробовать снова
      return NextResponse.json(
        {
          ok: false,
          error: "EMAIL_SEND_FAILED",
          message:
            "Could not send verification email. Please try again later or contact support.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      email,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (e) {
    console.error("[API_PROFILE_EMAIL_REQUEST_CODE_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}
