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
  process.env.REALIFE_MARKETPLACE_STANDARD_ADDRESS ||
  process.env.NEXT_PUBLIC_REALIFE_MARKETPLACE_STANDARD_ADDRESS ||
  process.env.REALIFE_MARKETPLACE_ADDRESS ||
  process.env.NEXT_PUBLIC_REALIFE_MARKETPLACE_ADDRESS ||
  process.env.MARKETPLACE_STANDARD_ADDRESS ||
  process.env.MARKETPLACE_ADDRESS ||
  ""
)
  .trim()
  .toLowerCase();

if (!MARKETPLACE) {
  throw new Error("STANDARD marketplace address missing");
}

const MARKET_TYPE = "STANDARD";

const START_BLOCK = BigInt(
  process.env.STANDARD_MARKETPLACE_START_BLOCK ||
    process.env.MARKETPLACE_STANDARD_START_BLOCK ||
    process.env.START_BLOCK ||
    "0"
);

const CONFIRMATIONS = BigInt(
  process.env.STANDARD_MARKETPLACE_CONFIRMATIONS ||
    process.env.CONFIRMATIONS ||
    "5"
);

const BATCH = BigInt(
  process.env.STANDARD_MARKETPLACE_BATCH_BLOCKS ||
    process.env.BATCH_BLOCKS ||
    "2000"
);

const SLEEP_MS = Number(
  process.env.STANDARD_MARKETPLACE_SLEEP_MS ||
    process.env.SLEEP_MS ||
    "8000"
);

const LOOKBACK_BLOCKS = BigInt(
  process.env.STANDARD_MARKETPLACE_LOOKBACK_BLOCKS ||
    process.env.LOOKBACK_BLOCKS ||
    "250"
);

const provider = new JsonRpcProvider(RPC_URL);

const ABI = [
  "event Listed(uint256 indexed listingId,address indexed seller,address indexed nft,uint256 tokenId,uint256 amount,uint256 pricePerUnitWei)",
  "event Cancelled(uint256 indexed listingId,address indexed seller,address indexed nft,uint256 tokenId)",
  "event Bought(uint256 indexed listingId,address indexed seller,address indexed buyer,address nft,uint256 tokenId,uint256 amount,uint256 pricePerUnitWei,uint256 totalPriceWei)",
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

function initialLastBlockValue() {
  if (START_BLOCK <= 0n) return 0n;
  return START_BLOCK - 1n;
}

function minScanBlock() {
  return START_BLOCK > 0n ? START_BLOCK : 0n;
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

function sortLogs(logs) {
  return [...logs].sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return Number(a.blockNumber) - Number(b.blockNumber);
    }
    return Number(a.index) - Number(b.index);
  });
}

