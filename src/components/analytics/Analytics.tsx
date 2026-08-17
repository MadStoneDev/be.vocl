import Script from "next/script";

/**
 * Cookieless analytics via OpenPanel (self-hosted, shared agency instance).
 * Privacy-first: no cookies, no cross-site identifiers, GDPR/CCPA-friendly with
 * no consent banner — consistent with be.vocl's "we don't track you" positioning.
 *
 * Env-gated and INERT until the client id is set:
 *   NEXT_PUBLIC_OPENPANEL_CLIENT_ID — the be.vocl Project's client id (OpenPanel
 *                                     dashboard → Project → Settings).
 *   NEXT_PUBLIC_OPENPANEL_API_URL   — the self-hosted instance API, e.g.
 *                                     https://analytics.example.com/api
 *   NEXT_PUBLIC_OPENPANEL_SDK_URL   — where op1.js is served; defaults to the
 *                                     public CDN, but self-hosting it (served
 *                                     from your instance) keeps it fully
 *                                     first-party and ad-blocker-resistant.
 */
export function Analytics() {
  const clientId = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID;
  const apiUrl = process.env.NEXT_PUBLIC_OPENPANEL_API_URL;
  const sdkUrl = process.env.NEXT_PUBLIC_OPENPANEL_SDK_URL || "https://openpanel.dev/op1.js";
  if (!clientId) return null;

  const init = {
    clientId,
    ...(apiUrl ? { apiUrl } : {}),
    trackScreenViews: true, // SPA route changes (App Router client nav)
    trackOutgoingLinks: true,
    trackAttributes: true,
  };

  return (
    <>
      <Script src={sdkUrl} strategy="afterInteractive" defer />
      <Script id="openpanel-init" strategy="afterInteractive">
        {`window.op = window.op || function (...args) { (window.op.q = window.op.q || []).push(args); };
window.op('init', ${JSON.stringify(init)});`}
      </Script>
    </>
  );
}
