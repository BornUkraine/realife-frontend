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
  const fallback = "/app/profile?linked=discord";
  if (typeof rt !== "string") return fallback;
  if (!rt.startsWith("/")) return fallback;
  return rt;
}

function appendError(urlPath: string, code: string) {
  const u = new URL(urlPath, "http://local");
  u.searchParams.set("error", code);
  return `${u.pathname}${u.search}`;
}

function getOrigin(req: NextRequest) {
  const env = (process.env.NEXTAUTH_URL || "").trim().replace(/\/$/, "");
  if (env) return env;

  const host = req.headers.get("x-forwarded-host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;

  return req.nextUrl.origin;
}

function discordAvatarUrl(id: string, avatar: string | null | undefined) {
  if (!id || !avatar) return null;
  const ext = avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${ext}?size=256`;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  const ORIGIN = getOrigin(req);

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.redirect(new URL("/app/profile?error=SERVER_MISCONFIG", ORIGIN));
  }

  const stateObj = parseSignedToken(state || "", secret);
  if (!stateObj?.uid || !stateObj?.exp || Date.now() > Number(stateObj.exp)) {
    return NextResponse.redirect(new URL("/app/profile?error=BAD_STATE", ORIGIN));
  }

  const returnTo = safeReturnTo(stateObj.returnTo);

  if (!code) {
    return NextResponse.redirect(new URL(appendError(returnTo, "NO_CODE"), ORIGIN));
  }

  if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
    return NextResponse.redirect(new URL(appendError(returnTo, "DISCORD_ENV_MISSING"), ORIGIN));
  }

  const redirectUri = `${ORIGIN}/api/discord/callback`;

  // code -> token
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString(),
    cache: "no-store",
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL(appendError(returnTo, "TOKEN_EXCHANGE"), ORIGIN));
  }

  const tokenJson = (await tokenRes.json()) as any;
  const accessToken = tokenJson?.access_token as string | undefined;

  if (!accessToken) {
    return NextResponse.redirect(new URL(appendError(returnTo, "NO_ACCESS_TOKEN"), ORIGIN));
  }

  // users/@me
  const meRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!meRes.ok) {
    return NextResponse.redirect(new URL(appendError(returnTo, "ME_FAILED"), ORIGIN));
  }

  const meJson = (await meRes.json()) as any;

  const discordId = String(meJson?.id || "");
  const discordUser = meJson?.username ? String(meJson.username) : null;
  const discordName =
    meJson?.global_name ? String(meJson.global_name) : meJson?.username ? String(meJson.username) : null;
  const discordImage = discordAvatarUrl(discordId, meJson?.avatar);

  if (!discordId) {
    return NextResponse.redirect(new URL(appendError(returnTo, "BAD_PROFILE"), ORIGIN));
  }

  try {
    await prisma.$transaction(async (tx) => {
      // target user exists
      const target = await tx.user.findUnique({
        where: { id: stateObj.uid },
        select: { id: true, discordId: true },
      });
      if (!target) throw new Error("USER_NOT_FOUND");

      // prevent linking same discord to another user
      const existing = await tx.user.findUnique({
        where: { discordId },
        select: { id: true },
      });
      if (existing && existing.id !== stateObj.uid) {
        throw new Error("DISCORD_ALREADY_LINKED");
      }

      const wasConnectedBefore = Boolean(target.discordId);

      // update user
      await tx.user.update({
        where: { id: stateObj.uid },
        data: { discordId, discordUser, discordName, discordImage },
      });

      // reward points only once
      if (!wasConnectedBefore) {
        const alreadyRewarded = await tx.pointEvent.findFirst({
          where: { userId: stateObj.uid, type: "DISCORD_CONNECT" },
          select: { id: true },
        });

        if (!alreadyRewarded) {
          await tx.user.update({
            where: { id: stateObj.uid },
            data: { points: { increment: 100 } },
          });

          await tx.pointEvent.create({
            data: {
              userId: stateObj.uid,
              type: "DISCORD_CONNECT",
              points: 100,
              meta: { discordId },
            },
          });
        }
      }
    });

    return NextResponse.redirect(new URL(returnTo, ORIGIN));
  } catch (e: any) {
    const msg = String(e?.message || "");
    const err =
      msg === "DISCORD_ALREADY_LINKED"
        ? "DISCORD_ALREADY_LINKED"
        : msg === "USER_NOT_FOUND"
        ? "NO_SERVER_SESSION"
        : "LINK_FAILED";

    return NextResponse.redirect(new URL(appendError(returnTo, err), ORIGIN));
  }
}