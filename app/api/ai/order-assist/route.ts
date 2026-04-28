import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getDeliveryGuide, guessDeliveryCountry } from "@/lib/deliveryGuides";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type AssistMode = "seller" | "buyer" | "admin_review" | "general";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

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

function asMode(v: unknown): AssistMode {
  const s = String(v || "").trim().toLowerCase();
  if (s === "seller") return "seller";
  if (s === "buyer") return "buyer";
  if (s === "admin" || s === "admin_review" || s === "support") return "admin_review";
  return "general";
}

function isServiceFulfillment(v?: string | null) {
  const s = String(v || "").trim().toUpperCase();
  return s === "DIGITAL_SERVICE" || s === "ONLINE_SESSION" || s === "LOCAL_SERVICE";
}

function isPhysicalOrder(order: { deliveryRequired?: boolean; fulfillmentType?: string | null }) {
  return Boolean(order.deliveryRequired || order.fulfillmentType === "PHYSICAL_GOOD");
}

function isOnchainEscrowOrder(order: {
  marketType?: string | null;
  sourceType?: string | null;
  marketplacePurchaseId?: bigint | string | null;
}) {
  return (
    order.marketType === "DELIVERY" ||
    order.marketType === "PROTECTED" ||
    (order.sourceType === "MARKETPLACE" && order.marketplacePurchaseId != null)
  );
}

function pickResponseText(responseData: any) {
  if (typeof responseData?.output_text === "string" && responseData.output_text) {
    return responseData.output_text;
  }

  const output = Array.isArray(responseData?.output) ? responseData.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === "string" && part.text) return part.text;
      if (typeof part?.output_text === "string" && part.output_text) return part.output_text;
    }
  }

  return "";
}

function safeJsonParse(v: string) {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

function cleanStringArray(value: unknown, maxItems = 8) {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeAssist(raw: any, fallback: ReturnType<typeof buildRuleBasedAssist>) {
  return {
    ok: true,
    mode: fallback.mode,
    source: "ai" as const,
    summary: String(raw?.summary || fallback.summary || "").trim(),
    nextSteps: cleanStringArray(raw?.nextSteps, 8).length
      ? cleanStringArray(raw?.nextSteps, 8)
      : fallback.nextSteps,
    checklist: cleanStringArray(raw?.checklist, 10).length
      ? cleanStringArray(raw?.checklist, 10)
      : fallback.checklist,
    riskFlags: cleanStringArray(raw?.riskFlags, 8).length
      ? cleanStringArray(raw?.riskFlags, 8)
      : fallback.riskFlags,
    suggestedMessage: String(raw?.suggestedMessage || fallback.suggestedMessage || "").trim(),
    deliveryGuide: fallback.deliveryGuide,
    aiError: null,
  };
}

function actorFromSession(session: any) {
  const userId = String(session?.user?.id || session?.userId || "").trim() || null;
  const wallet = normAddr(session?.user?.walletAddress || session?.walletAddress || "");
  const isAdminSession = Boolean(session?.user?.isAdmin || session?.isAdmin);

  return {
    userId,
    wallet: wallet || null,
    isAdminSession,
  };
}

async function isSupportActor(actor: {
  userId: string | null;
  wallet: string | null;
  isAdminSession: boolean;
}) {
  if (actor.isAdminSession) return true;
  if (actor.wallet && ADMIN_WALLETS.includes(actor.wallet)) return true;
  if (!actor.userId) return false;

  const dbUser = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { supportRole: true },
  });

  return dbUser?.supportRole === "MODERATOR" || dbUser?.supportRole === "ADMIN";
}

