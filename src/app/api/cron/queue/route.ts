import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Processes queue posts based on each user's settings
// Run every 15 minutes via cron (queue posts spread throughout the day)

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
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}:00`;

    let publishedCount = 0;
    const errors: string[] = [];

    // Get all users with active queues
    const { data: usersWithQueues, error: usersError } = await supabase
      .from("profiles")
      .select("id, queue_enabled, queue_paused, queue_posts_per_day, queue_window_start, queue_window_end, timezone")
      .eq("queue_enabled", true)
      .eq("queue_paused", false);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    for (const user of usersWithQueues || []) {
      try {
        // Check if current time is within user's queue window
        const windowStart = user.queue_window_start || "09:00:00";
        const windowEnd = user.queue_window_end || "21:00:00";

        if (currentTimeStr < windowStart || currentTimeStr > windowEnd) {
          continue; // Outside posting window
        }

        // Calculate how many posts should have been published by now today
        const windowStartDate = new Date(now);
        const [startHour, startMinute] = windowStart.split(":").map(Number);
        windowStartDate.setHours(startHour, startMinute, 0, 0);

        const windowEndDate = new Date(now);
        const [endHour, endMinute] = windowEnd.split(":").map(Number);
        windowEndDate.setHours(endHour, endMinute, 0, 0);

        const windowDuration = windowEndDate.getTime() - windowStartDate.getTime();
        const elapsed = now.getTime() - windowStartDate.getTime();
        const progress = Math.min(elapsed / windowDuration, 1);

        const postsPerDay = user.queue_posts_per_day || 8;
        const targetPostsSoFar = Math.floor(progress * postsPerDay);

        // Get count of posts published today from queue
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const { count: publishedToday } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("author_id", user.id)
          .gte("published_at", todayStart.toISOString())
          .not("original_post_id", "is", null); // Only count reblogs (queue items)

        const actualPublished = publishedToday || 0;
        const toPublish = targetPostsSoFar - actualPublished;

        if (toPublish <= 0) {
          continue; // Already on track
        }

        // Get next posts from queue
        const { data: queuedPosts, error: queueError } = await supabase
          .from("posts")
          .select("id, original_post_id, author_id")
          .eq("author_id", user.id)
          .eq("status", "queued")
          .order("queue_position", { ascending: true })
          .limit(toPublish);

        if (queueError) {
          errors.push(`User ${user.id}: ${queueError.message}`);
          continue;
        }

        // Publish each post
        for (const post of queuedPosts || []) {
          const { error: publishError } = await supabase
            .from("posts")
            .update({
              status: "published",
              queue_position: null,
              published_at: new Date().toISOString(),
            })
            .eq("id", post.id);

          if (publishError) {
            errors.push(`Post ${post.id}: ${publishError.message}`);
          } else {
            publishedCount++;

            // Create notification for original author
            if (post.original_post_id) {
              const { data: originalPost } = await supabase
                .from("posts")
                .select("author_id")
                .eq("id", post.original_post_id)
                .single();

              if (originalPost && originalPost.author_id !== user.id) {
                await supabase.from("notifications").insert({
                  recipient_id: originalPost.author_id,
                  actor_id: user.id,
                  notification_type: "reblog",
                  post_id: post.id,
                });
              }
            }
          }
        }
      } catch (userError) {
        errors.push(`User ${user.id}: ${String(userError)}`);
      }
    }

    return NextResponse.json({
      success: true,
      published: publishedCount,
      usersProcessed: usersWithQueues?.length || 0,
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

export async function POST(request: Request) {
  return GET(request);
}
