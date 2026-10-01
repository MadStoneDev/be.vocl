import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isBetaGateEnabled, canAccessBeta } from "@/lib/beta";

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

  // Classify the route up-front (pure string checks, no Supabase call) so the
  // getUser failure handler below can fail CLOSED on protected routes (the proxy
  // is the only gate on /admin) and fail open only on public pages.
  //  - /api authenticates per-route; RSS/embed/profile/discover/post/featured and
  //    the auth/legal pages are public.
  const machineOrPublicPrefixes = [
    "/api",
    "/rss",
    "/embed",
    "/profile/",
    "/discover",
    "/post/",
    "/featured/",
    "/vs",
    "/login",
    "/email-templates",
    "/signup",
    "/auth/callback",
    "/terms",
    "/privacy",
    // The private-beta landing (where the beta gate sends users without access).
    "/beta-closed",
    // Crawl-control + discovery files must be reachable by logged-out bots.
    "/sitemap.xml",
    "/robots.txt",
    "/llms.txt",
    // Google Search Console HTML-file verification.
    "/google731fe34a4a843607.html",
  ];
  const isPublicRoute = machineOrPublicPrefixes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );
  // Account status page is accessible to locked users.
  const isAccountStatusRoute = request.nextUrl.pathname.startsWith("/account-status");

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

  // The proxy runs getUser() on EVERY matched request. On a full page load the
  // browser fires a burst of RSC prefetches + server actions at once, so getUser
  // hits self-hosted GoTrue many times concurrently. Previously a hang/error here
  // had no handling, so the request was rejected and surfaced as a 503 right after
  // load. Time-box getUser and FAIL OPEN: log the cause and let the request through
  // (per-route checks + RLS still apply) rather than 503-ing it.
  let user: User | null = null;
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("getUser timeout (3s)")), 3000),
      ),
    ]);
    if (result.error && result.error.name !== "AuthSessionMissingError") {
      console.error("[proxy] getUser error", {
        path: request.nextUrl.pathname,
        status: result.error.status,
        message: result.error.message,
      });
    }
    user = result.data.user;
  } catch (err) {
    console.error("[proxy] getUser failed", {
      path: request.nextUrl.pathname,
      message: err instanceof Error ? err.message : String(err),
    });
    // FAIL CLOSED on protected routes (incl. /admin): the proxy is the gate, so a
    // failed session check must never grant access. Public pages fail open so a
    // transient GoTrue blip doesn't 503 the feed/profile/post surfaces.
    if (isPublicRoute || isAccountStatusRoute || request.nextUrl.pathname === "/") {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // (isPublicRoute / isAccountStatusRoute computed above, before getUser.)

  // Step-up MFA: a signed-in user who enrolled a TOTP factor but only holds an
  // AAL1 session must complete the challenge before reaching any gated route.
  // 2FA isn't compulsory, but once a user opts in it's enforced at every login.
  // getAuthenticatorAssuranceLevel decodes the local session (no extra network
  // call), so this is cheap.
  if (user) {
    const onMfaPage = request.nextUrl.pathname.startsWith("/auth/mfa");
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const needsMfa = aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2";

    if (needsMfa && !onMfaPage && !isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/mfa";
      url.search = `next=${encodeURIComponent(request.nextUrl.pathname)}`;
      return NextResponse.redirect(url);
    }
    // Already stepped up (or nothing to step up to) — don't linger on the challenge.
    if (!needsMfa && onMfaPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/feed";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

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
      .select("lock_status, role, beta_access")
      .eq("id", user.id)
      .single();

    const prof = profile as
      | { lock_status?: string; role?: number | null; beta_access?: boolean }
      | null;

    // Private-beta gate — active only on a deployment that sets
    // BETA_ACCESS_REQUIRED (the beta environment). Admins and beta_access users
    // pass; everyone else is sent to the private-beta landing. On live (var
    // unset) this is a no-op. /beta-closed itself is a public route, so this
    // block never runs there — no redirect loop.
    if (isBetaGateEnabled() && !canAccessBeta(prof?.role, prof?.beta_access)) {
      const url = request.nextUrl.clone();
      url.pathname = "/beta-closed";
      url.search = "";
      return NextResponse.redirect(url);
    }

    const lockStatus = prof?.lock_status || "unlocked";

    // Banned users can only access account-status page
    if (lockStatus === "banned") {
      const url = request.nextUrl.clone();
      url.pathname = "/account-status";
      return NextResponse.redirect(url);
    }

    // Admin surface requires moderator+ (role >= 5), enforced server-side here so
    // an unauthorized user never receives an admin page.
    if (request.nextUrl.pathname.startsWith("/admin")) {
      const role = (profile as { role?: number | null } | null)?.role ?? 0;
      if (role < 5) {
        const url = request.nextUrl.clone();
        url.pathname = "/feed";
        url.search = "";
        return NextResponse.redirect(url);
      }
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
