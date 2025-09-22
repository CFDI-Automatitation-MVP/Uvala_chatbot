import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
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
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  // This refreshes the session and manages tokens
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Handle invalid refresh tokens gracefully
  if (error && error.message?.includes("refresh_token_not_found")) {
    await supabase.auth.signOut();
  }

  // Auth redirect logic for protected routes
  const { pathname } = request.nextUrl;
  const isProtectedRoute =
    !pathname.startsWith("/sign-in") &&
    !pathname.startsWith("/sign-up") &&
    !pathname.startsWith("/auth/");

  if (isProtectedRoute && (!user || error)) {
    console.log(
      `[MIDDLEWARE] Redirecting ${pathname} to sign-in - no valid user`,
    );
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return supabaseResponse;
}
