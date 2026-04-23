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

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const prompt = String(form.get("prompt") || "").trim();
    const model = String(form.get("model") || "sora-2").trim() as
      | "sora-2"
      | "sora-2-pro";
    const aspectRatio = String(form.get("aspectRatio") || "16:9").trim();
    const seconds = Number(form.get("seconds") || 8) as 4 | 8 | 12;
    const referenceImage = form.get("referenceImage");

    if (!prompt) {
      return NextResponse.json(
        { ok: false, error: "Prompt is required." },
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

    const referenceImageDataUrl =
      referenceImage instanceof File ? await fileToDataUrl(referenceImage) : undefined;

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
      videoId: video.id,
      status: video.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Video generation failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