function getViewerRole(
  actor: { userId: string | null; wallet: string | null },
  order: {
    buyerId: string | null;
    sellerId: string | null;
    buyerWallet: string;
    sellerWallet: string;
  }
): "buyer" | "seller" | "unknown" {
  if (
    (actor.userId && order.buyerId && actor.userId === order.buyerId) ||
    (actor.wallet && actor.wallet === normAddr(order.buyerWallet))
  ) {
    return "buyer";
  }

  if (
    (actor.userId && order.sellerId && actor.userId === order.sellerId) ||
    (actor.wallet && actor.wallet === normAddr(order.sellerWallet))
  ) {
    return "seller";
  }

  return "unknown";
}

function statusLine(order: any) {
  const kind = isPhysicalOrder(order)
    ? "physical delivery"
    : isServiceFulfillment(order.fulfillmentType)
      ? "service fulfillment"
      : "order fulfillment";

  return `This is a ${kind} order. Escrow status is ${order.escrowStatus}. Delivery status is ${order.deliveryStatus}. Service status is ${order.serviceStatus || "NOT_REQUIRED"}.`;
}

function buildRiskFlags(order: any, messages: any[]) {
  const risks: string[] = [];
  const physical = isPhysicalOrder(order);
  const service = isServiceFulfillment(order.fulfillmentType);

  if (physical) {
    if (!order.shippingCountry || !order.shippingCity || !order.shippingAddress) {
      risks.push("Buyer shipping details look incomplete. Seller should not ship until address/phone details are clear.");
    }
    if (["SHIPPED", "DELIVERED", "CONFIRMED"].includes(order.deliveryStatus) && !order.trackingCode && !order.trackingUrl) {
      risks.push("Order is marked shipped/delivered but tracking information is missing.");
    }
    if (order.deliveryStatus === "PENDING" || order.deliveryStatus === "READY_TO_SHIP") {
      risks.push("Shipment has not been marked as shipped yet.");
    }
  }

  if (service) {
    if (["SUBMITTED", "COMPLETED"].includes(String(order.serviceStatus || "")) && !order.noteSeller) {
      risks.push("Service is submitted/completed but seller note/proof may be missing.");
    }
    if (order.serviceStatus === "REVISION_REQUESTED") {
      risks.push("Buyer requested a revision. Seller should respond with what will be fixed and when.");
    }
    if (order.serviceStatus === "PENDING" && !order.scheduledFor && order.fulfillmentType === "ONLINE_SESSION") {
      risks.push("Online session has no scheduled time yet.");
    }
  }

  if (order.refundRequestedAt) {
    risks.push("Refund has been requested. Avoid release until the issue is reviewed or resolved.");
  }

  if (order.escrowStatus === "DISPUTED") {
    risks.push("Order is disputed. Support/admin review is required before final action.");
  }

  if (isOnchainEscrowOrder(order)) {
    risks.push("Final release/refund can require on-chain wallet action through the marketplace contract.");
  }

  const recentBuyerComplaint = messages.some(
    (m) =>
      m.senderRole === "BUYER" &&
      /refund|problem|issue|not received|revision|wrong|bad|scam|cancel/i.test(String(m.body || ""))
  );
  if (recentBuyerComplaint) {
    risks.push("Recent buyer message may contain a complaint or refund/revision signal.");
  }

  return Array.from(new Set(risks)).slice(0, 8);
}

