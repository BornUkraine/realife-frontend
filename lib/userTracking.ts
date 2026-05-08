import { prisma } from "@/lib/prisma";

const EVENT_DEDUPE_MS = 15 * 60 * 1000;

function clean(v: unknown, max = 500) {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
}

function cleanText(v: unknown, max = 2000) {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
}

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function isAddressLike(v?: string | null) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(v || "").trim());
}

function firstHeader(headers: Headers, names: string[]) {
  for (const name of names) {
    const v = headers.get(name);
    if (v && v.trim()) return v.trim();
  }
  return null;
}

function decodeHeader(v: string | null) {
  if (!v) return null;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function stripIpPort(ip: string) {
  const s = ip.trim();
  if (!s) return "";

  // IPv6 is usually already wrapped or contains multiple colons; keep it as-is.
  if (s.includes(":")) {
    if (s.startsWith("[") && s.includes("]")) return s.slice(1, s.indexOf("]"));
    return s;
  }

  // IPv4 with port.
  return s.split(":")[0] || s;
}

export function getClientIpFromHeaders(headers: Headers) {
  const forwarded = firstHeader(headers, ["x-forwarded-for"]);
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return clean(stripIpPort(first), 120);
  }

  const direct = firstHeader(headers, [
    "cf-connecting-ip",
    "x-real-ip",
    "x-client-ip",
    "fastly-client-ip",
    "true-client-ip",
  ]);

  return direct ? clean(stripIpPort(direct), 120) : null;
}

export function getGeoFromHeaders(headers: Headers) {
  const country = clean(
    firstHeader(headers, [
      "x-vercel-ip-country",
      "cf-ipcountry",
      "x-country-code",
      "x-geo-country",
    ]),
    80
  );

  const region = clean(
    decodeHeader(
      firstHeader(headers, [
        "x-vercel-ip-country-region",
        "x-region-code",
        "x-geo-region",
      ])
    ),
    120
  );

  const city = clean(
    decodeHeader(
      firstHeader(headers, ["x-vercel-ip-city", "x-geo-city", "x-city"])
    ),
    120
  );

  return { country, region, city };
}

type TrackIdentity = {
  userId: string;
  walletAddress?: string | null;
  walletChainId?: number | null;
  authMethod?: "WALLET" | "GOOGLE" | string | null;
  walletKind?: "EXTERNAL" | "EMBEDDED" | string | null;
  embeddedWalletProvider?:
    | "WEB3AUTH"
    | "METAMASK_EMBEDDED"
    | "TURNKEY"
    | "OPENFORT"
    | string
    | null;
  googleId?: string | null;
  googleEmail?: string | null;
  eventType?: string | null;
  path?: string | null;
};

