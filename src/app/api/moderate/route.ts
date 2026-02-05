import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { moderateContent, type ModerationResult } from "@/lib/sightengine/client";
import { validateCsrf } from "@/lib/csrf";

/**
 * Moderate uploaded content
 * Called after upload completes to check for policy violations
 */
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

    const body = await request.json();
    const { contentUrl, contentType } = body;

    if (!contentUrl) {
      return NextResponse.json(
        { error: "contentUrl is required" },
        { status: 400 }
      );
    }

    // Determine content type for moderation
    const mediaType: "image" | "video" =
      contentType?.startsWith("video/") ? "video" : "image";

    // Run moderation
    const result = await moderateContent(contentUrl, mediaType);

    // If flagged, create an auto-moderation report
    if (result.flagged) {
      await (supabase as any).from("reports").insert({
        reporter_id: null, // System report
        reported_user_id: user.id,
        subject: "minor_safety", // Default for auto-moderation
        comments: result.reason,
        source: "auto_moderation",
        status: "pending",
      });
    }

    return NextResponse.json({
      safe: result.safe,
      flagged: result.flagged,
      reason: result.reason,
    });
  } catch (error) {
    console.error("Moderation error:", error);
    // Fail open - don't block on moderation errors
    return NextResponse.json({
      safe: true,
      flagged: false,
      reason: "Moderation check failed",
    });
  }
}
