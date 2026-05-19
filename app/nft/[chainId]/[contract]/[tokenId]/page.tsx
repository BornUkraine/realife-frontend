// PATH: app/nft/[chainId]/[contract]/[tokenId]/page.tsx
//
// LEGACY REDIRECT. The NFT page moved into the app section
// (/app/nft/...). Old bookmarks, shared links and indexed URLs that still
// point at /nft/... keep working — they are forwarded (query string, e.g.
// ?from=, is preserved).
//
// NOTE: this is a temporary (307) redirect. Once you are happy with the new
// URL and want search engines to fully move over, swap `redirect` for
// `permanentRedirect` (also from "next/navigation") to emit a 308.

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyNftRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ chainId: string; contract: string; tokenId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await params;
  const sp = await searchParams;

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (Array.isArray(v)) {
      for (const item of v) if (item != null) qs.append(k, item);
    } else if (v != null) {
      qs.set(k, v);
    }
  }
  const query = qs.toString();

  // params come in already URL-encoded as path segments — pass through as-is.
  redirect(
    `/app/nft/${p.chainId}/${p.contract}/${p.tokenId}${query ? `?${query}` : ""}`
  );
}
