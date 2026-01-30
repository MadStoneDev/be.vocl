"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

interface ReblogResult {
  success: boolean;
  postId?: string;
  error?: string;
}

type ReblogMode = "instant" | "standard" | "queue" | "schedule";

interface ReblogOptions {
  comment?: string;
  scheduledFor?: string;
}

/**
 * Reblog a post with different modes
 */
export async function reblogPost(
  originalPostId: string,
  mode: ReblogMode,
  options?: ReblogOptions
): Promise<ReblogResult> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get the original post
    const { data: originalPost, error: fetchError } = await (supabase as any)
      .from("posts")
      .select("*, original_post_id")
      .eq("id", originalPostId)
      .single();

    if (fetchError || !originalPost) {
      return { success: false, error: "Post not found" };
    }

    // Determine the true original (for reblog chains)
    const trueOriginalId = originalPost.original_post_id || originalPost.id;

    // Determine status and scheduling
    let status: "published" | "queued" | "scheduled" = "published";
    let queuePosition: number | null = null;
    let scheduledFor: string | null = null;

    if (mode === "queue") {
      status = "queued";
      const { data: nextPos } = await (supabase as any).rpc("get_next_queue_position", {
        p_user_id: user.id,
      });
      queuePosition = nextPos || 1;
    } else if (mode === "schedule" && options?.scheduledFor) {
      status = "scheduled";
      scheduledFor = options.scheduledFor;
    }

    // Create the reblog
    const { data: reblog, error: createError } = await (supabase as any)
      .from("posts")
      .insert({
        author_id: user.id,
        post_type: originalPost.post_type,
        content: originalPost.content,
        is_sensitive: originalPost.is_sensitive,
        original_post_id: trueOriginalId,
        reblogged_from_id: originalPostId,
        reblog_comment_html: options?.comment || null,
        status,
        queue_position: queuePosition,
        scheduled_for: scheduledFor,
        published_at: status === "published" ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (createError) {
      console.error("Reblog error:", createError);
      return { success: false, error: "Failed to reblog" };
    }

    // Create notification for original author (only if published immediately)
    if (status === "published" && originalPost.author_id !== user.id) {
      await (supabase as any).from("notifications").insert({
        recipient_id: originalPost.author_id,
        actor_id: user.id,
        notification_type: "reblog",
        post_id: reblog.id,
      });
    }

    revalidatePath("/feed");
    revalidatePath("/queue");
    return { success: true, postId: reblog.id };
  } catch (error) {
    console.error("Reblog error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get user's queue
 */
export async function getQueue(): Promise<{ success: boolean; posts?: any[]; error?: string }> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data: posts, error } = await (supabase as any)
      .from("posts")
      .select(`
        *,
        original_post:original_post_id (
          id,
          author_id,
          post_type,
          content,
          profiles:author_id (username, avatar_url)
        )
      `)
      .eq("author_id", user.id)
      .eq("status", "queued")
      .order("queue_position", { ascending: true });

    if (error) {
      return { success: false, error: "Failed to fetch queue" };
    }

    return { success: true, posts: posts || [] };
  } catch (error) {
    console.error("Get queue error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Reorder queue items
 */
export async function reorderQueue(
  postIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Update positions
    for (let i = 0; i < postIds.length; i++) {
      await (supabase as any)
        .from("posts")
        .update({ queue_position: i + 1 })
        .eq("id", postIds[i])
        .eq("author_id", user.id)
        .eq("status", "queued");
    }

    revalidatePath("/queue");
    return { success: true };
  } catch (error) {
    console.error("Reorder queue error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Remove item from queue (delete the post)
 */
export async function removeFromQueue(
  postId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await (supabase as any)
      .from("posts")
      .update({ status: "deleted" })
      .eq("id", postId)
      .eq("author_id", user.id)
      .eq("status", "queued");

    if (error) {
      return { success: false, error: "Failed to remove from queue" };
    }

    revalidatePath("/queue");
    return { success: true };
  } catch (error) {
    console.error("Remove from queue error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Publish a queued post immediately
 */
export async function publishNow(
  postId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await (supabase as any)
      .from("posts")
      .update({
        status: "published",
        queue_position: null,
        published_at: new Date().toISOString(),
      })
      .eq("id", postId)
      .eq("author_id", user.id)
      .in("status", ["queued", "scheduled"]);

    if (error) {
      return { success: false, error: "Failed to publish" };
    }

    revalidatePath("/feed");
    revalidatePath("/queue");
    return { success: true };
  } catch (error) {
    console.error("Publish now error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get queue settings for a user
 */
export async function getQueueSettings(): Promise<{
  success: boolean;
  settings?: {
    enabled: boolean;
    paused: boolean;
    postsPerDay: number;
    windowStart: string;
    windowEnd: string;
  };
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data: profile, error } = await (supabase as any)
      .from("profiles")
      .select("queue_enabled, queue_paused, queue_posts_per_day, queue_window_start, queue_window_end")
      .eq("id", user.id)
      .single();

    if (error) {
      return { success: false, error: "Failed to fetch settings" };
    }

    return {
      success: true,
      settings: {
        enabled: profile.queue_enabled ?? true,
        paused: profile.queue_paused ?? false,
        postsPerDay: profile.queue_posts_per_day ?? 8,
        windowStart: profile.queue_window_start?.slice(0, 5) ?? "09:00",
        windowEnd: profile.queue_window_end?.slice(0, 5) ?? "21:00",
      },
    };
  } catch (error) {
    console.error("Get queue settings error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Update queue settings for a user
 */
export async function updateQueueSettings(settings: {
  enabled?: boolean;
  paused?: boolean;
  postsPerDay?: number;
  windowStart?: string;
  windowEnd?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const updateData: any = {};
    if (settings.enabled !== undefined) updateData.queue_enabled = settings.enabled;
    if (settings.paused !== undefined) updateData.queue_paused = settings.paused;
    if (settings.postsPerDay !== undefined) updateData.queue_posts_per_day = settings.postsPerDay;
    if (settings.windowStart !== undefined) updateData.queue_window_start = settings.windowStart;
    if (settings.windowEnd !== undefined) updateData.queue_window_end = settings.windowEnd;

    const { error } = await (supabase as any)
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (error) {
      return { success: false, error: "Failed to update settings" };
    }

    revalidatePath("/queue");
    revalidatePath("/settings/queue");
    return { success: true };
  } catch (error) {
    console.error("Update queue settings error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get users who have reblogged a post
 */
export async function getRebloggedBy(
  postId: string,
  options?: { limit?: number }
): Promise<{
  success: boolean;
  users?: Array<{
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  }>;
  total?: number;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const limit = options?.limit || 10;

    // Get posts that reblogged this post (or have it as original)
    const { data: reblogs, error, count } = await (supabase as any)
      .from("posts")
      .select(
        `
        author_id,
        author:author_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `,
        { count: "exact" }
      )
      .eq("reblogged_from_id", postId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Get reblogged by error:", error);
      return { success: false, error: "Failed to fetch rebloggers" };
    }

    // Extract unique users
    const seenIds = new Set<string>();
    const users = (reblogs || [])
      .filter((r: any) => {
        if (!r.author || seenIds.has(r.author.id)) return false;
        seenIds.add(r.author.id);
        return true;
      })
      .map((r: any) => ({
        id: r.author.id,
        username: r.author.username,
        displayName: r.author.display_name,
        avatarUrl: r.author.avatar_url,
      }));

    return {
      success: true,
      users,
      total: count || 0,
    };
  } catch (error) {
    console.error("Get reblogged by error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
