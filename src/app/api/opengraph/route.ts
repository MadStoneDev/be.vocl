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
