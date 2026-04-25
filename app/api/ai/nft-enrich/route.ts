import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMintMeta } from "@/lib/mintMetaCache";
import { ipfsToHttp } from "@/lib/ipfs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const AI_ALLOWED_CATEGORIES = [
  "Art / Collectible",
  "Creative & Design",
  "Marketing",
  "AI & Automation",
  "Development & Tech",
  "Business & Professional Services",
  "Education & Coaching",
  "Health & Wellness",
  "Beauty & Personal Care",
  "Home & Repair",
  "Travel & Tours",
  "Events & Tickets",
  "Logistics & Delivery",
  "Clothing & Merch",
  "Accessories & Jewelry",
  "Electronics & Gadgets",
  "Home & Decor",
  "Food & Beverage",
  "Sports & Outdoor",
  "Automotive",
  "Pet Products & Services",
  "Collectible Product",
  "Other Product",
  "Other Service",
  "Other",
] as const;

type EnrichBody = {
  chainId?: number | string | null;
  contract?: string | null;
  tokenId?: string | number | bigint | null;
  force?: boolean | string | number | null;
};

function toInt(v: unknown) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function normAddr(v: unknown) {
  const s = String(v || "").trim().toLowerCase();
  if (!s) return null;
  if (!/^0x[a-f0-9]{40}$/.test(s)) return null;
  return s;
}

function normTokenId(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (!/^\d+$/.test(s)) return null;
  return s;
}

