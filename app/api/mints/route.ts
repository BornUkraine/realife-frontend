import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createPublicClient, decodeEventLog, http } from "viem";
import { base, baseSepolia } from "viem/chains";

import { realife1155Abi } from "@/lib/realife1155Abi";
import { realife1155DeliveryAbi } from "@/lib/realife1155DeliveryAbi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const REWARD_MINT = 10;

const CHAIN_ID = Number(process.env.CHAIN_ID || "84532");

const RPC_URL =
  process.env.RPC_URL ||
  process.env.BASE_SEPOLIA_RPC ||
  process.env.BASE_RPC ||
  "https://sepolia.base.org";

const ACTIVE_CHAIN = CHAIN_ID === 8453 ? base : baseSepolia;

const client = createPublicClient({
  chain: ACTIVE_CHAIN,
  transport: http(RPC_URL),
});

const ADMIN_WALLETS = (
  process.env.ADMIN_CREATE_WALLETS ||
  process.env.ADMIN_WALLETS ||
  process.env.NEXT_PUBLIC_ADMIN_CREATE_WALLETS ||
  process.env.NEXT_PUBLIC_ADMIN_WALLETS ||
  ""
)
  .split(",")
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);

const ALLOWED_FULFILLMENT_TYPE = new Set([
  "PHYSICAL_GOOD",
  "DIGITAL_SERVICE",
  "ONLINE_SESSION",
  "LOCAL_SERVICE",
]);

type FulfillmentType =
  | "PHYSICAL_GOOD"
  | "DIGITAL_SERVICE"
  | "ONLINE_SESSION"
  | "LOCAL_SERVICE";

type ContractKind =
  | "PUBLIC_STANDARD"
  | "PUBLIC_DELIVERY"
  | "CATALOG_CAFE"
  | "CATALOG_STORE";

const cafeProductCreatedAbi = [
  {
    type: "event",
    name: "ProductCreated",
    anonymous: false,
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: false, name: "maxSupply", type: "uint256" },
      { indexed: false, name: "price", type: "uint256" },
      { indexed: false, name: "uri", type: "string" },
    ],
  },
] as const;

const storeProductCreatedAbi = [
  {
    type: "event",
    name: "ProductCreated",
    anonymous: false,
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: true, name: "seller", type: "address" },
      { indexed: false, name: "maxSupply", type: "uint256" },
      { indexed: false, name: "price", type: "uint256" },
      { indexed: false, name: "uri", type: "string" },
      { indexed: false, name: "deliveryEnabled", type: "bool" },
      { indexed: false, name: "physicalItemIncluded", type: "bool" },
      { indexed: false, name: "officialItem", type: "bool" },
    ],
  },
] as const;

/* ============================================================================
 * helpers
 * ========================================================================== */

function norm(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function normAddr(v?: string | null) {
  return norm(v);
}

function isAddressLike(v?: string | null) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(v || "").trim());
}

function isHexTxHash(v?: string | null) {
  return /^0x[a-fA-F0-9]{64}$/.test(String(v || "").trim());
}

function toPosInt(v: unknown, def = 1) {
  const n = Number(v ?? def);
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  if (i <= 0) return null;
  return i;
}

function toBool(v: unknown) {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((v) => norm(String(v || ""))).filter(Boolean))
  );
}

function hasOwn(obj: unknown, key: string) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function cleanString(v: unknown, max = 2000) {
  const s = String(v || "").trim();
  return s ? s.slice(0, max) : null;
}

function parseFulfillmentType(v: unknown): FulfillmentType | null {
  const raw = String(v || "").trim().toUpperCase();
  if (!raw) return null;
  return ALLOWED_FULFILLMENT_TYPE.has(raw)
    ? (raw as FulfillmentType)
    : null;
}

function isPhysicalFulfillment(v: string | null | undefined) {
  return String(v || "").toUpperCase() === "PHYSICAL_GOOD";
}

