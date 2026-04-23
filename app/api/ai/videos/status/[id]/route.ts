import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createImage, mapAspectRatioToImageSize } from "@/lib/ai/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const prompt = String(form.get("prompt") || "").trim();
    const quality = String(form.get("quality") || "medium").trim() as
      | "low"
      | "medium"
      | "high";
    const aspectRatio = String(form.get("aspectRatio") || "16:9").trim();
    const referenceImage = form.get("referenceImage");

    if (!prompt) {
      return NextResponse.json(
        { ok: false, error: "Prompt is required." },
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
        mimeType:
          referenceImage instanceof File && referenceImage.type
            ? referenceImage.type
            : null,
      },
    });

    const result = await createImage({
      prompt,
      size: mapAspectRatioToImageSize(aspectRatio),
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
      prompt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
