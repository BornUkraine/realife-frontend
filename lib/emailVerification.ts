// lib/emailVerification.ts
//
// Хелперы для верификации email через 6-значный код.
// Используется когда юзер заходит через Web3 кошелёк (без Google),
// но хочет получать email уведомления — он сам вводит email в профиле,
// получает код, подтверждает.

import { sendEmail } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://realife.live";

export function generateCode(): string {
  // 6-значный код. crypto.randomInt доступен в Node 14.10+
  const n = Math.floor(100_000 + Math.random() * 900_000);
  return String(n);
}

export function getCodeExpiresAt(): Date {
  // Код жив 10 минут
  return new Date(Date.now() + 10 * 60 * 1000);
}

export function isValidEmail(s: string): boolean {
  if (!s || typeof s !== "string") return false;
  const x = s.trim().toLowerCase();
  if (x.length < 4 || x.length > 320) return false;
  if (!x.includes("@")) return false;
  // Простая проверка: что-то @ что-то . что-то
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
}

export function normalizeEmail(s: string): string {
  return String(s || "").trim().toLowerCase();
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendVerificationCode(input: {
  email: string;
  code: string;
}) {
  const { email, code } = input;
  const escapedCode = escapeHtml(code);

  const subject = `${code} — Your Realife verification code`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#0b0a09;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e5e5;">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
    <div style="font-size:11px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#9aa0a6;">Realife Email Verification</div>

    <h1 style="margin:8px 0 4px;font-size:22px;font-weight:900;color:#fff;">Confirm your email</h1>
    <div style="margin:0 0 24px;font-size:14px;color:#9aa0a6;">Enter this code on the Realife profile page to enable email notifications about your orders.</div>

    <div style="border:1px solid rgba(212,175,55,.35);background:rgba(212,175,55,.10);border-radius:16px;padding:24px;text-align:center;margin:0 0 24px;">
      <div style="font-size:11px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#d4af37;">Your code</div>
      <div style="margin-top:8px;font-size:36px;font-weight:900;letter-spacing:8px;color:#f7e7a7;font-family:'Courier New',monospace;">${escapedCode}</div>
    </div>

    <div style="font-size:12px;line-height:1.6;color:#9aa0a6;">This code expires in <strong style="color:#e5e5e5;">10 minutes</strong>. If you didn't request this, you can safely ignore this email — nobody can use this code without access to your wallet account.</div>

    <div style="margin-top:32px;font-size:11px;color:#6b7280;">Realife — ${APP_URL}</div>
  </div>
</body></html>`;

  const text = `Your Realife verification code: ${code}

Enter this code on the Realife profile page to enable email notifications.
The code expires in 10 minutes.

If you didn't request this, ignore this email.

Realife — ${APP_URL}`;

  return sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}
