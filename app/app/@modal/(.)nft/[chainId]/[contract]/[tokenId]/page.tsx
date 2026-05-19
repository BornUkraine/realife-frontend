// PATH: app/app/@modal/(.)nft/[chainId]/[contract]/[tokenId]/page.tsx
//
// INTERCEPTING ROUTE. Fires only on client-side <Link> navigation from
// somewhere inside /app (gallery, trading, profile). It renders the shared
// NftDetail in "modal" mode wrapped by the NftModal overlay, so the page
// the user was on stays mounted underneath.
//
// Hard refresh / direct link / external entry does NOT hit this file —
// it falls through to the full page at app/app/nft/[...]/page.tsx.

import NftDetail from "@/components/nft/NftDetail";
import NftModal from "@/components/nft/NftModal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function InterceptedNftModal({
  params,
}: {
  params: Promise<{ chainId: string; contract: string; tokenId: string }>;
}) {
  const p = await params;

  return (
    <NftModal>
      <NftDetail
        chainIdParam={p.chainId}
        contractParam={p.contract}
        tokenIdParam={p.tokenId}
        variant="modal"
      />
    </NftModal>
  );
}
