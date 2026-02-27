import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeCode(raw: string) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}

function isValidCode(code: string) {
  return /^[A-Z0-9_]{3,16}$/.test(code);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.userId;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { code?: string };
  const code = normalizeCode(body.code || "");
  if (!code) return NextResponse.json({ ok: false, message: "Missing code" }, { status: 400 });
  if (!isValidCode(code))
    return NextResponse.json({ ok: false, message: "Invalid code format" }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const me = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, referralCode: true },
      });
      if (!me) return { status: 404 as const, body: { ok: false } };

      if (me.referralCode) {
        return { status: 400 as const, body: { ok: false, message: "Referral code already set" } };
      }

      const updated = await tx.user.update({
        where: { id: me.id },
        data: { referralCode: code },
        select: { referralCode: true },
      });

      return { status: 200 as const, body: { ok: true, referralCode: updated.referralCode } };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (e: any) {
    // unique collision
    return NextResponse.json({ ok: false, message: "Code already taken" }, { status: 409 });
  }
}