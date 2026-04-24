export type ImageSize = "1024x1024" | "1024x1536" | "1536x1024";
export type ImageQuality = "low" | "medium" | "high";

export type VideoSize =
  | "1280x720"
  | "720x1280"
  | "1792x1024"
  | "1024x1792";

export type VideoSeconds = 4 | 8 | 12;
export type VideoModel = "sora-2" | "sora-2-pro";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = "https://api.openai.com/v1";

/**
 * IMPORTANT:
 * gpt-image-2 may require verified organization access.
 * Keep gpt-image-1 as safe default so the live site does not break.
 *
 * Railway:
 * OPENAI_IMAGE_MODEL=gpt-image-1   // safe now
 * OPENAI_IMAGE_MODEL=gpt-image-2   // after verification/access is fully active
 */
const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-1";

/**
 * Mega video default.
 * Railway can override:
 * OPENAI_VIDEO_MODEL=sora-2-pro
 */
const DEFAULT_OPENAI_VIDEO_MODEL: VideoModel = "sora-2-pro";

type OpenAiErrorShape = {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

export type OpenAiVideoJob = {
  id: string;
  status: string;
  progress?: number;
  prompt?: string;
  seconds?: number;
  size?: string;
  error?: {
    message?: string;
  };
};

type OpenAiImageResponse = OpenAiErrorShape & {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cleanString(value: unknown) {
  return String(value || "").trim();
}

export function getOpenAiImageModel() {
  return process.env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_OPENAI_IMAGE_MODEL;
}

export function getOpenAiVideoModel(): VideoModel {
  const model = process.env.OPENAI_VIDEO_MODEL?.trim();

  if (model === "sora-2") return "sora-2";
  if (model === "sora-2-pro") return "sora-2-pro";

  return DEFAULT_OPENAI_VIDEO_MODEL;
}

export function normalizeVideoModel(value?: string | null): VideoModel {
  const v = cleanString(value);

  if (v === "sora-2") return "sora-2";
  if (v === "sora-2-pro") return "sora-2-pro";

  return getOpenAiVideoModel();
}

export function normalizeVideoSeconds(value?: string | number | null): VideoSeconds {
  const n = Number(value);

  if (n === 4) return 4;
  if (n === 8) return 8;
  if (n === 12) return 12;

  return 12;
}

export function assertOpenAiKey() {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing on the server.");
  }
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  assertOpenAiKey();

  return {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    ...extra,
  };
}

export function normalizeImageSize(value?: string | null): ImageSize | null {
  const v = cleanString(value);

  if (v === "1024x1024") return "1024x1024";
  if (v === "1024x1536") return "1024x1536";
  if (v === "1536x1024") return "1536x1024";

  return null;
}

export function mapAspectRatioToImageSize(value?: string): ImageSize {
  switch (value) {
    case "1:1":
      return "1024x1024";

    case "4:5":
    case "9:16":
      return "1024x1536";

    case "16:9":
    default:
      return "1536x1024";
  }
}

/**
 * Mega video size mapping.
 * For premium Sora output we prefer max available sizes.
 */
export function mapAspectRatioToVideoSize(value?: string): VideoSize {
  switch (value) {
    case "9:16":
    case "4:5":
      return "1024x1792";

    case "16:9":
    case "1:1":
    default:
      return "1792x1024";
  }
}

export function normalizeVideoSize(value?: string | null): VideoSize | null {
  const v = cleanString(value);

  if (v === "1280x720") return "1280x720";
  if (v === "720x1280") return "720x1280";
  if (v === "1792x1024") return "1792x1024";
  if (v === "1024x1792") return "1024x1792";

  return null;
}

export async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "application/octet-stream";

  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function safeJson<T = unknown>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function extractErrorMessage(json: unknown, fallback: string) {
  if (
    isRecord(json) &&
    isRecord(json.error) &&
    typeof json.error.message === "string" &&
    json.error.message.trim()
  ) {
    const message = json.error.message.trim();
    const code =
      typeof json.error.code === "string" && json.error.code.trim()
        ? ` Code: ${json.error.code.trim()}.`
        : "";
    const type =
      typeof json.error.type === "string" && json.error.type.trim()
        ? ` Type: ${json.error.type.trim()}.`
        : "";

    return `${message}${code}${type}`;
  }

  return fallback;
}

async function responseUrlToDataUrl(url: string) {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      "OpenAI returned an image URL, but the image download failed."
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "image/png";
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  return `data:${contentType};base64,${base64}`;
}

async function extractImageDataUrl(json: OpenAiImageResponse | null) {
  const first = json?.data?.[0];

  if (first?.b64_json) {
    return `data:image/png;base64,${first.b64_json}`;
  }

  if (first?.url) {
    return await responseUrlToDataUrl(first.url);
  }

  throw new Error("OpenAI returned no image data.");
}

function toVideoJob(json: unknown, fallbackMessage: string): OpenAiVideoJob {
  if (
    !isRecord(json) ||
    typeof json.id !== "string" ||
    typeof json.status !== "string"
  ) {
    throw new Error(fallbackMessage);
  }

  return {
    id: json.id,
    status: json.status,
    progress: typeof json.progress === "number" ? json.progress : undefined,
    prompt: typeof json.prompt === "string" ? json.prompt : undefined,
    seconds: typeof json.seconds === "number" ? json.seconds : undefined,
    size: typeof json.size === "string" ? json.size : undefined,
    error:
      isRecord(json.error) && typeof json.error.message === "string"
        ? { message: json.error.message }
        : undefined,
  };
}

export async function createImage(params: {
  prompt: string;
  size: ImageSize;
  quality: ImageQuality;
  referenceImage?: File | null;
  model?: string;
}) {
  const { prompt, size, quality, referenceImage } = params;
  const model = params.model?.trim() || getOpenAiImageModel();

  if (!prompt.trim()) {
    throw new Error("Image prompt is required.");
  }

  if (referenceImage) {
    const form = new FormData();

    form.append("model", model);
    form.append("prompt", prompt);
    form.append("size", size);
    form.append("quality", quality);
    form.append("output_format", "png");
    form.append("background", "opaque");

    form.append(
      "image[]",
      referenceImage,
      referenceImage.name || "reference.png"
    );

    const response = await fetch(`${OPENAI_BASE_URL}/images/edits`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
      cache: "no-store",
    });

    const json = await safeJson<OpenAiImageResponse>(response);

    if (!response.ok) {
      throw new Error(
        `${extractErrorMessage(json, "OpenAI image edit failed.")} Model: ${model}`
      );
    }

    const dataUrl = await extractImageDataUrl(json);

    return {
      dataUrl,
      raw: json,
      model,
    };
  }

  const response = await fetch(`${OPENAI_BASE_URL}/images/generations`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      quality,
      output_format: "png",
      background: "opaque",
    }),
    cache: "no-store",
  });

  const json = await safeJson<OpenAiImageResponse>(response);

  if (!response.ok) {
    throw new Error(
      `${extractErrorMessage(json, "OpenAI image generation failed.")} Model: ${model}`
    );
  }

  const dataUrl = await extractImageDataUrl(json);

  return {
    dataUrl,
    raw: json,
    model,
  };
}

