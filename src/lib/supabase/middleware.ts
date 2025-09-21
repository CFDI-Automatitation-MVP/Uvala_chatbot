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

  // refreshing the auth token
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Add user info to response headers for middleware to check
  // SECURITY: Encode user data as Base64 to handle non-ASCII characters
  if (user && !error) {
    const userJson = JSON.stringify(user);
    const userBase64 = Buffer.from(userJson, "utf8").toString("base64");
    supabaseResponse.headers.set("x-supabase-user", userBase64);
  }

  return supabaseResponse;
}
