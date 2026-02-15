import NextAuth, { type NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import TwitterProvider from "next-auth/providers/twitter";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

function pickTwitterProfile(profile: any) {
  const username = profile?.data?.username ?? profile?.username ?? null;
  const name = profile?.data?.name ?? profile?.name ?? null;
  const image =
    profile?.data?.profile_image_url ??
    profile?.profile_image_url ??
    profile?.picture ??
    null;

  return { username, name, image };
}

function pickDiscordProfile(profile: any) {
  const username = profile?.username ?? null;
  const globalName = profile?.global_name ?? null;
  const name = globalName || username;
  const image = profile?.image_url ?? null;

  return { username, name, image };
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },

  providers: [
    TwitterProvider({
      // В UI будет "Twitter", не Legacy (если реально этот конфиг подхватился)
      name: "Twitter",
      clientId: process.env.TWITTER_CLIENT_ID ?? "",
      clientSecret: process.env.TWITTER_CLIENT_SECRET ?? "",
      version: "2",

      // Важно: OAuth2 authorize endpoint (X может редиректить, но стартуем правильно)
      authorization: {
        url: "https://x.com/i/oauth2/authorize",
        params: {
          scope: "users.read tweet.read offline.access",
        },
      },

      // Для X обычно безопаснее так:
      checks: ["pkce", "state"],
      idToken: false,
    }),

    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
    }),
  ],

  callbacks: {
    async jwt({
      token,
      account,
      profile,
    }: {
      token: JWT;
      account?: any;
      profile?: any;
    }) {
      if (account?.provider === "twitter") {
        const t = pickTwitterProfile(profile);
        const twitterId = account.providerAccountId;

        const user = await prisma.user.upsert({
          where: { twitterId },
          create: {
            twitterId,
            twitterUser: t.username,
            twitterName: t.name,
            twitterImage: t.image,
          },
          update: {
            twitterUser: t.username,
            twitterName: t.name,
            twitterImage: t.image,
          },
        });

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

      if (account?.provider === "discord") {
        const d = pickDiscordProfile(profile);
        const discordId = account.providerAccountId;

        if (token.uid) {
          const user = await prisma.user.update({
            where: { id: token.uid as string },
            data: {
              discordId,
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
        } else {
          const user = await prisma.user.upsert({
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
      }

      return token;
    },

    async session({ session, token }: { session: Session & any; token: JWT }) {
      session.userId = token.uid;
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,

  // (опционально) если хочешь чтобы прод-домены строго совпадали
  // trustHost: true,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