function buildSellerSteps(order: any) {
  if (isPhysicalOrder(order)) {
    if (!order.shippingCountry || !order.shippingCity || !order.shippingAddress) {
      return [
        "Ask the buyer to complete shipping details before sending the item.",
        "Confirm recipient name, phone, city, address/branch and zip if needed.",
        "After shipping, add carrier, tracking code and tracking URL in the order room.",
      ];
    }
    if (order.deliveryStatus === "PENDING" || order.deliveryStatus === "READY_TO_SHIP") {
      return [
        "Pack the item and choose a valid carrier for the destination country.",
        "Ship the item and keep proof of shipment.",
        "Add carrier, tracking code and tracking URL, then send the buyer a short update.",
      ];
    }
    if (order.deliveryStatus === "SHIPPED") {
      return [
        "Monitor tracking until delivery is visible.",
        "Answer buyer questions in the order room.",
        "Wait for buyer confirmation or support review before payout release.",
      ];
    }
  }

  if (isServiceFulfillment(order.fulfillmentType)) {
    if (order.serviceStatus === "PENDING" || order.serviceStatus === "NOT_REQUIRED") {
      return [
        "Clarify scope, timeline and expected deliverable with the buyer.",
        "Set a schedule if this is a session or time-based service.",
        "Start work only when the scope is clear.",
      ];
    }
    if (order.serviceStatus === "IN_PROGRESS") {
      return [
        "Continue work and keep the buyer updated.",
        "Prepare a clear submission with link/file/result/proof.",
        "Mark the service as submitted when the buyer can review it.",
      ];
    }
    if (order.serviceStatus === "REVISION_REQUESTED") {
      return [
        "Read the buyer revision request carefully.",
        "Reply with what will be changed and estimated timing.",
        "Submit the updated result when ready.",
      ];
    }
    if (order.serviceStatus === "SUBMITTED" || order.serviceStatus === "COMPLETED") {
      return [
        "Make sure the buyer has enough proof/result to review.",
        "Answer any final questions.",
        "Wait for buyer confirmation or revision request.",
      ];
    }
  }

  return [
    "Explain the current status to the other side.",
    "Add any missing proof or context in chat.",
    "Use support if the order cannot move forward normally.",
  ];
}

function buildBuyerSteps(order: any) {
  if (isPhysicalOrder(order)) {
    if (order.deliveryStatus === "PENDING" || order.deliveryStatus === "READY_TO_SHIP") {
      return [
        "Make sure your shipping details are complete and correct.",
        "Wait for seller to add carrier and tracking information.",
        "Ask for shipment proof if timing is unclear.",
      ];
    }
    if (order.deliveryStatus === "SHIPPED") {
      return [
        "Track the shipment using the carrier/tracking link.",
        "Confirm delivery only after receiving the item and checking it.",
        "Request support/refund only if there is a real issue or missing proof.",
      ];
    }
    if (order.deliveryStatus === "DELIVERED") {
      return [
        "Check item condition and whether it matches the order.",
        "Confirm delivery if everything is correct.",
        "Use support/refund path if the item is missing, wrong or damaged.",
      ];
    }
  }

  if (isServiceFulfillment(order.fulfillmentType)) {
    if (order.serviceStatus === "PENDING" || order.serviceStatus === "IN_PROGRESS") {
      return [
        "Clarify scope and expected result with the seller.",
        "Wait for seller to submit the work/session result.",
        "Keep questions and requirements inside the order room.",
      ];
    }
    if (order.serviceStatus === "SUBMITTED" || order.serviceStatus === "COMPLETED") {
      return [
        "Review the submitted result carefully.",
        "Confirm service completion if it matches the agreement.",
        "Request revision if the result needs fixes before confirmation.",
      ];
    }
    if (order.serviceStatus === "REVISION_REQUESTED") {
      return [
        "Wait for seller to respond to the revision request.",
        "Keep the requested changes clear and specific.",
        "Do not confirm completion until the revision is acceptable.",
      ];
    }
  }

  return [
    "Review current order status.",
    "Ask for proof or clarification if anything is unclear.",
    "Confirm only when the item/service is acceptable.",
  ];
}

function buildAdminSteps(order: any) {
  const steps = [
    "Check buyer and seller messages for scope, proof and timeline.",
    "Ask the seller for shipment/submission proof if missing.",
    "Ask the buyer for clear reason if refund/revision is requested.",
  ];

  if (isOnchainEscrowOrder(order)) {
    steps.push("For protected/delivery marketplace flow, final release/refund may need on-chain wallet action.");
  }

  if (order.refundRequestedAt || order.escrowStatus === "DISPUTED") {
    steps.push("Do not release payout until refund/dispute context is reviewed.");
  }

  return steps;
}

