import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DeliveryStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function clean(v: unknown, max = 300) {
  return String(v || "").trim().slice(0, max);
}

async function getActor() {
  const session = await getServerSession(authOptions);

  const userId =
    (session as any)?.user?.id ||
    (session as any)?.userId ||
    null;

  let walletAddress = normAddr(
    (session as any)?.user?.walletAddress ||
      (session as any)?.walletAddress ||
      ""
  );

  if (!walletAddress && userId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true },
    });

    walletAddress = normAddr(dbUser?.walletAddress || "");
  }

  return { userId, walletAddress };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orderId = String(id || "").trim();

  if (!orderId) {
    return NextResponse.json(
      { ok: false, error: "BAD_ID" },
      { status: 400 }
    );
  }

  const actor = await getActor();
  if (!actor.userId && !actor.walletAddress) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "BAD_JSON" },
      { status: 400 }
    );
  }

  const shippingName = clean((body as any).shippingName, 120);
  const shippingPhone = clean((body as any).shippingPhone, 60);
  const shippingCountry = clean((body as any).shippingCountry, 120);
  const shippingCity = clean((body as any).shippingCity, 120);
  const shippingAddress = clean((body as any).shippingAddress, 300);
  const shippingZip = clean((body as any).shippingZip, 40);

  if (!shippingName || !shippingCountry || !shippingCity || !shippingAddress) {
    return NextResponse.json(
      {
        ok: false,
        error: "MISSING_SHIPPING_FIELDS",
        message:
          "shippingName, shippingCountry, shippingCity and shippingAddress are required.",
      },
      { status: 400 }
    );
  }

  try {
    const order = await prisma.storeOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        buyerId: true,
        buyerWallet: true,
        deliveryRequired: true,
        deliveryStatus: true,
        shippingName: true,
        shippingPhone: true,
        shippingCountry: true,
        shippingCity: true,
        shippingAddress: true,
        shippingZip: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const buyerById =
      !!actor.userId &&
      !!order.buyerId &&
      actor.userId === order.buyerId;

    const buyerByWallet =
      !!actor.walletAddress &&
      !!order.buyerWallet &&
      actor.walletAddress === normAddr(order.buyerWallet);

    if (!buyerById && !buyerByWallet) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    if (!order.deliveryRequired) {
      return NextResponse.json(
        {
          ok: false,
          error: "DELIVERY_NOT_REQUIRED",
        },
        { status: 400 }
      );
    }

    if (
      order.deliveryStatus === DeliveryStatus.SHIPPED ||
      order.deliveryStatus === DeliveryStatus.DELIVERED ||
      order.deliveryStatus === DeliveryStatus.CONFIRMED ||
      order.deliveryStatus === DeliveryStatus.CANCELLED ||
      order.deliveryStatus === DeliveryStatus.RETURNED
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "ORDER_LOCKED",
          message: "Shipping details can no longer be edited for this order.",
        },
        { status: 400 }
      );
    }

    const nextDeliveryStatus =
      order.deliveryStatus === DeliveryStatus.PENDING
        ? DeliveryStatus.READY_TO_SHIP
        : order.deliveryStatus;

    const updated = await prisma.storeOrder.update({
      where: { id: order.id },
      data: {
        shippingName,
        shippingPhone: shippingPhone || null,
        shippingCountry,
        shippingCity,
        shippingAddress,
        shippingZip: shippingZip || null,
        deliveryStatus: nextDeliveryStatus,
      },
      select: {
        id: true,
        shippingName: true,
        shippingPhone: true,
        shippingCountry: true,
        shippingCity: true,
        shippingAddress: true,
        shippingZip: true,
        deliveryStatus: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      order: {
        id: updated.id,
        shippingName: updated.shippingName,
        shippingPhone: updated.shippingPhone,
        shippingCountry: updated.shippingCountry,
        shippingCity: updated.shippingCity,
        shippingAddress: updated.shippingAddress,
        shippingZip: updated.shippingZip,
        deliveryStatus: updated.deliveryStatus,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[DELIVERY_ORDER_SAVE_SHIPPING_ERROR]", e);

    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}