import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function normalizeKey(raw: string) {
  const key = safeDecode(raw || "").trim();
  if (!key || key.length > 64) return null;
  if (key.includes("/")) return null;
  if (!/^[a-zA-Z0-9_.-]+$/.test(key)) return null;
  return key;
}

function norm(a: string) {
  return String(a || "").trim().toLowerCase();
}

function s(v: any) {
  return typeof v === "bigint" ? v.toString() : v;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: keyRaw } = await params;
  const key = normalizeKey(keyRaw);

  if (!key) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  const url = new URL(req.url);
  const take = Math.max(1, Math.min(48, Number(url.searchParams.get("take") || "24")));
  const cursor = url.searchParams.get("cursor"); // Holding.id

  const REALIFE_1155_NEW_CONTRACT = norm(process.env.NEXT_PUBLIC_REALIFE_1155_NEW_CONTRACT || "");

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { handle: { equals: key, mode: "insensitive" } },
          { publicId: { equals: key, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, reason: "USER_NOT_FOUND" }, { status: 404 });
    }

    const items = await prisma.holding.findMany({
      where: {
        userId: user.id,
        amount: { gt: 0n },
        mint: { verified: true },
        ...(REALIFE_1155_NEW_CONTRACT ? { contract: REALIFE_1155_NEW_CONTRACT } : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        updatedAt: true,
        chainId: true,
        contract: true,
        tokenId: true,
        standard: true,
        amount: true,
        mint: {
          select: {
            name: true,
            image: true,
            tokenUri: true,
            verified: true,
            txHash: true,
            createdAt: true,
          },
        },
      },
    });

    const hasMore = items.length > take;
    const data = hasMore ? items.slice(0, take) : items;
    const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;

    const nfts = data.map((x) => ({
      id: x.id, // Holding.id
      updatedAt: x.updatedAt,
      chainId: x.chainId,
      contract: String(x.contract || "").toLowerCase(),
      tokenId: x.tokenId,
      standard: x.standard,
      amount: s(x.amount),
      name: x.mint?.name ?? null,
      image: x.mint?.image ?? null,
      tokenUri: x.mint?.tokenUri ?? null,
      verified: x.mint?.verified ?? false,
      txHash: x.mint?.txHash ?? null,
      mintedAt: x.mint?.createdAt ?? null,
    }));

    return NextResponse.json({ ok: true, nfts, nextCursor });
  } catch (e) {
    console.error("[API_U_ID_NFTS_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}