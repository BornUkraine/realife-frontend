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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] p-px bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))] shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0a09]/55 backdrop-blur-2xl ring-1 ring-black/10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_0%,rgba(212,175,55,0.10),transparent_45%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_120%,rgba(255,255,255,0.06),transparent_55%)]" />
        </div>
        <div className="relative z-10 p-6">{children}</div>
      </div>
    </div>
  );
}

function GoldBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center gap-2",
        "w-full px-6 py-3 rounded-2xl font-extrabold text-black",
        "bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)]",
        "shadow-[0_22px_70px_rgba(212,175,55,0.18)] ring-1 ring-black/15",
        "transition hover:brightness-110 hover:-translate-y-px active:translate-y-0",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        props.className || "",
      ].join(" ")}
    />
  );
}

function GhostBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center gap-2",
        "w-full px-6 py-3 rounded-2xl font-extrabold text-white",
        "border border-white/15 bg-white/[0.06] backdrop-blur-2xl",
        "shadow-[0_18px_70px_rgba(0,0,0,0.28)]",
        "transition hover:bg-white/10 hover:-translate-y-px active:translate-y-0",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        props.className || "",
      ].join(" ")}
    />
  );
}

function TinyBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center gap-2",
        "px-3 py-2 rounded-xl text-[12px] font-extrabold text-white",
        "border border-white/15 bg-white/[0.06] backdrop-blur-2xl",
        "transition hover:bg-white/10 active:translate-y-[1px]",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        props.className || "",
      ].join(" ")}
    />
  );
}

function StatusPill({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div
      className={[
        "text-[11px] font-semibold px-3 py-1.5 rounded-full border",
        ok
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
          : "border-white/10 bg-white/[0.06] text-white/60",
      ].join(" ")}
    >
      {text}
    </div>
  );
}

function Alert({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
      {text}
    </div>
  );
}

