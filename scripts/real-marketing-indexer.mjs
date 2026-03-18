import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Contract, Interface, JsonRpcProvider } from "ethers";

const prisma = new PrismaClient();

const RPC_URL =
  process.env.RPC_URL ||
  process.env.BASE_SEPOLIA_RPC ||
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ||
  "https://sepolia.base.org";

const CHAIN_ID = Number(process.env.CHAIN_ID || "84532");

const CAFE_STORE = (
  process.env.NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT ||
  process.env.REALIFE_CAFE_STORE_CONTRACT ||
  ""
)
  .trim()
  .toLowerCase();

const STORE_CONTRACT = (
  process.env.NEXT_PUBLIC_REALIFE_STORE_CONTRACT ||
  process.env.REALIFE_STORE_CONTRACT ||
  process.env.STORE_CONTRACT_ADDRESS ||
  ""
)
  .trim()
  .toLowerCase();

if (!CAFE_STORE && !STORE_CONTRACT) {
  throw new Error(
    "No NEXT_PUBLIC_REALIFE_CAFE_STORE_CONTRACT / NEXT_PUBLIC_REALIFE_STORE_CONTRACT configured"
  );
}

const DEFAULT_CREATOR_WALLET = (
  process.env.NEXT_PUBLIC_TREASURY_ADDRESS ||
  process.env.TREASURY_ADDRESS ||
  ""
)
  .trim()
  .toLowerCase();

const CAFE_CREATOR_WALLET = (
  process.env.NEXT_PUBLIC_REALIFE_CAFE_CREATOR_WALLET ||
  process.env.REALIFE_CAFE_CREATOR_WALLET ||
  DEFAULT_CREATOR_WALLET
)
  .trim()
  .toLowerCase();

const STORE_CREATOR_WALLET = (
  process.env.NEXT_PUBLIC_REALIFE_STORE_CREATOR_WALLET ||
  process.env.REALIFE_STORE_CREATOR_WALLET ||
  DEFAULT_CREATOR_WALLET
)
  .trim()
  .toLowerCase();

const DEFAULT_START_BLOCK = BigInt(
  process.env.REAL_MARKETING_INDEXER_START_BLOCK || "0"
);
const CONFIRMATIONS = BigInt(
  process.env.REAL_MARKETING_INDEXER_CONFIRMATIONS || "5"
);
const BATCH = BigInt(
  process.env.REAL_MARKETING_INDEXER_BATCH_BLOCKS || "2000"
);
const SLEEP_MS = Number(process.env.REAL_MARKETING_INDEXER_SLEEP_MS || "8000");

const CAFE_START_BLOCK = BigInt(
  process.env.CAFE_INDEXER_START_BLOCK ||
    process.env.REAL_MARKETING_INDEXER_START_BLOCK ||
    "0"
);

const STORE_START_BLOCK = BigInt(
  process.env.STORE_INDEXER_START_BLOCK ||
    process.env.REAL_MARKETING_INDEXER_START_BLOCK ||
    "0"
);

const IPFS_GATEWAY_ORIGIN = (
  process.env.NEXT_PUBLIC_IPFS_GATEWAY ||
  process.env.IPFS_GATEWAY_ORIGIN ||
  "https://nftstorage.link"
).replace(/\/$/, "");

const provider = new JsonRpcProvider(RPC_URL);

const CAFE_EVENT_ABI = [
  "event ProductCreated(uint256 indexed tokenId,uint256 maxSupply,uint256 price,string uri)",
  "event ProductURIUpdated(uint256 indexed tokenId,string newUri)",
  "event ProductPriceUpdated(uint256 indexed tokenId,uint256 newPrice)",
  "event ProductStatusUpdated(uint256 indexed tokenId,bool isActive)",
  "event ProductBought(address indexed buyer,uint256 indexed tokenId,uint256 amount,uint256 totalPrice)",
  "event ProductRedeemed(address indexed user,uint256 indexed tokenId,uint256 amount)",
];

