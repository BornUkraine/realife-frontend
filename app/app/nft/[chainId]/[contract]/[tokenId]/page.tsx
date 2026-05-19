// PATH: app/app/nft/[chainId]/[contract]/[tokenId]/page.tsx
//
// The real, full NFT page — now INSIDE the /app section, so it renders
// within AppShell (sidebar, nav). This is what loads on:
//   - hard refresh of an NFT modal
//   - a direct/shared link to /app/nft/...
//   - the redirect from the legacy /nft/... URL
//
// All the heavy logic lives in the shared <NftDetail /> component.

import NftDetail from "@/components/nft/NftDetail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NftFullPage({
  params,
}: {
  params: Promise<{ chainId: string; contract: string; tokenId: string }>;
}) {
  const p = await params;

  return (
    <NftDetail
      chainIdParam={p.chainId}
      contractParam={p.contract}
      tokenIdParam={p.tokenId}
      variant="page"
    />
  );
}
