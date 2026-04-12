import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_AI_SUGGEST_MODEL || "gpt-5.4-mini";

const MAX_FILE_SIZE_MB = 10;

const PATHS = [
  "COLLECTIBLE",
  "SERVICE",
  "PRODUCT",
] as const;

const CATEGORIES = [
  "Art / Collectible",
  "Fashion / Accessory",
  "Tech / Gadget",
  "Home / Decor",
  "Beauty / Wellness",
  "Food / Beverage",
  "Sports / Fitness",
  "Professional Service",
  "Creative Service",
  "Education / Coaching",
  "Digital Product",
  "Other",
] as const;

const ITEM_TYPES = [
  "Artwork",
  "Painting",
  "Collectible",
  "Toy",
  "Fashion item",
  "Accessory",
  "T-shirt",
  "Shoes",
  "Bag",
  "Jewelry",
  "Tech device",
  "Phone accessory",
  "Laptop",
  "Home item",
  "Decor",
  "Furniture",
  "Beauty product",
  "Food product",
  "Drink product",
  "Fitness service",
  "Coaching",
  "Consultation",
  "Lesson",
  "Training",
  "Design service",
  "Marketing service",
  "Website service",
  "Portfolio",
  "Digital product",
  "Project",
  "Other",
] as const;

const FULFILLMENT_TYPES = [
  "PHYSICAL_GOOD",
  "DIGITAL_SERVICE",
  "ONLINE_SESSION",
  "LOCAL_SERVICE",
  null,
] as const;

const SUGGESTED_MARKET_TYPES = [
  "standard",
  "protected",
] as const;

type AiSuggestResult = {
  path: (typeof PATHS)[number];
  category: (typeof CATEGORIES)[number];
  itemType: (typeof ITEM_TYPES)[number];
  subcategory: string;
  title: string;
  brand: string;
  description: string;
  fulfillmentType: (typeof FULFILLMENT_TYPES)[number];
  suggestedMarketType: (typeof SUGGESTED_MARKET_TYPES)[number];
  confidence: number;
  reasoning: string;
};

function normalizeMimeType(mime?: string | null) {
  return String(mime || "")
    .trim()
    .toLowerCase();
}

function isSupportedImageMime(mime?: string | null) {
  const m = normalizeMimeType(mime);
  return [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ].includes(m);
}

function isVideoMime(mime?: string | null) {
  return normalizeMimeType(mime).startsWith("video/");
}

function sanitizeString(v: unknown, fallback = "") {
  if (typeof v !== "string") return fallback;
  return v.trim();
}

