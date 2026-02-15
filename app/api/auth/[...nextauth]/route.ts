import NextAuth, { type NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import TwitterProvider from "next-auth/providers/twitter";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

/* ---------------- helpers ---------------- */

function pickTwitterProfile(profile: any) {
  return {
    username: profile?.data?.username ?? null,
    name: profile?.data?.name ?? null,
    image: profile?.data?.profile_image_url ?? null,
  };
}

function pickDiscordProfile(profile: any) {
  const username = profile?.username ?? null;
  const name = profile?.global_name || username;
  const image = profile?.image_url ?? null;
  return { username, name, image };
}

/* ---------------- auth ---------------- */

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,

  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "2",

      authorization: {
        params: {
          scope: "users.read tweet.read offline.access",
        },
      },

      checks: ["pkce", "state"],

      client: {
        token_endpoint_auth_method: "client_secret_post",
      },
    }),

    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async jwt({ token, account, profile }) {
      /* ---------- Twitter ---------- */
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
            data: {
              userId: user.id,
              type: "CONNECT_X",
              points: 100,
            },
          });
        }

        token.uid = user.id;
      }

      /* ---------- Discord ---------- */
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
            data: {
              userId: user.id,
              type: "CONNECT_DISCORD",
              points: 100,
            },
          });
        }

        token.uid = user.id;
      }

      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      session.userId = token.uid;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
