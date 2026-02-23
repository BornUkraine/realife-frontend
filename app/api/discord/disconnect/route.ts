import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;

  if (!userId) {
    return NextResponse.json({ ok: false, error: "NO_SERVER_SESSION" }, { status: 401 });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        discordId: null,
        discordUser: null,
        discordName: null,
        discordImage: null,
      },
    });

    // опционально: лог события
    // await prisma.pointEvent.create({
    //   data: { userId, type: "DISCORD_DISCONNECT", points: 0 },
    // });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DISCORD_DISCONNECT_ERROR", e);
    return NextResponse.json({ ok: false, error: "DISCONNECT_FAILED" }, { status: 500 });
  }
}