function getContractSets() {
  const STANDARD_USER_CONTRACTS = uniqueStrings([
    process.env.NEXT_PUBLIC_REALIFE_1155_NEW_CONTRACT,
    process.env.REALIFE_1155_NEW_CONTRACT,
  ]);

  const DELIVERY_USER_CONTRACTS = uniqueStrings([
    process.env.NEXT_PUBLIC_REALIFE_1155_DELIVERY_CONTRACT,
    process.env.REALIFE_1155_DELIVERY_CONTRACT,
  ]);

  const CATALOG_CAFE_CONTRACTS = uniqueStrings([
    process.env.NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT,
    process.env.REALIFE_CAFE_STORE_CONTRACT,
  ]);

  const CATALOG_STORE_CONTRACTS = uniqueStrings([
    process.env.NEXT_PUBLIC_REALIFE_STORE_CONTRACT,
    process.env.REALIFE_STORE_CONTRACT,
    process.env.STORE_CONTRACT_ADDRESS,
  ]);

  const CATALOG_CONTRACTS = uniqueStrings([
    ...CATALOG_CAFE_CONTRACTS,
    ...CATALOG_STORE_CONTRACTS,
  ]);

  const PUBLIC_USER_CONTRACTS = uniqueStrings([
    ...STANDARD_USER_CONTRACTS,
    ...DELIVERY_USER_CONTRACTS,
  ]);

  const ALL_ALLOWED_CONTRACTS = uniqueStrings([
    ...PUBLIC_USER_CONTRACTS,
    ...CATALOG_CONTRACTS,
  ]);

  return {
    STANDARD_USER_CONTRACTS,
    DELIVERY_USER_CONTRACTS,
    CATALOG_CAFE_CONTRACTS,
    CATALOG_STORE_CONTRACTS,
    CATALOG_CONTRACTS,
    PUBLIC_USER_CONTRACTS,
    ALL_ALLOWED_CONTRACTS,
  };
}

function deriveMintFlags(params: {
  isCatalogOnly: boolean;
  isCatalogCafeContract: boolean;
  isCatalogStoreContract: boolean;
  isDeliveryUserContract: boolean;
  rawFulfillmentType: FulfillmentType | null;
  rawDeliveryEnabled: boolean | undefined;
  rawPhysicalItemIncluded: boolean | undefined;
  rawOfficialItem: boolean | undefined;
}) {
  const {
    isCatalogOnly,
    isCatalogCafeContract,
    isCatalogStoreContract,
    isDeliveryUserContract,
    rawFulfillmentType,
    rawDeliveryEnabled,
    rawPhysicalItemIncluded,
    rawOfficialItem,
  } = params;

  let fulfillmentType = rawFulfillmentType;

  if (isDeliveryUserContract) {
    if (fulfillmentType && fulfillmentType !== "PHYSICAL_GOOD") {
      return {
        ok: false as const,
        error: "DELIVERY_CONTRACT_REQUIRES_PHYSICAL_GOOD",
        message:
          "Delivery mint contract can only be used for PHYSICAL_GOOD NFTs.",
      };
    }
    fulfillmentType = "PHYSICAL_GOOD";
  }

  if (!fulfillmentType && (rawDeliveryEnabled || rawPhysicalItemIncluded)) {
    fulfillmentType = "PHYSICAL_GOOD";
  }

  let deliveryEnabledFinal = false;
  let physicalItemIncludedFinal = false;
  let officialItemFinal = false;

  if (isPhysicalFulfillment(fulfillmentType)) {
    deliveryEnabledFinal = true;
    physicalItemIncludedFinal = true;

    if (isCatalogOnly) {
      if (rawOfficialItem !== undefined) {
        officialItemFinal = rawOfficialItem;
      } else if (isCatalogCafeContract || isCatalogStoreContract) {
        officialItemFinal = true;
      }
    }
  } else if (fulfillmentType) {
    deliveryEnabledFinal = false;
    physicalItemIncludedFinal = false;

    if (isCatalogOnly) {
      if (rawOfficialItem !== undefined) {
        officialItemFinal = rawOfficialItem;
      } else if (isCatalogCafeContract || isCatalogStoreContract) {
        officialItemFinal = true;
      }
    }
  } else if (isCatalogOnly) {
    deliveryEnabledFinal = Boolean(rawDeliveryEnabled);
    physicalItemIncludedFinal = Boolean(rawPhysicalItemIncluded);

    if (rawOfficialItem !== undefined) {
      officialItemFinal = rawOfficialItem;
    } else if (isCatalogCafeContract || isCatalogStoreContract) {
      officialItemFinal = true;
    }
  } else {
    deliveryEnabledFinal = false;
    physicalItemIncludedFinal = false;
    officialItemFinal = false;
  }

  return {
    ok: true as const,
    fulfillmentType,
    deliveryEnabled: deliveryEnabledFinal,
    physicalItemIncluded: physicalItemIncludedFinal,
    officialItem: officialItemFinal,
  };
}

