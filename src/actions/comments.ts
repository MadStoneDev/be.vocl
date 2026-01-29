"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

interface CommentResult {
  success: boolean;
  commentId?: string;
  error?: string;
}

interface CommentData {
  id: string;
  authorId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
  isOwn: boolean;
}

interface CommentsData {
  success: boolean;
  comments?: CommentData[];
  count?: number;
  hasCommented?: boolean;
  error?: string;
}

/**
 * Create a comment on a post
 */
export async function createComment(
  postId: string,
  content: string
): Promise<CommentResult> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return { success: false, error: "Comment cannot be empty" };
    }

    if (trimmedContent.length > 2000) {
      return { success: false, error: "Comment is too long (max 2000 characters)" };
    }

    // Create the comment
    const { data: comment, error: insertError } = await (supabase as any)
      .from("comments")
      .insert({
        user_id: user.id,
        post_id: postId,
        content_html: trimmedContent, // Plain text for now, can support HTML later
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Create comment error:", insertError);
      return { success: false, error: "Failed to create comment" };
    }

    // Get post author to send notification
    const { data: post } = await (supabase as any)
      .from("posts")
      .select("author_id")
      .eq("id", postId)
      .single();

    // Create notification (don't notify self)
    if (post && post.author_id !== user.id) {
      await (supabase as any)
        .from("notifications")
        .insert({
          recipient_id: post.author_id,
          actor_id: user.id,
          notification_type: "comment",
          post_id: postId,
          comment_id: comment.id,
        });
    }

    revalidatePath("/feed");
    revalidatePath(`/post/${postId}`);
    return { success: true, commentId: comment.id };
  } catch (error) {
    console.error("Create comment error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Delete a comment (only own comments can be deleted)
 */
export async function deleteComment(commentId: string): Promise<CommentResult> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify ownership
    const { data: existingComment } = await (supabase as any)
      .from("comments")
      .select("user_id, post_id")
      .eq("id", commentId)
      .single();

    if (!existingComment) {
      return { success: false, error: "Comment not found" };
    }

    if (existingComment.user_id !== user.id) {
      return { success: false, error: "Cannot delete others' comments" };
    }

    // Delete the comment
    const { error: deleteError } = await (supabase as any)
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (deleteError) {
      console.error("Delete comment error:", deleteError);
      return { success: false, error: "Failed to delete comment" };
    }

    // Delete associated notification
    await (supabase as any)
      .from("notifications")
      .delete()
      .eq("comment_id", commentId);

    revalidatePath("/feed");
    revalidatePath(`/post/${existingComment.post_id}`);
    return { success: true };
  } catch (error) {
    console.error("Delete comment error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get all comments for a post
 */
export async function getCommentsByPost(postId: string): Promise<CommentsData> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get comments with user profiles
    const { data: commentsData, error: commentsError } = await (supabase as any)
      .from("comments")
      .select(
        `
        id,
        user_id,
        content_html,
        created_at,
        profile:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (commentsError) {
      console.error("Get comments error:", commentsError);
      return { success: false, error: "Failed to fetch comments" };
    }

    const comments: CommentData[] = (commentsData || []).map((comment: any) => ({
      id: comment.id,
      authorId: comment.user_id,
      username: comment.profile?.username || "unknown",
      displayName: comment.profile?.display_name,
      avatarUrl: comment.profile?.avatar_url,
      content: comment.content_html,
      createdAt: formatTimeAgo(comment.created_at),
      isOwn: user ? comment.user_id === user.id : false,
    }));

    // Check if current user has commented
    const hasCommented = user
      ? (commentsData || []).some((c: any) => c.user_id === user.id)
      : false;

    return {
      success: true,
      comments,
      count: comments.length,
      hasCommented,
    };
  } catch (error) {
    console.error("Get comments error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get comment count for a post
 */
export async function getCommentCount(postId: string): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();

    const { count, error } = await (supabase as any)
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    if (error) {
      return { success: false, error: "Failed to get count" };
    }

    return { success: true, count: count || 0 };
  } catch (error) {
    console.error("Get comment count error:", error);
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
