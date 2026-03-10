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

function toBool(v: any) {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((v) => norm(String(v || ""))).filter(Boolean)));
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "Use POST /api/mints to save mint/cache entry (requires auth session).",
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id || (session as any)?.userId;

  if (!userId) {
    return NextResponse.json({ ok: false, reason: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const {
    chainId,
    contract,
    tokenId,
    txHash,
    tokenUri,
    name,
    image,
    verified,
    supply,
    standard,
    catalogOnly, // for RealifeCafeStore createProduct()
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

  // allow BOTH:
  // 1) public Realife1155New mint flow
  // 2) cafe catalog entries from RealifeCafeStore
  const allowedContracts = uniqueStrings([
    process.env.NEXT_PUBLIC_REALIFE_1155_NEW_CONTRACT,
    process.env.REALIFE_1155_NEW_CONTRACT,
    process.env.NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT,
    process.env.REALIFE_CAFE_STORE_CONTRACT,
  ]);

  if (allowedContracts.length > 0 && !allowedContracts.includes(cContract)) {
    return NextResponse.json(
      {
        ok: false,
        error: "wrong_contract",
        allowed: allowedContracts,
        got: cContract,
      },
      { status: 400 }
    );
  }

  const isCatalogOnly = toBool(catalogOnly);

  // old public mint flow => ownership exists immediately
  // cafe admin flow => catalogOnly=true => no holding, no points
  const shouldCreateHolding = !isCatalogOnly;
  const shouldReward = !isCatalogOnly;

  let sInt = 1;
  let supplyBI = 0n;

  if (shouldCreateHolding) {
    const parsedSupply = toPosInt(supply, 1);
    if (!parsedSupply) {
      return NextResponse.json({ ok: false, error: "bad_supply" }, { status: 400 });
    }
    if (parsedSupply > 1_000_000) {
      return NextResponse.json({ ok: false, error: "supply_too_big" }, { status: 400 });
    }
    sInt = parsedSupply;
    supplyBI = BigInt(parsedSupply);
  }

  const std = String(standard || "ERC1155").toUpperCase() === "ERC721" ? "ERC721" : "ERC1155";

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

      // IMPORTANT:
      // do not overwrite original creator on repeated update/upsert
      const dataUpdate = {
        txHash: txHash ? String(txHash) : undefined,
        tokenUri: tokenUri ? String(tokenUri) : undefined,
        name: name ? String(name) : undefined,
        image: image ? String(image) : undefined,
        verified: typeof verified === "boolean" ? verified : true,
      };

      let mint: any = null;
      let created = false;

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

      // Holding only for real ownership mint flow
      if (shouldCreateHolding) {
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
            standard: std as any,
            amount: supplyBI,
          },
          update: created
            ? { standard: std as any, amount: supplyBI }
            : { standard: std as any },
        });
      }

      // reward only for public mint flow
      if (created && shouldReward) {
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
              standard: std,
              catalogOnly: false,
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
            catalogOnly: false,
          },
        };
      }

      return {
        status: 200 as const,
        body: {
          ok: true,
          mint,
          created,
          add: 0,
          points: u.points ?? 0,
          catalogOnly: isCatalogOnly,
        },
      };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (e) {
    console.error("[API_MINTS_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}