function buildChecklist(order: any, mode: AssistMode, guide: any) {
  if (mode === "admin_review") {
    return [
      "Check order status and timestamps.",
      "Check seller proof/submission/tracking.",
      "Check buyer complaint or confirmation readiness.",
      "Confirm whether action is off-chain DB status or on-chain contract action.",
    ];
  }

  if (isPhysicalOrder(order)) {
    return mode === "buyer"
      ? guide.buyerNotes
      : guide.sellerChecklist;
  }

  if (isServiceFulfillment(order.fulfillmentType)) {
    return mode === "buyer"
      ? [
          "Review service scope and seller result.",
          "Check links/files/session notes/proof.",
          "Confirm only if the result is acceptable.",
          "Request revision with specific changes if needed.",
        ]
      : [
          "Clarify scope, timeline and deliverable.",
          "Keep proof/result/link inside the order room.",
          "Mark submitted when buyer can review.",
          "Mark completed only when work is complete and ready for confirmation.",
        ];
  }

  return [
    "Keep communication inside the order room.",
    "Add proof before asking for confirmation.",
    "Use support path if the order gets stuck.",
  ];
}

function buildSuggestedMessage(order: any, mode: AssistMode) {
  if (mode === "buyer") {
    if (isPhysicalOrder(order)) {
      return "Hi, I will review the tracking and confirm delivery once the item arrives and matches the order. Please keep tracking/proof updated here.";
    }
    if (isServiceFulfillment(order.fulfillmentType)) {
      return "Hi, I will review the submitted work and confirm completion if everything matches the agreed scope. If changes are needed, I will describe them clearly here.";
    }
  }

  if (mode === "admin_review") {
    return "Support note: please provide any missing proof, tracking, submitted work, or specific issue details so this order can be reviewed fairly.";
  }

  if (isPhysicalOrder(order)) {
    return "Hi, I will prepare the shipment and add the carrier, tracking number and tracking link here once the item is shipped.";
  }

  if (isServiceFulfillment(order.fulfillmentType)) {
    return "Hi, I will keep the service progress updated here and submit the result/proof in this order room when it is ready for review.";
  }

  return "Hi, I will keep all fulfillment updates and proof inside this order room.";
}

function buildRuleBasedAssist(input: {
  order: any;
  messages: any[];
  mode: AssistMode;
  viewerRole: string;
}) {
  const { order, messages, mode } = input;
  const physical = isPhysicalOrder(order);
  const guideCountry = guessDeliveryCountry({
    shippingCountry: order.shippingCountry,
    serviceCountry: order.serviceCountry,
  });
  const deliveryGuide = physical ? getDeliveryGuide(guideCountry) : null;

  const nextSteps =
    mode === "buyer"
      ? buildBuyerSteps(order)
      : mode === "admin_review"
        ? buildAdminSteps(order)
        : buildSellerSteps(order);

  const checklist = buildChecklist(order, mode, deliveryGuide || getDeliveryGuide(null));
  const riskFlags = buildRiskFlags(order, messages);

  return {
    ok: true,
    mode,
    source: "rules" as const,
    summary: statusLine(order),
    nextSteps,
    checklist,
    riskFlags,
    suggestedMessage: buildSuggestedMessage(order, mode),
    deliveryGuide,
    aiError: null as string | null,
  };
}

