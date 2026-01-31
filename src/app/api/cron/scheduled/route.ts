import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Processes scheduled posts that are due
// Run every 5 minutes via cron

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      .select("id, author_id, original_post_id")
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
      const { error: publishError } = await supabase
        .from("posts")
        .update({
          status: "published",
          scheduled_for: null,
          published_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      if (publishError) {
        errors.push(`Post ${post.id}: ${publishError.message}`);
      } else {
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
