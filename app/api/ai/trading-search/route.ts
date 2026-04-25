import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type MarketType = "STANDARD" | "PROTECTED";
type FulfillmentType =
  | "PHYSICAL_GOOD"
  | "DIGITAL_SERVICE"
  | "ONLINE_SESSION"
  | "LOCAL_SERVICE";

type SortMode = "new" | "priceAsc" | "priceDesc";

type TradingSearchFilters = {
  q: string | null;
  marketType: MarketType | null;
  fulfillmentType: FulfillmentType | null;
  category: string | null;
  subcategory: string | null;
  serviceCountry: string | null;
  serviceCity: string | null;
  serviceArea: string | null;
  minPriceWei: string | null;
  maxPriceWei: string | null;
  sort: SortMode | null;
};

const ALLOWED_CATEGORIES = [
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

function clean(v: unknown, max = 120) {
  const s = String(v || "").trim();
  return s ? s.slice(0, max) : null;
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
      if (typeof part?.output_text === "string" && part.output_text) {
        return part.output_text;
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

function normalizeMarketType(v: unknown): MarketType | null {
  const s = String(v || "").trim().toUpperCase();
  if (s === "STANDARD" || s === "PROTECTED") return s;
  return null;
}

function normalizeFulfillmentType(v: unknown): FulfillmentType | null {
  const s = String(v || "").trim().toUpperCase();
  if (
    s === "PHYSICAL_GOOD" ||
    s === "DIGITAL_SERVICE" ||
    s === "ONLINE_SESSION" ||
    s === "LOCAL_SERVICE"
  ) {
    return s;
  }
  return null;
}

function normalizeSort(v: unknown): SortMode | null {
  const s = String(v || "").trim();
  if (s === "new" || s === "priceAsc" || s === "priceDesc") return s;
  return null;
}

function normalizeCategory(v: unknown) {
  const s = clean(v, 120);
  if (!s) return null;
  const found = ALLOWED_CATEGORIES.find(
    (x) => x.toLowerCase() === s.toLowerCase()
  );
  return found || s;
}

function normalizeFilters(raw: any): TradingSearchFilters {
  return {
    q: clean(raw?.q, 120),
    marketType: normalizeMarketType(raw?.marketType),
    fulfillmentType: normalizeFulfillmentType(raw?.fulfillmentType),
    category: normalizeCategory(raw?.category),
    subcategory: clean(raw?.subcategory, 120),
    serviceCountry: clean(raw?.serviceCountry, 120),
    serviceCity: clean(raw?.serviceCity, 120),
    serviceArea: clean(raw?.serviceArea, 120),
    minPriceWei: /^\d+$/.test(String(raw?.minPriceWei || ""))
      ? String(raw.minPriceWei)
      : null,
    maxPriceWei: /^\d+$/.test(String(raw?.maxPriceWei || ""))
      ? String(raw.maxPriceWei)
      : null,
    sort: normalizeSort(raw?.sort),
  };
}

function fallbackFilters(query: string): TradingSearchFilters {
  const q = query.toLowerCase();
  const filters: TradingSearchFilters = {
    q: clean(query, 80),
    marketType: null,
    fulfillmentType: null,
    category: null,
    subcategory: null,
    serviceCountry: null,
    serviceCity: null,
    serviceArea: null,
    minPriceWei: null,
    maxPriceWei: null,
    sort: null,
  };

  if (
    q.includes("delivery") ||
    q.includes("physical") ||
    q.includes("product") ||
    q.includes("товар") ||
    q.includes("доставка")
  ) {
    filters.marketType = "PROTECTED";
    filters.fulfillmentType = "PHYSICAL_GOOD";
  }

  if (
    q.includes("local") ||
    q.includes("offline") ||
    q.includes("in person") ||
    q.includes("локал") ||
    q.includes("офлайн")
  ) {
    filters.marketType = "PROTECTED";
    filters.fulfillmentType = "LOCAL_SERVICE";
  }

  if (
    q.includes("online") ||
    q.includes("session") ||
    q.includes("consultation") ||
    q.includes("консульта") ||
    q.includes("урок")
  ) {
    filters.marketType = "PROTECTED";
    filters.fulfillmentType = "ONLINE_SESSION";
  }

  if (
    q.includes("service") ||
    q.includes("website") ||
    q.includes("design") ||
    q.includes("marketing") ||
    q.includes("услуг") ||
    q.includes("сервис")
  ) {
    filters.marketType = "PROTECTED";
    filters.fulfillmentType = filters.fulfillmentType || "DIGITAL_SERVICE";
  }

  if (
    q.includes("fitness") ||
    q.includes("gym") ||
    q.includes("trainer") ||
    q.includes("тренер") ||
    q.includes("фитнес") ||
    q.includes("health")
  ) {
    filters.category = "Health & Wellness";
    filters.q = "fitness";
    filters.marketType = "PROTECTED";
    filters.fulfillmentType = filters.fulfillmentType || "LOCAL_SERVICE";
  }

  if (q.includes("los angeles") || q.includes("la ") || q.endsWith(" la")) {
    filters.serviceCity = "Los Angeles";
    filters.fulfillmentType = filters.fulfillmentType || "LOCAL_SERVICE";
    filters.marketType = "PROTECTED";
  }

  if (q.includes("kyiv") || q.includes("kiev") || q.includes("киев")) {
    filters.serviceCity = "Kyiv";
    filters.fulfillmentType = filters.fulfillmentType || "LOCAL_SERVICE";
    filters.marketType = "PROTECTED";
  }

  if (q.includes("spain") || q.includes("испания")) {
    filters.serviceCountry = "Spain";
  }

  if (q.includes("newest") || q.includes("новые") || q.includes("свежие")) {
    filters.sort = "new";
  }

  if (q.includes("cheap") || q.includes("дешев") || q.includes("low price")) {
    filters.sort = "priceAsc";
  }

  if (q.includes("expensive") || q.includes("дорог") || q.includes("high price")) {
    filters.sort = "priceDesc";
  }

  return filters;
}

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    q: { type: ["string", "null"] },
    marketType: { type: ["string", "null"], enum: ["STANDARD", "PROTECTED", null] },
    fulfillmentType: {
      type: ["string", "null"],
      enum: [
        "PHYSICAL_GOOD",
        "DIGITAL_SERVICE",
        "ONLINE_SESSION",
        "LOCAL_SERVICE",
        null,
      ],
    },
    category: { type: ["string", "null"], enum: [...ALLOWED_CATEGORIES, null] },
    subcategory: { type: ["string", "null"] },
    serviceCountry: { type: ["string", "null"] },
    serviceCity: { type: ["string", "null"] },
    serviceArea: { type: ["string", "null"] },
    minPriceWei: { type: ["string", "null"] },
    maxPriceWei: { type: ["string", "null"] },
    sort: { type: ["string", "null"], enum: ["new", "priceAsc", "priceDesc", null] },
    explanation: { type: ["string", "null"] },
    confidence: { type: "number" },
  },
  required: [
    "q",
    "marketType",
    "fulfillmentType",
    "category",
    "subcategory",
    "serviceCountry",
    "serviceCity",
    "serviceArea",
    "minPriceWei",
    "maxPriceWei",
    "sort",
    "explanation",
    "confidence",
  ],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = clean(body?.query, 300);
    const currentView = clean(body?.marketView, 40);

    if (!query) {
      return NextResponse.json(
        { ok: false, error: "Query is required" },
        { status: 400 }
      );
    }

    const fallback = fallbackFilters(query);

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        ok: true,
        source: "fallback",
        warning: "OPENAI_API_KEY is missing, used local rule parser.",
        filters: fallback,
        explanation: "Local parser applied simple Realife trading filters.",
        confidence: 0.45,
      });
    }

    const model =
      process.env.OPENAI_TRADING_SEARCH_MODEL ||
      process.env.OPENAI_AI_SUGGEST_MODEL ||
      "gpt-5.4-mini";

    const systemPrompt = `
You are the Realife trading search parser.
Convert a user's natural-language search into safe marketplace filters.
Return only valid JSON matching the schema.

Realife marketplace concepts:
- There are two main public mint contracts:
  1) Standard public mint contract: used for normal NFTs and service NFTs.
  2) Delivery public mint contract: used for delivery/physical product NFTs.
- Service Protected = standard public mint contract + PROTECTED marketplace flow for DIGITAL_SERVICE, ONLINE_SESSION, or LOCAL_SERVICE.
- Delivery Protected = delivery public mint contract + PROTECTED marketplace flow for PHYSICAL_GOOD.
- Public Standard = standard public mint contract + STANDARD marketplace flow.
- STANDARD = normal NFT trading / collectibles without protected escrow.
- PROTECTED = escrow/protected flow for services or delivery.
- PHYSICAL_GOOD = product / physical item / delivery item.
- DIGITAL_SERVICE = website, design, SMM, automation, digital work.
- ONLINE_SESSION = lesson, coaching call, consultation, online training.
- LOCAL_SERVICE = offline or in-person service in a city/country, for example fitness in Los Angeles, electrician in Kyiv, local tour in Paris.

Rules:
1. Do not invent unavailable fields. Use null when unsure.
2. Keep q short: product/service keyword only, not a full sentence.
3. If user asks for goods/products/delivery, use marketType PROTECTED and fulfillmentType PHYSICAL_GOOD. This means Delivery Protected.
4. If user asks for services, use marketType PROTECTED and a service fulfillment type. This means Service Protected.
5. If user mentions a city for offline/local work, use fulfillmentType LOCAL_SERVICE and serviceCity.
6. If user asks for online call/lesson/consultation, use ONLINE_SESSION.
7. If user asks for standard art/collectible/simple NFT, use marketType STANDARD.
8. Use category only from the allowed enum.
9. Price filters must be wei strings only. If user mentions ETH price, convert ETH to wei exactly. If unsure, null.
10. sort can be new, priceAsc, priceDesc, or null.
`;

    const userText = [
      `Current market view: ${currentView || "all"}`,
      `User query: ${query}`,
      `Allowed categories: ${ALLOWED_CATEGORIES.join(" | ")}`,
    ].join("\n");

    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
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
            content: [{ type: "input_text", text: userText }],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "realife_trading_search_filters",
            strict: true,
            schema: responseSchema,
          },
        },
      }),
    });

    const data = await openaiRes.json().catch(() => null);

    if (!openaiRes.ok || !data) {
      console.error("[AI_TRADING_SEARCH_OPENAI_ERROR]", data);
      return NextResponse.json({
        ok: true,
        source: "fallback",
        warning: "OpenAI request failed, used local rule parser.",
        filters: fallback,
        explanation: "Local parser applied simple Realife trading filters.",
        confidence: 0.45,
      });
    }

    const rawText = pickResponseText(data);
    const parsed = safeJsonParse(rawText);

    if (!parsed || typeof parsed !== "object") {
      console.error("[AI_TRADING_SEARCH_PARSE_ERROR]", rawText);
      return NextResponse.json({
        ok: true,
        source: "fallback",
        warning: "OpenAI parse failed, used local rule parser.",
        filters: fallback,
        explanation: "Local parser applied simple Realife trading filters.",
        confidence: 0.45,
      });
    }

    const filters = normalizeFilters(parsed);

    return NextResponse.json({
      ok: true,
      source: "openai",
      model,
      filters,
      explanation: clean(parsed?.explanation, 240),
      confidence:
        typeof parsed?.confidence === "number"
          ? Math.max(0, Math.min(parsed.confidence, 1))
          : 0.7,
    });
  } catch (e) {
    console.error("[AI_TRADING_SEARCH_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}
