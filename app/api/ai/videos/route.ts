import { NextResponse } from "next/server";
import { AiGenerationStatus, AiGenerationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createVideo,
  fileToDataUrl,
  type VideoModel,
  type VideoSeconds,
  type VideoSize,
} from "@/lib/ai/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type VideoPreset =
  | "product"
  | "service"
  | "local-service"
  | "nft-poster"
  | "general";

const DEFAULT_VIDEO_MODEL: VideoModel =
  process.env.OPENAI_VIDEO_MODEL === "sora-2"
    ? "sora-2"
    : "sora-2-pro";

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function normalizeModel(value: unknown): VideoModel {
  const v = cleanText(value);

  if (v === "sora-2") return "sora-2";
  if (v === "sora-2-pro") return "sora-2-pro";

  return DEFAULT_VIDEO_MODEL;
}

function normalizeSeconds(value: unknown): VideoSeconds {
  const n = Number(value);

  if (n === 4) return 4;
  if (n === 8) return 8;
  if (n === 12) return 12;

  // Mega default.
  return 12;
}

function normalizeAspectRatio(value: unknown) {
  const v = cleanText(value);

  if (v === "9:16") return "9:16";
  if (v === "4:5") return "4:5";
  if (v === "1:1") return "1:1";
  if (v === "16:9") return "16:9";

  return "16:9";
}

function maxVideoSizeForAspectRatio(aspectRatio: string): VideoSize {
  switch (aspectRatio) {
    case "9:16":
    case "4:5":
      return "1024x1792";

    case "1:1":
    case "16:9":
    default:
      return "1792x1024";
  }
}

function detectPresetFromPrompt(prompt: string): VideoPreset {
  const p = prompt.toLowerCase();

  if (
    p.includes("local service") ||
    p.includes("offline service") ||
    p.includes("fitness") ||
    p.includes("trainer") ||
    p.includes("repair") ||
    p.includes("electrician") ||
    p.includes("plumber") ||
    p.includes("cleaning") ||
    p.includes("city")
  ) {
    return "local-service";
  }

  if (
    p.includes("service") ||
    p.includes("consultation") ||
    p.includes("coaching") ||
    p.includes("website") ||
    p.includes("design") ||
    p.includes("development") ||
    p.includes("session")
  ) {
    return "service";
  }

  if (
    p.includes("nft") ||
    p.includes("collectible") ||
    p.includes("web3") ||
    p.includes("token") ||
    p.includes("onchain")
  ) {
    return "nft-poster";
  }

  if (
    p.includes("product") ||
    p.includes("sell") ||
    p.includes("store") ||
    p.includes("shop") ||
    p.includes("delivery") ||
    p.includes("pineapple") ||
    p.includes("food") ||
    p.includes("goods")
  ) {
    return "product";
  }

  return "general";
}

function normalizePreset(value: unknown, prompt: string): VideoPreset {
  const v = cleanText(value).toLowerCase();

  if (v === "product" || v === "product-prompt") return "product";
  if (v === "service" || v === "service-prompt") return "service";

  if (
    v === "local-service" ||
    v === "local_service" ||
    v === "local-service-prompt"
  ) {
    return "local-service";
  }

  if (v === "nft" || v === "nft-poster" || v === "nft-prompt") {
    return "nft-poster";
  }

  return detectPresetFromPrompt(prompt);
}

