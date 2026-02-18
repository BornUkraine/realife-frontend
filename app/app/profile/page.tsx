"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { signIn, signOut, useSession } from "next-auth/react";
import { useAccount, useChainId } from "wagmi";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type MeUser = {
  id?: string;
  handle?: string | null;
  publicId?: string | null;
  publicUrl?: string | null;

  points?: number;

  twitterId?: string | null;
  twitterUser?: string | null;
  twitterName?: string | null;
  twitterImage?: string | null;

  discordId?: string | null;
  discordUser?: string | null;
  discordName?: string | null;
  discordImage?: string | null;

  walletAddress?: string | null; // server verified
  walletChainId?: number | null;

  displayName?: string | null;
  mainAvatar?: string | null;
};

type MeResponse = {
  ok: boolean;
  user?: MeUser | null;
  linkError?: string | null;
};

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
      <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#0b0a09]/55 backdrop-blur-2xl ring-1 ring-black/10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_0%,rgba(212,175,55,0.12),transparent_45%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_86%_120%,rgba(255,255,255,0.06),transparent_55%)]" />
          <div className="absolute inset-0 opacity-[0.06] [mask-image:radial-gradient(circle_at_40%_30%,black,transparent_70%)] bg-[linear-gradient(to_right,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[length:64px_64px]" />
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

  const titleCls = tone === "error" ? "text-rose-50" : "text-amber-50";
  const textCls = tone === "error" ? "text-rose-100/90" : "text-amber-100/90";

  return (
    <div className={cx("rounded-[22px] border px-4 py-3", cls)}>
      <div className={cx("text-sm font-extrabold", titleCls)}>{title}</div>
      <div className={cx("mt-1 text-sm", textCls)}>{text}</div>
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

  const gold = cx(
    "w-full px-6 py-3 rounded-2xl text-black",
    "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
    "shadow-[0_22px_70px_rgba(212,175,55,0.18)] ring-1 ring-black/15",
    "hover:brightness-110 hover:-translate-y-px active:translate-y-0"
  );

  const ghost = cx(
    "w-full px-6 py-3 rounded-2xl text-white",
    "border border-white/15 bg-white/[0.06] backdrop-blur-2xl",
    "shadow-[0_18px_70px_rgba(0,0,0,0.28)]",
    "hover:bg-white/10 hover:-translate-y-px active:translate-y-0"
  );

  const tiny = cx(
    "px-3 py-2 rounded-xl text-[12px] text-white",
    "border border-white/15 bg-white/[0.06] backdrop-blur-2xl",
    "hover:bg-white/10 active:translate-y-[1px]"
  );

  return (
    <button
      {...props}
      className={cx(base, variant === "gold" ? gold : variant === "ghost" ? ghost : tiny, className)}
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
        "rounded-2xl overflow-hidden flex items-center justify-center",
        "bg-white/[0.06] border border-white/10",
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 h-full relative overflow-hidden group">
      <div className="text-[11px] text-white/40 font-bold uppercase tracking-wider">{label}</div>
      <div className={cx("mt-1 text-sm font-extrabold text-white/90 truncate", mono ? "font-mono text-[13px]" : "")}>
        {value}
      </div>
    </div>
  );
}

/* --------------------------------- Page ---------------------------------- */

