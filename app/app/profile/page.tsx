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

  // Saved (optional) wallet in DB
  walletAddress?: string | null;
  walletChainId?: number | null;
};

type MeResponse = {
  ok: boolean;
  user?: MeUser | null;
  linkError?: string | null;
};

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function normalizePublicUrl(raw: string | null | undefined) {
  if (!raw) return null;
  if (raw.includes("tmp")) return null;

  if (raw.startsWith("/u/")) return `/app${raw}`;
  if (raw.startsWith("/app/u/")) return raw;
  if (!raw.startsWith("/")) return `/app/u/${raw}`;
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
    <div
      className={cx(
        "text-[11px] font-semibold px-3 py-1.5 rounded-full border",
        cls
      )}
    >
      {children}
    </div>
  );
}

function Alert({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[22px] border border-rose-500/25 bg-rose-500/10 px-4 py-3">
      <div className="text-sm font-extrabold text-rose-50">{title}</div>
      <div className="mt-1 text-sm text-rose-100/90">{text}</div>
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
        "rounded-2xl overflow-hidden flex items-center justify-center",
        "bg-white/[0.06] border border-white/10",
        ring
          ? "shadow-[0_18px_60px_rgba(212,175,55,0.10)] ring-1 ring-black/15"
          : ""
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
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

function Skeleton({ className }: { className: string }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-xl bg-white/[0.06] border border-white/10",
        className
      )}
    />
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

/* --------------------------------- Page ---------------------------------- */

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const authed = status === "authenticated";

  // ✅ Live wallet from RainbowKit/wagmi (connected in header)
  const { address: liveAddress, isConnected: walletIsConnected } = useAccount();
  const liveChainId = useChainId();

  const [me, setMe] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(false);

  const [dailyBusy, setDailyBusy] = useState(false);
  const [connectBusy, setConnectBusy] = useState<"" | "twitter" | "discord">("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [walletCopied, setWalletCopied] = useState(false);
  const busyGuardRef = useRef(false);

  const sUser: any = (session as any)?.user ?? null;

  // X fields (ONLY X)
  const xId = me?.twitterId ?? sUser?.twitterId ?? null;
  const xName = me?.twitterName ?? sUser?.twitterName ?? null;
  const xUser = me?.twitterUser ?? sUser?.twitterUser ?? null;
  const xImage = me?.twitterImage ?? sUser?.twitterImage ?? null;

  // Discord fields (ONLY Discord)
  const dId = me?.discordId ?? sUser?.discordId ?? null;
  const dName = me?.discordName ?? sUser?.discordName ?? null;
  const dUser = me?.discordUser ?? sUser?.discordUser ?? null;
  const dImage = me?.discordImage ?? sUser?.discordImage ?? null;

  // Saved wallet in DB (optional)
  const savedWalletAddress = me?.walletAddress ?? (sUser?.walletAddress ?? null);
  const savedWalletChainId = me?.walletChainId ?? (sUser?.walletChainId ?? null);

  // ✅ What we DISPLAY in profile: live wallet has priority
  const displayWalletAddress = liveAddress ?? savedWalletAddress ?? null;
  const displayWalletChainId =
    walletIsConnected && liveAddress ? liveChainId : savedWalletChainId ?? null;

  const twitterConnected = Boolean(xId);
  const discordConnected = Boolean(dId);
  const walletVisible = Boolean(displayWalletAddress);

  // Top name MUST be from X (как ты просил)
  const topDisplayName = useMemo(() => {
    return xName || (xUser ? `@${xUser}` : null) || "Not linked to X";
  }, [xName, xUser]);

  // 🔥 HERO AVATAR: ONLY X (самая большая вверху)
  const heroAvatar = useMemo(() => xImage || null, [xImage]);

  // for bottom X card, always show X avatar even if hero exists
  const bottomXAvatar = xImage || null;

  const safePublicId = useMemo(() => {
    const pid = me?.publicId ?? null;
    if (!pid || pid === "tmp") return null;
    return pid;
  }, [me?.publicId]);

  const publicUrl = useMemo(() => {
    if (!me) return null;

    const normalized = normalizePublicUrl(me.publicUrl);
    if (normalized) return normalized;

    if (me.handle) return `/app/u/${me.handle}`;
    if (safePublicId) return `/app/u/${safePublicId}`;
    return null;
  }, [me, safePublicId]);

  const publicFullUrl = useMemo(() => {
    if (!publicUrl || typeof window === "undefined") return null;
    return `${window.location.origin}${publicUrl}`;
  }, [publicUrl]);

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
    if (status === "authenticated") void loadMe();
    else {
      setMe(null);
      setLinkError(null);
      setConnectBusy("");
      busyGuardRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ✅ after OAuth return: refresh on focus/visibility
  useEffect(() => {
    if (!authed) return;

    const onFocus = () => void loadMe();
    const onVis = () => {
      if (document.visibilityState === "visible") void loadMe();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    const t = window.setTimeout(() => void loadMe(), 800);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function claimDaily() {
    if (!authed || dailyBusy) return;

    setDailyBusy(true);
    try {
      await fetch("/api/points/daily", { method: "POST" }).then((r) =>
        r.json().catch(() => ({}))
      );
      await loadMe();
    } finally {
      setDailyBusy(false);
    }
  }

  async function connect(provider: "twitter" | "discord") {
    if (busyGuardRef.current) return;

    // Discord только к существующему профилю (через X)
    if (!authed && provider === "discord") {
      setLinkError("DISCORD_LINK_REQUIRES_X_LOGIN");
      return;
    }
    if (provider === "discord" && !twitterConnected) {
      setLinkError("DISCORD_LINK_REQUIRES_X_LOGIN");
      return;
    }

    busyGuardRef.current = true;
    setConnectBusy(provider);

    const callbackUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/app/profile`
        : "/app/profile";

    void signIn(provider, { callbackUrl }).finally(() => {
      setTimeout(() => {
        busyGuardRef.current = false;
        setConnectBusy("");
      }, 1500);
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

  const connectDisabled = connectBusy !== "" || status !== "authenticated";
  const connectAllowed = authed && !connectDisabled;
  const canConnectDiscord = connectAllowed && twitterConnected;

  const errorText =
    linkError === "DISCORD_LINK_REQUIRES_X_LOGIN"
      ? "Connect X first, then link Discord to the same profile."
      : linkError === "DISCORD_ALREADY_LINKED"
        ? "This Discord is already linked to another profile."
        : linkError
          ? "Something went wrong. Try again."
          : null;

  // ✅ Wallet status text: we don't force linking in profile
  const walletPillText = walletIsConnected
    ? "Wallet connected (session)"
    : savedWalletAddress
      ? "Wallet saved (profile)"
      : "Wallet not connected";

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
          {errorText ? <Alert title="Linking error" text={errorText} /> : null}

          {/* HERO (самая большая ава = X, главный ник/имя = X) */}
          <Card>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-5">
                  <Avatar src={heroAvatar} fallback="X" size="hero" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white/60">
                      Main identity (X)
                    </div>

                    <div className="mt-1 text-3xl md:text-4xl font-black tracking-tight truncate">
                      {authed ? topDisplayName : "Not logged in"}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <Pill tone={twitterConnected ? "ok" : "muted"}>
                        {twitterConnected ? "X connected" : "X not connected"}
                      </Pill>
                      <Pill tone={discordConnected ? "ok" : "muted"}>
                        {discordConnected ? "Discord connected" : "Discord not connected"}
                      </Pill>
                      <Pill tone={walletVisible ? "ok" : "muted"}>{walletPillText}</Pill>
                      {loading ? <Pill>syncing…</Pill> : null}
                    </div>

                    {/* Top secondary line: @xUser */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {xUser ? <Pill tone="gold">@{xUser}</Pill> : <Pill tone="warn">Connect X to set handle</Pill>}
                      {authed && me?.handle ? <Pill>@{me.handle}</Pill> : null}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Field label="Points" value={authed ? me?.points ?? sUser?.points ?? 0 : 0} />
                  <Field
                    label="Handle"
                    value={authed ? (me?.handle ? `@${me.handle}` : "—") : "—"}
                  />
                  <Field label="Public ID" value={authed ? safePublicId ?? "—" : "—"} />
                  <Field label="Public link" value={authed ? publicUrl ?? "—" : "—"} mono />
                </div>

                {/* Wallet strip (DISPLAY live wallet first) */}
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] text-white/55 font-semibold">
                        EVM wallet
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[13px] font-extrabold text-white/85 truncate">
                          {displayWalletAddress ?? "—"}
                        </span>

                        {displayWalletAddress ? (
                          <Pill tone={walletIsConnected ? "ok" : "muted"}>
                            {walletIsConnected ? "Live" : "Saved"}
                          </Pill>
                        ) : null}
                      </div>

                      <div className="mt-1 text-[11px] text-white/45">
                        Chain:{" "}
                        <span className="text-white/70 font-semibold">
                          {displayWalletChainId ?? "—"}
                        </span>
                        {displayWalletAddress ? (
                          <>
                            {" "}
                            • Short:{" "}
                            <span className="text-white/70 font-mono">
                              {shortAddr(displayWalletAddress)}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {displayWalletAddress ? (
                        <Btn variant="tiny" onClick={copyWallet}>
                          {walletCopied ? "Copied" : "Copy address"}
                        </Btn>
                      ) : (
                        <div className="text-[11px] text-white/45 md:text-right">
                          Connect wallet in the top bar (RainbowKit).
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Public link actions */}
                {authed ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {publicUrl ? (
                      <>
                        <Btn
                          variant="tiny"
                          onClick={copyPublicLink}
                          disabled={!publicFullUrl}
                        >
                          {copied ? "Copied" : "Copy link"}
                        </Btn>
                        <a
                          href={publicUrl}
                          className="text-[12px] font-extrabold px-3 py-2 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/10"
                        >
                          Open public
                        </a>
                      </>
                    ) : (
                      <div className="text-[11px] text-white/45">
                        Public link will appear after publicId is set.
                      </div>
                    )}

                    <Btn
                      variant="tiny"
                      onClick={loadMe}
                      disabled={!authed || loading}
                      className="ml-auto"
                    >
                      {loading ? "Refreshing…" : "Refresh"}
                    </Btn>
                  </div>
                ) : null}
              </div>

              {/* Actions */}
              <div className="w-full md:w-[360px] space-y-3">
                {!authed ? (
                  <Btn
                    variant="gold"
                    onClick={() => connect("twitter")}
                    disabled={connectBusy !== ""}
                  >
                    {connectBusy === "twitter" ? "Opening X…" : "Login with X"}
                  </Btn>
                ) : (
                  <Btn
                    variant="ghost"
                    onClick={() => signOut({ callbackUrl: "/app/profile" })}
                  >
                    Logout
                  </Btn>
                )}

                <Btn
                  variant="ghost"
                  disabled={!authed || dailyBusy}
                  onClick={claimDaily}
                >
                  {dailyBusy ? "Claiming…" : "Daily check-in (+10)"}
                </Btn>

                <div className="text-[11px] text-white/45 leading-relaxed">
                  One profile. X is the main identity. Discord is an add-on. Wallet is shown from RainbowKit (top bar).
                </div>
              </div>
            </div>
          </Card>

          {/* Bottom row: LEFT X, RIGHT Discord (2 cards), + EXACTLY 3 AVATARS total */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* X bottom */}
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold">X account</div>
                  <div className="text-xs text-white/60 mt-1">
                    Name • @username • avatar
                  </div>
                </div>
                <Pill tone={twitterConnected ? "ok" : "muted"}>
                  {twitterConnected ? "Connected" : "Not connected"}
                </Pill>
              </div>

              <div className="mt-5 flex items-center gap-4">
                {loading && !me ? (
                  <Skeleton className="h-16 w-16 rounded-2xl" />
                ) : (
                  <Avatar src={bottomXAvatar} fallback="X" size="lg" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold truncate">
                    {authed ? xName || "—" : "—"}
                  </div>
                  <div className="text-xs text-white/60 truncate">
                    {authed ? (xUser ? `@${xUser}` : "—") : "—"}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                {!twitterConnected ? (
                  <Btn
                    variant="gold"
                    disabled={!connectAllowed}
                    onClick={() => connect("twitter")}
                  >
                    {connectBusy === "twitter" ? "Opening X…" : "Connect X (+100)"}
                  </Btn>
                ) : (
                  <Btn variant="ghost" disabled className="w-full">
                    Connected
                  </Btn>
                )}
              </div>
            </Card>

            {/* Discord bottom */}
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold">Discord account</div>
                  <div className="text-xs text-white/60 mt-1">
                    Display • username • avatar
                  </div>
                </div>
                <Pill tone={discordConnected ? "ok" : "muted"}>
                  {discordConnected ? "Connected" : "Not connected"}
                </Pill>
              </div>

              <div className="mt-5 flex items-center gap-4">
                {loading && !me ? (
                  <Skeleton className="h-16 w-16 rounded-2xl" />
                ) : (
                  <Avatar src={dImage} fallback="DS" size="lg" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold truncate">
                    {authed ? dName || "—" : "—"}
                  </div>
                  <div className="text-xs text-white/60 truncate">
                    {authed ? dUser || "—" : "—"}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                {!discordConnected ? (
                  <Btn
                    variant="gold"
                    disabled={!canConnectDiscord}
                    onClick={() => connect("discord")}
                  >
                    {connectBusy === "discord"
                      ? "Opening Discord…"
                      : "Connect Discord (+100)"}
                  </Btn>
                ) : (
                  <Btn variant="ghost" disabled className="w-full">
                    Connected
                  </Btn>
                )}

                {!twitterConnected ? (
                  <div className="mt-2 text-[11px] text-white/45">
                    Connect X first, then you can link Discord to the same profile.
                  </div>
                ) : null}
              </div>
            </Card>
          </div>

          <div className="text-[11px] text-white/40 text-center">
            Tip: If avatars don’t update after OAuth — press Refresh (or re-open the page).
          </div>
        </div>
      </main>
    </AppShell>
  );
}
