import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const INSENSITIVE = "insensitive" as const;

const RESERVED = new Set([
  "admin",
  "administrator",
  "api",
  "app",
  "auth",
  "blog",
  "create",
  "dashboard",
  "discord",
  "explore",
  "faq",
  "help",
  "home",
  "login",
  "logout",
  "marketplace",
  "me",
  "mint",
  "nft",
  "nfts",
  "official",
  "orders",
  "privacy",
  "profile",
  "realife",
  "ref",
  "referral",
  "referrals",
  "settings",
  "support",
  "terms",
  "trading",
  "twitter",
  "x",
  "u",
]);

function normalizeHandle(raw: unknown) {
  const handle = String(raw || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/[-_]{2,}/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

  return handle;
}

function validateHandle(handle: string) {
  if (!handle) return "MISSING_HANDLE";
  if (handle.length < 3) return "HANDLE_TOO_SHORT";
  if (handle.length > 24) return "HANDLE_TOO_LONG";
  if (!/^[a-z0-9][a-z0-9_-]*[a-z0-9]$/.test(handle)) return "INVALID_HANDLE";
  if (handle.startsWith("rl_")) return "RESERVED_REALIFE_ID_PREFIX";
  if (/^0x[a-f0-9]{8,}$/i.test(handle)) return "WALLET_LIKE_HANDLE_NOT_ALLOWED";
  if (RESERVED.has(handle)) return "RESERVED_HANDLE";
  return null;
}

function explain(code: string) {
  switch (code) {
    case "MISSING_HANDLE":
      return "Enter a profile name.";
    case "HANDLE_TOO_SHORT":
      return "Use at least 3 characters.";
    case "HANDLE_TOO_LONG":
      return "Use 24 characters or fewer.";
    case "INVALID_HANDLE":
      return "Use lowercase letters, numbers, dash, or underscore. Start and end with a letter or number.";
    case "RESERVED_REALIFE_ID_PREFIX":
      return "Names starting with rl_ are reserved for Realife profile IDs.";
    case "WALLET_LIKE_HANDLE_NOT_ALLOWED":
      return "Wallet-like names are not allowed.";
    case "RESERVED_HANDLE":
      return "This profile name is reserved.";
    case "HANDLE_TAKEN":
      return "This profile name is already taken.";
    case "CONFLICTS_WITH_PROFILE_ID":
      return "This name conflicts with another Realife profile ID.";
    default:
      return "Could not save profile name.";
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const uid = (session as any)?.userId || (session as any)?.user?.id;

  if (!uid) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const handle = normalizeHandle(body?.handle);
  const validationError = validateHandle(handle);
  if (validationError) {
    return NextResponse.json(
      { ok: false, error: validationError, message: explain(validationError) },
      { status: 400 },
    );
  }

  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: uid },
      select: { id: true, handle: true, publicId: true },
    });

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
    }

    const takenByHandle = await prisma.user.findFirst({
      where: {
        AND: [
          { handle: { equals: handle, mode: INSENSITIVE } },
          { id: { not: uid } },
        ],
      },
      select: { id: true },
    });

    if (takenByHandle) {
      return NextResponse.json(
        { ok: false, error: "HANDLE_TAKEN", message: explain("HANDLE_TAKEN") },
        { status: 409 },
      );
    }

    const conflictsWithPublicId = await prisma.user.findFirst({
      where: {
        AND: [
          { publicId: { equals: handle, mode: INSENSITIVE } },
          { id: { not: uid } },
        ],
      },
      select: { id: true },
    });

    if (conflictsWithPublicId) {
      return NextResponse.json(
        { ok: false, error: "CONFLICTS_WITH_PROFILE_ID", message: explain("CONFLICTS_WITH_PROFILE_ID") },
        { status: 409 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: uid },
      data: { handle },
      select: { id: true, handle: true, publicId: true },
    });

    return NextResponse.json({
      ok: true,
      handle: updated.handle,
      publicId: updated.publicId,
      publicUrl: updated.handle ? `/app/profile/${updated.handle}` : updated.publicId ? `/app/profile/${updated.publicId}` : null,
      nftsUrl: updated.handle ? `/app/profile/${updated.handle}/nfts` : updated.publicId ? `/app/profile/${updated.publicId}/nfts` : null,
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json(
        { ok: false, error: "HANDLE_TAKEN", message: explain("HANDLE_TAKEN") },
        { status: 409 },
      );
    }

    console.error("[PROFILE_HANDLE_UPDATE_ERROR]", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