async function getSessionWalletFromSession(
  session: any,
  userId?: string | null
) {
  const sessionWalletDirect = normAddr(
    session?.user?.walletAddress || session?.walletAddress || ""
  );

  if (sessionWalletDirect) return sessionWalletDirect;

  if (!userId) return "";

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletAddress: true },
  });

  return normAddr(dbUser?.walletAddress || "");
}

async function requireAdminFromSession(session: any) {
  const sessionUserId = session?.user?.id || session?.userId || null;

  let sessionWallet = normAddr(
    session?.user?.walletAddress || session?.walletAddress || ""
  );

  if (!sessionWallet && sessionUserId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: { walletAddress: true },
    });

    sessionWallet = normAddr(dbUser?.walletAddress || "");
  }

  const isAdminSession = Boolean(session?.user?.isAdmin || session?.isAdmin);

  const isAllowlistedWallet =
    !!sessionWallet &&
    ADMIN_WALLETS.length > 0 &&
    ADMIN_WALLETS.includes(sessionWallet);

  if (!isAdminSession && !isAllowlistedWallet) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      ),
    };
  }

  return { ok: true as const };
}

function extractTokenIdFromLog(log: any, kind: ContractKind): string | null {
  try {
    if (kind === "PUBLIC_STANDARD") {
      const decoded = decodeEventLog({
        abi: realife1155Abi,
        data: log.data,
        topics: log.topics,
      }) as { eventName?: string; args?: any };

      if (decoded?.eventName !== "EditionCreated") return null;

      const tokenId = decoded?.args?.tokenId ?? decoded?.args?.[0];
      if (typeof tokenId === "bigint") return tokenId.toString();
      if (typeof tokenId === "number") return String(tokenId);
      if (typeof tokenId === "string") return tokenId;
      return null;
    }

    if (kind === "PUBLIC_DELIVERY") {
      const decoded = decodeEventLog({
        abi: realife1155DeliveryAbi,
        data: log.data,
        topics: log.topics,
      }) as { eventName?: string; args?: any };

      if (decoded?.eventName !== "ProductCreated") return null;

      const tokenId = decoded?.args?.tokenId ?? decoded?.args?.[0];
      if (typeof tokenId === "bigint") return tokenId.toString();
      if (typeof tokenId === "number") return String(tokenId);
      if (typeof tokenId === "string") return tokenId;
      return null;
    }

    if (kind === "CATALOG_CAFE") {
      const decoded = decodeEventLog({
        abi: cafeProductCreatedAbi,
        data: log.data,
        topics: log.topics,
      }) as { eventName?: string; args?: any };

      if (decoded?.eventName !== "ProductCreated") return null;

      const tokenId = decoded?.args?.tokenId ?? decoded?.args?.[0];
      if (typeof tokenId === "bigint") return tokenId.toString();
      if (typeof tokenId === "number") return String(tokenId);
      if (typeof tokenId === "string") return tokenId;
      return null;
    }

    if (kind === "CATALOG_STORE") {
      const decoded = decodeEventLog({
        abi: storeProductCreatedAbi,
        data: log.data,
        topics: log.topics,
      }) as { eventName?: string; args?: any };

      if (decoded?.eventName !== "ProductCreated") return null;

      const tokenId = decoded?.args?.tokenId ?? decoded?.args?.[0];
      if (typeof tokenId === "bigint") return tokenId.toString();
      if (typeof tokenId === "number") return String(tokenId);
      if (typeof tokenId === "string") return tokenId;
      return null;
    }

    return null;
  } catch {
    return null;
  }
}

