"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import NftMedia from "@/components/NftMedia";

type StudioTab = "image" | "video";
type JobState = "idle" | "uploading" | "processing" | "done" | "error";
type ImageQuality = "low" | "medium" | "high";
type VideoModel = "sora-2" | "sora-2-pro";
type ImagePreset = "product" | "service" | "local-service" | "nft-poster";

type ResultCard = {
  id: string;
  type: StudioTab;
  prompt: string;
  status: JobState;
  createdAt: number;
  resultUrl?: string | null;
  previewUrl?: string | null;
  posterUrl?: string | null;
  error?: string | null;
  model?: string | null;
  preset?: string | null;
  quality?: string | null;
  size?: string | null;
  aspectRatio?: string | null;
  seconds?: number | null;
};

const AI_API_BASE = (process.env.NEXT_PUBLIC_AI_API_BASE || "").replace(
  /\/$/,
  ""
);

const IMAGE_ENDPOINT = AI_API_BASE
  ? `${AI_API_BASE}/api/ai/images`
  : "/api/ai/images";

const VIDEO_ENDPOINT = AI_API_BASE
  ? `${AI_API_BASE}/api/ai/videos`
  : "/api/ai/videos";

const VIDEO_STATUS_ENDPOINT = AI_API_BASE
  ? `${AI_API_BASE}/api/ai/videos/status`
  : "/api/ai/videos/status";

const VIDEO_DOWNLOAD_ENDPOINT = AI_API_BASE
  ? `${AI_API_BASE}/api/ai/videos/download`
  : "/api/ai/videos/download";

const IMAGE_MODEL_HINT = "gpt-image-2";
const VIDEO_MODEL_HINT: VideoModel = "sora-2-pro";

const PRODUCT_TEMPLATE =
  "Create a premium NFT-style product card image for fresh Spanish pineapples. Show ripe golden pineapples and juicy slices, luxury commercial quality, clean premium background, elegant black gold and cream mood, realistic food photography, Andalusia Spain feeling, delicious and expensive look. Include clean readable sales text: “PREMIUM PINEAPPLES”, “Juicy & Delicious”, “Spain • Andalusia”, “Phone: +34096554581”, and a small elegant “NFT PRODUCT” badge.";

const SERVICE_TEMPLATE =
  "Create a premium promotional image for a website design service for small businesses. Show a modern elegant workspace, laptop, professional creative atmosphere, black and gold premium style, clean trustworthy commercial quality, realistic lighting, high-end service marketplace cover, NFT service offer feeling.";

const LOCAL_TEMPLATE =
  "Create a premium promotional image for a local offline fitness service in Los Angeles, USA. Show a professional female personal trainer in a clean modern gym environment, trustworthy, elegant, realistic, premium commercial quality, strong local service marketplace cover, NFT service offer style.";

const NFT_TEMPLATE =
  "Create a luxury NFT product poster for a real-world marketplace listing. Premium black and gold collectible card style, elegant frame, cinematic lighting, polished commercial quality, high-end Web3 marketplace visual, strong central product hero, clean typography, expensive and impressive look.";

const VIDEO_TEMPLATE =
  "Create a luxury 12-second commercial video for fresh Spanish pineapples in Andalusia. Show ripe golden pineapples, juicy slices, premium grocery advertising style, slow cinematic camera movement, clean marble surface, tropical leaves, warm sunlight, black and gold Realife NFT marketplace feeling, elegant final hero shot. No random text, no fake logos, no watermark.";

const PRESET_META: Record<
  ImagePreset,
  {
    title: string;
    label: string;
    description: string;
    template: string;
  }
