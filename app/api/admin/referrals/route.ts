import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_ESCROW_COOKIE_NAME,
  verifyAdminEscrowToken,
} from "@/lib/adminEscrowGate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SupportRoleValue = "USER" | "MODERATOR" | "ADMIN";
const INSENSITIVE = "insensitive" as const;

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function clean(v: unknown, max = 200) {
  return String(v || "").trim().slice(0, max);
}

function getEnvWallets(...names: string[]) {
  return names
    .flatMap((name) => String(process.env[name] || "").split(","))
    .map((x) => normAddr(x))
    .filter(Boolean);
}

function getBootstrapAdminWallets() {
  return getEnvWallets(
    "ADMIN_CREATE_WALLETS",
    "ADMIN_WALLETS",
    "NEXT_PUBLIC_ADMIN_CREATE_WALLETS",
    "NEXT_PUBLIC_ADMIN_WALLETS"
  );
}

function getBootstrapModeratorWallets() {
  return getEnvWallets("MODERATOR_WALLETS", "ADMIN_MODERATOR_WALLETS");
}

async function getActor() {
  const session = await getServerSession(authOptions);

  const userId =
    (session as any)?.user?.id ||
    (session as any)?.userId ||
    null;

  const walletAddress = normAddr(
    (session as any)?.user?.walletAddress ||
      (session as any)?.walletAddress ||
      ""
  );

  return { userId, walletAddress };
}

async function getActorSupportRole(actor: { userId: string | null; walletAddress: string }): Promise<SupportRoleValue | null> {
  if (actor.userId) {
    const user = await prisma.user.findUnique({
      where: { id: actor.userId },
      select: { supportRole: true },
    });
    return (user?.supportRole as SupportRoleValue | undefined) || null;
  }

  if (actor.walletAddress) {
    const user = await prisma.user.findFirst({
      where: { walletAddress: { equals: actor.walletAddress, mode: INSENSITIVE } },
      select: { supportRole: true },
    });
    return (user?.supportRole as SupportRoleValue | undefined) || null;
  }

  return null;
}

async function getEscrowPanelRole(actor: { userId: string | null; walletAddress: string }): Promise<"MODERATOR" | "ADMIN" | null> {
  if (actor.walletAddress && getBootstrapAdminWallets().includes(actor.walletAddress)) return "ADMIN";
  if (actor.walletAddress && getBootstrapModeratorWallets().includes(actor.walletAddress)) return "MODERATOR";

  const actorRole = await getActorSupportRole(actor);
  if (actorRole === "ADMIN") return "ADMIN";
  if (actorRole === "MODERATOR") return "MODERATOR";
  return null;
}

function tokenMatchesActor(
  token: { sub: string | null; wallet: string | null; role: "MODERATOR" | "ADMIN"; exp: number } | null,
  actor: { userId: string | null; walletAddress: string }
) {
  if (!token) return false;
  if (token.sub && actor.userId && token.sub === actor.userId) return true;
  if (token.wallet && actor.walletAddress && token.wallet === actor.walletAddress) return true;
  return false;
}

