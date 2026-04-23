export type ImageSize = "1024x1024" | "1024x1536" | "1536x1024";
export type ImageQuality = "low" | "medium" | "high";
export type VideoSize = "1280x720" | "720x1280" | "1792x1024" | "1024x1792";
export type VideoSeconds = 4 | 8 | 12;
export type VideoModel = "sora-2" | "sora-2-pro";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = "https://api.openai.com/v1";

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

export function mapAspectRatioToImageSize(value?: string): ImageSize {
  switch (value) {
    case "1:1":
      return "1024x1024";
    case "4:5":
      return "1024x1536";
    case "16:9":
    default:
      return "1536x1024";
  }
}

export function mapAspectRatioToVideoSize(value?: string): VideoSize {
  switch (value) {
    case "4:5":
      return "1024x1792";
    case "1:1":
      return "1280x720";
    case "16:9":
    default:
      return "1280x720";
  }
}

export async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "application/octet-stream";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export async function createImage(params: {
  prompt: string;
  size: ImageSize;
  quality: ImageQuality;
  referenceImage?: File | null;
}) {
  const { prompt, size, quality, referenceImage } = params;

  if (referenceImage) {
    const form = new FormData();
    form.set("model", "gpt-image-1");
    form.set("prompt", prompt);
    form.set("size", size);
    form.set("quality", quality);
    form.set("output_format", "png");
    form.set("background", "opaque");
    form.set("image", referenceImage);

    const response = await fetch(`${OPENAI_BASE_URL}/images/edits`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.error?.message || "OpenAI image edit failed.");
    }

    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error("OpenAI returned no image data.");
    }

    return {
      dataUrl: `data:image/png;base64,${b64}`,
      raw: json,
    };
  }

  const response = await fetch(`${OPENAI_BASE_URL}/images/generations`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size,
      quality,
      output_format: "png",
      background: "opaque",
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error?.message || "OpenAI image generation failed.");
  }

  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI returned no image data.");
  }

  return {
    dataUrl: `data:image/png;base64,${b64}`,
    raw: json,
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
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error?.message || "OpenAI video creation failed.");
  }

  return json;
}

export async function retrieveVideo(videoId: string) {
  const response = await fetch(`${OPENAI_BASE_URL}/videos/${videoId}`, {
    method: "GET",
    headers: authHeaders(),
    cache: "no-store",
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error?.message || "OpenAI video status failed.");
  }

  return json;
}

export async function downloadVideoContent(videoId: string, variant: "video" | "thumbnail" | "spritesheet" = "video") {
  const response = await fetch(
    `${OPENAI_BASE_URL}/videos/${videoId}/content?variant=${variant}`,
    {
      method: "GET",
      headers: authHeaders(),
    }
  );

  if (!response.ok) {
    const maybeJson = await safeJson(response);
    throw new Error(maybeJson?.error?.message || "OpenAI video download failed.");
  }

  return response;
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
