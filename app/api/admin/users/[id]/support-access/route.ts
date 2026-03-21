import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SupportRoleValue = "USER" | "MODERATOR" | "ADMIN";

const SUPPORT_ROLES = new Set<SupportRoleValue>([
  "USER",
  "MODERATOR",
  "ADMIN",
]);

function normAddr(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function isAddressLike(v?: string | null) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(v || "").trim());
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

async function canManageSupportRoles(actor: {
  userId: string | null;
  walletAddress: string;
}) {
  if (!actor.userId && !actor.walletAddress) return false;

  const bootstrapAdmins = getBootstrapAdminWallets();
  if (
    actor.walletAddress &&
    bootstrapAdmins.includes(normAddr(actor.walletAddress))
  ) {
    return true;
  }

  const actorRole = await getActorSupportRole(actor);
  return actorRole === "ADMIN";
}

async function resolveUserByKey(rawKey: string) {
  const key = String(rawKey || "").trim();
  if (!key) return null;

  if (isAddressLike(key)) {
    return prisma.user.findFirst({
      where: {
        walletAddress: {
          equals: normAddr(key),
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        handle: true,
        publicId: true,
        walletAddress: true,
        supportRole: true,
      },
    });
  }

  return prisma.user.findFirst({
    where: {
      OR: [
        { id: key },
        { publicId: key },
        { handle: key },
        { publicId: { equals: key, mode: "insensitive" } },
        { handle: { equals: key, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      handle: true,
      publicId: true,
      walletAddress: true,
      supportRole: true,
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await getActor();

    const allowed = await canManageSupportRoles(actor);
    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const user = await resolveUserByKey(id);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        handle: user.handle || null,
        publicId: user.publicId || null,
        walletAddress: user.walletAddress,
        supportRole: (user.supportRole || "USER") as SupportRoleValue,
      },
    });
  } catch (e) {
    console.error("[API_ADMIN_SUPPORT_ACCESS_GET_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await getActor();

    const allowed = await canManageSupportRoles(actor);
    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const nextRole = String(body?.supportRole || "").trim().toUpperCase();

    if (!SUPPORT_ROLES.has(nextRole as SupportRoleValue)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_SUPPORT_ROLE" },
        { status: 400 }
      );
    }

    const target = await resolveUserByKey(id);

    if (!target) {
      return NextResponse.json(
        { ok: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        supportRole: nextRole as SupportRoleValue,
      },
      select: {
        id: true,
        handle: true,
        publicId: true,
        walletAddress: true,
        supportRole: true,
      },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: updated.id,
        handle: updated.handle || null,
        publicId: updated.publicId || null,
        walletAddress: updated.walletAddress,
        supportRole: (updated.supportRole || "USER") as SupportRoleValue,
      },
    });
  } catch (e) {
    console.error("[API_ADMIN_SUPPORT_ACCESS_PATCH_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}