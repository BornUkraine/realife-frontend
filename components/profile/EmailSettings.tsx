// components/profile/EmailSettings.tsx
//
// Секция настроек email уведомлений для страницы профиля.
// Самодостаточный компонент — встрой одной строкой в ProfileClient:
//   <EmailSettings />
//
// Сам подгружает данные из /api/me и обновляет через /api/profile/email/*.
//
// Логика отображения:
//   - Если есть googleEmail и нет contactEmail → показываем googleEmail
//     с тогглом on/off (это всё что нужно Google-юзеру).
//   - Если есть contactEmail verified → показываем его с возможностью
//     сменить или удалить.
//   - Если есть contactEmail unverified → показываем поле ввода кода.
//   - Если нет ничего → показываем поле ввода email + Send code.

"use client";

import { useEffect, useState } from "react";

type MeUser = {
  googleEmail?: string | null;
  contactEmail?: string | null;
  contactEmailVerifiedAt?: string | null;
  emailNotificationsEnabled?: boolean;
};

type MeResponse = {
  ok: boolean;
  user?: MeUser | null;
};

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

async function fetchJSON<T = any>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j) {
    const err = (j as any)?.message || (j as any)?.error || "request_failed";
    throw new Error(err);
  }
  return j as T;
}

export default function EmailSettings() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [me, setMe] = useState<MeUser | null>(null);

  const [emailDraft, setEmailDraft] = useState("");
  const [codeDraft, setCodeDraft] = useState("");

  async function loadMe() {
    setLoading(true);
    setErr(null);
    try {
      const j = await fetchJSON<MeResponse>("/api/me");
      setMe(j.user || null);
      if (j.user?.contactEmail && !j.user?.contactEmailVerifiedAt) {
        // Если email сохранён но не verified — оставляем форму ввода кода
        setEmailDraft(j.user.contactEmail);
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMe();
  }, []);

  function clearMessages() {
    setErr(null);
    setInfo(null);
  }

  async function requestCode() {
    clearMessages();
    if (!emailDraft.trim()) {
      setErr("Please enter an email address");
      return;
    }
    setBusy(true);
    try {
      await fetchJSON("/api/profile/email/request-code", {
        method: "POST",
        body: JSON.stringify({ email: emailDraft.trim() }),
      });
      setInfo("Verification code sent. Check your inbox.");
      await loadMe();
    } catch (e: any) {
      setErr(e?.message || "Failed to send code");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    clearMessages();
    if (!/^\d{6}$/.test(codeDraft.trim())) {
      setErr("Code must be 6 digits");
      return;
    }
    setBusy(true);
    try {
      await fetchJSON("/api/profile/email/verify-code", {
        method: "POST",
        body: JSON.stringify({ code: codeDraft.trim() }),
      });
      setInfo("Email verified! You'll receive notifications about your orders.");
      setCodeDraft("");
      await loadMe();
    } catch (e: any) {
      setErr(e?.message || "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    clearMessages();
    if (
      !window.confirm(
        "Remove your contact email? You will stop receiving email notifications."
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await fetchJSON("/api/profile/email/disconnect", { method: "POST" });
      setInfo("Email disconnected.");
      setEmailDraft("");
      setCodeDraft("");
      await loadMe();
    } catch (e: any) {
      setErr(e?.message || "Failed to disconnect");
    } finally {
      setBusy(false);
    }
  }

  async function toggleNotifications(next: boolean) {
    clearMessages();
    setBusy(true);
    try {
      await fetchJSON("/api/profile/email/toggle", {
        method: "POST",
        body: JSON.stringify({ enabled: next }),
      });
      await loadMe();
    } catch (e: any) {
      setErr(e?.message || "Failed to update");
    } finally {
      setBusy(false);
    }
  }

  const googleEmail = me?.googleEmail || null;
  const contactEmail = me?.contactEmail || null;
  const verifiedAt = me?.contactEmailVerifiedAt || null;
  const isVerified = Boolean(contactEmail && verifiedAt);
  const isPendingVerification = Boolean(contactEmail && !verifiedAt);
  const notifEnabled = me?.emailNotificationsEnabled !== false;

  // Активный email для уведомлений (что будет показывать "active")
  const activeEmail = isVerified ? contactEmail : googleEmail;

  if (loading) {
    return (
      <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 text-[12px] text-white/50">
        Loading email settings...
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
      <div className="p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/45">
              Email Notifications
            </div>
            <div className="mt-1 text-[16px] font-black text-white/90">
              Get email when buyers / sellers write you
            </div>
          </div>

          {activeEmail ? (
            <button
              onClick={() => toggleNotifications(!notifEnabled)}
              disabled={busy}
              className={cx(
                "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-[11px] font-black transition",
                notifEnabled
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
                  : "border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/[0.08]",
                busy ? "cursor-not-allowed opacity-60" : ""
              )}
            >
              <span
                className={cx(
                  "inline-block h-2 w-2 rounded-full",
                  notifEnabled ? "bg-emerald-300" : "bg-white/30"
                )}
              />
              {notifEnabled ? "Enabled" : "Disabled"}
            </button>
          ) : null}
        </div>

        {err ? (
          <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-[12px] text-rose-100">
            {err}
          </div>
        ) : null}

        {info ? (
          <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-[12px] text-emerald-100">
            {info}
          </div>
        ) : null}

        {/* Случай 1: есть verified contact email — показываем + опции */}
        {isVerified ? (
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-100/65">
                  Your contact email (verified)
                </div>
                <div className="mt-1 text-[14px] font-black text-emerald-50">
                  {contactEmail}
                </div>
              </div>
              <button
                onClick={disconnect}
                disabled={busy}
                className={cx(
                  "rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] font-black text-rose-100 transition hover:bg-rose-500/15",
                  busy ? "cursor-not-allowed opacity-60" : ""
                )}
              >
                Remove
              </button>
            </div>
            <div className="mt-3 text-[11px] text-white/55">
              We send notifications about new messages and status changes for
              your orders to this email.
            </div>
          </div>
        ) : null}

        {/* Случай 2: contact email сохранён но не verified — поле ввода кода */}
        {isPendingVerification ? (
          <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-100/75">
              Verify your email
            </div>
            <div className="mt-1 text-[14px] font-black text-amber-50">
              {contactEmail}
            </div>
            <div className="mt-2 text-[12px] leading-relaxed text-amber-50/85">
              We sent a 6-digit code to this email. Enter it below to confirm
              ownership. Code expires in 10 minutes.
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <input
                value={codeDraft}
                onChange={(e) =>
                  setCodeDraft(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                className="h-11 w-32 rounded-2xl border border-white/15 bg-black/30 px-4 text-center text-lg font-black tracking-[8px] text-white outline-none focus:border-white/30"
              />
              <button
                onClick={verifyCode}
                disabled={busy || codeDraft.length !== 6}
                className={cx(
                  "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-[12px] font-extrabold text-black transition",
                  "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.20)]",
                  busy || codeDraft.length !== 6
                    ? "cursor-not-allowed opacity-60"
                    : "hover:brightness-110"
                )}
              >
                {busy ? "Verifying..." : "Verify code"}
              </button>
              <button
                onClick={requestCode}
                disabled={busy}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] font-black text-white/70 transition hover:bg-white/[0.10]"
              >
                Resend code
              </button>
              <button
                onClick={disconnect}
                disabled={busy}
                className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[11px] font-black text-rose-100 transition hover:bg-rose-500/15"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {/* Случай 3: нет contact email — показываем что есть (google или ничего) и форму ввода */}
        {!contactEmail ? (
          <>
            {googleEmail ? (
              <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-100/65">
                      Your Google email (active)
                    </div>
                    <div className="mt-1 text-[14px] font-black text-emerald-50">
                      {googleEmail}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-white/55">
                  Notifications about your orders are sent here. You can add a
                  different email below if you prefer.
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4 text-[12px] leading-relaxed text-white/60">
                You are signed in with a Web3 wallet. To get email
                notifications about new messages and order updates, add and
                verify an email below.
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="text-[12px] font-black text-white/85">
                {googleEmail
                  ? "Use a different email"
                  : "Add your email (optional)"}
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                <input
                  type="email"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11 flex-1 min-w-[240px] rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-semibold text-white outline-none focus:border-white/20"
                />
                <button
                  onClick={requestCode}
                  disabled={busy || !emailDraft.trim()}
                  className={cx(
                    "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-[12px] font-extrabold text-black transition",
                    "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] ring-1 ring-black/15 shadow-[0_18px_60px_rgba(212,175,55,0.20)]",
                    busy || !emailDraft.trim()
                      ? "cursor-not-allowed opacity-60"
                      : "hover:brightness-110"
                  )}
                >
                  {busy ? "Sending..." : "Send code"}
                </button>
              </div>
              <div className="mt-3 text-[11px] text-white/45">
                We'll send a 6-digit code to confirm this email. You can remove
                it any time.
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
