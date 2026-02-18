import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  const user = await prisma.user.findFirst({
    where: { OR: [{ handle: key }, { publicId: key }] },
    select: userSelect,
  });

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const twitterConnected = Boolean(user.twitterId);
  const discordConnected = Boolean(user.discordId);
  const walletConnected = Boolean(user.walletAddress);

  const displayName =
    user.twitterName ||
    (user.twitterUser ? `@${user.twitterUser}` : null) ||
    user.discordName ||
    user.discordUser ||
    "Realife user";

  const xHandle = user.twitterUser ? `@${user.twitterUser}` : null;
  const mainAvatar = user.twitterImage || user.discordImage || null;

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
      twitterConnected,
      discordConnected,
      walletConnected,
      displayName,
      xHandle,
      mainAvatar,
      publicKey,
      publicUrl,
    },
  });
}
