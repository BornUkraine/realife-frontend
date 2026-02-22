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

function sha256b64url(input: string) {
  return b64url(crypto.createHash("sha256").update(input).digest());
}

function sign(payload: string, secret: string) {
  return b64url(crypto.createHmac("sha256", secret).update(payload).digest());
}

function makeSignedToken(obj: any, secret: string) {
  const payload = b64url(JSON.stringify(obj));
  const sig = sign(payload, secret);
  return `${payload}.${sig}`;
}

function getOrigin(req: NextRequest) {
  // ✅ В проде берём только из env (желательно всегда)
  const env = (process.env.NEXTAUTH_URL || "").trim().replace(/\/$/, "");
  if (env) return env;

  // fallback: прокси заголовки
  const hdr = req.headers.get("x-forwarded-host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (hdr) return `${proto}://${hdr}`;

  // крайний fallback
  return req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const ORIGIN = getOrigin(req);
  if (!ORIGIN) {
    return NextResponse.redirect(new URL("/app/profile?error=SERVER_MISCONFIG", req.nextUrl.origin));
  }

  const session = await getServerSession(authOptions);

  const uid =
    (session as any)?.userId ||
    (session as any)?.user?.id ||
    (session as any)?.user?.uid ||
    null;

  if (!uid) {
    return NextResponse.redirect(new URL("/app/profile?error=NO_SERVER_SESSION", ORIGIN));
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.redirect(new URL("/app/profile?error=SERVER_MISCONFIG", ORIGIN));
  }

  if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/app/profile?error=TWITTER_ENV_MISSING", ORIGIN));
  }

  // куда вернуть после линковки (только относительный путь)
  const returnToRaw = req.nextUrl.searchParams.get("returnTo") || "/app/profile?linked=twitter";
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/app/profile?linked=twitter";

  // PKCE
  const codeVerifier = b64url(crypto.randomBytes(32));
  const codeChallenge = sha256b64url(codeVerifier);

  // state: подписанный (uid + returnTo + exp)
  const state = makeSignedToken(
    {
      uid,
      returnTo,
      exp: Date.now() + 10 * 60 * 1000, // 10 минут
      n: b64url(crypto.randomBytes(12)), // шум
    },
    secret
  );

  // pkce cookie: тоже подписываем (state + verifier)
  const pkce = makeSignedToken(
    {
      s: state,
      v: codeVerifier,
      exp: Date.now() + 10 * 60 * 1000,
    },
    secret
  );

  // ✅ MUST совпадать с X Dev Portal
  const redirectUri = `${ORIGIN}/api/x/callback`;

  // X OAuth2 authorize
  const authorizeUrl = new URL("https://twitter.com/i/oauth2/authorize");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", process.env.TWITTER_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", "users.read tweet.read offline.access");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  const isProd = process.env.NODE_ENV === "production";

  const res = NextResponse.redirect(authorizeUrl.toString());
  res.cookies.set("x_pkce", pkce, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  return res;
}