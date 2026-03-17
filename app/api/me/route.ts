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

async function ensurePublicIdTx(tx: any, userId: string) {
  const u = await tx.user.findUnique({ where: { id: userId }, select: { publicId: true } });
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
      if (e?.code === "P2002") continue; // unique collision
      if (e?.code === "P2025") return null; // record not found
      throw e;
    }
  }
  throw new Error("PUBLIC_ID_GENERATION_FAILED");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const uid = (session as any)?.userId || (session as any)?.user?.id;

  if (!uid) {
    return NextResponse.json({ ok: false, reason: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
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

          // Delivery / VIP access
          approvedPhysicalSeller: true,
          approvedPhysicalAt: true,
          approvedPhysicalNote: true,

          // X (Twitter)
          twitterId: true,
          twitterUser: true,
          twitterName: true,
          twitterImage: true,
          twitterRewarded: true,

          // Discord
          discordId: true,
          discordUser: true,
          discordName: true,
          discordImage: true,
          discordRewarded: true,
        },
      });

      if (!user) {
        return { status: 401 as const, body: { ok: false, reason: "USER_NOT_FOUND" } };
      }

      let currentPublicId = user.publicId;
      if (!currentPublicId || currentPublicId === "tmp") {
        currentPublicId = await ensurePublicIdTx(tx, uid);
      }

      const publicKey = user.handle || currentPublicId || null;
      const publicUrl = publicKey ? `${PUBLIC_PREFIX}/${publicKey}` : null;

      const displayName =
        user.twitterName ||
        (user.twitterUser ? `@${user.twitterUser}` : null) ||
        user.discordName ||
        (user.discordUser ? `@${user.discordUser}` : null) ||
        (user.handle ? `@${user.handle}` : null) ||
        (user.walletAddress
          ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
          : "Realife user");

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
        },
      };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (e) {
    console.error("[API_ME_ERROR]", e);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}