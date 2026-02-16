import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import type { JWT } from "next-auth/jwt";
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

/**
 * publicId должен быть нормальным (и НЕ "tmp")
 * генерим rl_XXXXXXXX (8 символов) и ставим в базу, если пусто или tmp.
 * Защита от гонок: ловим P2002 (unique) и пробуем снова.
 *
 * ВАЖНО для TS: Promise<string> (не nullable)
 */
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

      // Prisma schema обычно string | null, но после update это точно строка
      if (updated.publicId) return updated.publicId;

      // на всякий случай, если схема вдруг nullable и вернула null
      continue;
    } catch (e: any) {
      if (e?.code === "P2002") continue; // collision -> retry
      throw e;
    }
  }

  throw new Error("PUBLIC_ID_GENERATION_FAILED");
}

/**
 * handle закрепляем 1 раз (из X username).
 */
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

  // если не смогли — доклеим суффикс от publicId (теперь 8 символов)
  const pid = current?.publicId ?? (await ensurePublicId(db, userId));

  // ✅ null-guard (решает твою ошибку)
  if (typeof pid !== "string" || pid.length === 0) {
    throw new Error("publicId is missing");
  }

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
 * Начисление очков 1 раз на событие.
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
} as const;

function applyUserToToken(token: any, user: any) {
  token.uid = user.id;
  token.points = user.points ?? 0;

  // ✅ для ссылок /app/u/...
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

  return token;
}

/* -------------------------------------------------------------------------- */
/*                        X (TWITTER) OAUTH2 PROVIDER                          */
/* -------------------------------------------------------------------------- */

// any — чтобы не воевать с типами кастомного провайдера
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
      token: JWT & Record<string, any>;
      account?: any;
      profile?: any;
    }) {
      /* ----------------------------- X (Twitter) ---------------------------- */
      if (account?.provider === "twitter") {
        const twitterId = profile?.id ?? account?.providerAccountId;
        const twitterUser = profile?.username ?? null;
        const twitterName = profile?.name ?? null;
        const twitterImage = profile?.image ?? null;

        if (!twitterId) return token;

        const user = await prisma.$transaction(async (tx) => {
          const u = token.uid
            ? await tx.user.update({
                where: { id: token.uid },
                data: { twitterId, twitterUser, twitterName, twitterImage },
              })
            : await tx.user.upsert({
                where: { twitterId },
                create: { twitterId, twitterUser, twitterName, twitterImage },
                update: { twitterUser, twitterName, twitterImage },
              });

          await ensurePublicId(tx as any, u.id);
          await ensureHandleFromX(tx as any, u.id, twitterUser);
          await awardOnce(tx as any, u.id, "CONNECT_X", 100);

          const fresh = await tx.user.findUnique({
            where: { id: u.id },
            select: tokenSelect,
          });

          return fresh ?? u;
        });

        token.linkError = undefined;
        applyUserToToken(token, user);
        return token;
      }

      /* ------------------------------ Discord -------------------------------- */
      if (account?.provider === "discord") {
        if (!token.uid) {
          token.linkError = "DISCORD_LINK_REQUIRES_X_LOGIN";
          return token;
        }

        const d = pickDiscordProfile(profile);
        const discordId = account.providerAccountId;

        const user = await prisma.$transaction(async (tx) => {
          const u = await tx.user.update({
            where: { id: token.uid },
            data: {
              discordId,
              discordUser: d.username,
              discordName: d.name,
              discordImage: d.image,
            },
          });

          await ensurePublicId(tx as any, u.id);
          await awardOnce(tx as any, u.id, "CONNECT_DISCORD", 100);

          const fresh = await tx.user.findUnique({
            where: { id: u.id },
            select: tokenSelect,
          });

          return fresh ?? u;
        });

        token.linkError = undefined;
        applyUserToToken(token, user);
        return token;
      }

      /* ----------------------- Refresh token from DB ------------------------ */
      if (!account && token.uid) {
        const u = await prisma.user.findUnique({
          where: { id: token.uid },
          select: tokenSelect,
        });

        if (u) applyUserToToken(token, u);
      }

      return token;
    },

    async session({ session, token }: { session: any; token: any }) {
      session.userId = token.uid;
      session.linkError = token.linkError;

      session.user = {
        ...(session.user ?? {}),
        id: token.uid,
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
      };

      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
