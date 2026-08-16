import Script from "next/script";

/**
 * Google Analytics 4 — env-gated and INERT until NEXT_PUBLIC_GA_ID is set, so
 * committing this tracks nothing by default.
 *
 * ⚠️ Brand note: be.vocl's public pitch is "we don't track you, we don't sell
 * you." GA4 sends visitor data to Google, which is in tension with that. If you
 * keep GA4, pair it with consent handling and update the privacy copy; a
 * cookieless alternative (Plausible / Umami / Fathom) fits the brand better and
 * would drop in here the same way.
 */
export function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID;
  if (!id) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}', { anonymize_ip: true });`}
      </Script>
    </>
  );
}
