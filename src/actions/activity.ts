"use server";

import { createClient } from "@/lib/supabase/server";

export interface ActivityItem {
  id: string;
  type: "like" | "comment" | "reblog" | "follow" | "mention";
  actorUsername: string;
  actorAvatarUrl?: string;
  postId?: string;
  content?: string;
  createdAt: string;
}

export interface ActivityStats {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalReblogs: number;
  recentActivity: ActivityItem[];
}

export async function getActivityStats(): Promise<{
  success: boolean;
  data?: ActivityStats;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get aggregate stats from user's published posts
    const { data: posts, error: postsError } = await (supabase as any)
      .from("posts")
      .select("like_count, comment_count, reblog_count")
      .eq("author_id", user.id)
      .eq("is_deleted", false)
      .eq("status", "published");

    if (postsError) {
      console.error("Activity stats error:", postsError);
      return { success: false, error: "Failed to fetch activity stats" };
    }

    const totalPosts = posts?.length || 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalReblogs = 0;

    for (const post of posts || []) {
      totalLikes += post.like_count || 0;
      totalComments += post.comment_count || 0;
      totalReblogs += post.reblog_count || 0;
    }

    // Get recent notifications as activity feed
    const { data: notifications, error: notifError } = await (supabase as any)
      .from("notifications")
      .select(
        `
        id,
        notification_type,
        post_id,
        is_read,
        created_at,
        actor:actor_id (
          id,
          username,
          avatar_url
        ),
        comment:comment_id (
          content_html
        )
      `
      )
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (notifError) {
      console.error("Activity feed error:", notifError);
    }

    const recentActivity: ActivityItem[] = (notifications || []).map(
      (n: any) => {
        let content: string | undefined;
        if (n.comment?.content_html) {
          content = n.comment.content_html
            .replace(/<[^>]*>/g, "")
            .slice(0, 100);
        }

        return {
          id: n.id,
          type: n.notification_type as ActivityItem["type"],
          actorUsername: n.actor?.username || "unknown",
          actorAvatarUrl: n.actor?.avatar_url,
          postId: n.post_id,
          content,
          createdAt: formatTimeAgo(n.created_at),
        };
      }
    );

    return {
      success: true,
      data: {
        totalPosts,
        totalLikes,
        totalComments,
        totalReblogs,
        recentActivity,
      },
    };
  } catch (error) {
    console.error("Activity stats error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
