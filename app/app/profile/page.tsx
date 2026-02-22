"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { signOut, useSession } from "next-auth/react";
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

  walletAddress?: string | null; // server verified
  walletChainId?: number | null;

  displayName?: string | null;
  mainAvatar?: string | null;

  lastDailyAt?: string | null; // ISO string from API

  // X (Twitter) fields from DB (already linked)
  twitterId?: string | null;
  twitterUser?: string | null;
  twitterName?: string | null;
  twitterImage?: string | null;
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

function humanizeXError(code?: string | null) {
  if (!code) return null;
  // коды из /api/x/callback
  if (code === "NO_SERVER_SESSION") return "No server wallet session. Verify wallet again.";
  if (code === "SERVER_MISCONFIG") return "Server misconfigured (missing NEXTAUTH_SECRET).";
  if (code === "TWITTER_ENV_MISSING") return "Missing TWITTER_CLIENT_ID / TWITTER_CLIENT_SECRET in env.";
  if (code === "BAD_STATE") return "State invalid/expired. Usually NEXTAUTH_SECRET mismatch between envs.";
  if (code === "PKCE_MISSING") return "PKCE cookie missing. Usually cookie not returned after X redirect.";
  if (code === "TOKEN_EXCHANGE") return "Failed to exchange code for access token (X OAuth token endpoint).";
  if (code === "NO_ACCESS_TOKEN") return "X did not return access token.";
  if (code === "ME_FAILED") return "Failed to fetch X profile (users/me).";
  if (code === "BAD_PROFILE") return "Bad X profile response (missing id).";
  if (code === "TWITTER_ALREADY_LINKED") return "This X account is already linked to another wallet profile.";
  if (code === "LINK_FAILED") return "Linking failed (DB update).";
  if (code === "NO_CODE") return "No authorization code returned from X.";
  if (code === "DISCONNECT_FAILED") return "Failed to disconnect X. Try again.";
  return `X linking error: ${code}`;
}

/* --------------------------------- UI Kit -------------------------------- */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
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

  return <div className={cx("text-[11px] font-semibold px-3 py-1.5 rounded-full border", cls)}>{children}</div>;
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
  const cls = tone === "error" ? "border-rose-500/25 bg-rose-500/10" : "border-amber-500/25 bg-amber-500/10";
  return (
    <div className={cx("rounded-[22px] border px-4 py-3", cls)}>
      <div className={cx("text-sm font-extrabold", tone === "error" ? "text-rose-50" : "text-amber-50")}>{title}</div>
      <div className={cx("mt-1 text-sm", tone === "error" ? "text-rose-100/90" : "text-amber-100/90")}>{text}</div>
    </div>
  );
}

function Btn({
  variant = "gold",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "gold" | "ghost" | "tiny" }) {
  const base =
    "inline-flex items-center justify-center gap-2 font-extrabold transition disabled:opacity-60 disabled:cursor-not-allowed";
  const gold =
    "w-full px-6 py-3 rounded-2xl text-black bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] shadow-[0_22px_70px_rgba(212,175,55,0.18)] ring-1 ring-black/15 hover:brightness-110 hover:-translate-y-px active:translate-y-0";
  const ghost =
    "w-full px-6 py-3 rounded-2xl text-white border border-white/15 bg-white/[0.06] backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.28)] hover:bg-white/10 hover:-translate-y-px active:translate-y-0";
  const tiny =
    "px-3 py-2 rounded-xl text-[12px] text-white border border-white/15 bg-white/[0.06] backdrop-blur-2xl hover:bg-white/10 active:translate-y-[1px]";

  return (
    <button {...props} className={cx(base, variant === "gold" ? gold : variant === "ghost" ? ghost : tiny, className)} />
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
        <img src={src} alt={fallback} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="text-white/40 text-xs font-black">{fallback}</span>
      )}
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-[11px] text-white/55 font-semibold">{label}</div>
      <div className={cx("mt-1 text-sm font-extrabold text-white/85 truncate", mono ? "font-mono text-[13px]" : "")}>
        {value}
      </div>
    </div>
  );
}

/* --------------------------------- Page ---------------------------------- */

