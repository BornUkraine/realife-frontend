"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Reveal from "@/components/Reveal";
import { signOut, useSession } from "next-auth/react";
import { useAccount } from "wagmi";

/* -------------------------------------------------------------------------- */
/* REWARDS                                                                    */
/* -------------------------------------------------------------------------- */

const REWARD_X = 100;
const REWARD_DISCORD = 100;

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type MeUser = {
  id?: string;
  handle?: string | null;
  publicId?: string | null;
  publicUrl?: string | null;

  points?: number;

  authMethod?: "WALLET" | "GOOGLE" | string | null;
  walletKind?: "EXTERNAL" | "EMBEDDED" | string | null;
  embeddedWalletProvider?: "WEB3AUTH" | "OPENFORT" | string | null;

  walletAddress?: string | null; // server verified onchain address
  walletChainId?: number | null;

  googleId?: string | null;
  googleEmail?: string | null;
  googleName?: string | null;
  googleImage?: string | null;

  displayName?: string | null;
  mainAvatar?: string | null;

  lastDailyAt?: string | null; // ISO string from API

  // X (Twitter)
  twitterId?: string | null;
  twitterUser?: string | null;
  twitterName?: string | null;
  twitterImage?: string | null;
  twitterRewarded?: boolean;

  // Discord
  discordId?: string | null;
  discordUser?: string | null;
  discordName?: string | null;
  discordImage?: string | null;
  discordRewarded?: boolean;
};

type MeResponse = {
  ok: boolean;
  user?: MeUser | null;
  linkError?: string | null;
};

type DailyResponse =
  | { ok: true; add: number; points: number }
  | { ok: false; message?: string; points?: number };

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function normalizePublicUrl(raw: string | null | undefined) {
  if (!raw) return null;
  if (raw.includes("tmp")) return null;
  if (raw.startsWith("/u/")) return raw;
  if (!raw.startsWith("/")) return `/u/${raw}`;
  return raw;
}

function shortAddr(addr?: string | null) {
  if (!addr) return "—";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// UTC to match server daily boundaries
function utcKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

function formatLocal(dtIso?: string | null) {
  if (!dtIso) return "—";
  const d = new Date(dtIso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function humanizeLinkError(code?: string | null) {
  if (!code) return null;

  if (code === "NO_SERVER_WALLET")
    return "Verify your wallet first (server session). Then connect socials.";
  if (code === "NO_SERVER_SESSION") return "No server wallet session. Verify wallet again.";
  if (code === "SERVER_MISCONFIG")
    return "Server misconfigured (missing NEXTAUTH_SECRET / NEXTAUTH_URL).";
  if (code === "BAD_STATE")
    return "State invalid/expired. Usually NEXTAUTH_SECRET mismatch between envs.";
  if (code === "NO_CODE") return "No authorization code returned from provider.";
  if (code === "TOKEN_EXCHANGE") return "Failed to exchange code for access token.";
  if (code === "NO_ACCESS_TOKEN") return "Provider did not return access token.";
  if (code === "ME_FAILED") return "Failed to fetch profile (me).";
  if (code === "BAD_PROFILE") return "Bad profile response (missing id).";
  if (code === "LINK_FAILED") return "Linking failed (DB update).";

  if (code === "TWITTER_ENV_MISSING")
    return "Missing TWITTER_CLIENT_ID / TWITTER_CLIENT_SECRET in env.";
  if (code === "PKCE_MISSING")
    return "PKCE cookie missing. Usually cookie not returned after X redirect.";
  if (code === "TWITTER_ALREADY_LINKED")
    return "This X account is already linked to another wallet profile.";

  if (code === "DISCORD_ENV_MISSING")
    return "Missing DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET in env.";
  if (code === "DISCORD_ALREADY_LINKED")
    return "This Discord account is already linked to another wallet profile.";

  if (code === "DISCONNECT_FAILED") return "Failed to disconnect. Try again.";

  return `Linking error: ${code}`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/* --------------------------------- UI Kit -------------------------------- */

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-[30px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.24),rgba(212,175,55,0.11),rgba(184,135,10,0.10))]",
        "shadow-[0_26px_100px_rgba(0,0,0,0.60)]",
        className
      )}
    >
      <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#0b0a09]/25 backdrop-blur-2xl ring-1 ring-black/10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_0%,rgba(212,175,55,0.12),transparent_45%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_86%_120%,rgba(255,255,255,0.06),transparent_55%)]" />
        </div>
        <div className="relative z-10 p-6 md:p-7">{children}</div>
      </div>
    </div>
  );
}