export default function ProfilePage() {
  const { status } = useSession();
  const authed = status === "authenticated";

  // live wallet
  const { address: liveAddress, isConnected: walletIsConnected } = useAccount();
  const liveChainId = useChainId();

  const [me, setMe] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false); // 🔥 Состояние для клейма
  const [connectBusy, setConnectBusy] = useState<"" | "twitter" | "discord">("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [walletCopied, setWalletCopied] = useState(false);
  const busyGuardRef = useRef(false);

  const twitterConnected = Boolean(me?.twitterId);
  const discordConnected = Boolean(me?.discordId);

  const serverWalletAddress = me?.walletAddress ?? null;

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

  // 🔥 Priority Identity Logic: X > Discord > Wallet
  const topDisplayName = useMemo(() => {
    if (!me) return "Loading…";
    return (
      me.twitterName || 
      (me.twitterUser ? `@${me.twitterUser}` : null) || 
      me.discordName || 
      me.discordUser || 
      "Realife user"
    );
  }, [me]);

  const heroAvatar = useMemo(() => {
    if (!me) return null;
    return me.twitterImage || me.discordImage || null;
  }, [me]);

  async function loadMe() {
    if (!authed) return;
    setLoading(true);
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      const json = (await res.json()) as MeResponse;
      if (json?.ok) setMe(json?.user ?? null);
      setLinkError(json?.linkError ?? null);
    } catch (e) {
      console.error("LOAD_ME_ERROR", e);
    } finally {
      setLoading(false);
      setConnectBusy("");
      busyGuardRef.current = false;
    }
  }

  // 🔥 Daily Claim Logic
  async function claimDaily() {
    if (claiming || !authed) return;
    setClaiming(true);
    try {
      const res = await fetch("/api/points/daily", { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        setMe(prev => prev ? { ...prev, points: json.points } : null);
      } else {
        alert(json.message || "Already claimed today");
      }
    } catch (e) {
      console.error("CLAIM_ERROR", e);
    } finally {
      setClaiming(false);
    }
  }

  useEffect(() => {
    if (authed) void loadMe();
    else setMe(null);
  }, [authed]);

  // Sync data when window is refocused (OAuth return)
  useEffect(() => {
    if (!authed) return;
    const handleFocus = () => void loadMe();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void loadMe();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [authed]);

  async function connect(provider: "twitter" | "discord") {
    if (!authed || busyGuardRef.current) return;
    busyGuardRef.current = true;
    setConnectBusy(provider);
    setLinkError(null);
    const callbackUrl = `${window.location.origin}/app/profile`;
    void signIn(provider, { callbackUrl }).finally(() => {
      setTimeout(() => {
        busyGuardRef.current = false;
        setConnectBusy("");
      }, 2000);
    });
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  const errorText = 
    linkError === "TWITTER_ALREADY_LINKED" ? "This X account is already linked to another profile." :
    linkError === "DISCORD_ALREADY_LINKED" ? "This Discord is already linked to another profile." :
    linkError ? "An error occurred. Please try again." : null;

  const walletPillText = serverWalletAddress
    ? "Wallet verified (server)"
    : walletIsConnected
    ? "Wallet connected (client)"
    : "Wallet not connected";

  return (
    <AppShell title="REALIFE" subtitle="Profile • Identity • Wallet">
      <main className="min-h-screen bg-[#060505] text-white overflow-x-hidden relative">
        
        {/* BACKGROUND AMBIENT */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.12),transparent_55%)]" />
          <div className="absolute -top-80 -left-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/10 blur-3xl animate-pulse" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "linear-gradient(to right, rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.22) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-6 py-10 space-y-6">
          {errorText && <Alert title="Linking error" text={errorText} tone="error" />}

          {!authed && (
            <Alert
              title="No server session"
              text="Please connect your wallet in the top bar and sign the message to verify your identity."
              tone="warn"
            />
          )}

          {/* HERO SECTION */}
          <Card>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-6 min-w-0">
                <Avatar src={heroAvatar} fallback="RL" size="hero" />
                <div className="min-w-0">
                  <div className="text-[10px] font-black text-amber-500/80 uppercase tracking-[0.2em] mb-1">Unified Profile</div>
                  <div className="text-3xl md:text-5xl font-black tracking-tighter truncate leading-tight">
                    {authed ? topDisplayName : "—"}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Pill tone={serverWalletAddress ? "ok" : "muted"}>{walletPillText}</Pill>
                    {twitterConnected && <Pill tone="gold">@{me?.twitterUser}</Pill>}
                    {discordConnected && <Pill tone="ok">Discord Linked</Pill>}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-[240px] flex flex-col gap-2">
                <Btn variant="ghost" onClick={loadMe} disabled={!authed || loading}>
                  {loading ? "Refreshing…" : "Sync Profile"}
                </Btn>
                <Btn variant="ghost" onClick={() => signOut()} disabled={!authed} className="opacity-50 hover:opacity-100 border-white/5 bg-transparent">
                  Log out
                </Btn>
              </div>
            </div>

            {/* STATS & INFO GRID */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              
              {/* POINTS BLOCK WITH CLAIM BUTTON */}
              <div className="relative group overflow-visible">
                <Field label="Points Balance" value={me?.points ?? 0} />
                {authed && (
                  <button 
                    onClick={claimDaily}
                    disabled={claiming}
                    className={cx(
                      "absolute -top-3 -right-2 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all shadow-2xl border",
                      "bg-amber-400 text-black border-amber-600 hover:scale-110 active:scale-95",
                      "disabled:opacity-40 disabled:grayscale"
                    )}
                  >
                    {claiming ? "..." : "CLAIM DAILY"}
                  </button>
                )}
              </div>

              <Field label="Server Wallet" value={serverWalletAddress ? shortAddr(serverWalletAddress) : "—"} mono />
              
              <Field
                label="Public Identity"
                value={
                  publicUrl ? (
                    <button
                      type="button"
                      onClick={() => { copyText(publicFullUrl || ""); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                      className="text-left hover:text-amber-400 transition flex items-center gap-2"
                    >
                      <span className="font-mono">{publicUrl}</span>
                      <span className="text-[10px] opacity-40">{copied ? "COPIED" : "COPY"}</span>
                    </button>
                  ) : "—"
                }
                mono
              />

              <div className="flex items-center justify-center p-2">
                {publicUrl && (
                  <a
                    href={publicUrl}
                    className="text-[11px] font-black text-amber-500 hover:underline decoration-2 underline-offset-4 tracking-tighter"
                  >
                    OPEN PUBLIC PROFILE →
                  </a>
                )}
              </div>
            </div>
          </Card>

          {/* SOCIAL ACCOUNTS GRID */}
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* TWITTER / X */}
            <Card className={cx(twitterConnected ? "ring-2 ring-amber-500/10" : "")}>
              <div className="flex items-center justify-between mb-6">
                <div className="font-black text-xl italic tracking-tighter">X / TWITTER</div>
                {twitterConnected ? (
                  <Pill tone="ok">Connected</Pill>
                ) : (
                  <Btn
                    variant="gold"
                    onClick={() => connect("twitter")}
                    disabled={connectBusy !== "" || !authed}
                    className="w-auto px-6 py-2 h-10"
                  >
                    {connectBusy === "twitter" ? "…" : "Connect"}
                  </Btn>
                )}
              </div>
              <div className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5 group transition-colors hover:bg-white/[0.05]">
                <Avatar src={me?.twitterImage} fallback="X" size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="font-black truncate text-white/90">{me?.twitterName || "Not Connected"}</div>
                  <div className="text-xs text-white/40 font-mono">@{me?.twitterUser || "—"}</div>
                </div>
              </div>
            </Card>

            {/* DISCORD */}
            <Card className={cx(discordConnected ? "ring-2 ring-emerald-500/10" : "")}>
              <div className="flex items-center justify-between mb-6">
                <div className="font-black text-xl italic tracking-tighter">DISCORD</div>
                {discordConnected ? (
                  <Pill tone="ok">Connected</Pill>
                ) : (
                  <Btn
                    variant="gold"
                    onClick={() => connect("discord")}
                    disabled={connectBusy !== "" || !authed}
                    className="w-auto px-6 py-2 h-10"
                  >
                    {connectBusy === "discord" ? "…" : "Connect"}
                  </Btn>
                )}
              </div>
              <div className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5 group transition-colors hover:bg-white/[0.05]">
                <Avatar src={me?.discordImage} fallback="DS" size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="font-black truncate text-white/90">{me?.discordName || "Not Connected"}</div>
                  <div className="text-xs text-white/40 font-mono">{me?.discordUser || "—"}</div>
                </div>
              </div>
            </Card>

          </div>

          <div className="pt-10 text-center opacity-20">
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Realife Identity System • 2026</p>
          </div>
        </div>
      </main>
    </AppShell>
  );
}