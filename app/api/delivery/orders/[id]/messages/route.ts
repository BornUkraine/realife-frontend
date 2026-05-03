import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SupportRoleValue = "USER" | "MODERATOR" | "ADMIN";
type SenderRoleValue = "BUYER" | "SELLER" | "SUPPORT";

function getEnvWallets(...names: string[]) {
  return names
    .flatMap((name) => String(process.env[name] || "").split(","))
    .map((x) => normAddr(x))
    .filter(Boolean);
}

const ADMIN_WALLETS = getEnvWallets(
  "ADMIN_CREATE_WALLETS",
  "ADMIN_WALLETS",
  "NEXT_PUBLIC_ADMIN_CREATE_WALLETS",
  "NEXT_PUBLIC_ADMIN_WALLETS"
);

const MODERATOR_WALLETS = getEnvWallets(
  "MODERATOR_WALLETS",
  "ADMIN_MODERATOR_WALLETS"
);

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function clean(v: unknown, max = 4000) {
  return String(v || "").trim().slice(0, max);
}

function toBool(v: unknown) {
  if (typeof v === "boolean") return v;
  const s = String(v || "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
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

  const isAdminSession = Boolean(
    (session as any)?.user?.isAdmin ||
      (session as any)?.isAdmin
  );

  const isAllowlistedAdminWallet =
    !!walletAddress && ADMIN_WALLETS.includes(walletAddress);

  const isAllowlistedModeratorWallet =
    !!walletAddress && MODERATOR_WALLETS.includes(walletAddress);

  let dbSupportRole: SupportRoleValue | null = null;

  if (userId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { supportRole: true },
    });

    dbSupportRole = (dbUser?.supportRole as SupportRoleValue | null) || null;
  } else if (walletAddress) {
    const dbUser = await prisma.user.findFirst({
      where: {
        walletAddress: {
          equals: walletAddress,
          mode: "insensitive",
        },
      },
      select: { supportRole: true },
    });

    dbSupportRole = (dbUser?.supportRole as SupportRoleValue | null) || null;
  }

  const isDbSupport =
    dbSupportRole === "MODERATOR" || dbSupportRole === "ADMIN";

  return {
    userId,
    walletAddress,
    isSupport:
      isAdminSession ||
      isAllowlistedAdminWallet ||
      isAllowlistedModeratorWallet ||
      isDbSupport,
    dbSupportRole,
    isAdminSession,
    isAllowlistedWallet: isAllowlistedAdminWallet || isAllowlistedModeratorWallet,
  };
}

function getViewerRole(
  actor: { userId: string | null; walletAddress: string },
  order: {
    buyerId: string | null;
    sellerId: string | null;
    buyerWallet: string;
    sellerWallet: string;
  }
): "buyer" | "seller" | null {
  const isBuyer =
    (actor.userId && order.buyerId && actor.userId === order.buyerId) ||
    (actor.walletAddress &&
      actor.walletAddress === normAddr(order.buyerWallet));

  if (isBuyer) return "buyer";

  const isSeller =
    (actor.userId && order.sellerId && actor.userId === order.sellerId) ||
    (actor.walletAddress &&
      actor.walletAddress === normAddr(order.sellerWallet));

  if (isSeller) return "seller";

  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await getActor();

    if (!actor.userId && !actor.walletAddress) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const order = await prisma.storeOrder.findUnique({
      where: { id },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        buyerWallet: true,
        sellerWallet: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "ORDER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const viewerRole = getViewerRole(actor, order);

    if (!viewerRole && !actor.isSupport) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const items = await prisma.deliveryMessage.findMany({
      where: {
        orderId: order.id,
        ...(actor.isSupport ? {} : { isInternal: false }),
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        orderId: true,
        senderUserId: true,
        senderWallet: true,
        senderRole: true,
        body: true,
        isInternal: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      viewerRole: viewerRole || "unknown",
      isSupport: actor.isSupport,
      supportRole: actor.dbSupportRole || null,
      items: items.map((x) => ({
        ...x,
        createdAt: x.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[API_DELIVERY_ORDER_MESSAGES_GET_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await getActor();

    if (!actor.userId && !actor.walletAddress) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const text = clean(body?.body, 4000);
    const requestedInternal = toBool(body?.isInternal);

    if (!text) {
      return NextResponse.json(
        { ok: false, error: "MESSAGE_REQUIRED" },
        { status: 400 }
      );
    }

    const order = await prisma.storeOrder.findUnique({
      where: { id },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        buyerWallet: true,
        sellerWallet: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "ORDER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const viewerRole = getViewerRole(actor, order);

    if (!viewerRole && !actor.isSupport) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const isInternal = actor.isSupport ? requestedInternal : false;

    const senderRole: SenderRoleValue =
      actor.isSupport && !viewerRole
        ? "SUPPORT"
        : viewerRole === "buyer"
        ? "BUYER"
        : viewerRole === "seller"
        ? "SELLER"
        : "SUPPORT";

    const created = await prisma.deliveryMessage.create({
      data: {
        orderId: order.id,
        senderUserId: actor.userId || undefined,
        senderWallet: actor.walletAddress || undefined,
        senderRole,
        body: text,
        isInternal,
      },
      select: {
        id: true,
        orderId: true,
        senderUserId: true,
        senderWallet: true,
        senderRole: true,
        body: true,
        isInternal: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      item: {
        ...created,
        createdAt: created.createdAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[API_DELIVERY_ORDER_MESSAGES_POST_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}