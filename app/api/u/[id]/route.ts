import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const userSelect = {
  id: true,
  handle: true,
  publicId: true,
  points: true,

  twitterId: true,
  twitterUser: true,
  twitterName: true,
  twitterImage: true,

  discordId: true,
  discordUser: true,
  discordName: true,
  discordImage: true,

  createdAt: true,
} as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: key } = await params;

  const user = await prisma.user.findFirst({
    where: { OR: [{ handle: key }, { publicId: key }] },
    select: userSelect,
  });

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const twitterConnected = Boolean(user.twitterId);
  const discordConnected = Boolean(user.discordId);

  const name =
    user.twitterName ||
    user.twitterUser ||
    user.discordName ||
    user.discordUser ||
    "Realife user";

  const avatar = user.twitterImage || user.discordImage || null;
  const publicUrl = user.handle ? `/u/${user.handle}` : `/u/${user.publicId}`;

  return NextResponse.json({
    ok: true,
    user: {
      ...user,
      twitterConnected,
      discordConnected,
      name,
      avatar,
      publicUrl,
    },
  });
}
