import { createHash } from "crypto";
import { NextResponse } from "next/server";

/**
 * Neutral-named, same-origin analytics proxy for OpenPanel.
 *
 * OpenPanel's own route handler hardcodes the script name `op1.js`, which privacy
 * blocklists (EasyPrivacy etc.) match even when it's served first-party — so
 * uBlock/Brave block it. This proxy serves the identical tracker under a bland
 * name (`/api/i/s.js`) and ingests events at `/api/i/…`, which the lists don't
 * recognise, restoring the accuracy that first-party tracking is supposed to buy.
 *
 * Behaviour mirrors @openpanel/nextjs/server's createRouteHandler exactly (script
 * fetched from the OpenPanel CDN + cached 24h; events forwarded to the self-hosted
 * instance with the real client IP preserved). OPENPANEL_API_URL = the instance API.
 */

const OP_SCRIPT_CDN = "https://openpanel.dev/op1.js";
const UPSTREAM = process.env.OPENPANEL_API_URL || "https://api.openpanel.dev";
const SCRIPT_FILENAME = "s.js"; // deliberately generic — must match Analytics.tsx scriptUrl

async function serveScript(url: URL): Promise<Response> {
  const cdn = url.searchParams.size > 0
    ? `${OP_SCRIPT_CDN}?${url.searchParams.toString()}`
    : OP_SCRIPT_CDN;
  try {
    const js = await (await fetch(cdn, { next: { revalidate: 86400 } })).text();
    const etag = `"${createHash("md5").update(cdn + js).digest("hex")}"`;
    return new NextResponse(js, {
      headers: {
        "Content-Type": "text/javascript",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=86400",
        ETag: etag,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch script", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

/** Forward the real client IP + identifying headers upstream (as createRouteHandler does). */
function upstreamHeaders(req: Request): Headers {
  const h = new Headers();
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0] ??
    req.headers.get("x-vercel-forwarded-for");
  h.set("Content-Type", "application/json");
  h.set("openpanel-client-id", req.headers.get("openpanel-client-id") ?? "");
  const origin =
    req.headers.get("origin") ??
    (() => {
      const u = new URL(req.url);
      return `${u.protocol}//${u.host}`;
    })();
  h.set("origin", origin);
  h.set("User-Agent", req.headers.get("user-agent") ?? "");
  if (ip) h.set("openpanel-client-ip", ip);
  return h;
}

async function proxy(req: Request, path: string): Promise<Response> {
  try {
    const res = await fetch(`${UPSTREAM}${path}`, {
      method: req.method,
      headers: upstreamHeaders(req),
      body: req.method === "POST" ? JSON.stringify(await req.json()) : undefined,
    });
    const contentType = res.headers.get("content-type");
    return contentType?.includes("application/json")
      ? NextResponse.json(await res.json(), { status: res.status })
      : NextResponse.json(await res.text(), { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to proxy request", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname.endsWith(`/${SCRIPT_FILENAME}`)) {
    return serveScript(url);
  }
  // Ingest: op1.js posts to `${apiUrl}/track`; forward the `/track…` tail upstream.
  const idx = url.pathname.indexOf("/track");
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return proxy(req, url.pathname.substring(idx));
}

export { handler as GET, handler as POST };
