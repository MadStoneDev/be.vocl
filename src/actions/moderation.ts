"use server";

import { createClient } from "@/lib/supabase/server";
import { moderateContent } from "@/lib/sightengine/client";
import { ROLES } from "@/constants/roles";
import type { FlagSubject } from "@/types/database";

interface ModerationCheckResult {
  safe: boolean;
  flagged: boolean;
  reason?: string;
  suggestSensitive: boolean;
  sensitiveReason?: string;
}

/**
 * Check content for moderation issues
 * Used during post creation to scan images/videos
 *
 * Returns:
 * - flagged: true if content should be blocked (child safety, extreme gore)
 * - suggestSensitive: true if content should be auto-tagged as sensitive
 */
export async function checkContentModeration(
  contentUrls: string[],
  contentTypes: ("image" | "video")[]
): Promise<ModerationCheckResult> {
  try {
    let anySuggestSensitive = false;
    const sensitiveReasons: string[] = [];

    for (let i = 0; i < contentUrls.length; i++) {
      const result = await moderateContent(
        contentUrls[i],
        contentTypes[i] || "image"
      );

      // If flagged (child safety or extreme gore), block immediately
      if (result.flagged) {
        return {
          safe: false,
          flagged: true,
          reason: result.reason,
          suggestSensitive: true,
          sensitiveReason: result.sensitiveReason,
        };
      }

      // Track if any content suggests sensitive tagging
      if (result.suggestSensitive) {
        anySuggestSensitive = true;
        if (result.sensitiveReason) {
          sensitiveReasons.push(result.sensitiveReason);
        }
      }
    }

    return {
      safe: true,
      flagged: false,
      suggestSensitive: anySuggestSensitive,
      sensitiveReason: sensitiveReasons.length > 0
        ? [...new Set(sensitiveReasons)].join(', ')
        : undefined,
    };
  } catch (error) {
    console.error("Content moderation check error:", error);
    // Fail open to not block legitimate content
    return {
      safe: true,
      flagged: false,
      suggestSensitive: false,
      reason: "Moderation check failed",
    };
  }
}

/**
 * Auto-flag a post for moderation review (used by content moderation system)
 * Creates a Flag (not a Report) since it's against a post
 */
export async function autoFlagPost(
  postId: string,
  reason: string,
  subject: FlagSubject = "minor_safety"
): Promise<{ success: boolean; flagId?: string; error?: string }> {
  try {
    const supabase = await createClient();

    // Get post info
    const { data: post, error: postError } = await (supabase as any)
      .from("posts")
      .select("author_id")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      return { success: false, error: "Post not found" };
    }

    // Update post moderation status
    await (supabase as any)
      .from("posts")
      .update({
        moderation_status: "flagged",
        moderation_reason: reason,
        moderated_at: new Date().toISOString(),
      })
      .eq("id", postId);

    // Create flag (not report - flags are for posts)
    const { data: flag, error } = await (supabase as any)
      .from("flags")
      .insert({
        flagger_id: null, // Auto-moderation has no flagger
        post_id: postId,
        subject,
        comments: `[Auto-moderation] ${reason}`,
        status: "pending",
        assigned_role: ROLES.JUNIOR_MOD,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Create flag error:", error);
      return { success: false, error: "Failed to create flag" };
    }

    // Notify staff
    await notifyStaffOfFlaggedContent(postId, ROLES.JUNIOR_MOD);

    return { success: true, flagId: flag.id };
  } catch (error) {
    console.error("Auto-flag post error:", error);
    return { success: false, error: "Failed to flag post" };
  }
}

/**
 * @deprecated Use autoFlagPost instead
 * Kept for backwards compatibility
 */
export async function flagPostForReview(
  postId: string,
  reason: string,
  source: "auto_moderation" | "user_report" = "auto_moderation"
): Promise<{ success: boolean; error?: string }> {
  return autoFlagPost(postId, reason);
}

/**
 * Notify staff of flagged content
 */
async function notifyStaffOfFlaggedContent(
  postId: string,
  roleLevel: number
): Promise<void> {
  try {
    const supabase = await createClient();

    // Get staff at or above the role level
    const { data: staff } = await (supabase as any)
      .from("profiles")
      .select("id")
      .gte("role", roleLevel);

    if (!staff || staff.length === 0) return;

    // Create in-app notification for each staff member
    const notifications = staff.map((s: any) => ({
      recipient_id: s.id,
      notification_type: "mention", // Reusing mention type for moderation alerts
      post_id: postId,
      is_read: false,
    }));

    await (supabase as any).from("notifications").insert(notifications);
  } catch (error) {
    console.error("Staff notification error:", error);
  }
}

/**
 * Get user's pending reports (for showing warning banner)
 */
export async function getUserPendingReports(): Promise<{
  success: boolean;
  hasPendingReports: boolean;
  count?: number;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, hasPendingReports: false };
    }

    const { count, error } = await (supabase as any)
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("reported_user_id", user.id)
      .in("status", ["pending", "reviewing", "escalated"]);

    if (error) {
      return { success: false, hasPendingReports: false };
    }

    return {
      success: true,
      hasPendingReports: (count || 0) > 0,
      count: count || 0,
    };
  } catch (error) {
    return { success: false, hasPendingReports: false };
  }
}
