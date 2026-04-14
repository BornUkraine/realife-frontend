import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPublicClient, http, parseEventLogs } from "viem";
import { baseSepolia } from "viem/chains";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const CHAIN_ID = Number(process.env.CHAIN_ID || "84532");

const RPC_URL =
  process.env.RPC_URL ||
  process.env.BASE_SEPOLIA_RPC ||
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ||
  "https://sepolia.base.org";

const PAYMENT_TOKEN_FALLBACK = String(
  process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS ||
    process.env.PAYMENT_TOKEN_ADDRESS ||
    ""
)
  .trim()
  .toLowerCase();

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

const STORE_PRODUCT_BOUGHT_ABI = [
  {
    type: "event",
    name: "ProductBought",
    inputs: [
      { indexed: true, name: "buyer", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "totalPrice", type: "uint256" },
      { indexed: true, name: "seller", type: "address" },
    ],
  },
] as const;

const CAFE_PRODUCT_BOUGHT_ABI = [
  {
    type: "event",
    name: "ProductBought",
    inputs: [
      { indexed: true, name: "buyer", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "totalPrice", type: "uint256" },
    ],
  },
] as const;

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function clean(v: unknown, max = 200) {
  return String(v || "").trim().slice(0, max);
}

function isTxHash(v?: string | null) {
  const s = String(v || "").trim();
  return /^0x([A-Fa-f0-9]{64})$/.test(s);
}

function isTokenId(v?: string | null) {
  return /^\d+$/.test(String(v || "").trim());
}

function isPositiveIntString(v?: string | null) {
  return /^\d+$/.test(String(v || "").trim());
}

function isSourceType(v?: string | null) {
  return v === "STORE" || v === "MARKETPLACE";
}

function isOrderKind(v?: string | null) {
  return v === "PRIMARY" || v === "SECONDARY";
}

function pickViewer(session: any) {
  const id = String(session?.user?.id || session?.userId || "").trim() || null;
  const wallet = normAddr(
    session?.user?.walletAddress || session?.walletAddress || ""
  );

  return {
    id,
    wallet: wallet || null,
  };
}

async function ensureUserByWallet(wallet?: string | null) {
  const w = normAddr(wallet);
  if (!w) return null;

  const user = await prisma.user.upsert({
    where: { walletAddress: w },
    update: {},
    create: {
      walletAddress: w,
      walletChainId: CHAIN_ID,
    },
    select: { id: true },
  });

  return user.id;
}

function serializeOrder(order: {
  id: string;
  chainId: number;
  contract: string;
  tokenId: string;
  buyerWallet: string;
  sellerWallet: string;
  amount: bigint;
  totalPrice: bigint;
  unitPrice: bigint;
  escrowStatus: string;
  deliveryStatus: string;
  fulfillmentType: string | null;
  createdAt: Date;
}) {
  return {
    ...order,
    amount: order.amount.toString(),
    totalPrice: order.totalPrice.toString(),
    unitPrice: order.unitPrice.toString(),
    fulfillmentType: order.fulfillmentType || null,
    createdAt: order.createdAt.toISOString(),
  };
}

