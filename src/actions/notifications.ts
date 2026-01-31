"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type NotificationType = "follow" | "like" | "comment" | "reblog" | "mention" | "message";

interface Notification {
  id: string;
  type: NotificationType;
  actor: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  postId?: string;
  postPreview?: string;
  commentId?: string;
  content?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationResult {
  success: boolean;
  error?: string;
}

/**
 * Get notifications for current user
 */
export async function getNotifications(
  limit = 50,
  offset = 0
): Promise<{
  success: boolean;
  notifications?: Notification[];
  unreadCount?: number;
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

    // Get notifications with actor profile
    const { data, error } = await (supabase as any)
      .from("notifications")
      .select(
        `
        id,
        notification_type,
        post_id,
        comment_id,
        message_id,
        is_read,
        created_at,
        actor:actor_id (
          id,
          username,
          avatar_url
        ),
        post:post_id (
          content
        ),
        comment:comment_id (
          content_html
        )
      `
      )
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Get notifications error:", error);
      return { success: false, error: "Failed to fetch notifications" };
    }

    // Get unread count
    const { count: unreadCount } = await (supabase as any)
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false);

    // Transform notifications
    const notifications: Notification[] = (data || []).map((n: any) => {
      // Extract post preview text
      let postPreview: string | undefined;
      if (n.post?.content) {
        if (typeof n.post.content === "string") {
          postPreview = n.post.content.slice(0, 100);
        } else if (n.post.content.text) {
          postPreview = n.post.content.text.slice(0, 100);
        }
      }

      // Extract comment content
      let content: string | undefined;
      if (n.comment?.content_html) {
        // Strip HTML tags for preview
        content = n.comment.content_html.replace(/<[^>]*>/g, "").slice(0, 100);
      }

      return {
        id: n.id,
        type: n.notification_type as NotificationType,
        actor: {
          id: n.actor?.id || "",
          username: n.actor?.username || "unknown",
          avatarUrl: n.actor?.avatar_url,
        },
        postId: n.post_id,
        postPreview,
        commentId: n.comment_id,
        content,
        isRead: n.is_read,
        createdAt: formatTimeAgo(n.created_at),
      };
    });

    return {
      success: true,
      notifications,
      unreadCount: unreadCount || 0,
    };
  } catch (error) {
    console.error("Get notifications error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<{
  success: boolean;
  count?: number;
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

    const { count, error } = await (supabase as any)
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false);

    if (error) {
      return { success: false, error: "Failed to get count" };
    }

    return { success: true, count: count || 0 };
  } catch (error) {
    console.error("Get unread count error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<NotificationResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await (supabase as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("recipient_id", user.id);

    if (error) {
      return { success: false, error: "Failed to mark as read" };
    }

    revalidatePath("/notifications");
    return { success: true };
  } catch (error) {
    console.error("Mark as read error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<NotificationResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await (supabase as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false);

    if (error) {
      return { success: false, error: "Failed to mark all as read" };
    }

    revalidatePath("/notifications");
    return { success: true };
  } catch (error) {
    console.error("Mark all as read error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<NotificationResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await (supabase as any)
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("recipient_id", user.id);

    if (error) {
      return { success: false, error: "Failed to delete notification" };
    }

    revalidatePath("/notifications");
    return { success: true };
  } catch (error) {
    console.error("Delete notification error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<NotificationResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await (supabase as any)
      .from("notifications")
      .delete()
      .eq("recipient_id", user.id);

    if (error) {
      return { success: false, error: "Failed to clear notifications" };
    }

    revalidatePath("/notifications");
    return { success: true };
  } catch (error) {
    console.error("Clear notifications error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Helper to format time ago
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
