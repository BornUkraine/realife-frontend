import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PUBLIC_PREFIX = "/u";

function randomId(len = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function pickPublicKey(user: { handle: string | null; publicId: string | null }) {
  return user.handle || user.publicId || null;
}

// Безопасная генерация publicId внутри транзакции
async function ensurePublicIdTx(tx: any, userId: string) {
  const u = await tx.user.findUnique({
    where: { id: userId },
    select: { publicId: true },
  });

  if (!u) return null;
  if (u.publicId && u.publicId !== "tmp") return u.publicId;

  for (let i = 0; i < 25; i++) {
    const pid = `rl_${randomId(8)}`;
    try {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { publicId: pid },
        select: { publicId: true },
      });
      return updated.publicId;
    } catch (e: any) {
      if (e?.code === "P2002") continue;
      if (e?.code === "P2025") return null; 
      throw e;
    }
  }
  throw new Error("PUBLIC_ID_GENERATION_FAILED");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  
  // Мы ищем ID в сессии именно так, как прописали в callbacks.session
  const uid = (session as any)?.userId || (session as any)?.user?.id;

  if (!uid) {
    return NextResponse.json({ ok: false, reason: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1) Читаем все данные юзера
      const user = await tx.user.findUnique({
        where: { id: uid },
        select: {
          id: true,
          handle: true,
          publicId: true,
          points: true,
          walletAddress: true,
          walletChainId: true,
          lastDailyAt: true,
          createdAt: true,
          // Социальные поля X (Twitter)
          twitterId: true,
          twitterUser: true,
          twitterName: true,
          twitterImage: true,
          // Социальные поля Discord (уже есть в твоей схеме Prisma)
          discordId: true,
          discordUser: true,
          discordName: true,
          discordImage: true,
        },
      });

      if (!user) {
        return { status: 401 as const, body: { ok: false, reason: "USER_NOT_FOUND" } };
      }

      // 2) Обеспечиваем наличие publicId (если вдруг потерялся)
      let currentPublicId = user.publicId;
      if (!currentPublicId || currentPublicId === "tmp") {
        currentPublicId = await ensurePublicIdTx(tx, uid);
      }

      // 3) Генерация публичной ссылки
      const publicKey = user.handle || currentPublicId;
      const publicUrl = publicKey ? `${PUBLIC_PREFIX}/${publicKey}` : null;

      // 4) Логика Display Name (Приоритет: X -> Discord -> Handle -> Wallet)
      const displayName = 
        user.twitterName || 
        (user.twitterUser ? `@${user.twitterUser}` : null) ||
        user.discordName ||
        (user.handle ? `@${user.handle}` : null) || 
        (user.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : "Realife user");

      // 5) Главная аватарка (Приоритет: X -> Discord)
      const mainAvatar = user.twitterImage || user.discordImage || null;

      return {
        status: 200 as const,
        body: {
          ok: true,
          user: {
            ...user,
            publicId: currentPublicId,
            publicUrl,
            displayName,
            mainAvatar,
          },
          // Передаем ошибку линковки, если она застряла в сессии
          linkError: (session as any)?.linkError ?? null,
        },
      };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (e) {
    console.error("[API_ME_ERROR]", e);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}