"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { signIn, signOut, useSession } from "next-auth/react";

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

  // guard: tmp
  if (raw.includes("tmp")) return null;

  // backend might return "/u/xxx" but your route is "/app/u/xxx"
  if (raw.startsWith("/u/")) return `/app${raw}`;

  // already correct
  if (raw.startsWith("/app/u/")) return raw;

  // if backend returns just "xxx"
  if (!raw.startsWith("/")) return `/app/u/${raw}`;

  // fallback
  return raw;
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
  tone?: "muted" | "ok" | "warn";
}) {
  const cls =
    tone === "ok"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
      : tone === "warn"
        ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
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
}: {
  src?: string | null;
  fallback: string;
  size?: "md" | "lg";
}) {
  const s = size === "lg" ? "h-16 w-16" : "h-14 w-14";
  return (
    <div
      className={cx(
        s,
        "rounded-2xl border border-white/10 bg-white/[0.06] overflow-hidden flex items-center justify-center"
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

/* --------------------------------- Page ---------------------------------- */

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const authed = status === "authenticated";

  const [me, setMe] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(false);

  const [dailyBusy, setDailyBusy] = useState(false);
  const [connectBusy, setConnectBusy] = useState<"" | "twitter" | "discord">("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const busyGuardRef = useRef(false);

  // session.user расширенный (как any)
  const sUser: any = (session as any)?.user ?? null;

  /**
   * ВАЖНО (фикс):
   * - НЕЛЬЗЯ использовать sUser.name / sUser.image как фолбэк для X блока,
   *   потому что после Discord они становятся дискордовскими.
   * - Для X берём только twitter-поля, для Discord — только discord-поля.
   */
  const xId = me?.twitterId ?? sUser?.twitterId ?? null;
  const xName = me?.twitterName ?? sUser?.twitterName ?? null;
  const xUser = me?.twitterUser ?? sUser?.twitterUser ?? null;
  const xImage = me?.twitterImage ?? sUser?.twitterImage ?? null;

  const dId = me?.discordId ?? sUser?.discordId ?? null;
  const dName = me?.discordName ?? sUser?.discordName ?? null;
  const dUser = me?.discordUser ?? sUser?.discordUser ?? null;
  const dImage = me?.discordImage ?? sUser?.discordImage ?? null;

  const twitterConnected = Boolean(xId);
  const discordConnected = Boolean(dId);

  const displayName = useMemo(() => {
    return (
      xName ||
      (xUser ? `@${xUser}` : null) ||
      dName ||
      dUser ||
      "Realife user"
    );
  }, [xName, xUser, dName, dUser]);

  // ✅ main avatar: X first
  const heroAvatar = useMemo(() => xImage || dImage || null, [xImage, dImage]);

  // ✅ guard against tmp
  const safePublicId = useMemo(() => {
    const pid = me?.publicId ?? null;
    if (!pid || pid === "tmp") return null;
    return pid;
  }, [me?.publicId]);

  /**
   * FIX: у тебя публичные профили живут в /app/u/...
   * (потому что страница лежит в app/app/u/[id]/page.tsx)
   */
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

  // status -> reload
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

  // ✅ после OAuth возврата: focus + visibilitychange (мобилки)
  useEffect(() => {
    if (!authed) return;

    const onFocus = () => void loadMe();
    const onVis = () => {
      if (document.visibilityState === "visible") void loadMe();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    // мягкий доп. рефреш через 800мс (часто помогает после OAuth возврата)
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

  async function copyPublicLink() {
    if (!publicFullUrl) return;

    try {
      await navigator.clipboard.writeText(publicFullUrl);
    } catch {
      const el = document.createElement("textarea");
      el.value = publicFullUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const connectDisabled = connectBusy !== "" || status !== "authenticated";
  const connectAllowed = authed && !connectDisabled;
  const canConnectDiscord = connectAllowed && twitterConnected;

  const errorText =
    linkError === "DISCORD_LINK_REQUIRES_X_LOGIN"
      ? "Connect X first, then link Discord to the same profile."
      : linkError
        ? "Something went wrong while linking. Try again."
        : null;

  return (
    <AppShell title="REALIFE" subtitle="Profile • Identity • Points">
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

          {/* HERO */}
          <Card>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-4">
                  <Avatar src={heroAvatar} fallback="RL" size="lg" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white/60">
                      Realife profile
                    </div>

                    <div className="mt-1 text-3xl md:text-4xl font-black tracking-tight truncate">
                      {authed ? displayName : "Not logged in"}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <Pill tone={twitterConnected ? "ok" : "muted"}>
                        {twitterConnected ? "X connected" : "X not connected"}
                      </Pill>
                      <Pill tone={discordConnected ? "ok" : "muted"}>
                        {discordConnected
                          ? "Discord connected"
                          : "Discord not connected"}
                      </Pill>
                      {loading ? <Pill>syncing…</Pill> : null}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] text-white/55 font-semibold">
                      Points
                    </div>
                    <div className="mt-1 text-2xl font-black text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]">
                      {authed ? me?.points ?? sUser?.points ?? 0 : 0}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] text-white/55 font-semibold">
                      Handle
                    </div>
                    <div className="mt-1 text-sm font-extrabold text-white/85 truncate">
                      {authed ? (me?.handle ? `@${me.handle}` : "—") : "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] text-white/55 font-semibold">
                      Public ID
                    </div>
                    <div className="mt-1 text-sm font-extrabold text-white/85 truncate">
                      {authed ? safePublicId ?? "—" : "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] text-white/55 font-semibold">
                      Public link
                    </div>
                    <div className="mt-1 text-sm font-extrabold text-white/85 truncate">
                      {authed ? publicUrl ?? "—" : "—"}
                    </div>
                  </div>
                </div>

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
                  One profile. Connect X first, then link Discord to the same
                  profile.
                </div>
              </div>
            </div>
          </Card>

          {/* Providers */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* X */}
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
                  <Skeleton className="h-14 w-14 rounded-2xl" />
                ) : (
                  <Avatar src={xImage} fallback="X" />
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

            {/* Discord */}
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
                  <Skeleton className="h-14 w-14 rounded-2xl" />
                ) : (
                  <Avatar src={dImage} fallback="DS" />
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
                    Connect X first, then you can link Discord to the same
                    profile.
                  </div>
                ) : null}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
