/**
 * Single source of truth for the app's public origin and email identity.
 *
 * Set `NEXT_PUBLIC_APP_URL` in the environment (e.g. https://bevocl.com) and
 * everything — canonical URLs, sitemap/robots/RSS, OG tags, auth-callback
 * redirects, and email links — follows it. The fallback is only a safety net.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://bevocl.com"
).replace(/\/+$/, "");

/** The bare host, e.g. "bevocl.com". Used for email from-addresses. */
export const SITE_HOST = (() => {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return "bevocl.com";
  }
})();

/**
 * Domain used for transactional email from-addresses. Defaults to the canonical
 * host but can be overridden (must match the domain verified in Resend).
 */
export const EMAIL_DOMAIN = process.env.EMAIL_FROM_DOMAIN || SITE_HOST;