function Pill({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "ok" | "warn" | "gold";
}) {
  const cls =
    tone === "ok"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
      : tone === "warn"
      ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
      : tone === "gold"
      ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
      : "border-white/10 bg-white/[0.06] text-white/70";

  return (
    <div className={cx("text-[11px] font-semibold px-3 py-1.5 rounded-full border", cls)}>
      {children}
    </div>
  );
}

function Alert({
  title,
  text,
  tone = "warn",
}: {
  title: string;
  text: string;
  tone?: "warn" | "error";
}) {
  const cls =
    tone === "error"
      ? "border-rose-500/25 bg-rose-500/10"
      : "border-amber-500/25 bg-amber-500/10";
  return (
    <div className={cx("rounded-[22px] border px-4 py-3 backdrop-blur-md", cls)}>
      <div
        className={cx(
          "text-sm font-extrabold",
          tone === "error" ? "text-rose-50" : "text-amber-50"
        )}
      >
        {title}
      </div>
      <div
        className={cx(
          "mt-1 text-sm",
          tone === "error" ? "text-rose-100/90" : "text-amber-100/90"
        )}
      >
        {text}
      </div>
    </div>
  );
}

function Btn({
  variant = "gold",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "gold" | "ghost" | "tiny";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-extrabold transition disabled:opacity-60 disabled:cursor-not-allowed";
  const gold =
    "w-full px-6 py-3 rounded-2xl text-black bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] shadow-[0_22px_70px_rgba(212,175,55,0.18)] ring-1 ring-black/15 hover:brightness-110 hover:-translate-y-px active:translate-y-0";
  const ghost =
    "w-full px-6 py-3 rounded-2xl text-white border border-white/15 bg-white/[0.06] backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)] hover:bg-white/10 hover:-translate-y-px active:translate-y-0";
  const tiny =
    "px-3 py-2 rounded-xl text-[12px] text-white border border-white/15 bg-white/[0.06] backdrop-blur-2xl hover:bg-white/10 active:translate-y-[1px]";

  return (
    <button
      {...props}
      className={cx(
        base,
        variant === "gold" ? gold : variant === "ghost" ? ghost : tiny,
        className
      )}
    />
  );
}

function Avatar({
  src,
  fallback,
  size = "md",
  ring = true,
}: {
  src?: string | null;
  fallback: string;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  ring?: boolean;
}) {
  const s =
    size === "hero"
      ? "h-24 w-24 md:h-28 md:w-28"
      : size === "xl"
      ? "h-20 w-20 md:h-24 md:w-24"
      : size === "lg"
      ? "h-16 w-16"
      : size === "sm"
      ? "h-12 w-12"
      : "h-14 w-14";

  return (
    <div
      className={cx(
        s,
        "rounded-2xl overflow-hidden flex items-center justify-center bg-white/[0.06] border border-white/10",
        ring ? "shadow-[0_18px_60px_rgba(212,175,55,0.10)] ring-1 ring-black/15" : ""
      )}
    >
      {src ? (
        <img
          src={src}
          alt={fallback}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="text-white/40 text-xs font-black">{fallback}</span>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-[11px] text-white/55 font-semibold">{label}</div>
      <div
        className={cx(
          "mt-1 text-sm font-extrabold text-white/85 truncate",
          mono ? "font-mono text-[13px]" : ""
        )}
      >
        {value}
      </div>
    </div>
  );
}

function SocialIcon({ kind }: { kind: "x" | "discord" }) {
  if (kind === "x") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 1200 1227"
        fill="none"
        aria-hidden="true"
        className="opacity-90"
      >
        <path
          d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.802 750.218L842.672 1226.37H1200L714.163 519.284ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.828Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 256 199"
      fill="none"
      aria-hidden="true"
      className="opacity-90"
    >
      <path
        d="M216.856 16.597A208.502 208.502 0 0 0 164.042 0c-2.204 3.97-4.81 9.289-6.59 13.506a193.512 193.512 0 0 0-58.902 0C96.77 9.289 94.13 3.97 91.93 0a207.853 207.853 0 0 0-52.818 16.597C5.615 67.028-3.49 116.113 1.052 164.49c22.274 16.52 43.834 26.58 65.027 33.17 5.27-7.185 9.95-14.81 13.98-22.822-7.66-2.9-14.97-6.46-21.95-10.61 1.84-1.35 3.64-2.76 5.4-4.2 42.34 19.77 88.26 19.77 130.1 0 1.78 1.46 3.6 2.86 5.43 4.2-6.99 4.16-14.32 7.72-21.99 10.63 4.03 7.99 8.72 15.62 13.98 22.8 21.21-6.59 42.78-16.65 65.05-33.19 5.32-56.11-9.1-104.74-38.76-147.893ZM85.5 135.1c-12.5 0-22.9-11.5-22.9-25.6 0-14.1 10.1-25.6 22.9-25.6 12.8 0 23.2 11.6 22.9 25.6 0 14.1-10.1 25.6-22.9 25.6Zm85 0c-12.5 0-22.9-11.5-22.9-25.6 0-14.1 10.1-25.6 22.9-25.6 12.8 0 23.2 11.6 22.9 25.6 0 14.1-10.1 25.6-22.9 25.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function RewardStrip({
  connected,
  claimed,
  reward,
  label,
}: {
  connected: boolean;
  claimed: boolean;
  reward: number;
  label: string;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 font-black">
            Rewards
          </div>
          <div className="mt-1 text-sm font-extrabold text-white/85">
            {label} <span className="text-amber-200">+{reward}</span> points
          </div>
          <div className="mt-1 text-xs text-white/45">
            One-time bonus for linking your profile identity.
          </div>
        </div>

        {claimed ? (
          <div className="shrink-0 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/80">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/10 border border-white/15">
              ✓
            </span>
            Claimed
          </div>
        ) : connected ? (
          <div className="shrink-0 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-100">
            ⏳ Pending
          </div>
        ) : (
          <div className="shrink-0 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-100">
            ✨ +{reward}
          </div>
        )}
      </div>
    </div>
  );
}

function SocialRow({
  kind,
  title,
  subtitle,
  connected,
  claimed,
  avatarSrc,
  name,
  username,
  busy,
  onConnect,
  onDisconnect,
  reward,
}: {
  kind: "x" | "discord";
  title: string;
  subtitle: string;
  connected: boolean;
  claimed: boolean;
  avatarSrc?: string | null;
  name?: string | null;
  username?: string | null;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  reward: number;
}) {
  const connectLabel = claimed
    ? kind === "x"
      ? "Connect X"
      : "Connect Discord"
    : kind === "x"
    ? `Connect X (+${reward})`
    : `Connect Discord (+${reward})`;

  return (
    <Card className={cx(connected ? "ring-1 ring-amber-500/20 bg-amber-500/[0.02]" : "")}>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl flex items-center justify-center border border-white/12 bg-white/[0.06] backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)] ring-1 ring-black/10">
            <SocialIcon kind={kind} />
          </div>
          <div>
            <div className="text-sm font-extrabold">{title}</div>
            <div className="text-xs text-white/60 mt-0.5">{subtitle}</div>
          </div>
        </div>

        {connected ? (
          <div className="flex items-center gap-2">
            <Pill tone="ok">Connected</Pill>
            <Btn
              variant="ghost"
              onClick={onDisconnect}
              disabled={busy}
              className="w-auto px-4 py-2 text-[13px]"
            >
              {busy ? "Working…" : "Disconnect"}
            </Btn>
          </div>
        ) : (
          <Btn
            variant="gold"
            onClick={onConnect}
            disabled={busy}
            className="w-auto px-5 py-2 text-[13px]"
          >
            {busy ? "Redirecting…" : connectLabel}
          </Btn>
        )}
      </div>

      <div className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5">
        <Avatar src={avatarSrc ?? null} fallback={kind === "x" ? "X" : "D"} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold truncate">
            {connected ? name || "Connected" : "Not Connected"}
          </div>
          <div className="text-xs text-white/60 font-mono truncate">
            {connected ? (username ? `@${username}` : "—") : "—"}
          </div>
        </div>
      </div>

      <RewardStrip
        connected={connected}
        claimed={claimed}
        reward={reward}
        label={kind === "x" ? "Connect X and earn" : "Connect Discord and earn"}
      />

      {!connected && (
        <div className="mt-4 text-[11px] text-white/55">
          X and Discord are profile links only. Login remains Wallet or Google embedded wallet.
        </div>
      )}
    </Card>
  );
}

