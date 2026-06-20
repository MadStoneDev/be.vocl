import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Authenticates an incoming cron request against CRON_SECRET.
 *
 * FAILS CLOSED: if CRON_SECRET is unset/empty, the request is rejected.
 * The provided Bearer token is compared in constant time to avoid leaking
 * timing information about the secret.
 *
 * @returns a 401 NextResponse if auth fails, or null if the request is authorized.
 */
export function verifyCronAuth(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;

  // Fail closed: never run as service role without a configured secret.
  if (!cronSecret || cronSecret.length === 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authHeader = request.headers.get("authorization") || "";
  const expected = `Bearer ${cronSecret}`;

  const provided = Buffer.from(authHeader);
  const expectedBuf = Buffer.from(expected);

  // timingSafeEqual throws on length mismatch, so guard first.
  if (
    provided.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(provided, expectedBuf)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
