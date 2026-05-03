import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function envWallets(...names: string[]) {
  return names
    .flatMap((name) => String(process.env[name] || "").split(","))
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

const ADMIN_WALLETS = envWallets(
  "ADMIN_CREATE_WALLETS",
  "ADMIN_WALLETS",
  "NEXT_PUBLIC_ADMIN_CREATE_WALLETS",
  "NEXT_PUBLIC_ADMIN_WALLETS",
);

const MODERATOR_WALLETS = envWallets(
  "MODERATOR_WALLETS",
  "ADMIN_MODERATOR_WALLETS",
);

function normAddr(v?: string | null) {
  return String(v || "")
    .trim()
    .toLowerCase();
}

function clean(v: unknown, max = 500) {
  return String(v || "")
    .trim()
    .slice(0, max);
}

function isTxHash(v?: string | null) {
  const s = String(v || "").trim();
  return /^0x([A-Fa-f0-9]{64})$/.test(s);
}

async function requireSupport() {
  const session = await getServerSession(authOptions);
  const wallet = normAddr(
    (session as any)?.user?.walletAddress ||
      (session as any)?.walletAddress ||
      "",
  );
  const isAdminSession = Boolean(
    (session as any)?.user?.isAdmin || (session as any)?.isAdmin,
  );
  const isAllowlistedWallet =
    !!wallet &&
    (ADMIN_WALLETS.includes(wallet) || MODERATOR_WALLETS.includes(wallet));

  if (isAdminSession || isAllowlistedWallet) return true;

  const userId = (session as any)?.user?.id || (session as any)?.userId || null;
  if (!userId) return false;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { supportRole: true },
  });

  return dbUser?.supportRole === "MODERATOR" || dbUser?.supportRole === "ADMIN";
}

function nextDeliveryStatusForRefund(
  deliveryRequired: boolean,
  current: string,
): string {
  if (!deliveryRequired) return "NOT_REQUIRED";

  if (
    ["SHIPPED", "DELIVERED", "CONFIRMED", "RETURN_REQUESTED"].includes(current)
  ) {
    return "RETURNED";
  }

  if (current === "NOT_REQUIRED") return "NOT_REQUIRED";
  return "CANCELLED";
}

function nextServiceStatusForRefund(
  fulfillmentType?: string | null,
  current?: string | null,
): string {
  const ft = String(fulfillmentType || "")
    .trim()
    .toUpperCase();

  const isService =
    ft === "DIGITAL_SERVICE" ||
    ft === "ONLINE_SESSION" ||
    ft === "LOCAL_SERVICE";

  if (!isService) return "NOT_REQUIRED";
  if (String(current || "") === "NOT_REQUIRED") return "NOT_REQUIRED";
  return "CANCELLED";
}

function isOnchainEscrowOrder(order: {
  marketType?: string | null;
  sourceType?: string | null;
  marketplacePurchaseId?: bigint | null;
}) {
  return (
    order.marketType === "DELIVERY" ||
    order.marketType === "PROTECTED" ||
    (order.sourceType === "MARKETPLACE" && order.marketplacePurchaseId != null)
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const isSupport = await requireSupport();

    if (!isSupport) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    const escrowRefundTxHash = String(body?.escrowRefundTxHash || "").trim();
    const note = clean(body?.note, 500);

    if (escrowRefundTxHash && !isTxHash(escrowRefundTxHash)) {
      return NextResponse.json(
        { ok: false, error: "ESCROW_REFUND_TX_INVALID" },
        { status: 400 },
      );
    }

    const order = await prisma.storeOrder.findUnique({
      where: { id },
      select: {
        id: true,
        deliveryRequired: true,
        deliveryStatus: true,
        fulfillmentType: true,
        serviceStatus: true,
        escrowStatus: true,
        sourceType: true,
        marketType: true,
        marketplaceContract: true,
        marketplacePurchaseId: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "ORDER_NOT_FOUND" },
        { status: 404 },
      );
    }

    const onchainEscrow = isOnchainEscrowOrder(order);

    if (onchainEscrow && !escrowRefundTxHash) {
      return NextResponse.json(
        {
          ok: false,
          error: "ONCHAIN_REFUND_REQUIRED",
          marketType: order.marketType || null,
          marketplaceContract: order.marketplaceContract || null,
          marketplacePurchaseId:
            order.marketplacePurchaseId != null
              ? order.marketplacePurchaseId.toString()
              : null,
        },
        { status: 409 },
      );
    }

    if (order.escrowStatus === "REFUNDED") {
      return NextResponse.json({ ok: true, alreadyRefunded: true });
    }

    if (order.escrowStatus === "RELEASED") {
      return NextResponse.json(
        { ok: false, error: "ESCROW_ALREADY_RELEASED" },
        { status: 400 },
      );
    }

    if (order.escrowStatus === "CANCELLED") {
      return NextResponse.json(
        { ok: false, error: "ESCROW_ALREADY_CANCELLED" },
        { status: 400 },
      );
    }

    const now = new Date();
    const nextEscrowStatus =
      order.escrowStatus === "NOT_REQUIRED" ? "NOT_REQUIRED" : "REFUNDED";

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.storeOrder.update({
        where: { id: order.id },
        data: {
          escrowStatus: nextEscrowStatus as any,
          refundedAt: now,
          escrowRefundTxHash: escrowRefundTxHash || undefined,
          deliveryStatus: nextDeliveryStatusForRefund(
            order.deliveryRequired,
            order.deliveryStatus,
          ) as any,
          serviceStatus: nextServiceStatusForRefund(
            order.fulfillmentType,
            order.serviceStatus,
          ) as any,
          ...(note ? { adminNote: note } : {}),
        },
        select: {
          id: true,
          escrowStatus: true,
          deliveryStatus: true,
          serviceStatus: true,
          refundedAt: true,
          escrowRefundTxHash: true,
        },
      });

      await tx.deliveryMessage.create({
        data: {
          orderId: order.id,
          senderRole: "SYSTEM",
          body: onchainEscrow
            ? "Support synced on-chain refund transaction for this protected escrow order."
            : nextEscrowStatus === "NOT_REQUIRED"
              ? "Support marked this official store order as refunded."
              : "Support executed final refund for this order.",
          isInternal: false,
        },
      });

      return next;
    });

    return NextResponse.json({
      ok: true,
      order: {
        ...updated,
        refundedAt: updated.refundedAt
          ? updated.refundedAt.toISOString()
          : null,
      },
    });
  } catch (e) {
    console.error("[API_DELIVERY_ORDER_REFUND_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
