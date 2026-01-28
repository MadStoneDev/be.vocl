import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  generatePresignedUrl,
  generateKeys,
} from "@/lib/r2/presign";
import {
  ALL_ALLOWED_TYPES,
  getMaxSizeForType,
  getMediaType,
} from "@/lib/r2/client";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { filename, contentType, uploadType, postId, messageId, conversationId, index } = body;

    // Validate content type
    if (!ALL_ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid file type" },
        { status: 400 }
      );
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

    const { uploadUrl, publicUrl } = await generatePresignedUrl(key, contentType);

    return NextResponse.json({
      uploadUrl,
      key,
      publicUrl,
      maxSize: getMaxSizeForType(contentType),
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