function compactPrompt(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function aspectVideoDirection(aspectRatio: string) {
  switch (aspectRatio) {
    case "9:16":
      return "Vertical premium mobile-first video, strong framing for phone screens, cinematic social-commerce style.";
    case "4:5":
      return "Premium vertical social-commerce framing, elegant composition, strong subject presence.";
    case "1:1":
      return "Square-style request adapted into cinematic premium video framing, with the subject centered and marketplace-ready.";
    case "16:9":
    default:
      return "Wide cinematic premium commercial framing, luxury product/service advertisement style.";
  }
}

function presetVideoDirection(preset: VideoPreset) {
  if (preset === "product") {
    return `
Preset: PREMIUM PRODUCT COMMERCIAL VIDEO

Create a luxury product commercial, not a simple moving image.
The product must feel desirable, expensive, fresh, real, and ready to sell.
Use cinematic camera movement, premium lighting, elegant close-ups, slow motion product details, clean commercial staging, refined shadows, and polished marketplace energy.
Show the product clearly and beautifully.
`;
  }

  if (preset === "service") {
    return `
Preset: PREMIUM SERVICE PROMO VIDEO

Create a high-end service advertisement video.
Show trust, skill, professionalism, and the value of the service.
Use cinematic business/lifestyle visuals, premium lighting, smooth camera motion, and a clean modern marketplace feel.
Make the service look credible, useful, and worth buying.
`;
  }

  if (preset === "local-service") {
    return `
Preset: PREMIUM LOCAL OFFLINE SERVICE VIDEO

Create a premium local service promo video.
Show a realistic service provider, real-world environment, city/local feeling if requested, trust, professionalism, and human work.
The video should feel authentic, polished, and commercially useful for a local marketplace offer.
`;
  }

  if (preset === "nft-poster") {
    return `
Preset: LUXURY NFT / WEB3 MARKETPLACE VIDEO

Create a premium NFT-style marketplace video.
Use elegant gold accents, cinematic depth, subtle collectible card energy, polished motion, luxury Web3 atmosphere, and a strong hero subject.
Avoid cheap crypto effects, noisy neon overload, or childish visuals.
`;
  }

  return `
Preset: PREMIUM GENERAL COMMERCIAL VIDEO

Create a polished high-end commercial video with strong cinematic art direction, clean composition, and premium marketplace quality.
`;
}

function buildEnhancedVideoPrompt(params: {
  rawPrompt: string;
  preset: VideoPreset;
  aspectRatio: string;
  seconds: VideoSeconds;
  hasReferenceImage: boolean;
}) {
  const { rawPrompt, preset, aspectRatio, seconds, hasReferenceImage } = params;

  const referenceInstruction = hasReferenceImage
    ? `
Reference image:
Use the uploaded reference image as visual guidance.
Preserve the important product, face, logo, style, object shape, or brand identity where relevant.
Improve it into a premium cinematic commercial video.
`
    : "";

  return compactPrompt(`
You are creating a top-tier premium AI video for Realife, a Web3 marketplace for real-world products, services, delivery, and NFT-based ownership.

User request:
"${rawPrompt}"

Goal:
Create a beautiful, polished, high-end AI video that feels close to a premium ChatGPT/Sora result.
It must look like a finished commercial visual, not a basic generated animation.

Duration:
${seconds} seconds.

${presetVideoDirection(preset)}

Composition:
${aspectVideoDirection(aspectRatio)}
Use smooth camera movement, premium framing, clear visual hierarchy, elegant motion, and cinematic pacing.
The subject must be easy to understand in the first 1–2 seconds.

Visual quality:
- premium commercial quality
- cinematic lighting and depth
- smooth camera motion
- realistic details and textures
- polished high-end advertising look
- clean background and strong focal point
- luxury marketplace-ready feeling
- avoid ugly composition, clutter, distorted objects, low-quality stock look, cheap flyer style

Motion direction:
Start with a strong hero shot.
Move into subtle premium detail shots or elegant environmental motion.
End with a polished final frame that could work as a listing preview.

Audio direction:
Use subtle natural premium ambience if audio is generated.
No random speech, no random voiceover, no strange music, no noisy sound effects unless explicitly requested.

Text handling:
Do not add random unreadable text, fake letters, fake logos, or fake watermarks.
Only include visible text if the user clearly requested it.
If text is requested, keep it minimal, elegant, readable, and premium.

${referenceInstruction}

Final result:
The video should feel expensive, trustworthy, modern, cinematic, and ready to use as a Realife listing promo.
`);
}

export async function POST(req: Request) {
  let generationId: string | null = null;

  try {
    const form = await req.formData();

    const prompt = cleanText(form.get("prompt"));
    const model = normalizeModel(form.get("model"));
    const aspectRatio = normalizeAspectRatio(form.get("aspectRatio"));
    const seconds = normalizeSeconds(
      form.get("seconds") || form.get("durationSec") || 12
    );
    const preset = normalizePreset(
      form.get("preset") ||
        form.get("mode") ||
        form.get("promptType") ||
        form.get("type"),
      prompt
    );

    const referenceImage = form.get("referenceImage");
    const sourceVideo = form.get("sourceVideo");

    if (!prompt) {
      return NextResponse.json(
        {
          ok: false,
          error: "Prompt is required.",
          message: "Prompt is required.",
        },
        { status: 400 }
      );
    }

    // Important: current route supports prompt + optional reference image.
    // Source video remix/edit needs a separate /videos/edits pipeline.
    if (sourceVideo instanceof File && sourceVideo.size > 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Source video remix/edit is not enabled in this route yet. Please use prompt or reference image for now.",
          message:
            "Source video remix/edit is not enabled in this route yet. Please use prompt or reference image for now.",
        },
        { status: 400 }
      );
    }

    const size = maxVideoSizeForAspectRatio(aspectRatio);

    const enhancedPrompt = buildEnhancedVideoPrompt({
      rawPrompt: prompt,
      preset,
      aspectRatio,
      seconds,
      hasReferenceImage: referenceImage instanceof File,
    });

    const generation = await prisma.aiGeneration.create({
      data: {
        type: AiGenerationType.VIDEO,
        status: AiGenerationStatus.PROCESSING,
        provider: "openai",
        model,
        prompt,
        negativePrompt: enhancedPrompt,
        aspectRatio,
        size,
        durationSec: seconds,
        mimeType:
          referenceImage instanceof File && referenceImage.type
            ? referenceImage.type
            : null,
      },
    });

    generationId = generation.id;

    const referenceImageDataUrl =
      referenceImage instanceof File
        ? await fileToDataUrl(referenceImage)
        : undefined;

    const video = await createVideo({
      prompt: enhancedPrompt,
      model,
      seconds,
      size,
      referenceImageDataUrl,
    });

    await prisma.aiGeneration.update({
      where: { id: generation.id },
      data: {
        externalJobId: video.id,
        status: AiGenerationStatus.PROCESSING,
        errorMessage: null,
      },
    });

    return NextResponse.json({
      ok: true,
      generationId: generation.id,
      id: video.id,
      jobId: video.id,
      videoId: video.id,
      status: video.status,
      progress: video.progress ?? 0,
      model,
      size,
      seconds,
      aspectRatio,
      preset,
      prompt,
      enhancedPrompt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Video generation failed.";

    if (generationId) {
      await prisma.aiGeneration
        .update({
          where: { id: generationId },
          data: {
            status: AiGenerationStatus.FAILED,
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
