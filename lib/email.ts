// lib/email.ts
//
// Простая обёртка над Resend для отправки уведомлений.
// Установить пакет: npm install resend
//
// Env переменные:
//   RESEND_API_KEY=re_xxx
//   EMAIL_FROM="Realife <orders@your-domain.com>"   (домен должен быть верифицирован в Resend)
//   NEXT_PUBLIC_APP_URL=https://your-app.com         (для ссылок в письмах)

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "Realife <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://realife.app";

let _client: Resend | null = null;

function getClient(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!_client) _client = new Resend(RESEND_API_KEY);
  return _client;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const client = getClient();

    // Если ключ не настроен — тихо логируем и не валим запрос.
    if (!client) {
      console.warn("[email] RESEND_API_KEY is not set, skipping email to", input.to);
      return { ok: false, error: "RESEND_NOT_CONFIGURED" };
    }

    if (!input.to || !input.to.includes("@")) {
      return { ok: false, error: "INVALID_RECIPIENT" };
    }

    const res = await client.emails.send({
      from: EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if ((res as any)?.error) {
      console.error("[email] Resend error:", (res as any).error);
      return { ok: false, error: String((res as any).error?.message || "RESEND_ERROR") };
    }

    return { ok: true };
  } catch (e: any) {
    console.error("[email] sendEmail failed:", e);
    return { ok: false, error: e?.message || "EMAIL_SEND_FAILED" };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Шаблон письма "у вас новое сообщение по заказу"
// ──────────────────────────────────────────────────────────────────────────

export type NotifyNewMessageInput = {
  recipientEmail: string;
  recipientRole: "buyer" | "seller";
  senderRole: "BUYER" | "SELLER" | "SUPPORT" | "SYSTEM";
  orderId: string;
  productName: string | null;
  messageBody: string;
};

export function buildOrderRoomUrl(orderId: string) {
  return `${APP_URL.replace(/\/$/, "")}/app/orders/${orderId}`;
}

function senderHuman(role: NotifyNewMessageInput["senderRole"]) {
  if (role === "BUYER") return "Buyer";
  if (role === "SELLER") return "Seller";
  if (role === "SUPPORT") return "Realife Support";
  return "System";
}

export async function notifyNewMessage(input: NotifyNewMessageInput) {
  if (!input.recipientEmail) return { ok: false, error: "NO_RECIPIENT_EMAIL" };

  const url = buildOrderRoomUrl(input.orderId);
  const product = input.productName || `Order ${input.orderId.slice(0, 8)}`;
  const sender = senderHuman(input.senderRole);
  const preview =
    input.messageBody.length > 280
      ? `${input.messageBody.slice(0, 280)}…`
      : input.messageBody;

  const subject = `New message from ${sender} — ${product}`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#0b0a09;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e5e5;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="font-size:11px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#9aa0a6;">Realife Order Room</div>
    <h1 style="margin:8px 0 4px;font-size:22px;font-weight:900;color:#fff;">New message from ${sender}</h1>
    <div style="margin:0 0 24px;font-size:14px;color:#9aa0a6;">${escapeHtml(product)}</div>

    <div style="border:1px solid rgba(212,175,55,.25);background:rgba(212,175,55,.06);border-radius:14px;padding:16px 18px;margin:0 0 24px;white-space:pre-wrap;font-size:14px;line-height:1.6;color:#f5e7b8;">${escapeHtml(preview)}</div>

    <a href="${url}" style="display:inline-block;padding:12px 22px;background:linear-gradient(135deg,#f7e7a7,#d4af37 45%,#b8870a);color:#000;text-decoration:none;font-weight:800;border-radius:14px;">Open order room</a>

    <div style="margin-top:32px;font-size:11px;color:#6b7280;">You are receiving this email because you are a participant in this Realife order. To stop receiving these notifications, disable them in your account settings.</div>
  </div>
</body></html>`;

  const text = `${sender} wrote about ${product}:

${preview}

Open the order: ${url}`;

  return sendEmail({
    to: input.recipientEmail,
    subject,
    html,
    text,
  });
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
