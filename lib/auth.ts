import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/*                                   HELPERS                                  */
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

async function ensurePublicId(db: typeof prisma, userId: string) {
  const u = await db.user.findUnique({ where: { id: userId }, select: { publicId: true } });
  if (u?.publicId) return u.publicId;

  for (let i = 0; i < 10; i++) {
    const pid = `rl_${randomId(6)}`;
    const taken = await db.user.findUnique({ where: { publicId: pid }, select: { id: true } });
    if (!taken) {
      await db.user.update({ where: { id: userId }, data: { publicId: pid } });
      return pid;
    }
  }
  throw new Error("PUBLIC_ID_GENERATION_FAILED");
}

async function ensureHandleFromX(db: typeof prisma, userId: string, twitterUser?: string | null) {
  if (!twitterUser) return;

  const current = await db.user.findUnique({ where: { id: userId }, select: { handle: true, publicId: true } });
  if (current?.handle) return; // закрепляем 1 раз

  const base = slugifyHandle(twitterUser);
  if (!base) return;

  // пытаемся base, base_2, base_3...
  for (let i = 0; i < 25; i++) {
    const h = i === 0 ? base : `${base}_${i + 1}`;
    const taken = await db.user.findUnique({ where: { handle: h }, select: { id: true } });
    if (!taken) {
      await db.user.update({ where: { id: userId }, data: { handle: h } });
      return;
    }
  }

  // fallback: base + хвост publicId
  const pid = current?.publicId ?? (await ensurePublicId(db, userId));
  await db.user.update({
    where: { id: userId },
    data: { handle: `${base}_${pid.slice(-4).toLowerCase()}` },
  });
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
  userinfo: "https://api.twitter.com/2/users/me?user.fields=id,name,username,profile_image_url",

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
      token: JWT & { uid?: string; linkError?: string };
      account?: any;
      profile?: any;
    }) {
      /* ----------------------------- X (Twitter) ---------------------------- */
      if (account?.provider === "twitter") {
        if (process.env.NEXTAUTH_DEBUG === "true") {
          try {
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

          // ✅ Если уже есть uid — привязываем X к текущему юзеру
          if (token.uid) {
            u = await tx.user.update({
              where: { id: token.uid },
              data: { twitterId, twitterUser, twitterName, twitterImage },
            });
          } else {
            // иначе логин только через X — создаём/обновляем по twitterId
            u = await tx.user.upsert({
              where: { twitterId },
              create: {
                twitterId,
                twitterUser,
                twitterName,
                twitterImage,
                // publicId создадим ниже (ensurePublicId)
                publicId: "tmp", // временно, заменим сразу
              },
              update: { twitterUser, twitterName, twitterImage },
            });

            // если это был create с "tmp" — надо заменить на нормальный publicId
            // (если upsert попал в update, publicId уже есть/останется)
            if (u.publicId === "tmp") {
              const pid = await ensurePublicId(tx as any, u.id);
              u = await tx.user.update({ where: { id: u.id }, data: { publicId: pid } });
            }
          }

          // гарантируем publicId (на всякий случай)
          await ensurePublicId(tx as any, u.id);

          // ✅ auto-handle из X (ставим один раз)
          await ensureHandleFromX(tx as any, u.id, twitterUser);

          // ✅ +100 только один раз
          await awardOnce(tx as any, u.id, "CONNECT_X", 100);
          return u;
        });

        token.uid = user.id;
        token.linkError = undefined; // очистим ошибки linking
      }

      /* ------------------------------ Discord -------------------------------- */
      if (account?.provider === "discord") {
        // ✅ Discord — только linking к существующему профилю
        if (!token.uid) {
          // НЕ бросаем ошибку (иначе будет error=Callback)
          token.linkError = "DISCORD_LINK_REQUIRES_X_LOGIN";
          return token;
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

          await ensurePublicId(tx as any, u.id);

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
      session: Session & { userId?: string; linkError?: string };
      token: JWT & { uid?: string; linkError?: string };
    }) {
      session.userId = token.uid;
      session.linkError = token.linkError;
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
