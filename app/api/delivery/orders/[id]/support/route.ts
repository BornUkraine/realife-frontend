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

function getViewerRole(
  actor: { userId: string | null; walletAddress: string },
  order: { buyerId: string | null; sellerId: string | null; buyerWallet: string; sellerWallet: string }
): "BUYER" | "SELLER" | null {
  const isBuyer =
    (actor.userId && order.buyerId && actor.userId === order.buyerId) ||
    (actor.walletAddress && actor.walletAddress === normAddr(order.buyerWallet));

  if (isBuyer) return "BUYER";

  const isSeller =
    (actor.userId && order.sellerId && actor.userId === order.sellerId) ||
    (actor.walletAddress && actor.walletAddress === normAddr(order.sellerWallet));

  if (isSeller) return "SELLER";

  return null;
}

function supportPriority(order: {
  escrowStatus: string;
  deliveryStatus: string;
  serviceStatus: string;
  refundRequestedAt: Date | null;
  nftReturnedAt: Date | null;
  disputedAt: Date | null;
}) {
  const escrow = String(order.escrowStatus || "").toUpperCase();
  const delivery = String(order.deliveryStatus || "").toUpperCase();
  const service = String(order.serviceStatus || "").toUpperCase();

  if (order.nftReturnedAt || escrow === "DISPUTED") return "URGENT";
  if (order.refundRequestedAt || order.disputedAt || delivery === "RETURN_REQUESTED") return "HIGH";
  if (service === "REVISION_REQUESTED") return "HIGH";
  return "NORMAL";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await getActor();

    if (!actor.userId && !actor.walletAddress) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const note = clean(body?.note, 1000);
    if (!note) {
      return NextResponse.json({ ok: false, error: "SUPPORT_NOTE_REQUIRED" }, { status: 400 });
    }

    const order = await prisma.storeOrder.findUnique({
      where: { id },
      select: {
        id: true,
        createdAt: true,
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
        buyerId: true,
        sellerId: true,
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
      },
    });

    if (!order) {
      return NextResponse.json({ ok: false, error: "ORDER_NOT_FOUND" }, { status: 404 });
    }

    const senderRole = getViewerRole(actor, order);
    if (!senderRole) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const userMessage = await tx.deliveryMessage.create({
        data: {
          orderId: order.id,
          senderUserId: actor.userId || undefined,
          senderWallet: actor.walletAddress || undefined,
          senderRole,
          body: note,
          isInternal: false,
        },
        select: { id: true },
      });

      const systemMessage = await tx.deliveryMessage.create({
        data: {
          orderId: order.id,
          senderUserId: null,
          senderWallet: null,
          senderRole: "SYSTEM",
          body: `Support was requested by ${senderRole === "BUYER" ? "buyer" : "seller"}.`,
          isInternal: false,
        },
        select: { id: true },
      });

      const notification = await tx.adminNotification.create({
        data: {
          type: "SUPPORT_REQUEST",
          status: "UNREAD",
          priority: supportPriority(order),
          title: `Admin support requested by ${senderRole.toLowerCase()}`,
          body: note,
          orderId: order.id,
          deliveryMessageId: userMessage.id,
          actorUserId: actor.userId || null,
          actorWallet: actor.walletAddress || null,
          actorRole: senderRole,
          metadata: {
            systemMessageId: systemMessage.id,
            chainId: order.chainId,
            contract: order.contract,
            tokenId: order.tokenId,
            vertical: order.vertical,
            sourceType: order.sourceType,
            orderKind: order.orderKind,
            marketType: order.marketType,
            marketplaceContract: order.marketplaceContract,
            marketplaceListingId: order.marketplaceListingId?.toString?.() || null,
            marketplacePurchaseId: order.marketplacePurchaseId?.toString?.() || null,
            buyerWallet: order.buyerWallet,
            sellerWallet: order.sellerWallet,
            totalPrice: order.totalPrice?.toString?.() || null,
            paymentToken: order.paymentToken,
            fulfillmentType: order.fulfillmentType,
            escrowStatus: order.escrowStatus,
            deliveryStatus: order.deliveryStatus,
            serviceStatus: order.serviceStatus,
          },
        },
        select: { id: true, priority: true, status: true },
      });

      return { userMessage, systemMessage, notification };
    });

    return NextResponse.json({
      ok: true,
      notificationId: result.notification.id,
      priority: result.notification.priority,
    });
  } catch (e) {
    console.error("[API_DELIVERY_ORDER_CALL_SUPPORT_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
