import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_PREFIXES = [
  "market:",
  "nft:",
  "mint:",
  "profile:",
  "activity:",
  "orders:",
  "store:",
  "cafe:",
];

function normalizeTag(v: unknown): string | null {
  const s = String(v ?? "").trim();

  if (!s) return null;
  if (s.length > 256) return null;
  if (s.includes("\n") || s.includes("\r")) return null;

  const allowed = ALLOWED_PREFIXES.some((prefix) => s.startsWith(prefix));
  if (!allowed) return null;

  return s;
}

export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);

  const rawTags: unknown[] = Array.isArray((body as any)?.tags)
    ? (body as any).tags
    : (body as any)?.tag
    ? [(body as any).tag]
    : [];

  const tags = rawTags
    .map(normalizeTag)
    .filter((x: string | null): x is string => typeof x === "string" && x.length > 0);

  const unique = Array.from(new Set(tags)).slice(0, 50);

  if (!unique.length) {
    return NextResponse.json(
      {
        ok: false,
        error: "no_valid_tags",
      },
      { status: 400 }
    );
  }

  const revalidated: string[] = [];
  const errors: Array<{ tag: string; error: string }> = [];

  for (const tag of unique) {
    try {
      revalidateTag(tag, { expire: 0 });
      revalidated.push(tag);
    } catch (e: any) {
      errors.push({
        tag,
        error: e?.message || "failed",
      });
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    tags: revalidated,
    errors,
    ts: Date.now(),
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/revalidate",
    method: "POST",
  });
}