function toBool(v: unknown) {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function safeText(v: unknown, max = 2000) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function safeShort(v: unknown, max = 120) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function safeConfidence(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

function normalizeTags(v: unknown) {
  if (!Array.isArray(v)) return [];

  return Array.from(
    new Set(
      v
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .map((x) => (x.length > 48 ? x.slice(0, 48) : x))
    )
  ).slice(0, 24);
}

function pickResponseText(responseData: any) {
  if (
    typeof responseData?.output_text === "string" &&
    responseData.output_text.trim()
  ) {
    return responseData.output_text.trim();
  }

  const output = Array.isArray(responseData?.output) ? responseData.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === "string" && part.text.trim()) {
        return part.text.trim();
      }
      if (typeof part?.output_text === "string" && part.output_text.trim()) {
        return part.output_text.trim();
      }
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

async function fetchOpenAIJson(payload: any) {
  const controller = new AbortController();
  const timeoutMs = Math.max(
    20_000,
    Math.min(Number(process.env.OPENAI_NFT_ENRICH_TIMEOUT_MS || 90_000), 120_000)
  );

  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const r = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await r.text();

    if (!r.ok) {
      let message = text;
      try {
        const parsed = JSON.parse(text);
        message =
          parsed?.error?.message ||
          parsed?.message ||
          text ||
          `OpenAI request failed with status ${r.status}`;
      } catch {
        // keep raw text
      }

      throw new Error(message || `OpenAI request failed with status ${r.status}`);
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error("OpenAI returned non-JSON response");
    }
  } finally {
    clearTimeout(timer);
  }
}

function buildUserContext(mint: any, meta: any, imageUrl: string | null) {
  const lines = [
    "Realife NFT visual enrichment task.",
    "",
    "Existing verified metadata:",
    `Name: ${mint?.name || ""}`,
    `Description: ${meta?.description || mint?.metaDescription || ""}`,
    `Category: ${mint?.category || ""}`,
    `Subcategory: ${mint?.subcategory || ""}`,
    `Fulfillment Type: ${mint?.fulfillmentType || ""}`,
    `Service Country: ${mint?.serviceCountry || ""}`,
    `Service City: ${mint?.serviceCity || ""}`,
    `Service Area: ${mint?.serviceArea || ""}`,
    `Collection: ${meta?.collection || mint?.metaCollection || ""}`,
    `Item: ${meta?.item || mint?.metaItem || ""}`,
    `Brand: ${meta?.brand || mint?.metaBrand || ""}`,
    `Project: ${meta?.project || mint?.metaProject || ""}`,
    `Delivery Enabled: ${mint?.deliveryEnabled ? "yes" : "no"}`,
    `Physical Item Included: ${mint?.physicalItemIncluded ? "yes" : "no"}`,
    "",
    `Image/poster URL: ${imageUrl || ""}`,
    "",
    "Analyze the image/poster. Extract visible text, product/service meaning, location signals, useful search tags, and a short summary.",
  ];

  return lines.join("\n");
}

function normalizeAiResult(raw: any) {
  const detectedCategoryRaw = safeShort(raw?.detectedCategory, 80);
  const detectedCategory =
    detectedCategoryRaw &&
    AI_ALLOWED_CATEGORIES.some(
      (x) => x.toLowerCase() === detectedCategoryRaw.toLowerCase()
    )
      ? AI_ALLOWED_CATEGORIES.find(
          (x) => x.toLowerCase() === detectedCategoryRaw.toLowerCase()
        ) || null
      : detectedCategoryRaw;

  return {
    visualText: safeText(raw?.visualText, 6000),
    visualSummary: safeText(raw?.visualSummary, 3000),

    detectedProduct: safeShort(raw?.detectedProduct, 120),
    detectedService: safeShort(raw?.detectedService, 120),
    detectedCategory: safeShort(detectedCategory, 120),
    detectedBrand: safeShort(raw?.detectedBrand, 120),

    detectedCountry: safeShort(raw?.detectedCountry, 120),
    detectedRegion: safeShort(raw?.detectedRegion, 120),
    detectedCity: safeShort(raw?.detectedCity, 120),
    detectedArea: safeShort(raw?.detectedArea, 120),

    searchTags: normalizeTags(raw?.searchTags),
    confidence: safeConfidence(raw?.confidence),
  };
}

async function markAiIndexError(input: {
  chainId: number;
  contract: string;
  tokenId: string;
  error: string;
  sourceImage?: string | null;
  sourceAnimation?: string | null;
  model?: string | null;
}) {
  return prisma.nftAiIndex.upsert({
    where: {
      chainId_contract_tokenId: {
        chainId: input.chainId,
        contract: input.contract,
        tokenId: input.tokenId,
      },
    },
    create: {
      chainId: input.chainId,
      contract: input.contract,
      tokenId: input.tokenId,
      status: "ERROR",
      error: input.error,
      sourceImage: input.sourceImage || null,
      sourceAnimation: input.sourceAnimation || null,
      provider: "openai",
      model: input.model || null,
    },
    update: {
      status: "ERROR",
      error: input.error,
      sourceImage: input.sourceImage || null,
      sourceAnimation: input.sourceAnimation || null,
      provider: "openai",
      model: input.model || null,
    },
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const chainId = toInt(url.searchParams.get("chainId"));
  const contract = normAddr(url.searchParams.get("contract"));
  const tokenId = normTokenId(url.searchParams.get("tokenId"));

  if (!chainId || !contract || !tokenId) {
    return NextResponse.json(
      {
        ok: false,
        error: "BAD_REQUEST",
        message: "chainId, contract and tokenId are required",
      },
      { status: 400 }
    );
  }

  const aiIndex = await prisma.nftAiIndex.findUnique({
    where: {
      chainId_contract_tokenId: {
        chainId,
        contract,
        tokenId,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    aiIndex,
  });
}

export async function POST(req: NextRequest) {
  const model =
    process.env.OPENAI_NFT_ENRICH_MODEL ||
    process.env.OPENAI_AI_SUGGEST_MODEL ||
    "gpt-4.1-mini";

  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "OPENAI_API_KEY_MISSING",
          message: "OPENAI_API_KEY is missing",
        },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as EnrichBody;

    const chainId = toInt(body.chainId);
    const contract = normAddr(body.contract);
    const tokenId = normTokenId(body.tokenId);
    const force = toBool(body.force);

    if (!chainId || !contract || !tokenId) {
      return NextResponse.json(
        {
          ok: false,
          error: "BAD_REQUEST",
          message: "chainId, contract and tokenId are required",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.nftAiIndex.findUnique({
      where: {
        chainId_contract_tokenId: {
          chainId,
          contract,
          tokenId,
        },
      },
    });

    if (existing?.status === "DONE" && !force) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "ALREADY_ENRICHED",
        aiIndex: existing,
      });
    }

    const mint = await prisma.mint.findUnique({
      where: {
        chainId_contract_tokenId: {
          chainId,
          contract,
          tokenId,
        },
      },
      select: {
        id: true,
        chainId: true,
        contract: true,
        tokenId: true,

        name: true,
        image: true,
        tokenUri: true,
        verified: true,

        deliveryEnabled: true,
        physicalItemIncluded: true,
        officialItem: true,

        fulfillmentType: true,
        category: true,
        subcategory: true,

        serviceCountry: true,
        serviceCity: true,
        serviceArea: true,

        metadataCachedAt: true,
        metaImage: true,
        metaAnimation: true,
        metaMediaKind: true,
        metaDescription: true,
        metaCollection: true,
        metaItem: true,
        metaRarity: true,
        metaBrand: true,
        metaProject: true,
      },
    });

    if (!mint || !mint.verified) {
      return NextResponse.json(
        {
          ok: false,
          error: "NFT_NOT_FOUND_OR_NOT_VERIFIED",
        },
        { status: 404 }
      );
    }

    await prisma.nftAiIndex.upsert({
      where: {
        chainId_contract_tokenId: {
          chainId,
          contract,
          tokenId,
        },
      },
      create: {
        chainId,
        contract,
        tokenId,
        status: "PROCESSING",
        provider: "openai",
        model,
      },
      update: {
        status: "PROCESSING",
        error: null,
        provider: "openai",
        model,
      },
    });

    const meta = await getMintMeta(mint as any);

    const sourceImage =
      ipfsToHttp(meta?.image) ||
      ipfsToHttp(mint.metaImage) ||
      ipfsToHttp(mint.image) ||
      null;

    const sourceAnimation =
      ipfsToHttp(meta?.animation) || ipfsToHttp(mint.metaAnimation) || null;

    if (!sourceImage) {
      const aiIndex = await markAiIndexError({
        chainId,
        contract,
        tokenId,
        error: "No image or poster available for AI visual enrichment",
        sourceImage,
        sourceAnimation,
        model,
      });

      return NextResponse.json(
        {
          ok: false,
          error: "NO_IMAGE",
          aiIndex,
        },
        { status: 400 }
      );
    }

    const imageDetail =
      process.env.OPENAI_NFT_ENRICH_IMAGE_DETAIL === "low"
        ? "low"
        : process.env.OPENAI_NFT_ENRICH_IMAGE_DETAIL === "auto"
        ? "auto"
        : "high";

    const systemPrompt = `
You are an AI visual indexing engine for Realife, a Web3 marketplace for NFTs connected to real-world products, services, delivery, online sessions, and local/offline offers.

Return only valid JSON matching the schema.

Your job:
- Read the NFT image or video poster.
- Extract visible text from the image if it is legible.
- Detect what product, service, brand, country, region, city, or area appears in the image.
- Create useful search tags for marketplace discovery.
- Improve NFT search, but do not invent facts.

Important rules:
1. Do NOT guess exact location if it is not visible or strongly supported by existing metadata.
2. If text is small, distorted, unreadable, or uncertain, mention only what is readable.
3. If a phone number is visible and readable, include it inside visualText only. Do not create a separate phone field.
4. detectedCountry / detectedRegion / detectedCity / detectedArea must be null if not clearly visible or supported by metadata.
5. For products, fill detectedProduct.
6. For services, fill detectedService.
7. detectedCategory should be one of the known Realife marketplace categories when possible.
8. searchTags should include practical user search words, for example: "pineapple", "fruit", "Spain", "Andalusia", "food", "delivery", "fitness", "Los Angeles", "local service", "coaching".
9. confidence must be between 0 and 1.
`.trim();

    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        visualText: { type: ["string", "null"] },
        visualSummary: { type: ["string", "null"] },

        detectedProduct: { type: ["string", "null"] },
        detectedService: { type: ["string", "null"] },
        detectedCategory: {
          type: ["string", "null"],
          enum: [...AI_ALLOWED_CATEGORIES, null],
        },
        detectedBrand: { type: ["string", "null"] },

        detectedCountry: { type: ["string", "null"] },
        detectedRegion: { type: ["string", "null"] },
        detectedCity: { type: ["string", "null"] },
        detectedArea: { type: ["string", "null"] },

        searchTags: {
          type: "array",
          items: { type: "string" },
        },

        confidence: { type: ["number", "null"] },
      },
      required: [
        "visualText",
        "visualSummary",
        "detectedProduct",
        "detectedService",
        "detectedCategory",
        "detectedBrand",
        "detectedCountry",
        "detectedRegion",
        "detectedCity",
        "detectedArea",
        "searchTags",
        "confidence",
      ],
    };

    const openaiPayload = {
      model,
      store: false,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildUserContext(mint, meta, sourceImage),
            },
            {
              type: "input_image",
              image_url: sourceImage,
              detail: imageDetail,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "realife_nft_ai_visual_index",
          strict: true,
          schema,
        },
      },
    };

    const openaiData = await fetchOpenAIJson(openaiPayload);
    const rawText = pickResponseText(openaiData);
    const parsed = safeJsonParse(rawText);

    if (!parsed || typeof parsed !== "object") {
      const aiIndex = await markAiIndexError({
        chainId,
        contract,
        tokenId,
        error: "OpenAI visual enrichment parse failed",
        sourceImage,
        sourceAnimation,
        model,
      });

      return NextResponse.json(
        {
          ok: false,
          error: "AI_PARSE_FAILED",
          rawText,
          aiIndex,
        },
        { status: 500 }
      );
    }

    const normalized = normalizeAiResult(parsed);

    const aiIndex = await prisma.nftAiIndex.upsert({
      where: {
        chainId_contract_tokenId: {
          chainId,
          contract,
          tokenId,
        },
      },
      create: {
        chainId,
        contract,
        tokenId,

        status: "DONE",

        visualText: normalized.visualText,
        visualSummary: normalized.visualSummary,

        detectedProduct: normalized.detectedProduct,
        detectedService: normalized.detectedService,
        detectedCategory: normalized.detectedCategory,
        detectedBrand: normalized.detectedBrand,

        detectedCountry: normalized.detectedCountry,
        detectedRegion: normalized.detectedRegion,
        detectedCity: normalized.detectedCity,
        detectedArea: normalized.detectedArea,

        searchTags: normalized.searchTags,
        confidence: normalized.confidence,

        sourceImage,
        sourceAnimation,

        provider: "openai",
        model,

        error: null,
        enrichedAt: new Date(),
      },
      update: {
        status: "DONE",

        visualText: normalized.visualText,
        visualSummary: normalized.visualSummary,

        detectedProduct: normalized.detectedProduct,
        detectedService: normalized.detectedService,
        detectedCategory: normalized.detectedCategory,
        detectedBrand: normalized.detectedBrand,

        detectedCountry: normalized.detectedCountry,
        detectedRegion: normalized.detectedRegion,
        detectedCity: normalized.detectedCity,
        detectedArea: normalized.detectedArea,

        searchTags: normalized.searchTags,
        confidence: normalized.confidence,

        sourceImage,
        sourceAnimation,

        provider: "openai",
        model,

        error: null,
        enrichedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      aiIndex,
    });
  } catch (e: any) {
    console.error("[NFT_AI_ENRICH_ERROR]", e);

    return NextResponse.json(
      {
        ok: false,
        error: "INTERNAL",
        message: e?.message || "NFT AI enrichment failed",
      },
      { status: 500 }
    );
  }
}