function serializeOrderForAI(order: any, product: any) {
  return {
    id: order.id,
    createdAt: order.createdAt?.toISOString?.() || null,
    updatedAt: order.updatedAt?.toISOString?.() || null,
    sourceType: order.sourceType,
    orderKind: order.orderKind,
    vertical: order.vertical,
    marketType: order.marketType,
    chainId: order.chainId,
    contract: order.contract,
    tokenId: order.tokenId,
    buyerWallet: order.buyerWallet,
    sellerWallet: order.sellerWallet,
    amount: order.amount?.toString?.() || null,
    totalPrice: order.totalPrice?.toString?.() || null,
    paymentToken: order.paymentToken,
    deliveryRequired: order.deliveryRequired,
    physicalItem: order.physicalItem,
    officialItem: order.officialItem,
    fulfillmentType: order.fulfillmentType,
    category: order.category,
    subcategory: order.subcategory,
    serviceCountry: order.serviceCountry,
    serviceCity: order.serviceCity,
    serviceArea: order.serviceArea,
    escrowStatus: order.escrowStatus,
    deliveryStatus: order.deliveryStatus,
    serviceStatus: order.serviceStatus,
    shippedAt: order.shippedAt?.toISOString?.() || null,
    deliveredAt: order.deliveredAt?.toISOString?.() || null,
    confirmedAt: order.confirmedAt?.toISOString?.() || null,
    releasedAt: order.releasedAt?.toISOString?.() || null,
    refundedAt: order.refundedAt?.toISOString?.() || null,
    disputedAt: order.disputedAt?.toISOString?.() || null,
    refundRequestedAt: order.refundRequestedAt?.toISOString?.() || null,
    scheduledFor: order.scheduledFor?.toISOString?.() || null,
    workStartedAt: order.workStartedAt?.toISOString?.() || null,
    submittedAt: order.submittedAt?.toISOString?.() || null,
    revisionRequestedAt: order.revisionRequestedAt?.toISOString?.() || null,
    completedAt: order.completedAt?.toISOString?.() || null,
    shippingCountry: order.shippingCountry,
    shippingCity: order.shippingCity,
    shippingZip: order.shippingZip,
    hasShippingAddress: Boolean(order.shippingAddress),
    hasShippingPhone: Boolean(order.shippingPhone),
    trackingCode: order.trackingCode,
    trackingUrl: order.trackingUrl,
    carrier: order.carrier,
    noteBuyer: order.noteBuyer,
    noteSeller: order.noteSeller,
    adminNote: order.adminNote,
    marketplaceContract: order.marketplaceContract,
    marketplacePurchaseId: order.marketplacePurchaseId?.toString?.() || null,
    product,
  };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const actor = actorFromSession(session);

    if (!actor.userId && !actor.wallet) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const orderId = String(body?.orderId || "").trim();
    const mode = asMode(body?.mode);

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "ORDER_ID_REQUIRED" }, { status: 400 });
    }

    const order = await prisma.storeOrder.findUnique({
      where: { id: orderId },
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
        marketplacePurchaseId: true,
        buyerId: true,
        sellerId: true,
        buyerWallet: true,
        sellerWallet: true,
        amount: true,
        totalPrice: true,
        paymentToken: true,
        deliveryRequired: true,
        physicalItem: true,
        officialItem: true,
        fulfillmentType: true,
        serviceStatus: true,
        category: true,
        subcategory: true,
        serviceCountry: true,
        serviceCity: true,
        serviceArea: true,
        escrowStatus: true,
        deliveryStatus: true,
        shippedAt: true,
        deliveredAt: true,
        confirmedAt: true,
        releasedAt: true,
        refundedAt: true,
        disputedAt: true,
        refundRequestedAt: true,
        scheduledFor: true,
        workStartedAt: true,
        submittedAt: true,
        revisionRequestedAt: true,
        completedAt: true,
        shippingCountry: true,
        shippingCity: true,
        shippingZip: true,
        shippingAddress: true,
        shippingPhone: true,
        trackingCode: true,
        trackingUrl: true,
        carrier: true,
        noteBuyer: true,
        noteSeller: true,
        adminNote: true,
      },
    });

    if (!order) {
      return NextResponse.json({ ok: false, error: "ORDER_NOT_FOUND" }, { status: 404 });
    }

    const viewerRole = getViewerRole(actor, order);
    const support = await isSupportActor(actor);

    if (viewerRole === "unknown" && !support) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    if (mode === "admin_review" && !support && viewerRole === "unknown") {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const [messages, mint] = await Promise.all([
      prisma.deliveryMessage.findMany({
        where: {
          orderId,
          OR: support ? undefined : [{ isInternal: false }, { senderRole: "SYSTEM" }],
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          senderRole: true,
          body: true,
          isInternal: true,
          createdAt: true,
        },
      }),
      prisma.mint.findUnique({
        where: {
          chainId_contract_tokenId: {
            chainId: order.chainId,
            contract: order.contract,
            tokenId: order.tokenId,
          },
        },
        select: {
          name: true,
          metaDescription: true,
          category: true,
          subcategory: true,
          fulfillmentType: true,
          serviceCountry: true,
          serviceCity: true,
          serviceArea: true,
        },
      }),
    ]);

    const product = mint
      ? {
          name: mint.name,
          description: mint.metaDescription,
          category: mint.category,
          subcategory: mint.subcategory,
          fulfillmentType: mint.fulfillmentType,
          serviceCountry: mint.serviceCountry,
          serviceCity: mint.serviceCity,
          serviceArea: mint.serviceArea,
        }
      : null;

    const fallback = buildRuleBasedAssist({
      order,
      messages: messages.slice().reverse(),
      mode,
      viewerRole,
    });

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(fallback);
    }

    const model = process.env.OPENAI_ORDER_ASSIST_MODEL || "gpt-4.1-mini";

    const systemPrompt = `
You are Realife's AI Fulfillment Assistant for NFT-backed real-world commerce orders.

You help buyers, sellers and support understand order state, fulfillment next steps, proof/submission requirements, delivery/service checklist and risk flags.

Strict rules:
- Never say that AI can release escrow, refund money, complete an order, or decide a dispute.
- AI only explains, summarizes, suggests next human actions and flags risks.
- Final payout/refund/confirmation must be done by buyer, seller, support/admin, and/or on-chain contract logic.
- Keep output concise, practical and marketplace-friendly.
- Mention on-chain action only as a possible requirement when the order is protected/delivery/on-chain escrow.
- Do not provide legal advice.
`;

    const aiInput = {
      requestedMode: mode,
      viewerRole,
      isSupport: support,
      order: serializeOrderForAI(order, product),
      recentMessages: messages
        .slice()
        .reverse()
        .map((m) => ({
          role: m.senderRole,
          internal: m.isInternal,
          body: String(m.body || "").slice(0, 1000),
          createdAt: m.createdAt.toISOString(),
        })),
      ruleBasedFallback: fallback,
    };

    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: { type: "string" },
        nextSteps: { type: "array", items: { type: "string" } },
        checklist: { type: "array", items: { type: "string" } },
        riskFlags: { type: "array", items: { type: "string" } },
        suggestedMessage: { type: "string" },
      },
      required: ["summary", "nextSteps", "checklist", "riskFlags", "suggestedMessage"],
    };

    const openaiRes = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        store: false,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: systemPrompt.trim() }],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify(aiInput, null, 2),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "realife_order_assist",
            strict: true,
            schema,
          },
        },
      }),
    });

    const raw = await openaiRes.json().catch(() => null);
    if (!openaiRes.ok) {
      return NextResponse.json({
        ...fallback,
        aiError: raw?.error?.message || "OPENAI_ORDER_ASSIST_FAILED",
      });
    }

    const outputText = pickResponseText(raw);
    const parsed = safeJsonParse(outputText);
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({
        ...fallback,
        aiError: "OPENAI_ORDER_ASSIST_PARSE_FAILED",
      });
    }

    return NextResponse.json(normalizeAssist(parsed, fallback));
  } catch (err: any) {
    console.error("ORDER_ASSIST_ERROR", err?.message || err);
    return NextResponse.json(
      { ok: false, error: err?.message || "ORDER_ASSIST_ERROR" },
      { status: 500 }
    );
  }
}
