export type ImageSize = "1024x1024" | "1024x1536" | "1536x1024";
export type ImageQuality = "low" | "medium" | "high";
export type VideoSize = "1280x720" | "720x1280" | "1792x1024" | "1024x1792";
export type VideoSeconds = 4 | 8 | 12;
export type VideoModel = "sora-2" | "sora-2-pro";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = "https://api.openai.com/v1";

const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-2";

type OpenAiErrorShape = {
  error?: {
    message?: string;
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

export function getOpenAiImageModel() {
  return (
    process.env.OPENAI_IMAGE_MODEL?.trim() ||
    DEFAULT_OPENAI_IMAGE_MODEL
  );
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
  const v = String(value || "").trim();

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

export function mapAspectRatioToVideoSize(value?: string): VideoSize {
  switch (value) {
    case "9:16":
      return "720x1280";

    case "4:5":
      return "1024x1792";

    case "16:9":
    case "1:1":
    default:
      return "1280x720";
  }
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
    return json.error.message.trim();
  }

  return fallback;
}

async function responseUrlToDataUrl(url: string) {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("OpenAI returned an image URL, but the image download failed.");
  }

  const arrayBuffer = await response.arrayBuffer();
  const contentType =
    response.headers.get("content-type") || "image/png";
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

  if (referenceImage) {
    const form = new FormData();

    form.append("model", model);
    form.append("prompt", prompt);
    form.append("size", size);
    form.append("quality", quality);
    form.append("output_format", "png");
    form.append("background", "opaque");

    // The image edit endpoint accepts multipart image input.
    // Keeping image[] supports multi-image style input while still working for one reference.
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
  model: VideoModel;
  seconds: VideoSeconds;
  size: VideoSize;
  referenceImageDataUrl?: string;
}) {
  const { prompt, model, seconds, size, referenceImageDataUrl } = params;

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
    throw new Error(extractErrorMessage(json, "OpenAI video creation failed."));
  }

  return toVideoJob(json, "OpenAI video creation returned invalid response.");
}

export async function retrieveVideo(videoId: string) {
  const response = await fetch(`${OPENAI_BASE_URL}/videos/${videoId}`, {
    method: "GET",
    headers: authHeaders(),
    cache: "no-store",
  });

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
  const response = await fetch(
    `${OPENAI_BASE_URL}/videos/${videoId}/content?variant=${variant}`,
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
