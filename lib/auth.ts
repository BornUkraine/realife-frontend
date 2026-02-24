import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { verifyMessage } from "viem";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function randomId(len = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function ensurePublicId(db: typeof prisma, userId: string): Promise<string> {
  const u = await db.user.findUnique({ where: { id: userId }, select: { publicId: true } });
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
      if (e?.code === "P2002") continue;
      throw e;
    }
  }
  throw new Error("PUBLIC_ID_GENERATION_FAILED");
}

const tokenSelect = {
  id: true,
  points: true,
  handle: true,
  publicId: true,

  walletAddress: true,
  walletChainId: true,

  twitterId: true,
  twitterUser: true,
  twitterName: true,
  twitterImage: true,

  discordId: true,
  discordUser: true,
  discordName: true,
  discordImage: true,
} as const;

type TokenUser = {
  id: string;
  points: number | null;
  handle: string | null;
  publicId: string | null;

  walletAddress: string | null;
  walletChainId: number | null;

  twitterId: string | null;
  twitterUser: string | null;
  twitterName: string | null;
  twitterImage: string | null;

  discordId: string | null;
  discordUser: string | null;
  discordName: string | null;
  discordImage: string | null;
};

function applyUserToToken(token: any, user: TokenUser) {
  token.uid = user.id;
  token.sub = user.id;

  token.points = user.points ?? 0;
  token.handle = user.handle ?? null;
  token.publicId = user.publicId ?? null;

  token.walletAddress = user.walletAddress ?? null;
  token.walletChainId = user.walletChainId ?? null;

  token.twitterId = user.twitterId ?? null;
  token.twitterUser = user.twitterUser ?? null;
  token.twitterName = user.twitterName ?? null;
  token.twitterImage = user.twitterImage ?? null;

  token.discordId = user.discordId ?? null;
  token.discordUser = user.discordUser ?? null;
  token.discordName = user.discordName ?? null;
  token.discordImage = user.discordImage ?? null;

  return token;
}

/* -------------------------------------------------------------------------- */
/* AUTH OPTIONS                                                               */
/* -------------------------------------------------------------------------- */

const isProd = process.env.NODE_ENV === "production";
const isDebug = process.env.NEXTAUTH_DEBUG === "true" || !isProd;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  useSecureCookies: isProd,
  debug: isDebug,

  pages: {
    signIn: "/app/profile",
    error: "/app/profile",
  },

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
        if (!row || row.expiresAt.getTime() < Date.now()) return null;

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

        const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
          return (fresh ?? u) as any;
        });

        return { id: user.id } as any;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      // ✅ session.update() support (если будешь использовать)
      if (trigger === "update" && session) return { ...token, ...session };

      // ✅ При логине кошельком — один раз забираем полные поля в токен
      if (account?.provider === "wallet" && user?.id) {
        token.uid = user.id;
        token.sub = user.id;

        const u = (await prisma.user.findUnique({
          where: { id: user.id },
          select: tokenSelect,
        })) as TokenUser | null;

        if (u) applyUserToToken(token, u);
        return token;
      }

      // ❌ ВАЖНО: убрали постоянный DB-read на каждом запросе
      // Если захочешь обновлять points/avatars после линковки — делай:
      // await fetch("/api/me") на клиенте, а токен можно обновлять через session.update() по желанию.

      return token;
    },

    async session({ session, token }) {
      const uid = (token as any)?.uid || (token as any)?.sub || null;
      (session as any).userId = uid;

      session.user = {
        ...session.user,

        id: uid,
        points: (token as any)?.points,
        handle: (token as any)?.handle,
        publicId: (token as any)?.publicId,

        walletAddress: (token as any)?.walletAddress,
        walletChainId: (token as any)?.walletChainId,

        twitterId: (token as any)?.twitterId,
        twitterUser: (token as any)?.twitterUser,
        twitterName: (token as any)?.twitterName,
        twitterImage: (token as any)?.twitterImage,

        discordId: (token as any)?.discordId,
        discordUser: (token as any)?.discordUser,
        discordName: (token as any)?.discordName,
        discordImage: (token as any)?.discordImage,
      } as any;

      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};