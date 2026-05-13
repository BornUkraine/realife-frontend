import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SupportRoleValue = "USER" | "MODERATOR" | "ADMIN";

const SERVICE_FULFILLMENTS = [
  "DIGITAL_SERVICE",
  "ONLINE_SESSION",
  "LOCAL_SERVICE",
] as const;

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

function isFulfillmentOrder(order: {
  deliveryRequired: boolean;
  fulfillmentType?: string | null;
}) {
  if (order.deliveryRequired) return true;

  return SERVICE_FULFILLMENTS.includes(
    String(order.fulfillmentType || "").trim().toUpperCase() as
      | "DIGITAL_SERVICE"
      | "ONLINE_SESSION"
      | "LOCAL_SERVICE"
  );
}

async function getActor() {
  const session = await getServerSession(authOptions);

  const userId = (session as any)?.user?.id || (session as any)?.userId || null;
  const walletAddress = normAddr(
    (session as any)?.user?.walletAddress || (session as any)?.walletAddress || ""
  );

  const isAdminSession = Boolean(
    (session as any)?.user?.isAdmin || (session as any)?.isAdmin
  );
  const isAllowlistedWallet =
    !!walletAddress && ADMIN_WALLETS.includes(walletAddress);

  let dbSupportRole: SupportRoleValue | null = null;

  if (userId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { supportRole: true },
    });
    dbSupportRole = (dbUser?.supportRole as SupportRoleValue | null) || null;
  } else if (walletAddress) {
    const dbUser = await prisma.user.findFirst({
      where: { walletAddress },
      select: { supportRole: true },
    });
    dbSupportRole = (dbUser?.supportRole as SupportRoleValue | null) || null;
  }

  const isDbSupport =
    dbSupportRole === "MODERATOR" || dbSupportRole === "ADMIN";

  return {
    userId,
    walletAddress,
    isSupport: isAdminSession || isAllowlistedWallet || isDbSupport,
    dbSupportRole,
  };
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

        marketType: true,
        marketplaceContract: true,
        marketplaceListingId: true,
        marketplacePurchaseId: true,

        buyerWallet: true,
        sellerWallet: true,
        buyerId: true,
        sellerId: true,

        listingId: true,
        tradeId: true,

        amount: true,
        unitPrice: true,
        totalPrice: true,
        paymentToken: true,
        paymentSymbol: true,
        paymentDecimals: true,

        deliveryRequired: true,
        physicalItem: true,
        officialItem: true,

        fulfillmentType: true,
        serviceStatus: true,
        category: true,
        subcategory: true,

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

        buyerConfirmedAt: true,
        refundRequestedAt: true,
        nftReturnedAt: true,
        refundRejectedAt: true,

        scheduledFor: true,
        workStartedAt: true,
        submittedAt: true,
        revisionRequestedAt: true,
        completedAt: true,

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

    if (!order || !isFulfillmentOrder(order)) {
      return NextResponse.json(
        { ok: false, error: "ORDER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const viewerRole = getViewerRole(actor, order);

    if (!viewerRole && !actor.isSupport) {
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
            fulfillmentType: true,
            category: true,
            subcategory: true,
          },
        })
      : null;

    return NextResponse.json({
      ok: true,
      viewerRole: viewerRole || "unknown",
      isSupport: actor.isSupport,
      supportRole: actor.dbSupportRole || null,
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

        marketType: order.marketType || null,
        marketplaceContract: order.marketplaceContract || null,
        marketplaceListingId:
          order.marketplaceListingId != null
            ? order.marketplaceListingId.toString()
            : null,
        marketplacePurchaseId:
          order.marketplacePurchaseId != null
            ? order.marketplacePurchaseId.toString()
            : null,

        buyerWallet: order.buyerWallet,
        sellerWallet: order.sellerWallet,

        listingId: order.listingId || null,
        tradeId: order.tradeId || null,

        amount: order.amount.toString(),
        unitPrice: order.unitPrice.toString(),
        totalPrice: order.totalPrice.toString(),
        paymentToken: order.paymentToken || null,
        paymentSymbol: order.paymentSymbol || null,
        paymentDecimals: order.paymentDecimals ?? null,

        deliveryRequired: order.deliveryRequired,
        physicalItem: order.physicalItem,
        officialItem: order.officialItem,

        fulfillmentType:
          order.fulfillmentType ||
          mint?.fulfillmentType ||
          (order.deliveryRequired ? "PHYSICAL_GOOD" : null),
        serviceStatus: order.serviceStatus,
        category: order.category || mint?.category || null,
        subcategory: order.subcategory || mint?.subcategory || null,

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

        buyerConfirmedAt: order.buyerConfirmedAt
          ? order.buyerConfirmedAt.toISOString()
          : null,
        refundRequestedAt: order.refundRequestedAt
          ? order.refundRequestedAt.toISOString()
          : null,
        nftReturnedAt: order.nftReturnedAt
          ? order.nftReturnedAt.toISOString()
          : null,
        refundRejectedAt: order.refundRejectedAt
          ? order.refundRejectedAt.toISOString()
          : null,

        scheduledFor: order.scheduledFor
          ? order.scheduledFor.toISOString()
          : null,
        workStartedAt: order.workStartedAt
          ? order.workStartedAt.toISOString()
          : null,
        submittedAt: order.submittedAt
          ? order.submittedAt.toISOString()
          : null,
        revisionRequestedAt: order.revisionRequestedAt
          ? order.revisionRequestedAt.toISOString()
          : null,
        completedAt: order.completedAt
          ? order.completedAt.toISOString()
          : null,

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
