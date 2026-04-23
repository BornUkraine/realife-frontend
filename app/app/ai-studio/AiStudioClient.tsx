"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import NftMedia from "@/components/NftMedia";

type StudioTab = "image" | "video";
type JobState = "idle" | "uploading" | "processing" | "done" | "error";
type ImageQuality = "low" | "medium" | "high";

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
};

const AI_API_BASE = (process.env.NEXT_PUBLIC_AI_API_BASE || "").replace(/\/$/, "");

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
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.26),rgba(212,175,55,0.12),rgba(184,135,10,0.08))]",
        "shadow-[0_26px_100px_rgba(0,0,0,0.55)]",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "relative overflow-hidden rounded-[28px]",
          "border border-white/10 bg-[#0b0a09]/55 backdrop-blur-2xl",
          "ring-1 ring-black/10",
          "before:pointer-events-none before:absolute before:inset-0",
          "before:bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.10),transparent_45%)]",
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
        "shadow-[0_22px_70px_rgba(212,175,55,0.18)] ring-1 ring-black/15",
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

function buildFormData(input: {
  prompt: string;
  referenceImage: File | null;
  sourceVideo: File | null;
  aspectRatio: string;
  size: string;
  quality: ImageQuality;
  durationSec: number;
  model: string;
}) {
  const form = new FormData();
  form.append("prompt", input.prompt.trim());
  form.append("aspectRatio", input.aspectRatio);
  form.append("size", input.size);
  form.append("quality", input.quality);
  form.append("seconds", String(input.durationSec));
  form.append("model", input.model);

  if (input.referenceImage) {
    form.append("referenceImage", input.referenceImage);
  }

  if (input.sourceVideo) {
    form.append("sourceVideo", input.sourceVideo);
  }

  return form;
}

function resolveMaybeRelativeUrl(url?: string | null) {
  const value = String(url || "").trim();
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }
  if (value.startsWith("/") && AI_API_BASE) {
    return `${AI_API_BASE}${value}`;
  }
  return value;
}

const PRODUCT_TEMPLATE =
  "Create a premium product image for [product]. Show the product clearly with [color/material/style], clean background, realistic commercial quality, premium look.";

const SERVICE_TEMPLATE =
  "Create a professional promotional image for [service]. Show a visual scene that represents this service for [target audience], premium, clean, trustworthy, realistic style.";

const LOCAL_TEMPLATE =
  "Create a promotional image for [service] in [city, country]. Show a realistic local environment, premium presentation, trustworthy and professional look for people who need this service.";

