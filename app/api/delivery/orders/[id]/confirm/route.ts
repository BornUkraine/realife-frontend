import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SERVICE_FULFILLMENTS = [
  "DIGITAL_SERVICE",
  "ONLINE_SESSION",
  "LOCAL_SERVICE",
] as const;

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function pickViewer(session: any) {
  const id = String(session?.user?.id || session?.userId || "").trim() || null;
  const wallet = normAddr(
    session?.user?.walletAddress || session?.walletAddress || ""
  );

  return {
    id,
    wallet: wallet || null,
  };
}

function isBuyer(
  viewer: { id: string | null; wallet: string | null },
  row: { buyerId: string | null; buyerWallet: string }
) {
  return Boolean(
    (viewer.id && row.buyerId && viewer.id === row.buyerId) ||
      (viewer.wallet && normAddr(row.buyerWallet) === viewer.wallet)
  );
}

function isServiceFulfillment(v?: string | null) {
  return SERVICE_FULFILLMENTS.includes(
    String(v || "").trim().toUpperCase() as
      | "DIGITAL_SERVICE"
      | "ONLINE_SESSION"
      | "LOCAL_SERVICE"
  );
}

function isOnchainEscrowOrder(row: {
  marketType?: string | null;
  sourceType?: string | null;
  marketplacePurchaseId?: bigint | null;
}) {
  return (
    row.marketType === "DELIVERY" ||
    row.marketType === "PROTECTED" ||
    (row.sourceType === "MARKETPLACE" && row.marketplacePurchaseId != null)
  );
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const viewer = pickViewer(session);

    if (!viewer.id && !viewer.wallet) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const orderId = String(id || "").trim();

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "ORDER_ID_REQUIRED" },
        { status: 400 }
      );
    }

    const order = await prisma.storeOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,

        buyerId: true,
        buyerWallet: true,

        deliveryRequired: true,
        fulfillmentType: true,
        serviceStatus: true,

        deliveryStatus: true,
        escrowStatus: true,

        deliveredAt: true,
        confirmedAt: true,
        releasedAt: true,
        completedAt: true,
        buyerConfirmedAt: true,

        sourceType: true,
        marketType: true,
        marketplaceContract: true,
        marketplacePurchaseId: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "ORDER_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!isBuyer(viewer, order)) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const onchain = isOnchainEscrowOrder(order);

    if (onchain) {
      return NextResponse.json(
        {
          ok: false,
          error: "ONCHAIN_CONFIRM_REQUIRED",
          marketType: order.marketType || null,
          marketplaceContract: order.marketplaceContract || null,
          marketplacePurchaseId:
            order.marketplacePurchaseId != null
              ? order.marketplacePurchaseId.toString()
              : null,
        },
        { status: 409 }
      );
    }

    const isPhysical = order.deliveryRequired;
    const isService = !isPhysical && isServiceFulfillment(order.fulfillmentType);
    const serviceStatus = String(order.serviceStatus || "").trim().toUpperCase();

    if (!isPhysical && !isService) {
      return NextResponse.json(
        { ok: false, error: "ORDER_NOT_CONFIRMABLE" },
        { status: 400 }
      );
    }

    if (
      order.escrowStatus === "REFUNDED" ||
      order.escrowStatus === "CANCELLED" ||
      order.escrowStatus === "DISPUTED"
    ) {
      return NextResponse.json(
        { ok: false, error: "ORDER_NOT_CONFIRMABLE" },
        { status: 400 }
      );
    }

    if (isPhysical && order.deliveryStatus === "CONFIRMED") {
      return NextResponse.json({
        ok: true,
        alreadyConfirmed: true,
        order: {
          id: order.id,
          deliveryStatus: order.deliveryStatus,
          serviceStatus: order.serviceStatus,
          escrowStatus: order.escrowStatus,
          deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
          confirmedAt: order.confirmedAt ? order.confirmedAt.toISOString() : null,
          buyerConfirmedAt: order.buyerConfirmedAt
            ? order.buyerConfirmedAt.toISOString()
            : null,
          completedAt: order.completedAt ? order.completedAt.toISOString() : null,
          releasedAt: order.releasedAt ? order.releasedAt.toISOString() : null,
        },
      });
    }

    if (isService && serviceStatus === "CONFIRMED") {
      return NextResponse.json({
        ok: true,
        alreadyConfirmed: true,
        order: {
          id: order.id,
          deliveryStatus: order.deliveryStatus,
          serviceStatus: order.serviceStatus,
          escrowStatus: order.escrowStatus,
          deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
          confirmedAt: order.confirmedAt ? order.confirmedAt.toISOString() : null,
          buyerConfirmedAt: order.buyerConfirmedAt
            ? order.buyerConfirmedAt.toISOString()
            : null,
          completedAt: order.completedAt ? order.completedAt.toISOString() : null,
          releasedAt: order.releasedAt ? order.releasedAt.toISOString() : null,
        },
      });
    }

    if (isPhysical) {
      if (
        order.deliveryStatus !== "SHIPPED" &&
        order.deliveryStatus !== "DELIVERED"
      ) {
        return NextResponse.json(
          { ok: false, error: "ORDER_NOT_SHIPPED_YET" },
          { status: 400 }
        );
      }
    }

    if (isService) {
      const confirmableServiceStatuses = ["SUBMITTED", "COMPLETED"];

      if (!confirmableServiceStatuses.includes(serviceStatus)) {
        return NextResponse.json(
          { ok: false, error: "ORDER_NOT_CONFIRMABLE" },
          { status: 400 }
        );
      }
    }

    const now = new Date();
    const shouldReleaseEscrow =
      order.escrowStatus === "PENDING" || order.escrowStatus === "FUNDED";

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.storeOrder.update({
        where: { id: order.id },
        data: {
          deliveryStatus: isPhysical ? "CONFIRMED" : order.deliveryStatus,
          deliveredAt:
            isPhysical && !order.deliveredAt ? now : order.deliveredAt,
          confirmedAt: order.confirmedAt || now,
          buyerConfirmedAt: order.buyerConfirmedAt || now,

          serviceStatus: isService ? "CONFIRMED" : order.serviceStatus,
          completedAt:
            isService && !order.completedAt ? now : order.completedAt,

          escrowStatus: shouldReleaseEscrow ? "RELEASED" : order.escrowStatus,
          releasedAt: shouldReleaseEscrow
            ? order.releasedAt || now
            : order.releasedAt,
        },
        select: {
          id: true,
          deliveryStatus: true,
          serviceStatus: true,
          escrowStatus: true,
          deliveredAt: true,
          confirmedAt: true,
          buyerConfirmedAt: true,
          completedAt: true,
          releasedAt: true,
          updatedAt: true,
        },
      });

      await tx.deliveryMessage.create({
        data: {
          orderId: order.id,
          senderUserId: viewer.id || undefined,
          senderWallet: viewer.wallet || undefined,
          senderRole: "BUYER",
          body: isPhysical
            ? shouldReleaseEscrow
              ? "Buyer confirmed successful delivery. Escrow was released."
              : "Buyer confirmed successful delivery."
            : shouldReleaseEscrow
            ? "Buyer confirmed successful service completion. Escrow was released."
            : "Buyer confirmed successful service completion.",
          isInternal: false,
        },
      });

      return next;
    });

    return NextResponse.json({
      ok: true,
      order: {
        id: updated.id,
        deliveryStatus: updated.deliveryStatus,
        serviceStatus: updated.serviceStatus,
        escrowStatus: updated.escrowStatus,
        deliveredAt: updated.deliveredAt
          ? updated.deliveredAt.toISOString()
          : null,
        confirmedAt: updated.confirmedAt
          ? updated.confirmedAt.toISOString()
          : null,
        buyerConfirmedAt: updated.buyerConfirmedAt
          ? updated.buyerConfirmedAt.toISOString()
          : null,
        completedAt: updated.completedAt
          ? updated.completedAt.toISOString()
          : null,
        releasedAt: updated.releasedAt
          ? updated.releasedAt.toISOString()
          : null,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[API_DELIVERY_ORDER_CONFIRM_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}