function clampConfidence(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function fallbackResult(): AiSuggestResult {
  return {
    path: "COLLECTIBLE",
    category: "Other",
    itemType: "Other",
    subcategory: "",
    title: "",
    brand: "",
    description: "",
    fulfillmentType: null,
    suggestedMarketType: "standard",
    confidence: 0.5,
    reasoning: "Fallback result was used.",
  };
}

function coerceResult(raw: any): AiSuggestResult {
  const safe = fallbackResult();

  const path = PATHS.includes(raw?.path) ? raw.path : safe.path;
  const category = CATEGORIES.includes(raw?.category)
    ? raw.category
    : safe.category;
  const itemType = ITEM_TYPES.includes(raw?.itemType)
    ? raw.itemType
    : safe.itemType;
  const fulfillmentType = FULFILLMENT_TYPES.includes(raw?.fulfillmentType)
    ? raw.fulfillmentType
    : safe.fulfillmentType;
  const suggestedMarketType = SUGGESTED_MARKET_TYPES.includes(
    raw?.suggestedMarketType
  )
    ? raw.suggestedMarketType
    : safe.suggestedMarketType;

  return {
    path,
    category,
    itemType,
    subcategory: sanitizeString(raw?.subcategory),
    title: sanitizeString(raw?.title),
    brand: sanitizeString(raw?.brand),
    description: sanitizeString(raw?.description),
    fulfillmentType,
    suggestedMarketType,
    confidence: clampConfidence(raw?.confidence),
    reasoning: sanitizeString(raw?.reasoning, safe.reasoning),
  };
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const formData = await req.formData();

    const file = formData.get("file");
    const name = sanitizeString(formData.get("name"));
    const brand = sanitizeString(formData.get("brand"));
    const project = sanitizeString(formData.get("project"));
    const category = sanitizeString(formData.get("category"));
    const subcategory = sanitizeString(formData.get("subcategory"));
    const itemType = sanitizeString(formData.get("itemType"));
    const description = sanitizeString(formData.get("description"));
    const deliveryMode = sanitizeString(formData.get("deliveryMode"));

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "file is required" },
        { status: 400 }
      );
    }

    if (!file.size) {
      return NextResponse.json(
        { ok: false, error: "Uploaded file is empty" },
        { status: 400 }
      );
    }

    const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          ok: false,
          error: `File is too large. Max ${MAX_FILE_SIZE_MB}MB.`,
        },
        { status: 400 }
      );
    }

    const mime = normalizeMimeType(file.type);

    if (isVideoMime(mime)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "AI suggest currently expects an image. For video, send a poster/thumbnail image instead.",
        },
        { status: 400 }
      );
    }

    if (!isSupportedImageMime(mime)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Unsupported file type. Use jpg, png, webp or gif image.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mime};base64,${base64}`;

    const prompt = [
      "You are an NFT mint form assistant for Realife.",
      "Your task is to classify the uploaded image and suggest clean metadata for a mint form.",
      "",
      "Important business logic:",
      "- path must be one of: COLLECTIBLE, SERVICE, PRODUCT.",
      "- category must be one of the allowed enum values.",
      "- itemType must be one of the allowed enum values.",
      "- If the uploaded item is clearly a physical object or consumer good, prefer:",
      '  path = PRODUCT, fulfillmentType = "PHYSICAL_GOOD", suggestedMarketType = "protected".',
      "- If the image looks like a service, coaching, consulting, education, lesson, design work, website work, digital work, portfolio or similar, prefer:",
      '  path = SERVICE and suggestedMarketType = "protected".',
      "- For online coaching / lessons / consultations, use fulfillmentType = ONLINE_SESSION.",
      "- For local real-world service like repair, plumbing, interior design visit, legal local visit, logistics in person, gym trainer in person, yoga in person, use fulfillmentType = LOCAL_SERVICE.",
      "- For remote/digital service work, use fulfillmentType = DIGITAL_SERVICE.",
      "- For normal collectible/art objects without service meaning, use path = COLLECTIBLE, fulfillmentType = null, suggestedMarketType = standard.",
      "- If deliveryMode from the form is delivery, that strongly suggests a physical product.",
      "",
      "Naming/style rules:",
      "- title should be short, premium, clean, and not too generic.",
      "- brand should be empty string if not obvious.",
      "- description should be 1-3 short sentences, concise and useful.",
      "- subcategory should be short and practical for search/filtering.",
      "- confidence should be 0..1.",
      "- reasoning should be brief.",
      "",
      "Allowed enums:",
      `PATHS: ${PATHS.join(", ")}`,
      `CATEGORIES: ${CATEGORIES.join(", ")}`,
      `ITEM_TYPES: ${ITEM_TYPES.join(", ")}`,
      `FULFILLMENT_TYPES: ${FULFILLMENT_TYPES.map((x) => String(x)).join(", ")}`,
      `SUGGESTED_MARKET_TYPES: ${SUGGESTED_MARKET_TYPES.join(", ")}`,
      "",
      "Current form context:",
      `name: ${name || "(empty)"}`,
      `brand: ${brand || "(empty)"}`,
      `project: ${project || "(empty)"}`,
      `category: ${category || "(empty)"}`,
      `subcategory: ${subcategory || "(empty)"}`,
      `itemType: ${itemType || "(empty)"}`,
      `description: ${description || "(empty)"}`,
      `deliveryMode: ${deliveryMode || "(empty)"}`,
      "",
      "Return JSON only.",
    ].join("\n");

    const response = await openai.responses.create({
      model: MODEL,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
            {
              type: "input_image",
              image_url: dataUrl,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "ai_mint_suggest",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              path: {
                type: "string",
                enum: [...PATHS],
              },
              category: {
                type: "string",
                enum: [...CATEGORIES],
              },
              itemType: {
                type: "string",
                enum: [...ITEM_TYPES],
              },
              subcategory: {
                type: "string",
              },
              title: {
                type: "string",
              },
              brand: {
                type: "string",
              },
              description: {
                type: "string",
              },
              fulfillmentType: {
                type: ["string", "null"],
                enum: [...FULFILLMENT_TYPES],
              },
              suggestedMarketType: {
                type: "string",
                enum: [...SUGGESTED_MARKET_TYPES],
              },
              confidence: {
                type: "number",
              },
              reasoning: {
                type: "string",
              },
            },
            required: [
              "path",
              "category",
              "itemType",
              "subcategory",
              "title",
              "brand",
              "description",
              "fulfillmentType",
              "suggestedMarketType",
              "confidence",
              "reasoning",
            ],
          },
        },
      },
    });

    const rawText =
      response.output_text ||
      response.output?.[0]?.content?.[0]?.text ||
      "{}";

    let parsed: any = {};
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = {};
    }

    const result = coerceResult(parsed);

    return NextResponse.json({
      ok: true,
      model: MODEL,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "AI suggest failed",
      },
      { status: 500 }
    );
  }
}