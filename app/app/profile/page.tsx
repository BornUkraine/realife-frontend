"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { signIn, signOut, useSession } from "next-auth/react";
import { useAccount, useChainId } from "wagmi";

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

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

// 👇 ИСПРАВЛЕНИЕ: Ссылки теперь ведут в корень /u/..., а не в /app/u/...
function normalizePublicUrl(raw: string | null | undefined) {
  if (!raw) return null;
  if (raw.includes("tmp")) return null;

  // Если уже начинается с /u/, оставляем как есть
  if (raw.startsWith("/u/")) return raw;
  
  // Если пришло без слэша, добавляем /u/
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
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={fallback} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
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

  // live wallet (connected via RainbowKit)
  const { address: liveAddress, isConnected: walletIsConnected } = useAccount();
  const liveChainId = useChainId();

  const [me, setMe] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectBusy, setConnectBusy] = useState<"" | "twitter" | "discord">("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [walletCopied, setWalletCopied] = useState(false);
  const busyGuardRef = useRef(false);

  const twitterConnected = Boolean(me?.twitterId);
  const discordConnected = Boolean(me?.discordId);

  // server-verified wallet (created by wallet-first signIn)
  const serverWalletAddress = me?.walletAddress ?? null;
  const serverWalletChainId = me?.walletChainId ?? null;

  // what we show as wallet on page
  const displayWalletAddress = liveAddress ?? serverWalletAddress ?? null;
  const displayWalletChainId =
    walletIsConnected && liveAddress ? liveChainId : serverWalletChainId ?? null;

  const safePublicId = useMemo(() => {
    const pid = me?.publicId ?? null;
    if (!pid || pid === "tmp") return null;
    return pid;
  }, [me?.publicId]);

  const publicUrl = useMemo(() => {
    if (!me) return null;

    const normalized = normalizePublicUrl(me.publicUrl);
    if (normalized) return normalized;

    // 👇 ИСПРАВЛЕНИЕ: Формируем пути без /app
    if (me.handle) return `/u/${me.handle}`;
    if (safePublicId) return `/u/${safePublicId}`;
    return null;
  }, [me, safePublicId]);

  const publicFullUrl = useMemo(() => {
    if (!publicUrl || typeof window === "undefined") return null;
    return `${window.location.origin}${publicUrl}`;
  }, [publicUrl]);

  // TOP: name + avatar priority: X -> Discord -> fallback
  const topDisplayName = useMemo(() => {
    if (!me) return "Loading…";
    return (
      me.displayName ||
      me.twitterName ||
      (me.twitterUser ? `@${me.twitterUser}` : null) ||
      me.discordName ||
      me.discordUser ||
      "Realife user"
    );
  }, [me]);

  const heroAvatar = useMemo(() => {
    if (!me) return null;
    return me.mainAvatar || me.twitterImage || me.discordImage || null;
  }, [me]);

  async function loadMe() {
    if (!authed) {
      setMe(null);
      setLinkError(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as MeResponse;

      if (json?.ok) setMe(json?.user ?? null);
      else setMe(null);

      setLinkError(json?.linkError ?? null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setConnectBusy("");
      busyGuardRef.current = false;
    }
  }

  useEffect(() => {
    if (authed) void loadMe();
    else {
      setMe(null);
      setLinkError(null);
      setConnectBusy("");
      busyGuardRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  // refresh after OAuth return
  useEffect(() => {
    if (!authed) return;

    const onFocus = () => void loadMe();
    const onVis = () => {
      if (document.visibilityState === "visible") void loadMe();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    const t = window.setTimeout(() => void loadMe(), 700);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onVis);
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function connect(provider: "twitter" | "discord") {
    if (!authed) {
      setLinkError("NO_SERVER_SESSION");
      return;
    }
    if (busyGuardRef.current) return;

    busyGuardRef.current = true;
    setConnectBusy(provider);
    setLinkError(null);

    const callbackUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/app/profile`
        : "/app/profile";

    // IMPORTANT: do not await (OAuth navigation)
    void signIn(provider, { callbackUrl }).finally(() => {
      setTimeout(() => {
        busyGuardRef.current = false;
        setConnectBusy("");
      }, 1200);
    });
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const el = document.createElement("textarea");
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        return true;
      } catch {
        return false;
      }
    }
  }

  async function copyPublicLink() {
    if (!publicFullUrl) return;
    const ok = await copyText(publicFullUrl);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  async function copyWallet() {
    if (!displayWalletAddress) return;
    const ok = await copyText(displayWalletAddress);
    if (!ok) return;
    setWalletCopied(true);
    setTimeout(() => setWalletCopied(false), 1200);
  }

  const connectDisabled = connectBusy !== "" || !authed;

  const errorText =
    linkError === "DISCORD_ALREADY_LINKED"
      ? "This Discord is already linked to another profile."
      : linkError === "DISCORD_LINK_REQUIRES_X_LOGIN"
      ? "Old rule triggered (should not happen now). Refresh page."
      : linkError === "NO_SERVER_SESSION"
      ? "No server session yet. Connect wallet in the top bar and sign once."
      : linkError === "TWITTER_ALREADY_LINKED"
      ? "This X account is already linked to another profile."
      : linkError
      ? "Something went wrong. Try again."
      : null;

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


  return (
    <AppShell title="REALIFE" subtitle="Profile • Identity • Wallet">
      <main className="min-h-screen bg-[#060505] text-white overflow-x-hidden">
        {/* Ambient */}
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.12),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(255,255,255,0.05),transparent_60%)]" />
          <div className="absolute -top-80 -left-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/14 blur-3xl animate-pulse" />
          <div className="absolute -bottom-80 -right-80 h-[980px] w-[980px] rounded-full bg-[#d4af37]/10 blur-3xl animate-pulse" />
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
          {errorText ? <Alert title="Linking error" text={errorText} tone="error" /> : null}

          {!authed ? (
            <Alert
              title="No server session yet"
              text="Connect wallet in the top bar and sign once. After that, this page will show your profile and you can connect X / Discord."
              tone="warn"
            />
          ) : null}

          {walletMismatch ? (
            <Alert
              title="Wallet mismatch"
              text="Your connected wallet address is different from the server-verified wallet in your profile. Re-verify wallet (signature) or reconnect the correct wallet."
              tone="warn"
            />
          ) : null}

          {/* HERO */}
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

                    <Pill tone={twitterConnected ? "ok" : "muted"}>
                      {twitterConnected ? "X connected" : "X not connected"}
                    </Pill>

                    <Pill tone={discordConnected ? "ok" : "muted"}>
                      {discordConnected ? "Discord connected" : "Discord not connected"}
                    </Pill>

                    {me?.twitterUser ? <Pill tone="gold">@{me.twitterUser}</Pill> : null}
                    {me?.handle ? <Pill>handle: @{me.handle}</Pill> : null}
                    {safePublicId ? <Pill>{safePublicId}</Pill> : null}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-[260px] flex flex-col gap-2">
                <Btn variant="ghost" onClick={loadMe} disabled={!authed || loading}>
                  {loading ? "Refreshing…" : "Refresh"}
                </Btn>
                <Btn
                  variant="ghost"
                  onClick={() => signOut({ redirect: false })}
                  disabled={!authed}
                >
                  Log out (server)
                </Btn>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Points" value={me?.points ?? 0} />
              <Field label="Wallet (connected)" value={walletIsConnected && liveAddress ? shortAddr(liveAddress) : "—"} mono />
              <Field label="Wallet (server)" value={serverWalletAddress ? shortAddr(serverWalletAddress) : "—"} mono />
              <Field
                label="Public link"
                value={
                  publicUrl ? (
                    <button
                      type="button"
                      onClick={copyPublicLink}
                      className="text-left hover:underline"
                    >
                      <span className="font-mono">{publicUrl}</span>{" "}
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
                onClick={copyWallet}
                disabled={!displayWalletAddress}
              >
                {walletCopied ? "Wallet copied" : "Copy wallet"}
              </Btn>

              {publicUrl ? (
                <a
                  href={publicUrl}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-[12px] font-extrabold text-white border border-white/15 bg-white/[0.06] hover:bg-white/10"
                >
                  Open public profile →
                </a>
              ) : null}
            </div>
          </Card>

          {/* X + Discord blocks */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* X */}
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-extrabold">X</div>
                  <div className="text-xs text-white/60 mt-1">Name • @username • avatar</div>
                </div>

                {twitterConnected ? (
                  <Pill tone="ok">Connected</Pill>
                ) : (
                  <Btn
                    variant="gold"
                    onClick={() => connect("twitter")}
                    disabled={connectDisabled}
                    className="w-auto px-5 py-2"
                  >
                    {connectBusy === "twitter" ? "Connecting…" : "Connect"}
                  </Btn>
                )}
              </div>

              <div className="mt-5 flex items-center gap-4">
                <Avatar src={me?.twitterImage ?? null} fallback="X" size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold truncate">{me?.twitterName || "—"}</div>
                  <div className="text-xs text-white/60 truncate">
                    {me?.twitterUser ? `@${me.twitterUser}` : "—"}
                  </div>
                </div>
              </div>

              {twitterConnected ? (
                <div className="mt-4 text-[12px] text-white/45">
                  X id: <span className="font-mono text-white/70">{me?.twitterId}</span>
                </div>
              ) : null}
            </Card>

            {/* Discord */}
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-extrabold">Discord</div>
                  <div className="text-xs text-white/60 mt-1">Display • username • avatar</div>
                </div>

                {discordConnected ? (
                  <Pill tone="ok">Connected</Pill>
                ) : (
                  <Btn
                    variant="gold"
                    onClick={() => connect("discord")}
                    disabled={connectDisabled}
                    className="w-auto px-5 py-2"
                  >
                    {connectBusy === "discord" ? "Connecting…" : "Connect"}
                  </Btn>
                )}
              </div>

              <div className="mt-5 flex items-center gap-4">
                <Avatar src={me?.discordImage ?? null} fallback="DS" size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold truncate">{me?.discordName || "—"}</div>
                  <div className="text-xs text-white/60 truncate">{me?.discordUser || "—"}</div>
                </div>
              </div>

              {discordConnected ? (
                <div className="mt-4 text-[12px] text-white/45">
                  Discord id: <span className="font-mono text-white/70">{me?.discordId}</span>
                </div>
              ) : null}
            </Card>
          </div>

          <div className="text-[11px] text-white/40 text-center">
            Tip: wallet verification happens in the top bar (signature once). This page reads everything from <span className="font-mono text-white/55">/api/me</span>.
          </div>
        </div>
      </main>
    </AppShell>
  );
}