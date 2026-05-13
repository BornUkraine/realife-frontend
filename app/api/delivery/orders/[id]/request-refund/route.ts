import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function clean(v: unknown, max = 1000) {
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

function isBuyer(
  actor: { userId: string | null; walletAddress: string },
  order: { buyerId: string | null; buyerWallet: string }
) {
  return Boolean(
    (actor.userId && order.buyerId && actor.userId === order.buyerId) ||
      (actor.walletAddress &&
        actor.walletAddress === normAddr(order.buyerWallet))
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
    const note = clean(body?.note, 1000);

    if (!note) {
      return NextResponse.json(
        { ok: false, error: "REFUND_NOTE_REQUIRED" },
        { status: 400 }
      );
    }

    const order = await prisma.storeOrder.findUnique({
      where: { id },
      select: {
        id: true,
        buyerId: true,
        buyerWallet: true,

        deliveryRequired: true,
        fulfillmentType: true,
        serviceStatus: true,

        escrowStatus: true,
        deliveryStatus: true,
        disputedAt: true,

        sourceType: true,
        marketType: true,
        marketplaceContract: true,
        marketplacePurchaseId: true,
        paymentToken: true,
        paymentSymbol: true,
        paymentDecimals: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "ORDER_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!isBuyer(actor, order)) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    if (
      order.escrowStatus === "RELEASED" ||
      order.escrowStatus === "REFUNDED" ||
      order.escrowStatus === "CANCELLED"
    ) {
      return NextResponse.json(
        { ok: false, error: "ORDER_ALREADY_FINALIZED" },
        { status: 400 }
      );
    }

    const onchain = isOnchainEscrowOrder(order);
    const now = new Date();

    if (onchain) {
      const updated = await prisma.$transaction(async (tx) => {
        const next = await tx.storeOrder.update({
          where: { id: order.id },
          data: {
            noteBuyer: note,
          },
          select: {
            id: true,
            escrowStatus: true,
            deliveryStatus: true,
            serviceStatus: true,
            noteBuyer: true,
            updatedAt: true,
          },
        });

        await tx.deliveryMessage.createMany({
          data: [
            {
              orderId: order.id,
              senderUserId: actor.userId || undefined,
              senderWallet: actor.walletAddress || undefined,
              senderRole: "BUYER",
              body: note,
              isInternal: false,
            },
            {
              orderId: order.id,
              senderUserId: null,
              senderWallet: null,
              senderRole: "SYSTEM",
              body:
                "Buyer requested refund in the room. Final refund flow for this order must be executed on-chain through the protected USDC marketplace contract. Buyer must return the NFT back to the escrow contract first.",
              isInternal: false,
            },
          ],
        });

        return next;
      });

      return NextResponse.json({
        ok: true,
        onchainActionRequired: true,
        marketType: order.marketType || null,
        marketplaceContract: order.marketplaceContract || null,
        marketplacePurchaseId:
          order.marketplacePurchaseId != null
            ? order.marketplacePurchaseId.toString()
            : null,
        order: {
          id: updated.id,
          escrowStatus: updated.escrowStatus,
          deliveryStatus: updated.deliveryStatus,
          serviceStatus: updated.serviceStatus,
          noteBuyer: updated.noteBuyer,
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    }

    const nextDeliveryStatus =
      order.deliveryRequired &&
      order.deliveryStatus !== "CONFIRMED" &&
      order.deliveryStatus !== "RETURNED"
        ? "RETURN_REQUESTED"
        : order.deliveryStatus;

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.storeOrder.update({
        where: { id: order.id },
        data: {
          deliveryStatus: nextDeliveryStatus as any,
          escrowStatus:
            order.escrowStatus === "NOT_REQUIRED"
              ? "NOT_REQUIRED"
              : order.escrowStatus === "PENDING" || order.escrowStatus === "FUNDED"
              ? "DISPUTED"
              : order.escrowStatus,
          disputedAt:
            order.escrowStatus === "NOT_REQUIRED" ? order.disputedAt : now,
          refundRequestedAt: now,
          noteBuyer: note,
        },
        select: {
          id: true,
          escrowStatus: true,
          deliveryStatus: true,
          serviceStatus: true,
          disputedAt: true,
          refundRequestedAt: true,
          noteBuyer: true,
          updatedAt: true,
        },
      });

      await tx.deliveryMessage.createMany({
        data: [
          {
            orderId: order.id,
            senderUserId: actor.userId || undefined,
            senderWallet: actor.walletAddress || undefined,
            senderRole: "BUYER",
            body: note,
            isInternal: false,
          },
          {
            orderId: order.id,
            senderUserId: null,
            senderWallet: null,
            senderRole: "SYSTEM",
            body:
              "Buyer requested a refund. Support review is required before any final refund action.",
            isInternal: false,
          },
        ],
      });

      return next;
    });

    return NextResponse.json({
      ok: true,
      order: {
        id: updated.id,
        escrowStatus: updated.escrowStatus,
        deliveryStatus: updated.deliveryStatus,
        serviceStatus: updated.serviceStatus,
        disputedAt: updated.disputedAt
          ? updated.disputedAt.toISOString()
          : null,
        refundRequestedAt: updated.refundRequestedAt
          ? updated.refundRequestedAt.toISOString()
          : null,
        noteBuyer: updated.noteBuyer,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[API_DELIVERY_ORDER_REQUEST_REFUND_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}
