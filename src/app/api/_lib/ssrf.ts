/**
 * SSRF protection helpers shared by API routes that fetch user-supplied URLs.
 */

import { lookup } from "node:dns/promises";

/**
 * Check if a hostname is a private/internal/reserved host.
 * Blocks:
 * - Private IPv4 ranges (10.x, 172.16-31.x, 192.168.x)
 * - Loopback (127.x, ::1), 0.0.0.0/8
 * - Link-local (169.254.x, fe80::), incl. cloud metadata 169.254.169.254
 * - Unique-local IPv6 (fc00::/7 -> fc.., fd..)
 * - Multicast/reserved (224.0.0.0+)
 * - Internal domain suffixes (.local, .internal, .localhost, k8s svc)
 *
 * Note: this is a syntactic guard against literal hosts. On its own it cannot
 * catch a public hostname whose DNS resolves to a private IP (DNS rebinding) —
 * use {@link safeFetch}, which additionally resolves each hop and validates
 * every returned address via {@link assertPublicHost}.
 */
export function isPrivateOrReservedHost(hostname: string): boolean {
  // Normalize: strip IPv6 brackets and lowercase.
  const lowerHostname = hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");

  const blockedHosts = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "169.254.169.254", // AWS/cloud metadata
    "metadata.google.internal", // GCP metadata
    "metadata.azure.com", // Azure metadata
  ];

  if (blockedHosts.includes(lowerHostname)) {
    return true;
  }

  // IPv4 patterns
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = lowerHostname.match(ipv4Pattern);

  if (ipv4Match) {
    const [, a, b, c, d] = ipv4Match.map(Number);

    // Invalid octets -> treat as unsafe
    if ([a, b, c, d].some((octet) => octet > 255)) {
      return true;
    }

    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a === 0) return true; // 0.0.0.0/8
    if (a >= 224) return true; // multicast + reserved
  }

  // IPv6 private/local patterns (bracket-stripped above)
  if (
    lowerHostname.startsWith("fe80:") || // link-local
    lowerHostname.startsWith("fc") || // unique local fc00::/7
    lowerHostname.startsWith("fd") ||
    lowerHostname === "::" ||
    lowerHostname.startsWith("::ffff:") // IPv4-mapped (could embed private IPv4)
  ) {
    return true;
  }

  // Internal domain suffixes
  if (
    lowerHostname.endsWith(".local") ||
    lowerHostname.endsWith(".internal") ||
    lowerHostname.endsWith(".localhost") ||
    lowerHostname.includes(".svc.cluster")
  ) {
    return true;
  }

  return false;
}

/**
 * Validate that a URL string is an http(s) URL pointing at a non-private host.
 * Returns the parsed URL if safe, otherwise null.
 */
export function parseSafeHttpUrl(url: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return null;
  }
  if (isPrivateOrReservedHost(parsed.hostname)) {
    return null;
  }
  return parsed;
}

/**
 * Resolve a hostname and assert that EVERY address it resolves to is public.
 *
 * The syntactic {@link isPrivateOrReservedHost} check cannot catch a public
 * hostname whose DNS record points at a private/metadata IP (DNS rebinding).
 * Resolving here and validating each returned address closes that gap.
 *
 * Residual: a narrow TOCTOU window remains between this lookup and the actual
 * fetch (the name could re-resolve differently). Pinning the connection to the
 * validated IP would require breaking TLS SNI/cert validation, so we accept the
 * narrowed window — this raises the bar from "trivial" to "race a DNS TTL".
 *
 * Throws if resolution fails or any resolved address is private/reserved.
 */
export async function assertPublicHost(hostname: string): Promise<void> {
  // An IP literal was already covered syntactically; still, lookup() will just
  // echo it back and we re-check, which is harmless.
  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("URL not allowed");
  }
  if (addresses.length === 0) {
    throw new Error("URL not allowed");
  }
  for (const { address } of addresses) {
    if (isPrivateOrReservedHost(address)) {
      throw new Error("URL not allowed");
    }
  }
}

/**
 * Fetch a URL with SSRF protection. Uses manual redirect handling so each
 * redirect target's host is re-validated against {@link isPrivateOrReservedHost}
 * before being followed — preventing a public URL from redirecting into a
 * private/metadata endpoint. Each target's DNS is also resolved and every
 * resolved address validated ({@link assertPublicHost}) to defeat rebinding.
 *
 * Throws on disallowed redirect targets or too many redirects.
 */
export async function safeFetch(
  initialUrl: string,
  init: RequestInit = {},
  maxRedirects = 5
): Promise<Response> {
  let current = parseSafeHttpUrl(initialUrl);
  if (!current) {
    throw new Error("URL not allowed");
  }

  for (let i = 0; i <= maxRedirects; i++) {
    // DNS-resolve and validate every address before each hop.
    await assertPublicHost(current.hostname);

    const response = await fetch(current.toString(), {
      ...init,
      redirect: "manual",
    });

    // Not a redirect (or opaqueredirect cannot occur with manual + node) -> return.
    if (response.status < 300 || response.status >= 400) {
      return response;
    }

    const location = response.headers.get("location");
    if (!location) {
      // Redirect status with no Location — return as-is, caller handles !ok.
      return response;
    }

    let next: URL;
    try {
      next = new URL(location, current);
    } catch {
      throw new Error("Invalid redirect location");
    }

    if (!["http:", "https:"].includes(next.protocol) || isPrivateOrReservedHost(next.hostname)) {
      throw new Error("Redirect to disallowed host");
    }

    current = next;
  }

  throw new Error("Too many redirects");
}