function findMatchedBoughtEvent(args: {
  logs: readonly unknown[];
  contract: string;
  wantedTokenId: bigint;
  wantedAmount: bigint;
}) {
  const { logs, contract, wantedTokenId, wantedAmount } = args;

  const parsedStore = parseEventLogs({
    abi: STORE_PRODUCT_BOUGHT_ABI,
    logs: logs as any,
    eventName: "ProductBought",
    strict: false,
  });

  const storeEvent = parsedStore.find((log) => {
    const eventTokenId =
      typeof log.args?.tokenId === "bigint" ? log.args.tokenId : null;
    const eventAmount =
      typeof log.args?.amount === "bigint" ? log.args.amount : null;

    return (
      normAddr(log.address) === contract &&
      eventTokenId === wantedTokenId &&
      eventAmount === wantedAmount
    );
  });

  if (storeEvent) {
    return {
      buyer: normAddr(
        typeof storeEvent.args?.buyer === "string" ? storeEvent.args.buyer : ""
      ),
      seller: normAddr(
        typeof storeEvent.args?.seller === "string" ? storeEvent.args.seller : ""
      ),
      tokenId:
        typeof storeEvent.args?.tokenId === "bigint"
          ? storeEvent.args.tokenId
          : wantedTokenId,
      amount:
        typeof storeEvent.args?.amount === "bigint"
          ? storeEvent.args.amount
          : wantedAmount,
      totalPrice:
        typeof storeEvent.args?.totalPrice === "bigint"
          ? storeEvent.args.totalPrice
          : 0n,
      variant: "store" as const,
    };
  }

  const parsedCafe = parseEventLogs({
    abi: CAFE_PRODUCT_BOUGHT_ABI,
    logs: logs as any,
    eventName: "ProductBought",
    strict: false,
  });

  const cafeEvent = parsedCafe.find((log) => {
    const eventTokenId =
      typeof log.args?.tokenId === "bigint" ? log.args.tokenId : null;
    const eventAmount =
      typeof log.args?.amount === "bigint" ? log.args.amount : null;

    return (
      normAddr(log.address) === contract &&
      eventTokenId === wantedTokenId &&
      eventAmount === wantedAmount
    );
  });

  if (cafeEvent) {
    return {
      buyer: normAddr(
        typeof cafeEvent.args?.buyer === "string" ? cafeEvent.args.buyer : ""
      ),
      seller: "",
      tokenId:
        typeof cafeEvent.args?.tokenId === "bigint"
          ? cafeEvent.args.tokenId
          : wantedTokenId,
      amount:
        typeof cafeEvent.args?.amount === "bigint"
          ? cafeEvent.args.amount
          : wantedAmount,
      totalPrice:
        typeof cafeEvent.args?.totalPrice === "bigint"
          ? cafeEvent.args.totalPrice
          : 0n,
      variant: "cafe" as const,
    };
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const viewer = pickViewer(session);

    if (!viewer.id && !viewer.wallet) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);

    const chainId = Number(body?.chainId || CHAIN_ID);
    const contract = normAddr(body?.contract);
    const tokenId = String(body?.tokenId || "").trim();
    const amountRaw = String(body?.amount || "1").trim();
    const buyTxHash = String(body?.buyTxHash || "").trim();

    const sourceType = String(body?.sourceType || "STORE").trim().toUpperCase();
    const orderKind = String(body?.orderKind || "PRIMARY").trim().toUpperCase();
    const verticalRaw = clean(body?.vertical, 80);

    const shippingName = clean(body?.shippingName, 120);
    const shippingPhone = clean(body?.shippingPhone, 60);
    const shippingCountry = clean(body?.shippingCountry, 80);
    const shippingCity = clean(body?.shippingCity, 80);
    const shippingAddress = clean(body?.shippingAddress, 240);
    const shippingZip = clean(body?.shippingZip, 40);

    if (chainId !== CHAIN_ID) {
      return NextResponse.json(
        { ok: false, error: "CHAIN_ID_MISMATCH" },
        { status: 400 }
      );
    }

    if (!contract || !contract.startsWith("0x")) {
      return NextResponse.json(
        { ok: false, error: "CONTRACT_INVALID" },
        { status: 400 }
      );
    }

    if (!isTokenId(tokenId)) {
      return NextResponse.json(
        { ok: false, error: "TOKEN_ID_INVALID" },
        { status: 400 }
      );
    }

    if (!isPositiveIntString(amountRaw)) {
      return NextResponse.json(
        { ok: false, error: "AMOUNT_INVALID" },
        { status: 400 }
      );
    }

    if (!isTxHash(buyTxHash)) {
      return NextResponse.json(
        { ok: false, error: "BUY_TX_HASH_INVALID" },
        { status: 400 }
      );
    }

    if (!isSourceType(sourceType)) {
      return NextResponse.json(
        { ok: false, error: "SOURCE_TYPE_INVALID" },
        { status: 400 }
      );
    }

    if (!isOrderKind(orderKind)) {
      return NextResponse.json(
        { ok: false, error: "ORDER_KIND_INVALID" },
        { status: 400 }
      );
    }

    if (sourceType === "MARKETPLACE" || orderKind === "SECONDARY") {
      return NextResponse.json(
        { ok: false, error: "SECONDARY_ORDER_MUST_BE_CREATED_BY_INDEXER" },
        { status: 400 }
      );
    }

    const product = await prisma.realMarketingProduct.findUnique({
      where: {
        chainId_contract_tokenId: {
          chainId: CHAIN_ID,
          contract,
          tokenId,
        },
      },
      select: {
        id: true,
        vertical: true,
        paymentToken: true,
        price: true,
        deliveryEnabled: true,
        physicalItemIncluded: true,
        officialItem: true,
        primarySellerWallet: true,
        creatorWallet: true,
        isActive: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { ok: false, error: "PRODUCT_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!product.isActive) {
      return NextResponse.json(
        { ok: false, error: "PRODUCT_NOT_ACTIVE" },
        { status: 400 }
      );
    }

    const deliveryRequired = Boolean(
      product.deliveryEnabled || product.physicalItemIncluded
    );

    if (!deliveryRequired) {
      return NextResponse.json(
        {
          ok: false,
          error: "FULFILLMENT_IS_NOT_PHYSICAL",
          message:
            "This create route is only for primary PHYSICAL_GOOD orders with shipping.",
        },
        { status: 400 }
      );
    }

    if (
      !shippingName ||
      !shippingPhone ||
      !shippingCountry ||
      !shippingCity ||
      !shippingAddress
    ) {
      return NextResponse.json(
        { ok: false, error: "SHIPPING_FIELDS_REQUIRED" },
        { status: 400 }
      );
    }

    const existing = await prisma.storeOrder.findFirst({
      where: {
        chainId: CHAIN_ID,
        contract,
        tokenId,
        buyTxHash,
        sourceType: "STORE",
        orderKind: "PRIMARY",
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({
        ok: true,
        alreadyExists: true,
        orderId: existing.id,
      });
    }

    const receipt = await client.getTransactionReceipt({
      hash: buyTxHash as `0x${string}`,
    });

    if (!receipt || receipt.status !== "success") {
      return NextResponse.json(
        { ok: false, error: "BUY_TX_NOT_CONFIRMED" },
        { status: 400 }
      );
    }

    const wantedTokenId = BigInt(tokenId);
    const wantedAmount = BigInt(amountRaw);

    const matchedEvent = findMatchedBoughtEvent({
      logs: receipt.logs,
      contract,
      wantedTokenId,
      wantedAmount,
    });

    if (!matchedEvent) {
      return NextResponse.json(
        { ok: false, error: "PRODUCT_BOUGHT_EVENT_NOT_FOUND" },
        { status: 400 }
      );
    }

    const buyerWallet = normAddr(matchedEvent.buyer);
    const sellerWallet = normAddr(
      matchedEvent.seller ||
        product.primarySellerWallet ||
        product.creatorWallet ||
        ""
    );

    if (!buyerWallet) {
      return NextResponse.json(
        { ok: false, error: "BUYER_WALLET_NOT_FOUND" },
        { status: 400 }
      );
    }

    if (!sellerWallet) {
      return NextResponse.json(
        { ok: false, error: "SELLER_WALLET_NOT_FOUND" },
        { status: 400 }
      );
    }

    const buyerId = await ensureUserByWallet(buyerWallet);
    const sellerId = await ensureUserByWallet(sellerWallet);

    const viewerMatchesBuyer =
      (viewer.id && buyerId && viewer.id === buyerId) ||
      (viewer.wallet && viewer.wallet === buyerWallet);

    if (!viewerMatchesBuyer) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN_BUYER_ONLY" },
        { status: 403 }
      );
    }

    const eventAmount = matchedEvent.amount;
    const eventTotalPrice = matchedEvent.totalPrice;
    const fallbackUnitPrice = BigInt(product.price || 0);

    const unitPrice =
      eventAmount > 0n && eventTotalPrice > 0n
        ? eventTotalPrice / eventAmount
        : fallbackUnitPrice;

    const totalPrice =
      eventTotalPrice > 0n ? eventTotalPrice : unitPrice * eventAmount;

    const vertical = product.vertical || verticalRaw || "store";

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.storeOrder.create({
        data: {
          chainId: CHAIN_ID,
          contract,
          tokenId,

          sourceType: "STORE",
          orderKind: "PRIMARY",
          vertical,

          marketType: "STANDARD",
          marketplaceContract: null,

          buyerWallet,
          sellerWallet,
          buyerId,
          sellerId,

          amount: eventAmount,
          unitPrice,
          totalPrice,
          paymentToken:
            normAddr(product.paymentToken) || PAYMENT_TOKEN_FALLBACK || null,

          deliveryRequired: true,
          physicalItem: Boolean(product.physicalItemIncluded),
          officialItem: Boolean(product.officialItem),

          fulfillmentType: "PHYSICAL_GOOD",
          serviceStatus: "NOT_REQUIRED",

          escrowStatus: "NOT_REQUIRED",
          deliveryStatus: "PENDING",

          shippingName,
          shippingPhone,
          shippingCountry,
          shippingCity,
          shippingAddress,
          shippingZip: shippingZip || null,

          buyTxHash,
        },
        select: {
          id: true,
          chainId: true,
          contract: true,
          tokenId: true,
          buyerWallet: true,
          sellerWallet: true,
          amount: true,
          totalPrice: true,
          unitPrice: true,
          escrowStatus: true,
          deliveryStatus: true,
          fulfillmentType: true,
          createdAt: true,
        },
      });

      await tx.deliveryMessage.createMany({
        data: [
          {
            orderId: created.id,
            senderRole: "SYSTEM",
            body:
              "Order room created. Buyer and seller can use this room for shipping, tracking and support.",
            isInternal: false,
          },
          {
            orderId: created.id,
            senderUserId: buyerId || undefined,
            senderWallet: buyerWallet || undefined,
            senderRole: "BUYER",
            body:
              "Buyer created the delivery order and submitted shipping details.",
            isInternal: false,
          },
        ],
      });

      return created;
    });

    return NextResponse.json({
      ok: true,
      order: serializeOrder(order),
    });
  } catch (e: any) {
    console.error("[API_DELIVERY_ORDER_CREATE_ERROR]", {
      name: e?.name,
      message: e?.message,
      code: e?.code,
      meta: e?.meta,
    });

    return NextResponse.json(
      { ok: false, error: e?.message || "INTERNAL" },
      { status: 500 }
    );
  }
}
