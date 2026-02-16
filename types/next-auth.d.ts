import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    userId?: string;
    linkError?: string;
    user: DefaultSession["user"] & {
      id?: string;
      points?: number;

      twitterId?: string | null;
      twitterUser?: string | null;
      twitterName?: string | null;
      twitterImage?: string | null;

      discordId?: string | null;
      discordUser?: string | null;
      discordName?: string | null;
      discordImage?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    points?: number;
    linkError?: string;

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
