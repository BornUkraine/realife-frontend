import { NextResponse } from "next/server";
import { AiGenerationStatus, AiGenerationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createImage,
  getOpenAiImageModel,
  mapAspectRatioToImageSize,
  normalizeImageSize,
  type ImageQuality,
} from "@/lib/ai/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type AiImagePreset =
  | "product"
  | "service"
  | "local-service"
  | "nft-poster"
  | "general";

const ALLOWED_ASPECT_RATIOS = new Set(["1:1", "4:5", "9:16", "16:9"]);

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function normalizeQuality(value: unknown): ImageQuality {
  const v = cleanText(value).toLowerCase();

  if (v === "low") return "low";
  if (v === "medium") return "medium";
  if (v === "high") return "high";

  // Mega quality by default.
  return "high";
}

function normalizeAspectRatio(value: unknown) {
  const v = cleanText(value);

  if (ALLOWED_ASPECT_RATIOS.has(v)) {
    return v;
  }

  // Best default for NFT cards, product covers, Realife marketplace visuals.
  return "1:1";
}

function compactPrompt(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function detectPresetFromPrompt(prompt: string): AiImagePreset {
  const p = prompt.toLowerCase();

  if (
    p.includes("local service") ||
    p.includes("offline service") ||
    p.includes("city") ||
    p.includes("near me") ||
    p.includes("fitness") ||
    p.includes("trainer") ||
    p.includes("repair") ||
    p.includes("cleaning") ||
    p.includes("electrician") ||
    p.includes("plumber")
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
    p.includes("token") ||
    p.includes("onchain") ||
    p.includes("web3")
  ) {
    return "nft-poster";
  }

  if (
    p.includes("product") ||
    p.includes("sell") ||
    p.includes("shop") ||
    p.includes("store") ||
    p.includes("premium") ||
    p.includes("pineapple") ||
    p.includes("food") ||
    p.includes("delivery") ||
    p.includes("goods")
  ) {
    return "product";
  }

  return "general";
}

function normalizePreset(value: unknown, prompt: string): AiImagePreset {
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
  if (v === "general") return "general";

  return detectPresetFromPrompt(prompt);
}

function aspectInstruction(aspectRatio: string) {
  switch (aspectRatio) {
    case "1:1":
      return "Square 1:1 composition, perfect for NFT marketplace cards, product covers, and social media.";
    case "4:5":
      return "Vertical 4:5 premium social-commerce composition with strong central subject and elegant spacing.";
    case "9:16":
      return "Tall 9:16 premium mobile-first composition, cinematic and clean, with the subject clearly visible.";
    case "16:9":
      return "Wide 16:9 cinematic composition, premium commercial banner style, with strong visual hierarchy.";
    default:
      return "Premium marketplace-ready composition with balanced framing and a clear focal point.";
  }
}

function userAskedForText(prompt: string) {
  const p = prompt.toLowerCase();

  return (
    /\+?\d[\d\s().-]{6,}/.test(prompt) ||
    p.includes("phone") ||
    p.includes("number") ||
    p.includes("text") ||
    p.includes("write") ||
    p.includes("title") ||
    p.includes("headline") ||
    p.includes("logo") ||
    p.includes("price") ||
    p.includes("contact") ||
    p.includes("instagram") ||
    p.includes("telegram") ||
    p.includes("whatsapp") ||
    p.includes("sell in") ||
    p.includes("we sell")
  );
}

function presetArtDirection(preset: AiImagePreset) {
  if (preset === "product") {
    return `
Preset: PREMIUM PRODUCT ADVERTISEMENT

Create a luxury product advertising visual, not a simple product photo.
The image should feel like a polished premium e-commerce campaign, suitable for Realife marketplace.

Visual direction:
- product must be clear, attractive, desirable, and ready to sell
- premium commercial photography
- elegant background, clean luxury scene, beautiful reflections if appropriate
- strong product hero composition
- realistic textures, juicy/fresh/material details where relevant
- premium black, cream, gold, glass, marble, natural light, or luxury studio feeling when appropriate
- cinematic lighting, depth, sharp details, refined shadows
- high-end online store / Web3 marketplace presentation
`;
  }

  if (preset === "service") {
    return `
Preset: PREMIUM SERVICE COVER

Create a premium service advertisement cover, not a generic stock image.
The image should make the service look trustworthy, expensive, professional, and ready to buy.

Visual direction:
- show the value of the service visually
- premium lifestyle / business / creator economy aesthetic
- clean professional scene, beautiful lighting, strong composition
- human work, skill, trust, and real-world utility should feel important
- marketplace-ready cover image for a Web3 service NFT
`;
  }

  if (preset === "local-service") {
    return `
Preset: PREMIUM LOCAL OFFLINE SERVICE

Create a premium local/offline service advertising image.
The result should feel realistic, trustworthy, local, beautiful, and commercially useful.

Visual direction:
- show a real-world professional or service environment
- make the person/service provider look skilled, reliable, and premium
- include subtle city/local atmosphere if requested
- clean commercial look, not cheap stock photography
- suitable for selling an offline service as an NFT-based offer
`;
  }

  if (preset === "nft-poster") {
    return `
Preset: LUXURY NFT PRODUCT CARD / COLLECTIBLE POSTER

Create a premium NFT-style visual with collectible energy.
The result should look like a high-end digital asset cover, not a cheap crypto graphic.

Visual direction:
- elegant NFT marketplace card feeling
- premium border/frame feeling if it fits the request
- luxury gold accents, glassmorphism, cinematic depth, polished composition
- clear central subject, strong hierarchy, rich details
- Web3 premium collectible mood without looking childish or noisy
`;
  }

  return `
Preset: PREMIUM GENERAL VISUAL

Create a highly polished premium visual with strong art direction.
The result should feel refined, beautiful, expensive, and marketplace-ready.
`;
}

function buildEnhancedImagePrompt(params: {
  rawPrompt: string;
  preset: AiImagePreset;
  aspectRatio: string;
  hasReferenceImage: boolean;
}) {
  const { rawPrompt, preset, aspectRatio, hasReferenceImage } = params;
  const shouldRenderText = userAskedForText(rawPrompt);

  const textInstruction = shouldRenderText
    ? `
Text handling:
The user request may contain exact visible text, phone numbers, city names, product names, or sales copy.
If visible text is requested, render it cleanly, large enough to read, and as accurately as possible.
Do not invent extra random words, fake phone numbers, fake brands, or nonsense letters.
Keep typography premium, elegant, balanced, and integrated into the design.
`
    : `
Text handling:
Do not add random text, fake letters, fake logos, fake phone numbers, or watermark-like marks.
Only include text if it is clearly required by the user's request.
`;

  const referenceInstruction = hasReferenceImage
    ? `
Reference image:
Use the uploaded reference image as visual guidance.
Preserve the important identity, product shape, logo, or subject from the reference where relevant.
Improve the result into a premium commercial-quality image while keeping the original request.
`
    : "";

  return compactPrompt(`
You are creating a top-tier premium AI image for Realife, a Web3 marketplace for real-world products, services, delivery, and NFT-based ownership.

User request:
"${rawPrompt}"

Goal:
Make the final image look as impressive, polished, and premium as a high-end ChatGPT image generation result.
This must be a finished commercial visual, not a basic generated picture.

${presetArtDirection(preset)}

Composition:
${aspectInstruction(aspectRatio)}
Create a strong hero image with clear focal point, elegant spacing, premium balance, and beautiful framing.
Avoid boring centered object-only output unless the request specifically requires it.
Avoid clutter, messy backgrounds, distorted objects, cheap flyer style, low-quality stock-photo feeling, and ugly composition.

Quality bar:
- ultra-polished premium commercial quality
- beautiful lighting and shadows
- crisp details and realistic textures
- refined color palette
- luxury marketplace / high-end advertising aesthetic
- cinematic depth and clean visual hierarchy
- visually impressive enough to be used as a Realife NFT/product/service cover

${textInstruction}

${referenceInstruction}

Final result:
The image should feel expensive, modern, clean, premium, and ready to publish on a marketplace.
`);
}

export async function POST(req: Request) {
  let generationId: string | null = null;

  try {
    const form = await req.formData();

    const prompt = cleanText(form.get("prompt"));
    const quality = normalizeQuality(form.get("quality"));
    const aspectRatio = normalizeAspectRatio(form.get("aspectRatio"));
    const requestedSize = cleanText(form.get("size"));
    const referenceImage = form.get("referenceImage");

    const preset = normalizePreset(
      form.get("preset") ||
        form.get("mode") ||
        form.get("promptType") ||
        form.get("type"),
      prompt
    );

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

    const imageModel = getOpenAiImageModel();
    const finalSize =
      normalizeImageSize(requestedSize) ||
      mapAspectRatioToImageSize(aspectRatio);

    const enhancedPrompt = buildEnhancedImagePrompt({
      rawPrompt: prompt,
      preset,
      aspectRatio,
      hasReferenceImage: referenceImage instanceof File,
    });

    const generation = await prisma.aiGeneration.create({
      data: {
        type: AiGenerationType.IMAGE,
        status: AiGenerationStatus.PROCESSING,
        provider: "openai",
        model: imageModel,
        prompt,
        quality,
        aspectRatio,
        size: finalSize,
        mimeType:
          referenceImage instanceof File && referenceImage.type
            ? referenceImage.type
            : null,
      },
    });

    generationId = generation.id;

    const result = await createImage({
      prompt: enhancedPrompt,
      size: finalSize,
      quality,
      referenceImage: referenceImage instanceof File ? referenceImage : null,
    });

    await prisma.aiGeneration.update({
      where: { id: generation.id },
      data: {
        status: AiGenerationStatus.COMPLETED,
        previewUrl: result.dataUrl,
        resultUrl: result.dataUrl,
        errorMessage: null,
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
      enhancedPrompt,
      preset,
      quality,
      aspectRatio,
      size: finalSize,
      model: imageModel,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Image generation failed.";

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
