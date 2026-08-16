import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasCompletedOnboarding } from "@/lib/onboarding";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/verify-otp",
]);

function copySessionCookies(from: NextResponse, to: NextResponse) {
  to.cookies.setAll(from.cookies.getAll());
  return to;
}

function redirectWithSession(
  request: NextRequest,
  supabaseResponse: NextResponse,
  pathname: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return copySessionCookies(supabaseResponse, NextResponse.redirect(url));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api")) {
    return supabaseResponse;
  }

  if (!user) {
    if (pathname === "/onboarding") {
      return redirectWithSession(request, supabaseResponse, "/login");
    }
    return supabaseResponse;
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return supabaseResponse;
  }

  const { data: prefs, error: prefsError } = await supabase
    .from("user_preferences")
    .select("procurement_types, regions, onboarding_completed_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (prefsError) {
    return supabaseResponse;
  }

  const complete = hasCompletedOnboarding(prefs);

  if (!complete && pathname !== "/onboarding") {
    return redirectWithSession(request, supabaseResponse, "/onboarding");
  }

  if (complete && pathname === "/onboarding") {
    return redirectWithSession(request, supabaseResponse, "/dashboard");
  }

  return supabaseResponse;
}
