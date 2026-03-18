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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;

  if (!id?.trim()) {
    return NextResponse.json(
      { ok: false, error: "MISSING_USER_ID" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: id.trim() },
      select: {
        id: true,
        handle: true,
        publicId: true,
        walletAddress: true,
        approvedPhysicalSeller: true,
        approvedPhysicalAt: true,
        approvedPhysicalNote: true,
      },
    });

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

  if (!id?.trim()) {
    return NextResponse.json(
      { ok: false, error: "MISSING_USER_ID" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const note = cleanNote((body as any)?.note);

  try {
    const user = await prisma.user.update({
      where: { id: id.trim() },
      data: {
        approvedPhysicalSeller: true,
        approvedPhysicalAt: new Date(),
        approvedPhysicalNote: note || null,
      },
      select: {
        id: true,
        handle: true,
        publicId: true,
        walletAddress: true,
        approvedPhysicalSeller: true,
        approvedPhysicalAt: true,
        approvedPhysicalNote: true,
      },
    });

    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

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

  if (!id?.trim()) {
    return NextResponse.json(
      { ok: false, error: "MISSING_USER_ID" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id: id.trim() },
      data: {
        approvedPhysicalSeller: false,
        approvedPhysicalAt: null,
        approvedPhysicalNote: null,
      },
      select: {
        id: true,
        handle: true,
        publicId: true,
        walletAddress: true,
        approvedPhysicalSeller: true,
        approvedPhysicalAt: true,
        approvedPhysicalNote: true,
      },
    });

    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

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

  if (!id?.trim()) {
    return NextResponse.json(
      { ok: false, error: "MISSING_USER_ID" },
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

  const nextApproved = hasApproved
    ? toBool((body as any).approvedPhysicalSeller)
    : undefined;

  const nextNote = hasNote
    ? cleanNote((body as any).note)
    : undefined;

  try {
    const existing = await prisma.user.findUnique({
      where: { id: id.trim() },
      select: {
        id: true,
        approvedPhysicalSeller: true,
        approvedPhysicalAt: true,
        approvedPhysicalNote: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const data: any = {};

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
      where: { id: id.trim() },
      data,
      select: {
        id: true,
        handle: true,
        publicId: true,
        walletAddress: true,
        approvedPhysicalSeller: true,
        approvedPhysicalAt: true,
        approvedPhysicalNote: true,
      },
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