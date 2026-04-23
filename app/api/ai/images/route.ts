import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createImage,
  mapAspectRatioToImageSize,
  normalizeImageSize,
} from "@/lib/ai/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  let generationId: string | null = null;

  try {
    const form = await req.formData();
    const prompt = String(form.get("prompt") || "").trim();
    const quality = String(form.get("quality") || "medium").trim() as
      | "low"
      | "medium"
      | "high";
    const aspectRatio = String(form.get("aspectRatio") || "16:9").trim();
    const requestedSize = String(form.get("size") || "").trim();
    const referenceImage = form.get("referenceImage");

    if (!prompt) {
      return NextResponse.json(
        { ok: false, error: "Prompt is required.", message: "Prompt is required." },
        { status: 400 }
      );
    }

    const generation = await prisma.aiGeneration.create({
      data: {
        type: "IMAGE",
        status: "PROCESSING",
        provider: "openai",
        model: "gpt-image-1",
        prompt,
        quality,
        aspectRatio,
        size: requestedSize || null,
        mimeType:
          referenceImage instanceof File && referenceImage.type
            ? referenceImage.type
            : null,
      },
    });

    generationId = generation.id;

    const result = await createImage({
      prompt,
      size: normalizeImageSize(requestedSize) || mapAspectRatioToImageSize(aspectRatio),
      quality,
      referenceImage: referenceImage instanceof File ? referenceImage : null,
    });

    await prisma.aiGeneration.update({
      where: { id: generation.id },
      data: {
        status: "COMPLETED",
        previewUrl: result.dataUrl,
        resultUrl: result.dataUrl,
      },
    });

    return NextResponse.json({
      ok: true,
      generationId: generation.id,
      resultUrl: result.dataUrl,
      previewUrl: result.dataUrl,
      imageUrl: result.dataUrl,
      url: result.dataUrl,
      prompt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Image generation failed.";

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
