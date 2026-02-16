import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ВАЖНО: если у тебя публичные профили будут внутри /app/u/...
const PUBLIC_PREFIX = "/app/u";

const userSelect = {
  id: true,
  handle: true,
  publicId: true,
  points: true,

  twitterId: true,
  twitterUser: true,
  twitterName: true,
  twitterImage: true,

  discordId: true,
  discordUser: true,
  discordName: true,
  discordImage: true,

  createdAt: true,

  // Если хочешь поддержку поиска по кошельку — раскомментируй и добавь поле в схему
  // wallet: true, // или walletAddress: true
} as const;

function pickPublicKey(user: {
  handle: string | null;
  twitterUser: string | null;
  publicId: string | null;
}) {
  // приоритет: ручной handle > X username > publicId
  return user.handle || user.twitterUser || user.publicId || "";
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
        { handle: key },
        { publicId: key },
        // Если хочешь искать по X username напрямую:
        { twitterUser: key },
        // Если хочешь искать по discordUser:
        { discordUser: key },

        // Если хочешь искать по кошельку:
        // { wallet: key },
      ],
    },
    select: userSelect,
  });

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const twitterConnected = Boolean(user.twitterId);
  const discordConnected = Boolean(user.discordId);

  // display name — как в соцсетях
  const displayName =
    user.twitterName ||
    user.discordName ||
    user.twitterUser ||
    user.discordUser ||
    "Realife user";

  const xHandle = user.twitterUser ? `@${user.twitterUser}` : null;

  // Главная аватарка: X приоритет, иначе Discord
  const mainAvatar = user.twitterImage || user.discordImage || null;

  // Публичный ключ для ссылки: handle > twitterUser > publicId
  const publicKey = pickPublicKey(user);

  // Ссылка (важно: у тебя сайт живёт в /app/*)
  const publicUrl = publicKey ? `${PUBLIC_PREFIX}/${publicKey}` : null;

  return NextResponse.json({
    ok: true,
    user: {
      ...user,
      twitterConnected,
      discordConnected,

      // удобные computed-поля для UI
      displayName,
      xHandle,
      mainAvatar,
      publicKey,
      publicUrl,
    },
  });
}
