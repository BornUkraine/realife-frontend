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
  const image = profile?.image_url ?? profile?.avatar_url ?? profile?.avatar ?? null;
  return { username, name, image };
}

/* -------------------------------------------------------------------------- */
/*                        X (TWITTER) OAUTH2 PROVIDER                          */
/* -------------------------------------------------------------------------- */

// NextAuth v4: для кастомного OAuth2 провайдера оставляем any — норм.
const TwitterOAuthProvider: any = {
  id: "twitter",
  name: "Twitter",
  type: "oauth",
  version: "2.0",

  authorization: {
    url: "https://twitter.com/i/oauth2/authorize",
    params: {
      scope: "users.read tweet.read offline.access",
    },
  },

  token: "https://api.twitter.com/2/oauth2/token",
  userinfo: "https://api.twitter.com/2/users/me",

  clientId: process.env.TWITTER_CLIENT_ID!,
  clientSecret: process.env.TWITTER_CLIENT_SECRET!,

  checks: ["pkce", "state"],

  profile(profile: any) {
    // X v2 users/me -> { data: {...} }
    return {
      id: profile?.data?.id,
      name: profile?.data?.name,
      username: profile?.data?.username,
      image: profile?.data?.profile_image_url,
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
      // ----------------------------- X (Twitter) -----------------------------
      if (account?.provider === "twitter") {
        const twitterId = profile?.id ?? account?.providerAccountId;
        const twitterUser = profile?.username ?? null;
        const twitterName = profile?.name ?? null;
        const twitterImage = profile?.image ?? null;

        if (!twitterId) return token;

        let user;

        if (token.uid) {
          // уже есть пользователь (например залогинен Discord) — привязываем X к нему
          user = await prisma.user.update({
            where: { id: token.uid },
            data: { twitterId, twitterUser, twitterName, twitterImage },
          });
        } else {
          // логин только через X — создаём/обновляем по twitterId
          user = await prisma.user.upsert({
            where: { twitterId },
            create: { twitterId, twitterUser, twitterName, twitterImage },
            update: { twitterUser, twitterName, twitterImage },
          });
        }

        const already = await prisma.pointEvent.findFirst({
          where: { userId: user.id, type: "CONNECT_X" },
        });

        if (!already) {
          await prisma.user.update({
            where: { id: user.id },
            data: { points: { increment: 100 } },
          });
          await prisma.pointEvent.create({
            data: { userId: user.id, type: "CONNECT_X", points: 100 },
          });
        }

        token.uid = user.id;
      }

      // ------------------------------ Discord --------------------------------
      if (account?.provider === "discord") {
        const d = pickDiscordProfile(profile);
        const discordId = account.providerAccountId;

        const user = token.uid
          ? await prisma.user.update({
              where: { id: token.uid },
              data: {
                discordId,
                discordUser: d.username,
                discordName: d.name,
                discordImage: d.image,
              },
            })
          : await prisma.user.upsert({
              where: { discordId },
              create: {
                discordId,
                discordUser: d.username,
                discordName: d.name,
                discordImage: d.image,
              },
              update: {
                discordUser: d.username,
                discordName: d.name,
                discordImage: d.image,
              },
            });

        const already = await prisma.pointEvent.findFirst({
          where: { userId: user.id, type: "CONNECT_DISCORD" },
        });

        if (!already) {
          await prisma.user.update({
            where: { id: user.id },
            data: { points: { increment: 100 } },
          });
          await prisma.pointEvent.create({
            data: { userId: user.id, type: "CONNECT_DISCORD", points: 100 },
          });
        }

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