export async function recordUserLoginEvent(req: Request, identity: TrackIdentity) {
  const userId = clean(identity.userId, 200);
  if (!userId) return;

  const headers = req.headers;
  const now = new Date();
  const recentSince = new Date(now.getTime() - EVENT_DEDUPE_MS);
  const url = new URL(req.url);

  const ip = getClientIpFromHeaders(headers);
  const userAgent = cleanText(headers.get("user-agent"), 1200);
  const { country, region, city } = getGeoFromHeaders(headers);
  const referrer = cleanText(headers.get("referer") || headers.get("referrer"), 2000);
  const path = cleanText(identity.path || `${url.pathname}${url.search || ""}`, 2000);
  const eventType = clean(identity.eventType || "SESSION_CHECK", 80) || "SESSION_CHECK";

  const walletAddress = normAddr(identity.walletAddress || "");
  const hasWallet = isAddressLike(walletAddress);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstLoginAt: true,
        firstIp: true,
        firstUserAgent: true,
        firstCountry: true,
        firstRegion: true,
        firstCity: true,
        authMethod: true,
        walletKind: true,
        walletAddress: true,
        walletChainId: true,
        embeddedWalletProvider: true,
        googleId: true,
        googleEmail: true,
      },
    });

    if (!user) return;

    const authMethod = clean(identity.authMethod || user.authMethod, 40) as any;
    const walletKind = clean(identity.walletKind || user.walletKind, 40) as any;
    const embeddedWalletProvider = clean(
      identity.embeddedWalletProvider || user.embeddedWalletProvider,
      80
    ) as any;
    const googleId = clean(identity.googleId || user.googleId, 200);
    const googleEmail = clean(identity.googleEmail || user.googleEmail, 320);
    const effectiveWalletAddress = hasWallet
      ? walletAddress
      : normAddr(user.walletAddress || "");
    const effectiveChainId = Number.isFinite(Number(identity.walletChainId))
      ? Number(identity.walletChainId)
      : user.walletChainId || null;

    const updateData: any = {
      lastLoginAt: now,
      lastAuthMethod: authMethod || undefined,
      lastWalletKind: walletKind || undefined,
      lastEmbeddedWalletProvider: embeddedWalletProvider || undefined,
    };

    if (!user.firstLoginAt) updateData.firstLoginAt = now;

    if (ip) {
      updateData.lastIp = ip;
      if (!user.firstIp) updateData.firstIp = ip;
    }

    if (userAgent) {
      updateData.lastUserAgent = userAgent;
      if (!user.firstUserAgent) updateData.firstUserAgent = userAgent;
    }

    if (country) {
      updateData.lastCountry = country;
      if (!user.firstCountry) updateData.firstCountry = country;
    }

    if (region) {
      updateData.lastRegion = region;
      if (!user.firstRegion) updateData.firstRegion = region;
    }

    if (city) {
      updateData.lastCity = city;
      if (!user.firstCity) updateData.firstCity = city;
    }

    await tx.user.update({ where: { id: userId }, data: updateData });

    const recentWhere: any = {
      userId,
      eventType,
      createdAt: { gte: recentSince },
    };
    if (ip) recentWhere.ip = ip;
    if (userAgent) recentWhere.userAgent = userAgent;

    const recent = await tx.userLoginEvent.findFirst({
      where: recentWhere,
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });

    if (!recent) {
      await tx.userLoginEvent.create({
        data: {
          userId,
          eventType,
          walletAddress: effectiveWalletAddress || null,
          walletChainId: effectiveChainId,
          authMethod: authMethod || null,
          walletKind: walletKind || null,
          embeddedWalletProvider: embeddedWalletProvider || null,
          googleId,
          googleEmail,
          ip,
          userAgent,
          country,
          region,
          city,
          referrer,
          path,
        },
      });
    }

    if (isAddressLike(effectiveWalletAddress)) {
      await tx.userWallet.upsert({
        where: {
          userId_address: {
            userId,
            address: effectiveWalletAddress,
          },
        },
        create: {
          userId,
          address: effectiveWalletAddress,
          chainId: effectiveChainId,
          kind: walletKind || user.walletKind || "EXTERNAL",
          embeddedWalletProvider: embeddedWalletProvider || null,
          isPrimary: normAddr(user.walletAddress) === effectiveWalletAddress,
          label:
            walletKind === "EMBEDDED"
              ? embeddedWalletProvider
                ? `${embeddedWalletProvider} embedded wallet`
                : "Embedded wallet"
              : "External wallet",
          firstSeenAt: now,
          lastSeenAt: now,
          lastIp: ip,
          lastUserAgent: userAgent,
        } as any,
        update: {
          chainId: effectiveChainId || undefined,
          kind: walletKind || user.walletKind || undefined,
          embeddedWalletProvider: embeddedWalletProvider || undefined,
          isPrimary: normAddr(user.walletAddress) === effectiveWalletAddress,
          lastSeenAt: now,
          lastIp: ip || undefined,
          lastUserAgent: userAgent || undefined,
        } as any,
      });
    }
  });
}
