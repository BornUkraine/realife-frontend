import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { JsonRpcProvider, Interface } from "ethers";

const prisma = new PrismaClient();

const RPC_URL =
  process.env.RPC_URL ||
  process.env.BASE_SEPOLIA_RPC ||
  "https://sepolia.base.org";

const CHAIN_ID = Number(process.env.CHAIN_ID || "84532");
const MARKETPLACE = (process.env.MARKETPLACE_ADDRESS || "").trim().toLowerCase();
if (!MARKETPLACE) throw new Error("MARKETPLACE_ADDRESS missing");

const START_BLOCK = BigInt(process.env.START_BLOCK || "0");
const CONFIRMATIONS = BigInt(process.env.CONFIRMATIONS || "5");
const BATCH = BigInt(process.env.BATCH_BLOCKS || "2000");
const SLEEP_MS = Number(process.env.SLEEP_MS || "8000");

const provider = new JsonRpcProvider(RPC_URL);

// ABI под RealifeMarketplaceSpot1155 (events)
const ABI = [
  "event Listed(uint256 indexed listingId,address indexed seller,address indexed nft,uint256 tokenId,uint256 amount,uint256 pricePerUnitWei)",
  "event Cancelled(uint256 indexed listingId,address indexed seller,address indexed nft,uint256 tokenId)",
  "event Bought(uint256 indexed listingId,address indexed seller,address indexed buyer,address nft,uint256 tokenId,uint256 amount,uint256 pricePerUnitWei,uint256 totalPriceWei)",
];

