import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createVideo,
  fileToDataUrl,
  mapAspectRatioToVideoSize,
} from "@/lib/ai/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeSeconds(value: unknown): 4 | 8 | 12 {
  const n = Number(value);
  if (n === 4) return 4;
  if (n === 12) return 12;
  return 8;
}

export async function POST(req: Request) {
  let generationId: string | null = null;

  try {
    const form = await req.formData();
    const prompt = String(form.get("prompt") || "").trim();
    const model = String(form.get("model") || "sora-2").trim() as
      | "sora-2"
      | "sora-2-pro";
    const aspectRatio = String(form.get("aspectRatio") || "16:9").trim();
    const seconds = normalizeSeconds(
      form.get("seconds") || form.get("durationSec") || 8
    );
    const referenceImage = form.get("referenceImage");

    if (!prompt) {
      return NextResponse.json(
        { ok: false, error: "Prompt is required.", message: "Prompt is required." },
        { status: 400 }
      );
    }

    const generation = await prisma.aiGeneration.create({
      data: {
        type: "VIDEO",
        status: "PROCESSING",
        provider: "openai",
        model,
        prompt,
        aspectRatio,
        durationSec: seconds,
      },
    });

    generationId = generation.id;

    const referenceImageDataUrl =
      referenceImage instanceof File
        ? await fileToDataUrl(referenceImage)
        : undefined;

    const video = await createVideo({
      prompt,
      model,
      seconds,
      size: mapAspectRatioToVideoSize(aspectRatio),
      referenceImageDataUrl,
    });

    await prisma.aiGeneration.update({
      where: { id: generation.id },
      data: {
        externalJobId: video.id,
      },
    });

    return NextResponse.json({
      ok: true,
      generationId: generation.id,
      id: video.id,
      jobId: video.id,
      videoId: video.id,
      status: video.status,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Video generation failed.";

    if (generationId) {
      await prisma.aiGeneration
        .update({
          where: { id: generationId },
          data: {
            status: "FAILED",
            errorMessage: message,
          },
        })
        .catch(() => {});
    }

    return NextResponse.json(
      { ok: false, error: message, message },
      { status: 500 }
    );
  }
}
