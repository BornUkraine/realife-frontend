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
  process.env.REALIFE_PROTECTED_MARKETPLACE_CONTRACT ||
  process.env.NEXT_PUBLIC_REALIFE_PROTECTED_MARKETPLACE_CONTRACT ||
  process.env.PROTECTED_MARKETPLACE_ADDRESS ||
  process.env.REALIFE_MARKETPLACE_PROTECTED_ADDRESS ||
  process.env.MARKETPLACE_PROTECTED_ADDRESS ||
  ""
)
  .trim()
  .toLowerCase();

if (!MARKETPLACE) {
  throw new Error("Protected marketplace address missing");
}

const MARKET_TYPE = "PROTECTED";

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

const provider = new JsonRpcProvider(RPC_URL);

const ABI = [
  "event Listed(uint256 indexed listingId,address indexed seller,address indexed nft,uint256 tokenId,uint256 amount,uint256 pricePerUnitWei,uint8 fulfillmentType)",
  "event Cancelled(uint256 indexed listingId,address indexed seller,address indexed nft,uint256 tokenId,uint256 amountReturned)",
  "event PurchaseFunded(uint256 indexed purchaseId,uint256 indexed listingId,address indexed buyer,address seller,address nft,uint256 tokenId,uint256 amount,uint256 totalPriceWei,uint8 fulfillmentType)",
  "event BuyerConfirmed(uint256 indexed purchaseId,uint256 indexed listingId,address indexed buyer)",
  "event RefundRequested(uint256 indexed purchaseId,uint256 indexed listingId,address indexed buyer)",
  "event PurchaseNftReturned(uint256 indexed purchaseId,uint256 indexed listingId,address indexed buyer)",
  "event RefundRequestRejected(uint256 indexed purchaseId,uint256 indexed listingId,address indexed buyer)",
  "event PurchaseReleased(uint256 indexed purchaseId,uint256 indexed listingId,address indexed seller,address buyer,uint256 totalPriceWei,uint256 feeWei,uint256 sellerAmountWei,uint8 fulfillmentType)",
  "event PurchaseRefunded(uint256 indexed purchaseId,uint256 indexed listingId,address indexed buyer,address seller,uint256 totalPriceWei,uint8 fulfillmentType)",
  "event RefundRejectedAndNftRestored(uint256 indexed purchaseId,uint256 indexed listingId,address indexed buyer)",
];

const iface = new Interface(ABI);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function norm(v) {
  return String(v || "").trim().toLowerCase();
}

function stateKey() {
  return `marketplace:${MARKET_TYPE}:${MARKETPLACE}`;
}

