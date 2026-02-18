import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    userId?: string;
    linkError?: string;

    user?: DefaultSession["user"] & {
      id?: string;
      points?: number;

      // Public profile
      handle?: string | null;
      publicId?: string | null;

      // (опционально) удобные поля из /api/me
      publicUrl?: string | null;
      displayName?: string | null;
      mainAvatar?: string | null;

      // X / Twitter
      twitterId?: string | null;
      twitterUser?: string | null;
      twitterName?: string | null;
      twitterImage?: string | null;

      // Discord
      discordId?: string | null;
      discordUser?: string | null;
      discordName?: string | null;
      discordImage?: string | null;

      // Wallet
      walletAddress?: string | null;
      walletChainId?: number | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    // ✅ стандартный id NextAuth (fallback)
    sub?: string;

    // ✅ наш алиас user id
    uid?: string;

    points?: number;
    linkError?: string;

    // Public profile
    handle?: string | null;
    publicId?: string | null;

    // (опционально) удобные поля
    publicUrl?: string | null;
    displayName?: string | null;
    mainAvatar?: string | null;

    // Wallet
    walletAddress?: string | null;
    walletChainId?: number | null;

    // X / Twitter
    twitterId?: string | null;
    twitterUser?: string | null;
    twitterName?: string | null;
    twitterImage?: string | null;

    // Discord
    discordId?: string | null;
    discordUser?: string | null;
    discordName?: string | null;
    discordImage?: string | null;
  }
}
