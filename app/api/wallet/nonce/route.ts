import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function randomNonce(len = 36) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export async function GET() {
  const session: any = await getServerSession(authOptions);
  if (!session?.userId) return NextResponse.json({ ok: false }, { status: 401 });

  const nonce = randomNonce(36);

  const res = NextResponse.json({ ok: true, nonce });

  res.cookies.set("rl_wallet_nonce", nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 10,
  });

  return res;
}
