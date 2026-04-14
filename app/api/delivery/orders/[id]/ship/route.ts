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

function clean(v: unknown, max = 200) {
  return String(v || "").trim().slice(0, max);
}

function normalizeUrl(v?: string | null) {
  const s = String(v || "").trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("www.")) return `https://${s}`;
  return null;
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

function isSeller(
  viewer: { id: string | null; wallet: string | null },
  row: { sellerId: string | null; sellerWallet: string }
) {
  return Boolean(
    (viewer.id && row.sellerId && viewer.id === row.sellerId) ||
      (viewer.wallet && normAddr(row.sellerWallet) === viewer.wallet)
  );
}

export async function POST(
  req: Request,
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
        sellerId: true,
        sellerWallet: true,

        deliveryRequired: true,
        fulfillmentType: true,

        deliveryStatus: true,
        escrowStatus: true,
        shippedAt: true,

        shippingName: true,
        shippingCountry: true,
        shippingCity: true,
        shippingAddress: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "ORDER_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!order.deliveryRequired) {
      return NextResponse.json(
        {
          ok: false,
          error: "FULFILLMENT_IS_NOT_PHYSICAL",
          message: "Ship route is only for PHYSICAL_GOOD orders.",
        },
        { status: 400 }
      );
    }

    if (!isSeller(viewer, order)) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    if (
      !String(order.shippingName || "").trim() ||
      !String(order.shippingCountry || "").trim() ||
      !String(order.shippingCity || "").trim() ||
      !String(order.shippingAddress || "").trim()
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "BUYER_SHIPPING_MISSING",
          message:
            "Buyer must save shipping details before seller can ship the order.",
        },
        { status: 400 }
      );
    }

    if (
      order.deliveryStatus === "CONFIRMED" ||
      order.deliveryStatus === "CANCELLED" ||
      order.deliveryStatus === "RETURNED"
    ) {
      return NextResponse.json(
        { ok: false, error: "ORDER_NOT_SHIPPABLE" },
        { status: 400 }
      );
    }

    if (
      order.escrowStatus === "REFUNDED" ||
      order.escrowStatus === "CANCELLED"
    ) {
      return NextResponse.json(
        { ok: false, error: "ORDER_NOT_SHIPPABLE" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);

    const trackingCode = clean(body?.trackingCode, 120) || null;
    const carrier = clean(body?.carrier, 80) || null;
    const trackingUrl = normalizeUrl(body?.trackingUrl) || null;

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.storeOrder.update({
        where: { id: order.id },
        data: {
          deliveryStatus: "SHIPPED",
          shippedAt: order.shippedAt || now,
          trackingCode,
          trackingUrl,
          carrier,
        },
        select: {
          id: true,
          deliveryStatus: true,
          escrowStatus: true,
          shippedAt: true,
          trackingCode: true,
          trackingUrl: true,
          carrier: true,
          updatedAt: true,
        },
      });

      await tx.deliveryMessage.create({
        data: {
          orderId: order.id,
          senderUserId: viewer.id || undefined,
          senderWallet: viewer.wallet || undefined,
          senderRole: "SELLER",
          body:
            carrier || trackingCode || trackingUrl
              ? `Seller marked the order as shipped.${
                  carrier ? ` Carrier: ${carrier}.` : ""
                }${trackingCode ? ` Tracking: ${trackingCode}.` : ""}${
                  trackingUrl ? ` Tracking URL: ${trackingUrl}` : ""
                }`
              : "Seller marked the order as shipped.",
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
        escrowStatus: updated.escrowStatus,
        shippedAt: updated.shippedAt ? updated.shippedAt.toISOString() : null,
        trackingCode: updated.trackingCode || null,
        trackingUrl: updated.trackingUrl || null,
        carrier: updated.carrier || null,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[API_DELIVERY_ORDER_SHIP_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}