export default function ProfilePage() {
  const { status } = useSession();
  const authed = status === "authenticated";

  const { address: liveAddress, isConnected: walletIsConnected } = useAccount();
  const liveChainId = useChainId();

  const [me, setMe] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [walletCopied, setWalletCopied] = useState(false);

  const [dailyBusy, setDailyBusy] = useState(false);
  const [dailyMsg, setDailyMsg] = useState<string | null>(null);

  const [connectBusy, setConnectBusy] = useState<"" | "twitter">("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const busyGuardRef = useRef(false);

  const serverWalletAddress = me?.walletAddress ?? null;
  const serverWalletChainId = me?.walletChainId ?? null;
  const twitterConnected = Boolean(me?.twitterId);

  const displayWalletAddress = liveAddress ?? serverWalletAddress ?? null;
  const displayWalletChainId = walletIsConnected && liveAddress ? liveChainId : serverWalletChainId ?? null;

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
      me.twitterName ||
      (me.twitterUser ? `@${me.twitterUser}` : null) ||
      (me.handle ? `@${me.handle}` : null) ||
      (serverWalletAddress ? shortAddr(serverWalletAddress) : "Realife user")
    );
  }, [me, serverWalletAddress]);

  const heroAvatar = useMemo(() => me?.mainAvatar || me?.twitterImage || null, [me]);

  const dailyStatus = useMemo(() => {
    const last = me?.lastDailyAt ?? null;
    if (!last) return { canClaim: true, label: "Daily available" as const };

    const lastDate = new Date(last);
    if (Number.isNaN(lastDate.getTime())) return { canClaim: true, label: "Daily available" as const };

    const today = utcKey(new Date());
    const lastKey = utcKey(lastDate);
    const canClaim = today !== lastKey;

    return { canClaim, label: canClaim ? "Daily available" : "Claimed today" } as const;
  }, [me?.lastDailyAt]);

  async function loadMe() {
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
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authed) void loadMe();
    else {
      setMe(null);
      setDailyMsg(null);
      setLinkError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    if (typeof window === "undefined") return;

    const sp = new URLSearchParams(window.location.search);
    const linked = sp.get("linked");
    const err = sp.get("error");

    if (err) setLinkError(err);

    if (linked === "twitter") {
      void loadMe();
    } else if (err) {
      void loadMe();
    }

    if (linked || err) {
      sp.delete("linked");
      sp.delete("error");
      const next = `${window.location.pathname}${sp.toString() ? `?${sp.toString()}` : ""}`;
      window.history.replaceState({}, "", next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    const onFocus = () => void loadMe();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function claimDaily() {
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
        setMe((prev) => (prev ? { ...prev, points: ok.points, lastDailyAt: new Date().toISOString() } : prev));
        setDailyMsg(`Daily claimed: +${ok.add}. New balance: ${ok.points}.`);
      } else {
        const msg = (json as any)?.message || "Failed";
        setDailyMsg(msg.toLowerCase().includes("already claimed") ? "Already claimed today." : "Daily claim failed.");
      }
    } catch {
      setDailyMsg("Network error. Try again.");
    } finally {
      setDailyBusy(false);
    }
  }

  // ✅ START X OAUTH (custom): идём на /api/x/start
  function connectTwitter() {
    if (!authed || !serverWalletAddress) {
      setLinkError("NO_SERVER_WALLET");
      return;
    }
    if (busyGuardRef.current) return;

    busyGuardRef.current = true;
    setConnectBusy("twitter");
    setDailyMsg(null);
    setLinkError(null);

    const returnTo = encodeURIComponent("/app/profile?linked=twitter");
    window.location.href = `/api/x/start?returnTo=${returnTo}`;
  }

  // ✅ DISCONNECT X
  async function disconnectTwitter() {
    if (!authed) return;
    setConnectBusy("twitter");
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
      setConnectBusy("");
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  const walletPillText = serverWalletAddress
    ? "Wallet verified (server)"
    : walletIsConnected
    ? "Wallet connected (client)"
    : "Wallet not connected";

  const walletMismatch = useMemo(() => {
    const a = liveAddress?.toLowerCase();
    const b = serverWalletAddress?.toLowerCase();
    return Boolean(a && b && a !== b);
  }, [liveAddress, serverWalletAddress]);

  const uiErrorText =
    linkError === "NO_SERVER_WALLET"
      ? "Verify your wallet first (server session). Then connect X."
      : humanizeXError(linkError)
      ? humanizeXError(linkError)
      : linkError
      ? "Failed to connect X account. Please try again."
      : null;

  return (
    <AppShell title="REALIFE" subtitle="Profile • Identity • Wallet">
      <main className="min-h-screen bg-[#060505] text-white overflow-x-hidden">
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.12),transparent_55%)]" />
          <div className="absolute -top-80 -left-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/14 blur-3xl animate-pulse" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.22) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-10 space-y-6">
          {uiErrorText && <Alert title="Linking Issue" text={uiErrorText} tone="error" />}
          {dailyMsg && (
            <Alert title="Points" text={dailyMsg} tone={dailyMsg.toLowerCase().includes("failed") ? "error" : "warn"} />
          )}
          {!authed && (
            <Alert
              title="No server session yet"
              text="Connect wallet in the top bar and sign once to view your profile."
              tone="warn"
            />
          )}
          {walletMismatch && (
            <Alert
              title="Wallet mismatch"
              text="Your connected wallet is different from the server-verified wallet. Please re-verify."
              tone="warn"
            />
          )}

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
                    <Pill tone={serverWalletAddress ? "ok" : walletIsConnected ? "warn" : "muted"}>{walletPillText}</Pill>
                    <Pill tone={dailyStatus.canClaim ? "gold" : "ok"}>
                      {dailyStatus.canClaim ? "Daily available" : "Claimed today"}
                    </Pill>
                    {twitterConnected && <Pill tone="ok">X connected</Pill>}
                    {me?.twitterUser && <Pill tone="gold">@{me.twitterUser}</Pill>}
                    {me?.handle && <Pill>handle: @{me.handle}</Pill>}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-[300px] flex flex-col gap-2">
                <Btn variant="ghost" onClick={loadMe} disabled={!authed || loading}>
                  {loading ? "Refreshing…" : "Refresh"}
                </Btn>
                <Btn variant="gold" onClick={claimDaily} disabled={!authed || dailyBusy || !dailyStatus.canClaim}>
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
                  <div className="flex items-center gap-2">
                    <span className="truncate">{dailyStatus.label}</span>
                    <span className="text-[11px] text-white/55">
                      {me?.lastDailyAt ? `• ${formatLocal(me.lastDailyAt)}` : ""}
                    </span>
                  </div>
                }
              />
              <Field label="Wallet (connected)" value={walletIsConnected && liveAddress ? shortAddr(liveAddress) : "—"} mono />
              <Field
                label="Public link"
                value={
                  publicUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        copyText(publicFullUrl!).then(() => {
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1200);
                        })
                      }
                      className="text-left hover:underline font-mono"
                    >
                      {publicUrl} <span className="text-[11px] text-white/60">{copied ? "copied" : "copy"}</span>
                    </button>
                  ) : (
                    "—"
                  )
                }
                mono
              />
              <Field
                label="Chain"
                value={displayWalletChainId ? <span className="font-extrabold">{displayWalletChainId}</span> : "—"}
              />
              <Field label="Identity" value={<span className="truncate">{twitterConnected ? "Wallet + X" : "Wallet only"}</span>} />
              <Field label="User id" value={me?.id ?? "—"} mono />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Btn
                variant="tiny"
                onClick={() =>
                  copyText(displayWalletAddress!).then(() => {
                    setWalletCopied(true);
                    setTimeout(() => setWalletCopied(false), 1200);
                  })
                }
                disabled={!displayWalletAddress}
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
            </div>
          </Card>

          {/* X CONNECT */}
          {authed && (
            <div className="grid md:grid-cols-2 gap-6">
              <Card className={cx(twitterConnected ? "ring-1 ring-amber-500/20 bg-amber-500/[0.02]" : "")}>
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="text-sm font-extrabold">X (Twitter)</div>
                    <div className="text-xs text-white/60 mt-1">Name • @username • avatar</div>
                  </div>

                  {twitterConnected ? (
                    <div className="flex items-center gap-2">
                      <Pill tone="ok">Connected</Pill>
                      <Btn
                        variant="ghost"
                        onClick={disconnectTwitter}
                        disabled={connectBusy !== "" || !authed}
                        className="w-auto px-4 py-2 text-[13px]"
                      >
                        {connectBusy === "twitter" ? "Working…" : "Disconnect"}
                      </Btn>
                    </div>
                  ) : (
                    <Btn
                      variant="gold"
                      onClick={connectTwitter}
                      disabled={connectBusy !== "" || !authed}
                      className="w-auto px-5 py-2 text-[13px]"
                    >
                      {connectBusy === "twitter" ? "Redirecting…" : "Connect X"}
                    </Btn>
                  )}
                </div>

                <div className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                  <Avatar src={me?.twitterImage ?? null} fallback="X" size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-extrabold truncate">{me?.twitterName || "Not Connected"}</div>
                    <div className="text-xs text-white/60 font-mono truncate">{me?.twitterUser ? `@${me.twitterUser}` : "—"}</div>
                  </div>
                </div>

                {!twitterConnected && (
                  <div className="mt-4 text-[11px] text-white/55">
                    After X auth, your account will be linked to your wallet profile automatically.
                  </div>
                )}
              </Card>
            </div>
          )}

          <div className="text-[11px] text-white/40 text-center">
            Tip: wallet verification happens in the top bar (signature once). This page reads everything from{" "}
            <span className="font-mono text-white/55">/api/me</span>.
          </div>
        </div>
      </main>
    </AppShell>
  );
}