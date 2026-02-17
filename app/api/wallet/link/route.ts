import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recoverMessageAddress, getAddress, isAddress } from "viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = {
  address?: string;
  chainId?: number;
  signature?: `0x${string}`;
  message?: string;
};

function getCookie(req: Request, key: string) {
  const raw = req.headers.get("cookie") || "";
  const part = raw
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${key}=`));
  if (!part) return null;
  return decodeURIComponent(part.slice(key.length + 1));
}

function buildMessage(opts: {
  origin: string;
  userId: string;
  address: string;
  chainId?: number | null;
  nonce: string;
}) {
  const { origin, userId, address, chainId, nonce } = opts;
  return [
    "REALIFE — Link wallet",
    "",
    `Site: ${origin}`,
    `User: ${userId}`,
    `Wallet: ${address}`,
    `ChainId: ${chainId ?? "-"}`,
    `Nonce: ${nonce}`,
  ].join("\n");
}

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions);
  if (!session?.userId) return NextResponse.json({ ok: false }, { status: 401 });

  const nonce = getCookie(req, "rl_wallet_nonce");
  if (!nonce) {
    return NextResponse.json({ ok: false, error: "missing_nonce" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;

  const rawAddr = body.address?.trim();
  if (!rawAddr || !isAddress(rawAddr)) {
    return NextResponse.json({ ok: false, error: "bad_address" }, { status: 400 });
  }

  const address = getAddress(rawAddr);
  const chainId = Number.isFinite(body.chainId) ? Number(body.chainId) : null;

  const origin = new URL(req.url).origin;

  const expected = buildMessage({
    origin,
    userId: session.userId,
    address,
    chainId,
    nonce,
  });

  if (!body.signature || !body.message) {
    return NextResponse.json({ ok: false, error: "missing_signature" }, { status: 400 });
  }

  if (body.message !== expected) {
    return NextResponse.json({ ok: false, error: "message_mismatch" }, { status: 400 });
  }

  const recovered = await recoverMessageAddress({
    message: body.message,
    signature: body.signature,
  });

  if (getAddress(recovered) !== address) {
    return NextResponse.json({ ok: false, error: "bad_signature" }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        walletAddress: address,
        walletChainId: chainId,
      },
      select: { id: true },
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ ok: false, error: "wallet_already_linked" }, { status: 409 });
    }
    console.error("WALLET_LINK_ERROR", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true, address, chainId });

  // one-time nonce
  res.cookies.set("rl_wallet_nonce", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 0,
  });

  return res;
}