const iface = new Interface(ABI);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function stateKey() {
  return `marketplace:${MARKETPLACE}`;
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

const blockTsCache = new Map(); // number -> Date

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

async function mainLoop() {
  let last = await getLastBlock();
  console.log("[INDEXER] start", {
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

      // ✅ ethers v6: fromBlock/toBlock лучше numbers
      const logs = await provider.getLogs({
        address: MARKETPLACE,
        fromBlock: Number(fromBlock),
        toBlock: Number(toBlock),
      });

      console.log(`[SCAN] ${fromBlock}..${toBlock} logs=${logs.length}`);

      for (const log of logs) {
        let parsed = null;

        // ✅ ethers v6 может вернуть null (а не throw), если event не из ABI
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
          const seller = String(parsed.args.seller).toLowerCase();
          const nft = String(parsed.args.nft).toLowerCase();
          const tokenId = BigInt(parsed.args.tokenId).toString();
          const amount = BigInt(parsed.args.amount);
          const pricePerUnitWei = BigInt(parsed.args.pricePerUnitWei);

          const mint = await prisma.mint.findUnique({
            where: {
              chainId_contract_tokenId: {
                chainId: CHAIN_ID,
                contract: nft,
                tokenId,
              },
            },
            select: { verified: true },
          });

          if (!mint?.verified) {
            console.log("[SKIP] mint missing/not verified", { nft, tokenId });
            continue;
          }

          const sellerUser = await prisma.user.findUnique({
            where: { walletAddress: seller },
            select: { id: true },
          });
          const sellerId = sellerUser?.id ?? null;

          if (!sellerId) {
            console.log("[WARN] seller not in db -> sellerId=null", { seller });
          }

          await prisma.listing.upsert({
            where: {
              chainId_marketplaceListingId: {
                chainId: CHAIN_ID,
                marketplaceListingId: listingId,
              },
            },
            update: {
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
            },
            create: {
              chainId: CHAIN_ID,
              contract: nft,
              tokenId,
              standard: "ERC1155",
              sellerId,
              sellerWallet: seller,
              marketplaceListingId: listingId,
              pricePerUnitWei,
              amountTotal: amount,
              amountRemaining: amount,
              status: "ACTIVE",
              createdTxHash: txHash,
            },
          });

          console.log("[LISTED]", {
            listingId: listingId.toString(),
            seller,
            nft,
            tokenId,
            amount: amount.toString(),
            pricePerUnitWei: pricePerUnitWei.toString(),
          });
        }

        if (parsed.name === "Cancelled") {
          const listingId = BigInt(parsed.args.listingId);

          await prisma.listing.updateMany({
            where: {
              chainId: CHAIN_ID,
              marketplaceListingId: listingId,
              status: "ACTIVE",
            },
            data: { status: "CANCELLED", cancelledAt: blockTime },
          });

          console.log("[CANCELLED]", { listingId: listingId.toString() });
        }

        if (parsed.name === "Bought") {
          const listingId = BigInt(parsed.args.listingId);
          const seller = String(parsed.args.seller).toLowerCase();
          const buyer = String(parsed.args.buyer).toLowerCase();
          const nft = String(parsed.args.nft).toLowerCase();
          const tokenId = BigInt(parsed.args.tokenId).toString();
          const amount = BigInt(parsed.args.amount);
          const pricePerUnitWei = BigInt(parsed.args.pricePerUnitWei);
          const totalPriceWei = BigInt(parsed.args.totalPriceWei);

          const mint = await prisma.mint.findUnique({
            where: {
              chainId_contract_tokenId: {
                chainId: CHAIN_ID,
                contract: nft,
                tokenId,
              },
            },
            select: { verified: true },
          });

          if (!mint?.verified) {
            console.log("[SKIP] trade mint missing/not verified", { nft, tokenId });
            continue;
          }

          const [sellerUser, buyerUser] = await Promise.all([
            prisma.user.findUnique({
              where: { walletAddress: seller },
              select: { id: true },
            }),
            prisma.user.findUnique({
              where: { walletAddress: buyer },
              select: { id: true },
            }),
          ]);

          // ✅ IMPORTANT: make Bought idempotent (don’t double-decrement listing/holdings)
          let createdTrade = false;
          try {
            await prisma.trade.create({
              data: {
                chainId: CHAIN_ID,
                contract: nft,
                tokenId,
                standard: "ERC1155",
                txHash,
                logIndex,
                blockNum: BigInt(log.blockNumber),
                blockTime,
                marketplaceListingId: listingId,
                sellerWallet: seller,
                buyerWallet: buyer,
                sellerId: sellerUser?.id ?? null,
                buyerId: buyerUser?.id ?? null,
                amount,
                pricePerUnitWei,
                totalPriceWei,
              },
            });
            createdTrade = true;
          } catch (e) {
            if (isPrismaUnique(e)) {
              createdTrade = false; // duplicate -> ignore all side-effects
            } else {
              console.error("[TRADE_CREATE_ERROR]", e);
              // don’t apply side-effects if we failed unexpectedly
              createdTrade = false;
            }
          }

          if (createdTrade) {
            // ✅ decrement listing remaining once
            const L = await prisma.listing.findUnique({
              where: {
                chainId_marketplaceListingId: {
                  chainId: CHAIN_ID,
                  marketplaceListingId: listingId,
                },
              },
              select: { amountRemaining: true, status: true },
            });

            if (L && L.status === "ACTIVE") {
              const newRemaining = BigInt(L.amountRemaining) - amount;
              const soldOut = newRemaining <= 0n;

              await prisma.listing.update({
                where: {
                  chainId_marketplaceListingId: {
                    chainId: CHAIN_ID,
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

            // ✅ update holdings (only if users exist in DB)
            // seller -= amount
            if (sellerUser?.id) {
              await prisma.holding.updateMany({
                where: {
                  userId: sellerUser.id,
                  chainId: CHAIN_ID,
                  contract: nft,
                  tokenId,
                },
                data: { amount: { decrement: amount } },
              });
            }

            // buyer += amount (upsert)
            if (buyerUser?.id) {
              await prisma.holding.upsert({
                where: {
                  userId_chainId_contract_tokenId: {
                    userId: buyerUser.id,
                    chainId: CHAIN_ID,
                    contract: nft,
                    tokenId,
                  },
                },
                create: {
                  userId: buyerUser.id,
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

          console.log("[BOUGHT]", {
            listingId: listingId.toString(),
            seller,
            buyer,
            nft,
            tokenId,
            amount: amount.toString(),
            totalPriceWei: totalPriceWei.toString(),
            createdTrade,
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