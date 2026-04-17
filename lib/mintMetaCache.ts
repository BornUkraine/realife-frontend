/**
 * Metadata cache layer for Mint records.
 *
 * Strategy:
 *  - Request-time in-memory dedupe (no duplicate IPFS fetch within a single request)
 *  - DB-backed cache (persistent across requests)
 *  - Fire-and-forget writes (never block response)
 *  - Graceful fallback to existing Mint.image / Mint.name fields
 *  - Auto-heal: every cached URL flows through ipfsToHttp on read, so any
 *    legacy broken gateway URLs (e.g. "https://nftstorage.link/Qm..." without
 *    /ipfs/) are normalized on-the-fly.
 */

import { prisma } from "@/lib/prisma";
import {
  fetchIpfsJson,
  ipfsToHttp,
  normalizeMeta,
  type NftMetaNormalized,
} from "@/lib/ipfs";

// ---------- Shape returned to API consumers ----------

export type MintMetaCache = {
  image: string | null;
  animation: string | null;
  mediaKind: "image" | "video";
  description: string | null;
  collection: string | null;
  item: string | null;
  rarity: string | null;
  brand: string | null;
  project: string | null;
};

// ---------- In-request dedupe ----------

const inflight = new Map<string, Promise<MintMetaCache | null>>();

export function mintMetaKey(
  chainId: number,
  contract: string,
  tokenId: string
) {
  return `${chainId}:${String(contract).toLowerCase()}:${tokenId}`;
}

const cacheKey = mintMetaKey;

// ---------- DB read: mint row with cached fields ----------

type MintLike = {
  chainId: number;
  contract: string;
  tokenId: string;
  tokenUri: string | null;
  image: string | null;
  name: string | null;

  metadataCachedAt?: Date | null;
  metaImage?: string | null;
  metaAnimation?: string | null;
  metaMediaKind?: string | null;
  metaDescription?: string | null;
  metaCollection?: string | null;
  metaItem?: string | null;
  metaRarity?: string | null;
  metaBrand?: string | null;
  metaProject?: string | null;
};

/**
 * Turn a cached DB row into the consumer-facing shape.
 * Runs every URL through ipfsToHttp so legacy broken URLs get fixed.
 */
function fromCachedRow(mint: MintLike): MintMetaCache {
  return {
    image: ipfsToHttp(mint.metaImage || mint.image) || null,
    animation: mint.metaAnimation ? ipfsToHttp(mint.metaAnimation) : null,
    mediaKind: mint.metaMediaKind === "video" ? "video" : "image",
    description: mint.metaDescription || null,
    collection: mint.metaCollection || null,
    item: mint.metaItem || null,
    rarity: mint.metaRarity || null,
    brand: mint.metaBrand || null,
    project: mint.metaProject || null,
  };
}

function emptyMetaFromMint(mint: MintLike): MintMetaCache {
  return {
    image: ipfsToHttp(mint.image) || null,
    animation: null,
    mediaKind: "image",
    description: null,
    collection: null,
    item: null,
    rarity: null,
    brand: null,
    project: null,
  };
}

/**
 * Returns meta for a mint — from cache if present, else resolves from IPFS
 * and writes back to DB (fire-and-forget).
 *
 * Never throws. Returns null if no metadata is available anywhere.
 */
export async function getMintMeta(mint: MintLike): Promise<MintMetaCache> {
  const key = cacheKey(mint.chainId, mint.contract, mint.tokenId);

  // 1) If DB already has cache, return it immediately.
  if (mint.metadataCachedAt && mint.metaImage !== undefined) {
    return fromCachedRow(mint);
  }

  // 2) Dedupe concurrent resolves for the same mint
  const existing = inflight.get(key);
  if (existing) {
    const r = await existing;
    if (r) return r;
    return emptyMetaFromMint(mint);
  }

  const p = resolveAndCache(mint);
  inflight.set(key, p);

  try {
    const r = await p;
    return r || emptyMetaFromMint(mint);
  } finally {
    inflight.delete(key);
  }
}

async function resolveAndCache(mint: MintLike): Promise<MintMetaCache | null> {
  const tokenUri = mint.tokenUri;

  if (!tokenUri) {
    const empty = emptyMetaFromMint(mint);
    writeBack(mint, empty).catch(() => {});
    return empty;
  }

  const raw = await fetchIpfsJson(tokenUri, { timeoutMs: 4500 });

  if (!raw) {
    return emptyMetaFromMint(mint);
  }

  const norm: NftMetaNormalized = normalizeMeta(raw, {
    image: mint.image,
    name: mint.name,
  });

  const out: MintMetaCache = {
    image: norm.image,
    animation: norm.animation,
    mediaKind: norm.mediaKind,
    description: norm.description,
    collection: norm.collection,
    item: norm.item,
    rarity: norm.rarity,
    brand: norm.brand,
    project: norm.project,
  };

  writeBack(mint, out).catch((e) => {
    console.warn("[mint-meta-cache] writeBack failed", e?.message);
  });

  return out;
}

async function writeBack(mint: MintLike, meta: MintMetaCache) {
  await prisma.mint.update({
    where: {
      chainId_contract_tokenId: {
        chainId: mint.chainId,
        contract: mint.contract,
        tokenId: mint.tokenId,
      },
    },
    data: {
      metadataCachedAt: new Date(),
      metaImage: meta.image,
      metaAnimation: meta.animation,
      metaMediaKind: meta.mediaKind,
      metaDescription: meta.description,
      metaCollection: meta.collection,
      metaItem: meta.item,
      metaRarity: meta.rarity,
      metaBrand: meta.brand,
      metaProject: meta.project,
    } as any,
  });
}

/**
 * Batch resolve — for API routes returning many listings.
 * Returns a map keyed by `${chainId}:${contract}:${tokenId}`.
 *
 * Only IPFS-fetches mints that don't have a DB cache yet.
 * Caps parallelism to `concurrency` to avoid hammering gateways.
 */
export async function getMintMetaMap(
  mints: MintLike[],
  opts: { concurrency?: number; timeoutBudgetMs?: number } = {}
): Promise<Map<string, MintMetaCache>> {
  const concurrency = opts.concurrency ?? 6;
  const budget = opts.timeoutBudgetMs ?? 4500;

  const result = new Map<string, MintMetaCache>();

  const toResolve: MintLike[] = [];

  for (const m of mints) {
    const key = cacheKey(m.chainId, m.contract, m.tokenId);
    if (m.metadataCachedAt && m.metaImage !== undefined) {
      // Use fromCachedRow — it normalizes broken URLs via ipfsToHttp
      result.set(key, fromCachedRow(m));
    } else {
      toResolve.push(m);
    }
  }

  if (toResolve.length === 0) return result;

  const deadline = Date.now() + budget;

  let idx = 0;
  async function worker() {
    while (idx < toResolve.length) {
      const i = idx++;
      const m = toResolve[i];
      const remaining = Math.max(500, deadline - Date.now());

      const key = cacheKey(m.chainId, m.contract, m.tokenId);

      try {
        const meta = await Promise.race([
          getMintMeta(m),
          new Promise<MintMetaCache>((resolve) =>
            setTimeout(() => resolve(emptyMetaFromMint(m)), remaining)
          ),
        ]);
        result.set(key, meta);
      } catch {
        result.set(key, emptyMetaFromMint(m));
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, toResolve.length) },
    () => worker()
  );
  await Promise.all(workers);

  return result;
}