> = {
  product: {
    title: "Premium Product",
    label: "PRODUCT",
    description:
      "Luxury product ad, store item, delivery item, NFT product card.",
    template: PRODUCT_TEMPLATE,
  },
  service: {
    title: "Premium Service",
    label: "SERVICE",
    description:
      "Online service, digital work, consultation, creative or tech offer.",
    template: SERVICE_TEMPLATE,
  },
  "local-service": {
    title: "Local Service",
    label: "LOCAL",
    description:
      "Offline service with city/country, real-world professional offer.",
    template: LOCAL_TEMPLATE,
  },
  "nft-poster": {
    title: "Luxury NFT Poster",
    label: "NFT",
    description:
      "Collectible premium NFT card/poster with strong marketplace style.",
    template: NFT_TEMPLATE,
  },
};

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/70 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
      {children}
    </div>
  );
}

function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-[28px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.30),rgba(212,175,55,0.14),rgba(184,135,10,0.08))]",
        "shadow-[0_26px_100px_rgba(0,0,0,0.55)]",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "relative overflow-hidden rounded-[28px]",
          "border border-white/10 bg-[#0b0a09]/58 backdrop-blur-2xl",
          "ring-1 ring-black/10",
          "before:pointer-events-none before:absolute before:inset-0",
          "before:bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.12),transparent_45%)]",
          "after:pointer-events-none after:absolute after:inset-0",
          "after:bg-[radial-gradient(circle_at_85%_115%,rgba(255,255,255,0.06),transparent_55%)]",
        ].join(" ")}
      >
        <div className="relative z-10 p-6">{children}</div>
      </div>
    </div>
  );
}

function GoldButton({
  children,
  disabled,
  onClick,
  className = "",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "relative inline-flex w-full items-center justify-center overflow-hidden",
        "rounded-2xl px-8 py-4",
        "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
        "text-black font-extrabold tracking-tight",
        "shadow-[0_22px_70px_rgba(212,175,55,0.22)] ring-1 ring-black/15",
        "transition duration-300 hover:-translate-y-px hover:brightness-110 active:translate-y-0",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:brightness-100",
        "before:absolute before:inset-0 before:bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.35),transparent)] before:translate-x-[-140%] before:transition before:duration-700 hover:before:translate-x-[140%]",
        className,
      ].join(" ")}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
}

