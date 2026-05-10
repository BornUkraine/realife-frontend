import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMessage } from "viem";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REWARD = 20;

function normalizeCode(raw: string) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}
function isValidCode(code: string) {
  return /^[A-Z0-9_]{3,16}$/.test(code);
}
function keyFor(userId: string, action: "SET_CODE" | "APPLY", code: string) {
  return `ref:${userId}:${action}:${code || "-"}`;
}
function buildMsg(params: {
  action: "SET_CODE" | "APPLY";
  code: string;
  nonce: string;
  origin: string;
  issuedAt: string;
}) {
  return `Realife Referral Confirmation
Action: ${params.action}
Code: ${params.code}
Nonce: ${params.nonce}
URI: ${params.origin}
Issued At: ${params.issuedAt}`;
}

function originServer() {
  return String(process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
}

function validateIssuedAt(issuedAt: string) {
  const t = Date.parse(issuedAt);
  if (!Number.isFinite(t)) return false;
  const drift = Math.abs(Date.now() - t);
  return drift <= 15 * 60 * 1000; // 15 min
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
        meta: { code, source: "manual_apply" },
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
        meta: { code, source: "manual_apply" },
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

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = ((session as any)?.userId || (session as any)?.user?.id) as string | undefined;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    code?: string;
    nonce?: string;
    signature?: string;
    issuedAt?: string;
    origin?: string; // ignored
  };

  const code = normalizeCode(body.code || "");
  const nonce = String(body.nonce || "").trim();
  const signature = String(body.signature || "").trim();
  const issuedAt = String(body.issuedAt || "").trim();

  if (!code || !isValidCode(code)) {
    return NextResponse.json({ ok: false, message: "Invalid code" }, { status: 400 });
  }
  if (!nonce || !signature || !issuedAt) {
    return NextResponse.json({ ok: false, message: "Missing signature payload" }, { status: 400 });
  }

  if (!validateIssuedAt(issuedAt)) {
    return NextResponse.json({ ok: false, message: "Bad issuedAt" }, { status: 400 });
  }

  const origin = originServer();
  if (!origin) {
    return NextResponse.json({ ok: false, message: "Server origin not configured" }, { status: 500 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const me = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, walletAddress: true, referredById: true, referredAt: true, referralCode: true },
      });
      if (!me) return { status: 404 as const, body: { ok: false } };

      if (!me.walletAddress) {
        return { status: 400 as const, body: { ok: false, message: "Verify wallet first (top bar signature)." } };
      }

      if (me.referralCode && normalizeCode(me.referralCode) === code) {
        return { status: 400 as const, body: { ok: false, message: "Self referral is not allowed" } };
      }

      const referrer = await tx.user.findUnique({
        where: { referralCode: code },
        select: { id: true },
      });

      if (!referrer) return { status: 404 as const, body: { ok: false, message: "Invalid code" } };
      if (referrer.id === me.id) {
        return { status: 400 as const, body: { ok: false, message: "Self referral is not allowed" } };
      }

      if (me.referredById && me.referredById !== referrer.id) {
        return { status: 400 as const, body: { ok: false, message: "Referral already applied to another code" } };
      }

      const k = keyFor(userId, "APPLY", code);
      const rec = await tx.walletNonce.findUnique({ where: { address: k } });
      if (!rec || rec.nonce !== nonce || rec.expiresAt < new Date()) {
        return { status: 400 as const, body: { ok: false, message: "Bad/expired nonce" } };
      }

      const message = buildMsg({ action: "APPLY", code, nonce, origin, issuedAt });

      const ok = await verifyMessage({
        address: me.walletAddress as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });

      if (!ok) return { status: 401 as const, body: { ok: false, message: "Bad signature" } };

      await tx.walletNonce.delete({ where: { address: k } });

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

      const [refUpdated, meUpdated] = await Promise.all([
        tx.user.findUnique({ where: { id: referrer.id }, select: { points: true } }),
        tx.user.findUnique({ where: { id: me.id }, select: { points: true } }),
      ]);

      return {
        status: 200 as const,
        body: {
          ok: true,
          alreadyApplied: Boolean(me.referredById),
          inviterAdd: reward.inviterAdded,
          joinerAdd: reward.joinerAdded,
          inviterPoints: refUpdated?.points ?? 0,
          joinerPoints: meUpdated?.points ?? 0,
        },
      };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (e: any) {
    console.error("[REFERRAL_APPLY_ERROR]", e);
    if (e?.code === "P2002") {
      return NextResponse.json({ ok: false, message: "Already rewarded / duplicate request" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, message: "Server error" }, { status: 500 });
  }
}
