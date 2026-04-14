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
  return (
    process.env.ADMIN_CREATE_WALLETS ||
    process.env.ADMIN_WALLETS ||
    process.env.NEXT_PUBLIC_ADMIN_CREATE_WALLETS ||
    process.env.NEXT_PUBLIC_ADMIN_WALLETS ||
    ""
  )
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
}: {
  title: string;
  text: string;
  href?: string;
}) {
  const body = (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5 transition hover:border-[#d4af37]/30 hover:bg-white/[0.06]">
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
            <Pill>Protected escrow</Pill>
            <h1 className="mt-4 text-3xl font-semibold text-white">
              Admin access required
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
              Sign in to your normal Realife account first. After that,
              this page will check your support role and then ask for the
              extra admin escrow login and password.
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
            <Pill>Protected escrow</Pill>
            <h1 className="mt-4 text-3xl font-semibold text-white">
              Access denied
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
              This page is available only for support users with
              <span className="mx-1 font-semibold text-white"> MODERATOR </span>
              or
              <span className="mx-1 font-semibold text-white"> ADMIN </span>
              role.
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
              <Pill>Protected escrow</Pill>
              <Pill>{panelRole}</Pill>
            </div>

            <h1 className="mt-4 text-3xl font-semibold text-white">
              Second-step unlock required
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
              Your normal session and support role are valid. Enter the
              extra Railway-stored admin escrow credentials to open the
              hidden control panel.
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
                <Pill>Protected escrow</Pill>
                <Pill>{panelRole}</Pill>
                <Pill>Unlocked</Pill>
              </div>

              <h1 className="mt-4 text-3xl font-semibold text-white">
                Realife Protected Escrow Admin Panel
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/70">
                Review disputed orders, refund requests, NFT returned cases,
                and final settlement states in one place. Final protected
                escrow release or refund should still be executed only by
                wallets that hold the required on-chain contract role.
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
          title="Orders room"
          text="Jump into the buyer and seller room, read notes, evidence, shipping info, and service updates."
          href="/app/orders"
        />
        <ActionCard
          title="Support roles"
          text="Promote or demote USER, MODERATOR, and ADMIN with your support-access route."
        />
        <ActionCard
          title="Protected buckets"
          text="This panel loads disputed, refund-requested, NFT-returned, released, and refunded orders directly."
        />
        <ActionCard
          title="On-chain authority"
          text="Use a proper contract-role wallet or Safe for final protected settlement, not a raw treasury key hidden in routes."
        />
      </div>

      <ProtectedEscrowAdminClient />
    </div>
  );
}
