import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Skip auth checks if Supabase is not configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // In development without Supabase configured, allow all routes
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/signup", "/auth/callback", "/terms", "/privacy"];
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Account status page is accessible to locked users
  const isAccountStatusRoute = request.nextUrl.pathname.startsWith("/account-status");

  // If user is not logged in and trying to access protected route
  if (!user && !isPublicRoute && !isAccountStatusRoute && request.nextUrl.pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If user is logged in, check their lock status
  if (user && !isPublicRoute && !isAccountStatusRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("lock_status")
      .eq("id", user.id)
      .single();

    const lockStatus = profile?.lock_status || "unlocked";

    // Banned users can only access account-status page
    if (lockStatus === "banned") {
      const url = request.nextUrl.clone();
      url.pathname = "/account-status";
      return NextResponse.redirect(url);
    }

    // Restricted users can browse but cannot post (handled at action level)
    // They can still access most pages
  }

  // If user is logged in and trying to access auth pages, redirect to feed
  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/feed";
    return NextResponse.redirect(url);
  }

  // If user is logged in and at root, redirect to feed
  if (user && request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/feed";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
