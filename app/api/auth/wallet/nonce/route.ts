import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function randNonce(len = 24) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function GET(req: NextRequest) {
  const addressRaw = req.nextUrl.searchParams.get("address") || "";
  const address = addressRaw.trim().toLowerCase();

  if (!address || !address.startsWith("0x") || address.length < 10) {
    return NextResponse.json({ ok: false, error: "bad_address" }, { status: 400 });
  }

  const nonce = randNonce(28);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await prisma.walletNonce.upsert({
    where: { address },
    create: { address, nonce, expiresAt },
    update: { nonce, expiresAt },
  });

  // Сообщение фиксированное — именно его мы проверим на сервере
  const message =
    `Realife wallet verification\n` +
    `Address: ${address}\n` +
    `Nonce: ${nonce}\n` +
    `URI: ${process.env.NEXTAUTH_URL ?? ""}`;

  return NextResponse.json({ ok: true, address, nonce, message, expiresAt });
}
