import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/*                                   HELPERS                                  */
/* -------------------------------------------------------------------------- */

function pickDiscordProfile(profile: any) {
  const username = profile?.username ?? null;
  const globalName = profile?.global_name ?? null;
  const name = globalName || username;
  const image =
    profile?.image_url ?? profile?.avatar_url ?? profile?.avatar ?? null;

  return { username, name, image };
}

/**
 * Award points only once per event type.
 * Works inside or outside transaction (accepts prisma or tx).
 */
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

/* -------------------------------------------------------------------------- */
/*                        X (TWITTER) OAUTH2 PROVIDER                          */
/* -------------------------------------------------------------------------- */

// Делаем any — чтобы не воевать с типами кастомного провайдера в v4
const TwitterOAuthProvider: any = {
  id: "twitter",
  name: "Twitter",
  type: "oauth",
  version: "2.0",

  authorization: {
    url: "https://twitter.com/i/oauth2/authorize",
    params: {
      // важно: scope разделяется пробелами
      scope: "users.read tweet.read offline.access",
    },
  },

  token: "https://api.twitter.com/2/oauth2/token",

  // ✅ Самый надёжный способ: user.fields прямо в URL
  // (иначе часто приходят null name/username/image)
  userinfo:
    "https://api.twitter.com/2/users/me?user.fields=id,name,username,profile_image_url",

  clientId: process.env.TWITTER_CLIENT_ID!,
  clientSecret: process.env.TWITTER_CLIENT_SECRET!,

  checks: ["pkce", "state"],

  profile(raw: any) {
    // X v2 users/me -> { data: {...} }
    const d = raw?.data ?? {};
    return {
      id: d?.id,
      name: d?.name ?? null,
      username: d?.username ?? null,
      image: d?.profile_image_url ?? null,
      // сохраним сырой ответ для отладки, если нужно
      __raw: raw,
    };
  },
};

/* -------------------------------------------------------------------------- */
/*                               AUTH OPTIONS                                 */
/* -------------------------------------------------------------------------- */

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  debug: process.env.NEXTAUTH_DEBUG === "true",

  providers: [
    TwitterOAuthProvider,
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async jwt({
      token,
      account,
      profile,
    }: {
      token: JWT & { uid?: string };
      account?: any;
      profile?: any;
    }) {
      /* ----------------------------- X (Twitter) ---------------------------- */
      if (account?.provider === "twitter") {
        // 🔎 логируем сырой ответ X (только в debug)
        if (process.env.NEXTAUTH_DEBUG === "true") {
          try {
            // profile может быть тем, что вернул profile() выше
            console.log("X_PROFILE_MAPPED", {
              id: profile?.id,
              username: profile?.username,
              name: profile?.name,
              image: profile?.image,
            });
            console.log("X_PROFILE_RAW", (profile as any)?.__raw ?? profile);
          } catch (e) {
            console.log("X_LOG_ERROR", e);
          }
        }

        const twitterId = profile?.id ?? account?.providerAccountId;
        const twitterUser = profile?.username ?? null;
        const twitterName = profile?.name ?? null;
        const twitterImage = profile?.image ?? null;

        if (!twitterId) return token;

        const user = await prisma.$transaction(async (tx) => {
          let u;

          // ✅ Если уже есть uid (например залогинен Discord) — привязываем X к текущему юзеру
          if (token.uid) {
            u = await tx.user.update({
              where: { id: token.uid },
              data: { twitterId, twitterUser, twitterName, twitterImage },
            });
          } else {
            // иначе логин только через X — создаём/обновляем по twitterId
            u = await tx.user.upsert({
              where: { twitterId },
              create: { twitterId, twitterUser, twitterName, twitterImage },
              update: { twitterUser, twitterName, twitterImage },
            });
          }

          // ✅ +100 только один раз
          await awardOnce(tx as any, u.id, "CONNECT_X", 100);
          return u;
        });

        token.uid = user.id;
      }

      /* ------------------------------ Discord -------------------------------- */
      if (account?.provider === "discord") {
        // ✅ ВАЖНО: Discord делаем ТОЛЬКО как linking к уже существующей X-сессии.
        // Это гарантирует, что "Discord не снесёт X" и не создаст другого юзера.
        if (!token.uid) {
          console.error("DISCORD_LINK_BLOCKED: no token.uid (session not found)");
          throw new Error("DISCORD_LINK_REQUIRES_X_LOGIN");
        }

        const d = pickDiscordProfile(profile);
        const discordId = account.providerAccountId;

        const user = await prisma.$transaction(async (tx) => {
          const u = await tx.user.update({
            where: { id: token.uid! },
            data: {
              discordId,
              discordUser: d.username,
              discordName: d.name,
              discordImage: d.image,
            },
          });

          // ✅ +100 только один раз
          await awardOnce(tx as any, u.id, "CONNECT_DISCORD", 100);
          return u;
        });

        token.uid = user.id;
      }

      return token;
    },

    async session({
      session,
      token,
    }: {
      session: Session & { userId?: string };
      token: JWT & { uid?: string };
    }) {
      session.userId = token.uid;
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
