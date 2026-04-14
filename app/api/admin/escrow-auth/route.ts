import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  ADMIN_ESCROW_COOKIE_NAME,
  createAdminEscrowToken,
  getAdminEscrowGateConfig,
  verifyAdminEscrowGateCredentials,
} from "@/lib/adminEscrowGate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SupportRoleValue = "USER" | "MODERATOR" | "ADMIN";

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function clean(v: unknown, max = 200) {
  return String(v || "").trim().slice(0, max);
}

function getBootstrapAdminWallets() {
  return (
    process.env.ADMIN_CREATE_WALLETS ||
    process.env.ADMIN_WALLETS ||
    process.env.NEXT_PUBLIC_ADMIN_CREATE_WALLETS ||
    process.env.NEXT_PUBLIC_ADMIN_WALLETS ||
    ""
  )
    .split(",")
    .map((x) => normAddr(x))
    .filter(Boolean);
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

async function getActorSupportRole(actor: {
  userId: string | null;
  walletAddress: string;
}): Promise<SupportRoleValue | null> {
  if (actor.userId) {
    const user = await prisma.user.findUnique({
      where: { id: actor.userId },
      select: { supportRole: true },
    });
    return (user?.supportRole as SupportRoleValue | undefined) || null;
  }

  if (actor.walletAddress) {
    const user = await prisma.user.findFirst({
      where: {
        walletAddress: {
          equals: actor.walletAddress,
          mode: "insensitive",
        },
      },
      select: { supportRole: true },
    });
    return (user?.supportRole as SupportRoleValue | undefined) || null;
  }

  return null;
}

async function getEscrowPanelRole(actor: {
  userId: string | null;
  walletAddress: string;
}): Promise<"MODERATOR" | "ADMIN" | null> {
  if (actor.walletAddress && getBootstrapAdminWallets().includes(actor.walletAddress)) {
    return "ADMIN";
  }

  const actorRole = await getActorSupportRole(actor);
  if (actorRole === "ADMIN") return "ADMIN";
  if (actorRole === "MODERATOR") return "MODERATOR";
  return null;
}

export async function POST(req: Request) {
  try {
    const cfg = getAdminEscrowGateConfig();

    if (!cfg.configured) {
      return NextResponse.json(
        { ok: false, error: "ADMIN_ESCROW_GATE_NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    const actor = await getActor();

    if (!actor.userId && !actor.walletAddress) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const role = await getEscrowPanelRole(actor);

    if (!role) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const login = clean(body?.login, 120);
    const password = clean(body?.password, 200);

    if (!login || !password) {
      return NextResponse.json(
        { ok: false, error: "LOGIN_AND_PASSWORD_REQUIRED" },
        { status: 400 }
      );
    }

    const ok = verifyAdminEscrowGateCredentials(login, password);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "INVALID_ADMIN_ESCROW_CREDENTIALS" },
        { status: 401 }
      );
    }

    const exp = Math.floor(Date.now() / 1000) + cfg.ttlHours * 60 * 60;

    const token = createAdminEscrowToken({
      sub: actor.userId || null,
      wallet: actor.walletAddress || null,
      role,
      exp,
    });

    const res = NextResponse.json({
      ok: true,
      role,
      expiresInHours: cfg.ttlHours,
    });

    res.cookies.set({
      name: ADMIN_ESCROW_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: cfg.ttlHours * 60 * 60,
    });

    return res;
  } catch (e) {
    console.error("[API_ADMIN_ESCROW_AUTH_POST_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}
