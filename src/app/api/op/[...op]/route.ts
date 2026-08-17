import { createRouteHandler } from "@openpanel/nextjs/server";

/**
 * Same-origin proxy for the self-hosted OpenPanel instance.
 *
 * Serving op1.js and ingesting events from bevocl.com itself (rather than the
 * OpenPanel CDN / analytics subdomain) makes tracking first-party — it isn't
 * blocked by the ad/tracker blockers that kill third-party analytics, and it
 * preserves the real visitor IP for the upstream instance (which matters behind
 * Coolify's reverse proxy / Cloudflare).
 *
 * OPENPANEL_API_URL (server-only) — the self-hosted instance API, e.g.
 *   https://analytics.youragency.com/api . If unset, the SDK falls back to the
 *   OpenPanel cloud API, so set this for the self-hosted box.
 */
export const { GET, POST } = createRouteHandler({
  apiUrl: process.env.OPENPANEL_API_URL,
});