const CAFE_READ_ABI = [
  ...CAFE_EVENT_ABI,
  "function paymentToken() view returns (address)",
  "function treasury() view returns (address)",
  "function uri(uint256 id) view returns (string)",
  "function balanceOf(address account,uint256 id) view returns (uint256)",
  "function maxSupply(uint256 id) view returns (uint256)",
  "function productPrices(uint256 id) view returns (uint256)",
  "function isActive(uint256 id) view returns (bool)",
  "function totalSupply(uint256 id) view returns (uint256)",
];

const STORE_EVENT_ABI = [
  "event ProductCreated(uint256 indexed tokenId,address indexed creator,address indexed seller,uint256 maxSupply,uint256 price,string uri,bool deliveryEnabled,bool physicalItemIncluded,bool officialItem)",
  "event ProductURIUpdated(uint256 indexed tokenId,string newUri)",
  "event ProductPriceUpdated(uint256 indexed tokenId,uint256 newPrice)",
  "event ProductStatusUpdated(uint256 indexed tokenId,bool isActive)",
  "event DeliveryFlagUpdated(uint256 indexed tokenId,bool enabled)",
  "event PhysicalFlagUpdated(uint256 indexed tokenId,bool enabled)",
  "event OfficialFlagUpdated(uint256 indexed tokenId,bool enabled)",
  "event PrimarySellerUpdated(uint256 indexed tokenId,address indexed newSeller)",
  "event ProductBought(address indexed buyer,uint256 indexed tokenId,uint256 amount,uint256 totalPrice,address indexed seller)",
  "event ProductRedeemed(address indexed user,uint256 indexed tokenId,uint256 amount)",
];

