import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "../_auth";

// Processes scheduled posts that are due
// Run every 5 minutes via cron

export async function GET(request: Request) {
  // Verify cron secret (fails closed if CRON_SECRET is unset)
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date();
    let publishedCount = 0;
    const errors: string[] = [];

    // Get all scheduled posts that are due
    const { data: scheduledPosts, error: scheduledError } = await supabase
      .from("posts")
      .select("id, author_id, original_post_id, pending_community_ids")
      .eq("status", "scheduled")
      .lte("scheduled_for", now.toISOString());

    if (scheduledError) {
      console.error("Error fetching scheduled posts:", scheduledError);
      return NextResponse.json(
        { error: "Failed to fetch scheduled posts" },
        { status: 500 }
      );
    }

    for (const post of scheduledPosts || []) {
      // Surface the post fresh at its go-live moment (feeds order + display by
      // created_at), not buried at the time it was originally composed.
      const publishedAt = new Date().toISOString();
      // Compare-and-swap: only publish if the row is STILL scheduled. Two
      // overlapping cron runs (retry, manual "Run", overlapping ticks) can both
      // select the same due post; the `.eq("status","scheduled")` guard means
      // only the first one actually flips it — the other claims 0 rows and skips,
      // so the post can't be published or cross-posted twice.
      const { data: claimed, error: publishError } = await supabase
        .from("posts")
        .update({
          status: "published",
          scheduled_for: null,
          published_at: publishedAt,
          created_at: publishedAt,
          pending_community_ids: null,
        })
        .eq("id", post.id)
        .eq("status", "scheduled")
        .select("id");

      if (publishError) {
        errors.push(`Post ${post.id}: ${publishError.message}`);
      } else if (claimed && claimed.length > 0) {
        publishedCount++;
        const pendingCommunityIds = (post as any).pending_community_ids as string[] | null;
        if (pendingCommunityIds && pendingCommunityIds.length > 0) {
          const rows = pendingCommunityIds.map((cid) => ({
            community_id: cid,
            post_id: post.id,
            added_by: post.author_id,
          }));
          const { error: cpError } = await supabase
            .from("community_posts")
            .insert(rows);
          if (cpError) errors.push(`Cross-post ${post.id}: ${cpError.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      published: publishedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Scheduled posts processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
