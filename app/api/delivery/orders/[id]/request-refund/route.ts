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

function isTxHash(v?: string | null) {
  const s = String(v || "").trim();
  return /^0x([A-Fa-f0-9]{64})$/.test(s);
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

function isProtectedMarketplaceOrder(row: {
  marketType?: string | null;
  sourceType?: string | null;
  marketplacePurchaseId?: bigint | null;
}) {
  return (
    row.marketType === "PROTECTED" ||
    (row.sourceType === "MARKETPLACE" && row.marketplacePurchaseId != null)
  );
}

function nextDeliveryStatusForRefund(deliveryRequired: boolean, current: string) {
  if (!deliveryRequired) return "NOT_REQUIRED";
  if (["SHIPPED", "DELIVERED", "CONFIRMED", "RETURN_REQUESTED"].includes(current)) {
    return "RETURNED";
  }
  if (current === "NOT_REQUIRED") return "NOT_REQUIRED";
  return "CANCELLED";
}

function nextServiceStatusForRefund(fulfillmentType?: string | null, current?: string | null) {
  const ft = String(fulfillmentType || "").trim().toUpperCase();
  const isService =
    ft === "DIGITAL_SERVICE" || ft === "ONLINE_SESSION" || ft === "LOCAL_SERVICE";
  if (!isService) return "NOT_REQUIRED";
  if (String(current || "") === "NOT_REQUIRED") return "NOT_REQUIRED";
  return "CANCELLED";
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
    const escrowRefundTxHash = String(body?.escrowRefundTxHash || "").trim();
    const note =
      clean(body?.note, 1000) ||
      (escrowRefundTxHash
        ? "Buyer returned the protected NFT and requested refund on-chain."
        : "");

    if (escrowRefundTxHash && !isTxHash(escrowRefundTxHash)) {
      return NextResponse.json(
        { ok: false, error: "ESCROW_REFUND_TX_INVALID" },
        { status: 400 }
      );
    }

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
        chainId: true,
        contract: true,
        tokenId: true,
        amount: true,
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
        protectedNftLockStatus: true,
        protectedNftPendingAmount: true,
        protectedNftCompletedAmount: true,
        protectedNftLockedAt: true,
        protectedNftCompletedAt: true,
        protectedNftUnlockedAt: true,
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
      const protectedOrder = isProtectedMarketplaceOrder(order);

      const updated = await prisma.$transaction(async (tx) => {
        const next = await tx.storeOrder.update({
          where: { id: order.id },
          data: escrowRefundTxHash
            ? {
                noteBuyer: note,
                refundRequestedAt: now,
                refundedAt: now,
                nftReturnedAt: protectedOrder ? now : undefined,
                escrowStatus: "REFUNDED",
                escrowRefundTxHash,
                deliveryStatus: nextDeliveryStatusForRefund(
                  order.deliveryRequired,
                  order.deliveryStatus
                ) as any,
                serviceStatus: nextServiceStatusForRefund(
                  order.fulfillmentType,
                  order.serviceStatus
                ) as any,
                protectedNftLockStatus: protectedOrder
                  ? "RETURNED_TO_SELLER"
                  : order.protectedNftLockStatus,
                protectedNftPendingAmount: protectedOrder
                  ? 0n
                  : order.protectedNftPendingAmount,
                protectedNftCompletedAmount: protectedOrder
                  ? 0n
                  : order.protectedNftCompletedAmount,
                protectedNftUnlockedAt: protectedOrder
                  ? order.protectedNftUnlockedAt || now
                  : order.protectedNftUnlockedAt,
              }
            : {
                noteBuyer: note,
                refundRequestedAt: now,
              },
          select: {
            id: true,
            escrowStatus: true,
            deliveryStatus: true,
            serviceStatus: true,
            noteBuyer: true,
            refundRequestedAt: true,
            refundedAt: true,
            nftReturnedAt: true,
            escrowRefundTxHash: true,
            protectedNftLockStatus: true,
            protectedNftPendingAmount: true,
            protectedNftCompletedAmount: true,
            protectedNftLockedAt: true,
            protectedNftCompletedAt: true,
            protectedNftUnlockedAt: true,
            updatedAt: true,
          },
        });

        if (escrowRefundTxHash && protectedOrder && order.buyerId) {
          await tx.$executeRaw`
            UPDATE "Holding"
            SET
              "pendingLockedAmount" = GREATEST("pendingLockedAmount" - ${order.amount}, 0),
              "updatedAt" = NOW()
            WHERE "userId" = ${order.buyerId}
              AND "chainId" = ${order.chainId}
              AND "contract" = ${order.contract}
              AND "tokenId" = ${order.tokenId}
          `;
        }

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
              body: escrowRefundTxHash
                ? "Buyer returned the protected NFT on-chain. Refund is synced and the pending protected NFT lock was cleared."
                : "Buyer requested refund in the room. Final refund flow for this order must be executed on-chain through the protected USDC marketplace contract. Buyer must return the NFT back to the escrow contract first.",
              isInternal: false,
            },
          ],
        });

        return next;
      });

      return NextResponse.json({
        ok: true,
        onchainActionRequired: !escrowRefundTxHash,
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
          refundRequestedAt: updated.refundRequestedAt
            ? updated.refundRequestedAt.toISOString()
            : null,
          refundedAt: updated.refundedAt ? updated.refundedAt.toISOString() : null,
          nftReturnedAt: updated.nftReturnedAt
            ? updated.nftReturnedAt.toISOString()
            : null,
          escrowRefundTxHash: updated.escrowRefundTxHash || null,
          protectedNftLockStatus: updated.protectedNftLockStatus,
          protectedNftPendingAmount: updated.protectedNftPendingAmount.toString(),
          protectedNftCompletedAmount: updated.protectedNftCompletedAmount.toString(),
          protectedNftLockedAt: updated.protectedNftLockedAt
            ? updated.protectedNftLockedAt.toISOString()
            : null,
          protectedNftCompletedAt: updated.protectedNftCompletedAt
            ? updated.protectedNftCompletedAt.toISOString()
            : null,
          protectedNftUnlockedAt: updated.protectedNftUnlockedAt
            ? updated.protectedNftUnlockedAt.toISOString()
            : null,
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
