import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REWARD = 50;

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
        select: { id: true, points: true, referredById: true, referredAt: true, referralCode: true },
      });
      if (!me) return { status: 404 as const, body: { ok: false } };

      if (me.referredById || me.referredAt) {
        return { status: 400 as const, body: { ok: false, message: "Referral already applied" } };
      }

      const referrer = await tx.user.findUnique({
        where: { referralCode: code },
        select: { id: true, points: true, referralCode: true },
      });

      if (!referrer) {
        return { status: 404 as const, body: { ok: false, message: "Invalid code" } };
      }

      if (referrer.id === me.id) {
        return { status: 400 as const, body: { ok: false, message: "Self referral is not allowed" } };
      }

      // set referral (one time)
      await tx.user.update({
        where: { id: me.id },
        data: { referredById: referrer.id, referredAt: new Date() },
      });

      // inviter event (+50) idempotent by unique(userId,type,refUserId)
      await tx.pointEvent.create({
        data: {
          userId: referrer.id,
          type: "REFERRAL_INVITER",
          points: REWARD,
          refUserId: me.id,
          meta: { code },
        },
      });

      // joiner event (+50) idempotent by unique(userId,type,refUserId)
      await tx.pointEvent.create({
        data: {
          userId: me.id,
          type: "REFERRAL_JOINER",
          points: REWARD,
          refUserId: referrer.id,
          meta: { code },
        },
      });

      const [refUpdated, meUpdated] = await Promise.all([
        tx.user.update({
          where: { id: referrer.id },
          data: { points: { increment: REWARD } },
          select: { points: true },
        }),
        tx.user.update({
          where: { id: me.id },
          data: { points: { increment: REWARD } },
          select: { points: true },
        }),
      ]);

      return {
        status: 200 as const,
        body: {
          ok: true,
          inviterAdd: REWARD,
          joinerAdd: REWARD,
          inviterPoints: refUpdated.points ?? 0,
          joinerPoints: meUpdated.points ?? 0,
        },
      };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (e: any) {
    // If unique constraint triggers (repeat), Prisma will throw.
    // Return friendly.
    return NextResponse.json({ ok: false, message: "Already rewarded / duplicate request" }, { status: 409 });
  }
}