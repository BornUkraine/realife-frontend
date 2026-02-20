// @ts-nocheck
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyMessage } from "viem";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function randomId(len = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // без 0/O/I/1
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function ensurePublicId(db: typeof prisma, userId: string): Promise<string> {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { publicId: true },
  });

  if (u?.publicId && u.publicId !== "tmp") return u.publicId;

  for (let i = 0; i < 25; i++) {
    const pid = `rl_${randomId(8)}`;
    try {
      const updated = await db.user.update({
        where: { id: userId },
        data: { publicId: pid },
        select: { publicId: true },
      });
      if (updated.publicId) return updated.publicId;
    } catch (e: any) {
      if (e?.code === "P2002") continue; // collision -> retry
      throw e;
    }
  }
  throw new Error("PUBLIC_ID_GENERATION_FAILED");
}

async function awardOnce(
  db: typeof prisma,
  userId: string,
  type: "DAILY",
  points: number
) {
  const already = await db.pointEvent.findFirst({
    where: { userId, type },
    select: { id: true },
  });

  if (already) return false;

  await db.user.update({
    where: { id: userId },
    data: { points: { increment: points } },
  });

  await db.pointEvent.create({
    data: { userId, type, points },
  });

  return true;
}

const tokenSelect = {
  id: true,
  points: true,
  handle: true,
  publicId: true,
  walletAddress: true,
  walletChainId: true,
} as const;

function tokenUserId(token: any): string | null {
  return (token?.uid as string) || (token?.sub as string) || null;
}

function applyUserToToken(token: any, user: any) {
  token.sub = user.id;
  token.uid = user.id;

  token.points = user.points ?? 0;
  token.handle = user.handle ?? null;
  token.publicId = user.publicId ?? null;

  token.walletAddress = user.walletAddress ?? null;
  token.walletChainId = user.walletChainId ?? null;

  return token;
}

/* -------------------------------------------------------------------------- */
/* AUTH OPTIONS                                                               */
/* -------------------------------------------------------------------------- */

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  trustHost: true,

  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  debug: process.env.NODE_ENV !== "production" && process.env.NEXTAUTH_DEBUG === "true",

  providers: [
    CredentialsProvider({
      id: "wallet",
      name: "Wallet",
      credentials: {
        address: { label: "Address", type: "text" },
        signature: { label: "Signature", type: "text" },
        chainId: { label: "ChainId", type: "text" },
      },
      async authorize(credentials) {
        const address = String(credentials?.address || "").trim().toLowerCase();
        const signature = String(credentials?.signature || "").trim();
        const chainId = Number(credentials?.chainId || "0");

        if (!address || !address.startsWith("0x") || signature.length < 20) return null;

        const row = await prisma.walletNonce.findUnique({ where: { address } });
        if (!row) return null;
        if (row.expiresAt.getTime() < Date.now()) return null;

        const message =
          `Realife wallet verification\n` +
          `Address: ${address}\n` +
          `Nonce: ${row.nonce}\n` +
          `URI: ${process.env.NEXTAUTH_URL ?? ""}`;

        const ok = await verifyMessage({
          address: address as `0x${string}`,
          message,
          signature: signature as `0x${string}`,
        });

        if (!ok) return null;

        await prisma.walletNonce.delete({ where: { address } }).catch(() => {});

        const user = await prisma.$transaction(async (tx) => {
          const u = await tx.user.upsert({
            where: { walletAddress: address },
            create: {
              walletAddress: address,
              walletChainId: Number.isFinite(chainId) ? chainId : null,
            },
            update: {
              walletChainId: Number.isFinite(chainId) ? chainId : null,
            },
          });

          await ensurePublicId(tx as any, u.id);

          const fresh = await tx.user.findUnique({ where: { id: u.id }, select: tokenSelect });
          return fresh ?? u;
        });

        return { id: user.id } as any;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (trigger === "update" && session) {
        return { ...token, ...session };
      }

      const currentUserId = tokenUserId(token);

      if (account?.provider === "wallet" && user?.id) {
        token.sub = user.id;
        token.uid = user.id;

        const u = await prisma.user.findUnique({ where: { id: user.id }, select: tokenSelect });
        if (u) applyUserToToken(token, u);

        return token;
      }

      if (!account && currentUserId) {
        const u = await prisma.user.findUnique({
          where: { id: currentUserId },
          select: tokenSelect,
        });
        if (u) applyUserToToken(token, u);
      }

      return token;
    },

    async session({ session, token }) {
      const uid = tokenUserId(token);

      session.userId = uid ?? undefined;

      session.user = {
        ...(session.user ?? {}),
        id: uid ?? undefined,
        points: token.points ?? 0,
        handle: token.handle ?? null,
        publicId: token.publicId ?? null,
        walletAddress: token.walletAddress ?? null,
        walletChainId: token.walletChainId ?? null,
      };

      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};