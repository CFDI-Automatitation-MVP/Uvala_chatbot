import { NextRequest, NextResponse } from "next/server";
import { generateCSRFToken } from "@/lib/security/csrf";
import { getSession } from "@/lib/auth/supabase-auth";

// Use __Host- prefix only in production (requires HTTPS)
const CSRF_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-csrf-token" : "csrf-token";

/**
 * GET /api/csrf-token
 * Returns a CSRF token for authenticated users
 */
export async function GET(_request: NextRequest) {
  try {
    // Require authentication to get CSRF token
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Generate CSRF token
    const token = await generateCSRFToken();

    // Create response with cookie
    const response = NextResponse.json({
      csrfToken: token,
      cookieName: CSRF_COOKIE_NAME,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    });

    // Set cookie in response
    response.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error generating CSRF token:", error);
    return NextResponse.json(
      { error: "Failed to generate CSRF token" },
      { status: 500 },
    );
  }
}
