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
  process.env.REALIFE_MARKETPLACE_DELIVERY_ADDRESS ||
  process.env.NEXT_PUBLIC_REALIFE_MARKETPLACE_DELIVERY_ADDRESS ||
  process.env.MARKETPLACE_DELIVERY_ADDRESS ||
  ""
)
  .trim()
  .toLowerCase();

if (!MARKETPLACE) {
  throw new Error("REALIFE_MARKETPLACE_DELIVERY_ADDRESS missing");
}

const START_BLOCK = BigInt(
  process.env.DELIVERY_MARKETPLACE_START_BLOCK ||
    process.env.MARKETPLACE_DELIVERY_START_BLOCK ||
    "0"
);

const CONFIRMATIONS = BigInt(
  process.env.DELIVERY_MARKETPLACE_CONFIRMATIONS ||
    process.env.CONFIRMATIONS ||
    "5"
);

const BATCH = BigInt(
  process.env.DELIVERY_MARKETPLACE_BATCH_BLOCKS ||
    process.env.BATCH_BLOCKS ||
    "2000"
);

const SLEEP_MS = Number(
  process.env.DELIVERY_MARKETPLACE_SLEEP_MS ||
    process.env.SLEEP_MS ||
    "8000"
);

const provider = new JsonRpcProvider(RPC_URL);

const ABI = [
  "event Listed(uint256 indexed listingId,address indexed seller,address indexed nft,uint256 tokenId,uint256 amount,uint256 pricePerUnitWei)",
  "event Cancelled(uint256 indexed listingId,address indexed seller,address indexed nft,uint256 tokenId)",
  "event Bought(uint256 indexed purchaseId,uint256 indexed listingId,address indexed seller,address buyer,address nft,uint256 tokenId,uint256 amount,uint256 pricePerUnitWei,uint256 totalPriceWei)",
  "event PurchaseReleased(uint256 indexed purchaseId,uint256 indexed listingId,address indexed seller,address buyer,uint256 totalPriceWei,uint256 feeWei,uint256 sellerAmountWei)",
  "event PurchaseRefunded(uint256 indexed purchaseId,uint256 indexed listingId,address indexed seller,address buyer,uint256 totalPriceWei)",
];

const iface = new Interface(ABI);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function norm(v) {
  return String(v || "").trim().toLowerCase();
}

function stateKey() {
  return `delivery-marketplace:${MARKETPLACE}`;
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

async function handleListed(parsed, log, blockTime) {
  const listingId = BigInt(parsed.args.listingId);
  const seller = norm(parsed.args.seller);
  const nft = norm(parsed.args.nft);
  const tokenId = BigInt(parsed.args.tokenId).toString();
  const amount = BigInt(parsed.args.amount);
  const pricePerUnitWei = BigInt(parsed.args.pricePerUnitWei);
  const txHash = log.transactionHash;

  const [product, mint, sellerId] = await Promise.all([
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
        paymentToken: true,
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
      },
    }),
    ensureUserByWallet(seller),
  ]);

  if (!mint?.verified) {
    console.log("[DELIVERY_SKIP] mint missing/not verified", { nft, tokenId });
    return;
  }

  const deliveryEnabled =
    product?.deliveryEnabled ?? Boolean(mint.deliveryEnabled);

  const physicalItemIncluded =
    product?.physicalItemIncluded ?? Boolean(mint.physicalItemIncluded);

  const officialItem =
    product?.officialItem ?? Boolean(mint.officialItem);

  await prisma.listing.upsert({
    where: {
      chainId_marketType_marketplaceListingId: {
        chainId: CHAIN_ID,
        marketType: "DELIVERY",
        marketplaceListingId: listingId,
      },
    },
    update: {
      marketplaceContract: MARKETPLACE,
      marketType: "DELIVERY",
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
    },
    create: {
      chainId: CHAIN_ID,
      contract: nft,
      tokenId,
      standard: "ERC1155",
      marketplaceContract: MARKETPLACE,
      marketType: "DELIVERY",
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
    },
  });

  console.log("[DELIVERY_LISTED]", {
    listingId: listingId.toString(),
    seller,
    nft,
    tokenId,
    amount: amount.toString(),
    pricePerUnitWei: pricePerUnitWei.toString(),
    deliveryEnabled: Boolean(deliveryEnabled),
    physicalItemIncluded: Boolean(physicalItemIncluded),
    officialItem: Boolean(officialItem),
  });
}

