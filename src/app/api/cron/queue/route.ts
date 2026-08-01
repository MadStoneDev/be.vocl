import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronAuth } from "../_auth";

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
  const authError = verifyCronAuth(request);
  if (authError) return authError;

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

        // Determine whether we're inside the posting window and how far through
        // it we are. Supports a wrap-around window (e.g. 21:00 → 09:00).
        let inWindow: boolean;
        let windowDuration: number;
        let elapsed: number;
        if (endMinutes > startMinutes) {
          inWindow = nowMinutes >= startMinutes && nowMinutes < endMinutes;
          windowDuration = endMinutes - startMinutes;
          elapsed = nowMinutes - startMinutes;
        } else {
          // Window crosses midnight.
          inWindow = nowMinutes >= startMinutes || nowMinutes < endMinutes;
          windowDuration = 1440 - startMinutes + endMinutes;
          elapsed =
            nowMinutes >= startMinutes
              ? nowMinutes - startMinutes
              : 1440 - startMinutes + nowMinutes;
        }
        if (!inWindow || windowDuration <= 0) {
          continue; // Outside posting window in user's TZ (or misconfigured)
        }

        const postsPerDay = user.queue_posts_per_day || 8;
        if (postsPerDay <= 0) continue;

        // Cell-model pacing: the window is divided into `postsPerDay` equal
        // slots (slot k at windowStart + k*interval). A queued post publishes at
        // its slot — NOT the instant it's added — so a post dropped into an empty
        // queue mid-window waits for the next slot instead of firing immediately.
        const interval = windowDuration / postsPerDay; // minutes per slot
        const endGreaterThanStart = endMinutes > startMinutes;
        const nowMsws = elapsed; // minutes since today's window start (wrap-aware)

        // Minutes-since-window-start for an arbitrary instant, in the user's TZ.
        // A prior-day instant clamps to <=0 (eligible from window start) — that's
        // how a genuinely-old post keeps its early slots while a freshly-queued
        // post can't reach back into the morning's already-passed slots.
        const instantMsws = (instant: Date): number => {
          const t = getTimeInTz(instant, tz);
          if (t.dayKey < dayKey) return -1;
          const minOfDay = t.hour * 60 + t.minute;
          if (endGreaterThanStart) return minOfDay - startMinutes;
          return minOfDay >= startMinutes
            ? minOfDay - startMinutes
            : 1440 - startMinutes + minOfDay;
        };

        // Daily cap + spacing anchor both come from today's queue publishes.
        const dayStartUtc = tzDayStartUtc(dayKey, tz);
        const { data: publishedRows } = await supabase
          .from("posts")
          .select("published_at")
          .eq("author_id", user.id)
          .eq("published_from_queue", true)
          .gte("published_at", dayStartUtc.toISOString())
          .order("published_at", { ascending: false });

        const publishedToday = publishedRows?.length || 0;
        if (publishedToday >= postsPerDay) continue; // day's quota already met

        // Head of the queue (publish at most one post per run — never bursts).
        const { data: headRows, error: queueError } = await supabase
          .from("posts")
          .select("id, original_post_id, author_id, pending_community_ids, created_at")
          .eq("author_id", user.id)
          .eq("status", "queued")
          .order("queue_position", { ascending: true })
          .limit(1);

        if (queueError) {
          errors.push(`User ${user.id}: ${queueError.message}`);
          continue;
        }
        const head = headRows?.[0];
        if (!head) continue;

        // Target grid slot for the head post.
        let slotIndex: number;
        let dueMsws: number;
        if (postsPerDay === 1) {
          // Single daily post sits at the window midpoint (matches the list
          // projection). If it was queued after today's midpoint, it rolls over.
          slotIndex = 0;
          dueMsws = windowDuration / 2;
          const createdMsws = Math.max(0, instantMsws(new Date(head.created_at)));
          if (createdMsws > dueMsws + 1e-6) continue;
        } else if (publishedToday > 0) {
          // The slot AFTER the one the previous publish occupied. Anchoring on
          // the slot (not the actual publish minute) keeps a few minutes of cron
          // jitter from drifting posts later and skipping slots over the day.
          const lastPubMsws = instantMsws(new Date(publishedRows![0].published_at));
          slotIndex = Math.floor(lastPubMsws / interval + 1e-6) + 1;
          if (slotIndex > postsPerDay - 1) continue;
          dueMsws = slotIndex * interval;
        } else {
          // First of the day: the first slot at or after when the post was queued
          // — the fix for the immediate-publish bug (a post added mid-window can't
          // reach back into the morning's already-passed slots).
          const createdMsws = Math.max(0, instantMsws(new Date(head.created_at)));
          slotIndex = Math.ceil(createdMsws / interval - 1e-6);
          if (slotIndex > postsPerDay - 1) continue;
          dueMsws = slotIndex * interval;
        }
        if (nowMsws < dueMsws) continue; // this slot hasn't arrived yet

        debug.push({
          user_id: user.id,
          tz,
          local: `${hour}:${minute.toString().padStart(2, "0")}`,
          window: `${windowStart}–${windowEnd}`,
          postsPerDay,
          publishedToday,
          slotIndex,
          dueMinutesIntoWindow: Math.round(dueMsws),
          nowMinutesIntoWindow: Math.round(nowMsws),
        });

        // Stamp both published_at AND created_at to the go-live moment, so the
        // post surfaces fresh (feeds order + display by created_at) rather than
        // buried at its original queue time.
        const publishedAt = new Date().toISOString();
        const { error: publishError } = await supabase
          .from("posts")
          .update({
            status: "published",
            queue_position: null,
            published_at: publishedAt,
            created_at: publishedAt,
            published_from_queue: true,
            pending_community_ids: null,
          })
          .eq("id", head.id);

        if (publishError) {
          errors.push(`Post ${head.id}: ${publishError.message}`);
          continue;
        }
        publishedCount++;

        // Apply deferred cross-posts.
        const pendingCommunityIds = (head as any).pending_community_ids as string[] | null;
        if (pendingCommunityIds && pendingCommunityIds.length > 0) {
          const rows = pendingCommunityIds.map((cid) => ({
            community_id: cid,
            post_id: head.id,
            added_by: head.author_id,
          }));
          const { error: cpError } = await supabase
            .from("community_posts")
            .insert(rows);
          if (cpError) errors.push(`Cross-post ${head.id}: ${cpError.message}`);
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
