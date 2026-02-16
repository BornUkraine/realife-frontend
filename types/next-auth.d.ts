import { DefaultSession } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session extends DefaultSession {
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
