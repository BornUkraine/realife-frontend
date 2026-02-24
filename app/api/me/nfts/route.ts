import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function norm(a: string) {
  return String(a || "").trim().toLowerCase();
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const uid = (session as any)?.userId || (session as any)?.user?.id;

  if (!uid) {
    return NextResponse.json({ ok: false, reason: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(req.url);
  const take = Math.max(1, Math.min(48, Number(url.searchParams.get("take") || "24")));
  const cursor = url.searchParams.get("cursor"); // Mint.id

  try {
    const items = await prisma.mint.findMany({
      // 👇 Добавили фильтр verified: true
      where: { userId: uid, verified: true },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        createdAt: true,
        chainId: true,
        contract: true,
        tokenId: true,
        txHash: true,
        tokenUri: true,
        name: true,
        image: true,
        verified: true,
      },
    });

    const hasMore = items.length > take;
    const data = hasMore ? items.slice(0, take) : items;
    const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;

    // нормализуем contract на всякий (если старые записи)
    const nfts = data.map((x) => ({ ...x, contract: norm(x.contract) }));

    return NextResponse.json({ ok: true, nfts, nextCursor });
  } catch (e) {
    console.error("[API_ME_NFTS_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}