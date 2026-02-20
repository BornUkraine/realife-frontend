import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_PREFIX = "/u";

// 👇 Селектор полей (исключаем Discord, пока он не нужен)
const userSelect = {
  id: true,
  handle: true,
  publicId: true,
  points: true,
  walletAddress: true,
  walletChainId: true,
  createdAt: true,
  // X (Twitter) поля
  twitterId: true,
  twitterUser: true,
  twitterName: true,
  twitterImage: true,
} as const;

function shortAddr(addr?: string | null) {
  if (!addr) return "—";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: keyRaw } = await params;
  const key = decodeURIComponent(keyRaw || "").trim();

  if (!key) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { handle: { equals: key, mode: "insensitive" } },
          { publicId: { equals: key, mode: "insensitive" } },
        ],
      },
      select: userSelect,
    });

    if (!user) {
      return NextResponse.json({ ok: false, reason: "USER_NOT_FOUND" }, { status: 404 });
    }

    const twitterConnected = Boolean(user.twitterId);
    const xHandle = user.twitterUser ? `@${user.twitterUser}` : null;

    // 👇 Логика Display Name: X -> Handle -> Кошелек
    const displayName =
      user.twitterName ||
      xHandle ||
      (user.handle ? `@${user.handle}` : null) || 
      shortAddr(user.walletAddress);

    // 👇 Аватарка подтягивается из X
    const mainAvatar = user.twitterImage || null;

    const publicKey = user.handle || user.publicId || null;
    const publicUrl = publicKey && publicKey !== "tmp" ? `${PUBLIC_PREFIX}/${publicKey}` : null;

    return NextResponse.json({
      ok: true,
      user: {
        ...user,
        twitterConnected,
        discordConnected: false, // Заглушка, Дискорд пока отключен по твоему решению
        displayName,
        xHandle,
        mainAvatar,
        publicKey,
        publicUrl,
      },
    });
  } catch (e) {
    console.error("[API_PUBLIC_USER_ERROR]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}