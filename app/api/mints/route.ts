import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REWARD_MINT = 10;

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

  const cChainId = Number(chainId);
  const cContract = norm(String(contract));
  const cTokenId = String(tokenId);

  if (!Number.isFinite(cChainId) || cChainId <= 0) {
    return NextResponse.json({ ok: false, error: "bad_chain" }, { status: 400 });
  }
  if (!cContract.startsWith("0x")) {
    return NextResponse.json({ ok: false, error: "bad_contract" }, { status: 400 });
  }
  if (!cTokenId) {
    return NextResponse.json({ ok: false, error: "bad_tokenId" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, points: true },
      });

      if (!u) {
        return { status: 404 as const, body: { ok: false, error: "USER_NOT_FOUND" } };
      }

      const whereKey = {
        chainId_contract_tokenId: {
          chainId: cChainId,
          contract: cContract,
          tokenId: cTokenId,
        },
      };

      const dataCreate = {
        userId,
        chainId: cChainId,
        contract: cContract,
        tokenId: cTokenId,
        txHash: txHash ? String(txHash) : null,
        tokenUri: tokenUri ? String(tokenUri) : null,
        name: name ? String(name) : null,
        image: image ? String(image) : null,
        verified: typeof verified === "boolean" ? verified : true,
      };

      const dataUpdate = {
        userId, // если вдруг user merge
        txHash: txHash ? String(txHash) : undefined,
        tokenUri: tokenUri ? String(tokenUri) : undefined,
        name: name ? String(name) : undefined,
        image: image ? String(image) : undefined,
        verified: typeof verified === "boolean" ? verified : true,
      };

      let mint: any = null;
      let created = false;

      // ✅ Надёжно определяем "новый минт" через create + catch P2002
      try {
        mint = await tx.mint.create({ data: dataCreate });
        created = true;
      } catch (e: any) {
        if (e?.code === "P2002") {
          mint = await tx.mint.update({ where: whereKey as any, data: dataUpdate });
          created = false;
        } else {
          throw e;
        }
      }

      // ✅ начисляем points только если реально создали новый Mint
      if (created) {
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { points: { increment: REWARD_MINT } },
          select: { points: true },
        });

        await tx.pointEvent.create({
          data: {
            userId,
            type: "MINT",
            points: REWARD_MINT,
            meta: {
              chainId: cChainId,
              contract: cContract,
              tokenId: cTokenId,
              txHash: txHash ? String(txHash) : null,
            },
          },
        });

        return {
          status: 200 as const,
          body: { ok: true, mint, created: true, add: REWARD_MINT, points: updatedUser.points ?? 0 },
        };
      }

      return {
        status: 200 as const,
        body: { ok: true, mint, created: false, add: 0, points: u.points ?? 0 },
      };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (e) {
    console.error("[API_MINTS_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}