import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeTag(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return s.slice(0, 256);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body: unknown = await req.json().catch(() => null);

  const raw: unknown[] = Array.isArray((body as any)?.tags) ? (body as any).tags : [];

  const tags = raw
    .map(normalizeTag)
    .filter((x: string | null): x is string => typeof x === "string" && x.length > 0);

  const unique = Array.from(new Set(tags)).slice(0, 50);
  if (!unique.length) return NextResponse.json({ error: "no_tags" }, { status: 400 });

  for (const t of unique) {
    // Next 16 требует 2-й аргумент
    revalidateTag(t, { expire: 0 });
    // или так:
    // revalidateTag(t, "max");
  }

  return NextResponse.json({ ok: true, tags: unique });
}