/**
 * Server-side IPFS resolver with gateway racing + caching.
 *
 * Goals:
 *  - Fetch IPFS JSON/bytes as fast as possible (race multiple gateways)
 *  - Never block a request longer than `timeoutMs`
 *  - Always return something usable (or null) — never throw into request handlers
 *
 * Usage:
 *   import { ipfsToHttp, fetchIpfsJson } from "@/lib/ipfs";
 *
 *   const url = ipfsToHttp("ipfs://bafy.../meta.json");
 *   const meta = await fetchIpfsJson("ipfs://bafy.../meta.json");
 */

// ---------- Gateway config ----------

/**
 * Normalize a gateway URL so it always ends with "/ipfs/".
 *
 * Accepts:
 *   "https://nftstorage.link"        -> "https://nftstorage.link/ipfs/"
 *   "https://nftstorage.link/"       -> "https://nftstorage.link/ipfs/"
 *   "https://nftstorage.link/ipfs"   -> "https://nftstorage.link/ipfs/"
 *   "https://nftstorage.link/ipfs/"  -> "https://nftstorage.link/ipfs/"  (no-op)
 */
function normalizeGatewayUrl(raw: string | null | undefined): string {
  let g = String(raw || "").trim();
  if (!g) return "";
  // strip trailing slashes
  g = g.replace(/\/+$/, "");
  // append /ipfs if missing
  if (!g.endsWith("/ipfs")) g += "/ipfs";
  return g + "/";
}

const PRIMARY_GATEWAY = normalizeGatewayUrl(
  process.env.IPFS_GATEWAY_PRIMARY ||
    process.env.NEXT_PUBLIC_IPFS_GATEWAY ||
    "https://gateway.pinata.cloud/ipfs/"
);

export const IPFS_GATEWAYS: string[] = Array.from(
  new Set(
    [
      PRIMARY_GATEWAY,
      "https://nftstorage.link/ipfs/",
      "https://cloudflare-ipfs.com/ipfs/",
      "https://ipfs.io/ipfs/",
    ]
      .map(normalizeGatewayUrl)
      .filter(Boolean)
  )
);

// ---------- URL helpers ----------

export function isHttpUrl(u?: string | null): boolean {
  if (!u) return false;
  const s = String(u).trim();
  return s.startsWith("http://") || s.startsWith("https://");
}

/**
 * Convert any IPFS-ish URI into a valid HTTP URL.
 *
 * Handles:
 *   ipfs://CID            -> {gw}/CID
 *   ipfs://ipfs/CID       -> {gw}/CID
 *   /ipfs/CID             -> {gw}/CID
 *   Qm... / bafy...       -> {gw}/CID
 *   https://...           -> returned as-is, BUT if it's a known gateway URL
 *                            without /ipfs/ (e.g. "https://nftstorage.link/Qm...")
 *                            we fix it by inserting /ipfs/.
 */
export function ipfsToHttp(
  uri?: string | null,
  gw: string = IPFS_GATEWAYS[0]
): string | null {
  if (!uri) return null;

  const u = String(uri).trim();
  if (!u) return null;

  if (isHttpUrl(u)) {
    // Fix broken gateway URLs that have a CID right after the host:
    // e.g. "https://nftstorage.link/QmYeQj..." -> "https://nftstorage.link/ipfs/QmYeQj..."
    try {
      const parsed = new URL(u);
      // If the path starts with /Qm... or /bafy... (bare CID), insert /ipfs
      const cidMatch = parsed.pathname.match(/^\/(Qm[a-zA-Z0-9]{44}|bafy[a-zA-Z0-9]{44,})(\/.*)?$/);
      if (cidMatch) {
        const [, cid, rest = ""] = cidMatch;
        return `${parsed.origin}/ipfs/${cid}${rest}${parsed.search}${parsed.hash}`;
      }
    } catch {
      // ignore URL parse errors
    }
    return u;
  }

  if (u.startsWith("ipfs://")) {
    let p = u.slice("ipfs://".length);
    if (p.startsWith("ipfs/")) p = p.slice("ipfs/".length);
    return `${gw}${p}`;
  }

  if (u.startsWith("/ipfs/")) {
    return `${gw}${u.slice("/ipfs/".length)}`;
  }

  // Bare CID
  if (/^[a-zA-Z0-9]{46,}$/.test(u)) {
    return `${gw}${u}`;
  }

  return u;
}

