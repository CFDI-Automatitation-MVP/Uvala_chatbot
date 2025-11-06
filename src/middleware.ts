import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { rateLimitMiddleware } from "@/lib/security/rate-limit";
import { csrfMiddleware } from "@/lib/security/csrf";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const shouldEnforceHttps =
    process.env.NODE_ENV === "production" && process.env.NO_HTTPS !== "1";
  if (shouldEnforceHttps) {
    const host = request.headers.get("host") || request.nextUrl.host;
    const isLocalhost =
      host?.includes("localhost") ||
      host?.startsWith("127.") ||
      host?.includes("::1");
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const protocol = forwardedProto?.split(",")[0] || request.nextUrl.protocol;
    const normalizedProtocol = protocol?.toLowerCase().replace(/:$/, "");
    if (!isLocalhost && normalizedProtocol !== "https") {
      const redirectUrl = new URL(request.url);
      redirectUrl.protocol = "https:";
      return NextResponse.redirect(redirectUrl, { status: 308 });
    }
  }

  // Apply rate limiting first (before any other processing)
  const rateLimitResult = await rateLimitMiddleware(request);
  if (rateLimitResult instanceof Response) {
    // Rate limit exceeded, return the rate limit response immediately
    return rateLimitResult;
  }

  // Apply CSRF protection for critical API endpoints
  const csrfResult = await csrfMiddleware(request);
  if (csrfResult instanceof Response) {
    // CSRF validation failed, return the CSRF error response
    return csrfResult;
  }

  // Handle CORS for API routes
  if (pathname.startsWith("/api/")) {
    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin":
            process.env.NODE_ENV === "development"
              ? "http://localhost:3000"
              : "https://" + (process.env.VERCEL_URL || "yourdomain.com"),
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, X-Requested-With",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
  }

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  // Check if this is an OAuth callback (has 'code' parameter)
  const searchParams = request.nextUrl.searchParams;
  const isOAuthCallback = searchParams.has("code");

  // Allow public routes, API routes, OAuth callbacks, and specific auth assets only
  if (
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.includes("favicon") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".gif") ||
    pathname.endsWith(".webp") ||
    isOAuthCallback
  ) {
    console.log(`[MIDDLEWARE] Allowing public path: ${pathname}`);
    const response = NextResponse.next();

    // Add CORS and rate limit headers to API responses
    if (pathname.startsWith("/api/")) {
      response.headers.set(
        "Access-Control-Allow-Origin",
        process.env.NODE_ENV === "development"
          ? "http://localhost:3000"
          : "https://" + (process.env.VERCEL_URL || "yourdomain.com"),
      );
      response.headers.set("Access-Control-Allow-Credentials", "true");

      // Add rate limit headers if available
      if (rateLimitResult && typeof rateLimitResult === "object") {
        Object.entries(rateLimitResult).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }
    }

    return response;
  }

  // Use updateSession to handle session refresh and token management
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Include API routes for rate limiting and CSRF protection
    "/api/:path*",
    // Include all other routes except static files, sign-in, sign-up, auth
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.webp$|sign-in|sign-up|auth/).*)",
  ],
};
