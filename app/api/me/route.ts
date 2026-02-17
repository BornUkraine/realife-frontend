import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PUBLIC_PREFIX = "/app/u";

function randomId(len = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function pickPublicKey(user: {
  handle: string | null;
  twitterUser: string | null;
  publicId: string | null;
}) {
  // приоритет: handle -> twitter username -> publicId
  return user.handle || user.twitterUser || user.publicId || null;
}

async function ensurePublicIdTx(tx: typeof prisma, userId: string) {
  const u = await tx.user.findUnique({
    where: { id: userId },
    select: { publicId: true },
  });

  if (u?.publicId && u.publicId !== "tmp") return u.publicId;

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
      if (e?.code === "P2002") continue; // unique collision
      throw e;
    }
  }

  throw new Error("PUBLIC_ID_GENERATION_FAILED");
}

export async function GET() {
  const session: any = await getServerSession(authOptions);

  if (!session?.userId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // гарантируем publicId ещё до чтения finalUser
      const ensuredPublicId = await ensurePublicIdTx(tx as any, session.userId);

      const user = await tx.user.findUnique({
        where: { id: session.userId },
        select: {
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

          walletAddress: true,
          walletChainId: true,

          lastDailyAt: true,
          createdAt: true,
        },
      });

      if (!user) return { status: 404 as const, body: { ok: false } };

      const finalUser = { ...user, publicId: user.publicId ?? ensuredPublicId };

      const publicKey = pickPublicKey({
        handle: finalUser.handle ?? null,
        twitterUser: finalUser.twitterUser ?? null,
        publicId: finalUser.publicId ?? null,
      });

      const publicUrl = publicKey ? `${PUBLIC_PREFIX}/${publicKey}` : null;

      const displayName =
        finalUser.twitterName ||
        finalUser.discordName ||
        (finalUser.twitterUser ? `@${finalUser.twitterUser}` : null) ||
        finalUser.discordUser ||
        "Realife user";

      const mainAvatar = finalUser.twitterImage || finalUser.discordImage || null;

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
          linkError: session.linkError ?? null,
        },
      };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (e) {
    console.error("ME_ERROR", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