async function verifyOnchainMintTx(params: {
  chainId: number;
  txHash: `0x${string}`;
  contract: string;
  tokenId: string;
  expectedFrom: string;
  kind: ContractKind;
}) {
  const { chainId, txHash, contract, tokenId, expectedFrom, kind } = params;

  if (chainId !== CHAIN_ID) {
    return {
      ok: false as const,
      error: "CHAIN_MISMATCH",
      message: `Route is configured for chainId ${CHAIN_ID}, got ${chainId}.`,
    };
  }

  const receipt = await client
    .getTransactionReceipt({ hash: txHash })
    .catch(() => null);

  if (!receipt) {
    return {
      ok: false as const,
      error: "TX_NOT_FOUND",
      message: "Transaction receipt not found on-chain.",
    };
  }

  if (receipt.status !== "success") {
    return {
      ok: false as const,
      error: "TX_NOT_SUCCESS",
      message: "Transaction is not successful on-chain.",
    };
  }

  const tx = await client.getTransaction({ hash: txHash }).catch(() => null);
  if (!tx) {
    return {
      ok: false as const,
      error: "TX_NOT_FOUND",
      message: "Transaction not found on-chain.",
    };
  }

  const txTo = normAddr(String(tx.to || ""));
  if (!txTo || txTo !== normAddr(contract)) {
    return {
      ok: false as const,
      error: "TX_CONTRACT_MISMATCH",
      message: "Transaction target contract does not match provided contract.",
    };
  }

  const txFrom = normAddr(String((tx as any).from || ""));
  if (!txFrom || txFrom !== normAddr(expectedFrom)) {
    return {
      ok: false as const,
      error: "TX_SENDER_MISMATCH",
      message: "Transaction sender does not match current user wallet.",
    };
  }

  let tokenIdFromLogs: string | null = null;

  for (const log of receipt.logs || []) {
    if (normAddr(String(log?.address || "")) !== normAddr(contract)) continue;

    const extracted = extractTokenIdFromLog(log, kind);
    if (extracted !== null) {
      tokenIdFromLogs = extracted;
      break;
    }
  }

  if (!tokenIdFromLogs) {
    return {
      ok: false as const,
      error: "MINT_EVENT_NOT_FOUND",
      message: "Expected mint/create event was not found in transaction logs.",
    };
  }

  if (String(tokenIdFromLogs) !== String(tokenId)) {
    return {
      ok: false as const,
      error: "TOKEN_ID_MISMATCH",
      message: "Provided tokenId does not match tokenId emitted on-chain.",
      expected: tokenIdFromLogs,
      got: String(tokenId),
    };
  }

  return {
    ok: true as const,
    receipt,
    tx,
  };
}