function Avatar({ src, fallback }: { src?: string | null; fallback: string }) {
  return (
    <div className="h-14 w-14 rounded-2xl border border-white/10 bg-white/[0.06] overflow-hidden flex items-center justify-center">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={fallback} className="h-full w-full object-cover" />
      ) : (
        <span className="text-white/40 text-xs font-bold">{fallback}</span>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { status } = useSession();
  const authed = status === "authenticated";

  const [me, setMe] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(false);

  const [dailyBusy, setDailyBusy] = useState(false);
  const [connectBusy, setConnectBusy] = useState<"" | "twitter" | "discord">("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const busyGuardRef = useRef(false);

  const twitterConnected = Boolean(me?.twitterId);
  const discordConnected = Boolean(me?.discordId);

  const displayName = useMemo(() => {
    return (
      me?.twitterName ||
      me?.twitterUser ||
      me?.discordName ||
      me?.discordUser ||
      "Realife user"
    );
  }, [me]);

  const publicUrl = useMemo(() => {
    if (!me) return null;
    return (
      me.publicUrl ||
      (me.handle ? `/u/${me.handle}` : me.publicId ? `/u/${me.publicId}` : null)
    );
  }, [me]);

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

      setMe(json?.user ?? null);
      setLinkError(json?.linkError ?? null);

      // если вернулись с OAuth — сбросим busy
      setConnectBusy("");
      busyGuardRef.current = false;
    } catch {
      // не падаем
    } finally {
      setLoading(false);
    }
  }

  // status -> reload
  useEffect(() => {
    if (status === "authenticated") loadMe();
    else {
      setMe(null);
      setLinkError(null);
      setConnectBusy("");
      busyGuardRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // после OAuth возврата: когда вкладка снова активна/в фокусе
  useEffect(() => {
    if (!authed) return;

    const onFocus = () => loadMe();
    window.addEventListener("focus", onFocus);

    // иногда next-auth возвращает на ту же страницу без полного обновления
    // поэтому сразу сбрасываем busy на монтировании
    setConnectBusy("");
    busyGuardRef.current = false;

    return () => window.removeEventListener("focus", onFocus);
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
    // анти-спам: 1 клик = 1 действие
    if (busyGuardRef.current) return;
    if (!authed && provider === "discord") {
      // Discord только линк, логин идёт через X
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

    // signIn обычно редиректит и не возвращается
    // но если вдруг вернулось — отпустим guard через таймер
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
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.10),transparent_55%)]" />
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
          {errorText ? <Alert text={errorText} /> : null}

          <Card>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white/60">Profile</div>

                <div className="mt-2 text-3xl md:text-4xl font-black tracking-tight truncate">
                  {authed ? displayName : "Not logged in"}
                </div>

                <div className="mt-2 text-sm text-white/65">
                  Points:{" "}
                  <span className="font-extrabold text-transparent bg-clip-text bg-[linear-gradient(135deg,#f7e7a7,#d4af37,#b8870a)]">
                    {authed ? me?.points ?? 0 : 0}
                  </span>
                  {loading ? (
                    <span className="ml-2 text-white/45">loading…</span>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusPill
                    ok={twitterConnected}
                    text={twitterConnected ? "X connected" : "X not connected"}
                  />
                  <StatusPill
                    ok={discordConnected}
                    text={discordConnected ? "Discord connected" : "Discord not connected"}
                  />
                </div>

                {authed ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <div className="text-[12px] font-semibold px-3 py-2 rounded-xl border border-white/10 bg-white/[0.06] text-white/70">
                      {me?.handle ? `@${me.handle}` : "no handle"}
                    </div>

                    <div className="text-[12px] font-semibold px-3 py-2 rounded-xl border border-white/10 bg-white/[0.06] text-white/70">
                      {me?.publicId ? me.publicId : "no publicId"}
                    </div>

                    {publicUrl ? (
                      <div className="flex items-center gap-2">
                        <TinyBtn onClick={copyPublicLink} disabled={!publicFullUrl}>
                          {copied ? "Copied" : "Copy link"}
                        </TinyBtn>
                        <a
                          href={publicUrl}
                          className="text-[12px] font-extrabold px-3 py-2 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/10"
                        >
                          Open
                        </a>
                      </div>
                    ) : (
                      <div className="text-[11px] text-white/45">
                        Public link will appear after publicId is set.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="w-full md:w-[360px] space-y-3">
                {!authed ? (
                  <GoldBtn
                    onClick={() => connect("twitter")}
                    disabled={connectBusy !== ""}
                  >
                    {connectBusy === "twitter" ? "Opening X…" : "Login with X"}
                  </GoldBtn>
                ) : (
                  <GhostBtn onClick={() => signOut({ callbackUrl: "/app/profile" })}>
                    Logout
                  </GhostBtn>
                )}

                <GhostBtn disabled={!authed || dailyBusy} onClick={claimDaily}>
                  {dailyBusy ? "Claiming…" : "Daily check-in (+10)"}
                </GhostBtn>

                <TinyBtn
                  onClick={loadMe}
                  disabled={!authed || loading}
                  className="w-full"
                >
                  {loading ? "Refreshing…" : "Refresh profile"}
                </TinyBtn>
              </div>
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* X */}
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-extrabold">X account</div>
                  <div className="text-xs text-white/60 mt-1">
                    Name + username + avatar.
                  </div>
                </div>
                <StatusPill
                  ok={twitterConnected}
                  text={twitterConnected ? "Connected" : "Not connected"}
                />
              </div>

              <div className="mt-4 flex items-center gap-4">
                <Avatar src={me?.twitterImage} fallback="X" />
                <div className="min-w-0">
                  <div className="text-sm font-extrabold truncate">
                    {me?.twitterName || "—"}
                  </div>
                  <div className="text-xs text-white/60 truncate">
                    @{me?.twitterUser || "—"}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <GoldBtn disabled={!connectAllowed} onClick={() => connect("twitter")}>
                  {connectBusy === "twitter"
                    ? "Opening X…"
                    : twitterConnected
                      ? "Re-connect X"
                      : "Connect X (+100)"}
                </GoldBtn>
              </div>
            </Card>

            {/* Discord */}
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-extrabold">Discord account</div>
                  <div className="text-xs text-white/60 mt-1">
                    Links to the same profile.
                  </div>
                </div>
                <StatusPill
                  ok={discordConnected}
                  text={discordConnected ? "Connected" : "Not connected"}
                />
              </div>

              <div className="mt-4 flex items-center gap-4">
                <Avatar src={me?.discordImage} fallback="DS" />
                <div className="min-w-0">
                  <div className="text-sm font-extrabold truncate">
                    {me?.discordName || "—"}
                  </div>
                  <div className="text-xs text-white/60 truncate">
                    {me?.discordUser || "—"}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <GoldBtn
                  disabled={!canConnectDiscord}
                  onClick={() => connect("discord")}
                >
                  {connectBusy === "discord"
                    ? "Opening Discord…"
                    : discordConnected
                      ? "Re-connect Discord"
                      : "Connect Discord (+100)"}
                </GoldBtn>

                {!twitterConnected ? (
                  <div className="mt-2 text-[11px] text-white/45">
                    Connect X first, then you can link Discord to the same profile.
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
