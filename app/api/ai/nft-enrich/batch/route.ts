import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type BatchBody = {
  chainId?: number | string | null;
  contract?: string | null;
  limit?: number | string | null;
  force?: boolean | string | number | null;
  dryRun?: boolean | string | number | null;
  includeErrors?: boolean | string | number | null;
};

function toInt(v: unknown) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function toBool(v: unknown) {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function normAddr(v: unknown) {
  const s = String(v || "").trim().toLowerCase();
  if (!s) return null;
  if (!/^0x[a-f0-9]{40}$/.test(s)) return null;
  return s;
}

function getBaseUrl(req: NextRequest) {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.RAILWAY_PUBLIC_DOMAIN ||
    "";

  if (envUrl) {
    const trimmed = String(envUrl).trim().replace(/\/$/, "");
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    return `https://${trimmed}`;
  }

  const proto =
    req.headers.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "development" ? "http" : "https");

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");

  if (!host) return null;
  return `${proto}://${host}`;
}

function isAuthorized(req: NextRequest) {
  const secret = String(process.env.AI_ENRICH_BATCH_SECRET || "").trim();
  if (!secret) return true;

  const url = new URL(req.url);
  const fromHeader = req.headers.get("x-ai-enrich-secret") || "";
  const fromQuery = url.searchParams.get("secret") || "";

  return fromHeader === secret || fromQuery === secret;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function parseSearchParams(req: NextRequest) {
  const url = new URL(req.url);

  return {
    chainId: url.searchParams.get("chainId"),
    contract: url.searchParams.get("contract"),
    limit: url.searchParams.get("limit"),
    force: url.searchParams.get("force"),
    dryRun: url.searchParams.get("dryRun"),
    includeErrors: url.searchParams.get("includeErrors"),
  } satisfies BatchBody;
}

async function getCandidates(input: {
  chainId: number | null;
  contract: string | null;
  limit: number;
  force: boolean;
  includeErrors: boolean;
}) {
  const where: any = {
    verified: true,
  };

  if (input.chainId) where.chainId = input.chainId;
  if (input.contract) where.contract = input.contract;

  if (!input.force) {
    const aiIndexOr: any[] = [{ aiIndex: { is: null } }];

    if (input.includeErrors) {
      aiIndexOr.push({ aiIndex: { is: { status: "ERROR" } } });
      aiIndexOr.push({ aiIndex: { is: { status: "PENDING" } } });
      aiIndexOr.push({ aiIndex: { is: { status: "PROCESSING" } } });
      aiIndexOr.push({ aiIndex: { is: { status: "NONE" } } });
    } else {
      aiIndexOr.push({ aiIndex: { is: { status: "PENDING" } } });
      aiIndexOr.push({ aiIndex: { is: { status: "NONE" } } });
    }

    where.OR = aiIndexOr;
  }

  return prisma.mint.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: input.limit,
    select: {
      chainId: true,
      contract: true,
      tokenId: true,
      name: true,
      image: true,
      metaImage: true,
      metaAnimation: true,
      fulfillmentType: true,
      category: true,
      serviceCountry: true,
      serviceCity: true,
      serviceArea: true,
      aiIndex: {
        select: {
          status: true,
          enrichedAt: true,
          error: true,
        },
      },
    },
  });
}

async function runBatch(req: NextRequest, bodyInput: BatchBody) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      {
        ok: false,
        error: "UNAUTHORIZED",
        message:
          "AI_ENRICH_BATCH_SECRET is set. Pass it with x-ai-enrich-secret header or ?secret=...",
      },
      { status: 401 }
    );
  }

  const chainIdRaw = toInt(bodyInput.chainId);
  const chainId = chainIdRaw && chainIdRaw > 0 ? chainIdRaw : null;
  const contract = normAddr(bodyInput.contract);

  const limit = Math.max(1, Math.min(toInt(bodyInput.limit) ?? 3, 10));
  const force = toBool(bodyInput.force);
  const dryRun = toBool(bodyInput.dryRun);
  const includeErrors = toBool(bodyInput.includeErrors ?? true);

  const candidates = await getCandidates({
    chainId,
    contract,
    limit,
    force,
    includeErrors,
  });

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      count: candidates.length,
      hint:
        "This is only a dry run. To actually process NFTs, call this route with ?dryRun=false&limit=3 or POST { dryRun: false }.",
      candidates: candidates.map((m) => ({
        chainId: m.chainId,
        contract: m.contract,
        tokenId: m.tokenId,
        name: m.name,
        category: m.category,
        fulfillmentType: m.fulfillmentType,
        serviceCountry: m.serviceCountry,
        serviceCity: m.serviceCity,
        serviceArea: m.serviceArea,
        aiIndex: m.aiIndex
          ? {
              status: m.aiIndex.status,
              error: m.aiIndex.error,
              enrichedAt: m.aiIndex.enrichedAt
                ? m.aiIndex.enrichedAt.toISOString()
                : null,
            }
          : null,
      })),
    });
  }

  const baseUrl = getBaseUrl(req);

  if (!baseUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: "NO_BASE_URL",
        message:
          "Cannot determine app base URL. Set NEXT_PUBLIC_APP_URL or APP_URL.",
      },
      { status: 500 }
    );
  }

  const enrichUrl = `${baseUrl}/api/ai/nft-enrich`;

  const timeoutMs = Math.max(
    30_000,
    Math.min(
      Number(process.env.OPENAI_NFT_ENRICH_ITEM_TIMEOUT_MS || 130_000),
      180_000
    )
  );

  const results: Array<{
    chainId: number;
    contract: string;
    tokenId: string;
    ok: boolean;
    skipped?: boolean;
    status?: number;
    error?: string | null;
    aiStatus?: string | null;
  }> = [];

  for (const mint of candidates) {
    try {
      const r = await fetchWithTimeout(
        enrichUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chainId: mint.chainId,
            contract: mint.contract,
            tokenId: mint.tokenId,
            force,
          }),
        },
        timeoutMs
      );

      const j = await r.json().catch(() => null);

      results.push({
        chainId: mint.chainId,
        contract: mint.contract,
        tokenId: mint.tokenId,
        ok: Boolean(r.ok && j?.ok),
        skipped: Boolean(j?.skipped),
        status: r.status,
        error: r.ok
          ? j?.error || null
          : j?.message || j?.error || "ENRICH_FAILED",
        aiStatus: j?.aiIndex?.status || null,
      });
    } catch (e: any) {
      results.push({
        chainId: mint.chainId,
        contract: mint.contract,
        tokenId: mint.tokenId,
        ok: false,
        error: e?.message || "ENRICH_REQUEST_FAILED",
        aiStatus: null,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    baseUrl,
    requested: candidates.length,
    processed: results.length,
    success: results.filter((x) => x.ok).length,
    failed: results.filter((x) => !x.ok).length,
    force,
    includeErrors,
    results,
  });
}

export async function GET(req: NextRequest) {
  const params = parseSearchParams(req);

  // Important:
  // GET stays safe by default, so opening the URL in browser does not spend OpenAI credits.
  // To actually run, use ?dryRun=false
  params.dryRun = params.dryRun ?? "true";

  return runBatch(req, params);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as BatchBody;
  return runBatch(req, body);
}