function GhostButton({
  children,
  disabled,
  onClick,
  className = "",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex w-full items-center justify-center rounded-2xl px-8 py-4",
        "border border-white/15 bg-white/[0.06] text-white font-extrabold",
        "backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)]",
        "transition duration-300 hover:-translate-y-px hover:bg-white/10 active:translate-y-0",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function toObjectUrl(file: File | null) {
  return file ? URL.createObjectURL(file) : null;
}

function defaultSizeForAspectRatio(value: string) {
  switch (value) {
    case "1:1":
      return "1024x1024";
    case "9:16":
    case "4:5":
      return "1024x1536";
    case "16:9":
    default:
      return "1536x1024";
  }
}

function previewAspectClass(value: string) {
  switch (value) {
    case "1:1":
      return "aspect-square";
    case "9:16":
      return "aspect-[9/16]";
    case "4:5":
      return "aspect-[4/5]";
    case "16:9":
    default:
      return "aspect-video";
  }
}

function buildFormData(input: {
  prompt: string;
  referenceImage: File | null;
  aspectRatio: string;
  size: string;
  quality: ImageQuality;
  durationSec: number;
  model: string;
  preset: ImagePreset;
}) {
  const form = new FormData();

  form.append("prompt", input.prompt.trim());
  form.append("aspectRatio", input.aspectRatio);
  form.append("size", input.size);
  form.append("quality", input.quality);
  form.append("seconds", String(input.durationSec));
  form.append("durationSec", String(input.durationSec));
  form.append("model", input.model);

  form.append("preset", input.preset);
  form.append("promptType", input.preset);
  form.append("mode", input.preset);

  if (input.referenceImage) {
    form.append("referenceImage", input.referenceImage);
  }

  return form;
}

function resolveMaybeRelativeUrl(url?: string | null) {
  const value = String(url || "").trim();
  if (!value) return null;

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:")
  ) {
    return value;
  }

  if (value.startsWith("/") && AI_API_BASE) {
    return `${AI_API_BASE}${value}`;
  }

  return value;
}

export default function AiStudioClient() {
  const referenceInputRef = useRef<HTMLInputElement | null>(null);

  const [tab, setTab] = useState<StudioTab>("image");
  const [preset, setPreset] = useState<ImagePreset>("product");
  const [prompt, setPrompt] = useState(PRODUCT_TEMPLATE);

  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);

  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState<ImageQuality>("high");

  const [durationSec, setDurationSec] = useState(12);
  const [videoModel, setVideoModel] = useState<VideoModel>(VIDEO_MODEL_HINT);

  const [state, setState] = useState<JobState>("idle");
  const [error, setError] = useState("");
  const [results, setResults] = useState<ResultCard[]>([]);

  useEffect(() => {
    return () => {
      if (referencePreview) URL.revokeObjectURL(referencePreview);
    };
  }, [referencePreview]);

  const canGenerate = useMemo(() => {
    return (
      prompt.trim().length > 8 &&
      state !== "uploading" &&
      state !== "processing"
    );
  }, [prompt, state]);

  function handleTabChange(nextTab: StudioTab) {
    setTab(nextTab);
    setError("");

    if (nextTab === "video") {
      setAspectRatio("16:9");
      setSize("1536x1024");
      setDurationSec(12);
      setVideoModel("sora-2-pro");

      if (prompt === PRODUCT_TEMPLATE) {
        setPrompt(VIDEO_TEMPLATE);
      }
    }

    if (nextTab === "image") {
      setAspectRatio("1:1");
      setSize("1024x1024");
      setQuality("high");

      if (prompt === VIDEO_TEMPLATE) {
        setPrompt(PRESET_META[preset].template);
      }
    }
  }

  function selectPreset(nextPreset: ImagePreset) {
    setPreset(nextPreset);
    setPrompt(PRESET_META[nextPreset].template);
    setTab("image");
    setAspectRatio("1:1");
    setSize("1024x1024");
    setQuality("high");
    setError("");
  }

  function handleAspectRatioChange(value: string) {
    setAspectRatio(value);
    setSize(defaultSizeForAspectRatio(value));
  }

  function setReference(file: File | null) {
    if (referencePreview) URL.revokeObjectURL(referencePreview);
    setReferenceImage(file);
    setReferencePreview(toObjectUrl(file));
  }

  function pushResult(
    patch: Partial<ResultCard> &
      Pick<ResultCard, "id" | "type" | "prompt" | "status">
  ) {
    setResults((prev) => {
      const i = prev.findIndex((x) => x.id === patch.id);

      const next: ResultCard = {
        id: patch.id,
        type: patch.type,
        prompt: patch.prompt,
        status: patch.status,
        createdAt: Date.now(),
        resultUrl: patch.resultUrl || null,
        previewUrl: patch.previewUrl || null,
        posterUrl: patch.posterUrl || null,
        error: patch.error || null,
        model: patch.model || null,
        preset: patch.preset || null,
        quality: patch.quality || null,
        size: patch.size || null,
        aspectRatio: patch.aspectRatio || null,
        seconds: patch.seconds || null,
      };

      if (i === -1) return [next, ...prev];

      const copy = [...prev];
      copy[i] = {
        ...copy[i],
        ...next,
      };

      return copy;
    });
  }

  function removeResult(id: string) {
    setResults((prev) => prev.filter((x) => x.id !== id));
  }

  async function generateImage() {
    setError("");
    setState("uploading");

    const id = `img_${Date.now()}`;

    pushResult({
      id,
      type: "image",
      prompt,
      status: "processing",
      model: IMAGE_MODEL_HINT,
      preset,
      quality,
      size,
      aspectRatio,
    });

    try {
      const form = buildFormData({
        prompt,
        referenceImage,
        aspectRatio,
        size,
        quality,
        durationSec,
        model: IMAGE_MODEL_HINT,
        preset,
      });

      const res = await fetch(IMAGE_ENDPOINT, {
        method: "POST",
        body: form,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Image generation failed with status ${res.status}`
        );
      }

      const resultUrl = resolveMaybeRelativeUrl(
        data?.resultUrl || data?.imageUrl || data?.url || ""
      );

      const previewUrl = resolveMaybeRelativeUrl(
        data?.previewUrl || resultUrl || ""
      );

      if (!resultUrl) {
        throw new Error("Image API returned no resultUrl");
      }

      pushResult({
        id,
        type: "image",
        prompt,
        status: "done",
        resultUrl,
        previewUrl,
        model: data?.model || IMAGE_MODEL_HINT,
        preset: data?.preset || preset,
        quality: data?.quality || quality,
        size: data?.size || size,
        aspectRatio: data?.aspectRatio || aspectRatio,
      });

      setState("done");
    } catch (e: any) {
      const msg = e?.message || "Image generation failed";

      pushResult({
        id,
        type: "image",
        prompt,
        status: "error",
        error: msg,
        model: IMAGE_MODEL_HINT,
        preset,
        quality,
        size,
        aspectRatio,
      });

      setError(msg);
      setState("error");
    }
  }

  async function pollVideoStatus(jobId: string, promptText: string) {
    for (let i = 0; i < 120; i += 1) {
      const res = await fetch(
        `${VIDEO_STATUS_ENDPOINT}/${encodeURIComponent(jobId)}`,
        { cache: "no-store" }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Video status failed with status ${res.status}`
        );
      }

      const status = String(data?.status || "").toLowerCase();

      if (status === "completed" || status === "done") {
        const resultUrl = resolveMaybeRelativeUrl(
          data?.resultUrl ||
            data?.downloadUrl ||
            `${VIDEO_DOWNLOAD_ENDPOINT}/${encodeURIComponent(jobId)}`
        );

        const previewUrl = resolveMaybeRelativeUrl(
          data?.previewUrl || resultUrl || ""
        );

        const posterUrl = resolveMaybeRelativeUrl(data?.posterUrl || "");

        pushResult({
          id: jobId,
          type: "video",
          prompt: promptText,
          status: "done",
          resultUrl,
          previewUrl,
          posterUrl,
          model: videoModel,
          preset,
          quality,
          size: data?.size || "1792x1024",
          aspectRatio,
          seconds: Number(data?.seconds || durationSec),
        });

        setState("done");
        return;
      }

      if (status === "failed" || status === "error" || status === "cancelled") {
        const msg = String(
          data?.error || data?.message || "Video generation failed"
        );

        pushResult({
          id: jobId,
          type: "video",
          prompt: promptText,
          status: "error",
          error: msg,
          model: videoModel,
          preset,
          quality,
          size: data?.size || "1792x1024",
          aspectRatio,
          seconds: durationSec,
        });

        setError(msg);
        setState("error");
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 4000));
    }

    throw new Error("Video generation is taking longer than expected");
  }

  async function generateVideo() {
    setError("");
    setState("uploading");

    const tempId = `video_local_${Date.now()}`;

    pushResult({
      id: tempId,
      type: "video",
      prompt,
      status: "processing",
      model: videoModel,
      preset,
      quality,
      size: "1792x1024",
      aspectRatio,
      seconds: durationSec,
    });

    try {
      const form = buildFormData({
        prompt,
        referenceImage,
        aspectRatio,
        size,
        quality,
        durationSec,
        model: videoModel,
        preset,
      });

      const res = await fetch(VIDEO_ENDPOINT, {
        method: "POST",
        body: form,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Video generation failed with status ${res.status}`
        );
      }

      const realJobId = String(
        data?.videoId || data?.jobId || data?.id || ""
      ).trim();

      if (!realJobId) {
        throw new Error("Video API returned no job id");
      }

      removeResult(tempId);

      pushResult({
        id: realJobId,
        type: "video",
        prompt,
        status: "processing",
        model: data?.model || videoModel,
        preset: data?.preset || preset,
        quality,
        size: data?.size || "1792x1024",
        aspectRatio: data?.aspectRatio || aspectRatio,
        seconds: Number(data?.seconds || durationSec),
      });

      setState("processing");

      try {
        await pollVideoStatus(realJobId, prompt);
      } catch (pollError: any) {
        const msg =
          pollError?.message ||
          "Video generation is taking longer than expected";

        pushResult({
          id: realJobId,
          type: "video",
          prompt,
          status: "error",
          error: msg,
          model: videoModel,
          preset,
          quality,
          size: "1792x1024",
          aspectRatio,
          seconds: durationSec,
        });

        setError(msg);
        setState("error");
      }
    } catch (e: any) {
      const msg = e?.message || "Video generation failed";

      pushResult({
        id: tempId,
        type: "video",
        prompt,
        status: "error",
        error: msg,
        model: videoModel,
        preset,
        quality,
        size: "1792x1024",
        aspectRatio,
        seconds: durationSec,
      });

      setError(msg);
      setState("error");
    }
  }

  const mainResult = results[0] || null;

  return (
    <div className="grid grid-cols-1 gap-10 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-8">
        <Card>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                AI mode
              </div>
              <div className="mt-1 text-[11px] text-white/55">
                Choose whether you want a premium image or Sora commercial video.
              </div>
            </div>

            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Mega quality
            </Pill>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => handleTabChange("image")}
              className={cx(
                "rounded-2xl border px-4 py-4 text-left transition shadow-[0_14px_50px_rgba(0,0,0,0.26)]",
                tab === "image"
                  ? "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black border-black/10 ring-1 ring-black/10"
                  : "border-white/10 bg-white/[0.06] text-white hover:bg-white/10"
              )}
            >
              <div className="text-sm font-extrabold">Generate image</div>
              <div
                className={
                  tab === "image"
                    ? "mt-1 text-xs text-black/70"
                    : "mt-1 text-xs text-white/55"
                }
              >
                GPT Image 2 product card, service cover, local service visual,
                NFT poster.
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("video")}
              className={cx(
                "rounded-2xl border px-4 py-4 text-left transition shadow-[0_14px_50px_rgba(0,0,0,0.26)]",
                tab === "video"
                  ? "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] text-black border-black/10 ring-1 ring-black/10"
                  : "border-white/10 bg-white/[0.06] text-white hover:bg-white/10"
              )}
            >
              <div className="text-sm font-extrabold">Generate video</div>
              <div
                className={
                  tab === "video"
                    ? "mt-1 text-xs text-black/70"
                    : "mt-1 text-xs text-white/55"
                }
              >
                Sora 2 Pro commercial, cinematic promo, service ad, listing
                trailer.
              </div>
            </button>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Premium preset
              </div>
              <div className="mt-1 text-[11px] text-white/55">
                Choose the visual direction before generation.
              </div>
            </div>

            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Art direction
            </Pill>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {(Object.keys(PRESET_META) as ImagePreset[]).map((key) => {
              const item = PRESET_META[key];
              const active = preset === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectPreset(key)}
                  className={cx(
                    "rounded-2xl border p-4 text-left transition shadow-[0_14px_50px_rgba(0,0,0,0.22)]",
                    active
                      ? "border-[#d4af37]/45 bg-[#d4af37]/12 ring-1 ring-[#d4af37]/25"
                      : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-black text-white">
                      {item.title}
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[10px] font-black text-[#f7e7a7]">
                      {item.label}
                    </span>
                  </div>

                  <div className="mt-2 text-xs leading-relaxed text-white/58">
                    {item.description}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight">Prompt</div>
              <div className="mt-1 text-[11px] text-white/55">
                Write clearly what product or service you want to sell.
              </div>
            </div>

            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Required
            </Pill>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: Create a premium NFT-style product card for fresh pineapples in Andalusia, Spain, juicy and delicious, black gold luxury style, readable text, commercial quality."
            className="min-h-[230px] w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-white placeholder:text-white/35 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
          />

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <GhostButton onClick={() => selectPreset("product")}>
              Product
            </GhostButton>

            <GhostButton onClick={() => selectPreset("service")}>
              Service
            </GhostButton>

            <GhostButton onClick={() => selectPreset("local-service")}>
              Local
            </GhostButton>

            <GhostButton onClick={() => selectPreset("nft-poster")}>
              NFT poster
            </GhostButton>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Reference image
              </div>
              <div className="mt-1 text-[11px] text-white/55">
                Upload your product, face, logo, brand image, or another visual
                reference.
              </div>
            </div>

            <Pill>
              <span className="h-2 w-2 rounded-full bg-white/60" />
              Optional
            </Pill>
          </div>

          <input
            ref={referenceInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setReference(e.target.files?.[0] || null)}
          />

          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              {referencePreview ? (
                <img
                  src={referencePreview}
                  alt="Reference"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="px-3 text-center text-[10px] text-white/45">
                  No image
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs text-white/60">
                {referenceImage ? (
                  <span className="block truncate font-semibold text-white/80">
                    {referenceImage.name}
                  </span>
                ) : tab === "video" ? (
                  "Reference image can help Sora follow a product, face, style, or brand direction."
                ) : (
                  "Reference images help GPT Image 2 create more accurate and personalized visuals."
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => referenceInputRef.current?.click()}
                  className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-extrabold transition hover:bg-white/10"
                >
                  Upload image
                </button>

                {referenceImage ? (
                  <button
                    type="button"
                    onClick={() => setReference(null)}
                    className="rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-extrabold text-white/70 transition hover:bg-white/[0.06]"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </Card>

        {tab === "video" ? (
          <Card>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <div className="text-sm font-extrabold tracking-tight">
                  Premium video mode
                </div>
                <div className="mt-1 text-[11px] text-white/55">
                  Current video generation uses prompt and optional reference
                  image. Source video remix can be added later as a separate flow.
                </div>
              </div>

              <Pill>
                <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
                Sora
              </Pill>
            </div>

            <div className="rounded-2xl border border-[#d4af37]/15 bg-[#d4af37]/8 px-4 py-3 text-[12px] leading-relaxed text-white/65">
              For best results use{" "}
              <span className="font-bold text-white">16:9</span>,{" "}
              <span className="font-bold text-white">12 seconds</span>,{" "}
              <span className="font-bold text-white">sora-2-pro</span>, and
              write a cinematic commercial prompt with camera movement, lighting,
              product/service details, and final hero shot.
            </div>
          </Card>
        ) : null}

        <Card>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Generation settings
              </div>
              <div className="mt-1 text-[11px] text-white/55">
                Image: 1:1 + High. Video: 16:9 + 12 sec + sora-2-pro.
              </div>
            </div>

            <Pill>
              <span className="h-2 w-2 rounded-full bg-white/60" />
              Flexible
            </Pill>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-white/45">
                Aspect ratio
              </div>
              <select
                value={aspectRatio}
                onChange={(e) => handleAspectRatioChange(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#15120b] px-4 py-3 text-sm text-white focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
              >
                <option value="1:1">1:1 NFT / product card</option>
                <option value="16:9">16:9 cinematic video / banner</option>
                <option value="9:16">9:16 mobile story</option>
                <option value="4:5">4:5 social post</option>
              </select>
            </div>

            <div>
              <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-white/45">
                Image size
              </div>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#15120b] px-4 py-3 text-sm text-white focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
              >
                <option value="1024x1024">1024 × 1024</option>
                <option value="1536x1024">1536 × 1024</option>
                <option value="1024x1536">1024 × 1536</option>
              </select>
            </div>

            <div>
              <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-white/45">
                Image quality
              </div>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as ImageQuality)}
                className="w-full rounded-2xl border border-white/10 bg-[#15120b] px-4 py-3 text-sm text-white focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
              >
                <option value="high">High — premium</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-white/45">
                Video duration
              </div>
              <select
                value={durationSec}
                onChange={(e) => setDurationSec(Number(e.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-[#15120b] px-4 py-3 text-sm text-white focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
              >
                <option value={12}>12 sec — premium</option>
                <option value={8}>8 sec</option>
                <option value={4}>4 sec</option>
              </select>
            </div>

            <div className="md:col-span-2 xl:col-span-4">
              <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-white/45">
                Video model
              </div>
              <select
                value={videoModel}
                onChange={(e) => setVideoModel(e.target.value as VideoModel)}
                className="w-full rounded-2xl border border-white/10 bg-[#15120b] px-4 py-3 text-sm text-white focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
              >
                <option value="sora-2-pro">sora-2-pro — premium</option>
                <option value="sora-2">sora-2</option>
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <div className="space-y-3">
            <GoldButton
              disabled={!canGenerate || tab !== "image"}
              onClick={generateImage}
            >
              {state === "uploading" && tab === "image"
                ? "Generating with GPT Image 2…"
                : "Generate with GPT Image 2"}
            </GoldButton>

            <GhostButton
              disabled={!canGenerate || tab !== "video"}
              onClick={generateVideo}
            >
              {state === "uploading" && tab === "video"
                ? "Submitting Sora 2 Pro job…"
                : state === "processing" && tab === "video"
                  ? "Sora video is rendering…"
                  : "Generate Sora 2 Pro video"}
            </GhostButton>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl border border-[#d4af37]/15 bg-[#d4af37]/8 px-4 py-3 text-[11px] leading-relaxed text-white/62">
            Best image result: use{" "}
            <span className="font-bold text-white">1:1</span>,{" "}
            <span className="font-bold text-white">High</span>, and a premium
            preset. Best video result: use{" "}
            <span className="font-bold text-white">16:9</span>,{" "}
            <span className="font-bold text-white">12 sec</span>, and{" "}
            <span className="font-bold text-white">sora-2-pro</span>. Your
            server route enhances the prompt before sending it to OpenAI.
          </div>
        </Card>
      </div>

      <div className="space-y-8">
        <Card>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Beginner tutorial
              </div>
              <div className="mt-1 text-[11px] text-white/55">
                Simple guide for sellers who are new to AI generation.
              </div>
            </div>

            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Tutorial
            </Pill>
          </div>

          <div className="space-y-4 text-sm leading-relaxed text-white/70">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="font-extrabold text-white">Product image</div>
              <div className="mt-2 text-[13px] text-white/65">
                Describe the product, country/city, material, taste, color,
                style, price feeling, and whether you want NFT product card text.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="font-extrabold text-white">Service image</div>
              <div className="mt-2 text-[13px] text-white/65">
                Describe what service you provide, who needs it, and what visual
                scene proves trust and quality.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="font-extrabold text-white">
                Local offline service
              </div>
              <div className="mt-2 text-[13px] text-white/65">
                Include city and country. Example: personal trainer in Los
                Angeles, repair service in Kyiv, guide in Sofia.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="font-extrabold text-white">Sora video</div>
              <div className="mt-2 text-[13px] text-white/65">
                For video, describe camera movement, lighting, first shot, close-up
                details, and final hero frame. Use 12 seconds for premium results.
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Live preview
              </div>
              <div className="mt-1 text-[11px] text-white/55">
                The latest generated result appears here.
              </div>
            </div>

            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Live
            </Pill>
          </div>

          <div className="overflow-hidden rounded-[26px] border border-white/10 bg-black/30">
            <div
              className={cx(
                "relative",
                previewAspectClass(
                  mainResult?.aspectRatio || aspectRatio || "1:1"
                )
              )}
            >
              {mainResult?.resultUrl ? (
                <NftMedia
                  src={mainResult.resultUrl}
                  kind={mainResult.type === "video" ? "video" : "image"}
                  alt="AI result preview"
                  poster={
                    mainResult.type === "video"
                      ? mainResult.posterUrl || null
                      : null
                  }
                  showControls={mainResult.type === "video"}
                  className="h-full w-full"
                  roundedClass="rounded-none"
                  fit="contain"
                  mediaBgClass="bg-black"
                />
              ) : mainResult?.status === "error" ? (
                <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-rose-200">
                  {mainResult.error || "Generation failed"}
                </div>
              ) : referencePreview ? (
                <img
                  src={referencePreview}
                  alt="Reference preview"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center px-6 text-center text-xs text-white/45">
                  Your premium AI result will appear here
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.64),transparent_62%)]" />

              <div className="absolute bottom-3 left-3 right-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-black text-[#f7e7a7]">
                    {mainResult
                      ? mainResult.type === "video"
                        ? "AI VIDEO"
                        : "AI IMAGE"
                      : "AI STUDIO"}
                  </span>

                  <span className="rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-black text-white/70">
                    {PRESET_META[preset].label}
                  </span>

                  <span className="rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-black text-white/70">
                    {mainResult?.type === "video"
                      ? `${mainResult.seconds || durationSec} SEC`
                      : quality.toUpperCase()}
                  </span>
                </div>

                <div className="mt-2 line-clamp-2 text-[11px] text-white/70">
                  {mainResult?.prompt ||
                    prompt ||
                    "Write a prompt to generate your result."}
                </div>
              </div>
            </div>
          </div>

          {mainResult ? (
            <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] text-white/55">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                Model:{" "}
                <span className="font-bold text-white/80">
                  {mainResult.model ||
                    (mainResult.type === "image"
                      ? IMAGE_MODEL_HINT
                      : videoModel)}
                </span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                Size:{" "}
                <span className="font-bold text-white/80">
                  {mainResult.size || size}
                </span>
              </div>
            </div>
          ) : null}
        </Card>

        <Card>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-extrabold tracking-tight">
                Recent results
              </div>
              <div className="mt-1 text-[11px] text-white/55">
                Current browser session history.
              </div>
            </div>

            <Pill>
              <span className="h-2 w-2 rounded-full bg-white/60" />
              Session
            </Pill>
          </div>

          <div className="space-y-4">
            {results.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-[13px] text-white/55">
                No generated results yet.
              </div>
            ) : (
              results.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill>
                      <span className="font-extrabold text-white/80">
                        {item.type === "video" ? "VIDEO" : "IMAGE"}
                      </span>
                    </Pill>

                    <Pill>
                      <span className="font-extrabold text-white/80">
                        {item.status.toUpperCase()}
                      </span>
                    </Pill>

                    {item.model ? (
                      <Pill>
                        <span className="font-extrabold text-white/80">
                          {item.model}
                        </span>
                      </Pill>
                    ) : null}
                  </div>

                  <div className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-white/65">
                    {item.prompt}
                  </div>

                  {item.resultUrl ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                      <div
                        className={cx(
                          "relative",
                          previewAspectClass(item.aspectRatio || "1:1")
                        )}
                      >
                        <NftMedia
                          src={item.resultUrl}
                          kind={item.type === "video" ? "video" : "image"}
                          alt="AI result"
                          poster={
                            item.type === "video" ? item.posterUrl || null : null
                          }
                          showControls={item.type === "video"}
                          className="h-full w-full"
                          roundedClass="rounded-none"
                          fit="contain"
                          mediaBgClass="bg-black"
                        />
                      </div>
                    </div>
                  ) : null}

                  {item.error ? (
                    <div className="mt-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                      {item.error}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
