import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const CHAIN_ID = Number(process.env.CHAIN_ID || "84532");

const ADMIN_WALLETS = (
  process.env.ADMIN_CREATE_WALLETS ||
  process.env.ADMIN_WALLETS ||
  process.env.NEXT_PUBLIC_ADMIN_CREATE_WALLETS ||
  process.env.NEXT_PUBLIC_ADMIN_WALLETS ||
  ""
)
  .split(",")
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);

const deliveryAccessSelect = {
  id: true,
  handle: true,
  publicId: true,
  walletAddress: true,
  approvedPhysicalSeller: true,
  approvedPhysicalAt: true,
  approvedPhysicalNote: true,
} as const;

type DeliveryAccessUserRow = Prisma.UserGetPayload<{
  select: typeof deliveryAccessSelect;
}>;

function norm(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

function normAddr(v?: string | null) {
  return norm(v);
}

function isAddressLike(v?: string | null) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(v || "").trim());
}

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

  const sessionWallet = normAddr(
    (session as any)?.user?.walletAddress ||
      (session as any)?.walletAddress ||
      ""
  );

  const isAdminSession = Boolean(
    (session as any)?.user?.isAdmin || (session as any)?.isAdmin
  );

  const isAllowlistedWallet =
    !!sessionWallet &&
    ADMIN_WALLETS.length > 0 &&
    ADMIN_WALLETS.includes(sessionWallet);

  if (!isAdminSession && !isAllowlistedWallet) {
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

async function findUserByLookup(
  rawLookup: string
): Promise<DeliveryAccessUserRow | null> {
  const lookupTrim = String(rawLookup || "").trim();
  const lookup = norm(lookupTrim);

  if (!lookupTrim) return null;

  const orWhere: Prisma.UserWhereInput[] = [
    { id: lookupTrim },
    { publicId: { equals: lookup, mode: "insensitive" } },
    { handle: { equals: lookup, mode: "insensitive" } },
  ];

  if (isAddressLike(lookupTrim)) {
    orWhere.push({
      walletAddress: normAddr(lookupTrim),
    });
  }

  return prisma.user.findFirst({
    where: {
      OR: orWhere,
    },
    select: deliveryAccessSelect,
  });
}

function buildVirtualWalletUser(wallet: string) {
  const w = normAddr(wallet);

  return {
    id: w,
    handle: null,
    publicId: null,
    walletAddress: w,
    approvedPhysicalSeller: false,
    approvedPhysicalAt: null,
    approvedPhysicalNote: null,
    userExists: false,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  const lookupTrim = String(id || "").trim();

  if (!lookupTrim) {
    return NextResponse.json(
      { ok: false, error: "MISSING_USER_ID" },
      { status: 400 }
    );
  }

  try {
    const user = await findUserByLookup(lookupTrim);

    if (user) {
      return NextResponse.json({
        ok: true,
        user: {
          ...user,
          userExists: true,
        },
      });
    }

    if (isAddressLike(lookupTrim)) {
      return NextResponse.json({
        ok: true,
        user: buildVirtualWalletUser(lookupTrim),
      });
    }

    return NextResponse.json(
      { ok: false, error: "USER_NOT_FOUND" },
      { status: 404 }
    );
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
  const lookupTrim = String(id || "").trim();

  if (!lookupTrim) {
    return NextResponse.json(
      { ok: false, error: "MISSING_USER_ID" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const note = cleanNote((body as any)?.note);

  try {
    let user: DeliveryAccessUserRow | null = await findUserByLookup(lookupTrim);

    if (!user && isAddressLike(lookupTrim)) {
      const createdUser: DeliveryAccessUserRow = await prisma.user.create({
        data: {
          walletAddress: normAddr(lookupTrim),
          walletChainId: CHAIN_ID,
          approvedPhysicalSeller: true,
          approvedPhysicalAt: new Date(),
          approvedPhysicalNote: note || null,
        },
        select: deliveryAccessSelect,
      });

      return NextResponse.json({
        ok: true,
        user: createdUser,
      });
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        approvedPhysicalSeller: true,
        approvedPhysicalAt: new Date(),
        approvedPhysicalNote: note || null,
      },
      select: deliveryAccessSelect,
    });

    return NextResponse.json({
      ok: true,
      user: updated,
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
  const lookupTrim = String(id || "").trim();

  if (!lookupTrim) {
    return NextResponse.json(
      { ok: false, error: "MISSING_USER_ID" },
      { status: 400 }
    );
  }

  try {
    const user = await findUserByLookup(lookupTrim);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        approvedPhysicalSeller: false,
        approvedPhysicalAt: null,
        approvedPhysicalNote: null,
      },
      select: deliveryAccessSelect,
    });

    return NextResponse.json({
      ok: true,
      user: updated,
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
  const lookupTrim = String(id || "").trim();

  if (!lookupTrim) {
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

  const nextNote = hasNote ? cleanNote((body as any).note) : undefined;

  try {
    let user: DeliveryAccessUserRow | null = await findUserByLookup(lookupTrim);

    if (!user && isAddressLike(lookupTrim) && nextApproved === true) {
      const createdUser: DeliveryAccessUserRow = await prisma.user.create({
        data: {
          walletAddress: normAddr(lookupTrim),
          walletChainId: CHAIN_ID,
          approvedPhysicalSeller: true,
          approvedPhysicalAt: new Date(),
          approvedPhysicalNote: hasNote ? nextNote || null : null,
        },
        select: deliveryAccessSelect,
      });

      return NextResponse.json({
        ok: true,
        user: createdUser,
      });
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id: user.id },
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

    const data: Prisma.UserUpdateInput = {};

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

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: deliveryAccessSelect,
    });

    return NextResponse.json({
      ok: true,
      user: updated,
    });
  } catch (e) {
    console.error("[ADMIN_DELIVERY_ACCESS_PATCH_ERROR]", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500 }
    );
  }
}