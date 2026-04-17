#!/usr/bin/env node
// @ts-check

/**
 * scripts/backfill-metadata.mjs
 *
 * One-shot script that walks through all Mint rows without a metadata
 * cache and resolves their tokenUri from IPFS, writing the normalized
 * metadata back into Mint.meta* columns.
 *
 * Usage:
 *   node scripts/backfill-metadata.mjs                  # all uncached mints
 *   node scripts/backfill-metadata.mjs --force          # re-resolve everything
 *   node scripts/backfill-metadata.mjs --limit 100      # only first N
 *   node scripts/backfill-metadata.mjs --contract 0x..  # only one contract
 *   node scripts/backfill-metadata.mjs --concurrency 8  # tune parallelism
 *
 * Safe to run multiple times. Safe to Ctrl+C in the middle (each mint is
 * updated independently).
 *
 * Requires: @prisma/client. Run from project root.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------- CLI args ----------
const argv = process.argv.slice(2);
function arg(name, def = null) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  return argv[i + 1] ?? true;
}

const FORCE = Boolean(arg("force", false));
const LIMIT = Number(arg("limit", 0)) || 0;
const CONTRACT_FILTER = (arg("contract", "") || "").toString().toLowerCase();
const CONCURRENCY = Math.max(1, Math.min(16, Number(arg("concurrency", 6)) || 6));
const TIMEOUT_MS = Math.max(1500, Number(arg("timeout", 5000)) || 5000);

// ---------- IPFS gateways ----------
const PRIMARY_GATEWAY =
  process.env.IPFS_GATEWAY_PRIMARY ||
  process.env.NEXT_PUBLIC_IPFS_GATEWAY ||
  "https://gateway.pinata.cloud/ipfs/";

const GATEWAYS = Array.from(
  new Set(
    [
      PRIMARY_GATEWAY,
      "https://nftstorage.link/ipfs/",
      "https://cloudflare-ipfs.com/ipfs/",
      "https://ipfs.io/ipfs/",
    ].map((g) => (g.endsWith("/") ? g : g + "/"))
  )
);

function isHttpUrl(u) {
  if (!u) return false;
  const s = String(u).trim();
  return s.startsWith("http://") || s.startsWith("https://");
}

function ipfsToHttp(uri, gw = GATEWAYS[0]) {
  if (!uri) return null;
  const u = String(uri).trim();
  if (!u) return null;
  if (isHttpUrl(u)) return u;
  if (u.startsWith("ipfs://")) {
    let p = u.slice("ipfs://".length);
    if (p.startsWith("ipfs/")) p = p.slice("ipfs/".length);
    return `${gw}${p}`;
  }
  if (u.startsWith("/ipfs/")) return `${gw}${u.slice("/ipfs/".length)}`;
  if (/^[a-zA-Z0-9]{46,}$/.test(u)) return `${gw}${u}`;
  return u;
}

function isLikelyVideoUrl(u) {
  const s = String(u || "").toLowerCase();
  const clean = s.split("?")[0].split("#")[0];
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".mov") ||
    clean.endsWith(".m4v")
  );
}

function getAttr(meta, trait) {
  if (!meta || !Array.isArray(meta.attributes)) return null;
  const found = meta.attributes.find(
    (x) => String(x?.trait_type || "").toLowerCase() === trait.toLowerCase()
  );
  return found?.value != null ? String(found.value) : null;
}

async function fetchJsonOneGw(rawUri, gw, timeoutMs, outerSignal) {
  const url = ipfsToHttp(rawUri, gw);
  if (!url) throw new Error("bad_url");

  const ctrl = new AbortController();
  const onOuterAbort = () => ctrl.abort();
  outerSignal.addEventListener("abort", onOuterAbort, { once: true });

  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json, */*" },
    });
    if (!r.ok) throw new Error(`http_${r.status}`);
    const text = await r.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("not_json");
    }
  } finally {
    clearTimeout(t);
    outerSignal.removeEventListener("abort", onOuterAbort);
  }
}

async function fetchIpfsJson(rawUri, timeoutMs) {
  if (!rawUri) return null;

  if (isHttpUrl(rawUri)) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const r = await fetch(rawUri, {
          signal: ctrl.signal,
          headers: { Accept: "application/json, */*" },
        });
        if (!r.ok) throw new Error(`http_${r.status}`);
        return await r.json();
      } finally {
        clearTimeout(t);
      }
    } catch {
      return null;
    }
  }

  const outerCtrl = new AbortController();
  const tasks = GATEWAYS.map((gw) =>
    fetchJsonOneGw(rawUri, gw, timeoutMs, outerCtrl.signal)
  );
  try {
    const winner = await Promise.any(tasks);
    outerCtrl.abort();
    return winner && typeof winner === "object" ? winner : null;
  } catch {
    return null;
  }
}

