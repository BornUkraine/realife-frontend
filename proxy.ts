import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ✅ API routes не трогаем вообще.
  // /api/market/listings должен напрямую попадать в app/api/market/listings/route.ts
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // Принудительно устанавливаем SameSite=None для next-auth session cookie,
  // чтобы браузер не терял сессию после OAuth/redirect flows.
  const sessionCookieName =
    process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

  const sessionCookie = request.cookies.get(sessionCookieName);

  if (sessionCookie) {
    response.cookies.set({
      name: sessionCookieName,
      value: sessionCookie.value,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: [
    // ✅ Исключаем API и системные Next.js/static routes.
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
