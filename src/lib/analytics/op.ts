import "server-only";
import { OpenPanel } from "@openpanel/nextjs";

/**
 * Server-side OpenPanel client for backend product events (signup, post
 * published, follow, …). Separate from the client-side pageview tracking in
 * components/analytics/Analytics.tsx.
 *
 * Inert until OPENPANEL_CLIENT_SECRET is set. The secret is SERVER-ONLY — it must
 * never be a NEXT_PUBLIC_ var or reach the browser (hence `server-only`).
 */
const clientId = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID;
const clientSecret = process.env.OPENPANEL_CLIENT_SECRET;

const client =
  clientId && clientSecret
    ? new OpenPanel({
        clientId,
        clientSecret,
        apiUrl: process.env.OPENPANEL_API_URL,
      })
    : null;

/**
 * Fire a backend product event, tied to a user via `profileId`. No-ops when
 * analytics isn't configured, and never throws into the caller — analytics must
 * never break a mutation. Call it fire-and-forget: `void trackEvent(...)`.
 */
export async function trackEvent(
  name: string,
  profileId: string,
  properties?: Record<string, unknown>
): Promise<void> {
  if (!client) return;
  try {
    await client.track(name, { profileId, ...properties });
  } catch (err) {
    console.error(`OpenPanel track "${name}" failed:`, err);
  }
}
