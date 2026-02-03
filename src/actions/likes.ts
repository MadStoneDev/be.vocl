"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface LikeResult {
  success: boolean;
  liked?: boolean;
  error?: string;
}

interface LikesData {
  success: boolean;
  likes?: Array<{
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: number;
  }>;
  count?: number;
  hasLiked?: boolean;
  error?: string;
}

/**
 * Toggle like on a post (like if not liked, unlike if already liked)
 */
export async function toggleLike(postId: string): Promise<LikeResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user already liked the post
    const { data: existingLike } = await (supabase as any)
      .from("likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .single();

    if (existingLike) {
      // Unlike: remove the like
      const { error: deleteError } = await (supabase as any)
        .from("likes")
        .delete()
        .eq("id", existingLike.id);

      if (deleteError) {
        console.error("Unlike error:", deleteError);
        return { success: false, error: "Failed to unlike" };
      }

      // Remove like notification
      await (supabase as any)
        .from("notifications")
        .delete()
        .eq("actor_id", user.id)
        .eq("post_id", postId)
        .eq("notification_type", "like");

      revalidatePath("/feed");
      return { success: true, liked: false };
    } else {
      // Like: create the like
      const { error: insertError } = await (supabase as any)
        .from("likes")
        .insert({
          user_id: user.id,
          post_id: postId,
        });

      if (insertError) {
        console.error("Like error:", insertError);
        return { success: false, error: "Failed to like" };
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
            notification_type: "like",
            post_id: postId,
          });
      }

      revalidatePath("/feed");
      return { success: true, liked: true };
    }
  } catch (error) {
    console.error("Toggle like error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get all likes for a post with user details
 */
export async function getLikesByPost(postId: string): Promise<LikesData> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get likes with user profiles
    const { data: likesData, error: likesError } = await (supabase as any)
      .from("likes")
      .select(
        `
        id,
        user_id,
        created_at,
        profile:user_id (
          id,
          username,
          display_name,
          avatar_url,
          role
        )
      `
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: false });

    if (likesError) {
      console.error("Get likes error:", likesError);
      return { success: false, error: "Failed to fetch likes" };
    }

    const likes = (likesData || []).map((like: any) => ({
      id: like.profile?.id || like.user_id,
      username: like.profile?.username || "unknown",
      displayName: like.profile?.display_name,
      avatarUrl: like.profile?.avatar_url,
      role: like.profile?.role || 0,
    }));

    // Check if current user has liked
    const hasLiked = user
      ? (likesData || []).some((like: any) => like.user_id === user.id)
      : false;

    return {
      success: true,
      likes,
      count: likes.length,
      hasLiked,
    };
  } catch (error) {
    console.error("Get likes error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Check if current user has liked a post
 */
export async function hasUserLiked(postId: string): Promise<{
  success: boolean;
  hasLiked?: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: true, hasLiked: false };
    }

    const { data } = await (supabase as any)
      .from("likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .single();

    return { success: true, hasLiked: !!data };
  } catch (error) {
    console.error("Check like error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
