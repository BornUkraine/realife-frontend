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

function isTxHash(v?: string | null) {
  const s = String(v || "").trim();
  return /^0x([A-Fa-f0-9]{64})$/.test(s);
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

    const escrowReleaseTxHash = String(body?.escrowReleaseTxHash || "").trim();
    const note = clean(body?.note, 500);

    if (escrowReleaseTxHash && !isTxHash(escrowReleaseTxHash)) {
      return NextResponse.json(
        { ok: false, error: "ESCROW_RELEASE_TX_INVALID" },
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

    if (order.escrowStatus === EscrowStatus.NOT_REQUIRED) {
      return NextResponse.json(
        { ok: false, error: "ESCROW_NOT_REQUIRED" },
        { status: 400 }
      );
    }

    if (order.escrowStatus === EscrowStatus.RELEASED) {
      return NextResponse.json({
        ok: true,
        alreadyReleased: true,
      });
    }

    if (
      order.escrowStatus === EscrowStatus.REFUNDED ||
      order.escrowStatus === EscrowStatus.CANCELLED
    ) {
      return NextResponse.json(
        { ok: false, error: "ESCROW_ALREADY_FINALIZED" },
        { status: 400 }
      );
    }

    if (
      order.deliveryRequired &&
      ![
        DeliveryStatus.CONFIRMED,
        DeliveryStatus.DELIVERED,
      ].includes(order.deliveryStatus)
    ) {
      return NextResponse.json(
        { ok: false, error: "DELIVERY_NOT_CONFIRMED" },
        { status: 400 }
      );
    }

    const now = new Date();

    const updated = await prisma.storeOrder.update({
      where: { id: order.id },
      data: {
        escrowStatus: EscrowStatus.RELEASED,
        releasedAt: now,
        escrowReleaseTxHash: escrowReleaseTxHash || undefined,
        deliveryStatus:
          order.deliveryRequired && order.deliveryStatus === DeliveryStatus.DELIVERED
            ? DeliveryStatus.CONFIRMED
            : order.deliveryStatus,
        confirmedAt:
          order.deliveryRequired && order.deliveryStatus === DeliveryStatus.DELIVERED
            ? now
            : undefined,
        ...(note
          ? viewerRole === "buyer"
            ? { noteBuyer: note }
            : { noteSeller: note }
          : {}),
      },
      select: {
        id: true,
        escrowStatus: true,
        deliveryStatus: true,
        releasedAt: true,
        confirmedAt: true,
        escrowReleaseTxHash: true,
      },
    });

    return NextResponse.json({
      ok: true,
      order: updated,
    });
  } catch (e) {
    console.error("[API_STORE_ORDER_RELEASE_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}