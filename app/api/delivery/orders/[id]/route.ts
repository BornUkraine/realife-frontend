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

export async function GET(
  _req: Request,
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

    const order = await prisma.storeOrder.findUnique({
      where: { id },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,

        chainId: true,
        contract: true,
        tokenId: true,

        sourceType: true,
        orderKind: true,
        vertical: true,

        buyerWallet: true,
        sellerWallet: true,
        buyerId: true,
        sellerId: true,

        listingId: true,
        tradeId: true,
        marketplaceListingId: true,

        amount: true,
        unitPrice: true,
        totalPrice: true,
        paymentToken: true,

        deliveryRequired: true,
        physicalItem: true,
        officialItem: true,

        escrowStatus: true,
        deliveryStatus: true,

        escrowFundedAt: true,
        shippedAt: true,
        deliveredAt: true,
        confirmedAt: true,
        releasedAt: true,
        refundedAt: true,
        disputedAt: true,
        cancelledAt: true,

        shippingName: true,
        shippingPhone: true,
        shippingCountry: true,
        shippingCity: true,
        shippingAddress: true,
        shippingZip: true,

        trackingCode: true,
        trackingUrl: true,
        carrier: true,

        buyTxHash: true,
        escrowReleaseTxHash: true,
        escrowRefundTxHash: true,

        noteBuyer: true,
        noteSeller: true,
        adminNote: true,
      },
    });

    if (!order || !order.deliveryRequired) {
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

    const product = await prisma.realMarketingProduct.findUnique({
      where: {
        chainId_contract_tokenId: {
          chainId: order.chainId,
          contract: order.contract,
          tokenId: order.tokenId,
        },
      },
      select: {
        name: true,
        image: true,
        tokenUri: true,
        vertical: true,
        deliveryEnabled: true,
        physicalItemIncluded: true,
        officialItem: true,
        primarySellerWallet: true,
      },
    });

    const mint = !product
      ? await prisma.mint.findUnique({
          where: {
            chainId_contract_tokenId: {
              chainId: order.chainId,
              contract: order.contract,
              tokenId: order.tokenId,
            },
          },
          select: {
            name: true,
            image: true,
            tokenUri: true,
            deliveryEnabled: true,
            physicalItemIncluded: true,
            officialItem: true,
          },
        })
      : null;

    return NextResponse.json({
      ok: true,
      viewerRole,
      order: {
        id: order.id,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),

        chainId: order.chainId,
        contract: order.contract,
        tokenId: order.tokenId,

        sourceType: order.sourceType,
        orderKind: order.orderKind,
        vertical: order.vertical,

        buyerWallet: order.buyerWallet,
        sellerWallet: order.sellerWallet,

        listingId: order.listingId || null,
        tradeId: order.tradeId || null,
        marketplaceListingId:
          order.marketplaceListingId != null
            ? order.marketplaceListingId.toString()
            : null,

        amount: order.amount.toString(),
        unitPrice: order.unitPrice.toString(),
        totalPrice: order.totalPrice.toString(),
        paymentToken: order.paymentToken || null,

        deliveryRequired: order.deliveryRequired,
        physicalItem: order.physicalItem,
        officialItem: order.officialItem,

        escrowStatus: order.escrowStatus,
        deliveryStatus: order.deliveryStatus,

        escrowFundedAt: order.escrowFundedAt
          ? order.escrowFundedAt.toISOString()
          : null,
        shippedAt: order.shippedAt ? order.shippedAt.toISOString() : null,
        deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
        confirmedAt: order.confirmedAt ? order.confirmedAt.toISOString() : null,
        releasedAt: order.releasedAt ? order.releasedAt.toISOString() : null,
        refundedAt: order.refundedAt ? order.refundedAt.toISOString() : null,
        disputedAt: order.disputedAt ? order.disputedAt.toISOString() : null,
        cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,

        shippingName: order.shippingName || null,
        shippingPhone: order.shippingPhone || null,
        shippingCountry: order.shippingCountry || null,
        shippingCity: order.shippingCity || null,
        shippingAddress: order.shippingAddress || null,
        shippingZip: order.shippingZip || null,

        trackingCode: order.trackingCode || null,
        trackingUrl: order.trackingUrl || null,
        carrier: order.carrier || null,

        buyTxHash: order.buyTxHash || null,
        escrowReleaseTxHash: order.escrowReleaseTxHash || null,
        escrowRefundTxHash: order.escrowRefundTxHash || null,

        noteBuyer: order.noteBuyer || null,
        noteSeller: order.noteSeller || null,
        adminNote: order.adminNote || null,

        product: product
          ? {
              name: product.name || null,
              image: product.image || null,
              tokenUri: product.tokenUri || null,
              vertical: product.vertical || null,
              deliveryEnabled: product.deliveryEnabled,
              physicalItemIncluded: product.physicalItemIncluded,
              officialItem: product.officialItem,
              primarySellerWallet: product.primarySellerWallet || null,
            }
          : mint
          ? {
              name: mint.name || null,
              image: mint.image || null,
              tokenUri: mint.tokenUri || null,
              vertical: order.vertical || null,
              deliveryEnabled: mint.deliveryEnabled,
              physicalItemIncluded: mint.physicalItemIncluded,
              officialItem: mint.officialItem,
              primarySellerWallet: null,
            }
          : null,
      },
    });
  } catch (e) {
    console.error("[API_DELIVERY_ORDER_GET_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}