"use client";

import AppShell from "@/components/AppShell";
import { signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  walletAddress?: string | null;
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

function shortAddr(addr?: string | null) {
  if (!addr) return "—";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
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
        "relative overflow-hidden rounded-[34px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.22),rgba(212,175,55,0.10),rgba(184,135,10,0.08))]",
        "shadow-[0_24px_90px_rgba(0,0,0,0.55)]",
        className
      )}
    >
      <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#0b0a09]/55 backdrop-blur-2xl ring-1 ring-black/10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_0%,rgba(212,175,55,0.12),transparent_45%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_120%,rgba(255,255,255,0.06),transparent_55%)]" />
          <div className="absolute inset-0 opacity-[0.06] [mask-image:radial-gradient(circle_at_40%_30%,black,transparent_70%)] bg-[linear-gradient(to_right,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[length:64px_64px]" />
        </div>
        <div className="relative z-10 p-6 md:p-7">{children}</div>
      </div>
    </div>
  );
}

function Pill({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold",
        ok
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
          : "border-white/10 bg-white/[0.06] text-white/60"
      )}
    >
      <span className={cx("h-1.5 w-1.5 rounded-full", ok ? "bg-emerald-400" : "bg-white/25")} />
      {text}
    </span>
  );
}

function Button({
  children,
  onClick,
  disabled,
  tone = "gold",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "gold" | "ghost" | "danger";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold " +
    "transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/25 disabled:opacity-60";

  const cls =
    tone === "gold"
      ? "text-black bg-[linear-gradient(135deg,#f7e7a7_0%,#d4af37_45%,#b8870a_100%)] shadow-[0_18px_60px_rgba(212,175,55,0.18)] ring-1 ring-black/15 hover:brightness-110"
      : tone === "danger"
      ? "text-red-50 border border-red-500/20 bg-red-500/10 hover:bg-red-500/14"
      : "text-white/85 border border-white/10 bg-white/[0.06] hover:bg-white/[0.10]";

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cx(base, cls, className)}>
      {children}
    </button>
  );
}

