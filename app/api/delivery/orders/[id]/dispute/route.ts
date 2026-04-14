import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DeliveryStatus, EscrowStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function clean(v: unknown, max = 500) {
  return String(v || "").trim().slice(0, max);
}

async function getActor() {
  const session = await getServerSession(authOptions);

  const userId = (session as any)?.user?.id || (session as any)?.userId || null;
  const walletAddress = normAddr(
    (session as any)?.user?.walletAddress || (session as any)?.walletAddress || ""
  );

  return { userId, walletAddress };
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
    (actor.walletAddress && actor.walletAddress === normAddr(order.buyerWallet));

  if (isBuyer) return "buyer";

  const isSeller =
    (actor.userId && order.sellerId && actor.userId === order.sellerId) ||
    (actor.walletAddress && actor.walletAddress === normAddr(order.sellerWallet));

  if (isSeller) return "seller";

  return null;
}

function nextDeliveryStatusForDispute(
  deliveryRequired: boolean,
  current: DeliveryStatus
): DeliveryStatus {
  if (!deliveryRequired) return DeliveryStatus.NOT_REQUIRED;

  const disputeEligibleStatuses: DeliveryStatus[] = [
    DeliveryStatus.SHIPPED,
    DeliveryStatus.DELIVERED,
    DeliveryStatus.CONFIRMED,
  ];

  if (disputeEligibleStatuses.includes(current)) {
    return DeliveryStatus.RETURN_REQUESTED;
  }

  return current;
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const actor = await getActor();

    if (!actor.userId && !actor.walletAddress) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const note = clean(body?.note, 500);
    if (!note) {
      return NextResponse.json(
        { ok: false, error: "DISPUTE_NOTE_REQUIRED" },
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
        deliveryRequired: true,
        deliveryStatus: true,
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
        { status: 404 }
      );
    }

    const viewerRole = getViewerRole(actor, order);

    if (!viewerRole) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    if (isOnchainEscrowOrder(order)) {
      return NextResponse.json(
        {
          ok: false,
          error: "ONCHAIN_DISPUTE_REQUIRED",
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

    const finalizedEscrowStatuses: EscrowStatus[] = [
      EscrowStatus.RELEASED,
      EscrowStatus.REFUNDED,
      EscrowStatus.CANCELLED,
    ];

    if (finalizedEscrowStatuses.includes(order.escrowStatus)) {
      return NextResponse.json(
        { ok: false, error: "ORDER_ALREADY_FINALIZED" },
        { status: 400 }
      );
    }

    if (order.escrowStatus === EscrowStatus.DISPUTED) {
      return NextResponse.json({ ok: true, alreadyDisputed: true });
    }

    const now = new Date();

    const updated = await prisma.storeOrder.update({
      where: { id: order.id },
      data: {
        escrowStatus: EscrowStatus.DISPUTED,
        disputedAt: now,
        deliveryStatus: nextDeliveryStatusForDispute(
          order.deliveryRequired,
          order.deliveryStatus
        ),
        ...(viewerRole === "buyer" ? { noteBuyer: note } : { noteSeller: note }),
      },
      select: {
        id: true,
        escrowStatus: true,
        deliveryStatus: true,
        disputedAt: true,
        noteBuyer: true,
        noteSeller: true,
      },
    });

    return NextResponse.json({
      ok: true,
      order: {
        ...updated,
        disputedAt: updated.disputedAt ? updated.disputedAt.toISOString() : null,
      },
    });
  } catch (e) {
    console.error("[API_DELIVERY_ORDER_DISPUTE_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}