export async function createVideo(params: {
  prompt: string;
  model?: VideoModel;
  seconds?: VideoSeconds;
  size?: VideoSize;
  aspectRatio?: string;
  referenceImageDataUrl?: string;
}) {
  const {
    prompt,
    referenceImageDataUrl,
  } = params;

  const model = params.model || getOpenAiVideoModel();
  const seconds = params.seconds || 12;
  const size =
    params.size ||
    normalizeVideoSize(params.size) ||
    mapAspectRatioToVideoSize(params.aspectRatio);

  if (!prompt.trim()) {
    throw new Error("Video prompt is required.");
  }

  const body: Record<string, unknown> = {
    prompt,
    model,
    seconds,
    size,
  };

  if (referenceImageDataUrl) {
    body.input_reference = {
      image_url: referenceImageDataUrl,
    };
  }

  const response = await fetch(`${OPENAI_BASE_URL}/videos`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json = await safeJson(response);

  if (!response.ok) {
    throw new Error(
      `${extractErrorMessage(json, "OpenAI video creation failed.")} Model: ${model}. Size: ${size}. Seconds: ${seconds}.`
    );
  }

  return toVideoJob(json, "OpenAI video creation returned invalid response.");
}

export async function retrieveVideo(videoId: string) {
  const id = cleanString(videoId);

  if (!id) {
    throw new Error("Video id is required.");
  }

  const response = await fetch(
    `${OPENAI_BASE_URL}/videos/${encodeURIComponent(id)}`,
    {
      method: "GET",
      headers: authHeaders(),
      cache: "no-store",
    }
  );

  const json = await safeJson(response);

  if (!response.ok) {
    throw new Error(extractErrorMessage(json, "OpenAI video status failed."));
  }

  return toVideoJob(json, "OpenAI video status returned invalid response.");
}

export async function downloadVideoContent(
  videoId: string,
  variant: "video" | "thumbnail" | "spritesheet" = "video"
) {
  const id = cleanString(videoId);

  if (!id) {
    throw new Error("Video id is required.");
  }

  const safeVariant =
    variant === "thumbnail" || variant === "spritesheet" ? variant : "video";

  const response = await fetch(
    `${OPENAI_BASE_URL}/videos/${encodeURIComponent(id)}/content?variant=${safeVariant}`,
    {
      method: "GET",
      headers: authHeaders(),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const maybeJson = await safeJson(response);

    throw new Error(
      extractErrorMessage(maybeJson, "OpenAI video download failed.")
    );
  }

  return response;
}
