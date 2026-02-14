import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import TwitterProvider from "next-auth/providers/twitter";
import { prisma } from "@/lib/prisma";

function pickTwitterProfile(profile: any) {
  // next-auth twitter profile shape can vary by version
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

export const authOptions = {
  session: { strategy: "jwt" },
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "2", // важно для X
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }: any) {
      // create/find user by provider id
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

        // one-time points for connect X
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

        // если уже есть uid (юзер заходил через X) — прилинкуем discord к нему
        if (token?.uid) {
          const user = await prisma.user.update({
            where: { id: token.uid },
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
          // если вошёл первым Discord — создаём user
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
    async session({ session, token }: any) {
      session.userId = token.uid;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions as any);
export { handler as GET, handler as POST };
