import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_PREFIX = "/u";

const userSelect = {
  id: true,
  handle: true,
  publicId: true,
  points: true,
  walletAddress: true,
  walletChainId: true,
  // createdAt: true, // <- обычно не надо светить публично (если надо — раскомментируй)
  twitterId: true,
  twitterUser: true,
  twitterName: true,
  twitterImage: true,
} as const;

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function normalizeKey(raw: string) {
  // безопасно декодим + тримим + режем мусор
  const key = safeDecode(raw || "").trim();
  // защита от очень длинных строк/мусора
  if (!key || key.length > 64) return null;
  return key;
}

function shortAddr(addr?: string | null) {
  if (!addr) return "—";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: keyRaw } = await params;
  const key = normalizeKey(keyRaw);

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

    // Display Name: X name -> @x -> @handle -> short wallet
    const displayName =
      user.twitterName ||
      xHandle ||
      (user.handle ? `@${user.handle}` : null) ||
      shortAddr(user.walletAddress);

    // avatar priority: X only (пока без Discord)
    const mainAvatar = user.twitterImage || null;

    const publicKey = user.handle || user.publicId || null;
    const publicUrl = publicKey && publicKey !== "tmp" ? `${PUBLIC_PREFIX}/${publicKey}` : null;

    return NextResponse.json({
      ok: true,
      user: {
        ...user,
        twitterConnected,
        discordConnected: false, // заглушка
        displayName,
        xHandle,
        mainAvatar,
        publicKey,
        publicUrl,
      },
    });
  } catch (e) {
    console.error("[API_U_ID_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}