async function getLastBlock() {
  const key = stateKey();
  const row = await prisma.indexerState.upsert({
    where: { chainId_key: { chainId: CHAIN_ID, key } },
    update: {},
    create: { chainId: CHAIN_ID, key, lastBlock: START_BLOCK },
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
  if (blockTsCache.has(blockNumber)) return blockTsCache.get(blockNumber);
  const b = await provider.getBlock(blockNumber);
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

function fulfillmentTypeFromRaw(raw) {
  const n = Number(raw);

  if (n === 0) return "PHYSICAL_GOOD";
  if (n === 1) return "DIGITAL_SERVICE";
  if (n === 2) return "ONLINE_SESSION";
  if (n === 3) return "LOCAL_SERVICE";

  return "DIGITAL_SERVICE";
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

/**
 * ==========================================================================
 * LISTED
 * ==========================================================================
 * On PROTECTED listing, NFT moves into escrow marketplace custody.
 * So seller holding should decrease when listing is first seen.
 */
async function handleListed(parsed, log) {
  const listingId = BigInt(parsed.args.listingId);
  const seller = norm(parsed.args.seller);
  const nft = norm(parsed.args.nft);
  const tokenId = BigInt(parsed.args.tokenId).toString();
  const amount = BigInt(parsed.args.amount);
  const pricePerUnitWei = BigInt(parsed.args.pricePerUnitWei);
  const fulfillmentType = fulfillmentTypeFromRaw(parsed.args.fulfillmentType);
  const txHash = log.transactionHash;

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
      where: {
        chainId_marketType_marketplaceListingId: {
          chainId: CHAIN_ID,
          marketType: "PROTECTED",
          marketplaceListingId: listingId,
        },
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!mint?.verified) {
    console.log("[PROTECTED_SKIP] mint missing/not verified", { nft, tokenId });
    return;
  }

  const deliveryEnabled =
    isPhysicalFulfillment(fulfillmentType) ||
    product?.deliveryEnabled ||
    Boolean(mint.deliveryEnabled);

  const physicalItemIncluded =
    isPhysicalFulfillment(fulfillmentType) ||
    product?.physicalItemIncluded ||
    Boolean(mint.physicalItemIncluded);

  const officialItem = product?.officialItem ?? Boolean(mint.officialItem);

  const category = mint.category || null;
  const subcategory = mint.subcategory || null;

  await prisma.listing.upsert({
    where: {
      chainId_marketType_marketplaceListingId: {
        chainId: CHAIN_ID,
        marketType: "PROTECTED",
        marketplaceListingId: listingId,
      },
    },
    update: {
      marketplaceContract: MARKETPLACE,
      marketType: "PROTECTED",
      status: "ACTIVE",
      sellerId,
      sellerWallet: seller,
      pricePerUnitWei,
      amountTotal: amount,
      amountRemaining: amount,
      standard: "ERC1155",
      createdTxHash: txHash,
      cancelledAt: null,
      soldOutAt: null,
      deliveryEnabled: Boolean(deliveryEnabled),
      physicalItemIncluded: Boolean(physicalItemIncluded),
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
      marketType: "PROTECTED",
      sellerId,
      sellerWallet: seller,
      marketplaceListingId: listingId,
      pricePerUnitWei,
      amountTotal: amount,
      amountRemaining: amount,
      status: "ACTIVE",
      createdTxHash: txHash,
      deliveryEnabled: Boolean(deliveryEnabled),
      physicalItemIncluded: Boolean(physicalItemIncluded),
      officialItem: Boolean(officialItem),
      fulfillmentType,
      category,
      subcategory,
    },
  });

  // Seller sent NFT into escrow on listing
  if (!existingListing && sellerId) {
    await prisma.holding.updateMany({
      where: {
        userId: sellerId,
        chainId: CHAIN_ID,
        contract: nft,
        tokenId,
      },
      data: {
        amount: { decrement: amount },
      },
    });
  }

  console.log("[PROTECTED_LISTED]", {
    listingId: listingId.toString(),
    seller,
    nft,
    tokenId,
    amount: amount.toString(),
    pricePerUnitWei: pricePerUnitWei.toString(),
    fulfillmentType,
  });
}

/**
 * ==========================================================================
 * CANCELLED
 * ==========================================================================
 * Listing was cancelled before full sale.
 * Remaining escrowed NFT amount returns back to seller custody.
 */
async function handleCancelled(parsed, blockTime) {
  const listingId = BigInt(parsed.args.listingId);
  const amountReturned = BigInt(parsed.args.amountReturned);

  const row = await prisma.listing.findUnique({
    where: {
      chainId_marketType_marketplaceListingId: {
        chainId: CHAIN_ID,
        marketType: "PROTECTED",
        marketplaceListingId: listingId,
      },
    },
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
    where: {
      chainId_marketType_marketplaceListingId: {
        chainId: CHAIN_ID,
        marketType: "PROTECTED",
        marketplaceListingId: listingId,
      },
    },
    data: {
      status: "CANCELLED",
      cancelledAt: blockTime,
      amountRemaining: 0n,
    },
  });

  if (row.sellerId && amountReturned > 0n) {
    await prisma.holding.upsert({
      where: {
        userId_chainId_contract_tokenId: {
          userId: row.sellerId,
          chainId: CHAIN_ID,
          contract: row.contract,
          tokenId: row.tokenId,
        },
      },
      create: {
        userId: row.sellerId,
        chainId: CHAIN_ID,
        contract: row.contract,
        tokenId: row.tokenId,
        standard: "ERC1155",
        amount: amountReturned,
      },
      update: {
        standard: "ERC1155",
        amount: { increment: amountReturned },
      },
    });
  }

  console.log("[PROTECTED_CANCELLED]", {
    listingId: listingId.toString(),
    amountReturned: amountReturned.toString(),
  });
}

/**
 * ==========================================================================
 * PURCHASE FUNDED
 * ==========================================================================
 * In the HYBRID protected flow:
 * - buyer pays into escrow
 * - buyer immediately receives NFT
 * - seller is not paid yet
 */
async function handlePurchaseFunded(parsed, log, blockTime) {
  const purchaseId = BigInt(parsed.args.purchaseId);
  const listingId = BigInt(parsed.args.listingId);
  const buyer = norm(parsed.args.buyer);
  const seller = norm(parsed.args.seller);
  const nft = norm(parsed.args.nft);
  const tokenId = BigInt(parsed.args.tokenId).toString();
  const amount = BigInt(parsed.args.amount);
  const totalPriceWei = BigInt(parsed.args.totalPriceWei);
  const fulfillmentType = fulfillmentTypeFromRaw(parsed.args.fulfillmentType);
  const txHash = log.transactionHash;
  const logIndex = Number(log.index);

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
      where: {
        chainId_marketType_marketplaceListingId: {
          chainId: CHAIN_ID,
          marketType: "PROTECTED",
          marketplaceListingId: listingId,
        },
      },
      select: {
        id: true,
        status: true,
        amountRemaining: true,
        pricePerUnitWei: true,
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

  const pricePerUnitWei =
    currentListing?.pricePerUnitWei != null
      ? BigInt(currentListing.pricePerUnitWei)
      : totalPriceWei / amount;

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
        marketType: "PROTECTED",
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
        pricePerUnitWei,
        totalPriceWei,
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
      where: {
        chainId_marketType_marketplaceListingId: {
          chainId: CHAIN_ID,
          marketType: "PROTECTED",
          marketplaceListingId: listingId,
        },
      },
      data: {
        amountRemaining: soldOut ? 0n : newRemaining,
        status: soldOut ? "SOLD_OUT" : "ACTIVE",
        soldOutAt: soldOut ? blockTime : null,
      },
    });
  }

  // Buyer already received NFT on PurchaseFunded
  if (createdTrade && buyerId) {
    await prisma.holding.upsert({
      where: {
        userId_chainId_contract_tokenId: {
          userId: buyerId,
          chainId: CHAIN_ID,
          contract: nft,
          tokenId,
        },
      },
      create: {
        userId: buyerId,
        chainId: CHAIN_ID,
        contract: nft,
        tokenId,
        standard: "ERC1155",
        amount,
      },
      update: {
        standard: "ERC1155",
        amount: { increment: amount },
      },
    });
  }

  const vertical = product?.vertical || "marketplace";
  const deliveryRequired = isPhysicalFulfillment(fulfillmentType);
  const physicalItem =
    isPhysicalFulfillment(fulfillmentType) ||
    currentListing?.physicalItemIncluded ||
    product?.physicalItemIncluded ||
    Boolean(mint.physicalItemIncluded);

  const officialItem =
    currentListing?.officialItem ??
    product?.officialItem ??
    Boolean(mint.officialItem);

  const category = currentListing?.category ?? mint.category ?? null;
  const subcategory = currentListing?.subcategory ?? mint.subcategory ?? null;

  if (tradeRow?.id) {
    const existingOrder = await prisma.storeOrder.findFirst({
      where: {
        marketType: "PROTECTED",
        marketplaceContract: MARKETPLACE,
        marketplacePurchaseId: purchaseId,
      },
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

          marketType: "PROTECTED",
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
          unitPrice: pricePerUnitWei,
          totalPrice: totalPriceWei,

          paymentToken: null,

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
    totalPriceWei: totalPriceWei.toString(),
    fulfillmentType,
  });
}

/**
 * ==========================================================================
 * BUYER CONFIRMED
 * ==========================================================================
 * Buyer confirmed delivery/service completion,
 * but funds may still remain in escrow until release event.
 */
async function handleBuyerConfirmed(parsed, blockTime) {
  const purchaseId = BigInt(parsed.args.purchaseId);

  const rows = await prisma.storeOrder.findMany({
    where: {
      chainId: CHAIN_ID,
      marketType: "PROTECTED",
      marketplaceContract: MARKETPLACE,
      marketplacePurchaseId: purchaseId,
    },
    select: {
      id: true,
      deliveryRequired: true,
      fulfillmentType: true,
      deliveryStatus: true,
      serviceStatus: true,
      confirmedAt: true,
      buyerConfirmedAt: true,
    },
  });

  for (const row of rows) {
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
  }

  console.log("[PROTECTED_BUYER_CONFIRMED]", {
    purchaseId: purchaseId.toString(),
    updated: rows.length,
  });
}

/**
 * ==========================================================================
 * REFUND REQUESTED
 * ==========================================================================
 * Buyer asked for refund.
 * In hybrid flow NFT may still be with buyer until PurchaseNftReturned happens.
 */
async function handleRefundRequested(parsed, blockTime) {
  const purchaseId = BigInt(parsed.args.purchaseId);

  const rows = await prisma.storeOrder.findMany({
    where: {
      chainId: CHAIN_ID,
      marketType: "PROTECTED",
      marketplaceContract: MARKETPLACE,
      marketplacePurchaseId: purchaseId,
    },
    select: {
      id: true,
    },
  });

  for (const row of rows) {
    await prisma.storeOrder.update({
      where: { id: row.id },
      data: {
        escrowStatus: "DISPUTED",
        disputedAt: blockTime,
        refundRequestedAt: blockTime,
      },
    });
  }

  console.log("[PROTECTED_REFUND_REQUESTED]", {
    purchaseId: purchaseId.toString(),
    updated: rows.length,
  });
}

/**
 * ==========================================================================
 * PURCHASE NFT RETURNED
 * ==========================================================================
 * Buyer returned NFT back to escrow contract.
 * Buyer holding must decrease here.
 */
async function handlePurchaseNftReturned(parsed, blockTime) {
  const purchaseId = BigInt(parsed.args.purchaseId);
  const buyer = norm(parsed.args.buyer);

  const rows = await prisma.storeOrder.findMany({
    where: {
      chainId: CHAIN_ID,
      marketType: "PROTECTED",
      marketplaceContract: MARKETPLACE,
      marketplacePurchaseId: purchaseId,
    },
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

  for (const row of rows) {
    if (row.nftReturnedAt) continue;

    await prisma.storeOrder.update({
      where: { id: row.id },
      data: {
        escrowStatus: "DISPUTED",
        disputedAt: blockTime,
        nftReturnedAt: blockTime,
      },
    });

    const buyerId = row.buyerId || (await ensureUserByWallet(row.buyerWallet || buyer));
    if (buyerId) {
      await prisma.holding.updateMany({
        where: {
          userId: buyerId,
          chainId: CHAIN_ID,
          contract: row.contract,
          tokenId: row.tokenId,
        },
        data: {
          amount: { decrement: row.amount },
        },
      });
    }
  }

  console.log("[PROTECTED_NFT_RETURNED]", {
    purchaseId: purchaseId.toString(),
    updated: rows.length,
  });
}

/**
 * ==========================================================================
 * REFUND REQUEST REJECTED
 * ==========================================================================
 * Refund request was rejected before final refund.
 * Purchase goes back to FUNDED state.
 */
async function handleRefundRequestRejected(parsed, blockTime) {
  const purchaseId = BigInt(parsed.args.purchaseId);

  const rows = await prisma.storeOrder.findMany({
    where: {
      chainId: CHAIN_ID,
      marketType: "PROTECTED",
      marketplaceContract: MARKETPLACE,
      marketplacePurchaseId: purchaseId,
    },
    select: {
      id: true,
    },
  });

  for (const row of rows) {
    await prisma.storeOrder.update({
      where: { id: row.id },
      data: {
        escrowStatus: "FUNDED",
        refundRejectedAt: blockTime,
      },
    });
  }

  console.log("[PROTECTED_REFUND_REQUEST_REJECTED]", {
    purchaseId: purchaseId.toString(),
    updated: rows.length,
  });
}

/**
 * ==========================================================================
 * PURCHASE RELEASED
 * ==========================================================================
 * Escrow resolves in seller favor:
 * - buyer already has NFT
 * - seller receives funds
 *
 * Important:
 * In hybrid flow buyer holding should NOT change here,
 * because buyer already received NFT on PurchaseFunded.
 */
async function handleReleased(parsed, log, blockTime) {
  const purchaseId = BigInt(parsed.args.purchaseId);
  const txHash = log.transactionHash;

  const rows = await prisma.storeOrder.findMany({
    where: {
      chainId: CHAIN_ID,
      marketType: "PROTECTED",
      marketplaceContract: MARKETPLACE,
      marketplacePurchaseId: purchaseId,
    },
    select: {
      id: true,
      escrowStatus: true,
      deliveryRequired: true,
      deliveryStatus: true,
      serviceStatus: true,
      fulfillmentType: true,
      confirmedAt: true,
      completedAt: true,
      buyerConfirmedAt: true,
    },
  });

  for (const row of rows) {
    if (row.escrowStatus === "RELEASED") continue;

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
      },
    });
  }

  console.log("[PROTECTED_RELEASED]", {
    purchaseId: purchaseId.toString(),
    txHash,
    updated: rows.length,
  });
}

/**
 * ==========================================================================
 * PURCHASE REFUNDED
 * ==========================================================================
 * Escrow resolves in buyer favor:
 * - buyer gets funds back
 * - seller gets NFT back
 *
 * Important:
 * buyer holding was already decreased on PurchaseNftReturned,
 * so here we only restore seller holding.
 */
async function handleRefunded(parsed, log, blockTime) {
  const purchaseId = BigInt(parsed.args.purchaseId);
  const txHash = log.transactionHash;

  const rows = await prisma.storeOrder.findMany({
    where: {
      chainId: CHAIN_ID,
      marketType: "PROTECTED",
      marketplaceContract: MARKETPLACE,
      marketplacePurchaseId: purchaseId,
    },
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

  for (const row of rows) {
    if (row.escrowStatus === "REFUNDED") continue;

    await prisma.storeOrder.update({
      where: { id: row.id },
      data: {
        escrowStatus: "REFUNDED",
        refundedAt: blockTime,
        escrowRefundTxHash: txHash,
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

    const sellerId =
      row.sellerId || (await ensureUserByWallet(row.sellerWallet));

    if (sellerId) {
      await prisma.holding.upsert({
        where: {
          userId_chainId_contract_tokenId: {
            userId: sellerId,
            chainId: CHAIN_ID,
            contract: row.contract,
            tokenId: row.tokenId,
          },
        },
        create: {
          userId: sellerId,
          chainId: CHAIN_ID,
          contract: row.contract,
          tokenId: row.tokenId,
          standard: "ERC1155",
          amount: row.amount,
        },
        update: {
          standard: "ERC1155",
          amount: { increment: row.amount },
        },
      });
    }
  }

  console.log("[PROTECTED_REFUNDED]", {
    purchaseId: purchaseId.toString(),
    txHash,
    updated: rows.length,
  });
}

/**
 * ==========================================================================
 * REFUND REJECTED AND NFT RESTORED TO BUYER
 * ==========================================================================
 * If buyer already returned NFT but refund was rejected,
 * NFT is sent back to buyer and holding must increase again.
 */
async function handleRefundRejectedAndRestored(parsed, blockTime) {
  const purchaseId = BigInt(parsed.args.purchaseId);
  const buyer = norm(parsed.args.buyer);

  const rows = await prisma.storeOrder.findMany({
    where: {
      chainId: CHAIN_ID,
      marketType: "PROTECTED",
      marketplaceContract: MARKETPLACE,
      marketplacePurchaseId: purchaseId,
    },
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

  for (const row of rows) {
    if (!row.nftReturnedAt) continue;

    await prisma.storeOrder.update({
      where: { id: row.id },
      data: {
        escrowStatus: "FUNDED",
        refundRejectedAt: blockTime,
        nftReturnedAt: null,
      },
    });

    const buyerId = row.buyerId || (await ensureUserByWallet(row.buyerWallet || buyer));
    if (buyerId) {
      await prisma.holding.upsert({
        where: {
          userId_chainId_contract_tokenId: {
            userId: buyerId,
            chainId: CHAIN_ID,
            contract: row.contract,
            tokenId: row.tokenId,
          },
        },
        create: {
          userId: buyerId,
          chainId: CHAIN_ID,
          contract: row.contract,
          tokenId: row.tokenId,
          standard: "ERC1155",
          amount: row.amount,
        },
        update: {
          standard: "ERC1155",
          amount: { increment: row.amount },
        },
      });
    }
  }

  console.log("[PROTECTED_REFUND_RESTORED_TO_BUYER]", {
    purchaseId: purchaseId.toString(),
    updated: rows.length,
  });
}

/**
 * ==========================================================================
 * MAIN LOOP
 * ==========================================================================
 */
async function mainLoop() {
  let last = await getLastBlock();

  console.log("[PROTECTED_INDEXER] start", {
    chainId: CHAIN_ID,
    marketType: MARKET_TYPE,
    marketplace: MARKETPLACE,
    startFrom: last.toString(),
    confirmations: CONFIRMATIONS.toString(),
    batch: BATCH.toString(),
  });

  while (true) {
    try {
      const latest = BigInt(await provider.getBlockNumber());
      const safe = latest > CONFIRMATIONS ? latest - CONFIRMATIONS : 0n;

      const fromBlock = last + 1n;
      if (fromBlock > safe) {
        await sleep(SLEEP_MS);
        continue;
      }

      const toBlock =
        fromBlock + BATCH - 1n > safe ? safe : fromBlock + BATCH - 1n;

      const logs = await provider.getLogs({
        address: MARKETPLACE,
        fromBlock: Number(fromBlock),
        toBlock: Number(toBlock),
      });

      console.log(`[PROTECTED_SCAN] ${fromBlock}..${toBlock} logs=${logs.length}`);

      for (const log of logs) {
        let parsed = null;

        try {
          parsed = iface.parseLog(log);
        } catch {
          continue;
        }

        if (!parsed) continue;

        const blockTime = await getBlockTime(log.blockNumber);

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