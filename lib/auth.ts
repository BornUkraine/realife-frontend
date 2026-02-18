import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
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
      if (e?.code === "P2002") continue;
      throw e;
    }
  }
  throw new Error("PUBLIC_ID_GENERATION_FAILED");
}

async function ensureHandleFromX(
  db: typeof prisma,
  userId: string,
  twitterUser?: string | null
) {
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

  // Если не смогли занять handle, пробуем добавить suffix
  const pid = current?.publicId ?? (await ensurePublicId(db, userId));
  if (pid) {
      await db.user.update({
        where: { id: userId },
        data: { handle: `${base}_${pid.slice(-4).toLowerCase()}` },
      });
  }
}

function discordAvatarUrl(profile: any) {
  const id = profile?.id;
  const avatar = profile?.avatar;
  if (id && avatar) return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=256`;
  return null;
}

function pickDiscordProfile(profile: any) {
  const username = profile?.username ?? null;
  const globalName = profile?.global_name ?? null;
  const name = globalName || username;
  const image = discordAvatarUrl(profile) ?? profile?.image_url ?? profile?.avatar_url ?? null;
  return { username, name, image };
}

async function awardOnce(
  db: typeof prisma,
  userId: string,
  type: "CONNECT_X" | "CONNECT_DISCORD" | "DAILY",
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
  discordId: true,
  discordUser: true,
  discordName: true,
  discordImage: true,
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
  token.discordId = user.discordId ?? null;
  token.discordUser = user.discordUser ?? null;
  token.discordName = user.discordName ?? null;
  token.discordImage = user.discordImage ?? null;
  token.walletAddress = user.walletAddress ?? null;
  token.walletChainId = user.walletChainId ?? null;
  return token;
}

/* -------------------------------------------------------------------------- */
/* CONFIGURATION                                                              */
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
    const bigger = typeof img === "string" ? img.replace("_normal", "") : img;
    return {
      id: d?.id,
      name: d?.name ?? null,
      username: d?.username ?? null,
      image: bigger ?? null,
      __raw: raw,
    };
  },
};

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },

  // ✅ Это решит проблему со сбросом сессии на Railway
  // @ts-ignore
  trustHost: true,

  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax', // Lax обязателен для работы редиректов OAuth
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },

  debug: process.env.NODE_ENV !== "production",

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

    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async jwt({ token, account, profile, trigger, session }) {
      if (trigger === "update" && session) {
        return { ...token, ...session };
      }

      if (account?.provider === "wallet") {
        token.linkError = undefined;
      }

      // Получаем ID текущего юзера
      const currentUserId = tokenUserId(token);
      
      // 🛠 DEBUG LOG: Проверяем сессию при возврате с OAuth
      if (account) {
        console.log(`[AUTH] Provider: ${account.provider}, CurrentUserID: ${currentUserId}`);
      }

      /* ----------------------------- X (Twitter) ---------------------------- */
      if (account?.provider === "twitter") {
        const d = profile as any;
        const twitterId = d?.data?.id ?? d?.id ?? account?.providerAccountId;
        
        const twitterUser = d?.data?.username ?? d?.username ?? null;
        const twitterName = d?.data?.name ?? d?.name ?? null;
        const rawImg = d?.data?.profile_image_url ?? d?.profile_image_url;
        const twitterImage = typeof rawImg === "string" ? rawImg.replace("_normal", "") : rawImg;

        if (!twitterId) return token;

        try {
          const user = await prisma.$transaction(async (tx) => {
            // А. ПРИВЯЗКА (LINK) — если мы уже залогинены
            if (currentUserId) {
              const existingLink = await tx.user.findUnique({
                where: { twitterId },
                select: { id: true },
              });

              if (existingLink && existingLink.id !== currentUserId) {
                throw new Error("TWITTER_ALREADY_LINKED");
              }

              return await tx.user.update({
                where: { id: currentUserId },
                data: { twitterId, twitterUser, twitterName, twitterImage },
              });
            }

            // Б. ВХОД (Login/Register) — если сессии нет
            console.log("[AUTH] Creating/Updating user via Twitter (Session missing or new login)");
            return await tx.user.upsert({
              where: { twitterId },
              create: { twitterId, twitterUser, twitterName, twitterImage },
              update: { twitterUser, twitterName, twitterImage },
            });
          });

          await ensurePublicId(prisma, user.id);
          await ensureHandleFromX(prisma, user.id, twitterUser);
          
          if (currentUserId) {
            await awardOnce(prisma, user.id, "CONNECT_X", 100);
          }

          const fresh = await prisma.user.findUnique({
            where: { id: user.id },
            select: tokenSelect,
          });

          token.linkError = undefined;
          applyUserToToken(token, fresh ?? user);

        } catch (e: any) {
          console.error("Twitter Auth Error:", e);
          if (e.message === "TWITTER_ALREADY_LINKED" || e.code === "P2002") {
            token.linkError = "TWITTER_ALREADY_LINKED";
          } else {
            token.linkError = "TWITTER_LINK_FAILED";
          }
        }
        return token;
      }

      /* ------------------------------ Discord -------------------------------- */
      if (account?.provider === "discord") {
        const discordId = account.providerAccountId;
        
        // Пытаемся найти юзера (через сессию или по TwitterId в токене)
        let targetUid = currentUserId;
        if (!targetUid && token.twitterId) {
             const u = await prisma.user.findUnique({ where: { twitterId: token.twitterId as string }});
             if (u) targetUid = u.id;
        }

        if (!targetUid) {
          token.linkError = "DISCORD_LINK_REQUIRES_LOGIN";
          return token;
        }

        const d = pickDiscordProfile(profile);

        try {
          const user = await prisma.$transaction(async (tx) => {
            const existingLink = await tx.user.findUnique({
              where: { discordId },
              select: { id: true }
            });

            if (existingLink && existingLink.id !== targetUid) {
              throw new Error("DISCORD_ALREADY_LINKED");
            }

            return await tx.user.update({
              where: { id: targetUid! },
              data: {
                discordId,
                discordUser: d.username,
                discordName: d.name,
                discordImage: d.image,
              },
            });
          });

          await ensurePublicId(prisma, user.id);
          await awardOnce(prisma, user.id, "CONNECT_DISCORD", 100);

          const fresh = await prisma.user.findUnique({
            where: { id: user.id },
            select: tokenSelect,
          });

          token.linkError = undefined;
          applyUserToToken(token, fresh ?? user);

        } catch (e: any) {
          console.error("Discord Link Error:", e);
          if (e.message === "DISCORD_ALREADY_LINKED" || e.code === "P2002") {
            token.linkError = "DISCORD_ALREADY_LINKED";
          } else {
            token.linkError = "DISCORD_LINK_FAILED";
          }
        }
        return token;
      }

      /* ----------------------- Refresh token from DB ------------------------ */
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
        discordId: token.discordId ?? null,
        discordUser: token.discordUser ?? null,
        discordName: token.discordName ?? null,
        discordImage: token.discordImage ?? null,
        walletAddress: token.walletAddress ?? null,
        walletChainId: token.walletChainId ?? null,
      };
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};