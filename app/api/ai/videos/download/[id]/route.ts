import { NextResponse } from "next/server";
import { downloadVideoContent } from "@/lib/ai/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const variantParam = searchParams.get("variant");
    const variant =
      variantParam === "thumbnail" || variantParam === "spritesheet"
        ? variantParam
        : "video";

    const upstream = await downloadVideoContent(id, variant);

    const headers = new Headers();
    const contentType = upstream.headers.get("content-type") || "video/mp4";

    headers.set("content-type", contentType);
    headers.set(
      "content-disposition",
      variant === "video"
        ? `inline; filename="realife-ai-${id}.mp4"`
        : `inline; filename="realife-ai-${id}.${variant === "thumbnail" ? "jpg" : "bin"}"`
    );

    return new Response(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Video download failed.";

    return NextResponse.json(
      { ok: false, error: message, message },
      { status: 500 }
    );
  }
}
