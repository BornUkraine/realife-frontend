import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REWARD = 20;
const COOKIE_KEY = "rl_ref_pending";

function normalizeCode(raw: string) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}

function isValidCode(code: string) {
  return /^[A-Z0-9_]{3,16}$/.test(code);
}

async function awardReferralPoints(tx: any, params: { referrerId: string; joinerId: string; code: string }) {
  const { referrerId, joinerId, code } = params;

  const inviterEvent = await tx.pointEvent.createMany({
    data: [
      {
        userId: referrerId,
        type: "REFERRAL_INVITER",
        points: REWARD,
        refUserId: joinerId,
        meta: { code, source: "auto_claim" },
      },
    ],
    skipDuplicates: true,
  });

  const joinerEvent = await tx.pointEvent.createMany({
    data: [
      {
        userId: joinerId,
        type: "REFERRAL_JOINER",
        points: REWARD,
        refUserId: referrerId,
        meta: { code, source: "auto_claim" },
      },
    ],
    skipDuplicates: true,
  });

  const writes: Promise<unknown>[] = [];
  if ((inviterEvent?.count || 0) > 0) {
    writes.push(tx.user.update({ where: { id: referrerId }, data: { points: { increment: REWARD } } }));
  }
  if ((joinerEvent?.count || 0) > 0) {
    writes.push(tx.user.update({ where: { id: joinerId }, data: { points: { increment: REWARD } } }));
  }

  if (writes.length) await Promise.all(writes);

  return {
    inviterAdded: (inviterEvent?.count || 0) > 0 ? REWARD : 0,
    joinerAdded: (joinerEvent?.count || 0) > 0 ? REWARD : 0,
  };
}

function clearCookie(res: NextResponse) {
  res.cookies.set({
    name: COOKIE_KEY,
    value: "",
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId || (session as any)?.user?.id;

  if (!userId) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { code?: string };
  const cookieCode = req.cookies.get(COOKIE_KEY)?.value || "";
  const code = normalizeCode(body.code || cookieCode);

  if (!code || !isValidCode(code)) {
    const res = NextResponse.json({ ok: false, error: "INVALID_CODE" }, { status: 400 });
    clearCookie(res);
    return res;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const me = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          referralCode: true,
          referredById: true,
          referredAt: true,
        },
      });

      if (!me) return { status: 404 as const, body: { ok: false, error: "USER_NOT_FOUND" } };

      if (me.referralCode && normalizeCode(me.referralCode) === code) {
        return { status: 400 as const, body: { ok: false, error: "SELF_REFERRAL" } };
      }

      const referrer = await tx.user.findUnique({
        where: { referralCode: code },
        select: { id: true, referralCode: true },
      });

      if (!referrer) return { status: 404 as const, body: { ok: false, error: "INVALID_CODE" } };
      if (referrer.id === me.id) {
        return { status: 400 as const, body: { ok: false, error: "SELF_REFERRAL" } };
      }

      if (me.referredById && me.referredById !== referrer.id) {
        return {
          status: 200 as const,
          body: {
            ok: true,
            alreadyReferred: true,
            changed: false,
            rewarded: false,
            message: "User already has another referral source.",
          },
        };
      }

      if (!me.referredById) {
        await tx.user.update({
          where: { id: me.id },
          data: { referredById: referrer.id, referredAt: new Date() },
        });
      }

      const reward = await awardReferralPoints(tx, {
        referrerId: referrer.id,
        joinerId: me.id,
        code,
      });

      return {
        status: 200 as const,
        body: {
          ok: true,
          code,
          referrerId: referrer.id,
          changed: !me.referredById,
          alreadyReferred: Boolean(me.referredById),
          rewarded: reward.inviterAdded > 0 || reward.joinerAdded > 0,
          inviterAdd: reward.inviterAdded,
          joinerAdd: reward.joinerAdded,
        },
      };
    });

    const res = NextResponse.json(result.body, { status: result.status });
    if (result.status >= 200 && result.status < 300 && (result.body as any)?.ok) clearCookie(res);
    return res;
  } catch (e) {
    console.error("[REFERRAL_CLAIM_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
