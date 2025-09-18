import { NextRequest, NextResponse } from "next/server";
import { generateCSRFTokenForClient } from "@/lib/security/csrf";
import { getSession } from "@/lib/auth/supabase-auth";

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

    // Generate CSRF token and set cookie
    const { token, cookie } = await generateCSRFTokenForClient();

    return NextResponse.json({
      csrfToken: token,
      cookieName: cookie,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    });
  } catch (error) {
    console.error("Error generating CSRF token:", error);
    return NextResponse.json(
      { error: "Failed to generate CSRF token" },
      { status: 500 },
    );
  }
}
