import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Standard = "ERC721" | "ERC1155";

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
  return key;
}

function norm(a: string) {
  return String(a || "").trim().toLowerCase();
}

// ✅ One place to decide which contract is ERC-1155
const ERC1155_CONTRACT = norm(
  process.env.NEXT_PUBLIC_REALIFE_1155_CONTRACT ||
    process.env.REALIFE_1155_CONTRACT ||
    ""
);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: keyRaw } = await params;
  const key = normalizeKey(keyRaw);

  if (!key) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  const url = new URL(req.url);
  const take = Math.max(1, Math.min(48, Number(url.searchParams.get("take") || "24")));
  const cursor = url.searchParams.get("cursor"); // Mint.id

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

    const items = await prisma.mint.findMany({
      where: { userId: user.id, verified: true },
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
    const data: typeof items = hasMore ? items.slice(0, take) : items;
    const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;

    const nfts = data.map((x: typeof items[number]) => {
      const c = norm(x.contract);
      const standard: Standard = ERC1155_CONTRACT && c === ERC1155_CONTRACT ? "ERC1155" : "ERC721";
      return { ...x, contract: c, standard };
    });

    return NextResponse.json({ ok: true, nfts, nextCursor });
  } catch (e) {
    console.error("[API_U_ID_NFTS_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}