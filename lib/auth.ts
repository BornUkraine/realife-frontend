import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { verifyMessage } from "viem";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function randomId(len = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function ensurePublicId(db: typeof prisma, userId: string): Promise<string> {
  const u = await db.user.findUnique({ where: { id: userId }, select: { publicId: true } });
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

function cleanText(v: unknown, max = 500) {
  const s = String(v || "").trim();
  return s ? s.slice(0, max) : null;
}

function cleanEmail(v: unknown) {
  const s = cleanText(v, 320)?.toLowerCase() ?? null;
  if (!s || !s.includes("@")) return null;
  return s;
}

function parseWalletKind(v: unknown): "EXTERNAL" | "EMBEDDED" {
  return String(v || "").trim().toUpperCase() === "EMBEDDED" ? "EMBEDDED" : "EXTERNAL";
}

function parseEmbeddedProvider(v: unknown): "WEB3AUTH" | "OPENFORT" | null {
  const raw = String(v || "").trim().toUpperCase();
  if (raw === "WEB3AUTH") return "WEB3AUTH";
  if (raw === "OPENFORT") return "OPENFORT";
  return null;
}

const tokenSelect = {
  id: true,
  points: true,
  handle: true,
  publicId: true,

  authMethod: true,
  walletKind: true,
  walletAddress: true,
  walletChainId: true,
  embeddedWalletProvider: true,

  googleId: true,
  googleEmail: true,
  googleName: true,
  googleImage: true,

  twitterId: true,
  twitterUser: true,
  twitterName: true,
  twitterImage: true,

  discordId: true,
  discordUser: true,
  discordName: true,
  discordImage: true,
} as const;

type TokenUser = {
  id: string;
  points: number | null;
  handle: string | null;
  publicId: string | null;

  authMethod: "WALLET" | "GOOGLE";
  walletKind: "EXTERNAL" | "EMBEDDED";
  walletAddress: string | null;
  walletChainId: number | null;
  embeddedWalletProvider: "WEB3AUTH" | "OPENFORT" | null;

  googleId: string | null;
  googleEmail: string | null;
  googleName: string | null;
  googleImage: string | null;

  twitterId: string | null;
  twitterUser: string | null;
  twitterName: string | null;
  twitterImage: string | null;

  discordId: string | null;
  discordUser: string | null;
  discordName: string | null;
  discordImage: string | null;
};

function applyUserToToken(token: any, user: TokenUser) {
  token.uid = user.id;
  token.sub = user.id;

  token.points = user.points ?? 0;
  token.handle = user.handle ?? null;
  token.publicId = user.publicId ?? null;

  token.authMethod = user.authMethod ?? "WALLET";
  token.walletKind = user.walletKind ?? "EXTERNAL";
  token.walletAddress = user.walletAddress ?? null;
  token.walletChainId = user.walletChainId ?? null;
  token.embeddedWalletProvider = user.embeddedWalletProvider ?? null;

  token.googleId = user.googleId ?? null;
  token.googleEmail = user.googleEmail ?? null;
  token.googleName = user.googleName ?? null;
  token.googleImage = user.googleImage ?? null;

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
/* AUTH OPTIONS                                                               */
/* -------------------------------------------------------------------------- */

const isProd = process.env.NODE_ENV === "production";
const isDebug = process.env.NEXTAUTH_DEBUG === "true" || !isProd;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  useSecureCookies: isProd,
  debug: isDebug,

  pages: {
    signIn: "/app/profile",
    error: "/app/profile",
  },

  providers: [
    CredentialsProvider({
      id: "wallet",
      name: "Wallet",
      credentials: {
        address: { label: "Address", type: "text" },
        signature: { label: "Signature", type: "text" },
        chainId: { label: "ChainId", type: "text" },

        // Optional metadata for embedded wallet flow.
        // X / Discord are NOT login methods; they stay profile links only.
        walletKind: { label: "WalletKind", type: "text" },
        embeddedWalletProvider: { label: "EmbeddedWalletProvider", type: "text" },
        googleId: { label: "GoogleId", type: "text" },
        googleEmail: { label: "GoogleEmail", type: "text" },
        googleName: { label: "GoogleName", type: "text" },
        googleImage: { label: "GoogleImage", type: "text" },
      },
      async authorize(credentials) {
        const address = String(credentials?.address || "").trim().toLowerCase();
        const signature = String(credentials?.signature || "").trim();
        const chainId = Number(credentials?.chainId || "0");

        if (!address || !address.startsWith("0x") || signature.length < 20) return null;

        const row = await prisma.walletNonce.findUnique({ where: { address } });
        if (!row || row.expiresAt.getTime() < Date.now()) return null;

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

        const walletKind = parseWalletKind((credentials as any)?.walletKind);
        const embeddedWalletProvider = parseEmbeddedProvider((credentials as any)?.embeddedWalletProvider);
        const isEmbedded = walletKind === "EMBEDDED" && Boolean(embeddedWalletProvider);

        const googleId = cleanText((credentials as any)?.googleId, 300);
        const googleEmail = cleanEmail((credentials as any)?.googleEmail);
        const googleName = cleanText((credentials as any)?.googleName, 120);
        const googleImage = cleanText((credentials as any)?.googleImage, 2000);

        const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const commonData: any = {
            walletChainId: Number.isFinite(chainId) ? chainId : null,
            authMethod: isEmbedded ? "GOOGLE" : "WALLET",
            walletKind: isEmbedded ? "EMBEDDED" : "EXTERNAL",
            embeddedWalletProvider: isEmbedded ? embeddedWalletProvider : null,
          };

          // These fields are display/onboarding metadata only.
          // Wallet ownership is proven by the signed nonce above.
          if (isEmbedded) {
            commonData.googleId = googleId;
            commonData.googleEmail = googleEmail;
            commonData.googleName = googleName;
            commonData.googleImage = googleImage;
          }

          const u = await tx.user.upsert({
            where: { walletAddress: address },
            create: {
              walletAddress: address,
              ...commonData,
            },
            update: commonData,
          });

          await ensurePublicId(tx as any, u.id);

          const fresh = await tx.user.findUnique({ where: { id: u.id }, select: tokenSelect });
          return (fresh ?? u) as any;
        });

        return { id: user.id } as any;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      // ✅ session.update() support (если будешь использовать)
      if (trigger === "update" && session) return { ...token, ...session };

      // ✅ При логине кошельком — один раз забираем полные поля в токен
      // wallet provider covers both old external wallets and new embedded wallets.
      if (account?.provider === "wallet" && user?.id) {
        token.uid = user.id;
        token.sub = user.id;

        const u = (await prisma.user.findUnique({
          where: { id: user.id },
          select: tokenSelect,
        })) as TokenUser | null;

        if (u) applyUserToToken(token, u);
        return token;
      }

      // ❌ ВАЖНО: убрали постоянный DB-read на каждом запросе
      return token;
    },

    async session({ session, token }) {
      const uid = (token as any)?.uid || (token as any)?.sub || null;
      (session as any).userId = uid;

      session.user = {
        ...session.user,

        id: uid,
        points: (token as any)?.points,
        handle: (token as any)?.handle,
        publicId: (token as any)?.publicId,

        authMethod: (token as any)?.authMethod,
        walletKind: (token as any)?.walletKind,
        walletAddress: (token as any)?.walletAddress,
        walletChainId: (token as any)?.walletChainId,
        embeddedWalletProvider: (token as any)?.embeddedWalletProvider,

        googleId: (token as any)?.googleId,
        googleEmail: (token as any)?.googleEmail,
        googleName: (token as any)?.googleName,
        googleImage: (token as any)?.googleImage,

        twitterId: (token as any)?.twitterId,
        twitterUser: (token as any)?.twitterUser,
        twitterName: (token as any)?.twitterName,
        twitterImage: (token as any)?.twitterImage,

        discordId: (token as any)?.discordId,
        discordUser: (token as any)?.discordUser,
        discordName: (token as any)?.discordName,
        discordImage: (token as any)?.discordImage,
      } as any;

      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
