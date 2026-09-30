import { NextResponse } from "next/server";

// Uptime health check. No auth (only reveals up/down); /api is already exempt
// from the session gate in src/lib/supabase/proxy.ts, so no proxy change needed.
// Never statically rendered/cached — always probes live.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const TIMEOUT_MS = 5000;

/** Trailing slash(es) stripped so path joins don't double up. */
function stripSlash(u: string): string {
  return u.replace(/\/+$/, "");
}

/**
 * Fetch with a hard timeout, mapped to a leak-free status string:
 * "ok" (2xx) | "timeout" | `error <status>` (non-2xx) | "error" (network/other).
 * Never returns URLs, keys, or error messages.
 */
async function probe(url: string, headers?: Record<string, string>): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: controller.signal,
    });
    return res.ok ? "ok" : `error ${res.status}`;
  } catch (err) {
    return err instanceof Error && err.name === "AbortError" ? "timeout" : "error";
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const appUrl = stripSlash(process.env.NEXT_PUBLIC_APP_URL ?? "");
  const supabaseUrl = stripSlash(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const healthTable = process.env.HEALTH_TABLE?.trim();

  // 1. site — root path only (never /api/health, to avoid recursion).
  const siteCheck: Promise<string> = appUrl
    ? probe(`${appUrl}/`)
    : Promise.resolve("error");

  // 2. auth — Supabase GoTrue health.
  const authCheck: Promise<string> =
    supabaseUrl && anonKey
      ? probe(`${supabaseUrl}/auth/v1/health`, { apikey: anonKey })
      : Promise.resolve("error");

  // 3. db — a tiny anon-readable read via PostgREST. Falls back to the REST root
  //    (trailing slash required, or Kong won't route it) when HEALTH_TABLE is unset.
  const dbPath = healthTable
    ? `/rest/v1/${encodeURIComponent(healthTable)}?select=id&limit=1`
    : `/rest/v1/`;
  const dbCheck: Promise<string> =
    supabaseUrl && anonKey
      ? probe(`${supabaseUrl}${dbPath}`, {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        })
      : Promise.resolve("error");

  const [site, auth, db] = await Promise.all([siteCheck, authCheck, dbCheck]);
  const healthy = site === "ok" && auth === "ok" && db === "ok";

  return NextResponse.json(
    { status: healthy ? "ok" : "fail", site, auth, db },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
