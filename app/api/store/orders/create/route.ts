import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPublicClient, http, parseEventLogs } from "viem";
import { baseSepolia } from "viem/chains";
import { realifeStoreAbi } from "@/lib/realifeStoreAbi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const CHAIN_ID = Number(process.env.CHAIN_ID || "84532");
const RPC_URL =
  process.env.RPC_URL ||
  process.env.BASE_SEPOLIA_RPC ||
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ||
  "https://sepolia.base.org";

const STORE_CONTRACT = String(
  process.env.NEXT_PUBLIC_REALIFE_STORE_CONTRACT ||
    process.env.REALIFE_STORE_CONTRACT ||
    process.env.STORE_CONTRACT_ADDRESS ||
    ""
)
  .trim()
  .toLowerCase();

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
  escrowStatus: string;
  deliveryStatus: string;
  createdAt: Date;
}) {
  return {
    ...order,
    amount: order.amount.toString(),
    totalPrice: order.totalPrice.toString(),
    createdAt: order.createdAt.toISOString(),
  };
}

export async function POST(req: Request) {
  if (!STORE_CONTRACT) {
    return NextResponse.json(
      { ok: false, error: "NEXT_PUBLIC_REALIFE_STORE_CONTRACT_MISSING" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json().catch(() => null);

    const chainId = Number(body?.chainId || CHAIN_ID);
    const contract = normAddr(body?.contract);
    const tokenId = String(body?.tokenId || "").trim();
    const amountRaw = String(body?.amount || "1").trim();
    const buyTxHash = String(body?.buyTxHash || "").trim();

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

    if (!contract || contract !== STORE_CONTRACT) {
      return NextResponse.json(
        { ok: false, error: "STORE_CONTRACT_MISMATCH" },
        { status: 400 }
      );
    }

    if (!isTokenId(tokenId)) {
      return NextResponse.json(
        { ok: false, error: "TOKEN_ID_INVALID" },
        { status: 400 }
      );
    }

    if (!/^\d+$/.test(amountRaw)) {
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

    if (!product || product.vertical !== "store") {
      return NextResponse.json(
        { ok: false, error: "STORE_PRODUCT_NOT_FOUND" },
        { status: 404 }
      );
    }

    const existing = await prisma.storeOrder.findFirst({
      where: {
        chainId: CHAIN_ID,
        contract,
        tokenId,
        buyTxHash,
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

    const parsed = parseEventLogs({
      abi: realifeStoreAbi,
      logs: receipt.logs,
      eventName: "ProductBought",
      strict: false,
    });

    const wantedTokenId = BigInt(tokenId);
    const wantedAmount = BigInt(amountRaw);

    const buyEvent = parsed.find((log) => {
      const logAddress = normAddr(log.address);
      const eventTokenId =
        typeof log.args?.tokenId === "bigint" ? log.args.tokenId : null;
      const eventAmount =
        typeof log.args?.amount === "bigint" ? log.args.amount : null;

      return (
        logAddress === STORE_CONTRACT &&
        eventTokenId === wantedTokenId &&
        eventAmount === wantedAmount
      );
    });

    if (!buyEvent) {
      return NextResponse.json(
        { ok: false, error: "PRODUCT_BOUGHT_EVENT_NOT_FOUND" },
        { status: 400 }
      );
    }

    const buyerWallet = normAddr(
      typeof buyEvent.args?.buyer === "string" ? buyEvent.args.buyer : ""
    );

    const sellerWallet = normAddr(
      typeof buyEvent.args?.seller === "string"
        ? buyEvent.args.seller
        : product.primarySellerWallet || product.creatorWallet || ""
    );

    const eventAmount =
      typeof buyEvent.args?.amount === "bigint" ? buyEvent.args.amount : wantedAmount;

    const eventTotalPrice =
      typeof buyEvent.args?.totalPrice === "bigint" ? buyEvent.args.totalPrice : 0n;

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

    const deliveryRequired = Boolean(
      product.deliveryEnabled || product.physicalItemIncluded
    );

    if (deliveryRequired) {
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
    }

    const buyerId = await ensureUserByWallet(buyerWallet);
    const sellerId = await ensureUserByWallet(sellerWallet);

    const fallbackUnitPrice = BigInt(product.price || 0);
    const unitPrice =
      eventAmount > 0n && eventTotalPrice > 0n
        ? eventTotalPrice / eventAmount
        : fallbackUnitPrice;

    const totalPrice =
      eventTotalPrice > 0n ? eventTotalPrice : unitPrice * eventAmount;

    const now = new Date();

    const order = await prisma.storeOrder.create({
      data: {
        chainId: CHAIN_ID,
        contract,
        tokenId,
        vertical: "store",

        buyerWallet,
        sellerWallet,

        buyerId,
        sellerId,

        amount: eventAmount,
        unitPrice,
        totalPrice,
        paymentToken: normAddr(product.paymentToken) || PAYMENT_TOKEN_FALLBACK || null,

        deliveryRequired,
        physicalItem: Boolean(product.physicalItemIncluded),
        officialItem: Boolean(product.officialItem),

        escrowStatus: deliveryRequired ? "FUNDED" : "NOT_REQUIRED",
        deliveryStatus: deliveryRequired ? "PENDING" : "NOT_REQUIRED",

        escrowFundedAt: deliveryRequired ? now : null,

        shippingName: deliveryRequired ? shippingName : null,
        shippingPhone: deliveryRequired ? shippingPhone : null,
        shippingCountry: deliveryRequired ? shippingCountry : null,
        shippingCity: deliveryRequired ? shippingCity : null,
        shippingAddress: deliveryRequired ? shippingAddress : null,
        shippingZip: deliveryRequired ? shippingZip : null,

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
        escrowStatus: true,
        deliveryStatus: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      order: serializeOrder(order),
    });
  } catch (e: any) {
    console.error("[API_STORE_ORDER_CREATE_ERROR]", {
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