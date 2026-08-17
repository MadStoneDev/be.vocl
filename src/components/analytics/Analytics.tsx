import Script from "next/script";

/**
 * Cookieless analytics via Umami — privacy-first and GDPR-friendly: no cookies,
 * no cross-site identifiers, only aggregate page metrics. Consistent with the
 * "we don't track you, we don't sell you" positioning (nothing here needs a
 * consent banner), so it's the right fit over GA4.
 *
 * Env-gated and INERT until both are set — works with Umami Cloud or a
 * self-hosted instance; only the script URL changes:
 *   NEXT_PUBLIC_UMAMI_SRC         — Cloud: https://cloud.umami.is/script.js
 *                                   Self-hosted: https://<your-umami-host>/script.js
 *   NEXT_PUBLIC_UMAMI_WEBSITE_ID  — the website id from the Umami dashboard.
 */
export function Analytics() {
  const src = process.env.NEXT_PUBLIC_UMAMI_SRC;
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  if (!src || !websiteId) return null;

  return (
    <Script
      src={src}
      data-website-id={websiteId}
      strategy="afterInteractive"
    />
  );
}
