import { NextRequest, NextResponse } from "next/server";

interface OpenGraphData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

// Simple in-memory cache (in production, use Redis or similar)
const cache = new Map<string, { data: OpenGraphData; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

/**
 * SSRF Protection: Check if a hostname resolves to a private/internal IP.
 * Blocks requests to:
 * - Private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
 * - Localhost (127.x.x.x, localhost, ::1)
 * - Link-local addresses (169.254.x.x, fe80::)
 * - Cloud metadata endpoints (169.254.169.254)
 */
function isPrivateOrReservedHost(hostname: string): boolean {
  // Block obvious localhost variations
  const blockedHosts = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "[::1]",
    "169.254.169.254", // AWS/cloud metadata
    "metadata.google.internal", // GCP metadata
    "metadata.azure.com", // Azure metadata
  ];

  const lowerHostname = hostname.toLowerCase();
  if (blockedHosts.includes(lowerHostname)) {
    return true;
  }

  // Check for IP address patterns
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = hostname.match(ipv4Pattern);

  if (ipv4Match) {
    const [, a, b, c, d] = ipv4Match.map(Number);

    // Validate IP octets
    if ([a, b, c, d].some((octet) => octet > 255)) {
      return true; // Invalid IP
    }

    // Private ranges
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16

    // Loopback
    if (a === 127) return true; // 127.0.0.0/8

    // Link-local
    if (a === 169 && b === 254) return true; // 169.254.0.0/16

    // Reserved
    if (a === 0) return true; // 0.0.0.0/8
    if (a >= 224) return true; // Multicast and reserved (224.0.0.0+)
  }

  // Block IPv6 private/local patterns
  if (
    hostname.startsWith("fe80:") ||
    hostname.startsWith("[fe80:") || // Link-local
    hostname.startsWith("fc") ||
    hostname.startsWith("[fc") || // Unique local
    hostname.startsWith("fd") ||
    hostname.startsWith("[fd") // Unique local
  ) {
    return true;
  }

  // Block internal domain patterns
  if (
    lowerHostname.endsWith(".local") ||
    lowerHostname.endsWith(".internal") ||
    lowerHostname.endsWith(".localhost") ||
    lowerHostname.includes(".svc.cluster") // Kubernetes
  ) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // SSRF Protection: Block private/internal hosts
  if (isPrivateOrReservedHost(parsedUrl.hostname)) {
    return NextResponse.json(
      { error: "URL not allowed" },
      { status: 403 }
    );
  }

  // Check cache
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    // Fetch the page
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; be.vocl/1.0; +https://be.vocl)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      // Return basic info for non-HTML URLs
      const data: OpenGraphData = {
        url,
        title: parsedUrl.hostname,
      };
      cache.set(url, { data, timestamp: Date.now() });
      return NextResponse.json(data);
    }

    const html = await response.text();

    // Parse OpenGraph and meta tags
    const ogData = parseOpenGraph(html, url);

    // Cache the result
    cache.set(url, { data: ogData, timestamp: Date.now() });

    return NextResponse.json(ogData);
  } catch (error) {
    console.error("OpenGraph fetch error:", error);

    // Return minimal data on error
    const data: OpenGraphData = {
      url,
      title: parsedUrl.hostname,
    };

    return NextResponse.json(data);
  }
}

function parseOpenGraph(html: string, url: string): OpenGraphData {
  const data: OpenGraphData = { url };
  const parsedUrl = new URL(url);

  // Helper to extract meta content
  const getMeta = (property: string): string | undefined => {
    // Try og: prefix
    let match = html.match(
      new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']+)["']`, "i")
    );
    if (!match) {
      match = html.match(
        new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:${property}["']`, "i")
      );
    }
    // Try twitter: prefix
    if (!match) {
      match = html.match(
        new RegExp(`<meta[^>]*name=["']twitter:${property}["'][^>]*content=["']([^"']+)["']`, "i")
      );
    }
    if (!match) {
      match = html.match(
        new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:${property}["']`, "i")
      );
    }
    return match?.[1];
  };

  // Get OpenGraph data
  data.title = getMeta("title");
  data.description = getMeta("description");
  data.image = getMeta("image");
  data.siteName = getMeta("site_name");

  // Fallback to regular meta tags
  if (!data.title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    data.title = titleMatch?.[1]?.trim();
  }

  if (!data.description) {
    const descMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
    );
    data.description = descMatch?.[1];
  }

  // Make relative image URLs absolute
  if (data.image && !data.image.startsWith("http")) {
    if (data.image.startsWith("//")) {
      data.image = `https:${data.image}`;
    } else if (data.image.startsWith("/")) {
      data.image = `${parsedUrl.origin}${data.image}`;
    } else {
      data.image = `${parsedUrl.origin}/${data.image}`;
    }
  }

  // Get favicon
  const faviconMatch = html.match(
    /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i
  );
  if (faviconMatch?.[1]) {
    let favicon = faviconMatch[1];
    if (!favicon.startsWith("http")) {
      if (favicon.startsWith("//")) {
        favicon = `https:${favicon}`;
      } else if (favicon.startsWith("/")) {
        favicon = `${parsedUrl.origin}${favicon}`;
      } else {
        favicon = `${parsedUrl.origin}/${favicon}`;
      }
    }
    data.favicon = favicon;
  } else {
    // Default to /favicon.ico
    data.favicon = `${parsedUrl.origin}/favicon.ico`;
  }

  // Clean up
  if (data.title) {
    data.title = decodeHTMLEntities(data.title).slice(0, 200);
  }
  if (data.description) {
    data.description = decodeHTMLEntities(data.description).slice(0, 300);
  }
  if (!data.siteName) {
    data.siteName = parsedUrl.hostname.replace(/^www\./, "");
  }

  return data;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}
