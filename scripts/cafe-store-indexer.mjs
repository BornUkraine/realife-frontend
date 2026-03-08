import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Contract, Interface, JsonRpcProvider } from "ethers";

const prisma = new PrismaClient();

const RPC_URL =
  process.env.RPC_URL ||
  process.env.BASE_SEPOLIA_RPC ||
  "https://sepolia.base.org";

const CHAIN_ID = Number(process.env.CHAIN_ID || "84532");

const CAFE_STORE = (
  process.env.REALIFE_CAFE_STORE_CONTRACT ||
  process.env.NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT ||
  ""
)
  .trim()
  .toLowerCase();

if (!CAFE_STORE) {
  throw new Error("REALIFE_CAFE_STORE_CONTRACT missing");
}

const CAFE_CREATOR_WALLET = (
  process.env.REALIFE_CAFE_CREATOR_WALLET ||
  process.env.TREASURY_ADDRESS ||
  ""
)
  .trim()
  .toLowerCase();

const START_BLOCK = BigInt(process.env.CAFE_INDEXER_START_BLOCK || "0");
const CONFIRMATIONS = BigInt(process.env.CAFE_INDEXER_CONFIRMATIONS || "5");
const BATCH = BigInt(process.env.CAFE_INDEXER_BATCH_BLOCKS || "2000");
const SLEEP_MS = Number(process.env.CAFE_INDEXER_SLEEP_MS || "8000");

const IPFS_GATEWAY_ORIGIN = (
  process.env.IPFS_GATEWAY_ORIGIN ||
  process.env.NEXT_PUBLIC_IPFS_GATEWAY ||
  "https://nftstorage.link"
).replace(/\/$/, "");

const provider = new JsonRpcProvider(RPC_URL);

const EVENT_ABI = [
  "event ProductCreated(uint256 indexed tokenId,uint256 maxSupply,uint256 price,string uri)",
  "event ProductURIUpdated(uint256 indexed tokenId,string newUri)",
  "event ProductBought(address indexed buyer,uint256 indexed tokenId,uint256 amount,uint256 totalPrice)",
  "event ProductRedeemed(address indexed user,uint256 indexed tokenId,uint256 amount)",
];

const READ_ABI = [
  ...EVENT_ABI,
  "function uri(uint256 id) view returns (string)",
  "function balanceOf(address account,uint256 id) view returns (uint256)",
];

const iface = new Interface(EVENT_ABI);
const store = new Contract(CAFE_STORE, READ_ABI, provider);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function norm(v) {
  const s = String(v || "").trim();
  return s ? s.toLowerCase() : "";
}

