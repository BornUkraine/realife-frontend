import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function envWallets(...names: string[]) {
  return names
    .flatMap((name) => String(process.env[name] || "").split(","))
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

const ADMIN_WALLETS = envWallets(
  "ADMIN_CREATE_WALLETS",
  "ADMIN_WALLETS",
  "NEXT_PUBLIC_ADMIN_CREATE_WALLETS",
  "NEXT_PUBLIC_ADMIN_WALLETS",
);

const MODERATOR_WALLETS = envWallets(
  "MODERATOR_WALLETS",
  "ADMIN_MODERATOR_WALLETS",
);

function normAddr(v?: string | null) {
  return String(v || "")
    .trim()
    .toLowerCase();
}

function clean(v: unknown, max = 500) {
  return String(v || "")
    .trim()
    .slice(0, max);
}

function isTxHash(v?: string | null) {
  const s = String(v || "").trim();
  return /^0x([A-Fa-f0-9]{64})$/.test(s);
}

async function requireSupport() {
  const session = await getServerSession(authOptions);
  const wallet = normAddr(
    (session as any)?.user?.walletAddress ||
      (session as any)?.walletAddress ||
      "",
  );
  const isAdminSession = Boolean(
    (session as any)?.user?.isAdmin || (session as any)?.isAdmin,
  );
  const isAllowlistedWallet =
    !!wallet &&
    (ADMIN_WALLETS.includes(wallet) || MODERATOR_WALLETS.includes(wallet));

  if (isAdminSession || isAllowlistedWallet) return true;

  const userId = (session as any)?.user?.id || (session as any)?.userId || null;
  if (!userId) return false;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { supportRole: true },
  });

  return dbUser?.supportRole === "MODERATOR" || dbUser?.supportRole === "ADMIN";
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

function isProtectedMarketplaceOrder(order: {
  marketType?: string | null;
  sourceType?: string | null;
  marketplacePurchaseId?: bigint | null;
}) {
  return (
    order.marketType === "PROTECTED" ||
    (order.sourceType === "MARKETPLACE" && order.marketplacePurchaseId != null)
  );
}

function isServiceFulfillment(v?: string | null) {
  const s = String(v || "")
    .trim()
    .toUpperCase();
  return (
    s === "DIGITAL_SERVICE" || s === "ONLINE_SESSION" || s === "LOCAL_SERVICE"
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const isSupport = await requireSupport();

    if (!isSupport) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    const escrowReleaseTxHash = String(body?.escrowReleaseTxHash || "").trim();
    const note = clean(body?.note, 500);

    if (escrowReleaseTxHash && !isTxHash(escrowReleaseTxHash)) {
      return NextResponse.json(
        { ok: false, error: "ESCROW_RELEASE_TX_INVALID" },
        { status: 400 },
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
        deliveryRequired: true,
        deliveryStatus: true,
        fulfillmentType: true,
        serviceStatus: true,
        escrowStatus: true,
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
        { status: 404 },
      );
    }

    const onchainEscrow = isOnchainEscrowOrder(order);

    if (onchainEscrow && !escrowReleaseTxHash) {
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
          paymentToken: order.paymentToken || null,
          paymentSymbol: order.paymentSymbol || null,
          paymentDecimals: order.paymentDecimals ?? null,
        },
        { status: 409 },
      );
    }

    if (order.escrowStatus === "NOT_REQUIRED") {
      return NextResponse.json(
        { ok: false, error: "ESCROW_NOT_REQUIRED" },
        { status: 400 },
      );
    }

    if (order.escrowStatus === "RELEASED") {
      return NextResponse.json({ ok: true, alreadyReleased: true });
    }

    if (
      order.escrowStatus === "REFUNDED" ||
      order.escrowStatus === "CANCELLED"
    ) {
      return NextResponse.json(
        { ok: false, error: "ESCROW_ALREADY_FINALIZED" },
        { status: 400 },
      );
    }

    const isPhysical = order.deliveryRequired;
    const isService =
      !isPhysical && isServiceFulfillment(order.fulfillmentType);

    if (
      !onchainEscrow &&
      isPhysical &&
      !["CONFIRMED", "DELIVERED"].includes(order.deliveryStatus)
    ) {
      return NextResponse.json(
        { ok: false, error: "DELIVERY_NOT_CONFIRMED" },
        { status: 400 },
      );
    }

    if (
      !onchainEscrow &&
      isService &&
      !["COMPLETED", "CONFIRMED"].includes(String(order.serviceStatus || ""))
    ) {
      return NextResponse.json(
        { ok: false, error: "SERVICE_NOT_COMPLETED" },
        { status: 400 },
      );
    }

    const now = new Date();
    const protectedOrder = isProtectedMarketplaceOrder(order);

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.storeOrder.update({
        where: { id: order.id },
        data: {
          escrowStatus: "RELEASED",
          releasedAt: now,
          escrowReleaseTxHash: escrowReleaseTxHash || undefined,
          deliveryStatus:
            isPhysical && order.deliveryStatus === "DELIVERED"
              ? "CONFIRMED"
              : order.deliveryStatus,
          confirmedAt:
            isPhysical && order.deliveryStatus === "DELIVERED"
              ? now
              : undefined,
          serviceStatus:
            isService && String(order.serviceStatus || "") === "COMPLETED"
              ? "CONFIRMED"
              : order.serviceStatus,
          protectedNftLockStatus: protectedOrder
            ? "COMPLETED_LOCKED"
            : order.protectedNftLockStatus,
          protectedNftPendingAmount: protectedOrder ? 0n : order.protectedNftPendingAmount,
          protectedNftCompletedAmount: protectedOrder
            ? order.amount
            : order.protectedNftCompletedAmount,
          protectedNftCompletedAt: protectedOrder
            ? order.protectedNftCompletedAt || now
            : order.protectedNftCompletedAt,
          ...(note ? { adminNote: note } : {}),
        },
        select: {
          id: true,
          escrowStatus: true,
          deliveryStatus: true,
          serviceStatus: true,
          releasedAt: true,
          confirmedAt: true,
          escrowReleaseTxHash: true,
          protectedNftLockStatus: true,
          protectedNftPendingAmount: true,
          protectedNftCompletedAmount: true,
          protectedNftLockedAt: true,
          protectedNftCompletedAt: true,
          protectedNftUnlockedAt: true,
        },
      });

      if (protectedOrder && order.buyerId) {
        await tx.$executeRaw`
          UPDATE "Holding"
          SET
            "pendingLockedAmount" = GREATEST("pendingLockedAmount" - ${order.amount}, 0),
            "completedLockedAmount" = "completedLockedAmount" + ${order.amount},
            "updatedAt" = NOW()
          WHERE "userId" = ${order.buyerId}
            AND "chainId" = ${order.chainId}
            AND "contract" = ${order.contract}
            AND "tokenId" = ${order.tokenId}
        `;
      }

      await tx.deliveryMessage.create({
        data: {
          orderId: order.id,
          senderRole: "SYSTEM",
          body: onchainEscrow
            ? "Support synced on-chain release transaction for this protected USDC escrow order."
            : "Support released escrow for this order.",
          isInternal: false,
        },
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
        escrowReleaseTxHash: updated.escrowReleaseTxHash || null,
        releasedAt: updated.releasedAt
          ? updated.releasedAt.toISOString()
          : null,
        confirmedAt: updated.confirmedAt
          ? updated.confirmedAt.toISOString()
          : null,
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
      },
    });
  } catch (e) {
    console.error("[API_DELIVERY_ORDER_RELEASE_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