function Avatar({
  src,
  fallback,
  size = "lg",
}: {
  src?: string | null;
  fallback: string;
  size?: "sm" | "md" | "lg";
}) {
  const s = size === "sm" ? "h-10 w-10" : size === "md" ? "h-14 w-14" : "h-16 w-16";

  return (
    <div
      className={cx(
        s,
        "rounded-2xl border border-white/10 bg-white/[0.06] overflow-hidden flex items-center justify-center",
        "shadow-[0_18px_70px_rgba(0,0,0,0.30)] ring-1 ring-black/15"
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

function KV({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-[11px] text-white/55 font-semibold">{label}</div>
      <div className={cx("mt-1 text-sm font-extrabold text-white/85 truncate", mono ? "font-mono text-[13px]" : "")}>
        {value}
      </div>
    </div>
  );
}

/* -------------------------------- Page ----------------------------------- */

export default function ProfilePage() {
  const mounted = useMounted();

  // live wallet (client)
  const { address: liveAddress, isConnected: walletIsConnected } = useAccount();
  const chainId = useChainId();

  // server user (from /api/me)
  const [me, setMe] = useState<MeUser | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"" | "x" | "discord" | "logout" | "refresh">("");

  const loadMe = useCallback(async () => {
    setBusy("refresh");
    try {
      const r = await fetch("/api/me", { cache: "no-store" });
      const j = (await r.json()) as MeResponse;
      if (!r.ok || !j?.ok) {
        setMe(null);
        setLinkError(null);
        return;
      }
      setMe(j.user ?? null);
      setLinkError(j.linkError ?? null);
    } finally {
      setBusy("");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const serverWalletAddress = me?.walletAddress ?? null;

  // ✅ TS-safe mismatch check (как ты написал)
  const walletMismatch = useMemo(() => {
    const a = liveAddress?.toLowerCase();
    const b = serverWalletAddress?.toLowerCase();
    return Boolean(a && b && a !== b);
  }, [liveAddress, serverWalletAddress]);

  const authed = Boolean(me?.id);

  const displayName = me?.displayName || "Realife user";
  const heroAvatar = me?.mainAvatar || null;

  const twitterConnected = Boolean(me?.twitterId);
  const discordConnected = Boolean(me?.discordId);
  const walletVerified = Boolean(me?.walletAddress);

  const publicUrl = me?.publicUrl || null;

  const errorText =
    linkError === "DISCORD_ALREADY_LINKED"
      ? "This Discord is already linked to another profile."
      : linkError === "DISCORD_LINK_REQUIRES_X_LOGIN"
      ? "Old rule triggered. Should not happen now — refresh page."
      : linkError
      ? "Something went wrong. Try again."
      : null;

  const connectX = useCallback(async () => {
    setBusy("x");
    try {
      await signIn("twitter", { callbackUrl: "/app/profile" });
    } finally {
      setBusy("");
    }
  }, []);

  const connectDiscord = useCallback(async () => {
    setBusy("discord");
    try {
      await signIn("discord", { callbackUrl: "/app/profile" });
    } finally {
      setBusy("");
    }
  }, []);

  const logoutServer = useCallback(async () => {
    setBusy("logout");
    try {
      await signOut({ redirect: false });
      await loadMe();
    } finally {
      setBusy("");
    }
  }, [loadMe]);

  return (
    <AppShell title="REALIFE" subtitle="Profile • Identity • Wallet">
      <main className="min-h-screen bg-[#060505] text-white overflow-x-hidden">
        {/* Ambient */}
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

        <div className="relative mx-auto max-w-5xl px-6 py-10 space-y-6">
          {/* HERO */}
          <Card>
            <div className="flex items-center gap-5">
              <Avatar src={heroAvatar} fallback="RL" size="lg" />

              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white/60">Unified profile</div>

                <div className="mt-1 text-3xl md:text-4xl font-black tracking-tight truncate">
                  {loading ? "Loading…" : displayName}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <Pill ok={walletVerified} text={walletVerified ? "Wallet verified (server)" : "Wallet not verified"} />
                  <Pill ok={twitterConnected} text={twitterConnected ? "X connected" : "X not connected"} />
                  <Pill ok={discordConnected} text={discordConnected ? "Discord connected" : "Discord not connected"} />
                  {walletMismatch ? <Pill ok={false} text="Wallet mismatch (client ≠ server)" /> : null}
                </div>

                {errorText ? (
                  <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-50">
                    {errorText}
                  </div>
                ) : null}

                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KV label="Points" value={me?.points ?? 0} />
                  <KV label="Wallet (connected)" value={mounted && walletIsConnected ? shortAddr(liveAddress ?? null) : "—"} mono />
                  <KV label="Wallet (server)" value={serverWalletAddress ? shortAddr(serverWalletAddress) : "—"} mono />
                  <KV label="Public link" value={publicUrl ?? "—"} mono />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button tone="ghost" onClick={loadMe} disabled={busy !== ""}>
                    {busy === "refresh" ? "Refreshing…" : "Refresh"}
                  </Button>

                  <Button tone="danger" onClick={logoutServer} disabled={busy !== "" || !authed}>
                    Log out (server)
                  </Button>

                  {publicUrl ? (
                    <Link href={publicUrl} className={cx(
                      "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold",
                      "text-white/85 border border-white/10 bg-white/[0.06] hover:bg-white/[0.10] transition"
                    )}>
                      Open public profile →
                    </Link>
                  ) : null}
                </div>

                <div className="mt-3 text-[12px] text-white/45">
                  Tip: wallet verification happens in the top bar (signature once). This page reads everything from{" "}
                  <span className="font-mono text-white/60">/api/me</span>.
                </div>
              </div>
            </div>
          </Card>

          {/* X + Discord blocks */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-extrabold">X</div>
                  <div className="text-xs text-white/60 mt-1">Name • @username • avatar</div>
                </div>

                {twitterConnected ? (
                  <Pill ok text="Connected" />
                ) : (
                  <Button onClick={connectX} disabled={busy !== "" || !walletVerified}>
                    {busy === "x" ? "Connecting…" : "Connect"}
                  </Button>
                )}
              </div>

              <div className="mt-5 flex items-center gap-4">
                <Avatar src={me?.twitterImage ?? null} fallback="X" size="md" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold truncate">{me?.twitterName || "—"}</div>
                  <div className="text-xs text-white/60 truncate">
                    {me?.twitterUser ? `@${me.twitterUser}` : "—"}
                  </div>
                </div>
              </div>

              {!walletVerified ? (
                <div className="mt-4 text-xs text-white/55">
                  Connect wallet and sign once in the top bar first.
                </div>
              ) : null}
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-extrabold">Discord</div>
                  <div className="text-xs text-white/60 mt-1">Display • username • avatar</div>
                </div>

                {discordConnected ? (
                  <Pill ok text="Connected" />
                ) : (
                  <Button onClick={connectDiscord} disabled={busy !== "" || !walletVerified}>
                    {busy === "discord" ? "Connecting…" : "Connect"}
                  </Button>
                )}
              </div>

              <div className="mt-5 flex items-center gap-4">
                <Avatar src={me?.discordImage ?? null} fallback="DS" size="md" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold truncate">{me?.discordName || "—"}</div>
                  <div className="text-xs text-white/60 truncate">{me?.discordUser || "—"}</div>
                </div>
              </div>

              {!walletVerified ? (
                <div className="mt-4 text-xs text-white/55">
                  Connect wallet and sign once in the top bar first.
                </div>
              ) : null}
            </Card>
          </div>

          <div className="text-[11px] text-white/40 text-center">
            Your public profile link:{" "}
            <span className="font-mono text-white/60">{publicUrl ?? "—"}</span>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
