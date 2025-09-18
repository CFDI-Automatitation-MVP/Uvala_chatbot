import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { rateLimitMiddleware } from "@/lib/security/rate-limit";
import { csrfMiddleware } from "@/lib/security/csrf";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  // Allow public routes, API routes, and specific auth assets only
  if (
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/uvala-white-log.svg") ||
    pathname.startsWith("/auth/")
  ) {
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

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Check if user is authenticated
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // If no user and accessing protected route, redirect to sign-in
  if ((!user || error) && !pathname.startsWith("/sign-in")) {
    const redirectUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|uvala-white-log.svg|sitemap.xml|robots.txt|api/|sign-in|sign-up|auth).*)",
  ],
};
