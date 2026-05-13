// app/api/delivery/orders/route.ts
//
// Изменения по сравнению со старой версией:
//   1. Из БД дополнительно выбираем buyerLastReadAt / sellerLastReadAt.
//   2. Для каждого заказа считаем unreadCount — количество сообщений
//      от ДРУГОЙ стороны, у которых createdAt > viewerLastReadAt.
//   3. unreadCount и lastReadAt отдаём в JSON ответе.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SERVICE_FULFILLMENTS = [
  "DIGITAL_SERVICE",
  "ONLINE_SESSION",
  "LOCAL_SERVICE",
] as const;

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
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

function isBuyer(
  viewer: { id: string | null; wallet: string | null },
  row: any
) {
  return Boolean(
    (viewer.id && row.buyerId && viewer.id === row.buyerId) ||
      (viewer.wallet && normAddr(row.buyerWallet) === viewer.wallet)
  );
}

function isSeller(
  viewer: { id: string | null; wallet: string | null },
  row: any
) {
  return Boolean(
    (viewer.id && row.sellerId && viewer.id === row.sellerId) ||
      (viewer.wallet && normAddr(row.sellerWallet) === viewer.wallet)
  );
}

function isFulfillmentOrderRow(row: {
  deliveryRequired: boolean;
  fulfillmentType?: string | null;
}) {
  if (row.deliveryRequired) return true;

  return SERVICE_FULFILLMENTS.includes(
    String(row.fulfillmentType || "").trim().toUpperCase() as
      | "DIGITAL_SERVICE"
      | "ONLINE_SESSION"
      | "LOCAL_SERVICE"
  );
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const viewer = pickViewer(session);

    if (!viewer.id && !viewer.wallet) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);

    const roleRaw = String(url.searchParams.get("role") || "all").toLowerCase();
    const role = roleRaw === "buyer" || roleRaw === "seller" ? roleRaw : "all";

    const vertical =
      String(url.searchParams.get("vertical") || "").trim().toLowerCase() ||
      null;

    const sourceTypeRaw = String(url.searchParams.get("sourceType") || "")
      .trim()
      .toUpperCase();
    const sourceType =
      sourceTypeRaw === "STORE" || sourceTypeRaw === "MARKETPLACE"
        ? sourceTypeRaw
        : null;

    const orderKindRaw = String(url.searchParams.get("orderKind") || "")
      .trim()
      .toUpperCase();
    const orderKind =
      orderKindRaw === "PRIMARY" || orderKindRaw === "SECONDARY"
        ? orderKindRaw
        : null;

    const marketTypeRaw = String(url.searchParams.get("marketType") || "")
      .trim()
      .toUpperCase();
    const marketType =
      marketTypeRaw === "STANDARD" ||
      marketTypeRaw === "DELIVERY" ||
      marketTypeRaw === "PROTECTED"
        ? marketTypeRaw
        : null;

    const fulfillmentTypeRaw = String(
      url.searchParams.get("fulfillmentType") || ""
    )
      .trim()
      .toUpperCase();

    const fulfillmentType =
      fulfillmentTypeRaw === "PHYSICAL_GOOD" ||
      fulfillmentTypeRaw === "DIGITAL_SERVICE" ||
      fulfillmentTypeRaw === "ONLINE_SESSION" ||
      fulfillmentTypeRaw === "LOCAL_SERVICE"
        ? fulfillmentTypeRaw
        : null;

    const take = clamp(Number(url.searchParams.get("take") || "50"), 1, 100);

    const buyerClauses: any[] = [];
    const sellerClauses: any[] = [];

    if (viewer.id) {
      buyerClauses.push({ buyerId: viewer.id });
      sellerClauses.push({ sellerId: viewer.id });
    }

    if (viewer.wallet) {
      buyerClauses.push({ buyerWallet: viewer.wallet });
      sellerClauses.push({ sellerWallet: viewer.wallet });
    }

    const filters: any[] = [
      {
        OR: [
          { deliveryRequired: true },
          { fulfillmentType: { in: [...SERVICE_FULFILLMENTS] } },
        ],
      },
    ];

    if (vertical) filters.push({ vertical });
    if (sourceType) filters.push({ sourceType });
    if (orderKind) filters.push({ orderKind });
    if (marketType) filters.push({ marketType });
    if (fulfillmentType) filters.push({ fulfillmentType });

    if (role === "buyer") {
      filters.push({ OR: buyerClauses });
    } else if (role === "seller") {
      filters.push({ OR: sellerClauses });
    } else {
      filters.push({ OR: [...buyerClauses, ...sellerClauses] });
    }

    const where = { AND: filters };

    const rows = await prisma.storeOrder.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
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

        // ─── НОВЫЕ ПОЛЯ для unread tracking ───
        buyerLastReadAt: true,
        sellerLastReadAt: true,
      },
    });

    const fulfilmentRows = rows.filter((row) =>
      isFulfillmentOrderRow({
        deliveryRequired: row.deliveryRequired,
        fulfillmentType: row.fulfillmentType,
      })
    );

    // ─── Считаем unreadCount для каждого заказа одним батч-запросом ─────────
    // Для каждого заказа: сообщения с createdAt > viewerLastReadAt
    // от ДРУГОЙ стороны (senderRole != viewerRole) и не internal.
    const unreadByOrderId = new Map<string, number>();

    if (fulfilmentRows.length > 0) {
      const unreadQueries = fulfilmentRows.map((row) => {
        const viewerIsBuyer = isBuyer(viewer, row);
        const viewerIsSeller = !viewerIsBuyer && isSeller(viewer, row);

        if (!viewerIsBuyer && !viewerIsSeller) {
          return Promise.resolve({ id: row.id, count: 0 });
        }

        const lastReadAt = viewerIsBuyer
          ? row.buyerLastReadAt
          : row.sellerLastReadAt;

        const otherSenderRole = viewerIsBuyer ? "SELLER" : "BUYER";

        return prisma.deliveryMessage
          .count({
            where: {
              orderId: row.id,
              isInternal: false,
              senderRole: otherSenderRole,
              ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
            },
          })
          .then((count) => ({ id: row.id, count }))
          .catch(() => ({ id: row.id, count: 0 }));
      });

      const unreadResults = await Promise.all(unreadQueries);
      for (const r of unreadResults) unreadByOrderId.set(r.id, r.count);
    }

    const items = await Promise.all(
      fulfilmentRows.map(async (row) => {
        const product = await prisma.realMarketingProduct.findUnique({
          where: {
            chainId_contract_tokenId: {
              chainId: row.chainId,
              contract: row.contract,
              tokenId: row.tokenId,
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
                  chainId: row.chainId,
                  contract: row.contract,
                  tokenId: row.tokenId,
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

        const viewerRole = isBuyer(viewer, row)
          ? "buyer"
          : isSeller(viewer, row)
          ? "seller"
          : "unknown";

        const viewerLastReadAt =
          viewerRole === "buyer"
            ? row.buyerLastReadAt
            : viewerRole === "seller"
            ? row.sellerLastReadAt
            : null;

        return {
          id: row.id,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),

          chainId: row.chainId,
          contract: row.contract,
          tokenId: row.tokenId,

          sourceType: row.sourceType,
          orderKind: row.orderKind,
          vertical: row.vertical,

          marketType: row.marketType || null,
          marketplaceContract: row.marketplaceContract || null,
          marketplaceListingId:
            row.marketplaceListingId != null
              ? row.marketplaceListingId.toString()
              : null,
          marketplacePurchaseId:
            row.marketplacePurchaseId != null
              ? row.marketplacePurchaseId.toString()
              : null,

          buyerWallet: row.buyerWallet,
          sellerWallet: row.sellerWallet,

          listingId: row.listingId || null,
          tradeId: row.tradeId || null,

          amount: row.amount.toString(),
          unitPrice: row.unitPrice.toString(),
          totalPrice: row.totalPrice.toString(),
          paymentToken: row.paymentToken || null,
          paymentSymbol: row.paymentSymbol || null,
          paymentDecimals: row.paymentDecimals ?? null,

          deliveryRequired: row.deliveryRequired,
          physicalItem: row.physicalItem,
          officialItem: row.officialItem,

          fulfillmentType:
            row.fulfillmentType ||
            mint?.fulfillmentType ||
            (row.deliveryRequired ? "PHYSICAL_GOOD" : null),
          serviceStatus: row.serviceStatus,
          category: row.category || mint?.category || null,
          subcategory: row.subcategory || mint?.subcategory || null,

          escrowStatus: row.escrowStatus,
          deliveryStatus: row.deliveryStatus,

          escrowFundedAt: row.escrowFundedAt
            ? row.escrowFundedAt.toISOString()
            : null,
          shippedAt: row.shippedAt ? row.shippedAt.toISOString() : null,
          deliveredAt: row.deliveredAt
            ? row.deliveredAt.toISOString()
            : null,
          confirmedAt: row.confirmedAt ? row.confirmedAt.toISOString() : null,
          releasedAt: row.releasedAt ? row.releasedAt.toISOString() : null,
          refundedAt: row.refundedAt ? row.refundedAt.toISOString() : null,
          disputedAt: row.disputedAt ? row.disputedAt.toISOString() : null,
          cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,

          buyerConfirmedAt: row.buyerConfirmedAt
            ? row.buyerConfirmedAt.toISOString()
            : null,
          refundRequestedAt: row.refundRequestedAt
            ? row.refundRequestedAt.toISOString()
            : null,
          nftReturnedAt: row.nftReturnedAt
            ? row.nftReturnedAt.toISOString()
            : null,
          refundRejectedAt: row.refundRejectedAt
            ? row.refundRejectedAt.toISOString()
            : null,

          scheduledFor: row.scheduledFor
            ? row.scheduledFor.toISOString()
            : null,
          workStartedAt: row.workStartedAt
            ? row.workStartedAt.toISOString()
            : null,
          submittedAt: row.submittedAt
            ? row.submittedAt.toISOString()
            : null,
          revisionRequestedAt: row.revisionRequestedAt
            ? row.revisionRequestedAt.toISOString()
            : null,
          completedAt: row.completedAt
            ? row.completedAt.toISOString()
            : null,

          shippingName: row.shippingName || null,
          shippingPhone: row.shippingPhone || null,
          shippingCountry: row.shippingCountry || null,
          shippingCity: row.shippingCity || null,
          shippingAddress: row.shippingAddress || null,
          shippingZip: row.shippingZip || null,

          trackingCode: row.trackingCode || null,
          trackingUrl: row.trackingUrl || null,
          carrier: row.carrier || null,

          buyTxHash: row.buyTxHash || null,
          escrowReleaseTxHash: row.escrowReleaseTxHash || null,
          escrowRefundTxHash: row.escrowRefundTxHash || null,

          noteBuyer: row.noteBuyer || null,
          noteSeller: row.noteSeller || null,
          adminNote: row.adminNote || null,

          viewerRole,

          // ─── НОВЫЕ ПОЛЯ для unread tracking ───
          unreadCount: unreadByOrderId.get(row.id) || 0,
          lastReadAt: viewerLastReadAt
            ? viewerLastReadAt.toISOString()
            : null,

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
                vertical: row.vertical || null,
                deliveryEnabled: mint.deliveryEnabled,
                physicalItemIncluded: mint.physicalItemIncluded,
                officialItem: mint.officialItem,
                primarySellerWallet: null,
              }
            : null,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      total: items.length,
      items,
    });
  } catch (e) {
    console.error("[API_DELIVERY_ORDERS_GET_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}
