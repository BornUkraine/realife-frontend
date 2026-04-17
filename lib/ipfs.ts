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

const PRIMARY_GATEWAY =
  process.env.IPFS_GATEWAY_PRIMARY ||
  process.env.NEXT_PUBLIC_IPFS_GATEWAY ||
  "https://gateway.pinata.cloud/ipfs/";

export const IPFS_GATEWAYS: string[] = Array.from(
  new Set(
    [
      PRIMARY_GATEWAY,
      "https://nftstorage.link/ipfs/",
      "https://cloudflare-ipfs.com/ipfs/",
      "https://ipfs.io/ipfs/",
    ].map((x) => (x.endsWith("/") ? x : x + "/"))
  )
);

// ---------- URL helpers ----------

export function isHttpUrl(u?: string | null): boolean {
  if (!u) return false;
  const s = String(u).trim();
  return s.startsWith("http://") || s.startsWith("https://");
}

export function ipfsToHttp(
  uri?: string | null,
  gw: string = IPFS_GATEWAYS[0]
): string | null {
  if (!uri) return null;

  const u = String(uri).trim();
  if (!u) return null;

  if (isHttpUrl(u)) return u;

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
      // We want HTTP-level caching in Next's fetch cache:
      next: { revalidate: 60 * 60 * 24 * 7 }, // 7d — IPFS content is immutable
      headers: { Accept: "application/json, */*" },
    });

    if (!r.ok) throw new Error(`http_${r.status}`);

    const ct = r.headers.get("content-type") || "";
    const text = await r.text();

    // Some gateways return text/plain for json — try parse anyway
    try {
      return JSON.parse(text);
    } catch {
      if (ct.includes("json")) throw new Error("bad_json");
      // Not JSON — probably a 404 HTML page
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

  // If already http(s), try direct first (skip gateway racing)
  if (isHttpUrl(rawUri)) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const r = await fetch(rawUri, {
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
      // fall through to gateway racing using the http url as-is is pointless;
      // only makes sense if it was ipfs-style originally.
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
    outerCtrl.abort(); // cancel other pending fetches
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
  image: string | null; // http(s)
  animation: string | null; // http(s), optional
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
