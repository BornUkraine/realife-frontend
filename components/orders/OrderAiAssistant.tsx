"use client";

import { useMemo, useState } from "react";

type AssistantMode = "seller" | "buyer" | "admin_review" | "general";

type DeliveryGuide = {
  country: string;
  label: string;
  carriers: string[];
  sellerChecklist: string[];
  buyerNotes: string[];
  trackingHint: string;
  disclaimer: string;
};

type AssistResponse = {
  ok: boolean;
  mode: AssistantMode;
  source: "ai" | "rules";
  summary: string;
  nextSteps: string[];
  checklist: string[];
  riskFlags: string[];
  suggestedMessage: string;
  deliveryGuide?: DeliveryGuide | null;
  aiError?: string | null;
};

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function titleCase(v?: string | null) {
  const s = String(v || "").trim();
  if (!s) return "—";
  return s
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

function modeLabel(mode: AssistantMode) {
  if (mode === "seller") return "Seller guide";
  if (mode === "buyer") return "Buyer guide";
  if (mode === "admin_review") return "Admin review";
  return "General";
}

function modeDescription(mode: AssistantMode) {
  if (mode === "seller") {
    return "Next steps, proof/submission checklist and buyer-friendly update.";
  }
  if (mode === "buyer") {
    return "Status explanation, confirm/revision/refund guidance and risk notes.";
  }
  if (mode === "admin_review") {
    return "Short order summary, missing proof, dispute risks and support next action.";
  }
  return "General fulfillment explanation for this order.";
}

function BulletList({ items }: { items: string[] }) {
  const clean = items.map((x) => String(x || "").trim()).filter(Boolean);
  if (clean.length === 0) {
    return <div className="text-[12px] text-white/45">No items.</div>;
  }

  return (
    <div className="space-y-2">
      {clean.map((item, i) => (
        <div key={`${item}-${i}`} className="flex gap-2 text-[12px] leading-relaxed text-white/68">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#d4af37] shadow-[0_0_16px_rgba(212,175,55,0.35)]" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

export default function OrderAiAssistant({
  orderId,
  viewerRole,
  order,
  onUseSuggestedMessage,
}: {
  orderId: string;
  viewerRole: string;
  order: any;
  onUseSuggestedMessage?: (message: string) => void;
}) {
  const defaultMode = useMemo<AssistantMode>(() => {
    if (viewerRole === "seller") return "seller";
    if (viewerRole === "buyer") return "buyer";
    return "general";
  }, [viewerRole]);

  const [mode, setMode] = useState<AssistantMode>(defaultMode);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<AssistResponse | null>(null);

  async function generate(nextMode: AssistantMode = mode) {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/ai/order-assist", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId, mode: nextMode }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || json?.message || "AI order assistant failed");
      }

      setData(json as AssistResponse);
    } catch (e: any) {
      setErr(e?.message || "AI order assistant failed");
    } finally {
      setLoading(false);
    }
  }

  function chooseMode(nextMode: AssistantMode) {
    setMode(nextMode);
    void generate(nextMode);
  }

  const isPhysical = Boolean(order?.deliveryRequired || order?.fulfillmentType === "PHYSICAL_GOOD");
  const isService = ["DIGITAL_SERVICE", "ONLINE_SESSION", "LOCAL_SERVICE"].includes(
    String(order?.fulfillmentType || "")
  );

  const modes = useMemo<AssistantMode[]>(() => {
    const out: AssistantMode[] = [];
    if (viewerRole === "seller") out.push("seller");
    if (viewerRole === "buyer") out.push("buyer");
    out.push("general");
    out.push("admin_review");
    return Array.from(new Set(out));
  }, [viewerRole]);

  return (
    <div className="overflow-hidden rounded-[30px] border border-[#d4af37]/18 bg-[linear-gradient(180deg,rgba(212,175,55,0.08),rgba(255,255,255,0.035))] backdrop-blur-xl shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
      <div className="p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#f7e7a7]">
              <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_0_6px_rgba(212,175,55,0.12)]" />
              AI Fulfillment Assistant
            </div>
            <div className="mt-3 text-[18px] font-black text-white/92">
              Order guidance for {isPhysical ? "delivery" : isService ? "service fulfillment" : "fulfillment"}
            </div>
            <div className="mt-2 max-w-3xl text-[12px] leading-relaxed text-white/58">
              AI explains the current order state, suggests the next human step, creates a buyer-friendly update, and highlights missing proof or dispute risk. It never releases escrow or changes the order by itself.
            </div>
          </div>

          <button
            onClick={() => generate(mode)}
            disabled={loading}
            className={cx(
              "inline-flex shrink-0 items-center justify-center rounded-2xl px-5 py-3 text-[12px] font-extrabold text-black transition",
              "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.20)]",
              loading ? "cursor-not-allowed opacity-60" : "hover:brightness-110"
            )}
          >
            {loading ? "Thinking..." : data ? "Refresh AI guide" : "Generate AI guide"}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {modes.map((m) => (
            <button
              key={m}
              onClick={() => chooseMode(m)}
              disabled={loading}
              className={cx(
                "rounded-full border px-3 py-2 text-[11px] font-black transition",
                mode === m
                  ? "border-[#d4af37]/30 bg-[#d4af37]/14 text-[#f7e7a7]"
                  : "border-white/10 bg-white/[0.05] text-white/58 hover:bg-white/[0.08] hover:text-white/80",
                loading ? "cursor-not-allowed opacity-60" : ""
              )}
              title={modeDescription(m)}
            >
              {modeLabel(m)}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4">
          <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/52">
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1">
              Escrow {order?.escrowStatus || "—"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1">
              Delivery {order?.deliveryStatus || "—"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1">
              Service {order?.serviceStatus || "—"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1">
              {titleCase(order?.fulfillmentType || "fulfillment")}
            </span>
          </div>
        </div>

        {err ? (
          <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-[12px] text-rose-100">
            {err}
          </div>
        ) : null}

        {data ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/14 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[12px] font-black uppercase tracking-wider text-white/85">
                    Current summary
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/48">
                    {data.source === "ai" ? "AI" : "Rules"}
                  </span>
                </div>
                <div className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-white/72">
                  {data.summary}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/14 p-4">
                <div className="text-[12px] font-black uppercase tracking-wider text-white/85">
                  Next steps
                </div>
                <div className="mt-3">
                  <BulletList items={data.nextSteps} />
                </div>
              </div>

              {data.suggestedMessage ? (
                <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
                  <div className="text-[12px] font-black uppercase tracking-wider text-sky-100">
                    Suggested room message
                  </div>
                  <div className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-sky-50/85">
                    {data.suggestedMessage}
                  </div>
                  {onUseSuggestedMessage ? (
                    <button
                      onClick={() => onUseSuggestedMessage(data.suggestedMessage)}
                      className="mt-3 inline-flex items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-2 text-[12px] font-extrabold text-sky-100 transition hover:bg-sky-500/15"
                    >
                      Put into chat box
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/14 p-4">
                <div className="text-[12px] font-black uppercase tracking-wider text-white/85">
                  Fulfillment checklist
                </div>
                <div className="mt-3">
                  <BulletList items={data.checklist} />
                </div>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="text-[12px] font-black uppercase tracking-wider text-amber-100">
                  Risk flags
                </div>
                <div className="mt-3">
                  <BulletList items={data.riskFlags.length ? data.riskFlags : ["No major risk flags detected from the current order data."]} />
                </div>
              </div>

              {data.deliveryGuide ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <div className="text-[12px] font-black uppercase tracking-wider text-emerald-100">
                    Delivery guide: {data.deliveryGuide.label}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {data.deliveryGuide.carriers.map((carrier) => (
                      <span
                        key={carrier}
                        className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-100"
                      >
                        {carrier}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 text-[12px] leading-relaxed text-emerald-50/82">
                    {data.deliveryGuide.trackingHint}
                  </div>
                  <div className="mt-3 text-[11px] leading-relaxed text-emerald-50/58">
                    {data.deliveryGuide.disclaimer}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/14 p-4 text-[12px] leading-relaxed text-white/55">
            Generate guidance when the order status changes, before sending proof, before confirming completion, or before opening a refund/revision path.
          </div>
        )}
      </div>
    </div>
  );
}
