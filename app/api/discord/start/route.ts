import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sign(payload: string, secret: string) {
  return b64url(crypto.createHmac("sha256", secret).update(payload).digest());
}

function makeSignedToken(obj: any, secret: string) {
  const payload = b64url(JSON.stringify(obj));
  const sig = sign(payload, secret);
  return `${payload}.${sig}`;
}

function safeReturnTo(rt: any) {
  const fallback = "/app/profile?linked=discord";
  if (typeof rt !== "string") return fallback;
  if (!rt.startsWith("/")) return fallback; // anti open-redirect
  return rt;
}

function getOrigin(req: NextRequest) {
  const env = (process.env.NEXTAUTH_URL || "").trim().replace(/\/$/, "");
  if (env) return env;

  const host = req.headers.get("x-forwarded-host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;

  return req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const uid =
    (session as any)?.userId ||
    (session as any)?.user?.id ||
    (session as any)?.user?.uid ||
    null;

  const ORIGIN = getOrigin(req);

  if (!uid) {
    return NextResponse.redirect(new URL("/app/profile?error=NO_SERVER_SESSION", ORIGIN));
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.redirect(new URL("/app/profile?error=SERVER_MISCONFIG", ORIGIN));
  }

  if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/app/profile?error=DISCORD_ENV_MISSING", ORIGIN));
  }

  const returnToRaw = req.nextUrl.searchParams.get("returnTo") || "/app/profile?linked=discord";
  const returnTo = safeReturnTo(returnToRaw);

  // state подписанный: uid + returnTo + exp
  const state = makeSignedToken(
    {
      uid,
      returnTo,
      exp: Date.now() + 10 * 60 * 1000, // 10 минут
      n: b64url(crypto.randomBytes(12)),
    },
    secret
  );

  const redirectUri = `${ORIGIN}/api/discord/callback`;

  const authorizeUrl = new URL("https://discord.com/oauth2/authorize");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", process.env.DISCORD_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", "identify");
  authorizeUrl.searchParams.set("state", state);

  return NextResponse.redirect(authorizeUrl.toString());
}