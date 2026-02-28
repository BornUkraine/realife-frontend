import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function randomNonce(len = 24) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function normalizeCode(raw: string) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}

function isValidCode(code: string) {
  return /^[A-Z0-9_]{3,16}$/.test(code);
}

function keyFor(userId: string, action: "SET_CODE" | "APPLY", code: string) {
  return `ref:${userId}:${action}:${code || "-"}`;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const actionRaw = String(searchParams.get("action") || "").trim();
  const action = actionRaw === "SET_CODE" || actionRaw === "APPLY" ? (actionRaw as "SET_CODE" | "APPLY") : null;
  const code = normalizeCode(searchParams.get("code") || "");

  if (!action) {
    return NextResponse.json({ ok: false, message: "Bad action" }, { status: 400 });
  }

  // ✅ nonce выдаём только под валидный code
  if (!code || !isValidCode(code)) {
    return NextResponse.json({ ok: false, message: "Invalid code" }, { status: 400 });
  }

  const nonce = randomNonce();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  const k = keyFor(userId, action, code);

  await prisma.walletNonce.upsert({
    where: { address: k },
    create: { address: k, nonce, expiresAt },
    update: { nonce, expiresAt },
  });

  return NextResponse.json({ ok: true, nonce, expiresAt: expiresAt.toISOString() });
}