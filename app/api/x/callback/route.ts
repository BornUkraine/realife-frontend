import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

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

function parseSignedToken(token: string, secret: string) {
  const [payload, sig] = (token || "").split(".");
  if (!payload || !sig) return null;

  const expect = sign(payload, secret);

  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;

  try {
    const json = JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    );
    return json;
  } catch {
    return null;
  }
}

function safeReturnTo(rt: any) {
  const fallback = "/app/profile?linked=twitter";
  if (typeof rt !== "string") return fallback;
  if (!rt.startsWith("/")) return fallback; // защита от open-redirect
  return rt;
}

function appendError(urlPath: string, code: string) {
  // urlPath может быть "/app/profile" или "/app/profile?linked=twitter"
  const u = new URL(urlPath, "http://local"); // base только чтобы парсилось
  u.searchParams.set("error", code);
  // вернуть только path+query
  return `${u.pathname}${u.search}`;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.redirect(new URL("/app/profile?error=SERVER_MISCONFIG", req.url));
  }

  const stateObj = parseSignedToken(state || "", secret);
  if (!stateObj?.uid || !stateObj?.exp || Date.now() > Number(stateObj.exp)) {
    return NextResponse.redirect(new URL("/app/profile?error=BAD_STATE", req.url));
  }

  const returnTo = safeReturnTo(stateObj.returnTo);

  if (!code) {
    return NextResponse.redirect(new URL(appendError(returnTo, "NO_CODE"), req.url));
  }

  // достаём PKCE verifier из cookie
  const pkceCookie = req.cookies.get("x_pkce")?.value || "";
  const pkceObj = parseSignedToken(pkceCookie, secret);

  if (!pkceObj?.v || !pkceObj?.s || pkceObj.s !== state || Date.now() > Number(pkceObj.exp || 0)) {
    const res = NextResponse.redirect(new URL(appendError(returnTo, "PKCE_MISSING"), req.url));
    res.cookies.set("x_pkce", "", { path: "/", maxAge: 0 });
    return res;
  }

  if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
    const res = NextResponse.redirect(new URL(appendError(returnTo, "TWITTER_ENV_MISSING"), req.url));
    res.cookies.set("x_pkce", "", { path: "/", maxAge: 0 });
    return res;
  }

  const redirectUri = `${req.nextUrl.origin}/api/x/callback`;

  // обмен code -> token (OAuth2)
  const basic = Buffer.from(
    `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
  ).toString("base64");

  // ✅ лучше api.x.com (как в твоей доке)
  const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: pkceObj.v,
    }).toString(),
    cache: "no-store",
  });

  if (!tokenRes.ok) {
    const res = NextResponse.redirect(new URL(appendError(returnTo, "TOKEN_EXCHANGE"), req.url));
    res.cookies.set("x_pkce", "", { path: "/", maxAge: 0 });
    return res;
  }

  const tokenJson = (await tokenRes.json()) as any;
  const accessToken = tokenJson?.access_token as string | undefined;

  if (!accessToken) {
    const res = NextResponse.redirect(new URL(appendError(returnTo, "NO_ACCESS_TOKEN"), req.url));
    res.cookies.set("x_pkce", "", { path: "/", maxAge: 0 });
    return res;
  }

  // users/me
  const meRes = await fetch("https://api.x.com/2/users/me?user.fields=profile_image_url", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!meRes.ok) {
    const res = NextResponse.redirect(new URL(appendError(returnTo, "ME_FAILED"), req.url));
    res.cookies.set("x_pkce", "", { path: "/", maxAge: 0 });
    return res;
  }

  const meJson = (await meRes.json()) as any;
  const d = meJson?.data || {};

  const twitterId = String(d?.id || "");
  const twitterUser = d?.username ? String(d.username) : null;
  const twitterName = d?.name ? String(d.name) : null;
  const twitterImage = d?.profile_image_url ? String(d.profile_image_url).replace("_normal", "") : null;

  if (!twitterId) {
    const res = NextResponse.redirect(new URL(appendError(returnTo, "BAD_PROFILE"), req.url));
    res.cookies.set("x_pkce", "", { path: "/", maxAge: 0 });
    return res;
  }

  try {
    // ✅ обновляем именно wallet-user по uid из state
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: stateObj.uid },
        select: { id: true },
      });
      if (!target) throw new Error("USER_NOT_FOUND");

      const existing = await tx.user.findUnique({
        where: { twitterId },
        select: { id: true },
      });
      if (existing && existing.id !== stateObj.uid) {
        throw new Error("TWITTER_ALREADY_LINKED");
      }

      await tx.user.update({
        where: { id: stateObj.uid },
        data: { twitterId, twitterUser, twitterName, twitterImage },
      });
    });

    const res = NextResponse.redirect(new URL(returnTo, req.url));
    res.cookies.set("x_pkce", "", { path: "/", maxAge: 0 });
    return res;
  } catch (e: any) {
    const err = e?.message === "TWITTER_ALREADY_LINKED" ? "TWITTER_ALREADY_LINKED" : "LINK_FAILED";
    const res = NextResponse.redirect(new URL(appendError(returnTo, err), req.url));
    res.cookies.set("x_pkce", "", { path: "/", maxAge: 0 });
    return res;
  }
}