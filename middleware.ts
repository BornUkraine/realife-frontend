import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Принудительно устанавливаем SameSite=None для куки сессии, 
  // чтобы браузер НЕ удалял её при возврате с Твиттера.
  const sessionCookieName = process.env.NODE_ENV === "production" 
    ? "__Secure-next-auth.session-token" 
    : "next-auth.session-token";

  const sessionCookie = request.cookies.get(sessionCookieName);

  if (sessionCookie) {
    response.cookies.set({
      name: sessionCookieName,
      value: sessionCookie.value,
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });
  }

  return response;
}

// Запускаем middleware только для страниц и API
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};