/* ============================================================================
 * route
 * ========================================================================== */

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint:
      "Use POST /api/mints to save a public mint or a catalog-only cafe/store entry. Public standard mint is open to authenticated users, physical goods require approvedPhysicalSeller, catalogOnly requires admin, txHash is verified on-chain, and fulfillmentType/category/subcategory/serviceCountry/serviceCity/serviceArea are supported.",
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id || (session as any)?.userId || null;

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "BAD_JSON" },
      { status: 400 }
    );
  }

  const {
    chainId,
    contract,
    tokenId,
    txHash,
    tokenUri,
    name,
    image,
    supply,
    standard,
    catalogOnly,

    deliveryEnabled,
    physicalItemIncluded,
    officialItem,

    fulfillmentType,
    category,
    subcategory,

    serviceCountry,
    serviceCity,
    serviceArea,
  } = body as any;

  if (!chainId || !contract || tokenId === undefined || tokenId === null) {
    return NextResponse.json(
      { ok: false, error: "MISSING_FIELDS" },
      { status: 400 }
    );
  }

  const cChainId = Number(chainId);
  const cContract = normAddr(String(contract));
  const cTokenId = String(tokenId).trim();
  const cTxHash = cleanString(txHash, 80);
  const cTokenUri = cleanString(tokenUri, 4000);
  const cName = cleanString(name, 300);
  const cImage = cleanString(image, 4000);

  const rawFulfillmentType = parseFulfillmentType(fulfillmentType);
  if (hasOwn(body, "fulfillmentType") && !rawFulfillmentType && fulfillmentType) {
    return NextResponse.json(
      { ok: false, error: "BAD_FULFILLMENT_TYPE" },
      { status: 400 }
    );
  }

  const cCategory = cleanString(category, 120);
  const cSubcategory = cleanString(subcategory, 120);

  const rawServiceCountry = cleanString(serviceCountry, 120);
  const rawServiceCity = cleanString(serviceCity, 120);
  const rawServiceArea = cleanString(serviceArea, 160);

  if (!Number.isFinite(cChainId) || cChainId <= 0) {
    return NextResponse.json(
      { ok: false, error: "BAD_CHAIN" },
      { status: 400 }
    );
  }

  if (!isAddressLike(cContract)) {
    return NextResponse.json(
      { ok: false, error: "BAD_CONTRACT" },
      { status: 400 }
    );
  }

  try {
    const bi = BigInt(cTokenId);
    if (bi < 0n) throw new Error("negative");
  } catch {
    return NextResponse.json(
      { ok: false, error: "BAD_TOKEN_ID" },
      { status: 400 }
    );
  }

  if (!cTxHash) {
    return NextResponse.json(
      { ok: false, error: "TX_HASH_REQUIRED" },
      { status: 400 }
    );
  }

  if (!isHexTxHash(cTxHash)) {
    return NextResponse.json(
      { ok: false, error: "BAD_TX_HASH" },
      { status: 400 }
    );
  }

  const isCatalogOnly = toBool(catalogOnly);

  const {
    STANDARD_USER_CONTRACTS,
    DELIVERY_USER_CONTRACTS,
    CATALOG_CAFE_CONTRACTS,
    CATALOG_STORE_CONTRACTS,
    CATALOG_CONTRACTS,
    PUBLIC_USER_CONTRACTS,
    ALL_ALLOWED_CONTRACTS,
  } = getContractSets();

  if (isCatalogOnly) {
    if (CATALOG_CONTRACTS.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "SERVER_MISCONFIGURED",
          message: "Catalog contracts are not configured on the server.",
        },
        { status: 500 }
      );
    }
  } else {
    if (PUBLIC_USER_CONTRACTS.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "SERVER_MISCONFIGURED",
          message: "Public mint contracts are not configured on the server.",
        },
        { status: 500 }
      );
    }
  }

  if (ALL_ALLOWED_CONTRACTS.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "SERVER_MISCONFIGURED",
        message: "No allowed contracts are configured on the server.",
      },
      { status: 500 }
    );
  }

  if (!ALL_ALLOWED_CONTRACTS.includes(cContract)) {
    return NextResponse.json(
      {
        ok: false,
        error: "WRONG_CONTRACT",
        got: cContract,
        allowed: ALL_ALLOWED_CONTRACTS,
      },
      { status: 400 }
    );
  }

  const isStandardUserContract = STANDARD_USER_CONTRACTS.includes(cContract);
  const isDeliveryUserContract = DELIVERY_USER_CONTRACTS.includes(cContract);
  const isCatalogCafeContract = CATALOG_CAFE_CONTRACTS.includes(cContract);
  const isCatalogStoreContract = CATALOG_STORE_CONTRACTS.includes(cContract);
  const isCatalogContract = CATALOG_CONTRACTS.includes(cContract);

  if (isCatalogOnly && !isCatalogContract) {
    return NextResponse.json(
      {
        ok: false,
        error: "CATALOG_ONLY_INVALID_CONTRACT",
        message:
          "catalogOnly flow is allowed only for cafe/store catalog contracts.",
      },
      { status: 400 }
    );
  }

  if (!isCatalogOnly && !isStandardUserContract && !isDeliveryUserContract) {
    return NextResponse.json(
      {
        ok: false,
        error: "PUBLIC_MINT_INVALID_CONTRACT",
        message:
          "Public mint flow supports only standard user contract or delivery user contract.",
      },
      { status: 400 }
    );
  }

  if (isCatalogOnly) {
    const admin = await requireAdminFromSession(session);
    if (!admin.ok) return admin.response;
  }

  const hasDeliveryEnabled = hasOwn(body, "deliveryEnabled");
  const hasPhysicalItemIncluded = hasOwn(body, "physicalItemIncluded");
  const hasOfficialItem = hasOwn(body, "officialItem");

  const rawDeliveryEnabled = hasDeliveryEnabled
    ? toBool(deliveryEnabled)
    : undefined;
  const rawPhysicalItemIncluded = hasPhysicalItemIncluded
    ? toBool(physicalItemIncluded)
    : undefined;
  const rawOfficialItem = hasOfficialItem ? toBool(officialItem) : undefined;

  const derived = deriveMintFlags({
    isCatalogOnly,
    isCatalogCafeContract,
    isCatalogStoreContract,
    isDeliveryUserContract,
    rawFulfillmentType,
    rawDeliveryEnabled,
    rawPhysicalItemIncluded,
    rawOfficialItem,
  });

  if (!derived.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: derived.error,
        message: derived.message,
      },
      { status: 400 }
    );
  }

  const finalFulfillmentType = derived.fulfillmentType;
  const finalDeliveryEnabled = derived.deliveryEnabled;
  const finalPhysicalItemIncluded = derived.physicalItemIncluded;
  const finalOfficialItem = derived.officialItem;

  const isLocalService = finalFulfillmentType === "LOCAL_SERVICE";

  const finalServiceCountry = isLocalService ? rawServiceCountry : null;
  const finalServiceCity = isLocalService ? rawServiceCity : null;
  const finalServiceArea = isLocalService ? rawServiceArea : null;

  const sessionWallet = await getSessionWalletFromSession(session, userId);
  if (!sessionWallet || !isAddressLike(sessionWallet)) {
    return NextResponse.json(
      {
        ok: false,
        error: "SESSION_WALLET_MISSING",
        message:
          "Current session wallet is missing, so tx ownership cannot be verified.",
      },
      { status: 400 }
    );
  }

  let contractKind: ContractKind;
  if (isCatalogOnly && isCatalogCafeContract) {
    contractKind = "CATALOG_CAFE";
  } else if (isCatalogOnly && isCatalogStoreContract) {
    contractKind = "CATALOG_STORE";
  } else if (isDeliveryUserContract) {
    contractKind = "PUBLIC_DELIVERY";
  } else {
    contractKind = "PUBLIC_STANDARD";
  }

  const verifiedTx = await verifyOnchainMintTx({
    chainId: cChainId,
    txHash: cTxHash as `0x${string}`,
    contract: cContract,
    tokenId: cTokenId,
    expectedFrom: sessionWallet,
    kind: contractKind,
  });

  if (!verifiedTx.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: verifiedTx.error,
        message: verifiedTx.message,
        ...(verifiedTx as any).expected
          ? { expected: (verifiedTx as any).expected }
          : {},
        ...(verifiedTx as any).got ? { got: (verifiedTx as any).got } : {},
      },
      { status: 400 }
    );
  }

  let sInt = 1;
  let supplyBI = 0n;

  const shouldCreateHolding = !isCatalogOnly;
  const shouldReward = !isCatalogOnly;

  if (shouldCreateHolding) {
    const parsedSupply = toPosInt(supply, 1);
    if (!parsedSupply) {
      return NextResponse.json(
        { ok: false, error: "BAD_SUPPLY" },
        { status: 400 }
      );
    }

    if (parsedSupply > 1_000_000) {
      return NextResponse.json(
        { ok: false, error: "SUPPLY_TOO_BIG" },
        { status: 400 }
      );
    }

    sInt = parsedSupply;
    supplyBI = BigInt(parsedSupply);
  }

  const std =
    String(standard || "ERC1155").toUpperCase() === "ERC721"
      ? "ERC721"
      : "ERC1155";

  if (std === "ERC721" && shouldCreateHolding && supplyBI !== 1n) {
    return NextResponse.json(
      { ok: false, error: "ERC721_SUPPLY_MUST_BE_ONE" },
      { status: 400 }
    );
  }

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
        return {
          status: 404 as const,
          body: { ok: false, error: "USER_NOT_FOUND" },
        };
      }

      if (
        !isCatalogOnly &&
        isPhysicalFulfillment(finalFulfillmentType) &&
        !u.approvedPhysicalSeller
      ) {
        return {
          status: 403 as const,
          body: {
            ok: false,
            error: "PHYSICAL_GOOD_NOT_ALLOWED",
            message:
              "Physical goods mint is available only for approved seller wallets.",
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
        txHash: cTxHash,
        tokenUri: cTokenUri,
        name: cName,
        image: cImage,
        verified: true,

        deliveryEnabled: finalDeliveryEnabled,
        physicalItemIncluded: finalPhysicalItemIncluded,
        officialItem: finalOfficialItem,

        fulfillmentType: finalFulfillmentType || undefined,
        category: cCategory || undefined,
        subcategory: cSubcategory || undefined,

        serviceCountry: finalServiceCountry || undefined,
        serviceCity: finalServiceCity || undefined,
        serviceArea: finalServiceArea || undefined,
      };

      const dataUpdate = {
        txHash: cTxHash || undefined,
        tokenUri: cTokenUri || undefined,
        name: cName || undefined,
        image: cImage || undefined,
        verified: true,

        deliveryEnabled: finalDeliveryEnabled,
        physicalItemIncluded: finalPhysicalItemIncluded,
        officialItem: finalOfficialItem,

        fulfillmentType: finalFulfillmentType || undefined,
        category: cCategory || undefined,
        subcategory: cSubcategory || undefined,

        serviceCountry: finalServiceCountry,
        serviceCity: finalServiceCity,
        serviceArea: finalServiceArea,
      };

      let mint: any = null;
      let created = false;

      try {
        mint = await tx.mint.create({ data: dataCreate as any });
        created = true;
      } catch (e: any) {
        if (e?.code === "P2002") {
          mint = await tx.mint.update({
            where: whereKey as any,
            data: dataUpdate as any,
          });
          created = false;
        } else {
          throw e;
        }
      }

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
              txHash: cTxHash,
              supply: sInt,
              standard: std,
              catalogOnly: false,
              deliveryEnabled: finalDeliveryEnabled,
              physicalItemIncluded: finalPhysicalItemIncluded,
              officialItem: finalOfficialItem,
              fulfillmentType: finalFulfillmentType,
              category: cCategory,
              subcategory: cSubcategory,
              serviceCountry: finalServiceCountry,
              serviceCity: finalServiceCity,
              serviceArea: finalServiceArea,
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
  } catch (e: any) {
    console.error("[API_MINTS_ERROR]", e);

    if (e?.code === "P2002") {
      return NextResponse.json(
        {
          ok: false,
          error: "CONFLICT",
          message: "Unique constraint conflict while saving mint.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}