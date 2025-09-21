import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  // Check for actual Supabase session cookies (discovered from logs)
  const sessionCookie =
    request.cookies.has("sb-ehwkvowrgvpypjlwcujb-auth-token.0") ||
    request.cookies.has("sb-ehwkvowrgvpypjlwcujb-auth-token.1");

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|auth/|sign-in|sign-up).*)",
  ],
};
