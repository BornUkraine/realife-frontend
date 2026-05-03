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
type NotificationStatus = "UNREAD" | "READ" | "RESOLVED" | "ALL";

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function getBootstrapAdminWallets() {
  return (process.env.ADMIN_CREATE_WALLETS || process.env.ADMIN_WALLETS || "")
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

function parseStatus(v?: string | null): NotificationStatus {
  const s = String(v || "").trim().toUpperCase();
  if (s === "READ" || s === "RESOLVED" || s === "ALL") return s;
  return "UNREAD";
}

function clampTake(v?: string | null) {
  const n = Number(v || "30");
  if (!Number.isFinite(n)) return 30;
  return Math.max(1, Math.min(100, Math.floor(n)));
}

function clean(v?: string | null, max = 80) {
  return String(v || "").trim().slice(0, max);
}

export async function GET(req: Request) {
  try {
    const auth = await requireSupport(req);
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const status = parseStatus(url.searchParams.get("status"));
    const q = clean(url.searchParams.get("q"), 120);
    const type = clean(url.searchParams.get("type"), 80);
    const take = clampTake(url.searchParams.get("take"));

    const where: any = {};
    if (status !== "ALL") where.status = status;
    if (type) where.type = type;

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { body: { contains: q, mode: "insensitive" } },
        { actorWallet: { contains: q, mode: "insensitive" } },
        { order: { is: { id: { contains: q, mode: "insensitive" } } } },
        { order: { is: { buyerWallet: { contains: q, mode: "insensitive" } } } },
        { order: { is: { sellerWallet: { contains: q, mode: "insensitive" } } } },
        { order: { is: { contract: { contains: q, mode: "insensitive" } } } },
        { order: { is: { tokenId: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const [items, unread, read, resolved, all] = await Promise.all([
      prisma.adminNotification.findMany({
        where,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take,
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          type: true,
          status: true,
          priority: true,
          title: true,
          body: true,
          orderId: true,
          deliveryMessageId: true,
          actorUserId: true,
          actorWallet: true,
          actorRole: true,
          readAt: true,
          resolvedAt: true,
          resolvedById: true,
          resolvedByWallet: true,
          metadata: true,
          order: {
            select: {
              id: true,
              createdAt: true,
              updatedAt: true,
              chainId: true,
              contract: true,
              tokenId: true,
              vertical: true,
              sourceType: true,
              orderKind: true,
              marketType: true,
              marketplaceContract: true,
              marketplaceListingId: true,
              marketplacePurchaseId: true,
              buyerWallet: true,
              sellerWallet: true,
              totalPrice: true,
              paymentToken: true,
              fulfillmentType: true,
              escrowStatus: true,
              deliveryStatus: true,
              serviceStatus: true,
              refundRequestedAt: true,
              nftReturnedAt: true,
              disputedAt: true,
              buyTxHash: true,
              noteBuyer: true,
              noteSeller: true,
              adminNote: true,
              deliveryMessages: {
                orderBy: { createdAt: "desc" },
                take: 3,
                select: {
                  id: true,
                  senderRole: true,
                  senderWallet: true,
                  body: true,
                  isInternal: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      }),
      prisma.adminNotification.count({ where: { status: "UNREAD" } }),
      prisma.adminNotification.count({ where: { status: "READ" } }),
      prisma.adminNotification.count({ where: { status: "RESOLVED" } }),
      prisma.adminNotification.count(),
    ]);

    return NextResponse.json({
      ok: true,
      role: auth.role,
      status,
      q: q || null,
      type: type || null,
      summary: { unread, read, resolved, all },
      items: items.map((x: any) => ({
        ...x,
        order: x.order
          ? {
              ...x.order,
              marketplaceListingId: x.order.marketplaceListingId?.toString?.() || null,
              marketplacePurchaseId: x.order.marketplacePurchaseId?.toString?.() || null,
              totalPrice: x.order.totalPrice?.toString?.() || "0",
            }
          : null,
      })),
    });
  } catch (e) {
    console.error("[API_ADMIN_NOTIFICATIONS_GET_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireSupport(req);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => null);
    const action = String(body?.action || "").trim().toLowerCase();

    if (action !== "mark_all_read") {
      return NextResponse.json({ ok: false, error: "INVALID_ACTION" }, { status: 400 });
    }

    const result = await prisma.adminNotification.updateMany({
      where: { status: "UNREAD" },
      data: { status: "READ", readAt: new Date() },
    });

    await prisma.adminActionLog.create({
      data: {
        adminUserId: auth.actor.userId || null,
        adminWallet: auth.actor.walletAddress || null,
        adminRole: auth.role,
        action: "ADMIN_NOTIFICATIONS_MARK_ALL_READ",
        targetType: "ADMIN_NOTIFICATION",
        targetId: null,
        metadata: { count: result.count },
      },
    }).catch(() => null);

    return NextResponse.json({ ok: true, count: result.count });
  } catch (e) {
    console.error("[API_ADMIN_NOTIFICATIONS_POST_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
