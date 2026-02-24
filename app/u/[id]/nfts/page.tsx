import AppShell from "@/components/AppShell";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function shortAddr(addr?: string | null) {
  if (!addr) return "—";
  const s = String(addr);
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

type Nft = {
  id: string;
  createdAt: Date;
  chainId: number;
  contract: string;
  tokenId: string;
  name: string | null;
  image: string | null;
};

export default async function PublicNFTsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const key = safeDecode(id || "").trim();
  if (!key || key.length > 64) notFound();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { handle: { equals: key, mode: "insensitive" } },
        { publicId: { equals: key, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      handle: true,
      publicId: true,
      walletAddress: true,
      twitterName: true,
      twitterUser: true,
      twitterImage: true,
      discordName: true,
      discordUser: true,
      discordImage: true,
    },
  });

  if (!user) notFound();

  const displayName =
    user.twitterName ||
    user.discordName ||
    (user.twitterUser ? `@${user.twitterUser}` : null) ||
    (user.discordUser ? `@${user.discordUser}` : null) ||
    (user.handle ? `@${user.handle}` : null) ||
    shortAddr(user.walletAddress);

  const avatar = user.twitterImage || user.discordImage || null;
  const publicKey = user.handle || user.publicId || null;
  const publicUrl = publicKey && publicKey !== "tmp" ? `/u/${publicKey}` : null;

  const nfts: Nft[] = await prisma.mint.findMany({
    where: { userId: user.id, verified: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      chainId: true,
      contract: true,
      tokenId: true,
      name: true,
      image: true,
      createdAt: true,
    },
    take: 200,
  });

  return (
    <AppShell title="REALIFE" subtitle="Public NFTs">
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

        {/* ✅ было max-w-6xl -> стало max-w-7xl */}
        <div className="relative mx-auto max-w-7xl px-6 py-10">
          {/* header like OpenSea */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl border border-white/10 bg-white/[0.06] overflow-hidden">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-white/35 font-black text-xs">RL</div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-3xl md:text-4xl font-black tracking-tight truncate">{displayName}</div>
              <div className="mt-2 flex items-center gap-2 text-[12px] text-white/55">
                {publicUrl ? (
                  <Link className="hover:underline" href={publicUrl}>
                    Back to profile
                  </Link>
                ) : null}
                <span>•</span>
                <span>{nfts.length} items</span>
              </div>
            </div>

            {publicUrl ? (
              <Link
                href={publicUrl}
                className="px-4 py-2 rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/10 font-extrabold"
              >
                Profile
              </Link>
            ) : null}
          </div>

          {/* grid */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {nfts.map((x) => (
              <Link
                key={x.id}
                href={`/nft/${x.chainId}/${x.contract}/${x.tokenId}`}
                className={cx(
                  "group rounded-[26px] overflow-hidden border border-white/10 bg-white/[0.04]",
                  "shadow-[0_24px_90px_rgba(0,0,0,0.55)] hover:-translate-y-0.5 transition"
                )}
              >
                <div className="aspect-square w-full bg-black/30">
                  {x.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={x.image} alt={x.name || "NFT"} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-white/25 font-black">
                      No image
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="text-sm font-extrabold text-white/90 truncate">
                    {x.name || `Token #${x.tokenId}`}
                  </div>
                  <div className="mt-1 text-[12px] text-white/55 flex items-center justify-between gap-2">
                    <span className="truncate">{shortAddr(x.contract)}</span>
                    <span className="font-mono">#{x.tokenId}</span>
                  </div>

                  <div className="mt-3 h-[1px] bg-white/10" />
                  <div className="mt-3 text-[12px] font-extrabold text-amber-100/90 group-hover:text-amber-100">
                    View →
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {nfts.length === 0 && (
            <div className="mt-10 rounded-[26px] border border-white/10 bg-white/[0.04] p-6 text-white/70">
              No NFTs yet.
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}