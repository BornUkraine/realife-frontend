import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { JsonRpcProvider, Interface } from "ethers";

const prisma = new PrismaClient();

const RPC_URL =
  process.env.RPC_URL ||
  process.env.BASE_SEPOLIA_RPC ||
  "https://sepolia.base.org";

const CHAIN_ID = Number(process.env.CHAIN_ID || "84532");

const MARKETPLACE = (
  process.env.REALIFE_PROTECTED_MARKETPLACE_USDC_CONTRACT ||
  process.env.NEXT_PUBLIC_REALIFE_PROTECTED_MARKETPLACE_USDC_CONTRACT ||
  ""
)
  .trim()
  .toLowerCase();

if (!MARKETPLACE) {
  throw new Error("Protected marketplace address missing");
}

const MARKET_TYPE = "PROTECTED";

const PAYMENT_TOKEN_ADDRESS = (
  process.env.BASE_SEPOLIA_USDC_ADDRESS ||
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_USDC_ADDRESS ||
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
)
  .trim()
  .toLowerCase();

const PAYMENT_SYMBOL = process.env.PROTECTED_MARKETPLACE_PAYMENT_SYMBOL || "USDC";
const PAYMENT_DECIMALS = Number(process.env.PROTECTED_MARKETPLACE_PAYMENT_DECIMALS || "6");

const START_BLOCK = BigInt(
  process.env.PROTECTED_MARKETPLACE_START_BLOCK ||
    process.env.MARKETPLACE_PROTECTED_START_BLOCK ||
    "0"
);

const CONFIRMATIONS = BigInt(
  process.env.PROTECTED_MARKETPLACE_CONFIRMATIONS ||
    process.env.CONFIRMATIONS ||
    "5"
);

const BATCH = BigInt(
  process.env.PROTECTED_MARKETPLACE_BATCH_BLOCKS ||
    process.env.BATCH_BLOCKS ||
    "2000"
);

const SLEEP_MS = Number(
  process.env.PROTECTED_MARKETPLACE_SLEEP_MS ||
    process.env.SLEEP_MS ||
    "8000"
);

const LOOKBACK_BLOCKS = BigInt(
  process.env.PROTECTED_MARKETPLACE_LOOKBACK_BLOCKS ||
    process.env.LOOKBACK_BLOCKS ||
    "250"
);

const provider = new JsonRpcProvider(RPC_URL);

const ABI = [
  "event Listed(uint256 indexed listingId,address indexed seller,address indexed nft,uint256 tokenId,uint256 amount,uint256 pricePerUnitUsdc,uint8 fulfillmentType)",
  "event Cancelled(uint256 indexed listingId,address indexed seller,address indexed nft,uint256 tokenId,uint256 amountReturned)",
  "event PurchaseFunded(uint256 indexed purchaseId,uint256 indexed listingId,address indexed seller,address buyer,address nft,uint256 tokenId,uint256 amount,uint256 pricePerUnitUsdc,uint256 totalPriceUsdc,uint8 fulfillmentType)",
  "event BuyerConfirmed(uint256 indexed purchaseId,uint256 indexed listingId,address indexed buyer)",
  "event RefundRequested(uint256 indexed purchaseId,uint256 indexed listingId,address indexed buyer)",
  "event PurchaseNftReturned(uint256 indexed purchaseId,uint256 indexed listingId,address indexed buyer,address nft,uint256 tokenId,uint256 amount)",
  "event RefundRequestRejected(uint256 indexed purchaseId,uint256 indexed listingId,address indexed buyer)",
  "event PurchaseReleased(uint256 indexed purchaseId,uint256 indexed listingId,address indexed seller,address buyer,address nft,uint256 tokenId,uint256 amount,uint256 totalPriceUsdc,uint256 feeUsdc,uint256 sellerAmountUsdc,uint8 fulfillmentType)",
  "event PurchaseRefunded(uint256 indexed purchaseId,uint256 indexed listingId,address indexed seller,address buyer,address nft,uint256 tokenId,uint256 amount,uint256 totalPriceUsdc,uint8 fulfillmentType)",
  "event RefundRejectedAndNftRestored(uint256 indexed purchaseId,uint256 indexed listingId,address indexed buyer,address nft,uint256 tokenId,uint256 amount)",
];

const iface = new Interface(ABI);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function norm(v) {
  return String(v || "").trim().toLowerCase();
}

function stateKey() {
  return `marketplace:${MARKET_TYPE}:USDC:${MARKETPLACE}`;
}

function initialLastBlockValue() {
  if (START_BLOCK <= 0n) return 0n;
  return START_BLOCK - 1n;
}

function minScanBlock() {
  return START_BLOCK > 0n ? START_BLOCK : 0n;
}

function listingWhereUnique(listingId) {
  return {
    chainId_marketType_marketplaceContract_marketplaceListingId: {
      chainId: CHAIN_ID,
      marketType: MARKET_TYPE,
      marketplaceContract: MARKETPLACE,
      marketplaceListingId: listingId,
    },
  };
}

