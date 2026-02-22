// @ts-nocheck
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import TwitterProvider from "next-auth/providers/twitter";
import { prisma } from "@/lib/prisma";
import { verifyMessage } from "viem";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function slugifyHandle(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}

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

async function ensureHandleFromX(db: typeof prisma, userId: string, twitterUser?: string | null) {
  if (!twitterUser) return;
  const current = await db.user.findUnique({
    where: { id: userId },
    select: { handle: true, publicId: true },
  });
  if (current?.handle) return;

  const base = slugifyHandle(twitterUser);
  if (!base) return;

  for (let i = 0; i < 25; i++) {
    const h = i === 0 ? base : `${base}_${i + 1}`;
    const taken = await db.user.findUnique({ where: { handle: h }, select: { id: true } });
    if (!taken) {
      await db.user.update({ where: { id: userId }, data: { handle: h } });
      return;
    }
  }
}

async function awardOnce(db: typeof prisma, userId: string, type: "DAILY" | "CONNECT_X", points: number) {
  const already = await db.pointEvent.findFirst({ where: { userId, type }, select: { id: true } });
  if (already) return false;
  await db.user.update({ where: { id: userId }, data: { points: { increment: points } } });
  await db.pointEvent.create({ data: { userId, type, points } });
  return true;
}

const tokenSelect = {
  id: true,
  points: true,
  handle: true,
  publicId: true,
  twitterId: true,
  twitterUser: true,
  twitterName: true,
  twitterImage: true,
  walletAddress: true,
  walletChainId: true,
} as const;

function applyUserToToken(token: any, user: any) {
  token.sub = user.id;
  token.uid = user.id;
  token.points = user.points ?? 0;
  token.handle = user.handle ?? null;
  token.publicId = user.publicId ?? null;
  token.twitterId = user.twitterId ?? null;
  token.twitterUser = user.twitterUser ?? null;
  token.twitterName = user.twitterName ?? null;
  token.twitterImage = user.twitterImage ?? null;
  token.walletAddress = user.walletAddress ?? null;
  token.walletChainId = user.walletChainId ?? null;
  return token;
}

/* -------------------------------------------------------------------------- */
/* AUTH OPTIONS                                                               */
/* -------------------------------------------------------------------------- */

const isProd = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  trustHost: true,
  useSecureCookies: isProd,

  // ✅ для отладки
  debug: true,

  // ✅ У ТЕБЯ ROUTE = /profile (а не /app/profile)
  pages: {
    signIn: "/profile",
    error: "/profile",
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

        const message = `Realife wallet verification\nAddress: ${address}\nNonce: ${row.nonce}\nURI: ${process.env.NEXTAUTH_URL ?? ""}`;
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
            create: { walletAddress: address, walletChainId: Number.isFinite(chainId) ? chainId : null },
            update: { walletChainId: Number.isFinite(chainId) ? chainId : null },
          });
          await ensurePublicId(tx as any, u.id);
          const fresh = await tx.user.findUnique({ where: { id: u.id }, select: tokenSelect });
          return fresh ?? u;
        });

        return { id: user.id } as any;
      },
    }),

    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "2.0",
      authorization: { params: { scope: "users.read tweet.read offline.access" } },

      // ✅ ВАЖНО: здесь мы кладём twitterUser/image в "user" (а не в profile)
      profile(profile) {
        const d = profile?.data ?? {};
        const img = d?.profile_image_url ?? null;
        return {
          id: d?.id,
          name: d?.name ?? null,
          image: typeof img === "string" ? img.replace("_normal", "") : img,
          twitterUser: d?.username ?? null,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, profile, trigger, session }) {
      if (trigger === "update" && session) return { ...token, ...session };

      // ✅ dbUserId берём ПРЕЖДЕ ВСЕГО из token.uid (wallet-first)
      const dbUserId = token?.uid || user?.id;

      /* ------------------------------ WALLET LOGIN ------------------------------ */
      if (account?.provider === "wallet" && user?.id) {
        token.uid = user.id;
        const u = await prisma.user.findUnique({ where: { id: user.id }, select: tokenSelect });
        if (u) applyUserToToken(token, u);
        return token;
      }

      /* ------------------------------ X (TWITTER) ------------------------------ */
      if (account?.provider === "twitter") {
        // ✅ критично: в момент callback обязательно должен быть token.uid (wallet session)
        if (!token?.uid) {
          console.error("❌ Wallet session missing (token.uid). OAuth callback пришёл без твоей wallet-сессии.");
          throw new Error("WalletSessionLost");
        }

        const twitterId = account.providerAccountId;

        // ✅ БЕРЁМ ДАННЫЕ ИЗ user (это результат provider.profile())
        const twitterUser = (user as any)?.twitterUser ?? null;
        const twitterName = user?.name ?? null;
        const twitterImage = (user as any)?.image ?? null;

        try {
          const updated = await prisma.$transaction(async (tx) => {
            const targetUser = await tx.user.findUnique({ where: { id: token.uid } });
            if (!targetUser) throw new Error("UserNotFoundInDB");

            const existingLink = await tx.user.findUnique({ where: { twitterId }, select: { id: true } });
            if (existingLink && existingLink.id !== token.uid) throw new Error("TwitterAlreadyLinked");

            // ✅ всегда возвращаем select: tokenSelect
            return await tx.user.update({
              where: { id: token.uid },
              data: { twitterId, twitterUser, twitterName, twitterImage },
              select: tokenSelect,
            });
          });

          await ensureHandleFromX(prisma, updated.id, twitterUser);
          await awardOnce(prisma, updated.id, "CONNECT_X", 100);

          token.uid = updated.id;
          applyUserToToken(token, updated);
        } catch (e: any) {
          console.error("❌ TWITTER LINK DB ERROR:", e.message);
          throw new Error(e.message || "TwitterLinkFailed");
        }
        return token;
      }

      /* ----------------------- REFRESH TOKEN FROM DB ----------------------- */
      if (!account && dbUserId) {
        const u = await prisma.user.findUnique({ where: { id: dbUserId }, select: tokenSelect });
        if (u) applyUserToToken(token, u);
      }

      return token;
    },

    async session({ session, token }) {
      (session as any).userId = token.uid;

      session.user = {
        ...session.user,
        id: token.uid,
        points: token.points,
        handle: token.handle,
        twitterUser: token.twitterUser,
        twitterImage: token.twitterImage,
        walletAddress: token.walletAddress,
      } as any;

      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};