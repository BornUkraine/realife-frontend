import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 👇 Безопасная нормализация (не упадет на undefined/null)
const norm = (a: string) => String(a || "").trim().toLowerCase();

/**
 * ✅ Удобно для проверки в браузере:
 * GET /api/mints -> не 405, а подсказка
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "Use POST /api/mints to save mint (requires auth session).",
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id || (session as any)?.userId;

  if (!userId) return NextResponse.json({ ok: false, reason: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });

  const { chainId, contract, tokenId, txHash, tokenUri, name, image, verified } = body as any;

  if (!chainId || !contract || tokenId === undefined || tokenId === null) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const mint = await prisma.mint.upsert({
    where: {
      chainId_contract_tokenId: {
        chainId: Number(chainId),
        contract: norm(String(contract)),
        tokenId: String(tokenId),
      },
    },
    update: {
      // оставляем привязку к владельцу актуальной (если вдруг менял user merge)
      userId,
      txHash: txHash ? String(txHash) : undefined,
      tokenUri: tokenUri ? String(tokenUri) : undefined,
      name: name ? String(name) : undefined,
      image: image ? String(image) : undefined,
      verified: typeof verified === "boolean" ? verified : true,
    },
    create: {
      userId,
      chainId: Number(chainId),
      contract: norm(String(contract)),
      tokenId: String(tokenId),
      txHash: txHash ? String(txHash) : null,
      tokenUri: tokenUri ? String(tokenUri) : null,
      name: name ? String(name) : null,
      image: image ? String(image) : null,
      verified: typeof verified === "boolean" ? verified : true,
    },
  });

  return NextResponse.json({ ok: true, mint });
}