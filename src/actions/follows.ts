"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface FollowResult {
  success: boolean;
  error?: string;
}

/**
 * Follow a user
 */
export async function followUser(targetUserId: string): Promise<FollowResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    if (user.id === targetUserId) {
      return { success: false, error: "Cannot follow yourself" };
    }

    // Check if already following
    const { data: existing } = await (supabase as any)
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId)
      .single();

    if (existing) {
      return { success: false, error: "Already following" };
    }

    // Check if blocked
    const { data: blocked } = await (supabase as any)
      .from("blocks")
      .select("blocker_id")
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`)
      .or(`blocker_id.eq.${targetUserId},blocked_id.eq.${targetUserId}`)
      .limit(1);

    if (blocked && blocked.length > 0) {
      return { success: false, error: "Unable to follow this user" };
    }

    // Create follow
    const { error: followError } = await (supabase as any)
      .from("follows")
      .insert({
        follower_id: user.id,
        following_id: targetUserId,
      });

    if (followError) {
      console.error("Follow error:", followError);
      return { success: false, error: "Failed to follow" };
    }

    // Create notification
    await (supabase as any).from("notifications").insert({
      recipient_id: targetUserId,
      actor_id: user.id,
      notification_type: "follow",
    });

    revalidatePath("/profile/[username]", "page");
    return { success: true };
  } catch (error) {
    console.error("Follow error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(targetUserId: string): Promise<FollowResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await (supabase as any)
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId);

    if (error) {
      console.error("Unfollow error:", error);
      return { success: false, error: "Failed to unfollow" };
    }

    revalidatePath("/profile/[username]", "page");
    return { success: true };
  } catch (error) {
    console.error("Unfollow error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Check if current user is following target user
 */
export async function isFollowing(targetUserId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const { data } = await (supabase as any)
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId)
      .single();

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Get followers for a user
 */
export async function getFollowers(
  userId: string,
  limit = 20,
  offset = 0
): Promise<{ success: boolean; followers?: any[]; total?: number; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error, count } = await (supabase as any)
      .from("follows")
      .select(
        `
        id,
        created_at,
        follower:follower_id (
          id,
          username,
          display_name,
          avatar_url,
          bio
        )
      `,
        { count: "exact" }
      )
      .eq("following_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { success: false, error: "Failed to fetch followers" };
    }

    return {
      success: true,
      followers: data?.map((f: any) => f.follower) || [],
      total: count || 0,
    };
  } catch (error) {
    console.error("Get followers error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get users that a user is following
 */
export async function getFollowing(
  userId: string,
  limit = 20,
  offset = 0
): Promise<{ success: boolean; following?: any[]; total?: number; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error, count } = await (supabase as any)
      .from("follows")
      .select(
        `
        id,
        created_at,
        following:following_id (
          id,
          username,
          display_name,
          avatar_url,
          bio
        )
      `,
        { count: "exact" }
      )
      .eq("follower_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { success: false, error: "Failed to fetch following" };
    }

    return {
      success: true,
      following: data?.map((f: any) => f.following) || [],
      total: count || 0,
    };
  } catch (error) {
    console.error("Get following error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Block a user
 */
export async function blockUser(targetUserId: string): Promise<FollowResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Remove any existing follow relationships
    await (supabase as any)
      .from("follows")
      .delete()
      .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`)
      .or(`follower_id.eq.${targetUserId},following_id.eq.${targetUserId}`);

    // Create block
    const { error } = await (supabase as any).from("blocks").insert({
      blocker_id: user.id,
      blocked_id: targetUserId,
    });

    if (error) {
      return { success: false, error: "Failed to block user" };
    }

    revalidatePath("/profile/[username]", "page");
    return { success: true };
  } catch (error) {
    console.error("Block error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Unblock a user
 */
export async function unblockUser(targetUserId: string): Promise<FollowResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await (supabase as any)
      .from("blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", targetUserId);

    if (error) {
      return { success: false, error: "Failed to unblock user" };
    }

    return { success: true };
  } catch (error) {
    console.error("Unblock error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Check if current user is following multiple users (batch)
 */
export async function getFollowStatusBatch(
  userIds: string[]
): Promise<{ success: boolean; followingIds?: string[]; error?: string }> {
  try {
    if (userIds.length === 0) {
      return { success: true, followingIds: [] };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: true, followingIds: [] };
    }

    const { data, error } = await (supabase as any)
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .in("following_id", userIds);

    if (error) {
      console.error("Get follow status batch error:", error);
      return { success: false, error: "Failed to check follow status" };
    }

    return {
      success: true,
      followingIds: data?.map((f: any) => f.following_id) || [],
    };
  } catch (error) {
    console.error("Get follow status batch error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Mute a user
 */
export async function muteUser(targetUserId: string): Promise<FollowResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await (supabase as any).from("mutes").insert({
      muter_id: user.id,
      muted_id: targetUserId,
    });

    if (error) {
      return { success: false, error: "Failed to mute user" };
    }

    return { success: true };
  } catch (error) {
    console.error("Mute error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Unmute a user
 */
export async function unmuteUser(targetUserId: string): Promise<FollowResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await (supabase as any)
      .from("mutes")
      .delete()
      .eq("muter_id", user.id)
      .eq("muted_id", targetUserId);

    if (error) {
      return { success: false, error: "Failed to unmute user" };
    }

    return { success: true };
  } catch (error) {
    console.error("Unmute error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
