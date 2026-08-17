import { OpenPanelComponent } from "@openpanel/nextjs";

/**
 * Cookieless analytics via a self-hosted OpenPanel instance (shared agency box).
 * Privacy-first: no cookies, no cross-site identifiers, GDPR/CCPA-friendly with
 * no consent banner — consistent with be.vocl's "we don't track you" pitch.
 *
 * Routes through the neutral-named same-origin proxy at /api/i (see
 * app/api/i/[...path]) so op1.js and event ingestion are first-party AND don't
 * match the `op1.js` blocklist rules that block even same-origin trackers.
 * Env-gated and INERT until the project client id is set:
 *   NEXT_PUBLIC_OPENPANEL_CLIENT_ID — the be.vocl Project's client id
 *   OPENPANEL_API_URL (server, used by the proxy) — the self-hosted instance API
 */
export function Analytics() {
  const clientId = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID;
  if (!clientId) return null;

  return (
    <OpenPanelComponent
      clientId={clientId}
      apiUrl="/api/i"
      scriptUrl="/api/i/s.js"
      trackScreenViews
      trackOutgoingLinks
      trackAttributes
    />
  );
}
