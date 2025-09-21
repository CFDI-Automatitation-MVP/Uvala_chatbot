import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  try {
    // SECURE: Use Supabase's official Edge Runtime validation
    const response = await updateSession(request);
    const userBase64 = response.headers.get("x-supabase-user");

    if (!userBase64) {
      // SECURE: No user found after proper validation
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    // SECURITY: Decode Base64 user data (handles non-ASCII characters)
    try {
      const userJson = Buffer.from(userBase64, "base64").toString("utf8");
      JSON.parse(userJson); // Validate JSON format
      // User validation successful
    } catch (decodeError) {
      console.error("[MIDDLEWARE] Failed to decode user data:", decodeError);
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    // SECURE: Add Content Security Policy and other security headers
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https: blob:; " +
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live; " +
        "frame-src 'none'; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self';",
    );

    // Additional security headers
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );

    // SECURE: Return response with refreshed tokens and security headers
    return response;
  } catch (error) {
    // SECURE: Handle authentication errors gracefully
    console.error("[MIDDLEWARE] Auth validation failed:", error);
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|auth/|sign-in|sign-up).*)",
  ],
};
