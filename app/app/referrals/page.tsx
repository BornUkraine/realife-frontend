"use client";

import React, { useEffect, useMemo, useState } from "react";
import Reveal from "@/components/Reveal";

type RefMe = {
  ok: boolean;
  points: number;
  referralCode: string | null;
  referredByCode: string | null;
  invitedCount: number;
  inviteLink: string | null;
  pendingRef?: string | null;
};

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function GoldEdgeWrap({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-[34px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.35),rgba(212,175,55,0.16),rgba(184,135,10,0.10))]",
        "shadow-[0_34px_130px_rgba(0,0,0,0.60)]",
        className
      )}
    >
      <div
        className={cx(
          "relative overflow-hidden rounded-[34px]",
          "border border-white/10 bg-[#0b0a09]/25 backdrop-blur-2xl",
          "ring-1 ring-black/10",
          "before:pointer-events-none before:absolute before:inset-0",
          "before:bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.12),transparent_45%)]",
          "after:pointer-events-none after:absolute after:inset-0",
          "after:bg-[radial-gradient(circle_at_85%_115%,rgba(255,255,255,0.06),transparent_55%)]"
        )}
      >
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-7 md:p-9">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm md:text-base font-extrabold">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-white/60">{subtitle}</div> : null}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={cx(
        "w-full h-11 rounded-2xl px-4",
        "border border-white/10 bg-white/[0.06] backdrop-blur-2xl",
        "text-sm font-extrabold text-white placeholder:text-white/35",
        "outline-none focus:ring-2 focus:ring-amber-400/20",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    />
  );
}

function Btn({
  variant = "gold",
  className = "",
  disabled,
  children,
  onClick,
  type = "button",
}: {
  variant?: "gold" | "ghost";
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-extrabold transition disabled:opacity-60 disabled:cursor-not-allowed";
  const gold =
    "h-11 px-6 rounded-2xl text-black bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] shadow-[0_22px_70px_rgba(212,175,55,0.18)] ring-1 ring-black/15 hover:brightness-110 hover:-translate-y-px active:translate-y-0";
  const ghost =
    "h-11 px-6 rounded-2xl text-white border border-white/15 bg-white/[0.06] backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)] hover:bg-white/10 hover:-translate-y-px active:translate-y-0";

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cx(base, variant === "gold" ? gold : ghost, className)}
    >
      {children}
    </button>
  );
}

function Pill({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "ok" | "gold" | "warn" }) {
  const cls =
    tone === "ok"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
      : tone === "gold"
      ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
      : tone === "warn"
      ? "border-rose-500/25 bg-rose-500/10 text-rose-200"
      : "border-white/10 bg-white/[0.06] text-white/70";
  return <div className={cx("text-[11px] font-semibold px-3 py-1.5 rounded-full border", cls)}>{children}</div>;
}

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

function isValidCode(raw: string) {
  return /^[A-Z0-9_]{3,16}$/.test(raw);
}

