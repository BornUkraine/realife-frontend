"use client";

import { useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";

const STORAGE_KEY = "rl_ref_pending";
const COOKIE_KEY = "rl_ref_pending";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days

function normalizeCode(raw: string) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}

function isValidCode(code: string) {
  return /^[A-Z0-9_]{3,16}$/.test(code);
}

function readStoredCode() {
  if (typeof window === "undefined") return "";

  try {
    const local = normalizeCode(window.localStorage.getItem(STORAGE_KEY) || "");
    if (isValidCode(local)) return local;
  } catch {}

  try {
    const cookie = document.cookie
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith(`${COOKIE_KEY}=`))
      ?.slice(COOKIE_KEY.length + 1);
    const decoded = normalizeCode(decodeURIComponent(cookie || ""));
    if (isValidCode(decoded)) return decoded;
  } catch {}

  return "";
}

function storeCode(code: string) {
  if (typeof window === "undefined" || !isValidCode(code)) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {}

  try {
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(code)}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax`;
  } catch {}
}

function clearCode() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}

  try {
    document.cookie = `${COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
  } catch {}
}

function captureFromUrl() {
  if (typeof window === "undefined") return "";

  const url = new URL(window.location.href);
  const raw =
    url.searchParams.get("ref") ||
    url.searchParams.get("referral") ||
    url.searchParams.get("invite") ||
    "";

  const code = normalizeCode(raw);
  if (!isValidCode(code)) return readStoredCode();

  storeCode(code);

  // Remove referral params from the visible URL after capture.
  ["ref", "referral", "invite"].forEach((key) => url.searchParams.delete(key));
  const clean = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : "") + url.hash;
  window.history.replaceState({}, "", clean);

  return code;
}

async function claimReferral(code: string) {
  if (!isValidCode(code)) return;

  const res = await fetch("/api/referral/claim", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
    cache: "no-store",
  }).catch(() => null);

  if (!res) return;
  if (res.status === 401) return; // user not signed in yet

  const json = await res.json().catch(() => null);

  if (res.ok && json?.ok) {
    clearCode();
    window.dispatchEvent(new CustomEvent("realife:referral-claimed", { detail: json }));
    return;
  }

  // Invalid/self code should not keep poisoning future sessions.
  if (json?.error === "INVALID_CODE" || json?.error === "SELF_REFERRAL") {
    clearCode();
  }
}

export default function ReferralCapture() {
  const { status } = useSession();
  const claimedRef = useRef<string>("");

  const initialCode = useMemo(() => {
    if (typeof window === "undefined") return "";
    return captureFromUrl();
  }, []);

  useEffect(() => {
    captureFromUrl();
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;

    const code = readStoredCode() || initialCode;
    if (!isValidCode(code)) return;
    if (claimedRef.current === code) return;

    claimedRef.current = code;
    void claimReferral(code);
  }, [initialCode, status]);

  return null;
}