const STORE_READ_ABI = [
  ...STORE_EVENT_ABI,
  "function paymentToken() view returns (address)",
  "function treasury() view returns (address)",
  "function uri(uint256 id) view returns (string)",
  "function balanceOf(address account,uint256 id) view returns (uint256)",
  "function maxSupply(uint256 id) view returns (uint256)",
  "function productPrices(uint256 id) view returns (uint256)",
  "function isActive(uint256 id) view returns (bool)",
  "function totalSupply(uint256 id) view returns (uint256)",
  "function deliveryEnabled(uint256 id) view returns (bool)",
  "function physicalItemIncluded(uint256 id) view returns (bool)",
  "function officialItem(uint256 id) view returns (bool)",
  "function primarySellerOf(uint256 id) view returns (address)",
  "function creatorOf(uint256 id) view returns (address)",
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function norm(v) {
  const s = String(v || "").trim();
  return s ? s.toLowerCase() : "";
}

function prettyVertical(v) {
  if (v === "cafe") return "Cafe";
  if (v === "store") return "Store";
  return v.charAt(0).toUpperCase() + v.slice(1);
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
  if (u.startsWith("Qm") || u.startsWith("bafy")) {
    return `${IPFS_GATEWAY_ORIGIN}/ipfs/${u}`;
  }

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

const CONTRACTS = [];

if (CAFE_STORE) {
  CONTRACTS.push({
    kind: "cafe",
    vertical: "cafe",
    address: CAFE_STORE,
    creatorWallet: CAFE_CREATOR_WALLET,
    startBlock: CAFE_START_BLOCK,
    iface: new Interface(CAFE_EVENT_ABI),
    contract: new Contract(CAFE_STORE, CAFE_READ_ABI, provider),

    // CAFE: доставки НЕТ вообще
    defaultDeliveryEnabled: false,
    defaultPhysicalItemIncluded: false,
    defaultOfficialItem: true,
  });
}

if (STORE_CONTRACT) {
  CONTRACTS.push({
    kind: "store",
    vertical: "store",
    address: STORE_CONTRACT,
    creatorWallet: STORE_CREATOR_WALLET,
    startBlock: STORE_START_BLOCK,
    iface: new Interface(STORE_EVENT_ABI),
    contract: new Contract(STORE_CONTRACT, STORE_READ_ABI, provider),
    defaultDeliveryEnabled: false,
    defaultPhysicalItemIncluded: false,
    defaultOfficialItem: false,
  });
}

function stateKey(cfg) {
  if (cfg.kind === "cafe") return `cafe-store:${cfg.address}`;
  return `store:${cfg.address}`;
}

async function getLastBlock(cfg) {
  const key = stateKey(cfg);
  const row = await prisma.indexerState.upsert({
    where: { chainId_key: { chainId: CHAIN_ID, key } },
    update: {},
    create: {
      chainId: CHAIN_ID,
      key,
      lastBlock: cfg.startBlock || DEFAULT_START_BLOCK,
    },
  });
  return BigInt(row.lastBlock);
}

async function setLastBlock(cfg, bn) {
  const key = stateKey(cfg);
  await prisma.indexerState.update({
    where: { chainId_key: { chainId: CHAIN_ID, key } },
    data: { lastBlock: bn },
  });
}

async function readOptional(contract, fn, args = [], fallback = null) {
  try {
    return await contract[fn](...args);
  } catch {
    return fallback;
  }
}

async function resolveTokenUri(cfg, tokenId, eventUri) {
  if (eventUri && String(eventUri).trim()) return String(eventUri).trim();

  try {
    const uri = await cfg.contract.uri(tokenId);
    return uri ? String(uri).trim() : null;
  } catch {
    return null;
  }
}

async function buildProductSnapshot(cfg, tokenId, opts = {}) {
  const tokenIdStr = tokenId.toString();

  const tokenUri = (await resolveTokenUri(cfg, tokenId, opts.eventUri)) || null;

  let name = null;
  let image = null;

  if (tokenUri) {
    const metaUrl = ipfsToHttp(tokenUri);
    const meta = metaUrl ? await loadJson(metaUrl) : null;

    if (meta && typeof meta === "object") {
      if (typeof meta.name === "string" && meta.name.trim()) {
        name = meta.name.trim();
      }
      if (typeof meta.image === "string" && meta.image.trim()) {
        image = meta.image.trim();
      }
    }
  }

  if (!name) {
    name = `Realife ${prettyVertical(cfg.vertical)} Product #${tokenIdStr}`;
  }

  const paymentToken =
    norm(
      opts.paymentToken ??
        (await readOptional(cfg.contract, "paymentToken", [], "")) ??
        process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS ??
        process.env.PAYMENT_TOKEN_ADDRESS ??
        ""
    ) || null;

  const treasury =
    norm(await readOptional(cfg.contract, "treasury", [], "")) ||
    DEFAULT_CREATOR_WALLET ||
    null;

  let creatorWallet = norm(opts.creatorWallet || "");
  let primarySellerWallet = norm(opts.primarySellerWallet || "");

  let maxSupply =
    opts.maxSupply != null
      ? BigInt(opts.maxSupply)
      : BigInt((await readOptional(cfg.contract, "maxSupply", [tokenId], 0n)) || 0n);

  let price =
    opts.price != null
      ? BigInt(opts.price)
      : BigInt((await readOptional(cfg.contract, "productPrices", [tokenId], 0n)) || 0n);

  let isActive =
    typeof opts.isActive === "boolean"
      ? opts.isActive
      : Boolean(await readOptional(cfg.contract, "isActive", [tokenId], true));

  let mintedSupply = BigInt(
    (await readOptional(cfg.contract, "totalSupply", [tokenId], 0n)) || 0n
  );

  let deliveryEnabled =
    typeof opts.deliveryEnabled === "boolean"
      ? opts.deliveryEnabled
      : cfg.defaultDeliveryEnabled;

  let physicalItemIncluded =
    typeof opts.physicalItemIncluded === "boolean"
      ? opts.physicalItemIncluded
      : cfg.defaultPhysicalItemIncluded;

  let officialItem =
    typeof opts.officialItem === "boolean"
      ? opts.officialItem
      : cfg.defaultOfficialItem;

  if (cfg.kind === "store") {
    if (!creatorWallet) {
      creatorWallet =
        norm(await readOptional(cfg.contract, "creatorOf", [tokenId], "")) ||
        cfg.creatorWallet ||
        treasury ||
        null;
    }

    if (!primarySellerWallet) {
      primarySellerWallet =
        norm(await readOptional(cfg.contract, "primarySellerOf", [tokenId], "")) ||
        treasury ||
        null;
    }

    if (typeof opts.deliveryEnabled !== "boolean") {
      deliveryEnabled = Boolean(
        await readOptional(cfg.contract, "deliveryEnabled", [tokenId], false)
      );
    }

    if (typeof opts.physicalItemIncluded !== "boolean") {
      physicalItemIncluded = Boolean(
        await readOptional(cfg.contract, "physicalItemIncluded", [tokenId], false)
      );
    }

    if (typeof opts.officialItem !== "boolean") {
      officialItem = Boolean(
        await readOptional(cfg.contract, "officialItem", [tokenId], false)
      );
    }
  } else {
    creatorWallet = creatorWallet || cfg.creatorWallet || treasury || null;
    primarySellerWallet =
      primarySellerWallet || treasury || cfg.creatorWallet || null;

    // CAFE: всегда без delivery
    deliveryEnabled = false;
    physicalItemIncluded = false;
    officialItem = true;
  }

  return {
    chainId: CHAIN_ID,
    contract: cfg.address,
    tokenId: tokenIdStr,
    vertical: cfg.vertical,
    creatorWallet: creatorWallet || null,
    primarySellerWallet: primarySellerWallet || null,
    paymentToken,
    tokenUri,
    name,
    image,
    maxSupply,
    mintedSupply,
    price,
    isActive,
    deliveryEnabled,
    physicalItemIncluded,
    officialItem,
    lastTxHash: opts.lastTxHash ? String(opts.lastTxHash) : null,
  };
}

async function upsertRealMarketingProduct(cfg, tokenId, opts = {}) {
  const snapshot = await buildProductSnapshot(cfg, tokenId, opts);

  await prisma.realMarketingProduct.upsert({
    where: {
      chainId_contract_tokenId: {
        chainId: CHAIN_ID,
        contract: cfg.address,
        tokenId: tokenId.toString(),
      },
    },
    create: snapshot,
    update: {
      vertical: snapshot.vertical,
      creatorWallet: snapshot.creatorWallet,
      primarySellerWallet: snapshot.primarySellerWallet,
      paymentToken: snapshot.paymentToken,
      tokenUri: snapshot.tokenUri,
      name: snapshot.name,
      image: snapshot.image,
      maxSupply: snapshot.maxSupply,
      mintedSupply: snapshot.mintedSupply,
      price: snapshot.price,
      isActive: snapshot.isActive,
      deliveryEnabled: snapshot.deliveryEnabled,
      physicalItemIncluded: snapshot.physicalItemIncluded,
      officialItem: snapshot.officialItem,
      lastTxHash: snapshot.lastTxHash || undefined,
    },
  });

  return snapshot;
}

async function ensureMintRecord(cfg, tokenId, opts = {}) {
  const tokenIdStr = tokenId.toString();

  const existing = await prisma.mint.findUnique({
    where: {
      chainId_contract_tokenId: {
        chainId: CHAIN_ID,
        contract: cfg.address,
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
      deliveryEnabled: true,
      physicalItemIncluded: true,
      officialItem: true,
    },
  });

  const snapshot = opts.snapshot || (await buildProductSnapshot(cfg, tokenId, opts));

  const creatorWallet = norm(
    snapshot.creatorWallet ||
      opts.creatorWallet ||
      opts.actorWallet ||
      cfg.creatorWallet ||
      ""
  );

  const creatorUserId =
    existing?.userId || (creatorWallet ? await ensureUserByWallet(creatorWallet) : null);

  if (!existing && !creatorUserId) {
    console.warn("[REAL_MARKETING_MINT_SKIP_NO_USER]", {
      vertical: cfg.vertical,
      contract: cfg.address,
      tokenId: tokenIdStr,
      reason: "No creator wallet available",
    });
    return null;
  }

  const mint = await prisma.mint.upsert({
    where: {
      chainId_contract_tokenId: {
        chainId: CHAIN_ID,
        contract: cfg.address,
        tokenId: tokenIdStr,
      },
    },
    create: {
      userId: creatorUserId,
      chainId: CHAIN_ID,
      contract: cfg.address,
      tokenId: tokenIdStr,
      txHash: opts.createTxHash ? String(opts.createTxHash) : null,
      tokenUri: snapshot.tokenUri,
      name: snapshot.name,
      image: snapshot.image,
      verified: true,
      deliveryEnabled: Boolean(snapshot.deliveryEnabled),
      physicalItemIncluded: Boolean(snapshot.physicalItemIncluded),
      officialItem: Boolean(snapshot.officialItem),
    },
    update: {
      tokenUri: snapshot.tokenUri || undefined,
      name: snapshot.name || undefined,
      image: snapshot.image || undefined,
      verified: true,
      deliveryEnabled: Boolean(snapshot.deliveryEnabled),
      physicalItemIncluded: Boolean(snapshot.physicalItemIncluded),
      officialItem: Boolean(snapshot.officialItem),
    },
  });

  return mint;
}

async function syncHoldingBalance(cfg, userWallet, tokenId, snapshot = null) {
  const wallet = norm(userWallet);
  if (!wallet) return;

  const userId = await ensureUserByWallet(wallet);
  if (!userId) return;

  await ensureMintRecord(cfg, tokenId, {
    actorWallet: wallet,
    snapshot,
  });

  let onchainBalance = 0n;
  try {
    onchainBalance = BigInt(await cfg.contract.balanceOf(wallet, tokenId));
  } catch (e) {
    console.error("[REAL_MARKETING_BALANCEOF_ERROR]", {
      vertical: cfg.vertical,
      wallet,
      tokenId: tokenId.toString(),
      e,
    });
    return;
  }

  const tokenIdStr = tokenId.toString();

  if (onchainBalance > 0n) {
    await prisma.holding.upsert({
      where: {
        userId_chainId_contract_tokenId: {
          userId,
          chainId: CHAIN_ID,
          contract: cfg.address,
          tokenId: tokenIdStr,
        },
      },
      create: {
        userId,
        chainId: CHAIN_ID,
        contract: cfg.address,
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
        contract: cfg.address,
        tokenId: tokenIdStr,
      },
      data: {
        standard: "ERC1155",
        amount: 0n,
      },
    });
  }
}

async function processLog(cfg, log) {
  let parsed = null;

  try {
    parsed = cfg.iface.parseLog(log);
  } catch {
    return;
  }

  if (!parsed) return;

  const txHash = log.transactionHash;
  const eventName = parsed.name;

  if (eventName === "ProductCreated") {
    const tokenId = BigInt(parsed.args.tokenId);

    if (cfg.kind === "cafe") {
      const uri = String(parsed.args.uri || "");
      const maxSupply = BigInt(parsed.args.maxSupply);
      const price = BigInt(parsed.args.price);

      const snapshot = await upsertRealMarketingProduct(cfg, tokenId, {
        eventUri: uri,
        maxSupply,
        price,
        creatorWallet: cfg.creatorWallet,
        primarySellerWallet: null,

        // CAFE: доставки нет вообще
        deliveryEnabled: false,
        physicalItemIncluded: false,
        officialItem: true,

        lastTxHash: txHash,
      });

      await ensureMintRecord(cfg, tokenId, {
        eventUri: uri,
        createTxHash: txHash,
        creatorWallet: snapshot.creatorWallet,
        snapshot,
      });

      console.log("[REAL_MARKETING_PRODUCT_CREATED]", {
        vertical: cfg.vertical,
        tokenId: tokenId.toString(),
        uri,
        txHash,
      });

      return;
    }

    if (cfg.kind === "store") {
      const creator = norm(String(parsed.args.creator || ""));
      const seller = norm(String(parsed.args.seller || ""));
      const maxSupply = BigInt(parsed.args.maxSupply);
      const price = BigInt(parsed.args.price);
      const uri = String(parsed.args.uri || "");
      const deliveryEnabled = Boolean(parsed.args.deliveryEnabled);
      const physicalItemIncluded = Boolean(parsed.args.physicalItemIncluded);
      const officialItem = Boolean(parsed.args.officialItem);

      const snapshot = await upsertRealMarketingProduct(cfg, tokenId, {
        eventUri: uri,
        maxSupply,
        price,
        creatorWallet: creator,
        primarySellerWallet: seller,
        deliveryEnabled,
        physicalItemIncluded,
        officialItem,
        lastTxHash: txHash,
      });

      await ensureMintRecord(cfg, tokenId, {
        eventUri: uri,
        createTxHash: txHash,
        creatorWallet: snapshot.creatorWallet,
        snapshot,
      });

      console.log("[REAL_MARKETING_PRODUCT_CREATED]", {
        vertical: cfg.vertical,
        tokenId: tokenId.toString(),
        creator,
        seller,
        uri,
        txHash,
      });

      return;
    }
  }

  if (eventName === "ProductURIUpdated") {
    const tokenId = BigInt(parsed.args.tokenId);
    const newUri = String(parsed.args.newUri || "");

    const snapshot = await upsertRealMarketingProduct(cfg, tokenId, {
      eventUri: newUri,
      lastTxHash: txHash,
    });

    await ensureMintRecord(cfg, tokenId, {
      eventUri: newUri,
      snapshot,
    });

    console.log("[REAL_MARKETING_PRODUCT_URI_UPDATED]", {
      vertical: cfg.vertical,
      tokenId: tokenId.toString(),
      newUri,
      txHash,
    });

    return;
  }

  if (eventName === "ProductPriceUpdated") {
    const tokenId = BigInt(parsed.args.tokenId);
    const newPrice = BigInt(parsed.args.newPrice);

    await upsertRealMarketingProduct(cfg, tokenId, {
      price: newPrice,
      lastTxHash: txHash,
    });

    console.log("[REAL_MARKETING_PRODUCT_PRICE_UPDATED]", {
      vertical: cfg.vertical,
      tokenId: tokenId.toString(),
      newPrice: newPrice.toString(),
      txHash,
    });

    return;
  }

  if (eventName === "ProductStatusUpdated") {
    const tokenId = BigInt(parsed.args.tokenId);
    const active = Boolean(parsed.args.isActive);

    await upsertRealMarketingProduct(cfg, tokenId, {
      isActive: active,
      lastTxHash: txHash,
    });

    console.log("[REAL_MARKETING_PRODUCT_STATUS_UPDATED]", {
      vertical: cfg.vertical,
      tokenId: tokenId.toString(),
      active,
      txHash,
    });

    return;
  }

  if (eventName === "DeliveryFlagUpdated") {
    const tokenId = BigInt(parsed.args.tokenId);
    const enabled = Boolean(parsed.args.enabled);

    const snapshot = await upsertRealMarketingProduct(cfg, tokenId, {
      deliveryEnabled: enabled,
      lastTxHash: txHash,
    });

    await ensureMintRecord(cfg, tokenId, { snapshot });

    console.log("[REAL_MARKETING_DELIVERY_UPDATED]", {
      vertical: cfg.vertical,
      tokenId: tokenId.toString(),
      enabled,
      txHash,
    });

    return;
  }

  if (eventName === "PhysicalFlagUpdated") {
    const tokenId = BigInt(parsed.args.tokenId);
    const enabled = Boolean(parsed.args.enabled);

    const snapshot = await upsertRealMarketingProduct(cfg, tokenId, {
      physicalItemIncluded: enabled,
      lastTxHash: txHash,
    });

    await ensureMintRecord(cfg, tokenId, { snapshot });

    console.log("[REAL_MARKETING_PHYSICAL_UPDATED]", {
      vertical: cfg.vertical,
      tokenId: tokenId.toString(),
      enabled,
      txHash,
    });

    return;
  }

  if (eventName === "OfficialFlagUpdated") {
    const tokenId = BigInt(parsed.args.tokenId);
    const enabled = Boolean(parsed.args.enabled);

    const snapshot = await upsertRealMarketingProduct(cfg, tokenId, {
      officialItem: enabled,
      lastTxHash: txHash,
    });

    await ensureMintRecord(cfg, tokenId, { snapshot });

    console.log("[REAL_MARKETING_OFFICIAL_UPDATED]", {
      vertical: cfg.vertical,
      tokenId: tokenId.toString(),
      enabled,
      txHash,
    });

    return;
  }

  if (eventName === "PrimarySellerUpdated") {
    const tokenId = BigInt(parsed.args.tokenId);
    const newSeller = norm(String(parsed.args.newSeller || ""));

    const snapshot = await upsertRealMarketingProduct(cfg, tokenId, {
      primarySellerWallet: newSeller,
      lastTxHash: txHash,
    });

    await ensureMintRecord(cfg, tokenId, { snapshot });

    console.log("[REAL_MARKETING_PRIMARY_SELLER_UPDATED]", {
      vertical: cfg.vertical,
      tokenId: tokenId.toString(),
      newSeller,
      txHash,
    });

    return;
  }

  if (eventName === "ProductBought") {
    const buyer = norm(String(parsed.args.buyer || ""));
    const tokenId = BigInt(parsed.args.tokenId);
    const amount = BigInt(parsed.args.amount);
    const totalPrice = BigInt(parsed.args.totalPrice);

    let seller = null;
    if (cfg.kind === "store" && parsed.args.seller) {
      seller = norm(String(parsed.args.seller || ""));
    }

    const snapshot = await upsertRealMarketingProduct(cfg, tokenId, {
      primarySellerWallet: seller || undefined,
      lastTxHash: txHash,
    });

    await ensureMintRecord(cfg, tokenId, {
      actorWallet: buyer,
      snapshot,
    });

    await syncHoldingBalance(cfg, buyer, tokenId, snapshot);

    console.log("[REAL_MARKETING_PRODUCT_BOUGHT]", {
      vertical: cfg.vertical,
      buyer,
      seller,
      tokenId: tokenId.toString(),
      amount: amount.toString(),
      totalPrice: totalPrice.toString(),
      txHash,
    });

    return;
  }

  if (eventName === "ProductRedeemed") {
    const user = norm(String(parsed.args.user || ""));
    const tokenId = BigInt(parsed.args.tokenId);
    const amount = BigInt(parsed.args.amount);

    const snapshot = await upsertRealMarketingProduct(cfg, tokenId, {
      lastTxHash: txHash,
    });

    await ensureMintRecord(cfg, tokenId, {
      actorWallet: user,
      snapshot,
    });

    await syncHoldingBalance(cfg, user, tokenId, snapshot);

    console.log("[REAL_MARKETING_PRODUCT_REDEEMED]", {
      vertical: cfg.vertical,
      user,
      tokenId: tokenId.toString(),
      amount: amount.toString(),
      txHash,
    });

    return;
  }
}

async function scanContract(cfg) {
  let last = await getLastBlock(cfg);

  const latest = BigInt(await provider.getBlockNumber());
  const safe = latest > CONFIRMATIONS ? latest - CONFIRMATIONS : 0n;

  const fromBlock = last + 1n;
  if (fromBlock > safe) return;

  const toBlock =
    fromBlock + BATCH - 1n > safe ? safe : fromBlock + BATCH - 1n;

  const logs = await provider.getLogs({
    address: cfg.address,
    fromBlock: Number(fromBlock),
    toBlock: Number(toBlock),
  });

  console.log(
    `[REAL_MARKETING_SCAN:${cfg.vertical}] ${fromBlock}..${toBlock} logs=${logs.length}`
  );

  for (const log of logs) {
    await processLog(cfg, log);
  }

  await setLastBlock(cfg, toBlock);
}

async function mainLoop() {
  console.log("[REAL_MARKETING_INDEXER] start", {
    chainId: CHAIN_ID,
    rpc: RPC_URL,
    contracts: CONTRACTS.map((c) => ({
      vertical: c.vertical,
      address: c.address,
      startBlock: c.startBlock.toString(),
      creatorWallet: c.creatorWallet || "(not set)",
    })),
    confirmations: CONFIRMATIONS.toString(),
    batch: BATCH.toString(),
  });

  while (true) {
    try {
      for (const cfg of CONTRACTS) {
        await scanContract(cfg);
      }
    } catch (e) {
      console.error("[REAL_MARKETING_INDEXER_ERROR]", e);
    }

    await sleep(SLEEP_MS);
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