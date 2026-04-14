import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Processes queued posts based on each user's settings.
// Run every 15 minutes via Vercel cron.
//
// Pacing is computed in the user's timezone:
//   - check `now` is inside [queue_window_start, queue_window_end] in user TZ
//   - target = floor(progress_through_window * queue_posts_per_day)
//   - publishedToday = posts published from queue today (in user TZ)
//   - publish (target - publishedToday) posts, in queue_position order

// Returns { hour, minute, dayKey } as observed in `tz`.
function getTimeInTz(now: Date, tz: string): { hour: number; minute: number; dayKey: string } {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = fmt.formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value || "00";
    const hour = parseInt(get("hour"), 10) % 24;
    const minute = parseInt(get("minute"), 10);
    const dayKey = `${get("year")}-${get("month")}-${get("day")}`;
    return { hour, minute, dayKey };
  } catch {
    // Bad/unknown TZ — fall back to UTC.
    return {
      hour: now.getUTCHours(),
      minute: now.getUTCMinutes(),
      dayKey: now.toISOString().slice(0, 10),
    };
  }
}

// Convert "HH:MM:SS" to total minutes-of-day.
function hmsToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Convert {dayKey, hour, minute} in `tz` back to a UTC Date (used for "todayStart" boundary).
function tzDayStartUtc(dayKey: string, tz: string): Date {
  // Construct a Date for "midnight on dayKey" in `tz`.
  // We approximate by parsing dayKey as UTC midnight, then offsetting by the TZ's offset
  // at that instant. Good enough for pacing — this is not used for compliance/audit.
  const utcMidnight = new Date(`${dayKey}T00:00:00Z`);
  const tzNoon = new Date(`${dayKey}T12:00:00Z`);
  const tzOffsetMs = (() => {
    try {
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const parts = fmt.formatToParts(tzNoon);
      const get = (t: string) => parts.find((p) => p.type === t)?.value || "00";
      const local = Date.UTC(
        parseInt(get("year"), 10),
        parseInt(get("month"), 10) - 1,
        parseInt(get("day"), 10),
        parseInt(get("hour"), 10),
        parseInt(get("minute"), 10),
        parseInt(get("second"), 10)
      );
      // local - utc = offset in ms
      return local - tzNoon.getTime();
    } catch {
      return 0;
    }
  })();
  // utc-midnight-of-dayKey corresponds to local-midnight-of-dayKey + offset
  return new Date(utcMidnight.getTime() - tzOffsetMs);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date();

    let publishedCount = 0;
    const errors: string[] = [];
    const debug: any[] = [];

    const { data: usersWithQueues, error: usersError } = await supabase
      .from("profiles")
      .select("id, queue_enabled, queue_paused, queue_posts_per_day, queue_window_start, queue_window_end, timezone")
      .eq("queue_enabled", true)
      .eq("queue_paused", false);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    for (const user of usersWithQueues || []) {
      try {
        const tz: string = user.timezone || "UTC";
        const windowStart: string = user.queue_window_start || "09:00:00";
        const windowEnd: string = user.queue_window_end || "21:00:00";

        const { hour, minute, dayKey } = getTimeInTz(now, tz);
        const nowMinutes = hour * 60 + minute;
        const startMinutes = hmsToMinutes(windowStart);
        const endMinutes = hmsToMinutes(windowEnd);

        if (nowMinutes < startMinutes || nowMinutes >= endMinutes) {
          continue; // Outside posting window in user's TZ
        }

        const windowDuration = endMinutes - startMinutes;
        const elapsed = nowMinutes - startMinutes;
        const progress = Math.min(elapsed / windowDuration, 1);

        const postsPerDay = user.queue_posts_per_day || 8;
        const targetPostsSoFar = Math.floor(progress * postsPerDay);

        // Count posts published from the queue today (in user TZ)
        const dayStartUtc = tzDayStartUtc(dayKey, tz);
        const { count: publishedToday } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("author_id", user.id)
          .eq("published_from_queue", true)
          .gte("published_at", dayStartUtc.toISOString());

        const actualPublished = publishedToday || 0;
        const toPublish = targetPostsSoFar - actualPublished;

        debug.push({
          user_id: user.id,
          tz,
          local: `${hour}:${minute.toString().padStart(2, "0")}`,
          window: `${windowStart}–${windowEnd}`,
          progress: progress.toFixed(2),
          postsPerDay,
          targetPostsSoFar,
          publishedToday: actualPublished,
          toPublish,
        });

        if (toPublish <= 0) continue;

        const { data: queuedPosts, error: queueError } = await supabase
          .from("posts")
          .select("id, original_post_id, author_id, pending_community_ids")
          .eq("author_id", user.id)
          .eq("status", "queued")
          .order("queue_position", { ascending: true })
          .limit(toPublish);

        if (queueError) {
          errors.push(`User ${user.id}: ${queueError.message}`);
          continue;
        }

        for (const post of queuedPosts || []) {
          const { error: publishError } = await supabase
            .from("posts")
            .update({
              status: "published",
              queue_position: null,
              published_at: new Date().toISOString(),
              published_from_queue: true,
              pending_community_ids: null,
            })
            .eq("id", post.id);

          if (publishError) {
            errors.push(`Post ${post.id}: ${publishError.message}`);
            continue;
          }
          publishedCount++;
          // Apply deferred cross-posts
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
      } catch (userError) {
        errors.push(`User ${user.id}: ${String(userError)}`);
      }
    }

    return NextResponse.json({
      success: true,
      published: publishedCount,
      usersProcessed: usersWithQueues?.length || 0,
      errors: errors.length > 0 ? errors : undefined,
      debug,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Queue processing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
