import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  ADMIN_ESCROW_COOKIE_NAME,
  verifyAdminEscrowToken,
} from "@/lib/adminEscrowGate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SupportRoleValue = "USER" | "MODERATOR" | "ADMIN";

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
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

async function getSupportRole(actor: {
  userId: string | null;
  walletAddress: string;
}): Promise<"MODERATOR" | "ADMIN" | null> {
  if (
    actor.walletAddress &&
    getBootstrapAdminWallets().includes(actor.walletAddress)
  ) {
    return "ADMIN";
  }

  if (
    actor.walletAddress &&
    getBootstrapModeratorWallets().includes(actor.walletAddress)
  ) {
    return "MODERATOR";
  }

  const actorRole = await getActorSupportRole(actor);
  if (actorRole === "ADMIN") return "ADMIN";
  if (actorRole === "MODERATOR") return "MODERATOR";
  return null;
}

function tokenMatchesActor(
  token: {
    sub: string | null;
    wallet: string | null;
    role: "MODERATOR" | "ADMIN";
    exp: number;
  } | null,
  actor: { userId: string | null; walletAddress: string }
) {
  if (!token) return false;
  if (token.sub && actor.userId && token.sub === actor.userId) return true;
  if (token.wallet && actor.walletAddress && token.wallet === actor.walletAddress) {
    return true;
  }
  return false;
}

async function requireSupport(req: Request) {
  const actor = await getActor();

  if (!actor.userId && !actor.walletAddress) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 }),
    };
  }

  const role = await getSupportRole(actor);
  if (!role) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 }),
    };
  }

  const cookieHeader = req.headers.get("cookie") || "";
  const rawToken = cookieHeader
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(`${ADMIN_ESCROW_COOKIE_NAME}=`))
    ?.slice(`${ADMIN_ESCROW_COOKIE_NAME}=`.length);

  const token = verifyAdminEscrowToken(rawToken || null);
  if (!tokenMatchesActor(token, actor)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "ADMIN_ESCROW_GATE_LOCKED" },
        { status: 401 }
      ),
    };
  }

  return { ok: true as const, actor, role };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSupport(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await req.json().catch(() => null);
    const action = String(body?.action || "").trim().toLowerCase();

    const current = await prisma.adminNotification.findUnique({
      where: { id },
      select: { id: true, status: true, orderId: true, type: true },
    });

    if (!current) {
      return NextResponse.json({ ok: false, error: "NOTIFICATION_NOT_FOUND" }, { status: 404 });
    }

    let data: any = {};
    let logAction = "";

    if (action === "mark_read") {
      data = { status: current.status === "RESOLVED" ? "RESOLVED" : "READ", readAt: new Date() };
      logAction = "ADMIN_NOTIFICATION_MARK_READ";
    } else if (action === "resolve") {
      data = {
        status: "RESOLVED",
        readAt: new Date(),
        resolvedAt: new Date(),
        resolvedById: auth.actor.userId || null,
        resolvedByWallet: auth.actor.walletAddress || null,
      };
      logAction = "ADMIN_NOTIFICATION_RESOLVE";
    } else if (action === "reopen") {
      data = {
        status: "UNREAD",
        readAt: null,
        resolvedAt: null,
        resolvedById: null,
        resolvedByWallet: null,
      };
      logAction = "ADMIN_NOTIFICATION_REOPEN";
    } else {
      return NextResponse.json({ ok: false, error: "INVALID_ACTION" }, { status: 400 });
    }

    const updated = await prisma.adminNotification.update({
      where: { id },
      data,
      select: {
        id: true,
        status: true,
        readAt: true,
        resolvedAt: true,
        orderId: true,
        type: true,
      },
    });

    await prisma.adminActionLog.create({
      data: {
        adminUserId: auth.actor.userId || null,
        adminWallet: auth.actor.walletAddress || null,
        adminRole: auth.role,
        action: logAction,
        targetType: "ADMIN_NOTIFICATION",
        targetId: id,
        metadata: {
          previousStatus: current.status,
          nextStatus: updated.status,
          orderId: updated.orderId,
          type: updated.type,
        },
      },
    }).catch(() => null);

    return NextResponse.json({ ok: true, item: updated });
  } catch (e) {
    console.error("[API_ADMIN_NOTIFICATION_PATCH_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
