import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ADMIN_WALLETS = (
  process.env.ADMIN_CREATE_WALLETS ||
  process.env.ADMIN_WALLETS ||
  process.env.NEXT_PUBLIC_ADMIN_CREATE_WALLETS ||
  process.env.NEXT_PUBLIC_ADMIN_WALLETS ||
  ""
)
  .split(",")
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);

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

async function requireSupport() {
  const session = await getServerSession(authOptions);
  const wallet = normAddr(
    (session as any)?.user?.walletAddress || (session as any)?.walletAddress || ""
  );
  const isAdminSession = Boolean((session as any)?.user?.isAdmin || (session as any)?.isAdmin);
  const isAllowlistedWallet = !!wallet && ADMIN_WALLETS.includes(wallet);
  return isAdminSession || isAllowlistedWallet;
}

function isOnchainDeliveryOrder(order: {
  marketType?: string | null;
  sourceType?: string | null;
  marketplacePurchaseId?: bigint | null;
}) {
  return (
    order.marketType === "DELIVERY" ||
    (order.sourceType === "MARKETPLACE" && order.marketplacePurchaseId != null)
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const isSupport = await requireSupport();

    if (!isSupport) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
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
      return NextResponse.json({ ok: false, error: "ORDER_NOT_FOUND" }, { status: 404 });
    }

    if (isOnchainDeliveryOrder(order)) {
      return NextResponse.json(
        {
          ok: false,
          error: "ONCHAIN_RELEASE_REQUIRED",
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

    if (order.escrowStatus === "NOT_REQUIRED") {
      return NextResponse.json({ ok: false, error: "ESCROW_NOT_REQUIRED" }, { status: 400 });
    }

    if (order.escrowStatus === "RELEASED") {
      return NextResponse.json({ ok: true, alreadyReleased: true });
    }

    if (order.escrowStatus === "REFUNDED" || order.escrowStatus === "CANCELLED") {
      return NextResponse.json({ ok: false, error: "ESCROW_ALREADY_FINALIZED" }, { status: 400 });
    }

    if (order.deliveryRequired && !["CONFIRMED", "DELIVERED"].includes(order.deliveryStatus)) {
      return NextResponse.json({ ok: false, error: "DELIVERY_NOT_CONFIRMED" }, { status: 400 });
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.storeOrder.update({
        where: { id: order.id },
        data: {
          escrowStatus: "RELEASED",
          releasedAt: now,
          escrowReleaseTxHash: escrowReleaseTxHash || undefined,
          deliveryStatus:
            order.deliveryRequired && order.deliveryStatus === "DELIVERED"
              ? "CONFIRMED"
              : order.deliveryStatus,
          confirmedAt:
            order.deliveryRequired && order.deliveryStatus === "DELIVERED"
              ? now
              : undefined,
          ...(note ? { adminNote: note } : {}),
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

      await tx.deliveryMessage.create({
        data: {
          orderId: order.id,
          senderRole: "SYSTEM",
          body: "Support released escrow for this order.",
          isInternal: false,
        },
      });

      return next;
    });

    return NextResponse.json({
      ok: true,
      order: {
        ...updated,
        releasedAt: updated.releasedAt ? updated.releasedAt.toISOString() : null,
        confirmedAt: updated.confirmedAt ? updated.confirmedAt.toISOString() : null,
      },
    });
  } catch (e) {
    console.error("[API_DELIVERY_ORDER_RELEASE_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}