import Link from "next/link";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AdminEscrowGateClient from "./AdminEscrowGateClient";
import ProtectedEscrowAdminClient from "./ProtectedEscrowAdminClient";
import {
  ADMIN_ESCROW_COOKIE_NAME,
  verifyAdminEscrowToken,
} from "@/lib/adminEscrowGate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SupportRoleValue = "USER" | "MODERATOR" | "ADMIN";

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function getBootstrapAdminWallets() {
  return (process.env.ADMIN_CREATE_WALLETS || process.env.ADMIN_WALLETS || "")
    .split(",")
    .map((x) => normAddr(x))
    .filter(Boolean);
}

async function getActor() {
  const session = await getServerSession(authOptions);

  const userId =
    (session as any)?.user?.id ||
    (session as any)?.userId ||
    null;

  const walletAddress = normAddr(
    (session as any)?.user?.walletAddress ||
      (session as any)?.walletAddress ||
      ""
  );

  return { userId, walletAddress };
}

async function getActorSupportRole(actor: {
  userId: string | null;
  walletAddress: string;
}): Promise<SupportRoleValue | null> {
  if (actor.userId) {
    const user = await prisma.user.findUnique({
      where: { id: actor.userId },
      select: { supportRole: true },
    });
    return (user?.supportRole as SupportRoleValue | undefined) || null;
  }

  if (actor.walletAddress) {
    const user = await prisma.user.findFirst({
      where: {
        walletAddress: {
          equals: actor.walletAddress,
          mode: "insensitive",
        },
      },
      select: { supportRole: true },
    });
    return (user?.supportRole as SupportRoleValue | undefined) || null;
  }

  return null;
}

async function getEscrowPanelRole(actor: {
  userId: string | null;
  walletAddress: string;
}): Promise<"MODERATOR" | "ADMIN" | null> {
  if (
    actor.walletAddress &&
    getBootstrapAdminWallets().includes(actor.walletAddress)
  ) {
    return "ADMIN";
  }

  const actorRole = await getActorSupportRole(actor);
  if (actorRole === "ADMIN") return "ADMIN";
  if (actorRole === "MODERATOR") return "MODERATOR";
  return null;
}

function tokenMatchesActor(
  token: {
    sub: string | null;
    wallet: string | null;
    role: "MODERATOR" | "ADMIN";
    exp: number;
  } | null,
  actor: { userId: string | null; walletAddress: string }
) {
  if (!token) return false;

  if (token.sub && actor.userId && token.sub === actor.userId) return true;
  if (
    token.wallet &&
    actor.walletAddress &&
    token.wallet === actor.walletAddress
  ) {
    return true;
  }

  return false;
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 backdrop-blur-2xl">
      {children}
    </div>
  );
}

function GoldEdgeWrap({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-[34px] p-px",
        "bg-[linear-gradient(135deg,rgba(247,231,167,0.35),rgba(212,175,55,0.16),rgba(184,135,10,0.10))]",
        "shadow-[0_34px_130px_rgba(0,0,0,0.60)]",
        className
      )}
    >
      <div
        className={cx(
          "relative overflow-hidden rounded-[34px]",
          "border border-white/10 bg-[#0b0a09]/60 backdrop-blur-2xl",
          "ring-1 ring-black/10",
          "before:pointer-events-none before:absolute before:inset-0",
          "before:bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.12),transparent_45%)]",
          "after:pointer-events-none after:absolute after:inset-0",
          "after:bg-[radial-gradient(circle_at_85%_115%,rgba(255,255,255,0.06),transparent_55%)]"
        )}
      >
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

function ActionCard({
  title,
  text,
  href,
  tone = "default",
}: {
  title: string;
  text: string;
  href?: string;
  tone?: "default" | "danger" | "gold";
}) {
  const body = (
    <div
      className={cx(
        "rounded-[26px] border p-5 transition",
        tone === "danger"
          ? "border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/15"
          : tone === "gold"
          ? "border-[#d4af37]/25 bg-[#d4af37]/10 hover:bg-[#d4af37]/14"
          : "border-white/10 bg-white/[0.04] hover:border-[#d4af37]/30 hover:bg-white/[0.06]"
      )}
    >
      <div className="text-base font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-white/65">{text}</div>
      {href ? (
        <div className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#d4af37]">
          Open
        </div>
      ) : null}
    </div>
  );

  if (!href) return body;
  return <Link href={href}>{body}</Link>;
}

