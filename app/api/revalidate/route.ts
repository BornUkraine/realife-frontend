import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const tags = Array.isArray(body?.tags) ? body.tags.map((x: any) => String(x)) : [];
  if (!tags.length) return NextResponse.json({ error: "no_tags" }, { status: 400 });

  for (const t of tags) revalidateTag(t);

  return NextResponse.json({ ok: true, tags });
}