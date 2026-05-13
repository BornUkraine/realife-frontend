// app/api/profile/email/disconnect/route.ts
//
// Удалить contact email и все коды верификации.
// После этого email уведомления будут идти на googleEmail (если есть) или
// никуда (для Web3 юзеров).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
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

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: uid },
        data: {
          contactEmail: null,
          contactEmailVerifiedAt: null,
        },
      });

      await tx.emailVerificationCode.deleteMany({
        where: { userId: uid },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[API_PROFILE_EMAIL_DISCONNECT_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}
