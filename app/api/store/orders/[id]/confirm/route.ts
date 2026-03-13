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

function pickViewer(session: any) {
  const id = String(session?.user?.id || session?.userId || "").trim() || null;
  const wallet = normAddr(session?.user?.walletAddress || session?.walletAddress || "");
  return {
    id,
    wallet: wallet || null,
  };
}

function isBuyer(viewer: { id: string | null; wallet: string | null }, row: any) {
  return Boolean(
    (viewer.id && row.buyerId && viewer.id === row.buyerId) ||
      (viewer.wallet && normAddr(row.buyerWallet) === viewer.wallet)
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
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = String(id || "").trim();

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "ORDER_ID_REQUIRED" }, { status: 400 });
    }

    const order = await prisma.storeOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        vertical: true,
        buyerId: true,
        buyerWallet: true,
        deliveryRequired: true,
        deliveryStatus: true,
        escrowStatus: true,
        deliveredAt: true,
        confirmedAt: true,
        releasedAt: true,
      },
    });

    if (!order || order.vertical !== "store") {
      return NextResponse.json({ ok: false, error: "ORDER_NOT_FOUND" }, { status: 404 });
    }

    if (!isBuyer(viewer, order)) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    if (!order.deliveryRequired) {
      return NextResponse.json(
        { ok: false, error: "DELIVERY_NOT_REQUIRED" },
        { status: 400 }
      );
    }

    if (
      order.deliveryStatus !== "SHIPPED" &&
      order.deliveryStatus !== "DELIVERED" &&
      order.deliveryStatus !== "CONFIRMED"
    ) {
      return NextResponse.json(
        { ok: false, error: "ORDER_NOT_SHIPPED_YET" },
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

    const now = new Date();

    const updated = await prisma.storeOrder.update({
      where: { id: order.id },
      data: {
        deliveryStatus: "CONFIRMED",
        deliveredAt: order.deliveredAt || now,
        confirmedAt: order.confirmedAt || now,
        escrowStatus:
          order.escrowStatus === "NOT_REQUIRED" ? "NOT_REQUIRED" : "RELEASED",
        releasedAt:
          order.escrowStatus === "NOT_REQUIRED" ? order.releasedAt : order.releasedAt || now,
      },
      select: {
        id: true,
        deliveryStatus: true,
        escrowStatus: true,
        deliveredAt: true,
        confirmedAt: true,
        releasedAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      order: {
        id: updated.id,
        deliveryStatus: updated.deliveryStatus,
        escrowStatus: updated.escrowStatus,
        deliveredAt: updated.deliveredAt ? updated.deliveredAt.toISOString() : null,
        confirmedAt: updated.confirmedAt ? updated.confirmedAt.toISOString() : null,
        releasedAt: updated.releasedAt ? updated.releasedAt.toISOString() : null,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[API_STORE_ORDER_CONFIRM_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
