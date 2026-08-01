import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "../../cron/_auth";

// DEPRECATED: Use /api/cron/scheduled (every 5 min) and /api/cron/queue (every 15 min) instead
// This endpoint processes both for backwards compatibility

export async function GET(request: Request) {
  // Verify cron secret (fails closed if CRON_SECRET is unset)
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    // Use service role key for admin operations
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

    // Queue pacing now lives solely in /api/cron/queue, which uses timezone-aware
    // cell-model slots and never publishes a freshly-queued post immediately.
    // This deprecated endpoint previously duplicated that with a buggy, server-TZ,
    // catch-up model; it now only fans out due *scheduled* posts (below).

    // Process scheduled posts that are due
    const { data: scheduledPosts, error: scheduledError } = await supabase
      .from("posts")
      .select("id, author_id, original_post_id")
      .eq("status", "scheduled")
      .lte("scheduled_for", now.toISOString());

    if (!scheduledError && scheduledPosts) {
      for (const post of scheduledPosts) {
        const { error: publishError } = await supabase
          .from("posts")
          .update({
            status: "published",
            scheduled_for: null,
            published_at: new Date().toISOString(),
          })
          .eq("id", post.id);

        if (!publishError) {
          publishedCount++;

          // Create notification for original author if it's a reblog
          if (post.original_post_id) {
            const { data: originalPost } = await supabase
              .from("posts")
              .select("author_id")
              .eq("id", post.original_post_id)
              .single();

            if (originalPost && originalPost.author_id !== post.author_id) {
              await supabase.from("notifications").insert({
                recipient_id: originalPost.author_id,
                actor_id: post.author_id,
                notification_type: "reblog",
                post_id: post.id,
              });
            }
          }
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
    console.error("Queue processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: Request) {
  return GET(request);
}
