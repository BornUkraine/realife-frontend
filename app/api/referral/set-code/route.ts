import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMessage } from "viem";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    code?: string;
    nonce?: string;
    signature?: string;
    issuedAt?: string;
    origin?: string; // игнорируем
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

  // ✅ issuedAt проверяем
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
        select: { id: true, referralCode: true, walletAddress: true },
      });
      if (!me) return { status: 404 as const, body: { ok: false } };

      // Требуем server-verified wallet
      if (!me.walletAddress) {
        return { status: 400 as const, body: { ok: false, message: "Verify wallet first (top bar signature)." } };
      }

      if (me.referralCode) {
        return { status: 400 as const, body: { ok: false, message: "Referral code already set" } };
      }

      const k = keyFor(userId, "SET_CODE", code);
      const rec = await tx.walletNonce.findUnique({ where: { address: k } });
      if (!rec || rec.nonce !== nonce || rec.expiresAt < new Date()) {
        return { status: 400 as const, body: { ok: false, message: "Bad/expired nonce" } };
      }

      const message = buildMsg({ action: "SET_CODE", code, nonce, origin, issuedAt });

      const ok = await verifyMessage({
        address: me.walletAddress as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });

      if (!ok) return { status: 401 as const, body: { ok: false, message: "Bad signature" } };

      // одноразовый nonce
      await tx.walletNonce.delete({ where: { address: k } });

      // set code (может упасть по unique)
      const updated = await tx.user.update({
        where: { id: me.id },
        data: { referralCode: code },
        select: { referralCode: true },
      });

      return { status: 200 as const, body: { ok: true, referralCode: updated.referralCode } };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ ok: false, message: "Code already taken" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, message: "Server error" }, { status: 500 });
  }
}