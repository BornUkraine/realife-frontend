import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ServiceAction =
  | "set_schedule"
  | "start_work"
  | "mark_submitted"
  | "mark_completed"
  | "request_revision";

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function clean(v: unknown, max = 1000) {
  return String(v || "").trim().slice(0, max);
}

function isServiceFulfillment(v?: string | null) {
  const s = String(v || "").trim().toUpperCase();
  return (
    s === "DIGITAL_SERVICE" ||
    s === "ONLINE_SESSION" ||
    s === "LOCAL_SERVICE"
  );
}

function parseSchedule(value?: string | null) {
  const s = String(value || "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function getActor() {
  const session = await getServerSession(authOptions);

  const userId = (session as any)?.user?.id || (session as any)?.userId || null;
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

function defaultMessageForAction(action: ServiceAction) {
  switch (action) {
    case "set_schedule":
      return "Seller updated the service schedule.";
    case "start_work":
      return "Seller started working on the service.";
    case "mark_submitted":
      return "Seller marked the service as submitted for buyer review.";
    case "mark_completed":
      return "Seller marked the service as completed.";
    case "request_revision":
      return "Buyer requested a revision.";
    default:
      return "Service status was updated.";
  }
}

export async function POST(
  req: Request,
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

    const body = await req.json().catch(() => null);
    const action = String(body?.action || "").trim().toLowerCase() as ServiceAction;
    const note = clean(body?.note, 1000);
    const scheduledFor = parseSchedule(body?.scheduledFor);

    const allowedActions: ServiceAction[] = [
      "set_schedule",
      "start_work",
      "mark_submitted",
      "mark_completed",
      "request_revision",
    ];

    if (!allowedActions.includes(action)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_SERVICE_ACTION" },
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

        fulfillmentType: true,
        serviceStatus: true,
        escrowStatus: true,
        deliveryStatus: true,

        scheduledFor: true,
        workStartedAt: true,
        submittedAt: true,
        revisionRequestedAt: true,
        completedAt: true,

        cancelledAt: true,
        refundedAt: true,
        releasedAt: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "ORDER_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!isServiceFulfillment(order.fulfillmentType)) {
      return NextResponse.json(
        { ok: false, error: "NOT_SERVICE_ORDER" },
        { status: 400 }
      );
    }

    const viewerRole = getViewerRole(actor, order);
    if (!viewerRole) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    if (order.cancelledAt || order.refundedAt || order.releasedAt) {
      return NextResponse.json(
        { ok: false, error: "ORDER_ALREADY_FINALIZED" },
        { status: 400 }
      );
    }

    const sellerOnlyActions: ServiceAction[] = [
      "set_schedule",
      "start_work",
      "mark_submitted",
      "mark_completed",
    ];

    if (sellerOnlyActions.includes(action) && viewerRole !== "seller") {
      return NextResponse.json(
        { ok: false, error: "ONLY_SELLER_CAN_UPDATE_SERVICE" },
        { status: 403 }
      );
    }

    if (action === "request_revision" && viewerRole !== "buyer") {
      return NextResponse.json(
        { ok: false, error: "ONLY_BUYER_CAN_REQUEST_REVISION" },
        { status: 403 }
      );
    }

    if (action === "set_schedule" && !scheduledFor) {
      return NextResponse.json(
        { ok: false, error: "SCHEDULED_FOR_REQUIRED" },
        { status: 400 }
      );
    }

    const now = new Date();

    const data: any = {};

    if (action === "set_schedule") {
      data.scheduledFor = scheduledFor;
      if (
        order.serviceStatus === "NOT_REQUIRED" ||
        order.serviceStatus === "PENDING"
      ) {
        data.serviceStatus = "PENDING";
      }
    }

    if (action === "start_work") {
      if (
        order.serviceStatus === "COMPLETED" ||
        order.serviceStatus === "CONFIRMED" ||
        order.serviceStatus === "CANCELLED"
      ) {
        return NextResponse.json(
          { ok: false, error: "SERVICE_STATUS_LOCKED" },
          { status: 400 }
        );
      }

      data.workStartedAt = order.workStartedAt || now;
      data.serviceStatus = "IN_PROGRESS";
    }

    if (action === "mark_submitted") {
      if (
        order.serviceStatus === "CONFIRMED" ||
        order.serviceStatus === "CANCELLED"
      ) {
        return NextResponse.json(
          { ok: false, error: "SERVICE_STATUS_LOCKED" },
          { status: 400 }
        );
      }

      data.submittedAt = now;
      data.serviceStatus = "SUBMITTED";
    }

    if (action === "mark_completed") {
      if (
        order.serviceStatus === "CONFIRMED" ||
        order.serviceStatus === "CANCELLED"
      ) {
        return NextResponse.json(
          { ok: false, error: "SERVICE_STATUS_LOCKED" },
          { status: 400 }
        );
      }

      data.completedAt = now;
      data.serviceStatus = "COMPLETED";
    }

    if (action === "request_revision") {
      if (
        order.serviceStatus !== "SUBMITTED" &&
        order.serviceStatus !== "COMPLETED"
      ) {
        return NextResponse.json(
          { ok: false, error: "SERVICE_NOT_READY_FOR_REVISION" },
          { status: 400 }
        );
      }

      data.revisionRequestedAt = now;
      data.serviceStatus = "REVISION_REQUESTED";
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.storeOrder.update({
        where: { id: order.id },
        data,
        select: {
          id: true,
          serviceStatus: true,
          scheduledFor: true,
          workStartedAt: true,
          submittedAt: true,
          revisionRequestedAt: true,
          completedAt: true,
          updatedAt: true,
        },
      });

      await tx.deliveryMessage.create({
        data: {
          orderId: order.id,
          senderUserId: actor.userId || undefined,
          senderWallet: actor.walletAddress || undefined,
          senderRole: viewerRole === "seller" ? "SELLER" : "BUYER",
          body: note || defaultMessageForAction(action),
          isInternal: false,
        },
      });

      return next;
    });

    return NextResponse.json({
      ok: true,
      action,
      order: {
        id: updated.id,
        serviceStatus: updated.serviceStatus,
        scheduledFor: updated.scheduledFor
          ? updated.scheduledFor.toISOString()
          : null,
        workStartedAt: updated.workStartedAt
          ? updated.workStartedAt.toISOString()
          : null,
        submittedAt: updated.submittedAt
          ? updated.submittedAt.toISOString()
          : null,
        revisionRequestedAt: updated.revisionRequestedAt
          ? updated.revisionRequestedAt.toISOString()
          : null,
        completedAt: updated.completedAt
          ? updated.completedAt.toISOString()
          : null,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[API_DELIVERY_ORDER_SERVICE_POST_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}