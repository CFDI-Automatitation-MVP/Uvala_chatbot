import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import logger from "logger";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error_param = searchParams.get("error");
  const error_description = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/";

  // Comprehensive logging
  logger.info("OAuth callback started:", {
    url: request.url,
    origin,
    code: code ? `${code.substring(0, 10)}...` : null,
    error_param,
    error_description,
    next,
    headers: {
      host: request.headers.get("host"),
      "x-forwarded-host": request.headers.get("x-forwarded-host"),
      "user-agent": request.headers.get("user-agent"),
    },
  });

  // Check for OAuth errors first
  if (error_param) {
    logger.error("OAuth provider error:", { error_param, error_description });
    return NextResponse.redirect(
      `${origin}/sign-in?error=oauth_${error_param}`,
    );
  }

  if (code) {
    const supabase = await createClient();

    try {
      logger.info("Attempting to exchange code for session...");
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        logger.error("Session exchange failed:", error);
        return NextResponse.redirect(
          `${origin}/sign-in?error=session_exchange_failed`,
        );
      }

      if (!data.session) {
        logger.error("No session returned from exchange");
        return NextResponse.redirect(`${origin}/sign-in?error=no_session`);
      }

      if (!data.user) {
        logger.error("No user returned from exchange");
        return NextResponse.redirect(`${origin}/sign-in?error=no_user`);
      }

      // Success! Log details
      logger.info("OAuth callback successful:", {
        userId: data.user.id,
        email: data.user.email,
        isNewUser: data.user.created_at === data.user.last_sign_in_at,
        sessionValid: !!data.session.access_token,
      });

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

      logger.info("Redirecting after successful auth:", { redirectUrl });

      // Let Supabase handle session cookies automatically
      return NextResponse.redirect(redirectUrl);
    } catch (err) {
      logger.error("OAuth callback exception:", err);
      return NextResponse.redirect(`${origin}/sign-in?error=server_error`);
    }
  }

  // No code provided
  logger.error("OAuth callback: no code provided");
  return NextResponse.redirect(`${origin}/sign-in?error=no_code_provided`);
}
