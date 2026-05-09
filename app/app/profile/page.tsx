import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfileClient from "./ProfileClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function randomId(len = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function ensurePublicId(userId: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { publicId: true },
    });

    if (!user) return null;
    if (user.publicId && user.publicId !== "tmp") return user.publicId;

    for (let i = 0; i < 25; i += 1) {
      const publicId = `rl_${randomId(8)}`;
      try {
        const updated = await tx.user.update({
          where: { id: userId },
          data: { publicId },
          select: { publicId: true },
        });
        return updated.publicId;
      } catch (e: any) {
        if (e?.code === "P2002") continue;
        if (e?.code === "P2025") return null;
        throw e;
      }
    }

    throw new Error("PUBLIC_ID_GENERATION_FAILED");
  });
}

export default async function ProfileIndexPage() {
  const session = await getServerSession(authOptions);
  const uid = (session as any)?.userId || (session as any)?.user?.id;

  // Keep the old logged-out UX instead of hard failing.
  if (!uid) return <ProfileClient />;

  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { handle: true, publicId: true },
  });

  if (!user) return <ProfileClient />;

  let key = user.handle || (user.publicId && user.publicId !== "tmp" ? user.publicId : null);

  if (!key) {
    const publicId = await ensurePublicId(uid);
    key = user.handle || publicId;
  }

  if (!key) return <ProfileClient />;

  redirect(`/app/profile/${encodeURIComponent(key)}`);
}
