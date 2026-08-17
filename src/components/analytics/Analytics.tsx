import { OpenPanelComponent } from "@openpanel/nextjs";

/**
 * Cookieless analytics via a self-hosted OpenPanel instance (shared agency box).
 * Privacy-first: no cookies, no cross-site identifiers, GDPR/CCPA-friendly with
 * no consent banner — consistent with be.vocl's "we don't track you" pitch.
 *
 * Routes through the same-origin proxy at /api/op (see app/api/op/[...op]) so
 * op1.js and event ingestion are first-party — ad-blocker-resistant and IP-
 * preserving. Env-gated and INERT until the project client id is set:
 *   NEXT_PUBLIC_OPENPANEL_CLIENT_ID — the be.vocl Project's client id
 *   OPENPANEL_API_URL (server, used by the proxy) — the self-hosted instance API
 */
export function Analytics() {
  const clientId = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID;
  if (!clientId) return null;

  return (
    <OpenPanelComponent
      clientId={clientId}
      apiUrl="/api/op"
      scriptUrl="/api/op/op1.js"
      trackScreenViews
      trackOutgoingLinks
      trackAttributes
    />
  );
}
