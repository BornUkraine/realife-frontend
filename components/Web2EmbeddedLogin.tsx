"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  useWeb3Auth,
  useWeb3AuthConnect,
  useWeb3AuthDisconnect,
  useWeb3AuthUser,
} from "@web3auth/modal/react";
import { AUTH_CONNECTION, WALLET_CONNECTORS } from "@web3auth/modal";
import { cn } from "@/lib/utils";
import { Sparkles, User, LogOut, ChevronDown } from "lucide-react";

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
};

function shortAddr(addr?: string | null) {
  if (!addr) return "";
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function normalizeAddress(addr: unknown) {
  const s = String(addr || "").trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(s) ? s : null;
}

function parseChainId(v: unknown) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (s.startsWith("0x")) {
    const n = Number.parseInt(s, 16);
    return Number.isFinite(n) ? String(n) : "";
  }
  const n = Number(s);
  return Number.isFinite(n) ? String(n) : "";
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForEmbeddedProvider(
  firstProvider: Eip1193Provider | null,
  getCurrentProvider: () => Eip1193Provider | null,
  timeoutMs = 4500
) {
  if (firstProvider) return firstProvider;

  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const current = getCurrentProvider();
    if (current) return current;
    await sleep(250);
  }

  return null;
}

async function getProviderAddress(provider: Eip1193Provider) {
  const accountsRaw = (await provider.request({ method: "eth_accounts" }).catch(() => null)) as unknown;
  const accounts = Array.isArray(accountsRaw) ? accountsRaw : [];
  const first = normalizeAddress(accounts[0]);
  if (first) return first;

  const requestedRaw = (await provider.request({ method: "eth_requestAccounts" }).catch(() => null)) as unknown;
  const requested = Array.isArray(requestedRaw) ? requestedRaw : [];
  return normalizeAddress(requested[0]);
}

function providerLabel(v?: string | null) {
  if (v === "WEB3AUTH") return "Web3Auth";
  if (v === "OPENFORT") return "Openfort";
  return "Embedded";
}

