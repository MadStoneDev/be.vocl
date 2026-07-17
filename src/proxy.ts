import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Fold every alternate/legacy domain onto the canonical host with a 301 so
// links, SEO, and cookies consolidate on one origin. Only fires if these
// domains are actually routed to this app (otherwise it's a harmless no-op).
const CANONICAL_HOST = "bevocl.com";
const REDIRECT_HOSTS = new Set([
  "www.bevocl.com",
  "bevocl.app",
  "www.bevocl.app",
  "bevocl.me",
  "www.bevocl.me",
]);

export async function proxy(request: NextRequest) {
  const host = (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    ""
  ).toLowerCase();

  if (REDIRECT_HOSTS.has(host)) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 301);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes that don't need auth (like webhooks)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