export default async function ProtectedEscrowAdminPage() {
  const actor = await getActor();

  if (!actor.userId && !actor.walletAddress) {
    return (
      <div className="space-y-6">
        <GoldEdgeWrap>
          <div className="p-7 sm:p-8">
            <Pill>Admin Safety Center</Pill>
            <h1 className="mt-4 text-3xl font-semibold text-white">
              Admin access required
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
              Sign in to your normal Realife account first. After that, this page checks your support role and asks for the extra escrow/safety unlock.
            </p>
          </div>
        </GoldEdgeWrap>
      </div>
    );
  }

  const panelRole = await getEscrowPanelRole(actor);

  if (!panelRole) {
    return (
      <div className="space-y-6">
        <GoldEdgeWrap>
          <div className="p-7 sm:p-8">
            <Pill>Admin Safety Center</Pill>
            <h1 className="mt-4 text-3xl font-semibold text-white">
              Access denied
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
              This page is available only for users with <span className="font-semibold text-white">MODERATOR</span> or <span className="font-semibold text-white">ADMIN</span> support role, or wallets listed in server-only Railway env variables.
            </p>
          </div>
        </GoldEdgeWrap>
      </div>
    );
  }

  const cookieStore = await cookies();
  const rawToken = cookieStore.get(ADMIN_ESCROW_COOKIE_NAME)?.value || null;
  const token = verifyAdminEscrowToken(rawToken);
  const gateOpen = tokenMatchesActor(token, actor);

  if (!gateOpen) {
    return (
      <div className="space-y-6">
        <GoldEdgeWrap>
          <div className="p-7 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <Pill>Admin Safety Center</Pill>
              <Pill>{panelRole}</Pill>
            </div>

            <h1 className="mt-4 text-3xl font-semibold text-white">
              Second-step unlock required
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
              Your normal session and support role are valid. Enter the extra Railway-stored admin credentials to open escrow review and moderation tools.
            </p>
          </div>
        </GoldEdgeWrap>

        <AdminEscrowGateClient />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GoldEdgeWrap>
        <div className="p-7 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Pill>Admin Safety Center</Pill>
                <Pill>{panelRole}</Pill>
                <Pill>Unlocked</Pill>
              </div>

              <h1 className="mt-4 text-3xl font-semibold text-white">
                Realife Escrow & Safety Admin Panel
              </h1>

              <p className="mt-3 max-w-4xl text-sm leading-7 text-white/70">
                Review open NFT orders, escrow disputes, buyer/seller messages, shipping and service evidence. Admins can also remove fake, prohibited, empty or unsafe listings from the marketplace and keep an audit trail.
              </p>
            </div>

            <form action="/api/admin/escrow-auth/logout" method="post">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                Lock panel
              </button>
            </form>
          </div>
        </div>
      </GoldEdgeWrap>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard
          title="Open orders"
          text="See active purchases, buyer/seller wallets, NFT details, delivery/service status, tx hashes and order room messages."
          tone="gold"
        />
        <ActionCard
          title="Marketplace safety"
          text="Remove unsafe listings, disable fake/empty NFTs, and keep moderation reasons attached to each action."
          tone="danger"
        />
        <ActionCard
          title="Order room"
          text="Support can read public messages and internal notes. The admin panel can add internal support notes directly."
          href="/app/orders"
        />
        <ActionCard
          title="Server-only admins"
          text="Use ADMIN_WALLETS / ADMIN_CREATE_WALLETS in Railway. Do not expose admin wallets through NEXT_PUBLIC envs."
        />
      </div>

      <ProtectedEscrowAdminClient />
    </div>
  );
}
