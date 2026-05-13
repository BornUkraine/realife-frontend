// app/api/delivery/orders/[id]/mark-read/route.ts
//
// Явная отметка "я прочитал все сообщения по этому заказу".
// Полезно когда клиент хочет сбросить unread badge без полного GET messages.

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

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    const userId =
      (session as any)?.user?.id || (session as any)?.userId || null;
    const walletAddress = normAddr(
      (session as any)?.user?.walletAddress ||
        (session as any)?.walletAddress ||
        ""
    );

    if (!userId && !walletAddress) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
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
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "ORDER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const isBuyer =
      (userId && order.buyerId && userId === order.buyerId) ||
      (walletAddress && walletAddress === normAddr(order.buyerWallet));

    const isSeller =
      (userId && order.sellerId && userId === order.sellerId) ||
      (walletAddress && walletAddress === normAddr(order.sellerWallet));

    if (!isBuyer && !isSeller) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const now = new Date();

    await prisma.storeOrder.update({
      where: { id: order.id },
      data: isBuyer
        ? { buyerLastReadAt: now }
        : { sellerLastReadAt: now },
    });

    return NextResponse.json({ ok: true, lastReadAt: now.toISOString() });
  } catch (e) {
    console.error("[API_DELIVERY_ORDER_MARK_READ_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}
