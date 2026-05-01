/**
 * Server-side IPFS resolver with gateway racing + caching.
 *
 * Goals:
 *  - Fetch IPFS JSON/bytes as fast as possible (race multiple gateways)
 *  - Never block a request longer than `timeoutMs`
 *  - Always return something usable (or null) — never throw into request handlers
 *  - Normalize known gateway URLs to the preferred gateway to avoid sticky 403s
 */

// ---------- Gateway config ----------

function normalizeGatewayUrl(raw: string | null | undefined): string {
  let g = String(raw || "").trim();
  if (!g) return "";
  g = g.replace(/\/+$/, "");
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
      "https://gateway.pinata.cloud/ipfs/",
      "https://nftstorage.link/ipfs/",
      "https://ipfs.io/ipfs/",
      "https://cloudflare-ipfs.com/ipfs/",
      "https://w3s.link/ipfs/",
      "https://dweb.link/ipfs/",
    ]
      .map(normalizeGatewayUrl)
      .filter(Boolean)
  )
);

const KNOWN_IPFS_GATEWAY_HOSTS = new Set<string>([
  "gateway.pinata.cloud",
  "cloudflare-ipfs.com",
  "cf-ipfs.com",
  "nftstorage.link",
  "w3s.link",
  "dweb.link",
  "ipfs.io",
]);

function isKnownGatewayHost(hostname: string) {
  const h = hostname.toLowerCase();
  return KNOWN_IPFS_GATEWAY_HOSTS.has(h) || h.endsWith(".mypinata.cloud");
}

function isLikelyCidPath(v: string) {
  return /^(Qm[a-zA-Z0-9]{44}|bafy[a-zA-Z0-9]{20,}|bafk[a-zA-Z0-9]{20,})(\/.*)?$/.test(
    v
  );
}

// ---------- URL helpers ----------

export function isHttpUrl(u?: string | null): boolean {
  if (!u) return false;
  const s = String(u).trim();
  return s.startsWith("http://") || s.startsWith("https://");
}

export function extractIpfsPath(raw?: string | null): string | null {
  const s = String(raw || "").trim();
  if (!s) return null;

  if (s.startsWith("ipfs://")) {
    let p = s.slice("ipfs://".length);
    if (p.startsWith("ipfs/")) p = p.slice("ipfs/".length);
    return p || null;
  }

  if (s.startsWith("/ipfs/")) return s.slice("/ipfs/".length) || null;
  if (isLikelyCidPath(s)) return s;

  try {
    const parsed = new URL(s);
    const path = parsed.pathname || "";
    const ipfsIndex = path.indexOf("/ipfs/");

    if (ipfsIndex >= 0 && isKnownGatewayHost(parsed.hostname)) {
      const p = path.slice(ipfsIndex + "/ipfs/".length);
      return `${p}${parsed.search}${parsed.hash}` || null;
    }

    const barePath = path.replace(/^\/+/, "");
    if (isKnownGatewayHost(parsed.hostname) && isLikelyCidPath(barePath)) {
      return `${barePath}${parsed.search}${parsed.hash}`;
    }

    const subdomainMatch = parsed.hostname.match(/^(.+)\.ipfs\./i);
    if (subdomainMatch?.[1]) {
      const rest = path && path !== "/" ? path : "";
      return `${subdomainMatch[1]}${rest}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // not a URL
  }

  return null;
}

export function ipfsGatewayUrls(raw?: string | null): string[] {
  const path = extractIpfsPath(raw);
  if (!path) return raw ? [String(raw)] : [];

  return Array.from(
    new Set([
      ...IPFS_GATEWAYS.map(
        (gateway) => `${gateway}${path.replace(/^\/+/, "")}`
      ),
      ...(raw ? [String(raw)] : []),
    ])
  );
}

/**
 * Convert any IPFS-ish URI into a valid HTTP URL.
 *
 * Handles:
 *   ipfs://CID            -> {gw}/CID
 *   ipfs://ipfs/CID       -> {gw}/CID
 *   /ipfs/CID             -> {gw}/CID
 *   Qm... / bafy...       -> {gw}/CID
 *   https://gateway/ipfs/CID -> rewritten to preferred gw when host is known
 */
export function ipfsToHttp(
  uri?: string | null,
  gw: string = IPFS_GATEWAYS[0]
): string | null {
  if (!uri) return null;

  const u = String(uri).trim();
  if (!u) return null;

  if (isHttpUrl(u)) {
    const ipfsPath = extractIpfsPath(u);
    if (ipfsPath) {
      return `${normalizeGatewayUrl(gw)}${ipfsPath.replace(/^\/+/, "")}`;
    }

    return u;
  }

  const ipfsPath = extractIpfsPath(u);
  if (ipfsPath) {
    return `${normalizeGatewayUrl(gw)}${ipfsPath.replace(/^\/+/, "")}`;
  }

  return u;
}

// ---------- Fetch helpers ----------

async function fetchJsonUrl(
  url: string,
  timeoutMs: number,
  signal: AbortSignal
): Promise<any> {
  if (!url) throw new Error("bad_url");

  const ctrl = new AbortController();
  const abortOnOuter = () => ctrl.abort();
  signal.addEventListener("abort", abortOnOuter, { once: true });

  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      next: { revalidate: 60 * 60 * 24 * 7 },
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

async function fetchJsonOneGw(
  rawUri: string,
  gw: string,
  timeoutMs: number,
  signal: AbortSignal
): Promise<any> {
  const url = ipfsToHttp(rawUri, gw);
  if (!url) throw new Error("bad_url");
  return fetchJsonUrl(url, timeoutMs, signal);
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
  const outerCtrl = new AbortController();
  const candidates = ipfsGatewayUrls(rawUri);

  const tasks = candidates.map((url) => {
    if (isHttpUrl(url)) {
      return fetchJsonUrl(url, timeoutMs, outerCtrl.signal);
    }

    return fetchJsonOneGw(url, IPFS_GATEWAYS[0], timeoutMs, outerCtrl.signal);
  });

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