function normalizeMeta(meta, fallback = {}) {
  const rawImage =
    meta?.image || meta?.image_url || meta?.imageUrl || fallback.image || null;
  const rawAnim =
    meta?.animation_url || meta?.animationUrl || meta?.animation || null;

  const imageHttp = ipfsToHttp(rawImage);
  const animHttp = ipfsToHttp(rawAnim);

  const mediaKind =
    rawAnim || isLikelyVideoUrl(animHttp) ? "video" : "image";

  return {
    name: meta?.name || fallback.name || null,
    description: meta?.description || null,
    image: imageHttp,
    animation: animHttp,
    mediaKind,
    collection: meta?.collection || getAttr(meta, "Collection") || null,
    item:
      meta?.item ||
      getAttr(meta, "Item") ||
      getAttr(meta, "Drink") ||
      null,
    rarity: meta?.rarity || getAttr(meta, "Rarity") || null,
    brand: meta?.brand || getAttr(meta, "Brand") || null,
    project: meta?.project || getAttr(meta, "Project") || null,
  };
}

// ---------- Bounded parallelism ----------
async function runWithConcurrency(items, concurrency, worker) {
  let idx = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (idx < items.length) {
      const i = idx++;
      try {
        await worker(items[i], i);
      } catch (e) {
        console.warn("[worker_error]", e?.message);
      }
    }
  });
  await Promise.all(runners);
}

// ---------- Main ----------
async function main() {
  console.log(
    `[backfill] start — force=${FORCE} limit=${LIMIT || "all"} ` +
      `concurrency=${CONCURRENCY} contract=${CONTRACT_FILTER || "*"}`
  );

  /** @type {any} */
  const where = {
    tokenUri: { not: null },
    verified: true,
  };
  if (!FORCE) where.metadataCachedAt = null;
  if (CONTRACT_FILTER) where.contract = CONTRACT_FILTER;

  const totalUncached = await prisma.mint.count({ where });
  console.log(`[backfill] found ${totalUncached} candidate mint(s)`);

  if (totalUncached === 0) {
    console.log("[backfill] nothing to do.");
    return;
  }

  const cap = LIMIT > 0 ? Math.min(LIMIT, totalUncached) : totalUncached;

  // Stream in pages of 500 so memory stays reasonable
  const PAGE = 500;
  let done = 0;
  let ok = 0;
  let failed = 0;
  let cursor = null;

  while (done < cap) {
    /** @type {any} */
    const findArgs = {
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: Math.min(PAGE, cap - done),
      select: {
        chainId: true,
        contract: true,
        tokenId: true,
        tokenUri: true,
        image: true,
        name: true,
      },
    };
    if (cursor) {
      findArgs.cursor = { id: cursor };
      findArgs.skip = 1;
    } else {
      // cursor needs id
      findArgs.select.id = true;
    }
    // If we don't have an id in select, add it
    findArgs.select.id = true;

    const batch = await prisma.mint.findMany(findArgs);
    if (batch.length === 0) break;

    cursor = batch[batch.length - 1].id;

    await runWithConcurrency(batch, CONCURRENCY, async (m) => {
      const raw = await fetchIpfsJson(m.tokenUri, TIMEOUT_MS);
      if (!raw) {
        failed++;
        process.stdout.write("·");
        return;
      }
      const norm = normalizeMeta(raw, { image: m.image, name: m.name });

      try {
        await prisma.mint.update({
          where: {
            chainId_contract_tokenId: {
              chainId: m.chainId,
              contract: m.contract,
              tokenId: m.tokenId,
            },
          },
          data: {
            metadataCachedAt: new Date(),
            metaImage: norm.image,
            metaAnimation: norm.animation,
            metaMediaKind: norm.mediaKind,
            metaDescription: norm.description,
            metaCollection: norm.collection,
            metaItem: norm.item,
            metaRarity: norm.rarity,
            metaBrand: norm.brand,
            metaProject: norm.project,
          },
        });
        ok++;
        process.stdout.write("✓");
      } catch (e) {
        failed++;
        process.stdout.write("x");
      }
    });

    done += batch.length;
    process.stdout.write(`\n[backfill] progress ${done}/${cap}\n`);

    if (batch.length < findArgs.take) break;
  }

  console.log("\n[backfill] done.");
  console.log(`[backfill] ok=${ok}  failed=${failed}  total_scanned=${done}`);
}

main()
  .catch((e) => {
    console.error("[backfill] FATAL", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
