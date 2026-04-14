"use client";

import { useState, type FormEvent } from "react";

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
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
    throw new Error(j?.error || "request_failed");
  }
  return j as T;
}

export default function AdminEscrowGateClient() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await fetchJSON("/api/admin/escrow-auth", {
        method: "POST",
        body: JSON.stringify({
          login: login.trim(),
          password,
        }),
      });

      window.location.reload();
    } catch (e: any) {
      const msg = String(e?.message || "unlock_failed");
      if (msg === "INVALID_ADMIN_ESCROW_CREDENTIALS") {
        setError("Wrong login or password.");
      } else if (msg === "ADMIN_ESCROW_GATE_NOT_CONFIGURED") {
        setError("Admin escrow gate is not configured in Railway variables.");
      } else if (msg === "FORBIDDEN") {
        setError("Your account does not have moderator or admin access.");
      } else if (msg === "UNAUTHORIZED") {
        setError("You must sign in first.");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-[34px] border border-white/10 bg-[#0b0a09]/60 p-6 backdrop-blur-2xl">
      <div className="max-w-xl">
        <div className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
          Escrow gate
        </div>

        <h2 className="mt-4 text-2xl font-semibold text-white">
          Enter second-step admin credentials
        </h2>

        <p className="mt-2 text-sm leading-7 text-white/65">
          This extra login and password are checked on the server against your
          Railway variables. After success, the page will be unlocked with a
          secure httpOnly cookie.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-6 max-w-xl space-y-4">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
            Admin login
          </label>
          <input
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoComplete="username"
            className={cx(
              "w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition",
              "placeholder:text-white/30 focus:border-[#d4af37]/40 focus:bg-white/[0.07]"
            )}
            placeholder="Enter admin escrow login"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
            Admin password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className={cx(
              "w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition",
              "placeholder:text-white/30 focus:border-[#d4af37]/40 focus:bg-white/[0.07]"
            )}
            placeholder="Enter admin escrow password"
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Unlocking..." : "Unlock panel"}
        </button>
      </form>
    </div>
  );
}