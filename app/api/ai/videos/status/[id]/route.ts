import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { retrieveVideo } from "@/lib/ai/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = {
  params: Promise<{ id: string }> | { id: string };
};

export async function GET(_: Request, ctx: Params) {
  try {
    const resolved = await ctx.params;
    const id = resolved.id;

    const video = await retrieveVideo(id);
    const status = normalizeStatus(video.status);

    const downloadUrl =
      video.status === "completed"
        ? `/api/ai/videos/download/${id}`
        : undefined;

    const previewUrl =
      video.status === "completed"
        ? `/api/ai/videos/download/${id}`
        : undefined;

    const posterUrl =
      video.status === "completed"
        ? `/api/ai/videos/download/${id}?variant=thumbnail`
        : undefined;

    await prisma.aiGeneration.updateMany({
      where: { externalJobId: id },
      data: {
        status,
        errorMessage: video?.error?.message || null,
        resultUrl: downloadUrl || undefined,
        previewUrl: previewUrl || undefined,
      },
    });

    return NextResponse.json({
      ok: true,
      videoId: id,
      status: video.status,
      progress: video.progress ?? 0,
      prompt: video.prompt,
      seconds: video.seconds,
      size: video.size,
      error: video?.error?.message || undefined,
      message: video?.error?.message || undefined,
      downloadUrl,
      resultUrl: downloadUrl,
      previewUrl,
      posterUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to fetch video status.";

    return NextResponse.json(
      { ok: false, error: message, message },
      { status: 500 }
    );
  }
}

function normalizeStatus(status: string) {
  switch (status) {
    case "completed":
      return "COMPLETED" as const;
    case "failed":
      return "FAILED" as const;
    case "cancelled":
      return "CANCELLED" as const;
    case "queued":
    case "in_progress":
    default:
      return "PROCESSING" as const;
  }
}
