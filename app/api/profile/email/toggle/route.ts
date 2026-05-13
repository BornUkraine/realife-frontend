// app/api/profile/email/toggle/route.ts
//
// Включить / выключить email уведомления.
// body: { enabled: boolean }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    const enabled = Boolean(body?.enabled);

    const updated = await prisma.user.update({
      where: { id: uid },
      data: { emailNotificationsEnabled: enabled },
      select: { emailNotificationsEnabled: true },
    });

    return NextResponse.json({
      ok: true,
      emailNotificationsEnabled: updated.emailNotificationsEnabled,
    });
  } catch (e) {
    console.error("[API_PROFILE_EMAIL_TOGGLE_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}