function stateKey() {
  return `cafe-store:${CAFE_STORE}`;
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

function ipfsToHttp(uri) {
  const u = String(uri || "").trim();
  if (!u) return "";

  if (
    u.startsWith("http://") ||
    u.startsWith("https://") ||
    u.startsWith("data:") ||
    u.startsWith("blob:")
  ) {
    return u;
  }

  if (u.startsWith("ipfs://")) {
    let p = u.slice("ipfs://".length);
    if (p.startsWith("ipfs/")) p = p.slice("ipfs/".length);
    return `${IPFS_GATEWAY_ORIGIN}/ipfs/${p}`;
  }

  if (u.startsWith("/ipfs/")) return `${IPFS_GATEWAY_ORIGIN}${u}`;
  if (u.startsWith("Qm") || u.startsWith("bafy")) return `${IPFS_GATEWAY_ORIGIN}/ipfs/${u}`;

  return u;
}

async function loadJson(url) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch {
    return null;
  }
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

async function resolveTokenUri(tokenId, eventUri) {
  if (eventUri && String(eventUri).trim()) return String(eventUri).trim();

  try {
    const uri = await store.uri(tokenId);
    return uri ? String(uri).trim() : null;
  } catch {
    return null;
  }
}

async function ensureMintRecord(tokenId, opts = {}) {
  const tokenIdStr = tokenId.toString();

  const existing = await prisma.mint.findUnique({
    where: {
      chainId_contract_tokenId: {
        chainId: CHAIN_ID,
        contract: CAFE_STORE,
        tokenId: tokenIdStr,
      },
    },
    select: {
      id: true,
      userId: true,
      txHash: true,
      tokenUri: true,
      name: true,
      image: true,
      verified: true,
    },
  });

  const tokenUri = (await resolveTokenUri(tokenId, opts.eventUri)) || existing?.tokenUri || null;

  let resolvedName = existing?.name || null;
  let resolvedImage = existing?.image || null;

  if (tokenUri) {
    const metaUrl = ipfsToHttp(tokenUri);
    const meta = metaUrl ? await loadJson(metaUrl) : null;

    if (meta && typeof meta === "object") {
      if (typeof meta.name === "string" && meta.name.trim()) {
        resolvedName = meta.name.trim();
      }
      if (typeof meta.image === "string" && meta.image.trim()) {
        resolvedImage = meta.image.trim();
      }
    }
  }

  if (!resolvedName) {
    resolvedName = `Realife Cafe Product #${tokenIdStr}`;
  }

  const creatorWallet = norm(CAFE_CREATOR_WALLET || opts.actorWallet || "");
  const creatorUserId =
    existing?.userId || (creatorWallet ? await ensureUserByWallet(creatorWallet) : null);

  if (!existing && !creatorUserId) {
    console.warn("[CAFE_MINT_SKIP_NO_USER]", {
      tokenId: tokenIdStr,
      reason: "No creator wallet available. Set REALIFE_CAFE_CREATOR_WALLET in env.",
    });
    return null;
  }

  const mint = await prisma.mint.upsert({
    where: {
      chainId_contract_tokenId: {
        chainId: CHAIN_ID,
        contract: CAFE_STORE,
        tokenId: tokenIdStr,
      },
    },
    create: {
      userId: creatorUserId,
      chainId: CHAIN_ID,
      contract: CAFE_STORE,
      tokenId: tokenIdStr,
      txHash: opts.createTxHash ? String(opts.createTxHash) : null,
      tokenUri,
      name: resolvedName,
      image: resolvedImage,
      verified: true,
    },
    update: {
      tokenUri: tokenUri || undefined,
      name: resolvedName || undefined,
      image: resolvedImage || undefined,
      verified: true,
    },
  });

  return mint;
}

async function syncHoldingBalance(userWallet, tokenId) {
  const wallet = norm(userWallet);
  if (!wallet) return;

  const userId = await ensureUserByWallet(wallet);
  if (!userId) return;

  await ensureMintRecord(tokenId, { actorWallet: wallet });

  let onchainBalance = 0n;
  try {
    onchainBalance = BigInt(await store.balanceOf(wallet, tokenId));
  } catch (e) {
    console.error("[CAFE_BALANCEOF_ERROR]", { wallet, tokenId: tokenId.toString(), e });
    return;
  }

  const tokenIdStr = tokenId.toString();

  if (onchainBalance > 0n) {
    await prisma.holding.upsert({
      where: {
        userId_chainId_contract_tokenId: {
          userId,
          chainId: CHAIN_ID,
          contract: CAFE_STORE,
          tokenId: tokenIdStr,
        },
      },
      create: {
        userId,
        chainId: CHAIN_ID,
        contract: CAFE_STORE,
        tokenId: tokenIdStr,
        standard: "ERC1155",
        amount: onchainBalance,
      },
      update: {
        standard: "ERC1155",
        amount: onchainBalance,
      },
    });
  } else {
    await prisma.holding.updateMany({
      where: {
        userId,
        chainId: CHAIN_ID,
        contract: CAFE_STORE,
        tokenId: tokenIdStr,
      },
      data: {
        standard: "ERC1155",
        amount: 0n,
      },
    });
  }
}

async function mainLoop() {
  let last = await getLastBlock();

  console.log("[CAFE_INDEXER] start", {
    chainId: CHAIN_ID,
    cafeStore: CAFE_STORE,
    creatorWallet: CAFE_CREATOR_WALLET || "(not set)",
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
        address: CAFE_STORE,
        fromBlock: Number(fromBlock),
        toBlock: Number(toBlock),
      });

      console.log(`[CAFE_SCAN] ${fromBlock}..${toBlock} logs=${logs.length}`);

      for (const log of logs) {
        let parsed = null;

        try {
          parsed = iface.parseLog(log);
        } catch {
          continue;
        }

        if (!parsed) continue;

        const txHash = log.transactionHash;
        const eventName = parsed.name;

        if (eventName === "ProductCreated") {
          const tokenId = BigInt(parsed.args.tokenId);
          const uri = String(parsed.args.uri || "");

          await ensureMintRecord(tokenId, {
            eventUri: uri,
            createTxHash: txHash,
          });

          console.log("[CAFE_PRODUCT_CREATED]", {
            tokenId: tokenId.toString(),
            uri,
            txHash,
          });
        }

        if (eventName === "ProductURIUpdated") {
          const tokenId = BigInt(parsed.args.tokenId);
          const newUri = String(parsed.args.newUri || "");

          await ensureMintRecord(tokenId, {
            eventUri: newUri,
          });

          console.log("[CAFE_PRODUCT_URI_UPDATED]", {
            tokenId: tokenId.toString(),
            newUri,
            txHash,
          });
        }

        if (eventName === "ProductBought") {
          const buyer = String(parsed.args.buyer).toLowerCase();
          const tokenId = BigInt(parsed.args.tokenId);
          const amount = BigInt(parsed.args.amount);
          const totalPrice = BigInt(parsed.args.totalPrice);

          await ensureMintRecord(tokenId, { actorWallet: buyer });
          await syncHoldingBalance(buyer, tokenId);

          console.log("[CAFE_PRODUCT_BOUGHT]", {
            buyer,
            tokenId: tokenId.toString(),
            amount: amount.toString(),
            totalPrice: totalPrice.toString(),
            txHash,
          });
        }

        if (eventName === "ProductRedeemed") {
          const user = String(parsed.args.user).toLowerCase();
          const tokenId = BigInt(parsed.args.tokenId);
          const amount = BigInt(parsed.args.amount);

          await ensureMintRecord(tokenId, { actorWallet: user });
          await syncHoldingBalance(user, tokenId);

          console.log("[CAFE_PRODUCT_REDEEMED]", {
            user,
            tokenId: tokenId.toString(),
            amount: amount.toString(),
            txHash,
          });
        }
      }

      await setLastBlock(toBlock);
      last = toBlock;
    } catch (e) {
      console.error("[CAFE_INDEXER_ERROR]", e);
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