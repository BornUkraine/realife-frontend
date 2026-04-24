import { NextResponse } from "next/server";
import { AiGenerationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { retrieveVideo } from "@/lib/ai/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const video = await retrieveVideo(id);
    const normalizedStatus = normalizeStatus(video.status);

    const isCompleted = video.status === "completed";

    const downloadUrl = isCompleted
      ? `/api/ai/videos/download/${encodeURIComponent(id)}`
      : undefined;

    await prisma.aiGeneration.updateMany({
      where: { externalJobId: id },
      data: {
        status: normalizedStatus,
        errorMessage: video.error?.message || null,
        resultUrl: downloadUrl || null,
        previewUrl: downloadUrl || null,
      },
    });

    return NextResponse.json({
      ok: true,
      videoId: id,
      id,
      jobId: id,
      status: video.status,
      normalizedStatus,
      progress: video.progress ?? 0,
      prompt: video.prompt,
      seconds: video.seconds,
      size: video.size,
      error: video.error?.message || undefined,
      message: video.error?.message || undefined,
      downloadUrl,
      resultUrl: downloadUrl,
      previewUrl: downloadUrl,
      posterUrl: undefined,
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

function normalizeStatus(status: string): AiGenerationStatus {
  switch (status) {
    case "completed":
      return AiGenerationStatus.COMPLETED;

    case "failed":
      return AiGenerationStatus.FAILED;

    case "cancelled":
      return AiGenerationStatus.CANCELLED;

    case "queued":
    case "in_progress":
    default:
      return AiGenerationStatus.PROCESSING;
  }
}
