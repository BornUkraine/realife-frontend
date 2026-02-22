import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);

  const uid =
    (session as any)?.userId ||
    (session as any)?.user?.id ||
    (session as any)?.user?.uid ||
    null;

  if (!uid) {
    return NextResponse.json({ ok: false, error: "NO_SERVER_SESSION" }, { status: 401 });
  }

  try {
    await prisma.user.update({
      where: { id: uid },
      data: {
        twitterId: null,
        twitterUser: null,
        twitterName: null,
        twitterImage: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "DISCONNECT_FAILED" }, { status: 500 });
  }
}