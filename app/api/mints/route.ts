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

function hasOwn(obj: any, key: string) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "Use POST /api/mints to save mint/cache entry (requires auth session). Supports public mint flow and catalog-only cafe/store entries.",
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
    catalogOnly, // for Cafe/Store product creation via admin form

    // optional explicit flags for catalog flows
    deliveryEnabled,
    physicalItemIncluded,
    officialItem,
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

  const STANDARD_USER_CONTRACTS = uniqueStrings([
    process.env.NEXT_PUBLIC_REALIFE_1155_NEW_CONTRACT,
    process.env.REALIFE_1155_NEW_CONTRACT,
  ]);

  const DELIVERY_USER_CONTRACTS = uniqueStrings([
    process.env.NEXT_PUBLIC_REALIFE_1155_DELIVERY_CONTRACT,
    process.env.REALIFE_1155_DELIVERY_CONTRACT,
  ]);

  const CATALOG_CONTRACTS = uniqueStrings([
    process.env.NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT,
    process.env.REALIFE_CAFE_STORE_CONTRACT,

    process.env.NEXT_PUBLIC_REALIFE_STORE_CONTRACT,
    process.env.REALIFE_STORE_CONTRACT,
    process.env.STORE_CONTRACT_ADDRESS,
  ]);

  const allowedContracts = uniqueStrings([
    ...STANDARD_USER_CONTRACTS,
    ...DELIVERY_USER_CONTRACTS,
    ...CATALOG_CONTRACTS,
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
  const isStandardUserContract = STANDARD_USER_CONTRACTS.includes(cContract);
  const isDeliveryUserContract = DELIVERY_USER_CONTRACTS.includes(cContract);
  const isCatalogContract = CATALOG_CONTRACTS.includes(cContract);

  if (isCatalogOnly && !isCatalogContract) {
    return NextResponse.json(
      {
        ok: false,
        error: "CATALOG_ONLY_INVALID_CONTRACT",
        message: "catalogOnly flow is allowed only for cafe/store catalog contracts.",
      },
      { status: 400 }
    );
  }

  if (!isCatalogOnly && !isStandardUserContract && !isDeliveryUserContract) {
    return NextResponse.json(
      {
        ok: false,
        error: "PUBLIC_MINT_INVALID_CONTRACT",
        message: "Public mint flow supports only standard user contract or delivery user contract.",
      },
      { status: 400 }
    );
  }

  // detect explicitly passed flags (used only for catalog/admin flows)
  const hasDeliveryEnabled = hasOwn(body, "deliveryEnabled");
  const hasPhysicalItemIncluded = hasOwn(body, "physicalItemIncluded");
  const hasOfficialItem = hasOwn(body, "officialItem");

  const rawDeliveryEnabled = hasDeliveryEnabled ? toBool(deliveryEnabled) : undefined;
  const rawPhysicalItemIncluded = hasPhysicalItemIncluded ? toBool(physicalItemIncluded) : undefined;
  const rawOfficialItem = hasOfficialItem ? toBool(officialItem) : undefined;

  let createDeliveryEnabled = false;
  let createPhysicalItemIncluded = false;
  let createOfficialItem = false;

  let updateDeliveryEnabled: boolean | undefined = undefined;
  let updatePhysicalItemIncluded: boolean | undefined = undefined;
  let updateOfficialItem: boolean | undefined = undefined;

  if (isCatalogOnly) {
    createDeliveryEnabled = Boolean(rawDeliveryEnabled);
    createPhysicalItemIncluded = Boolean(rawPhysicalItemIncluded);
    createOfficialItem = Boolean(rawOfficialItem);

    updateDeliveryEnabled =
      rawDeliveryEnabled === undefined ? undefined : rawDeliveryEnabled;
    updatePhysicalItemIncluded =
      rawPhysicalItemIncluded === undefined ? undefined : rawPhysicalItemIncluded;
    updateOfficialItem =
      rawOfficialItem === undefined ? undefined : rawOfficialItem;
  } else if (isDeliveryUserContract) {
    // delivery user mint is determined by contract choice
    createDeliveryEnabled = true;
    createPhysicalItemIncluded = true;
    createOfficialItem = false;

    updateDeliveryEnabled = true;
    updatePhysicalItemIncluded = true;
    updateOfficialItem = false;
  } else {
    // standard user mint contract
    createDeliveryEnabled = false;
    createPhysicalItemIncluded = false;
    createOfficialItem = false;

    updateDeliveryEnabled = false;
    updatePhysicalItemIncluded = false;
    updateOfficialItem = false;
  }

  // public mint flow => ownership exists immediately
  // cafe/store admin flow => catalogOnly=true => no holding, no points
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

  const std =
    String(standard || "ERC1155").toUpperCase() === "ERC721" ? "ERC721" : "ERC1155";

  try {
    const result = await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          points: true,
          approvedPhysicalSeller: true,
        },
      });

      if (!u) {
        return { status: 404 as const, body: { ok: false, error: "USER_NOT_FOUND" } };
      }

      // delivery mint via separate delivery contract requires VIP/approved wallet
      if (!isCatalogOnly && isDeliveryUserContract && !u.approvedPhysicalSeller) {
        return {
          status: 403 as const,
          body: {
            ok: false,
            error: "DELIVERY_NOT_ALLOWED",
            message: "Delivery mint is available only for approved seller wallets.",
          },
        };
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

        deliveryEnabled: createDeliveryEnabled,
        physicalItemIncluded: createPhysicalItemIncluded,
        officialItem: createOfficialItem,
      };

      // IMPORTANT:
      // do not overwrite original creator on repeated update/upsert
      const dataUpdate = {
        txHash: txHash ? String(txHash) : undefined,
        tokenUri: tokenUri ? String(tokenUri) : undefined,
        name: name ? String(name) : undefined,
        image: image ? String(image) : undefined,
        verified: typeof verified === "boolean" ? verified : true,

        deliveryEnabled: updateDeliveryEnabled,
        physicalItemIncluded: updatePhysicalItemIncluded,
        officialItem: updateOfficialItem,
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
              deliveryEnabled: createDeliveryEnabled,
              physicalItemIncluded: createPhysicalItemIncluded,
              officialItem: createOfficialItem,
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