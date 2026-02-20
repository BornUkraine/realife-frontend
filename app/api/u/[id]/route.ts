import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_PREFIX = "/u";

// Очищенная выборка: только базовые данные и кошелек
const userSelect = {
  id: true,
  handle: true,
  publicId: true,
  points: true,
  walletAddress: true,
  walletChainId: true,
  createdAt: true,
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

  // Поиск пользователя по handle или publicId (регистронезависимый)
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

  // Логика состояния (теперь только кошелек)
  const walletConnected = Boolean(user.walletAddress);

  // Имя пользователя: приоритет handle -> сокращенный адрес кошелька
  const displayName =
    user.handle ? `@${user.handle}` : 
    (user.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : "Realife user");

  // Аватарка теперь всегда null, так как соцсети отключены
  const mainAvatar = null;

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
      displayName,
      mainAvatar,
      publicKey,
      publicUrl,
      // Социальные флаги удалены или установлены в false для совместимости с фронтендом
      twitterConnected: false,
      discordConnected: false,
      xHandle: null,
    },
  });
}