async function handleCancelled(parsed, blockTime) {
  const listingId = BigInt(parsed.args.listingId);

  await prisma.listing.updateMany({
    where: {
      chainId: CHAIN_ID,
      marketType: "DELIVERY",
      marketplaceContract: MARKETPLACE,
      marketplaceListingId: listingId,
      status: "ACTIVE",
    },
    data: { status: "CANCELLED", cancelledAt: blockTime },
  });

  console.log("[DELIVERY_CANCELLED]", { listingId: listingId.toString() });
}

async function handleBought(parsed, log, blockTime) {
  const purchaseId = BigInt(parsed.args.purchaseId);
  const listingId = BigInt(parsed.args.listingId);
  const seller = norm(parsed.args.seller);
  const buyer = norm(parsed.args.buyer);
  const nft = norm(parsed.args.nft);
  const tokenId = BigInt(parsed.args.tokenId).toString();
  const amount = BigInt(parsed.args.amount);
  const pricePerUnitWei = BigInt(parsed.args.pricePerUnitWei);
  const totalPriceWei = BigInt(parsed.args.totalPriceWei);
  const txHash = log.transactionHash;
  const logIndex = Number(log.index);

  const [product, mint, sellerId, buyerId, currentListing] =
    await Promise.all([
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
          paymentToken: true,
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
        },
      }),
      ensureUserByWallet(seller),
      ensureUserByWallet(buyer),
      prisma.listing.findUnique({
        where: {
          chainId_marketType_marketplaceListingId: {
            chainId: CHAIN_ID,
            marketType: "DELIVERY",
            marketplaceListingId: listingId,
          },
        },
        select: {
          id: true,
          status: true,
          amountRemaining: true,
          deliveryEnabled: true,
          physicalItemIncluded: true,
          officialItem: true,
        },
      }),
    ]);

  if (!mint?.verified) {
    console.log("[DELIVERY_SKIP] trade mint missing/not verified", { nft, tokenId });
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
        marketType: "DELIVERY",
        marketplaceListingId: listingId,
        marketplacePurchaseId: purchaseId,

        txHash,
        logIndex,
        blockNum: BigInt(log.blockNumber),
        blockTime,

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
      console.error("[DELIVERY_TRADE_CREATE_ERROR]", e);
      createdTrade = false;
    }
  }

  if (createdTrade) {
    if (currentListing && currentListing.status === "ACTIVE") {
      const newRemaining = BigInt(currentListing.amountRemaining) - amount;
      const soldOut = newRemaining <= 0n;

      await prisma.listing.update({
        where: {
          chainId_marketType_marketplaceListingId: {
            chainId: CHAIN_ID,
            marketType: "DELIVERY",
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

    if (sellerId) {
      await prisma.holding.updateMany({
        where: {
          userId: sellerId,
          chainId: CHAIN_ID,
          contract: nft,
          tokenId,
        },
        data: { amount: { decrement: amount } },
      });
    }

    if (buyerId) {
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
          amount: amount,
        },
        update: { amount: { increment: amount }, standard: "ERC1155" },
      });
    }
  }

  const deliveryEnabled =
    currentListing?.deliveryEnabled ??
    product?.deliveryEnabled ??
    Boolean(mint.deliveryEnabled);

  const physicalItemIncluded =
    currentListing?.physicalItemIncluded ??
    product?.physicalItemIncluded ??
    Boolean(mint.physicalItemIncluded);

  const officialItem =
    currentListing?.officialItem ??
    product?.officialItem ??
    Boolean(mint.officialItem);

  const deliveryRequired =
    Boolean(deliveryEnabled) || Boolean(physicalItemIncluded);

  const vertical = product?.vertical || "marketplace";

  if (tradeRow?.id && deliveryRequired) {
    const existingOrder = await prisma.storeOrder.findFirst({
      where: {
        tradeId: tradeRow.id,
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

          marketplaceContract: MARKETPLACE,
          marketType: "DELIVERY",

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

          deliveryRequired: true,
          physicalItem: Boolean(physicalItemIncluded),
          officialItem: Boolean(officialItem),

          escrowStatus: "FUNDED",
          deliveryStatus: "PENDING",
          escrowFundedAt: blockTime,

          buyTxHash: txHash,
        },
      });

      console.log("[DELIVERY_STORE_ORDER_CREATED]", {
        tradeId: tradeRow.id,
        purchaseId: purchaseId.toString(),
        listingId: listingId.toString(),
        nft,
        tokenId,
        buyer,
        seller,
        vertical,
        deliveryRequired,
        physicalItemIncluded: Boolean(physicalItemIncluded),
      });
    }
  }

  console.log("[DELIVERY_BOUGHT]", {
    purchaseId: purchaseId.toString(),
    listingId: listingId.toString(),
    seller,
    buyer,
    nft,
    tokenId,
    amount: amount.toString(),
    totalPriceWei: totalPriceWei.toString(),
    createdTrade,
    vertical,
    deliveryEnabled: Boolean(deliveryEnabled),
    physicalItemIncluded: Boolean(physicalItemIncluded),
    deliveryRequired: Boolean(deliveryRequired),
  });
}

