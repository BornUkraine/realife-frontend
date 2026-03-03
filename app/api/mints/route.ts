import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const REWARD_MINT = 10;

// safe normalize
const norm = (a: string) => String(a || "").trim().toLowerCase();

function toPosInt(v: any, def = 1) {
  const n = Number(v ?? def);
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  if (i <= 0) return null;
  return i;
}

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

  const {
    chainId,
    contract,
    tokenId,
    txHash,
    tokenUri,
    name,
    image,
    verified,
    supply, // ✅ важно для 1155
  } = body as any;

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

  // ✅ 1155-only: принимаем только наш новый контракт из env
  const allowed1155 = norm(process.env.NEXT_PUBLIC_REALIFE_1155_NEW_CONTRACT || "");
  if (allowed1155 && cContract !== allowed1155) {
    return NextResponse.json(
      { ok: false, error: "wrong_contract", allowed: allowed1155, got: cContract },
      { status: 400 }
    );
  }

  // ✅ supply для 1155 (default 1)
  const sInt = toPosInt(supply, 1);
  if (!sInt) return NextResponse.json({ ok: false, error: "bad_supply" }, { status: 400 });
  if (sInt > 1_000_000) return NextResponse.json({ ok: false, error: "supply_too_big" }, { status: 400 });
  const supplyBI = BigInt(sInt);

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

      // create + catch unique (P2002)
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

      // ✅ если это новый минт — создаём/обновляем Holding (1155-only)
      if (created) {
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
            standard: "ERC1155",
            amount: supplyBI,
          },
          update: {
            standard: "ERC1155",
            amount: supplyBI,
          },
        });
      }

      // начисляем points только если реально создали новый Mint
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
              supply: sInt,
            },
          },
        });

        return {
          status: 200 as const,
          body: {
            ok: true,
            mint,
            created: true,
            add: REWARD_MINT,
            points: updatedUser.points ?? 0,
          },
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