import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error_param = searchParams.get("error");
  const error_description = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/";

  // Check for OAuth errors first
  if (error_param) {
    console.error("OAuth provider error:", { error_param, error_description });
    return NextResponse.redirect(
      `${origin}/sign-in?error=oauth_${error_param}`,
    );
  }

  if (code) {
    const supabase = await createClient();

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Session exchange failed:", error);
        return NextResponse.redirect(
          `${origin}/sign-in?error=session_exchange_failed`,
        );
      }

      console.log("OAuth callback successful - PKCE code exchange completed");

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      let redirectUrl: string;
      if (isLocalEnv) {
        redirectUrl = `${origin}${next}`;
      } else if (forwardedHost) {
        redirectUrl = `https://${forwardedHost}${next}`;
      } else {
        redirectUrl = `${origin}${next}`;
      }

      console.log("Redirecting after successful auth:", { redirectUrl });

      return NextResponse.redirect(redirectUrl);
    } catch (err) {
      console.error("OAuth callback exception:", err);
      return NextResponse.redirect(`${origin}/sign-in?error=server_error`);
    }
  }

  // No code provided
  console.error("OAuth callback: no code provided");
  return NextResponse.redirect(`${origin}/sign-in?error=no_code_provided`);
}