export default function AiStudioClient() {
  const referenceInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const [tab, setTab] = useState<StudioTab>("image");
  const [prompt, setPrompt] = useState("");
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [sourceVideo, setSourceVideo] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [sourceVideoPreview, setSourceVideoPreview] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState<ImageQuality>("medium");
  const [durationSec, setDurationSec] = useState(8);
  const [videoModel, setVideoModel] = useState("sora-2");
  const [state, setState] = useState<JobState>("idle");
  const [error, setError] = useState("");
  const [results, setResults] = useState<ResultCard[]>([]);

  useEffect(() => {
    return () => {
      if (referencePreview) URL.revokeObjectURL(referencePreview);
      if (sourceVideoPreview) URL.revokeObjectURL(sourceVideoPreview);
    };
  }, [referencePreview, sourceVideoPreview]);

  const canGenerate = useMemo(() => {
    return prompt.trim().length > 8 && state !== "uploading" && state !== "processing";
  }, [prompt, state]);

  function setReference(file: File | null) {
    if (referencePreview) URL.revokeObjectURL(referencePreview);
    setReferenceImage(file);
    setReferencePreview(toObjectUrl(file));
  }

  function setVideo(file: File | null) {
    if (sourceVideoPreview) URL.revokeObjectURL(sourceVideoPreview);
    setSourceVideo(file);
    setSourceVideoPreview(toObjectUrl(file));
  }

  function pushResult(
    patch: Partial<ResultCard> & Pick<ResultCard, "id" | "type" | "prompt" | "status">
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

  async function generateImage() {
    setError("");
    setState("uploading");

    const id = `img_${Date.now()}`;
    pushResult({ id, type: "image", prompt, status: "processing" });

    try {
      const form = buildFormData({
        prompt,
        referenceImage,
        sourceVideo: null,
        aspectRatio,
        size,
        quality,
        durationSec,
        model: "gpt-image-1",
      });

      const res = await fetch(IMAGE_ENDPOINT, {
        method: "POST",
        body: form,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Image generation failed");
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
      });
      setError(msg);
      setState("error");
    }
  }

  async function pollVideoStatus(jobId: string, promptText: string) {
    for (let i = 0; i < 90; i += 1) {
      const res = await fetch(
        `${VIDEO_STATUS_ENDPOINT}/${encodeURIComponent(jobId)}`,
        { cache: "no-store" }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Video status failed");
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

        const posterUrl = resolveMaybeRelativeUrl(
          data?.posterUrl || ""
        );

        pushResult({
          id: jobId,
          type: "video",
          prompt: promptText,
          status: "done",
          resultUrl,
          previewUrl,
          posterUrl,
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

    try {
      const form = buildFormData({
        prompt,
        referenceImage,
        sourceVideo,
        aspectRatio,
        size,
        quality,
        durationSec,
        model: videoModel,
      });

      const res = await fetch(VIDEO_ENDPOINT, {
        method: "POST",
        body: form,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Video generation failed");
      }

      const id = String(
        data?.videoId || data?.jobId || data?.id || ""
      ).trim();

      if (!id) {
        throw new Error("Video API returned no job id");
      }

      pushResult({
        id,
        type: "video",
        prompt,
        status: "processing",
      });

      setState("processing");
      await pollVideoStatus(id, prompt);
    } catch (e: any) {
      const msg = e?.message || "Video generation failed";
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
              <div className="text-sm font-extrabold tracking-tight">AI mode</div>
              <div className="mt-1 text-[11px] text-white/55">
                Choose whether you want an image or a short video.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Required
            </Pill>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setTab("image")}
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
                Product photo, service promo image, local service visual, listing
                image.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTab("video")}
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
                Product commercial, cinematic promo, animated service ad, short
                listing trailer.
              </div>
            </button>
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
            placeholder="Example: Create a premium promotional image for a website design service for small businesses, black and gold style, realistic workspace, clean and trustworthy look."
            className="min-h-[190px] w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
          />

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <GhostButton onClick={() => setPrompt(PRODUCT_TEMPLATE)}>
              Product prompt
            </GhostButton>
            <GhostButton onClick={() => setPrompt(SERVICE_TEMPLATE)}>
              Service prompt
            </GhostButton>
            <GhostButton onClick={() => setPrompt(LOCAL_TEMPLATE)}>
              Local service prompt
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
                Upload your face, product, logo, brand image, or another visual
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
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/30">
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
                ) : (
                  "Reference images help AI make more accurate and personalized visuals."
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
                  Optional source video
                </div>
                <div className="mt-1 text-[11px] text-white/55">
                  Upload an existing video only if your AI service supports remix or
                  edit flow.
                </div>
              </div>
              <Pill>
                <span className="h-2 w-2 rounded-full bg-white/60" />
                Optional
              </Pill>
            </div>

            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => setVideo(e.target.files?.[0] || null)}
            />

            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                {sourceVideoPreview ? (
                  <video
                    src={sourceVideoPreview}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  <span className="px-3 text-center text-[10px] text-white/45">
                    No video
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs text-white/60">
                  {sourceVideo ? (
                    <span className="block truncate font-semibold text-white/80">
                      {sourceVideo.name}
                    </span>
                  ) : (
                    "Leave empty for prompt-only or prompt + reference image video generation."
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-extrabold transition hover:bg-white/10"
                  >
                    Upload video
                  </button>

                  {sourceVideo ? (
                    <button
                      type="button"
                      onClick={() => setVideo(null)}
                      className="rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-extrabold text-white/70 transition hover:bg-white/[0.06]"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
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
                Choose the shape and quality of your output.
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
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
              >
                <option value="1:1">1:1</option>
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="4:5">4:5</option>
              </select>
            </div>

            <div>
              <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-white/45">
                Image size
              </div>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
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
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-white/45">
                Video duration
              </div>
              <select
                value={durationSec}
                onChange={(e) => setDurationSec(Number(e.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
              >
                <option value={4}>4 sec</option>
                <option value={8}>8 sec</option>
                <option value={12}>12 sec</option>
              </select>
            </div>

            <div className="md:col-span-2 xl:col-span-4">
              <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-white/45">
                Video model
              </div>
              <select
                value={videoModel}
                onChange={(e) => setVideoModel(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
              >
                <option value="sora-2">sora-2</option>
                <option value="sora-2-pro">sora-2-pro</option>
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <div className="space-y-3">
            <GhostButton
              disabled={!canGenerate || tab !== "image"}
              onClick={generateImage}
            >
              {state === "uploading" && tab === "image"
                ? "Generating image…"
                : "Generate image"}
            </GhostButton>

            <GoldButton
              disabled={!canGenerate || tab !== "video"}
              onClick={generateVideo}
            >
              {state === "uploading" && tab === "video"
                ? "Submitting video job…"
                : state === "processing" && tab === "video"
                ? "Video is rendering…"
                : "Generate video"}
            </GoldButton>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <div className="mt-4 text-[11px] leading-relaxed text-white/55">
            Use clear prompts. Mention what product or service you sell, who it is for,
            the style, the background, and the mood. For local services, include city and country.
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
                Simple guide for people who are new to AI generation.
              </div>
            </div>
            <Pill>
              <span className="h-2 w-2 rounded-full bg-[#d4af37]" />
              Tutorial
            </Pill>
          </div>

          <div className="space-y-4 text-sm leading-relaxed text-white/70">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="font-extrabold text-white">
                If you want to sell a product
              </div>
              <div className="mt-2 text-[13px] text-white/65">
                Write what the product is, what material or style it has, and how you
                want it presented. Example: premium, realistic, clean background,
                luxury commercial look.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="font-extrabold text-white">
                If you want to sell a service
              </div>
              <div className="mt-2 text-[13px] text-white/65">
                Write what service you provide, who needs it, and what visual scene
                represents it best. Example: website design, coaching, training,
                travel planning, consultation, repair service.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="font-extrabold text-white">
                If it is a local offline service
              </div>
              <div className="mt-2 text-[13px] text-white/65">
                Always include the city and country. Example: personal trainer in
                Kyiv, Ukraine, or city tour guide in Sofia, Bulgaria.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="font-extrabold text-white">
                You can upload your own image
              </div>
              <div className="mt-2 text-[13px] text-white/65">
                Upload your face photo, product image, logo, or another reference to
                help AI create more accurate results.
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
            <div className="relative aspect-[16/10]">
              {mainResult?.resultUrl ? (
                <NftMedia
                  src={mainResult.resultUrl}
                  kind={mainResult.type === "video" ? "video" : "image"}
                  alt="AI result preview"
                  poster={mainResult.type === "video" ? mainResult.posterUrl || null : null}
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
                <div className="flex h-full w-full items-center justify-center text-xs text-white/45">
                  Your generated result will appear here
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.55),transparent_60%)]" />

              <div className="absolute bottom-3 left-3 right-3">
                <div className="truncate text-sm font-black text-white">
                  {mainResult
                    ? mainResult.type === "video"
                      ? "AI Video"
                      : "AI Image"
                    : "AI Studio"}
                </div>
                <div className="mt-1 line-clamp-2 text-[11px] text-white/70">
                  {mainResult?.prompt || prompt || "Write a prompt to generate your result."}
                </div>
              </div>
            </div>
          </div>
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
                  </div>

                  <div className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-white/65">
                    {item.prompt}
                  </div>

                  {item.resultUrl ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                      <div className="relative aspect-[16/10]">
                        <NftMedia
                          src={item.resultUrl}
                          kind={item.type === "video" ? "video" : "image"}
                          alt="AI result"
                          poster={item.type === "video" ? item.posterUrl || null : null}
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
