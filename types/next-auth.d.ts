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

      handle?: string | null;
      publicId?: string | null;

      twitterId?: string | null;
      twitterUser?: string | null;
      twitterName?: string | null;
      twitterImage?: string | null;

      discordId?: string | null;
      discordUser?: string | null;
      discordName?: string | null;
      discordImage?: string | null;

      walletAddress?: string | null;
      walletChainId?: number | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    // ✅ стандартный id NextAuth (мы его используем как fallback)
    sub?: string;

    // ✅ наш алиас user id
    uid?: string;

    points?: number;
    linkError?: string;

    handle?: string | null;
    publicId?: string | null;

    walletAddress?: string | null;
    walletChainId?: number | null;

    twitterId?: string | null;
    twitterUser?: string | null;
    twitterName?: string | null;
    twitterImage?: string | null;

    discordId?: string | null;
    discordUser?: string | null;
    discordName?: string | null;
    discordImage?: string | null;
  }
}
