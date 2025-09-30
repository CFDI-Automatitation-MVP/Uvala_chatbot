import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { pgUserRepository } from "@/lib/db/pg/repositories/user-repository.pg";
import { brevoEmailService } from "@/lib/email/brevo";

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
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Session exchange failed:", error);
        return NextResponse.redirect(
          `${origin}/sign-in?error=session_exchange_failed`,
        );
      }

      console.log("OAuth callback successful - PKCE code exchange completed");

      // Check if this is a first-time user and send welcome email
      if (data?.user) {
        try {
          const existingUser = await pgUserRepository.findById(data.user.id);

          // If user doesn't exist in our database, they are new
          if (!existingUser) {
            console.log(
              "🎉 New user detected, creating user and sending welcome email",
            );

            // Create user in database
            const newUser = await pgUserRepository.createUser({
              id: data.user.id,
              name:
                data.user.user_metadata?.full_name ||
                data.user.user_metadata?.name ||
                data.user.email?.split("@")[0] ||
                "User",
              email: data.user.email!,
              image:
                data.user.user_metadata?.avatar_url ||
                data.user.user_metadata?.picture ||
                null,
            });

            // Send welcome email in background (don't block redirect)
            brevoEmailService
              .sendWelcomeEmail(newUser.email, newUser.name, newUser.id)
              .then(() =>
                console.log("✅ Welcome email sent to:", newUser.email),
              )
              .catch((emailError) =>
                console.error("❌ Failed to send welcome email:", emailError),
              );
          } else {
            console.log("🔄 Existing user login:", existingUser.email);
          }
        } catch (userError) {
          console.error("⚠️ Error handling user login:", userError);
          // Don't block redirect if email fails
        }
      }

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
