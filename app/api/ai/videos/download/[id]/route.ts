import { downloadVideoContent } from "@/lib/ai/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = {
  params: Promise<{ id: string }> | { id: string };
};

export async function GET(req: Request, ctx: Params) {
  const resolved = await ctx.params;
  const id = resolved.id;
  const { searchParams } = new URL(req.url);
  const variant = (searchParams.get("variant") || "video") as
    | "video"
    | "thumbnail"
    | "spritesheet";

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
}
