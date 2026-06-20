import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generatePresignedUrl,
  generateKeys,
} from "@/lib/r2/presign";
import {
  ALL_ALLOWED_TYPES,
  getMaxSizeForType,
  getMediaType,
} from "@/lib/r2/client";
import { rateLimiters, getRateLimitHeaders } from "@/lib/rate-limit";
import { validateCsrf } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  // CSRF protection
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

    // Rate limit: 50 uploads per hour per user
    const rateLimit = rateLimiters.upload(`upload:${user.id}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many upload requests. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const { filename, contentType, uploadType, postId, messageId, conversationId, index, fileSize } = body;

    // Validate content type
    if (!ALL_ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid file type" },
        { status: 400 }
      );
    }

    // Validate declared file size against the per-type limit (SEC-14).
    // When the client declares `fileSize`, we (a) reject over-limit uploads here
    // and (b) bind the size into the presigned URL's signature (see
    // generatePresignedUrl), so the issued URL cannot be used to upload more
    // bytes than declared/allowed.
    //
    // `fileSize` is optional for backwards compatibility with existing clients
    // that don't send it yet; when omitted the limit is advisory only. Clients
    // SHOULD send fileSize (= File.size) so the limit is hard-enforced.
    const maxSize = getMaxSizeForType(contentType);
    let declaredSize: number | undefined;
    if (fileSize !== undefined && fileSize !== null) {
      if (typeof fileSize !== "number" || !Number.isFinite(fileSize) || fileSize <= 0) {
        return NextResponse.json({ error: "Invalid fileSize" }, { status: 400 });
      }
      if (fileSize > maxSize) {
        return NextResponse.json(
          { error: `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB` },
          { status: 400 }
        );
      }
      declaredSize = fileSize;
    }

    // Generate appropriate key based on upload type
    let key: string;
    switch (uploadType) {
      case "avatar":
        key = generateKeys.avatar(user.id, filename);
        break;
      case "header":
        key = generateKeys.header(user.id, filename);
        break;
      case "post-image":
        if (!postId) {
          return NextResponse.json(
            { error: "postId required for post uploads" },
            { status: 400 }
          );
        }
        key = generateKeys.postImage(user.id, postId, filename, index || 0);
        break;
      case "post-video":
        if (!postId) {
          return NextResponse.json(
            { error: "postId required for post uploads" },
            { status: 400 }
          );
        }
        key = generateKeys.postVideo(user.id, postId, filename);
        break;
      case "post-audio":
        if (!postId) {
          return NextResponse.json(
            { error: "postId required for post uploads" },
            { status: 400 }
          );
        }
        key = generateKeys.postAudio(user.id, postId, filename);
        break;
      case "chat-media":
        if (!conversationId || !messageId) {
          return NextResponse.json(
            { error: "conversationId and messageId required for chat uploads" },
            { status: 400 }
          );
        }
        key = generateKeys.chatMedia(conversationId, messageId, filename);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid upload type" },
          { status: 400 }
        );
    }

    const { uploadUrl, publicUrl } = await generatePresignedUrl(key, contentType, {
      contentLength: declaredSize,
      maxSize,
    });

    return NextResponse.json({
      uploadUrl,
      key,
      publicUrl,
      maxSize,
      mediaType: getMediaType(contentType),
    });
  } catch (error) {
    console.error("Presign error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