async function requirePanelAccess(req: Request) {
  const actor = await getActor();

  if (!actor.userId && !actor.walletAddress) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 }) };
  }

  const role = await getEscrowPanelRole(actor);
  if (!role) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 }) };
  }

  const rawCookie = req.headers
    .get("cookie")
    ?.split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${ADMIN_ESCROW_COOKIE_NAME}=`))
    ?.slice(ADMIN_ESCROW_COOKIE_NAME.length + 1);

  const token = verifyAdminEscrowToken(rawCookie || null);
  if (!tokenMatchesActor(token, actor)) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "ESCROW_GATE_LOCKED" }, { status: 423 }) };
  }

  return { ok: true as const, actor, role };
}

function iso(v?: Date | null) {
  return v ? v.toISOString() : null;
}

function short(v?: string | null, left = 8, right = 6) {
  const s = String(v || "");
  if (!s) return null;
  if (s.length <= left + right + 3) return s;
  return `${s.slice(0, left)}...${s.slice(-right)}`;
}

function label(u: any) {
  return (
    u.twitterName ||
    u.discordName ||
    u.googleName ||
    (u.twitterUser ? `@${u.twitterUser}` : null) ||
    (u.discordUser ? `@${u.discordUser}` : null) ||
    (u.handle ? `@${u.handle}` : null) ||
    u.publicId ||
    short(u.walletAddress)
  );
}

function avatar(u: any) {
  return u.twitterImage || u.discordImage || u.googleImage || null;
}

function isQualified(u: any) {
  const c = u._count || {};
  return (
    (c.mints || 0) > 0 ||
    (c.listings || 0) > 0 ||
    (c.storeOrdersBought || 0) > 0 ||
    (c.storeOrdersSold || 0) > 0 ||
    (c.tradesBought || 0) > 0 ||
    (c.tradesSold || 0) > 0 ||
    Boolean(u.twitterUser || u.discordUser)
  );
}

function serializeReferredUser(u: any) {
  const c = u._count || {};
  return {
    id: u.id,
    createdAt: iso(u.createdAt),
    referredAt: iso(u.referredAt),
    handle: u.handle || null,
    publicId: u.publicId || null,
    walletAddress: u.walletAddress || null,
    walletShort: short(u.walletAddress),
    label: label(u),
    avatar: avatar(u),
    twitterUser: u.twitterUser || null,
    discordUser: u.discordUser || null,
    qualified: isQualified(u),
    counts: {
      mints: c.mints || 0,
      listings: c.listings || 0,
      ordersBought: c.storeOrdersBought || 0,
      ordersSold: c.storeOrdersSold || 0,
      tradesBought: c.tradesBought || 0,
      tradesSold: c.tradesSold || 0,
    },
  };
}

function serializeReferrer(row: any) {
  const referred = row.referrals || [];
  const referredUsers = referred.map(serializeReferredUser);
  const qualifiedUsers = referredUsers.filter((u: any) => u.qualified);

  const totals = referredUsers.reduce(
    (acc: any, u: any) => {
      acc.mints += u.counts.mints;
      acc.listings += u.counts.listings;
      acc.ordersBought += u.counts.ordersBought;
      acc.ordersSold += u.counts.ordersSold;
      acc.tradesBought += u.counts.tradesBought;
      acc.tradesSold += u.counts.tradesSold;
      return acc;
    },
    { mints: 0, listings: 0, ordersBought: 0, ordersSold: 0, tradesBought: 0, tradesSold: 0 }
  );

  return {
    id: row.id,
    createdAt: iso(row.createdAt),
    lastLoginAt: iso(row.lastLoginAt),
    referralCode: row.referralCode,
    label: label(row),
    avatar: avatar(row),
    handle: row.handle || null,
    publicId: row.publicId || null,
    walletAddress: row.walletAddress,
    walletShort: short(row.walletAddress),
    twitterUser: row.twitterUser || null,
    discordUser: row.discordUser || null,
    points: row.points || 0,
    invited: referredUsers.length,
    qualified: qualifiedUsers.length,
    conversion: referredUsers.length ? Math.round((qualifiedUsers.length / referredUsers.length) * 100) : 0,
    totals,
    recentUsers: referredUsers.slice(0, 25),
  };
}

export async function GET(req: Request) {
  try {
    const access = await requirePanelAccess(req);
    if (!access.ok) return access.response;

    const url = new URL(req.url);
    const q = clean(url.searchParams.get("q"), 120);
    const take = Math.min(200, Math.max(1, Number(url.searchParams.get("take") || 100)));

    const where: Prisma.UserWhereInput = {
      referralCode: { not: null },
      ...(q
        ? {
            OR: [
              { referralCode: { contains: q, mode: INSENSITIVE } },
              { handle: { contains: q, mode: INSENSITIVE } },
              { publicId: { contains: q, mode: INSENSITIVE } },
              { walletAddress: { contains: q.toLowerCase(), mode: INSENSITIVE } },
              { twitterUser: { contains: q, mode: INSENSITIVE } },
              { discordUser: { contains: q, mode: INSENSITIVE } },
              { googleEmail: { contains: q, mode: INSENSITIVE } },
              { googleName: { contains: q, mode: INSENSITIVE } },
            ],
          }
        : {}),
    };

    const referrers = await prisma.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take,
      select: {
        id: true,
        createdAt: true,
        lastLoginAt: true,
        handle: true,
        publicId: true,
        walletAddress: true,
        googleEmail: true,
        googleName: true,
        googleImage: true,
        twitterUser: true,
        twitterName: true,
        twitterImage: true,
        discordUser: true,
        discordName: true,
        discordImage: true,
        referralCode: true,
        points: true,
        referrals: {
          orderBy: [{ referredAt: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            createdAt: true,
            referredAt: true,
            handle: true,
            publicId: true,
            walletAddress: true,
            googleName: true,
            googleImage: true,
            twitterUser: true,
            twitterName: true,
            twitterImage: true,
            discordUser: true,
            discordName: true,
            discordImage: true,
            _count: {
              select: {
                mints: true,
                listings: true,
                storeOrdersBought: true,
                storeOrdersSold: true,
                tradesBought: true,
                tradesSold: true,
              },
            },
          },
        },
      },
    });

    const rows = referrers
      .map(serializeReferrer)
      .sort((a: any, b: any) => {
        if (b.qualified !== a.qualified) return b.qualified - a.qualified;
        if (b.invited !== a.invited) return b.invited - a.invited;
        return b.totals.listings - a.totals.listings;
      });

    return NextResponse.json({
      ok: true,
      role: access.role,
      total: rows.length,
      summary: {
        referrers: rows.length,
        invited: rows.reduce((n: number, r: any) => n + r.invited, 0),
        qualified: rows.reduce((n: number, r: any) => n + r.qualified, 0),
        listings: rows.reduce((n: number, r: any) => n + r.totals.listings, 0),
        orders: rows.reduce((n: number, r: any) => n + r.totals.ordersBought + r.totals.ordersSold, 0),
      },
      items: rows,
    });
  } catch (e) {
    console.error("[API_ADMIN_REFERRALS_GET_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
