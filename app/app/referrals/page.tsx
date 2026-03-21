"use client";

import React, { useEffect, useMemo, useState } from "react";
import Reveal from "@/components/Reveal";
import { useAccount, useSignMessage } from "wagmi";

type RefMe = {
  ok: boolean;
  points: number;
  walletAddress: string | null;
  referralCode: string | null;
  referredByCode: string | null;
  invitedCount: number;
  inviteLink: string | null;
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
          {subtitle ? (
            <div className="mt-1 text-xs text-white/60">{subtitle}</div>
          ) : null}
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
    "min-w-0 inline-flex items-center justify-center gap-2 font-extrabold transition disabled:opacity-60 disabled:cursor-not-allowed";
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

function Pill({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "ok" | "gold" | "warn";
}) {
  const cls =
    tone === "ok"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
      : tone === "gold"
      ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
      : tone === "warn"
      ? "border-rose-500/25 bg-rose-500/10 text-rose-200"
      : "border-white/10 bg-white/[0.06] text-white/70";

  return (
    <div
      className={cx(
        "text-[11px] font-semibold px-3 py-1.5 rounded-full border",
        cls
      )}
    >
      {children}
    </div>
  );
}

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

function isValidCode(raw: string) {
  return /^[A-Z0-9_]{3,16}$/.test(raw);
}

function buildMsg(params: {
  action: "SET_CODE" | "APPLY";
  code: string;
  nonce: string;
  origin: string;
  issuedAt: string;
}) {
  return `Realife Referral Confirmation
Action: ${params.action}
Code: ${params.code}
Nonce: ${params.nonce}
URI: ${params.origin}
Issued At: ${params.issuedAt}`;
}

export default function ReferralsPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [me, setMe] = useState<RefMe | null>(null);
  const [loading, setLoading] = useState(true);

  const [newCode, setNewCode] = useState("");
  const [saving, setSaving] = useState(false);

  const [applyCode, setApplyCode] = useState("");
  const [applying, setApplying] = useState(false);

  const [pendingRef, setPendingRef] = useState<string | null>(null);

  const [notice, setNotice] = useState<{
    tone: "ok" | "warn";
    text: string;
  } | null>(null);

  const canSetCode = useMemo(() => {
    const c = normalizeCode(newCode);
    return Boolean(c) && isValidCode(c);
  }, [newCode]);

  const canApply = useMemo(() => {
    const c = normalizeCode(applyCode);
    return Boolean(c) && isValidCode(c);
  }, [applyCode]);

  const normalizedApply = useMemo(() => normalizeCode(applyCode), [applyCode]);
  const alreadyApplied = Boolean(me?.referredByCode);

  const isSelf = useMemo(() => {
    if (!me?.referralCode) return false;
    return normalizedApply === me.referralCode;
  }, [me?.referralCode, normalizedApply]);

  const serverWalletOk = Boolean(me?.walletAddress);

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
      if (j?.ok) setMe(j);
      else setMe(null);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    const ref = (url.searchParams.get("ref") || "").trim();

    if (ref) {
      const code = normalizeCode(ref);
      try {
        localStorage.setItem("rl_ref_pending", code);
      } catch {}
      setApplyCode(code);
      setPendingRef(code);

      url.searchParams.delete("ref");
      window.history.replaceState(
        {},
        "",
        url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : "")
      );
    } else {
      try {
        const saved = localStorage.getItem("rl_ref_pending") || "";
        if (saved) {
          const code = normalizeCode(saved);
          setApplyCode(code);
          setPendingRef(code);
        }
      } catch {}
    }

    void load();
  }, []);

  async function getNonce(action: "SET_CODE" | "APPLY", code: string) {
    const r = await fetch(
      `/api/referral/nonce?action=${action}&code=${encodeURIComponent(code)}`,
      { cache: "no-store" }
    );
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.nonce) throw new Error(j?.message || "Nonce failed");
    return String(j.nonce);
  }

  async function requireWalletReady() {
    if (!isConnected || !address) throw new Error("Connect wallet first.");
    if (!serverWalletOk) {
      throw new Error("Verify wallet in top bar (signature once) first.");
    }
    if (
      me?.walletAddress &&
      address.toLowerCase() !== me.walletAddress.toLowerCase()
    ) {
      throw new Error("Connected wallet differs from verified wallet.");
    }
  }

  async function onSaveCode() {
    if (!canSetCode) return;

    setSaving(true);
    setNotice(null);

    try {
      await requireWalletReady();

      const code = normalizeCode(newCode);
      const nonce = await getNonce("SET_CODE", code);
      const issuedAt = new Date().toISOString();
      const origin = window.location.origin;

      const message = buildMsg({
        action: "SET_CODE",
        code,
        nonce,
        origin,
        issuedAt,
      });
      const signature = await signMessageAsync({ message });

      const r = await fetch("/api/referral/set-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, nonce, signature, issuedAt, origin }),
      });
      const j = await r.json().catch(() => ({}));

      if (r.ok && j?.ok) {
        setNotice({ tone: "ok", text: `Code saved: ${code}` });
        setNewCode("");
        await load();
      } else {
        setNotice({ tone: "warn", text: j?.message || "Failed to save code." });
      }
    } catch (e: any) {
      setNotice({ tone: "warn", text: e?.message || "Failed." });
    } finally {
      setSaving(false);
      window.setTimeout(() => setNotice(null), 2000);
    }
  }

  async function onApply(codeOverride?: string) {
    const code = normalizeCode(codeOverride ?? applyCode);

    if (!code || !isValidCode(code) || alreadyApplied) return;

    if (me?.referralCode && code === me.referralCode) {
      setNotice({ tone: "warn", text: "You can’t apply your own code." });
      window.setTimeout(() => setNotice(null), 1800);
      return;
    }

    setApplying(true);
    setNotice(null);

    try {
      await requireWalletReady();

      const nonce = await getNonce("APPLY", code);
      const issuedAt = new Date().toISOString();
      const origin = window.location.origin;

      const message = buildMsg({
        action: "APPLY",
        code,
        nonce,
        origin,
        issuedAt,
      });
      const signature = await signMessageAsync({ message });

      const r = await fetch("/api/referral/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, nonce, signature, issuedAt, origin }),
      });
      const j = await r.json().catch(() => ({}));

      if (r.ok && j?.ok) {
        setApplyCode(code);
        setNotice({ tone: "ok", text: `Applied. +${j.joinerAdd ?? 50} points` });
        try {
          localStorage.removeItem("rl_ref_pending");
        } catch {}
        setPendingRef(null);
        await load();
      } else {
        setNotice({ tone: "warn", text: j?.message || "Failed to apply code." });
      }
    } catch (e: any) {
      setNotice({ tone: "warn", text: e?.message || "Failed." });
    } finally {
      setApplying(false);
      window.setTimeout(() => setNotice(null), 2200);
    }
  }

  const inviteLink = me?.inviteLink ?? null;

  return (
    <div className="space-y-6">
      <Reveal>
        <GoldEdgeWrap className="rounded-[44px]">
          <div className="p-7 md:p-10">
            <Pill tone="gold">Referrals • Earn points</Pill>

            <h1 className="mt-5 text-4xl md:text-5xl font-black leading-[1.05] tracking-[-0.02em]">
              Invite friends —{" "}
              <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]">
                get +50 points
              </span>
            </h1>

            <p className="mt-3 text-sm md:text-base text-white/70 max-w-2xl leading-relaxed">
              Creating a code and applying a code requires a wallet{" "}
              <b>signature</b> (no transaction).
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Pill tone="ok">Your points: {me?.points ?? 0}</Pill>
              <Pill tone="gold">Invited: {me?.invitedCount ?? 0}</Pill>
              {alreadyApplied ? (
                <Pill tone="ok">Used code: {me?.referredByCode}</Pill>
              ) : (
                <Pill>Code not used</Pill>
              )}
              <Pill tone={serverWalletOk ? "ok" : "warn"}>
                {serverWalletOk ? "Wallet verified" : "Verify wallet"}
              </Pill>
            </div>

            {pendingRef && !alreadyApplied ? (
              <div className="mt-6 rounded-[22px] border border-amber-500/25 bg-amber-500/10 px-4 py-3 backdrop-blur-md">
                <div className="text-sm font-extrabold text-amber-50">
                  Apply referral code{" "}
                  <span className="text-amber-200">{pendingRef}</span>?
                </div>
                <div className="mt-1 text-xs text-amber-100/80">
                  You get <span className="font-extrabold">+50</span>, and the
                  inviter gets <span className="font-extrabold">+50</span>.
                </div>

                <div className="mt-3 flex flex-wrap gap-3">
                  <Btn
                    variant="gold"
                    disabled={
                      !isValidCode(pendingRef) || applying || alreadyApplied
                    }
                    onClick={() => {
                      void onApply(pendingRef);
                    }}
                  >
                    {applying ? "Applying…" : "Apply +50"}
                  </Btn>

                  <Btn
                    variant="ghost"
                    onClick={() => {
                      setPendingRef(null);
                      try {
                        localStorage.removeItem("rl_ref_pending");
                      } catch {}
                    }}
                  >
                    Dismiss
                  </Btn>
                </div>

                {me?.referralCode && pendingRef === me.referralCode ? (
                  <div className="mt-3 text-[11px] text-rose-100/90">
                    You can’t apply your own code.
                  </div>
                ) : null}
              </div>
            ) : null}

            {notice ? (
              <div
                className={cx(
                  "mt-6 rounded-[22px] border px-4 py-3 backdrop-blur-md",
                  notice.tone === "ok"
                    ? "border-emerald-500/25 bg-emerald-500/10"
                    : "border-rose-500/25 bg-rose-500/10"
                )}
              >
                <div
                  className={cx(
                    "text-sm font-extrabold",
                    notice.tone === "ok" ? "text-emerald-50" : "text-rose-50"
                  )}
                >
                  {notice.tone === "ok" ? "Success" : "Notice"}
                </div>
                <div
                  className={cx(
                    "mt-1 text-sm",
                    notice.tone === "ok"
                      ? "text-emerald-100/90"
                      : "text-rose-100/90"
                  )}
                >
                  {notice.text}
                </div>
              </div>
            ) : null}

            {loading ? (
              <div className="mt-6 text-sm text-white/60">Loading…</div>
            ) : null}
          </div>
        </GoldEdgeWrap>
      </Reveal>

      <div className="grid lg:grid-cols-3 gap-6">
        <Reveal delayMs={80}>
          <GoldEdgeWrap>
            <Card
              title="Create your code"
              subtitle="3–16 chars. A–Z / 0–9 / _ . No spaces. One-time setup."
            >
              {me?.referralCode ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                      Your code
                    </div>
                    <div className="mt-1 text-2xl font-black tracking-tight text-amber-200">
                      {me.referralCode}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Btn
                      variant="gold"
                      className="flex-1 min-w-0"
                      onClick={() => copy(me.referralCode!)}
                    >
                      Copy code
                    </Btn>
                    <Btn
                      variant="ghost"
                      className="flex-1 min-w-0"
                      disabled={!inviteLink}
                      onClick={() => inviteLink && copy(inviteLink)}
                    >
                      Copy link
                    </Btn>
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
                    placeholder="YOUR_CODE"
                    disabled={saving}
                  />

                  <div className="flex items-center justify-between gap-3">
                    <Pill tone={canSetCode ? "ok" : "muted"}>
                      {canSetCode ? "Valid code" : "Invalid code"}
                    </Pill>
                    <Btn
                      variant="gold"
                      disabled={!canSetCode || saving}
                      onClick={onSaveCode}
                    >
                      {saving ? "Signing…" : "Save code"}
                    </Btn>
                  </div>

                  <div className="text-[11px] text-white/55">
                    Requires wallet signature (no transaction).
                  </div>
                </div>
              )}
            </Card>
          </GoldEdgeWrap>
        </Reveal>

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
                  disabled={applying || alreadyApplied}
                />

                <div className="flex items-center justify-between gap-3">
                  {alreadyApplied ? (
                    <Pill tone="ok">Already applied</Pill>
                  ) : isSelf ? (
                    <Pill tone="warn">Can’t use your own code</Pill>
                  ) : (
                    <Pill tone={canApply ? "gold" : "muted"}>
                      {canApply ? "Ready" : "Enter valid code"}
                    </Pill>
                  )}

                  <Btn
                    variant="gold"
                    disabled={!canApply || applying || alreadyApplied || isSelf}
                    onClick={() => void onApply()}
                  >
                    {alreadyApplied ? "Applied" : applying ? "Signing…" : "Apply"}
                  </Btn>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-[12px] text-white/65">
                  <div className="font-extrabold text-white/85">Reward</div>
                  <div className="mt-1">
                    You:{" "}
                    <span className="text-amber-200 font-extrabold">+50</span>{" "}
                    • Inviter:{" "}
                    <span className="text-amber-200 font-extrabold">+50</span>
                  </div>
                  <div className="mt-2 text-[11px] text-white/55">
                    Requires wallet signature (no transaction).
                  </div>
                </div>
              </div>
            </Card>
          </GoldEdgeWrap>
        </Reveal>

        <Reveal delayMs={160}>
          <GoldEdgeWrap>
            <Card
              title="Invite link"
              subtitle="Share it anywhere. We’ll track invites safely."
            >
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                    Invited
                  </div>
                  <div className="mt-1 text-2xl font-black tracking-tight text-white/90">
                    {me?.invitedCount ?? 0}
                  </div>
                  <div className="mt-2 text-[11px] text-white/55">
                    Total invites that earned you rewards.
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] text-white/55 font-semibold uppercase tracking-wider">
                    Link
                  </div>
                  <div className="mt-2 text-[12px] font-mono text-white/75 break-all">
                    {inviteLink ?? "Create your code to generate a link."}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Btn
                    variant="gold"
                    className="flex-1 min-w-0"
                    disabled={!inviteLink}
                    onClick={() => inviteLink && copy(inviteLink)}
                  >
                    Copy link
                  </Btn>
                  <Btn
                    variant="ghost"
                    className="flex-1 min-w-0"
                    onClick={() => void load()}
                  >
                    Refresh
                  </Btn>
                </div>
              </div>
            </Card>
          </GoldEdgeWrap>
        </Reveal>
      </div>

      <Reveal delayMs={220}>
        <div className="text-[11px] text-white/45 text-center">
          Note: you must be wallet-verified (top bar signature once) before
          referral actions.
        </div>
      </Reveal>
    </div>
  );
}