// ---------- Fetch helpers ----------

async function fetchJsonOneGw(
  rawUri: string,
  gw: string,
  timeoutMs: number,
  signal: AbortSignal
): Promise<any> {
  const url = ipfsToHttp(rawUri, gw);
  if (!url) throw new Error("bad_url");

  const ctrl = new AbortController();
  const abortOnOuter = () => ctrl.abort();
  signal.addEventListener("abort", abortOnOuter, { once: true });

  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      next: { revalidate: 60 * 60 * 24 * 7 }, // 7d — IPFS content is immutable
      headers: { Accept: "application/json, */*" },
    });

    if (!r.ok) throw new Error(`http_${r.status}`);

    const ct = r.headers.get("content-type") || "";
    const text = await r.text();

    try {
      return JSON.parse(text);
    } catch {
      if (ct.includes("json")) throw new Error("bad_json");
      throw new Error("not_json");
    }
  } finally {
    clearTimeout(t);
    signal.removeEventListener("abort", abortOnOuter);
  }
}

/**
 * Race multiple IPFS gateways, return first successful JSON response.
 * Never throws — returns null on total failure.
 */
export async function fetchIpfsJson(
  rawUri?: string | null,
  opts: { timeoutMs?: number } = {}
): Promise<Record<string, any> | null> {
  if (!rawUri) return null;

  const timeoutMs = opts.timeoutMs ?? 4500;

  // If already http(s), try direct first (but make sure it's been normalized)
  if (isHttpUrl(rawUri)) {
    const fixed = ipfsToHttp(rawUri); // fixes broken gateway URLs
    if (!fixed) return null;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const r = await fetch(fixed, {
          signal: ctrl.signal,
          next: { revalidate: 60 * 60 * 24 * 7 },
          headers: { Accept: "application/json, */*" },
        });
        if (!r.ok) throw new Error(`http_${r.status}`);
        const j = await r.json().catch(() => null);
        if (j && typeof j === "object") return j;
      } finally {
        clearTimeout(t);
      }
    } catch {
      return null;
    }
    return null;
  }

  // ipfs:// or bare CID — race gateways
  const outerCtrl = new AbortController();

  const tasks = IPFS_GATEWAYS.map((gw) =>
    fetchJsonOneGw(rawUri, gw, timeoutMs, outerCtrl.signal)
  );

  try {
    const winner = await Promise.any(tasks);
    outerCtrl.abort();
    if (winner && typeof winner === "object") {
      return winner as Record<string, any>;
    }
    return null;
  } catch {
    return null;
  }
}

// ---------- Metadata shape helpers ----------

export type NftMetaRaw = Record<string, any>;

export type NftMetaNormalized = {
  name: string | null;
  description: string | null;
  image: string | null;
  animation: string | null;
  mediaKind: "image" | "video";
  collection: string | null;
  item: string | null;
  rarity: string | null;
  brand: string | null;
  project: string | null;
};

export function isLikelyVideoUrl(u?: string | null): boolean {
  const s = String(u || "").toLowerCase();
  const clean = s.split("?")[0].split("#")[0];
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".mov") ||
    clean.endsWith(".m4v")
  );
}

function getAttr(meta: NftMetaRaw | null, trait: string): string | null {
  if (!meta || !Array.isArray(meta.attributes)) return null;
  const found = meta.attributes.find(
    (x: any) =>
      String(x?.trait_type || "").toLowerCase() === trait.toLowerCase()
  );
  return found?.value != null ? String(found.value) : null;
}

export function normalizeMeta(
  meta: NftMetaRaw | null,
  fallback?: { image?: string | null; name?: string | null }
): NftMetaNormalized {
  const rawImage =
    meta?.image || meta?.image_url || meta?.imageUrl || fallback?.image || null;

  const rawAnim =
    meta?.animation_url || meta?.animationUrl || meta?.animation || null;

  const imageHttp = ipfsToHttp(rawImage);
  const animHttp = ipfsToHttp(rawAnim);

  const mediaKind: "image" | "video" =
    rawAnim || isLikelyVideoUrl(animHttp) ? "video" : "image";

  return {
    name: meta?.name || fallback?.name || null,
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