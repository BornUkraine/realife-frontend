import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_ESCROW_COOKIE_NAME = "rl_admin_escrow_gate";

export type AdminEscrowRole = "MODERATOR" | "ADMIN";

export type AdminEscrowTokenPayload = {
  sub: string | null;
  wallet: string | null;
  role: AdminEscrowRole;
  exp: number;
};

function norm(v?: string | null) {
  return String(v || "").trim();
}

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function safeEq(a?: string | null, b?: string | null) {
  const aa = Buffer.from(norm(a), "utf8");
  const bb = Buffer.from(norm(b), "utf8");
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

function getSessionSecret() {
  return norm(
    process.env.ADMIN_ESCROW_SESSION_SECRET ||
      process.env.ADMIN_ESCROW_COOKIE_SECRET ||
      process.env.ADMIN_SESSION_SECRET ||
      ""
  );
}

export function getAdminEscrowGateConfig() {
  const login = norm(
    process.env.ADMIN_ESCROW_LOGIN ||
      process.env.ADMIN_PANEL_LOGIN ||
      ""
  );

  const password = norm(
    process.env.ADMIN_ESCROW_PASSWORD ||
      process.env.ADMIN_PANEL_PASSWORD ||
      ""
  );

  const ttlRaw = Number(
    process.env.ADMIN_ESCROW_TTL_HOURS ||
      process.env.ADMIN_PANEL_TTL_HOURS ||
      "8"
  );

  const ttlHours =
    Number.isFinite(ttlRaw) && ttlRaw > 0
      ? Math.max(1, Math.min(72, Math.floor(ttlRaw)))
      : 8;

  const sessionSecret = getSessionSecret();

  return {
    login,
    password,
    ttlHours,
    sessionSecret,
    configured:
      !!login &&
      !!password &&
      !!sessionSecret &&
      sessionSecret.length >= 16,
  };
}

export function verifyAdminEscrowGateCredentials(
  login?: string | null,
  password?: string | null
) {
  const cfg = getAdminEscrowGateConfig();
  if (!cfg.configured) return false;
  return safeEq(login, cfg.login) && safeEq(password, cfg.password);
}

function signValue(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createAdminEscrowToken(payload: AdminEscrowTokenPayload) {
  const cfg = getAdminEscrowGateConfig();
  if (!cfg.configured) {
    throw new Error("ADMIN_ESCROW_GATE_NOT_CONFIGURED");
  }

  const normalized: AdminEscrowTokenPayload = {
    sub: norm(payload.sub) || null,
    wallet: normAddr(payload.wallet) || null,
    role: payload.role,
    exp: Math.floor(payload.exp),
  };

  const raw = Buffer.from(JSON.stringify(normalized), "utf8").toString(
    "base64url"
  );
  const sig = signValue(raw, cfg.sessionSecret);
  return `${raw}.${sig}`;
}

export function verifyAdminEscrowToken(token?: string | null) {
  const cfg = getAdminEscrowGateConfig();
  if (!cfg.configured) return null;

  const rawToken = norm(token);
  if (!rawToken) return null;

  const [raw, sig] = rawToken.split(".");
  if (!raw || !sig) return null;

  const expected = signValue(raw, cfg.sessionSecret);
  if (!safeEq(sig, expected)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8")
    ) as AdminEscrowTokenPayload;

    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.role !== "ADMIN" && parsed.role !== "MODERATOR") return null;
    if (!Number.isFinite(parsed.exp)) return null;
    if (Date.now() >= Number(parsed.exp) * 1000) return null;

    return {
      sub: norm(parsed.sub) || null,
      wallet: normAddr(parsed.wallet) || null,
      role: parsed.role,
      exp: Number(parsed.exp),
    } satisfies AdminEscrowTokenPayload;
  } catch {
    return null;
  }
}