async function handleReleased(parsed, log, blockTime) {
  const purchaseId = BigInt(parsed.args.purchaseId);
  const txHash = log.transactionHash;

  const rows = await prisma.storeOrder.findMany({
    where: {
      chainId: CHAIN_ID,
      marketType: "DELIVERY",
      marketplaceContract: MARKETPLACE,
      marketplacePurchaseId: purchaseId,
    },
    select: {
      id: true,
      escrowStatus: true,
      deliveryStatus: true,
      confirmedAt: true,
    },
  });

  for (const row of rows) {
    await prisma.storeOrder.update({
      where: { id: row.id },
      data: {
        escrowStatus: "RELEASED",
        releasedAt: blockTime,
        escrowReleaseTxHash: txHash,
        deliveryStatus: "CONFIRMED",
        confirmedAt: row.confirmedAt || blockTime,
      },
    });
  }

  console.log("[DELIVERY_RELEASED]", {
    purchaseId: purchaseId.toString(),
    txHash,
    updated: rows.length,
  });
}

async function handleRefunded(parsed, log, blockTime) {
  const purchaseId = BigInt(parsed.args.purchaseId);
  const txHash = log.transactionHash;

  const rows = await prisma.storeOrder.findMany({
    where: {
      chainId: CHAIN_ID,
      marketType: "DELIVERY",
      marketplaceContract: MARKETPLACE,
      marketplacePurchaseId: purchaseId,
    },
    select: {
      id: true,
      deliveryRequired: true,
      deliveryStatus: true,
      escrowStatus: true,
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
      },
    });
  }

  console.log("[DELIVERY_REFUNDED]", {
    purchaseId: purchaseId.toString(),
    txHash,
    updated: rows.length,
  });
}

async function mainLoop() {
  let last = await getLastBlock();

  console.log("[DELIVERY_INDEXER] start", {
    chainId: CHAIN_ID,
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

      console.log(`[DELIVERY_SCAN] ${fromBlock}..${toBlock} logs=${logs.length}`);

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
          await handleListed(parsed, log, blockTime);
        }

        if (parsed.name === "Cancelled") {
          await handleCancelled(parsed, blockTime);
        }

        if (parsed.name === "Bought") {
          await handleBought(parsed, log, blockTime);
        }

        if (parsed.name === "PurchaseReleased") {
          await handleReleased(parsed, log, blockTime);
        }

        if (parsed.name === "PurchaseRefunded") {
          await handleRefunded(parsed, log, blockTime);
        }
      }

      await setLastBlock(toBlock);
      last = toBlock;
    } catch (e) {
      console.error("[DELIVERY_INDEXER_ERROR]", e);
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