/* --------------------------------- Page ---------------------------------- */

export default function ProfilePage() {
  const { status } = useSession();
  const authed = status === "authenticated";

  const { address: liveAddress, isConnected: walletIsConnected } = useAccount();

  const [me, setMe] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [walletCopied, setWalletCopied] = useState(false);

  const [dailyBusy, setDailyBusy] = useState(false);
  const [dailyMsg, setDailyMsg] = useState<string | null>(null);

  const [busyX, setBusyX] = useState(false);
  const [busyDiscord, setBusyDiscord] = useState(false);

  const [linkError, setLinkError] = useState<string | null>(null);

  const busyGuardRef = useRef<null | "x" | "discord">(null);
  const busyTimerRef = useRef<number | null>(null);

  const serverWalletAddress = me?.walletAddress ?? null;
  const authMethod = String(me?.authMethod || "WALLET").toUpperCase();
  const walletKind = String(me?.walletKind || "EXTERNAL").toUpperCase();
  const isEmbeddedWallet = walletKind === "EMBEDDED";

  const twitterConnected = Boolean(me?.twitterId);
  const discordConnected = Boolean(me?.discordId);

  const twitterClaimed = Boolean(me?.twitterRewarded);
  const discordClaimed = Boolean(me?.discordRewarded);

  const displayWalletAddress = liveAddress ?? serverWalletAddress ?? null;

  const safePublicId = useMemo(() => {
    const pid = me?.publicId ?? null;
    if (!pid || pid === "tmp") return null;
    return pid;
  }, [me?.publicId]);

  const publicUrl = useMemo(() => {
    if (!me) return null;
    const normalized = normalizePublicUrl(me.publicUrl);
    if (normalized) return normalized;
    if (me.handle) return `/u/${me.handle}`;
    if (safePublicId) return `/u/${safePublicId}`;
    return null;
  }, [me, safePublicId]);

  const publicFullUrl = useMemo(() => {
    if (!publicUrl || typeof window === "undefined") return null;
    return `${window.location.origin}${publicUrl}`;
  }, [publicUrl]);

  const topDisplayName = useMemo(() => {
    if (!me) return "Loading…";
    return (
      me.displayName ||
      me.googleName ||
      me.twitterName ||
      me.discordName ||
      (me.twitterUser ? `@${me.twitterUser}` : null) ||
      (me.discordUser ? `@${me.discordUser}` : null) ||
      (me.handle ? `@${me.handle}` : null) ||
      (serverWalletAddress ? shortAddr(serverWalletAddress) : "Realife user")
    );
  }, [me, serverWalletAddress]);

  const heroAvatar = useMemo(() => {
    return me?.mainAvatar || me?.googleImage || me?.twitterImage || me?.discordImage || null;
  }, [me]);

  const dailyStatus = useMemo(() => {
    const last = me?.lastDailyAt ?? null;
    if (!last) return { canClaim: true, label: "Daily available" as const };

    const lastDate = new Date(last);
    if (Number.isNaN(lastDate.getTime()))
      return { canClaim: true, label: "Daily available" as const };

    const today = utcKey(new Date());
    const lastKey = utcKey(lastDate);
    const canClaim = today !== lastKey;

    return { canClaim, label: canClaim ? "Daily available" : "Claimed today" } as const;
  }, [me?.lastDailyAt]);

  const walletMismatch = useMemo(() => {
    const a = liveAddress?.toLowerCase();
    const b = serverWalletAddress?.toLowerCase();
    return Boolean(a && b && a !== b);
  }, [liveAddress, serverWalletAddress]);

  const uiErrorText = humanizeLinkError(linkError);

  const loadMe = useCallback(async () => {
    if (!authed) {
      setMe(null);
      setDailyMsg(null);
      setLinkError(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      const json = (await res.json()) as MeResponse;
      if (json?.ok) setMe(json?.user ?? null);
      else setMe(null);

      setLinkError(json?.linkError ?? null);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [authed]);

  useEffect(() => {
    if (authed) void loadMe();
    else {
      setMe(null);
      setDailyMsg(null);
      setLinkError(null);
    }
  }, [authed, loadMe]);

  useEffect(() => {
    if (!authed) return;
    if (typeof window === "undefined") return;

    const sp = new URLSearchParams(window.location.search);
    const linked = sp.get("linked");
    const err = sp.get("error");

    if (err) setLinkError(err);

    if (linked === "twitter" || linked === "discord" || err) {
      void loadMe();
    }

    if (linked || err) {
      busyGuardRef.current = null;
      setBusyX(false);
      setBusyDiscord(false);

      if (busyTimerRef.current) window.clearTimeout(busyTimerRef.current);
      busyTimerRef.current = null;

      sp.delete("linked");
      sp.delete("error");
      const next = `${window.location.pathname}${sp.toString() ? `?${sp.toString()}` : ""}`;
      window.history.replaceState({}, "", next);
    }
  }, [authed, loadMe]);

  useEffect(() => {
    if (!authed) return;
    const onFocus = () => void loadMe();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [authed, loadMe]);

  useEffect(() => {
    return () => {
      if (busyTimerRef.current) window.clearTimeout(busyTimerRef.current);
    };
  }, []);

  const claimDaily = useCallback(async () => {
    if (!authed || dailyBusy) return;
    setDailyBusy(true);
    setDailyMsg(null);

    try {
      const res = await fetch("/api/points/daily", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });

      const json = (await res.json()) as DailyResponse;

      if (res.ok && (json as any).ok) {
        const ok = json as any;
        setMe((prev) =>
          prev ? { ...prev, points: ok.points, lastDailyAt: new Date().toISOString() } : prev
        );
        setDailyMsg(`Daily claimed: +${ok.add}. New balance: ${ok.points}.`);
      } else {
        const msg = (json as any)?.message || "Failed";
        setDailyMsg(
          msg.toLowerCase().includes("already claimed")
            ? "Already claimed today."
            : "Daily claim failed."
        );
      }
    } catch {
      setDailyMsg("Network error. Try again.");
    } finally {
      setDailyBusy(false);
    }
  }, [authed, dailyBusy]);

  const startGuard = useCallback((kind: "x" | "discord") => {
    busyGuardRef.current = kind;

    if (busyTimerRef.current) window.clearTimeout(busyTimerRef.current);
    busyTimerRef.current = window.setTimeout(() => {
      busyGuardRef.current = null;
      setBusyX(false);
      setBusyDiscord(false);
      busyTimerRef.current = null;
    }, 20_000);
  }, []);

  const connectTwitter = useCallback(() => {
    if (!authed || !serverWalletAddress) {
      setLinkError("NO_SERVER_WALLET");
      return;
    }
    if (busyGuardRef.current) return;

    setDailyMsg(null);
    setLinkError(null);

    setBusyX(true);
    startGuard("x");

    const returnTo = encodeURIComponent("/app/profile?linked=twitter");
    window.location.href = `/api/x/start?returnTo=${returnTo}`;
  }, [authed, serverWalletAddress, startGuard]);

  const connectDiscord = useCallback(() => {
    if (!authed || !serverWalletAddress) {
      setLinkError("NO_SERVER_WALLET");
      return;
    }
    if (busyGuardRef.current) return;

    setDailyMsg(null);
    setLinkError(null);

    setBusyDiscord(true);
    startGuard("discord");

    const returnTo = encodeURIComponent("/app/profile?linked=discord");
    window.location.href = `/api/discord/start?returnTo=${returnTo}`;
  }, [authed, serverWalletAddress, startGuard]);

  const disconnectTwitter = useCallback(async () => {
    if (!authed || busyX) return;
    setBusyX(true);
    setLinkError(null);

    try {
      const res = await fetch("/api/x/disconnect", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        setLinkError(j?.error || "DISCONNECT_FAILED");
        return;
      }
      await loadMe();
    } catch {
      setLinkError("DISCONNECT_FAILED");
    } finally {
      setBusyX(false);
      busyGuardRef.current = null;
    }
  }, [authed, busyX, loadMe]);

  const disconnectDiscord = useCallback(async () => {
    if (!authed || busyDiscord) return;
    setBusyDiscord(true);
    setLinkError(null);

    try {
      const res = await fetch("/api/discord/disconnect", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        setLinkError(j?.error || "DISCONNECT_FAILED");
        return;
      }
      await loadMe();
    } catch {
      setLinkError("DISCONNECT_FAILED");
    } finally {
      setBusyDiscord(false);
      busyGuardRef.current = null;
    }
  }, [authed, busyDiscord, loadMe]);

  const walletPillText = serverWalletAddress
    ? isEmbeddedWallet
      ? "Google embedded wallet"
      : "Wallet verified (server)"
    : walletIsConnected
    ? "Wallet connected (client)"
    : "Wallet not connected";

  const canCopyWallet = Boolean(displayWalletAddress);

  return (
    <div className="space-y-6">
      {uiErrorText && <Alert title="Linking Issue" text={uiErrorText} tone="error" />}

      {dailyMsg && (
        <Alert
          title="Points"
          text={dailyMsg}
          tone={dailyMsg.toLowerCase().includes("failed") ? "error" : "warn"}
        />
      )}

      {!authed && (
        <Alert
          title="No server session yet"
          text="Connect wallet and sign once, or continue with Google to create an embedded wallet profile."
          tone="warn"
        />
      )}

      {walletMismatch && (
        <Alert
          title="Wallet mismatch"
          text="Your connected wallet is different from the server-verified wallet. Please re-verify in the top bar (sign once)."
          tone="warn"
        />
      )}

      <Reveal>
        <Card>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-5 min-w-0">
              <Avatar src={heroAvatar} fallback="RL" size="hero" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white/60">Unified profile</div>
                <div className="mt-1 text-3xl md:text-4xl font-black tracking-tight truncate">
                  {authed ? topDisplayName : "—"}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Pill tone={serverWalletAddress ? "ok" : walletIsConnected ? "warn" : "muted"}>
                    {walletPillText}
                  </Pill>

                  {authed && (
                    <Pill tone={isEmbeddedWallet ? "gold" : "muted"}>
                      {authMethod === "GOOGLE" ? "Google login" : "Wallet login"}
                      {isEmbeddedWallet ? ` • ${me?.embeddedWalletProvider || "EMBEDDED"}` : ""}
                    </Pill>
                  )}

                  <Pill tone={dailyStatus.canClaim ? "gold" : "ok"}>
                    {dailyStatus.canClaim ? "Daily available" : "Claimed today"}
                  </Pill>

                  {twitterConnected && <Pill tone="ok">X connected</Pill>}
                  {discordConnected && <Pill tone="ok">Discord connected</Pill>}

                  {me?.twitterUser && <Pill tone="gold">@{me.twitterUser}</Pill>}
                  {me?.discordUser && <Pill tone="gold">@{me.discordUser}</Pill>}

                  {me?.handle && <Pill>handle: @{me.handle}</Pill>}
                </div>
              </div>
            </div>

            <div className="w-full md:w-[300px] flex flex-col gap-2">
              <Btn variant="ghost" onClick={loadMe} disabled={!authed || loading}>
                {loading ? "Refreshing…" : "Refresh"}
              </Btn>

              <Btn
                variant="gold"
                onClick={claimDaily}
                disabled={!authed || dailyBusy || !dailyStatus.canClaim}
              >
                {dailyBusy ? "Claiming…" : dailyStatus.canClaim ? "Claim daily +10" : "Daily claimed"}
              </Btn>

              <Btn variant="ghost" onClick={() => signOut({ redirect: false })} disabled={!authed}>
                Log out (server)
              </Btn>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Points" value={me?.points ?? 0} />

            <Field
              label="Daily"
              value={
                <div className="flex flex-col leading-tight">
                  <div className="flex items-center gap-2">
                    <span
                      className={cx(
                        "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[12px] font-black",
                        dailyStatus.canClaim
                          ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
                          : "border-white/15 bg-white/[0.06] text-white/90"
                      )}
                      title={dailyStatus.canClaim ? "Available" : "Claimed"}
                    >
                      {dailyStatus.canClaim ? "+" : "✓"}
                    </span>

                    <span className="text-sm font-extrabold text-white/85">
                      {dailyStatus.canClaim ? "Available" : "Claimed"}
                    </span>
                  </div>

                  {me?.lastDailyAt ? (
                    <span className="mt-1 text-[11px] text-white/55 truncate">
                      {formatLocal(me.lastDailyAt)}
                    </span>
                  ) : (
                    <span className="mt-1 text-[11px] text-white/45">—</span>
                  )}
                </div>
              }
            />

            <Field
              label={isEmbeddedWallet ? "Embedded wallet" : "Wallet (connected)"}
              value={
                isEmbeddedWallet
                  ? shortAddr(serverWalletAddress)
                  : walletIsConnected && liveAddress
                  ? shortAddr(liveAddress)
                  : "—"
              }
              mono
            />

            <Field
              label="Public link"
              value={
                publicUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!publicFullUrl) return;
                      copyText(publicFullUrl).then((ok) => {
                        if (!ok) return;
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1200);
                      });
                    }}
                    className="text-left hover:underline font-mono"
                  >
                    {publicUrl}{" "}
                    <span className="text-[11px] text-white/60">{copied ? "copied" : "copy"}</span>
                  </button>
                ) : (
                  "—"
                )
              }
              mono
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Btn
              variant="tiny"
              onClick={() => {
                if (!displayWalletAddress) return;
                copyText(displayWalletAddress).then((ok) => {
                  if (!ok) return;
                  setWalletCopied(true);
                  setTimeout(() => setWalletCopied(false), 1200);
                });
              }}
              disabled={!canCopyWallet}
            >
              {walletCopied ? "Wallet copied" : "Copy wallet"}
            </Btn>

            {publicUrl && (
              <a
                href={publicUrl}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-[12px] font-extrabold text-white border border-white/15 bg-white/[0.06] hover:bg-white/10"
              >
                Open public profile →
              </a>
            )}

            {publicUrl && (
              <a
                href={`${publicUrl}/nfts`}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-[12px] font-extrabold text-black
                bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]
                shadow-[0_18px_60px_rgba(212,175,55,0.18)]
                ring-1 ring-black/15 hover:brightness-110 hover:-translate-y-px active:translate-y-0"
              >
                NFTs →
              </a>
            )}

            {authed && (
              <a
                href="/app/orders"
                className={cx(
                  "inline-flex items-center justify-center px-3 py-2 rounded-xl",
                  "text-[12px] font-extrabold",
                  "text-white",
                  "border border-white/15 bg-white/[0.06]",
                  "backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)]",
                  "hover:bg-white/10 hover:-translate-y-px active:translate-y-0 transition"
                )}
              >
                My Orders →
              </a>
            )}

            {authed && (
              <a
                href="/app/referrals"
                className={cx(
                  "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl",
                  "text-[12px] font-extrabold",
                  "text-black",
                  "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
                  "shadow-[0_18px_60px_rgba(212,175,55,0.16)]",
                  "ring-1 ring-black/15",
                  "hover:brightness-110 hover:-translate-y-px active:translate-y-0 transition"
                )}
                title="Referrals: invite friends and earn points"
              >
                Referrals
                <span className="inline-flex items-center justify-center h-5 px-2 rounded-full text-[10px] font-black text-black/80 bg-black/10 ring-1 ring-black/10">
                  +50
                </span>
                ↗
              </a>
            )}
          </div>
        </Card>
      </Reveal>

      {authed && (
        <Reveal delayMs={120}>
          <div className="grid md:grid-cols-2 gap-6">
            <SocialRow
              kind="x"
              title="X (Twitter)"
              subtitle="Name • @username • avatar"
              connected={twitterConnected}
              claimed={twitterClaimed}
              avatarSrc={me?.twitterImage ?? null}
              name={me?.twitterName ?? null}
              username={me?.twitterUser ?? null}
              busy={busyX}
              onConnect={connectTwitter}
              onDisconnect={disconnectTwitter}
              reward={REWARD_X}
            />

            <SocialRow
              kind="discord"
              title="Discord"
              subtitle="Name • @username • avatar"
              connected={discordConnected}
              claimed={discordClaimed}
              avatarSrc={me?.discordImage ?? null}
              name={me?.discordName ?? null}
              username={me?.discordUser ?? null}
              busy={busyDiscord}
              onConnect={connectDiscord}
              onDisconnect={disconnectDiscord}
              reward={REWARD_DISCORD}
            />
          </div>
        </Reveal>
      )}

      <Reveal delayMs={200}>
        <div className="text-[11px] text-white/40 text-center">
          Tip: wallet login and Google embedded login both create the same Realife profile ID. X and
          Discord stay profile links only. This page reads everything from <span className="font-mono text-white/55">/api/me</span>.
        </div>
      </Reveal>
    </div>
  );
}