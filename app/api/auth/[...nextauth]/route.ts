import NextAuth, { type NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import type { OAuthConfig } from "next-auth/providers/oauth";
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
    profile?.image_url ??
    profile?.avatar_url ??
    profile?.avatar ??
    null;

  return { username, name, image };
}

/* -------------------------------------------------------------------------- */
/*                        X (TWITTER) OAUTH2 PROVIDER                          */
/* -------------------------------------------------------------------------- */

const TwitterOAuthProvider: OAuthConfig<any> = {
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

  profile(profile) {
    return {
      id: profile.data.id,
      name: profile.data.name,
      username: profile.data.username,
      image: profile.data.profile_image_url,
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
        const twitterId = profile.id;

        const user = await prisma.user.upsert({
          where: { twitterId },
          create: {
            twitterId,
            twitterUser: profile.username,
            twitterName: profile.name,
            twitterImage: profile.image,
          },
          update: {
            twitterUser: profile.username,
            twitterName: profile.name,
            twitterImage: profile.image,
          },
        });

        token.uid = user.id;
      }

      /* ------------------------------ Discord -------------------------------- */
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

/* -------------------------------------------------------------------------- */
/*                                   HANDLER                                  */
/* -------------------------------------------------------------------------- */

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
