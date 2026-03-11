import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@/lib/supabase/server";
import { getR2Client, R2_BUCKET_NAME, R2_PUBLIC_URL, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/lib/r2/client";
import { generateKeys } from "@/lib/r2/presign";
import { rateLimiters, getRateLimitHeaders } from "@/lib/rate-limit";
import { validateCsrf } from "@/lib/csrf";

const MIME_FROM_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

function guessContentType(url: string, responseContentType?: string | null): string | null {
  // Prefer the content-type header if it's a known image type
  if (responseContentType) {
    const mime = responseContentType.split(";")[0].trim().toLowerCase();
    if (ALLOWED_IMAGE_TYPES.includes(mime)) return mime;
  }

  // Fall back to URL extension
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split(".").pop()?.toLowerCase();
    if (ext && MIME_FROM_EXT[ext]) return MIME_FROM_EXT[ext];
  } catch {
    // ignore
  }

  return null;
}

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: share the upload limiter
    const rateLimit = rateLimiters.upload(`upload:${user.id}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many upload requests. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const { url, postId } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    if (!postId || typeof postId !== "string") {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    // Validate URL protocol
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (!parsedUrl.protocol.startsWith("http")) {
      return NextResponse.json({ error: "Only HTTP/HTTPS URLs are supported" }, { status: 400 });
    }

    // Download the image
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "BeVocl/1.0 (Image Proxy)",
        },
      });
    } catch (err) {
      clearTimeout(timeout);
      return NextResponse.json(
        { error: "Failed to download image from URL" },
        { status: 422 }
      );
    }
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to download image (HTTP ${response.status})` },
        { status: 422 }
      );
    }

    // Determine content type
    const responseContentType = response.headers.get("content-type");
    const contentType = guessContentType(url, responseContentType);

    if (!contentType) {
      return NextResponse.json(
        { error: "Could not determine image type. Supported: JPG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    // Read body as buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate size
    if (buffer.length > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: `Image too large. Maximum size is ${Math.round(MAX_IMAGE_SIZE / 1024 / 1024)}MB` },
        { status: 400 }
      );
    }

    if (buffer.length === 0) {
      return NextResponse.json({ error: "Downloaded image is empty" }, { status: 400 });
    }

    // Generate the extension from content type
    const ext = contentType.split("/")[1] === "jpeg" ? "jpg" : contentType.split("/")[1];
    const filename = `linked.${ext}`;

    // Generate R2 key and upload
    const key = generateKeys.postImage(user.id, postId, filename, 0);
    const r2Client = getR2Client();

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({ publicUrl, key, contentType });
  } catch (error) {
    console.error("Upload from URL error:", error);
    return NextResponse.json(
      { error: "Failed to process image" },
      { status: 500 }
    );
  }
}
