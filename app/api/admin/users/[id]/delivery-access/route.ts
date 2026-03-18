import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function toBool(v: unknown) {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function cleanNote(v: unknown, max = 500) {
  return String(v || "").trim().slice(0, max);
}

function norm(v: unknown) {
  return String(v || "").trim();
}

function normAddr(v: unknown) {
  return String(v || "").trim().toLowerCase();
}

function isAddressLike(v: unknown) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(v || "").trim());
}

const userSelect = {
  id: true,
  handle: true,
  publicId: true,
  walletAddress: true,
  approvedPhysicalSeller: true,
  approvedPhysicalAt: true,
  approvedPhysicalNote: true,
} as const;

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  const isAdmin = Boolean(
    (session as any)?.user?.isAdmin ||
      (session as any)?.isAdmin
  );

  if (!isAdmin) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true as const,
    session,
  };
}

async function findUserByLookup(rawLookup: string) {
  const lookup = norm(rawLookup);
  if (!lookup) return null;

  const byId = await prisma.user.findUnique({
    where: { id: lookup },
    select: userSelect,
  });
  if (byId) return byId;

  const byPublicId = await prisma.user.findFirst({
    where: {
      publicId: {
        equals: lookup,
        mode: "insensitive",
      },
    },
    select: userSelect,
  });
  if (byPublicId) return byPublicId;

  const byHandle = await prisma.user.findFirst({
    where: {
      handle: {
        equals: lookup,
        mode: "insensitive",
      },
    },
    select: userSelect,
  });
  if (byHandle) return byHandle;

  if (isAddressLike(lookup)) {
    const wallet = normAddr(lookup);

    const byWallet = await prisma.user.findFirst({
      where: {
        walletAddress: {
          equals: wallet,
          mode: "insensitive",
        },
      },
      select: userSelect,
    });

    if (byWallet) return byWallet;
  }

  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  const lookup = norm(id);

  if (!lookup) {
    return NextResponse.json(
      { ok: false, error: "MISSING_USER_LOOKUP" },
      { status: 400 }
    );
  }

  try {
    const user = await findUserByLookup(lookup);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (e) {
    console.error("[ADMIN_DELIVERY_ACCESS_GET_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  const lookup = norm(id);

  if (!lookup) {
    return NextResponse.json(
      { ok: false, error: "MISSING_USER_LOOKUP" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const note = cleanNote((body as any)?.note);

  try {
    const existing = await findUserByLookup(lookup);

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        approvedPhysicalSeller: true,
        approvedPhysicalAt: existing.approvedPhysicalAt || new Date(),
        approvedPhysicalNote: note || null,
      },
      select: userSelect,
    });

    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (e) {
    console.error("[ADMIN_DELIVERY_ACCESS_POST_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  const lookup = norm(id);

  if (!lookup) {
    return NextResponse.json(
      { ok: false, error: "MISSING_USER_LOOKUP" },
      { status: 400 }
    );
  }

  try {
    const existing = await findUserByLookup(lookup);

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        approvedPhysicalSeller: false,
        approvedPhysicalAt: null,
        approvedPhysicalNote: null,
      },
      select: userSelect,
    });

    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (e) {
    console.error("[ADMIN_DELIVERY_ACCESS_DELETE_ERROR]", e);
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
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  const lookup = norm(id);

  if (!lookup) {
    return NextResponse.json(
      { ok: false, error: "MISSING_USER_LOOKUP" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "BAD_JSON" },
      { status: 400 }
    );
  }

  const hasApproved = Object.prototype.hasOwnProperty.call(
    body,
    "approvedPhysicalSeller"
  );
  const hasNote = Object.prototype.hasOwnProperty.call(body, "note");

  if (!hasApproved && !hasNote) {
    return NextResponse.json(
      { ok: false, error: "NOTHING_TO_UPDATE" },
      { status: 400 }
    );
  }

  const nextApproved = hasApproved
    ? toBool((body as any).approvedPhysicalSeller)
    : undefined;

  const nextNote = hasNote
    ? cleanNote((body as any).note)
    : undefined;

  try {
    const existing = await findUserByLookup(lookup);

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const data: {
      approvedPhysicalSeller?: boolean;
      approvedPhysicalAt?: Date | null;
      approvedPhysicalNote?: string | null;
    } = {};

    if (hasApproved) {
      data.approvedPhysicalSeller = nextApproved;

      if (nextApproved) {
        data.approvedPhysicalAt = existing.approvedPhysicalAt || new Date();
      } else {
        data.approvedPhysicalAt = null;
      }
    }

    if (hasNote) {
      data.approvedPhysicalNote = nextNote || null;
    }

    const user = await prisma.user.update({
      where: { id: existing.id },
      data,
      select: userSelect,
    });

    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (e) {
    console.error("[ADMIN_DELIVERY_ACCESS_PATCH_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}