function orderWhereUnique(purchaseId) {
  return {
    chainId_marketType_marketplaceContract_marketplacePurchaseId: {
      chainId: CHAIN_ID,
      marketType: MARKET_TYPE,
      marketplaceContract: MARKETPLACE,
      marketplacePurchaseId: purchaseId,
    },
  };
}

async function getLastBlock() {
  const key = stateKey();

  const row = await prisma.indexerState.upsert({
    where: { chainId_key: { chainId: CHAIN_ID, key } },
    update: {},
    create: {
      chainId: CHAIN_ID,
      key,
      lastBlock: initialLastBlockValue(),
    },
  });

  return BigInt(row.lastBlock);
}

async function setLastBlock(bn) {
  const key = stateKey();

  await prisma.indexerState.update({
    where: { chainId_key: { chainId: CHAIN_ID, key } },
    data: { lastBlock: bn },
  });
}

const blockTsCache = new Map();

async function getBlockTime(blockNumber) {
  if (blockTsCache.has(blockNumber)) {
    return blockTsCache.get(blockNumber);
  }

  const b = await provider.getBlock(blockNumber);
  if (!b) {
    throw new Error(`Block ${blockNumber} not found`);
  }

  const dt = new Date(Number(b.timestamp) * 1000);
  blockTsCache.set(blockNumber, dt);
  return dt;
}

function isPrismaUnique(e) {
  return e && typeof e === "object" && e.code === "P2002";
}

