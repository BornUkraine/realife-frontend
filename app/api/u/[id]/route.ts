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

  twitterId: true,
  twitterUser: true,
  twitterName: true,
  twitterImage: true,

  discordId: true,
  discordUser: true,
  discordName: true,
  discordImage: true,
} as const;

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

/**
 * Очень мягкая нормализация:
 * - trim
 * - длина <= 64
 * - запрет "/" чтобы не было path-injection в ключ
 * - allowlist символов (можно расширить при желании)
 */
function normalizeKey(raw: string) {
  const key = safeDecode(raw || "").trim();
  if (!key || key.length > 64) return null;
  if (key.includes("/")) return null;

  // allowlist: буквы/цифры/подчёрк/дефис/точка
  // (под твои rl_XXXX и handle идеально)
  if (!/^[a-zA-Z0-9_.-]+$/.test(key)) return null;

  return key;
}

function shortAddr(addr?: string | null) {
  const s = addr ? String(addr) : "";
  if (!s) return "—";
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
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
    const discordConnected = Boolean(user.discordId);

    const xHandle = user.twitterUser ? `@${user.twitterUser}` : null;
    const dcHandle = user.discordUser ? `@${user.discordUser}` : null;

    const displayName =
      user.twitterName ||
      user.discordName ||
      xHandle ||
      dcHandle ||
      (user.handle ? `@${user.handle}` : null) ||
      shortAddr(user.walletAddress);

    // Avatar priority: X -> Discord
    const mainAvatar = user.twitterImage || user.discordImage || null;

    const publicKey = user.handle || user.publicId || null;
    const publicUrl = publicKey && publicKey !== "tmp" ? `${PUBLIC_PREFIX}/${publicKey}` : null;

    // ✅ удобно фронту, ничего не ломает
    const nftsUrl = publicUrl ? `${publicUrl}/nfts` : null;

    return NextResponse.json({
      ok: true,
      user: {
        ...user,
        twitterConnected,
        discordConnected,
        xHandle,
        dcHandle,
        displayName,
        mainAvatar,
        publicKey,
        publicUrl,
        nftsUrl,
      },
    });
  } catch (e) {
    console.error("[API_U_ID_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}