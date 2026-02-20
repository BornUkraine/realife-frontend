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
  const uid = (session as any)?.userId || session?.user?.id;

  if (!uid) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1) Читаем только базовые данные и данные кошелька
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
          // Социальные поля удалены из запроса
        },
      });

      if (!user) {
        return { status: 401 as const, body: { ok: false, reason: "USER_NOT_FOUND" } };
      }

      // 2) Обеспечиваем наличие publicId
      const ensuredPublicId = user.publicId && user.publicId !== "tmp"
        ? user.publicId
        : await ensurePublicIdTx(tx, uid);

      const finalUser = { ...user, publicId: user.publicId ?? ensuredPublicId };

      const publicKey = pickPublicKey({
        handle: finalUser.handle ?? null,
        publicId: finalUser.publicId ?? null,
      });

      const publicUrl = publicKey ? `${PUBLIC_PREFIX}/${publicKey}` : null;

      // 3) Логика имени теперь опирается только на кошелек или handle
      const displayName = 
        finalUser.handle ? `@${finalUser.handle}` : 
        (finalUser.walletAddress ? `${finalUser.walletAddress.slice(0, 6)}...${finalUser.walletAddress.slice(-4)}` : "Realife user");

      // Аватарка по умолчанию (пусто), так как соцсетей нет
      const mainAvatar = null;

      return {
        status: 200 as const,
        body: {
          ok: true,
          user: {
            ...finalUser,
            publicUrl,
            displayName,
            mainAvatar,
          },
          // Ошибки линковки соцсетей здесь больше не нужны
          linkError: null,
        },
      };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (e) {
    console.error("ME_ERROR", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}