async function ensureUserByWallet(wallet) {
  const w = norm(wallet);
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

async function upsertHoldingDelta({
  userId,
  contract,
  tokenId,
  amountDelta = 0n,
  pendingDelta = 0n,
  completedDelta = 0n,
}) {
  if (!userId) return;

  const createAmount = amountDelta > 0n ? amountDelta : 0n;
  const createPending = pendingDelta > 0n ? pendingDelta : 0n;
  const createCompleted = completedDelta > 0n ? completedDelta : 0n;

  await prisma.holding.upsert({
    where: {
      userId_chainId_contract_tokenId: {
        userId,
        chainId: CHAIN_ID,
        contract,
        tokenId,
      },
    },
    create: {
      userId,
      chainId: CHAIN_ID,
      contract,
      tokenId,
      standard: "ERC1155",
      amount: createAmount,
      pendingLockedAmount: createPending,
      completedLockedAmount: createCompleted,
    },
    update: {
      standard: "ERC1155",
      ...(amountDelta !== 0n ? { amount: { increment: amountDelta } } : {}),
      ...(pendingDelta !== 0n
        ? { pendingLockedAmount: { increment: pendingDelta } }
        : {}),
      ...(completedDelta !== 0n
        ? { completedLockedAmount: { increment: completedDelta } }
        : {}),
    },
  });
}

async function decrementHoldingIfPossible({
  userId,
  contract,
  tokenId,
  amount = 0n,
  pendingAmount = 0n,
  completedAmount = 0n,
  logTag = "HOLDING_DECREMENT_MISS",
  context = {},
}) {
  if (!userId) return;

  const where = {
    userId,
    chainId: CHAIN_ID,
    contract,
    tokenId,
    ...(amount > 0n ? { amount: { gte: amount } } : {}),
    ...(pendingAmount > 0n
      ? { pendingLockedAmount: { gte: pendingAmount } }
      : {}),
    ...(completedAmount > 0n
      ? { completedLockedAmount: { gte: completedAmount } }
      : {}),
  };

  const data = {
    ...(amount > 0n ? { amount: { decrement: amount } } : {}),
    ...(pendingAmount > 0n
      ? { pendingLockedAmount: { decrement: pendingAmount } }
      : {}),
    ...(completedAmount > 0n
      ? { completedLockedAmount: { decrement: completedAmount } }
      : {}),
  };

  if (Object.keys(data).length === 0) return;

  const res = await prisma.holding.updateMany({ where, data });

  if (res.count === 0) {
    console.warn(`[${logTag}]`, {
      userId,
      contract,
      tokenId,
      amount: amount.toString(),
      pendingAmount: pendingAmount.toString(),
      completedAmount: completedAmount.toString(),
      ...context,
    });
  }
}

function fulfillmentTypeFromRaw(raw) {
  const n = Number(raw);

  if (n === 0) return "PHYSICAL_GOOD";
  if (n === 1) return "DIGITAL_SERVICE";
  if (n === 2) return "ONLINE_SESSION";
  if (n === 3) return "LOCAL_SERVICE";

  return null;
}

function isPhysicalFulfillment(v) {
  return v === "PHYSICAL_GOOD";
}

function isServiceFulfillment(v) {
  return (
    v === "DIGITAL_SERVICE" ||
    v === "ONLINE_SESSION" ||
    v === "LOCAL_SERVICE"
  );
}

function nextDeliveryStatusForRefund(deliveryRequired, current) {
  if (!deliveryRequired) return "NOT_REQUIRED";

  const returnedStatuses = [
    "SHIPPED",
    "DELIVERED",
    "CONFIRMED",
    "RETURN_REQUESTED",
  ];

  if (returnedStatuses.includes(String(current || ""))) {
    return "RETURNED";
  }

  if (String(current || "") === "NOT_REQUIRED") {
    return "NOT_REQUIRED";
  }

  return "CANCELLED";
}

function nextServiceStatusForRefund(fulfillmentType, current) {
  if (!fulfillmentType || !isServiceFulfillment(fulfillmentType)) {
    return "NOT_REQUIRED";
  }

  if (String(current || "") === "NOT_REQUIRED") {
    return "NOT_REQUIRED";
  }

  return "CANCELLED";
}

function sortLogs(logs) {
  return [...logs].sort((a, b) => {
    const aBlock = Number(a.blockNumber);
    const bBlock = Number(b.blockNumber);

    if (aBlock !== bBlock) {
      return aBlock - bBlock;
    }

    const aIndex = Number(a.index ?? a.logIndex ?? 0);
    const bIndex = Number(b.index ?? b.logIndex ?? 0);
    return aIndex - bIndex;
  });
}

/* ============================================================================
 * LISTED
 * NFT moves into protected marketplace custody.
 * Seller holding decreases on first seen listing.
 * ========================================================================== */
async function handleListed(parsed, log) {
  const listingId = BigInt(parsed.args.listingId);
  const seller = norm(parsed.args.seller);
  const nft = norm(parsed.args.nft);
  const tokenId = BigInt(parsed.args.tokenId).toString();
  const amount = BigInt(parsed.args.amount);
  const pricePerUnitUsdc = BigInt(parsed.args.pricePerUnitUsdc);
  const fulfillmentType = fulfillmentTypeFromRaw(parsed.args.fulfillmentType);
  const txHash = log.transactionHash;

  if (!fulfillmentType) {
    console.warn("[PROTECTED_SKIP_BAD_FULFILLMENT_TYPE]", {
      listingId: listingId.toString(),
      raw: String(parsed.args.fulfillmentType),
    });
    return;
  }

  const [product, mint, sellerId, existingListing] = await Promise.all([
    prisma.realMarketingProduct.findUnique({
      where: {
        chainId_contract_tokenId: {
          chainId: CHAIN_ID,
          contract: nft,
          tokenId,
        },
      },
      select: {
        vertical: true,
        deliveryEnabled: true,
        physicalItemIncluded: true,
        officialItem: true,
      },
    }),

    prisma.mint.findUnique({
      where: {
        chainId_contract_tokenId: {
          chainId: CHAIN_ID,
          contract: nft,
          tokenId,
        },
      },
      select: {
        verified: true,
        deliveryEnabled: true,
        physicalItemIncluded: true,
        officialItem: true,
        fulfillmentType: true,
        category: true,
        subcategory: true,
      },
    }),

    ensureUserByWallet(seller),

    prisma.listing.findUnique({
      where: listingWhereUnique(listingId),
      select: { id: true, adminHidden: true },
    }),
  ]);

  if (!mint?.verified) {
    console.log("[PROTECTED_SKIP] mint missing/not verified", { nft, tokenId });
    return;
  }

  if (existingListing?.adminHidden) {
    console.log("[PROTECTED_SKIP_ADMIN_HIDDEN_LISTING] listing was hidden by admin", {
      listingId: listingId.toString(),
      nft,
      tokenId,
    });
    return;
  }

  const deliveryEnabled =
    isPhysicalFulfillment(fulfillmentType) ||
    Boolean(product?.deliveryEnabled) ||
    Boolean(mint.deliveryEnabled);

  const physicalItemIncluded =
    isPhysicalFulfillment(fulfillmentType) ||
    Boolean(product?.physicalItemIncluded) ||
    Boolean(mint.physicalItemIncluded);

  const officialItem = product?.officialItem ?? Boolean(mint.officialItem);
  const category = mint.category || null;
  const subcategory = mint.subcategory || null;

  await prisma.listing.upsert({
    where: listingWhereUnique(listingId),
    update: {
      marketplaceContract: MARKETPLACE,
      marketType: MARKET_TYPE,
      status: "ACTIVE",
      sellerId,
      sellerWallet: seller,
      pricePerUnitWei: pricePerUnitUsdc,
      paymentTokenAddress: PAYMENT_TOKEN_ADDRESS,
      paymentSymbol: PAYMENT_SYMBOL,
      paymentDecimals: PAYMENT_DECIMALS,
      amountTotal: amount,
      amountRemaining: amount,
      standard: "ERC1155",
      createdTxHash: txHash,
      cancelledAt: null,
      soldOutAt: null,
      deliveryEnabled,
      physicalItemIncluded,
      officialItem: Boolean(officialItem),
      fulfillmentType,
      category,
      subcategory,
    },
    create: {
      chainId: CHAIN_ID,
      contract: nft,
      tokenId,
      standard: "ERC1155",
      marketplaceContract: MARKETPLACE,
      marketType: MARKET_TYPE,
      sellerId,
      sellerWallet: seller,
      marketplaceListingId: listingId,
      pricePerUnitWei: pricePerUnitUsdc,
      paymentTokenAddress: PAYMENT_TOKEN_ADDRESS,
      paymentSymbol: PAYMENT_SYMBOL,
      paymentDecimals: PAYMENT_DECIMALS,
      amountTotal: amount,
      amountRemaining: amount,
      status: "ACTIVE",
      createdTxHash: txHash,
      deliveryEnabled,
      physicalItemIncluded,
      officialItem: Boolean(officialItem),
      fulfillmentType,
      category,
      subcategory,
    },
  });

  if (!existingListing && sellerId) {
    await decrementHoldingIfPossible({
      userId: sellerId,
      contract: nft,
      tokenId,
      amount,
      logTag: "PROTECTED_LISTED_HOLDING_DECREMENT_MISS",
      context: { seller, nft },
    });
  }

  console.log("[PROTECTED_LISTED]", {
    listingId: listingId.toString(),
    seller,
    nft,
    tokenId,
    amount: amount.toString(),
    pricePerUnitUsdc: pricePerUnitUsdc.toString(),
    fulfillmentType,
  });
}

/* ============================================================================
 * CANCELLED
 * Remaining escrowed NFT amount returns back to seller custody.
 * ========================================================================== */
async function handleCancelled(parsed, blockTime) {
  const listingId = BigInt(parsed.args.listingId);
  const amountReturned = BigInt(parsed.args.amountReturned);

  const row = await prisma.listing.findUnique({
    where: listingWhereUnique(listingId),
    select: {
      id: true,
      status: true,
      sellerId: true,
      contract: true,
      tokenId: true,
    },
  });

  if (!row || row.status === "CANCELLED") {
    console.log("[PROTECTED_CANCELLED_SKIP]", {
      listingId: listingId.toString(),
      reason: "missing_or_already_cancelled",
    });
    return;
  }

  await prisma.listing.update({
    where: listingWhereUnique(listingId),
    data: {
      status: "CANCELLED",
      cancelledAt: blockTime,
      amountRemaining: 0n,
    },
  });

  if (row.sellerId && amountReturned > 0n) {
    await upsertHoldingDelta({
      userId: row.sellerId,
      contract: row.contract,
      tokenId: row.tokenId,
      amountDelta: amountReturned,
    });
  }

  console.log("[PROTECTED_CANCELLED]", {
    listingId: listingId.toString(),
    amountReturned: amountReturned.toString(),
  });
}

/* ============================================================================
 * PURCHASE FUNDED
 * Buyer receives NFT immediately. Funds stay in escrow.
 * ========================================================================== */
async function handlePurchaseFunded(parsed, log, blockTime) {
  const purchaseId = BigInt(parsed.args.purchaseId);
  const listingId = BigInt(parsed.args.listingId);
  const seller = norm(parsed.args.seller);
  const buyer = norm(parsed.args.buyer);
  const nft = norm(parsed.args.nft);
  const tokenId = BigInt(parsed.args.tokenId).toString();
  const amount = BigInt(parsed.args.amount);
  const pricePerUnitUsdc = BigInt(parsed.args.pricePerUnitUsdc);
  const totalPriceUsdc = BigInt(parsed.args.totalPriceUsdc);
  const fulfillmentType = fulfillmentTypeFromRaw(parsed.args.fulfillmentType);
  const txHash = log.transactionHash;
  const logIndex = Number(log.index ?? log.logIndex ?? 0);

  if (!fulfillmentType) {
    console.warn("[PROTECTED_SKIP_BAD_FULFILLMENT_TYPE]", {
      purchaseId: purchaseId.toString(),
      raw: String(parsed.args.fulfillmentType),
    });
    return;
  }

  const [product, mint, sellerId, buyerId, currentListing] = await Promise.all([
    prisma.realMarketingProduct.findUnique({
      where: {
        chainId_contract_tokenId: {
          chainId: CHAIN_ID,
          contract: nft,
          tokenId,
        },
      },
      select: {
        vertical: true,
        deliveryEnabled: true,
        physicalItemIncluded: true,
        officialItem: true,
      },
    }),

    prisma.mint.findUnique({
      where: {
        chainId_contract_tokenId: {
          chainId: CHAIN_ID,
          contract: nft,
          tokenId,
        },
      },
      select: {
        verified: true,
        deliveryEnabled: true,
        physicalItemIncluded: true,
        officialItem: true,
        category: true,
        subcategory: true,
      },
    }),

    ensureUserByWallet(seller),
    ensureUserByWallet(buyer),

    prisma.listing.findUnique({
      where: listingWhereUnique(listingId),
      select: {
        id: true,
        status: true,
        amountRemaining: true,
        deliveryEnabled: true,
        physicalItemIncluded: true,
        officialItem: true,
        fulfillmentType: true,
        category: true,
        subcategory: true,
      },
    }),
  ]);

  if (!mint?.verified) {
    console.log("[PROTECTED_SKIP] funded mint missing/not verified", {
      nft,
      tokenId,
    });
    return;
  }

  let createdTrade = false;
  let tradeRow = null;

  try {
    tradeRow = await prisma.trade.create({
      data: {
        chainId: CHAIN_ID,
        contract: nft,
        tokenId,
        standard: "ERC1155",

        marketplaceContract: MARKETPLACE,
        marketType: MARKET_TYPE,
        marketplaceListingId: listingId,
        marketplacePurchaseId: purchaseId,

        txHash,
        logIndex,
        blockNum: BigInt(log.blockNumber),
        blockTime,

        fulfillmentType,
        category: currentListing?.category ?? mint.category ?? null,
        subcategory: currentListing?.subcategory ?? mint.subcategory ?? null,

        sellerWallet: seller,
        buyerWallet: buyer,
        sellerId,
        buyerId,

        amount,
        pricePerUnitWei: pricePerUnitUsdc,
        totalPriceWei: totalPriceUsdc,
        paymentTokenAddress: PAYMENT_TOKEN_ADDRESS,
        paymentSymbol: PAYMENT_SYMBOL,
        paymentDecimals: PAYMENT_DECIMALS,
      },
      select: { id: true },
    });

    createdTrade = true;
  } catch (e) {
    if (isPrismaUnique(e)) {
      createdTrade = false;
      tradeRow = await prisma.trade.findUnique({
        where: {
          chainId_txHash_logIndex: {
            chainId: CHAIN_ID,
            txHash,
            logIndex,
          },
        },
        select: { id: true },
      });
    } else {
      console.error("[PROTECTED_TRADE_CREATE_ERROR]", e);
      createdTrade = false;
    }
  }

  if (createdTrade && currentListing && currentListing.status === "ACTIVE") {
    const newRemaining = BigInt(currentListing.amountRemaining) - amount;
    const soldOut = newRemaining <= 0n;

    await prisma.listing.update({
      where: listingWhereUnique(listingId),
      data: {
        amountRemaining: soldOut ? 0n : newRemaining,
        status: soldOut ? "SOLD_OUT" : "ACTIVE",
        soldOutAt: soldOut ? blockTime : null,
      },
    });
  }

  if (createdTrade && buyerId) {
    await upsertHoldingDelta({
      userId: buyerId,
      contract: nft,
      tokenId,
      amountDelta: amount,
      pendingDelta: amount,
    });
  }

  const vertical = product?.vertical || "marketplace";
  const deliveryRequired = isPhysicalFulfillment(fulfillmentType);

  const physicalItem =
    isPhysicalFulfillment(fulfillmentType) ||
    Boolean(currentListing?.physicalItemIncluded) ||
    Boolean(product?.physicalItemIncluded) ||
    Boolean(mint.physicalItemIncluded);

  const officialItem =
    currentListing?.officialItem ??
    product?.officialItem ??
    Boolean(mint.officialItem);

  const category = currentListing?.category ?? mint.category ?? null;
  const subcategory = currentListing?.subcategory ?? mint.subcategory ?? null;

  if (tradeRow?.id) {
    const existingOrder = await prisma.storeOrder.findUnique({
      where: orderWhereUnique(purchaseId),
      select: { id: true },
    });

    if (!existingOrder) {
      await prisma.storeOrder.create({
        data: {
          chainId: CHAIN_ID,
          contract: nft,
          tokenId,

          sourceType: "MARKETPLACE",
          orderKind: "SECONDARY",
          vertical,

          marketType: MARKET_TYPE,
          marketplaceContract: MARKETPLACE,

          buyerWallet: buyer,
          sellerWallet: seller,

          buyerId,
          sellerId,

          listingId: currentListing?.id ?? null,
          tradeId: tradeRow.id,
          marketplaceListingId: listingId,
          marketplacePurchaseId: purchaseId,

          amount,
          unitPrice: pricePerUnitUsdc,
          totalPrice: totalPriceUsdc,

          paymentToken: PAYMENT_TOKEN_ADDRESS,
          paymentSymbol: PAYMENT_SYMBOL,
          paymentDecimals: PAYMENT_DECIMALS,

          deliveryRequired,
          physicalItem: Boolean(physicalItem),
          officialItem: Boolean(officialItem),

          fulfillmentType,
          category,
          subcategory,

          escrowStatus: "FUNDED",
          deliveryStatus: deliveryRequired ? "PENDING" : "NOT_REQUIRED",
          serviceStatus: isServiceFulfillment(fulfillmentType)
            ? "PENDING"
            : "NOT_REQUIRED",

          protectedNftLockStatus: "PENDING_LOCKED",
          protectedNftPendingAmount: amount,
          protectedNftCompletedAmount: 0n,
          protectedNftLockedAt: blockTime,
          protectedNftCompletedAt: null,
          protectedNftUnlockedAt: null,

          escrowFundedAt: blockTime,
          buyTxHash: txHash,
        },
      });

      console.log("[PROTECTED_ORDER_CREATED]", {
        purchaseId: purchaseId.toString(),
        listingId: listingId.toString(),
        nft,
        tokenId,
        buyer,
        seller,
        fulfillmentType,
      });
    }
  }

  console.log("[PROTECTED_FUNDED]", {
    purchaseId: purchaseId.toString(),
    listingId: listingId.toString(),
    buyer,
    seller,
    nft,
    tokenId,
    amount: amount.toString(),
    totalPriceUsdc: totalPriceUsdc.toString(),
    fulfillmentType,
  });
}

/* ============================================================================
 * BUYER CONFIRMED
 * ========================================================================== */
async function handleBuyerConfirmed(parsed, blockTime) {
  const purchaseId = BigInt(parsed.args.purchaseId);

  const row = await prisma.storeOrder.findUnique({
    where: orderWhereUnique(purchaseId),
    select: {
      id: true,
      deliveryStatus: true,
      serviceStatus: true,
      fulfillmentType: true,
      confirmedAt: true,
      buyerConfirmedAt: true,
    },
  });

  if (!row) {
    console.log("[PROTECTED_BUYER_CONFIRMED_SKIP]", {
      purchaseId: purchaseId.toString(),
      reason: "order_not_found",
    });
    return;
  }

  const isPhysical = row.fulfillmentType === "PHYSICAL_GOOD";
  const isService =
    !!row.fulfillmentType && isServiceFulfillment(row.fulfillmentType);

  await prisma.storeOrder.update({
    where: { id: row.id },
    data: {
      buyerConfirmedAt: row.buyerConfirmedAt || blockTime,
      confirmedAt: row.confirmedAt || blockTime,
      deliveryStatus: isPhysical ? "CONFIRMED" : row.deliveryStatus,
      serviceStatus: isService ? "CONFIRMED" : row.serviceStatus,
    },
  });

  console.log("[PROTECTED_BUYER_CONFIRMED]", {
    purchaseId: purchaseId.toString(),
  });
}

/* ============================================================================
 * REFUND REQUESTED
 * ========================================================================== */
async function handleRefundRequested(parsed, blockTime) {
  const purchaseId = BigInt(parsed.args.purchaseId);

  const row = await prisma.storeOrder.findUnique({
    where: orderWhereUnique(purchaseId),
    select: { id: true },
  });

  if (!row) {
    console.log("[PROTECTED_REFUND_REQUESTED_SKIP]", {
      purchaseId: purchaseId.toString(),
      reason: "order_not_found",
    });
    return;
  }

  await prisma.storeOrder.update({
    where: { id: row.id },
    data: {
      escrowStatus: "DISPUTED",
      disputedAt: blockTime,
      refundRequestedAt: blockTime,
      protectedNftLockStatus: "PENDING_LOCKED",
    },
  });

  console.log("[PROTECTED_REFUND_REQUESTED]", {
    purchaseId: purchaseId.toString(),
  });
}

/* ============================================================================
 * PURCHASE NFT RETURNED
 * Buyer returned NFT back to escrow contract.
 * Buyer holding decreases here.
 * ========================================================================== */
async function handlePurchaseNftReturned(parsed, blockTime) {
  const purchaseId = BigInt(parsed.args.purchaseId);
  const buyer = norm(parsed.args.buyer);

  const row = await prisma.storeOrder.findUnique({
    where: orderWhereUnique(purchaseId),
    select: {
      id: true,
      nftReturnedAt: true,
      buyerId: true,
      buyerWallet: true,
      contract: true,
      tokenId: true,
      amount: true,
    },
  });

  if (!row) {
    console.log("[PROTECTED_NFT_RETURNED_SKIP]", {
      purchaseId: purchaseId.toString(),
      reason: "order_not_found",
    });
    return;
  }

  if (row.nftReturnedAt) {
    return;
  }

  await prisma.storeOrder.update({
    where: { id: row.id },
    data: {
      escrowStatus: "DISPUTED",
      disputedAt: blockTime,
      nftReturnedAt: blockTime,
      protectedNftPendingAmount: 0n,
      protectedNftLockStatus: "UNLOCKED",
      protectedNftUnlockedAt: blockTime,
    },
  });

  const buyerId = row.buyerId || (await ensureUserByWallet(row.buyerWallet || buyer));

  if (buyerId) {
    await decrementHoldingIfPossible({
      userId: buyerId,
      contract: row.contract,
      tokenId: row.tokenId,
      amount: row.amount,
      pendingAmount: row.amount,
      logTag: "PROTECTED_RETURN_HOLDING_DECREMENT_MISS",
      context: { purchaseId: purchaseId.toString() },
    });
  }

  console.log("[PROTECTED_NFT_RETURNED]", {
    purchaseId: purchaseId.toString(),
  });
}

/* ============================================================================
 * REFUND REQUEST REJECTED
 * ========================================================================== */
async function handleRefundRequestRejected(parsed, blockTime) {
  const purchaseId = BigInt(parsed.args.purchaseId);

  const row = await prisma.storeOrder.findUnique({
    where: orderWhereUnique(purchaseId),
    select: { id: true },
  });

  if (!row) {
    console.log("[PROTECTED_REFUND_REQUEST_REJECTED_SKIP]", {
      purchaseId: purchaseId.toString(),
      reason: "order_not_found",
    });
    return;
  }

  await prisma.storeOrder.update({
    where: { id: row.id },
    data: {
      escrowStatus: "FUNDED",
      refundRejectedAt: blockTime,
      protectedNftLockStatus: "PENDING_LOCKED",
    },
  });

  console.log("[PROTECTED_REFUND_REQUEST_REJECTED]", {
    purchaseId: purchaseId.toString(),
  });
}

/* ============================================================================
 * PURCHASE RELEASED
 * Buyer already received NFT on PurchaseFunded.
 * ========================================================================== */
async function handleReleased(parsed, log, blockTime) {
  const purchaseId = BigInt(parsed.args.purchaseId);
  const txHash = log.transactionHash;

  const row = await prisma.storeOrder.findUnique({
    where: orderWhereUnique(purchaseId),
    select: {
      id: true,
      escrowStatus: true,
      deliveryStatus: true,
      serviceStatus: true,
      fulfillmentType: true,
      buyerId: true,
      buyerWallet: true,
      contract: true,
      tokenId: true,
      amount: true,
      confirmedAt: true,
      completedAt: true,
    },
  });

  if (!row) {
    console.log("[PROTECTED_RELEASED_SKIP]", {
      purchaseId: purchaseId.toString(),
      reason: "order_not_found",
    });
    return;
  }

  if (row.escrowStatus === "RELEASED") {
    return;
  }

  const isPhysical = row.fulfillmentType === "PHYSICAL_GOOD";
  const isService =
    !!row.fulfillmentType && isServiceFulfillment(row.fulfillmentType);

  await prisma.storeOrder.update({
    where: { id: row.id },
    data: {
      escrowStatus: "RELEASED",
      releasedAt: blockTime,
      escrowReleaseTxHash: txHash,
      confirmedAt: row.confirmedAt || blockTime,
      deliveryStatus: isPhysical ? "CONFIRMED" : row.deliveryStatus,
      serviceStatus: isService ? "CONFIRMED" : row.serviceStatus,
      completedAt: isService ? row.completedAt || blockTime : row.completedAt,
      protectedNftLockStatus: "COMPLETED_LOCKED",
      protectedNftPendingAmount: 0n,
      protectedNftCompletedAmount: row.amount,
      protectedNftCompletedAt: blockTime,
    },
  });

  const buyerId = row.buyerId || (await ensureUserByWallet(row.buyerWallet));

  if (buyerId) {
    const res = await prisma.holding.updateMany({
      where: {
        userId: buyerId,
        chainId: CHAIN_ID,
        contract: row.contract,
        tokenId: row.tokenId,
        pendingLockedAmount: { gte: row.amount },
      },
      data: {
        pendingLockedAmount: { decrement: row.amount },
        completedLockedAmount: { increment: row.amount },
      },
    });

    if (res.count === 0) {
      console.warn("[PROTECTED_RELEASE_LOCK_MOVE_MISS]", {
        buyerId,
        purchaseId: purchaseId.toString(),
        contract: row.contract,
        tokenId: row.tokenId,
        amount: row.amount.toString(),
      });
    }
  }

  console.log("[PROTECTED_RELEASED]", {
    purchaseId: purchaseId.toString(),
    txHash,
  });
}

/* ============================================================================
 * PURCHASE REFUNDED
 * Buyer holding was already decreased on PurchaseNftReturned.
 * Restore seller holding here.
 * ========================================================================== */
async function handleRefunded(parsed, log, blockTime) {
  const purchaseId = BigInt(parsed.args.purchaseId);
  const txHash = log.transactionHash;

  const row = await prisma.storeOrder.findUnique({
    where: orderWhereUnique(purchaseId),
    select: {
      id: true,
      escrowStatus: true,
      deliveryRequired: true,
      deliveryStatus: true,
      serviceStatus: true,
      fulfillmentType: true,
      sellerId: true,
      sellerWallet: true,
      contract: true,
      tokenId: true,
      amount: true,
    },
  });

  if (!row) {
    console.log("[PROTECTED_REFUNDED_SKIP]", {
      purchaseId: purchaseId.toString(),
      reason: "order_not_found",
    });
    return;
  }

  if (row.escrowStatus === "REFUNDED") {
    return;
  }

  await prisma.storeOrder.update({
    where: { id: row.id },
    data: {
      escrowStatus: "REFUNDED",
      refundedAt: blockTime,
      escrowRefundTxHash: txHash,
      protectedNftLockStatus: "RETURNED_TO_SELLER",
      protectedNftPendingAmount: 0n,
      protectedNftCompletedAmount: 0n,
      protectedNftUnlockedAt: blockTime,
      deliveryStatus: nextDeliveryStatusForRefund(
        row.deliveryRequired,
        row.deliveryStatus
      ),
      serviceStatus: nextServiceStatusForRefund(
        row.fulfillmentType,
        row.serviceStatus
      ),
    },
  });

  const sellerId = row.sellerId || (await ensureUserByWallet(row.sellerWallet));

  if (sellerId) {
    await upsertHoldingDelta({
      userId: sellerId,
      contract: row.contract,
      tokenId: row.tokenId,
      amountDelta: row.amount,
    });
  }

  console.log("[PROTECTED_REFUNDED]", {
    purchaseId: purchaseId.toString(),
    txHash,
  });
}

/* ============================================================================
 * REFUND REJECTED AND NFT RESTORED TO BUYER
 * NFT goes back to buyer after earlier return.
 * ========================================================================== */
async function handleRefundRejectedAndRestored(parsed, blockTime) {
  const purchaseId = BigInt(parsed.args.purchaseId);
  const buyer = norm(parsed.args.buyer);

  const row = await prisma.storeOrder.findUnique({
    where: orderWhereUnique(purchaseId),
    select: {
      id: true,
      nftReturnedAt: true,
      buyerId: true,
      buyerWallet: true,
      contract: true,
      tokenId: true,
      amount: true,
    },
  });

  if (!row) {
    console.log("[PROTECTED_REFUND_RESTORED_SKIP]", {
      purchaseId: purchaseId.toString(),
      reason: "order_not_found",
    });
    return;
  }

  if (!row.nftReturnedAt) {
    return;
  }

  await prisma.storeOrder.update({
    where: { id: row.id },
    data: {
      escrowStatus: "FUNDED",
      refundRejectedAt: blockTime,
      nftReturnedAt: null,
      protectedNftLockStatus: "PENDING_LOCKED",
      protectedNftPendingAmount: row.amount,
      protectedNftCompletedAmount: 0n,
      protectedNftLockedAt: blockTime,
      protectedNftUnlockedAt: null,
    },
  });

  const buyerId = row.buyerId || (await ensureUserByWallet(row.buyerWallet || buyer));

  if (buyerId) {
    await upsertHoldingDelta({
      userId: buyerId,
      contract: row.contract,
      tokenId: row.tokenId,
      amountDelta: row.amount,
      pendingDelta: row.amount,
    });
  }

  console.log("[PROTECTED_REFUND_RESTORED_TO_BUYER]", {
    purchaseId: purchaseId.toString(),
  });
}

/* ============================================================================
 * MAIN LOOP
 * ========================================================================== */
async function mainLoop() {
  let last = await getLastBlock();

  console.log("[PROTECTED_INDEXER] start", {
    chainId: CHAIN_ID,
    marketType: MARKET_TYPE,
    marketplace: MARKETPLACE,
    startBlock: START_BLOCK.toString(),
    startFrom: last.toString(),
    confirmations: CONFIRMATIONS.toString(),
    batch: BATCH.toString(),
    lookback: LOOKBACK_BLOCKS.toString(),
  });

  while (true) {
    try {
      const latest = BigInt(await provider.getBlockNumber());
      const safe = latest > CONFIRMATIONS ? latest - CONFIRMATIONS : 0n;

      const nextFrom = last + 1n;

      const overlapFrom =
        LOOKBACK_BLOCKS > 0n
          ? nextFrom > LOOKBACK_BLOCKS
            ? nextFrom - LOOKBACK_BLOCKS
            : 0n
          : nextFrom;

      const fromBlock =
        overlapFrom < minScanBlock() ? minScanBlock() : overlapFrom;

      if (fromBlock > safe) {
        await sleep(SLEEP_MS);
        continue;
      }

      const toBlock =
        fromBlock + BATCH - 1n > safe ? safe : fromBlock + BATCH - 1n;

      const rawLogs = await provider.getLogs({
        address: MARKETPLACE,
        fromBlock: Number(fromBlock),
        toBlock: Number(toBlock),
      });

      const logs = sortLogs(rawLogs);

      console.log(`[PROTECTED_SCAN] ${fromBlock}..${toBlock} logs=${logs.length}`);

      for (const log of logs) {
        let parsed = null;

        try {
          parsed = iface.parseLog(log);
        } catch {
          continue;
        }

        if (!parsed) continue;

        const blockTime = await getBlockTime(Number(log.blockNumber));

        if (parsed.name === "Listed") {
          await handleListed(parsed, log);
        }

        if (parsed.name === "Cancelled") {
          await handleCancelled(parsed, blockTime);
        }

        if (parsed.name === "PurchaseFunded") {
          await handlePurchaseFunded(parsed, log, blockTime);
        }

        if (parsed.name === "BuyerConfirmed") {
          await handleBuyerConfirmed(parsed, blockTime);
        }

        if (parsed.name === "RefundRequested") {
          await handleRefundRequested(parsed, blockTime);
        }

        if (parsed.name === "PurchaseNftReturned") {
          await handlePurchaseNftReturned(parsed, blockTime);
        }

        if (parsed.name === "RefundRequestRejected") {
          await handleRefundRequestRejected(parsed, blockTime);
        }

        if (parsed.name === "PurchaseReleased") {
          await handleReleased(parsed, log, blockTime);
        }

        if (parsed.name === "PurchaseRefunded") {
          await handleRefunded(parsed, log, blockTime);
        }

        if (parsed.name === "RefundRejectedAndNftRestored") {
          await handleRefundRejectedAndRestored(parsed, blockTime);
        }
      }

      await setLastBlock(toBlock);
      last = toBlock;
    } catch (e) {
      console.error("[PROTECTED_INDEXER_ERROR]", e);
      await sleep(SLEEP_MS);
    }
  }
}

process.on("SIGINT", async () => {
  try {
    await prisma.$disconnect();
  } finally {
    process.exit(0);
  }
});

process.on("SIGTERM", async () => {
  try {
    await prisma.$disconnect();
  } finally {
    process.exit(0);
  }
});

mainLoop().catch((e) => {
  console.error(e);
  process.exit(1);
});
