// app/api/profile/email/verify-code/route.ts
//
// Юзер ввёл код из письма → проверяем и помечаем email как verified.
// Защита от подбора: 5 попыток на один код, потом код удаляется.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_ATTEMPTS = 5;

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
    const codeRaw = String(body?.code || "").trim();

    if (!/^\d{6}$/.test(codeRaw)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_CODE_FORMAT" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { contactEmail: true },
    });

    if (!user?.contactEmail) {
      return NextResponse.json(
        { ok: false, error: "NO_PENDING_EMAIL" },
        { status: 400 }
      );
    }

    const record = await prisma.emailVerificationCode.findFirst({
      where: {
        userId: uid,
        email: user.contactEmail,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return NextResponse.json(
        { ok: false, error: "CODE_NOT_FOUND" },
        { status: 400 }
      );
    }

    if (record.expiresAt.getTime() < Date.now()) {
      // Удаляем просроченный код
      await prisma.emailVerificationCode
        .delete({ where: { id: record.id } })
        .catch(() => null);
      return NextResponse.json(
        { ok: false, error: "CODE_EXPIRED" },
        { status: 400 }
      );
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      await prisma.emailVerificationCode
        .delete({ where: { id: record.id } })
        .catch(() => null);
      return NextResponse.json(
        { ok: false, error: "TOO_MANY_ATTEMPTS" },
        { status: 400 }
      );
    }

    if (record.code !== codeRaw) {
      await prisma.emailVerificationCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json(
        {
          ok: false,
          error: "CODE_MISMATCH",
          attemptsLeft: MAX_ATTEMPTS - record.attempts - 1,
        },
        { status: 400 }
      );
    }

    // Успех — помечаем email как verified и удаляем все коды
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: uid },
        data: {
          contactEmailVerifiedAt: now,
          emailNotificationsEnabled: true,
        },
      });

      await tx.emailVerificationCode.deleteMany({
        where: { userId: uid },
      });
    });

    return NextResponse.json({
      ok: true,
      contactEmail: user.contactEmail,
      verifiedAt: now.toISOString(),
    });
  } catch (e) {
    console.error("[API_PROFILE_EMAIL_VERIFY_CODE_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}
