import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeTag(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  // tag must not exceed 256 chars (per docs)
  return s.slice(0, 256);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const raw = Array.isArray(body?.tags) ? body.tags : [];

  const tags = raw
    .map(normalizeTag)
    .filter((x): x is string => Boolean(x));

  const unique = Array.from(new Set(tags)).slice(0, 50);

  if (!unique.length) {
    return NextResponse.json({ error: "no_tags" }, { status: 400 });
  }

  for (const t of unique) {
    // ✅ Next 16 requires 2nd arg
    revalidateTag(t, { expire: 0 });
    // альтернативы:
    // revalidateTag(t, "max");
  }

  return NextResponse.json({ ok: true, tags: unique });
}