async function mainLoop() {
  let last = await getLastBlock();

  console.log("[INDEXER] start", {
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

      console.log(`[SCAN] ${fromBlock}..${toBlock} logs=${logs.length}`);

      for (const log of logs) {
        let parsed = null;

        try {
          parsed = iface.parseLog(log);
        } catch {
          continue;
        }

        if (!parsed) continue;

        const blockTime = await getBlockTime(log.blockNumber);
        const txHash = log.transactionHash;
        const logIndex = Number(log.index);

        if (parsed.name === "Listed") {
          const listingId = BigInt(parsed.args.listingId);
          const seller = norm(parsed.args.seller);
          const nft = norm(parsed.args.nft);
          const tokenId = BigInt(parsed.args.tokenId).toString();
          const amount = BigInt(parsed.args.amount);
          const pricePerUnitWei = BigInt(parsed.args.pricePerUnitWei);

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
          ]);

          if (!mint?.verified) {
            console.log("[SKIP] mint missing/not verified", { nft, tokenId });
            continue;
          }

          const deliveryEnabled =
            product?.deliveryEnabled ?? Boolean(mint.deliveryEnabled);

          const physicalItemIncluded =
            product?.physicalItemIncluded ?? Boolean(mint.physicalItemIncluded);

          const officialItem =
            product?.officialItem ?? Boolean(mint.officialItem);

          const fulfillmentType = mint.fulfillmentType || null;
          const category = mint.category || null;
          const subcategory = mint.subcategory || null;

          await prisma.listing.upsert({
            where: {
              chainId_marketType_marketplaceListingId: {
                chainId: CHAIN_ID,
                marketType: MARKET_TYPE,
                marketplaceListingId: listingId,
              },
            },
            update: {
              marketType: MARKET_TYPE,
              marketplaceContract: MARKETPLACE,

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

              marketType: MARKET_TYPE,
              marketplaceContract: MARKETPLACE,

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

          console.log("[LISTED]", {
            marketType: MARKET_TYPE,
            listingId: listingId.toString(),
            seller,
            nft,
            tokenId,
            amount: amount.toString(),
            pricePerUnitWei: pricePerUnitWei.toString(),
            deliveryEnabled: Boolean(deliveryEnabled),
            physicalItemIncluded: Boolean(physicalItemIncluded),
            officialItem: Boolean(officialItem),
            fulfillmentType,
          });
        }

        if (parsed.name === "Cancelled") {
          const listingId = BigInt(parsed.args.listingId);

          await prisma.listing.updateMany({
            where: {
              chainId: CHAIN_ID,
              marketType: MARKET_TYPE,
              marketplaceContract: MARKETPLACE,
              marketplaceListingId: listingId,
              status: "ACTIVE",
            },
            data: {
              status: "CANCELLED",
              cancelledAt: blockTime,
            },
          });

          console.log("[CANCELLED]", {
            marketType: MARKET_TYPE,
            listingId: listingId.toString(),
          });
        }

        if (parsed.name === "Bought") {
          const listingId = BigInt(parsed.args.listingId);
          const seller = norm(parsed.args.seller);
          const buyer = norm(parsed.args.buyer);
          const nft = norm(parsed.args.nft);
          const tokenId = BigInt(parsed.args.tokenId).toString();
          const amount = BigInt(parsed.args.amount);
          const pricePerUnitWei = BigInt(parsed.args.pricePerUnitWei);
          const totalPriceWei = BigInt(parsed.args.totalPriceWei);

          const [mint, sellerId, buyerId, currentListing] = await Promise.all([
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
            ensureUserByWallet(buyer),
            prisma.listing.findUnique({
              where: {
                chainId_marketType_marketplaceListingId: {
                  chainId: CHAIN_ID,
                  marketType: MARKET_TYPE,
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
                fulfillmentType: true,
                category: true,
                subcategory: true,
              },
            }),
          ]);

          if (!mint?.verified) {
            console.log("[SKIP] trade mint missing/not verified", {
              nft,
              tokenId,
            });
            continue;
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

                marketType: MARKET_TYPE,
                marketplaceContract: MARKETPLACE,
                marketplaceListingId: listingId,
                marketplacePurchaseId: null,

                txHash,
                logIndex,
                blockNum: BigInt(log.blockNumber),
                blockTime,

                fulfillmentType:
                  currentListing?.fulfillmentType ?? mint.fulfillmentType ?? null,
                category: currentListing?.category ?? mint.category ?? null,
                subcategory:
                  currentListing?.subcategory ?? mint.subcategory ?? null,

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
              console.error("[TRADE_CREATE_ERROR]", e);
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
                    marketType: MARKET_TYPE,
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
              const res = await prisma.holding.updateMany({
                where: {
                  userId: sellerId,
                  chainId: CHAIN_ID,
                  contract: nft,
                  tokenId,
                  amount: { gte: amount },
                },
                data: { amount: { decrement: amount } },
              });

              if (res.count === 0) {
                console.warn("[STANDARD_BOUGHT_HOLDING_DECREMENT_MISS]", {
                  sellerId,
                  seller,
                  nft,
                  tokenId,
                  amount: amount.toString(),
                });
              }
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
                  amount,
                },
                update: {
                  amount: { increment: amount },
                  standard: "ERC1155",
                },
              });
            }
          }

          console.log("[BOUGHT]", {
            marketType: MARKET_TYPE,
            listingId: listingId.toString(),
            seller,
            buyer,
            nft,
            tokenId,
            amount: amount.toString(),
            totalPriceWei: totalPriceWei.toString(),
            createdTrade,
            tradeId: tradeRow?.id || null,
          });
        }
      }

      await setLastBlock(toBlock);
      last = toBlock;
    } catch (e) {
      console.error("[INDEXER_ERROR]", e);
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