export default function ReferralsPage() {
  const [me, setMe] = useState<RefMe | null>(null);
  const [loading, setLoading] = useState(true);

  // create code
  const [newCode, setNewCode] = useState("");
  const [saving, setSaving] = useState(false);

  // apply code
  const [applyCode, setApplyCode] = useState("");
  const [applying, setApplying] = useState(false);

  const [notice, setNotice] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);

  const canSetCode = useMemo(() => {
    const c = normalizeCode(newCode);
    return Boolean(c) && isValidCode(c);
  }, [newCode]);

  const canApply = useMemo(() => {
    const c = normalizeCode(applyCode);
    return Boolean(c) && isValidCode(c);
  }, [applyCode]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice({ tone: "ok", text: "Copied." });
      window.setTimeout(() => setNotice(null), 1200);
    } catch {
      setNotice({ tone: "warn", text: "Copy failed." });
      window.setTimeout(() => setNotice(null), 1400);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/referral/me", { cache: "no-store" });
      const j = (await r.json()) as RefMe;
      if (j?.ok) {
        setMe(j);
        if (j.pendingRef) {
          setApplyCode(j.pendingRef);
        }
      } else {
        setMe(null);
      }
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // capture ?ref=CODE for UX
    const url = new URL(window.location.href);
    const ref = (url.searchParams.get("ref") || "").trim();
    if (ref) {
      try {
        localStorage.setItem("rl_ref_pending", ref);
      } catch {}
    }
    void load();
  }, []);

  async function onSaveCode() {
    if (!canSetCode) return;
    setSaving(true);
    setNotice(null);
    try {
      const code = normalizeCode(newCode);
      const r = await fetch("/api/referral/set-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j?.ok) {
        setNotice({ tone: "ok", text: `Code saved: ${code}` });
        setNewCode("");
        await load();
      } else {
        setNotice({ tone: "warn", text: j?.message || "Failed to save code." });
      }
    } catch {
      setNotice({ tone: "warn", text: "Network error." });
    } finally {
      setSaving(false);
      window.setTimeout(() => setNotice(null), 1800);
    }
  }

  async function onApply() {
    if (!canApply) return;
    setApplying(true);
    setNotice(null);
    try {
      const code = normalizeCode(applyCode);
      const r = await fetch("/api/referral/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j?.ok) {
        setNotice({ tone: "ok", text: `Applied. +${j.joinerAdd ?? 50} points` });
        try {
          localStorage.removeItem("rl_ref_pending");
        } catch {}
        await load();
      } else {
        setNotice({ tone: "warn", text: j?.message || "Failed to apply code." });
      }
    } catch {
      setNotice({ tone: "warn", text: "Network error." });
    } finally {
      setApplying(false);
      window.setTimeout(() => setNotice(null), 2000);
    }
  }

  const inviteLink = me?.inviteLink ?? null;

  return (
    <div className="space-y-6">
      <Reveal>
        <GoldEdgeWrap className="rounded-[44px]">
          <div className="p-7 md:p-10">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="min-w-0">
                <Pill tone="gold">Referrals • Earn points</Pill>
                <h1 className="mt-5 text-4xl md:text-5xl font-black leading-[1.05] tracking-[-0.02em]">
                  Invite friends —{" "}
                  <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]">
                    get +50 points
                  </span>
                </h1>
                <p className="mt-3 text-sm md:text-base text-white/70 max-w-2xl leading-relaxed">
                  Create your referral code, share your invite link, and enter a friend&apos;s code once to get +50 too.
                  Anti-abuse: 1 code set per user, 1 apply per user.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Pill tone="ok">Your points: {me?.points ?? 0}</Pill>
                  <Pill tone="gold">Invited: {me?.invitedCount ?? 0}</Pill>
                  {me?.referredByCode ? <Pill tone="ok">Used code: {me.referredByCode}</Pill> : <Pill>Code not used</Pill>}
                </div>

                {notice ? (
                  <div
                    className={cx(
                      "mt-6 rounded-[22px] border px-4 py-3 backdrop-blur-md",
                      notice.tone === "ok" ? "border-emerald-500/25 bg-emerald-500/10" : "border-rose-500/25 bg-rose-500/10"
                    )}
                  >
                    <div className={cx("text-sm font-extrabold", notice.tone === "ok" ? "text-emerald-50" : "text-rose-50")}>
                      {notice.tone === "ok" ? "Success" : "Notice"}
                    </div>
                    <div className={cx("mt-1 text-sm", notice.tone === "ok" ? "text-emerald-100/90" : "text-rose-100/90")}>
                      {notice.text}
                    </div>
                  </div>
                ) : null}

                {loading ? (
                  <div className="mt-6 text-sm text-white/60">Loading…</div>
                ) : null}
              </div>
            </div>
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* A) Set code */}
        <Reveal delayMs={80}>
          <GoldEdgeWrap>
            <Card
              title="Create your code"
              subtitle="3–16 chars. A–Z / 0–9 / _ . No spaces. One-time setup."
            >
              {me?.referralCode ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Your code</div>
                    <div className="mt-1 text-2xl font-black tracking-tight text-amber-200">
                      {me.referralCode}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Btn variant="gold" className="flex-1" onClick={() => copy(me.referralCode!)}>
                      Copy code
                    </Btn>
                    {inviteLink ? (
                      <Btn variant="ghost" className="flex-1" onClick={() => copy(inviteLink)}>
                        Copy invite link
                      </Btn>
                    ) : (
                      <Btn variant="ghost" className="flex-1" disabled>
                        Invite link
                      </Btn>
                    )}
                  </div>
                  <div className="text-[11px] text-white/55">
                    Code is locked to prevent abuse.
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Input
                    value={newCode}
                    onChange={(v) => setNewCode(v.toUpperCase())}
                    placeholder="BORN"
                    disabled={saving}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <Pill tone={canSetCode ? "ok" : "muted"}>
                      {canSetCode ? "Valid code" : "Invalid code"}
                    </Pill>
                    <Btn variant="gold" disabled={!canSetCode || saving} onClick={onSaveCode}>
                      {saving ? "Saving…" : "Save code"}
                    </Btn>
                  </div>
                  <div className="text-[11px] text-white/55">
                    Tip: use a brand-style word. Example: <span className="text-amber-200">BORN</span>
                  </div>
                </div>
              )}
            </Card>
          </GoldEdgeWrap>
        </Reveal>

        {/* B) Apply code */}
        <Reveal delayMs={120}>
          <GoldEdgeWrap>
            <Card
              title="Enter friend’s code"
              subtitle="You get +50, and the inviter gets +50. One-time only."
            >
              <div className="space-y-4">
                <Input
                  value={applyCode}
                  onChange={(v) => setApplyCode(v.toUpperCase())}
                  placeholder="SOMEONE"
                  disabled={applying || Boolean(me?.referredByCode)}
                />

                <div className="flex items-center justify-between gap-3">
                  {me?.referredByCode ? (
                    <Pill tone="ok">Already applied</Pill>
                  ) : (
                    <Pill tone={canApply ? "gold" : "muted"}>{canApply ? "Ready" : "Enter valid code"}</Pill>
                  )}

                  <Btn
                    variant="gold"
                    disabled={!canApply || applying || Boolean(me?.referredByCode)}
                    onClick={onApply}
                  >
                    {me?.referredByCode ? "Applied" : applying ? "Applying…" : "Apply"}
                  </Btn>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-[12px] text-white/65">
                  <div className="font-extrabold text-white/85">Reward</div>
                  <div className="mt-1">
                    You: <span className="text-amber-200 font-extrabold">+50</span> points • Inviter:{" "}
                    <span className="text-amber-200 font-extrabold">+50</span> points
                  </div>
                </div>
              </div>
            </Card>
          </GoldEdgeWrap>
        </Reveal>

        {/* C) Invite link */}
        <Reveal delayMs={160}>
          <GoldEdgeWrap>
            <Card
              title="Invite link"
              subtitle="Share it anywhere. We’ll track invites safely."
            >
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Invited</div>
                  <div className="mt-1 text-2xl font-black tracking-tight text-white/90">
                    {me?.invitedCount ?? 0}
                  </div>
                  <div className="mt-2 text-[11px] text-white/55">Total invites that earned you rewards.</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">Link</div>
                  <div className="mt-2 text-[12px] font-mono text-white/75 break-all">
                    {inviteLink ?? "Create your code to generate a link."}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Btn
                    variant="gold"
                    className="flex-1"
                    disabled={!inviteLink}
                    onClick={() => inviteLink && copy(inviteLink)}
                  >
                    Copy link
                  </Btn>
                  <Btn variant="ghost" className="flex-1" onClick={load}>
                    Refresh
                  </Btn>
                </div>

                <div className="text-[11px] text-white/55">
                  Tip: You can also send <span className="font-mono text-white/70">/app/referrals?ref=CODE</span>
                </div>
              </div>
            </Card>
          </GoldEdgeWrap>
        </Reveal>
      </div>

      <Reveal delayMs={220}>
        <div className="text-[11px] text-white/45 text-center">
          Referrals are idempotent and anti-abuse protected (ledger events).
        </div>
      </Reveal>
    </div>
  );
}