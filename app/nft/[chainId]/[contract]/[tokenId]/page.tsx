import AppShell from "@/components/AppShell";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function shortAddr(addr?: string | null) {
  if (!addr) return "—";
  const s = String(addr);
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function norm(a: string) {
  return String(a || "").trim().toLowerCase();
}

// ✅ открываем ipfs:// в браузере
function ipfsToHttp(uri: string) {
  const u = String(uri || "").trim();
  if (!u) return "";
  if (u.startsWith("ipfs://")) {
    const cid = u.replace("ipfs://", "");
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }
  return u;
}

// ✅ маппер эксплорера по chainId (минимум Base + Base Sepolia)
function txExplorerUrl(chainId: number, txHash: string) {
  if (!txHash) return null;
  if (chainId === 84532) return `https://sepolia.basescan.org/tx/${txHash}`; // Base Sepolia
  if (chainId === 8453) return `https://basescan.org/tx/${txHash}`; // Base mainnet
  return null; // unknown chain
}

export default async function NftDetailsPage({
  params,
}: {
  params: Promise<{ chainId: string; contract: string; tokenId: string }>;
}) {
  const p = await params;
  const chainId = Number(p.chainId);
  const contract = norm(safeDecode(p.contract || ""));
  const tokenId = safeDecode(p.tokenId || "").trim();

  if (!Number.isFinite(chainId) || !contract.startsWith("0x") || !tokenId) notFound();

  const nft = await prisma.mint.findFirst({
    where: {
      chainId,
      contract,
      tokenId,
      verified: true,
    },
    select: {
      id: true,
      createdAt: true,
      chainId: true,
      contract: true,
      tokenId: true,
      txHash: true,
      tokenUri: true,
      name: true,
      image: true,
      user: {
        select: {
          handle: true,
          publicId: true,
          twitterName: true,
          twitterUser: true,
          twitterImage: true,
          discordName: true,
          discordUser: true,
          discordImage: true,
          walletAddress: true,
        },
      },
    },
  });

  if (!nft) notFound();

  const u = nft.user;
  const publicKey = u.handle || u.publicId || null;
  const ownerUrl = publicKey && publicKey !== "tmp" ? `/u/${publicKey}` : null;
  const ownerNftsUrl = ownerUrl ? `${ownerUrl}/nfts` : null;

  const ownerName =
    u.twitterName ||
    u.discordName ||
    (u.twitterUser ? `@${u.twitterUser}` : null) ||
    (u.discordUser ? `@${u.discordUser}` : null) ||
    (u.handle ? `@${u.handle}` : null) ||
    shortAddr(u.walletAddress);

  const avatar = u.twitterImage || u.discordImage || null;

  const tokenUriHttp = nft.tokenUri ? ipfsToHttp(nft.tokenUri) : null;
  const txUrl = nft.txHash ? txExplorerUrl(nft.chainId, nft.txHash) : null;

  return (
    <AppShell title="REALIFE" subtitle="NFT details">
      <main className="min-h-screen bg-[#060505] text-white overflow-x-hidden">
        {/* Premium background */}
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.10),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(255,255,255,0.05),transparent_60%)]" />
          <div className="absolute -top-80 -left-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/12 blur-3xl animate-pulse" />
          <div className="absolute -bottom-80 -right-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/10 blur-3xl animate-pulse" />
          <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[length:56px_56px]" />
          <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.65),transparent)]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-10">
          {/* Top nav */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[12px] text-white/55">
              {ownerNftsUrl ? (
                <Link className="hover:underline" href={ownerNftsUrl}>
                  NFTs
                </Link>
              ) : (
                <span>NFTs</span>
              )}
              <span>›</span>
              {ownerUrl ? (
                <Link className="hover:underline" href={ownerUrl}>
                  {ownerName}
                </Link>
              ) : (
                <span>{ownerName}</span>
              )}
            </div>

            {ownerNftsUrl ? (
              <Link
                href={ownerNftsUrl}
                className="px-4 py-2 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 font-extrabold"
              >
                Back to gallery
              </Link>
            ) : null}
          </div>

          {/* Content */}
          <div className="mt-6 grid lg:grid-cols-2 gap-6">
            {/* Left: media */}
            <div
              className={cx(
                "rounded-[34px] p-px overflow-hidden",
                "bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))]",
                "shadow-[0_34px_130px_rgba(0,0,0,0.60)]"
              )}
            >
              <div className="rounded-[34px] overflow-hidden border border-white/10 bg-[#0b0a09]/60 backdrop-blur-2xl ring-1 ring-black/10">
                <div className="aspect-square bg-black/30 flex items-center justify-center">
                  {nft.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={nft.image} alt={nft.name || "NFT"} className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-white/25 font-black">No image</div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: meta */}
            <div
              className={cx(
                "rounded-[34px] p-px overflow-hidden",
                "bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))]",
                "shadow-[0_34px_130px_rgba(0,0,0,0.60)]"
              )}
            >
              <div className="rounded-[34px] overflow-hidden border border-white/10 bg-[#0b0a09]/60 backdrop-blur-2xl ring-1 ring-black/10">
                <div className="p-6 md:p-7">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 font-black">
                    Realife NFT
                  </div>

                  <div className="mt-3 text-3xl md:text-4xl font-black tracking-tight">
                    {nft.name || `Token #${nft.tokenId}`}
                  </div>

                  {/* Owner */}
                  <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="h-12 w-12 rounded-2xl border border-white/10 bg-white/[0.06] overflow-hidden flex items-center justify-center">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatar}
                          alt="owner"
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-white/35 text-xs font-black">RL</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                        Owner
                      </div>
                      <div className="mt-1 text-sm font-extrabold text-white/85 truncate">
                        {ownerUrl ? (
                          <Link className="hover:underline" href={ownerUrl}>
                            {ownerName}
                          </Link>
                        ) : (
                          ownerName
                        )}
                      </div>
                    </div>
                    {ownerNftsUrl ? (
                      <Link
                        href={ownerNftsUrl}
                        className="shrink-0 text-[12px] font-extrabold text-amber-100/90 hover:text-amber-100"
                      >
                        View NFTs →
                      </Link>
                    ) : null}
                  </div>

                  {/* Details */}
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                        Contract
                      </div>
                      <div className="mt-1 text-[13px] font-mono font-extrabold text-white/85 truncate">
                        {shortAddr(nft.contract)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                        Token ID
                      </div>
                      <div className="mt-1 text-[13px] font-mono font-extrabold text-white/85 truncate">
                        #{nft.tokenId}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                        Chain ID
                      </div>
                      <div className="mt-1 text-[13px] font-mono font-extrabold text-white/85 truncate">
                        {nft.chainId}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                        Minted
                      </div>
                      <div className="mt-1 text-[13px] font-extrabold text-white/85 truncate">
                        {new Date(nft.createdAt).toLocaleString("en-GB")}
                      </div>
                    </div>
                  </div>

                  {/* Links */}
                  <div className="mt-6 flex flex-wrap gap-3">
                    {/* ✅ Token URI оставляем — это важная публичная ссылка */}
                    {tokenUriHttp ? (
                      <a
                        href={tokenUriHttp}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/15 bg-white/[0.06] font-extrabold backdrop-blur-2xl hover:bg-white/10 hover:-translate-y-px transition active:translate-y-0"
                      >
                        Token URI ↗
                      </a>
                    ) : null}

                    {/* ✅ Tx ↗ теперь правильный для Base Sepolia */}
                    {txUrl ? (
                      <a
                        href={txUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-white/15 bg-white/[0.06] font-extrabold backdrop-blur-2xl hover:bg-white/10 hover:-translate-y-px transition active:translate-y-0"
                      >
                        Tx ↗
                      </a>
                    ) : null}

                    {ownerNftsUrl ? (
                      <Link
                        href={ownerNftsUrl}
                        className="inline-flex items-center justify-center px-5 py-3 rounded-2xl text-black font-extrabold hover:brightness-110 transition shadow-[0_18px_60px_rgba(212,175,55,0.20)] bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15"
                      >
                        Back to gallery
                      </Link>
                    ) : null}
                  </div>

                  <div className="mt-6 text-[11px] text-white/35">
                    Public NFT data is served from Realife database (Mint cache). Images/metadata depend on mint process.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer className="pt-10 text-[10px] font-black text-white/20 text-center uppercase tracking-[0.4em]">
            Realife Ecosystem • NFT Verified
          </footer>
        </div>
      </main>
    </AppShell>
  );
}