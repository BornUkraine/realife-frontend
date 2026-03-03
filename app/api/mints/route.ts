import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REWARD_MINT = 10;

const norm = (a: string) => String(a || "").trim().toLowerCase();

function clampInt(n: any, min: number, max: number, fallback: number) {
  const v = typeof n === "string" ? Number(n) : typeof n === "number" ? n : NaN;
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(v)));
}

// ✅ Опционально: если хочешь жёстко принимать только твой новый контракт
const ONLY_1155_CONTRACT = norm(
  process.env.NEXT_PUBLIC_REALIFE_1155_NEW_CONTRACT ||
    process.env.REALIFE_1155_NEW_CONTRACT ||
    ""
);

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "Use POST /api/mints to save mint (requires auth session).",
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id || (session as any)?.userId;

  if (!userId) {
    return NextResponse.json({ ok: false, reason: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });

  const {
    chainId,
    contract,
    tokenId,
    txHash,
    tokenUri,
    name,
    image,
    verified,
    standard, // optional: "ERC1155"
    supply,   // optional: number (for 1155)
  } = body as any;

  if (!chainId || !contract || tokenId === undefined || tokenId === null) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const cChainId = Number(chainId);
  const cContract = norm(String(contract));
  const cTokenId = String(tokenId).trim();

  if (!Number.isFinite(cChainId) || cChainId <= 0) {
    return NextResponse.json({ ok: false, error: "bad_chain" }, { status: 400 });
  }
  if (!cContract.startsWith("0x")) {
    return NextResponse.json({ ok: false, error: "bad_contract" }, { status: 400 });
  }
  if (!cTokenId) {
    return NextResponse.json({ ok: false, error: "bad_tokenId" }, { status: 400 });
  }

  // ✅ 1155-only: если задан env контракта — запрещаем писать другие контракты
  if (ONLY_1155_CONTRACT && cContract !== ONLY_1155_CONTRACT) {
    return NextResponse.json({ ok: false, error: "wrong_contract" }, { status: 400 });
  }

  // ✅ standard: берём из body, иначе — ERC1155 (потому что 1155-only)
  const std = String(standard || "ERC1155").toUpperCase() === "ERC721" ? "ERC721" : "ERC1155";

  // ✅ amount для Holding:
  // ERC1155 -> supply (по умолчанию 1..10000)
  // ERC721 -> 1
  const supplyInt = std === "ERC1155" ? clampInt(supply, 1, 10000, 1) : 1;
  const amount = std === "ERC1155" ? BigInt(supplyInt) : 1n;

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
        userId,
        txHash: txHash ? String(txHash) : undefined,
        tokenUri: tokenUri ? String(tokenUri) : undefined,
        name: name ? String(name) : undefined,
        image: image ? String(image) : undefined,
        verified: typeof verified === "boolean" ? verified : true,
      };

      let mint: any = null;
      let created = false;

      // Mint (catalog)
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

      // ✅ Holding (ownership) — важно для ERC1155 галереи
      // upsert: если уже есть — обновим amount/standard (на тестнете ок)
      await tx.holding.upsert({
        where: {
          userId_chainId_contract_tokenId: {
            userId,
            chainId: cChainId,
            contract: cContract,
            tokenId: cTokenId,
          },
        },
        create: {
          userId,
          chainId: cChainId,
          contract: cContract,
          tokenId: cTokenId,
          standard: std as any, // Prisma enum NftStandard
          amount,
        },
        update: {
          standard: std as any,
          amount,
        },
      });

      // ✅ points только если реально новый mint
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
              standard: std,
              supply: supplyInt,
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