function Web2EmbeddedLoginInner({ compact = false }: { compact?: boolean }) {
  const { data: session, status } = useSession();

  const { provider } = useWeb3Auth();
  const { connectTo, loading: connectLoading, error: connectError } = useWeb3AuthConnect();
  const { disconnect, loading: disconnectLoading } = useWeb3AuthDisconnect();
  const { userInfo, getUserInfo } = useWeb3AuthUser();

  const providerRef = useRef<Eip1193Provider | null>(null);

  useEffect(() => {
    providerRef.current = (provider as Eip1193Provider | null) || null;
  }, [provider]);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const walletKind = String((session as any)?.user?.walletKind || "").toUpperCase();
  const isEmbeddedSession = status === "authenticated" && walletKind === "EMBEDDED";
  const sessionWallet = ((session as any)?.user?.walletAddress as string | undefined) || null;
  const embeddedProvider = ((session as any)?.user?.embeddedWalletProvider as string | undefined) || null;

  const title = useMemo(() => {
    if (isEmbeddedSession && sessionWallet) return shortAddr(sessionWallet);
    return compact ? "Google" : "Continue with Google";
  }, [compact, isEmbeddedSession, sessionWallet]);

  const verifyEmbeddedWallet = useCallback(
    async (rawProvider: Eip1193Provider) => {
      const address = await getProviderAddress(rawProvider);
      if (!address) throw new Error("Embedded wallet address was not returned.");

      const chainIdRaw = await rawProvider.request({ method: "eth_chainId" }).catch(() => null);
      const chainId = parseChainId(chainIdRaw);

      const nonceRes = await fetch(`/api/auth/wallet/nonce?address=${encodeURIComponent(address)}`, {
        cache: "no-store",
      });
      const nonceJson = await nonceRes.json().catch(() => null);

      if (!nonceRes.ok || !nonceJson?.message) {
        throw new Error("Could not create Realife wallet nonce.");
      }

      const signature = await rawProvider.request({
        method: "personal_sign",
        params: [nonceJson.message, address],
      });

      const freshInfo = (await getUserInfo().catch(() => null)) || userInfo || null;
      const info: any = freshInfo || {};

      const res = await signIn("wallet", {
        redirect: false,
        address,
        signature: String(signature || ""),
        chainId,
        walletKind: "EMBEDDED",
        embeddedWalletProvider: "WEB3AUTH",
        googleId: info?.verifierId || info?.aggregateVerifier || info?.id || "",
        googleEmail: info?.email || "",
        googleName: info?.name || info?.displayName || "",
        googleImage: info?.profileImage || info?.profileImageUrl || "",
      });

      if (res?.error) throw new Error(res.error);
      return address;
    },
    [getUserInfo, userInfo]
  );

  const onGoogle = useCallback(async () => {
    if (busy || connectLoading) return;

    setErr("");
    setBusy(true);

    try {
      const p = (await connectTo(WALLET_CONNECTORS.AUTH, {
        authConnection: AUTH_CONNECTION.GOOGLE,
      })) as Eip1193Provider | null;

      const activeProvider = await waitForEmbeddedProvider(p, () => providerRef.current);

      if (!activeProvider) {
        throw new Error(
          "Embedded wallet is connected, but provider is not ready yet. Please try again in a few seconds."
        );
      }

      await verifyEmbeddedWallet(activeProvider);
      setOpen(false);
    } catch (e: any) {
      setErr(e?.message || "Google embedded wallet login failed.");
    } finally {
      setBusy(false);
    }
  }, [busy, connectLoading, connectTo, verifyEmbeddedWallet]);

  const onLogout = useCallback(async () => {
    setErr("");
    setBusy(true);
    try {
      await disconnect({ cleanup: false }).catch(() => {});
      await signOut({ redirect: false });
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }, [disconnect]);

  if (isEmbeddedSession) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "relative h-9 rounded-xl p-px overflow-hidden",
            "bg-[linear-gradient(135deg,rgba(247,231,167,0.36),rgba(201,168,76,0.16),rgba(184,135,10,0.10))]",
            "shadow-[0_10px_40px_rgba(0,0,0,0.28)]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/40"
          )}
          aria-expanded={open}
          aria-label="Realife Web2 account"
        >
          <span
            className={cn(
              "relative h-full rounded-xl border border-white/[0.08] bg-[#0a0806]/72 backdrop-blur-2xl",
              "px-3 flex items-center gap-2 transition duration-150 hover:bg-[#0a0806]/85"
            )}
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/10 text-[11px] font-black text-[#E8D5A0]">
              G
            </span>
            <span className="whitespace-nowrap text-sm font-medium text-white">{title}</span>
            {!compact && (
              <span className="hidden lg:inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                {providerLabel(embeddedProvider)}
              </span>
            )}
            <ChevronDown className={cn("h-3.5 w-3.5 text-white/45 transition", open && "rotate-180")} />
          </span>
        </button>

        {open && (
          <div
            className={cn(
              "absolute right-0 z-50 mt-2 w-[280px] overflow-hidden rounded-[22px] p-px",
              "bg-[linear-gradient(145deg,rgba(247,231,167,0.34),rgba(201,168,76,0.14),rgba(184,135,10,0.08))]",
              "shadow-[0_24px_90px_rgba(0,0,0,0.65)]"
            )}
          >
            <div className="rounded-[22px] border border-white/[0.07] bg-[#0a0806]/94 p-2 backdrop-blur-2xl">
              <div className="px-3 py-3">
                <div className="text-sm font-bold text-white">Web2 account</div>
                <div className="mt-1 text-xs text-white/50">
                  Embedded wallet: <span className="font-mono text-white/70">{shortAddr(sessionWallet)}</span>
                </div>
              </div>

              <Link
                href="/app/profile"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-white/75 transition hover:bg-white/[0.055] hover:text-white"
              >
                <span className="inline-flex items-center gap-3">
                  <User className="h-4 w-4" />
                  Profile
                </span>
                →
              </Link>

              <button
                type="button"
                onClick={onLogout}
                disabled={busy || disconnectLoading}
                className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-red-300/75 transition hover:bg-red-500/[0.09] hover:text-red-200 disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-3">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (status === "authenticated") return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onGoogle}
        disabled={busy || connectLoading}
        className={cn(
          "inline-flex h-9 items-center justify-center gap-2 rounded-xl px-3.5",
          "border border-[#C9A84C]/20 bg-[#C9A84C]/10 backdrop-blur-xl",
          "text-sm font-bold text-[#F0E4BF] transition hover:bg-[#C9A84C]/15 hover:text-white",
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
        title="Continue with Google and create an embedded wallet"
      >
        <Sparkles className="h-4 w-4" />
        <span className={compact ? "sr-only" : "hidden sm:inline"}>
          {busy || connectLoading ? "Connecting…" : "Continue with Google"}
        </span>
        <span className={compact ? "inline sm:hidden" : "sm:hidden"}>Google</span>
      </button>

      {(err || connectError?.message) && (
        <div className="absolute right-0 z-50 mt-2 w-[280px] rounded-2xl border border-rose-400/20 bg-[#160908]/95 p-3 text-xs leading-relaxed text-rose-100 shadow-[0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          {err || connectError?.message}
        </div>
      )}
    </div>
  );
}

export default function Web2EmbeddedLogin(props: { compact?: boolean }) {
  const enabled = Boolean(process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID);
  if (!enabled) return null;
  return <Web2EmbeddedLoginInner {...props} />;
}