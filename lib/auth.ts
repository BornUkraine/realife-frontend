// @ts-nocheck
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
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

async function ensureHandleFromX(db: typeof prisma, userId: string, twitterUser?: string | null) {
  if (!twitterUser) return;

  const current = await db.user.findUnique({
    where: { id: userId },
    select: { handle: true, publicId: true },
  });

  if (current?.handle) return; // У юзера уже есть handle, не трогаем

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

  // fallback
  const pid = current?.publicId ?? (await ensurePublicId(db, userId));
  if (pid) {
    await db.user.update({
      where: { id: userId },
      data: { handle: `${base}_${pid.slice(-4).toLowerCase()}` },
    });
  }
}

async function awardOnce(
  db: typeof prisma,
  userId: string,
  type: "DAILY" | "CONNECT_X",
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
  twitterId: true,
  twitterUser: true,
  twitterName: true,
  twitterImage: true,
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

  token.twitterId = user.twitterId ?? null;
  token.twitterUser = user.twitterUser ?? null;
  token.twitterName = user.twitterName ?? null;
  token.twitterImage = user.twitterImage ?? null;

  token.walletAddress = user.walletAddress ?? null;
  token.walletChainId = user.walletChainId ?? null;

  return token;
}

/* -------------------------------------------------------------------------- */
/* PROVIDERS                                                                  */
/* -------------------------------------------------------------------------- */

const TwitterOAuthProvider: any = {
  id: "twitter",
  name: "Twitter",
  type: "oauth",
  version: "2.0",
  authorization: {
    url: "https://twitter.com/i/oauth2/authorize",
    params: { scope: "users.read tweet.read offline.access" },
  },
  token: "https://api.twitter.com/2/oauth2/token",
  userinfo: "https://api.twitter.com/2/users/me?user.fields=id,name,username,profile_image_url",
  clientId: process.env.TWITTER_CLIENT_ID!,
  clientSecret: process.env.TWITTER_CLIENT_SECRET!,
  checks: ["pkce", "state"],
  profile(raw: any) {
    const d = raw?.data ?? {};
    const img = d?.profile_image_url ?? null;
    const bigger = typeof img === "string" ? img.replace("_normal", "") : img; // Получаем большую аватарку
    return {
      id: d?.id,
      name: d?.name ?? null,
      username: d?.username ?? null,
      image: bigger ?? null,
      __raw: raw,
    };
  },
};

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
        // 🔥 КРИТИЧНО ВАЖНО: Разрешаем отправлять куки при кросс-доменных запросах (с X на твой сайт)
        sameSite: "none", 
        path: "/",
        // 🔥 КРИТИЧНО ВАЖНО: При sameSite: "none", secure должно быть true (работает только на https)
        secure: true,
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

    TwitterOAuthProvider,
  ],

  callbacks: {
    async jwt({ token, user, account, profile, trigger, session }) {
      if (trigger === "update" && session) {
        return { ...token, ...session };
      }

      const currentUserId = tokenUserId(token);

      /* ------------------------------ WALLET LOGIN ------------------------------ */
      if (account?.provider === "wallet" && user?.id) {
        token.linkError = undefined;
        token.sub = user.id;
        token.uid = user.id;

        const u = await prisma.user.findUnique({ where: { id: user.id }, select: tokenSelect });
        if (u) applyUserToToken(token, u);

        return token;
      }

      /* ------------------------------ X (TWITTER) ------------------------------ */
      if (account?.provider === "twitter") {
        // 🔥 ПРАВИЛО 1: НЕТ КОШЕЛЬКА = НЕТ X
        if (!currentUserId) {
          token.linkError = "NO_SERVER_SESSION";
          return token;
        }

        const d = profile as any;
        const twitterId = d?.data?.id ?? d?.id ?? account?.providerAccountId;
        const twitterUser = d?.data?.username ?? d?.username ?? null;
        const twitterName = d?.data?.name ?? d?.name ?? null;
        const rawImg = d?.data?.profile_image_url ?? d?.profile_image_url;
        const twitterImage = typeof rawImg === "string" ? rawImg.replace("_normal", "") : rawImg;

        if (!twitterId) return token;

        try {
          const updated = await prisma.$transaction(async (tx) => {
            // 🔥 ПРАВИЛО 2: ЗАЩИТА ОТ ДУБЛИКАТОВ
            const existingLink = await tx.user.findUnique({
              where: { twitterId },
              select: { id: true },
            });

            if (existingLink && existingLink.id !== currentUserId) {
              throw new Error("TWITTER_ALREADY_LINKED");
            }

            // 🔥 ПРАВИЛО 3: ТОЛЬКО ОБНОВЛЕНИЕ ТЕКУЩЕГО ПРОФИЛЯ
            return await tx.user.update({
              where: { id: currentUserId },
              data: { twitterId, twitterUser, twitterName, twitterImage },
            });
          });

          await ensureHandleFromX(prisma, updated.id, twitterUser);
          await awardOnce(prisma, updated.id, "CONNECT_X", 100);

          const fresh = await prisma.user.findUnique({
            where: { id: updated.id },
            select: tokenSelect,
          });

          token.linkError = undefined;
          applyUserToToken(token, fresh ?? updated);
        } catch (e: any) {
          token.linkError = e?.message === "TWITTER_ALREADY_LINKED" ? "TWITTER_ALREADY_LINKED" : "TWITTER_LINK_FAILED";
        }

        return token;
      }

      /* ----------------------- REFRESH TOKEN FROM DB ----------------------- */
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
      session.linkError = token.linkError;

      session.user = {
        ...(session.user ?? {}),
        id: uid ?? undefined,
        points: token.points ?? 0,
        handle: token.handle ?? null,
        publicId: token.publicId ?? null,
        
        twitterId: token.twitterId ?? null,
        twitterUser: token.twitterUser ?? null,
        twitterName: token.twitterName ?? null,
        twitterImage: token.twitterImage ?? null,

        walletAddress: token.walletAddress ?? null,
        walletChainId: token.walletChainId ?? null,
      };

      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};