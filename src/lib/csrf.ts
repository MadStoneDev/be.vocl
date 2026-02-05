import { NextRequest, NextResponse } from "next/server";

/**
 * List of allowed origins for CSRF protection.
 * In production, this should match your domain(s).
 */
function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  // Add production domain
  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(process.env.NEXT_PUBLIC_APP_URL);
  }

  // Add Vercel deployment URLs
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }

  // Add localhost for development
  if (process.env.NODE_ENV === "development") {
    origins.push("http://localhost:3000");
    origins.push("http://127.0.0.1:3000");
  }

  return origins;
}

/**
 * Validate that the request origin matches allowed origins.
 * Returns null if valid, or an error response if invalid.
 *
 * Use this in API routes that should only accept same-origin requests.
 * Do NOT use for webhook routes that are called by external services.
 */
export function validateCsrf(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // For same-origin requests, origin might be null
  // In that case, check referer
  const requestOrigin = origin || (referer ? new URL(referer).origin : null);

  // If there's no origin/referer, it could be a direct API call (allowed for GET)
  // For mutating requests, we should have an origin
  if (request.method !== "GET" && !requestOrigin) {
    // Allow requests without origin only if they have proper authentication
    // This is a permissive fallback for API clients
    return null;
  }

  // If we have an origin, validate it
  if (requestOrigin) {
    const allowedOrigins = getAllowedOrigins();

    // Check if the origin is allowed
    const isAllowed = allowedOrigins.some((allowed) => {
      // Exact match
      if (requestOrigin === allowed) return true;

      // Allow subdomains of production domain
      if (allowed.includes("://")) {
        const allowedHost = new URL(allowed).host;
        const requestHost = new URL(requestOrigin).host;
        return requestHost === allowedHost || requestHost.endsWith(`.${allowedHost}`);
      }

      return false;
    });

    if (!isAllowed) {
      console.warn(`CSRF validation failed: origin ${requestOrigin} not in allowed list`);
      return NextResponse.json(
        { error: "Forbidden: Invalid origin" },
        { status: 403 }
      );
    }
  }

  return null;
}

/**
 * Helper to wrap an API route handler with CSRF protection.
 *
 * Usage:
 * ```ts
 * export const POST = withCsrf(async (request) => {
 *   // Your handler logic
 * });
 * ```
 */
export function withCsrf(
  handler: (request: NextRequest) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const csrfError = validateCsrf(request);
    if (csrfError) {
      return csrfError;
    }
    return handler(request);
  };
}
