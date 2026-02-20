import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_PREFIX = "/u";

// 👇 Возвращаем социальные поля в выборку
const userSelect = {
  id: true,
  handle: true,
  publicId: true,
  points: true,
  walletAddress: true,
  walletChainId: true,
  createdAt: true,
  twitterId: true,
  twitterUser: true,
  twitterName: true,
  twitterImage: true,
} as const;

function pickPublicKey(user: { handle: string | null; publicId: string | null }) {
  return user.handle || user.publicId || null;
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
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const walletConnected = Boolean(user.walletAddress);
  const twitterConnected = Boolean(user.twitterId);

  const xHandle = user.twitterUser ? `@${user.twitterUser}` : null;

  // 👇 Приоритет имени: X -> Handle -> Кошелек
  const displayName =
    user.twitterName ||
    xHandle ||
    (user.handle ? `@${user.handle}` : null) || 
    (user.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : "Realife user");

  // 👇 Аватарка теперь подтягивается из X
  const mainAvatar = user.twitterImage || null;

  const publicKey = pickPublicKey({
    handle: user.handle ?? null,
    publicId: user.publicId ?? null,
  });

  const publicUrl =
    publicKey && publicKey !== "tmp" ? `${PUBLIC_PREFIX}/${publicKey}` : null;

  return NextResponse.json({
    ok: true,
    user: {
      ...user,
      walletConnected,
      twitterConnected,
      discordConnected: false, // Заглушка, Дискорд пока отключен
      displayName,
      xHandle,
      mainAvatar,
      publicKey,
      publicUrl,
    },
  });
}