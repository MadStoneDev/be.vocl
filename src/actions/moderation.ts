"use server";

import { createServerClient } from "@/lib/supabase/server";
import { moderateContent } from "@/lib/sightengine/client";

interface ModerationCheckResult {
  safe: boolean;
  flagged: boolean;
  reason?: string;
}

/**
 * Check content for moderation issues
 * Used during post creation to scan images/videos
 */
export async function checkContentModeration(
  contentUrls: string[],
  contentTypes: ("image" | "video")[]
): Promise<ModerationCheckResult> {
  try {
    for (let i = 0; i < contentUrls.length; i++) {
      const result = await moderateContent(
        contentUrls[i],
        contentTypes[i] || "image"
      );

      if (result.flagged) {
        return {
          safe: false,
          flagged: true,
          reason: result.reason,
        };
      }
    }

    return {
      safe: true,
      flagged: false,
    };
  } catch (error) {
    console.error("Content moderation check error:", error);
    // Fail open to not block legitimate content
    return {
      safe: true,
      flagged: false,
      reason: "Moderation check failed",
    };
  }
}

/**
 * Flag a post for moderation review
 */
export async function flagPostForReview(
  postId: string,
  reason: string,
  source: "auto_moderation" | "user_report" = "auto_moderation"
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get post author
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

    // Create report
    await (supabase as any).from("reports").insert({
      reporter_id: source === "user_report" ? user?.id : null,
      reported_user_id: post.author_id,
      post_id: postId,
      subject: "minor_safety",
      comments: reason,
      source,
      status: "pending",
    });

    // Notify admins via email
    await notifyAdminsOfFlaggedContent(postId, post.author_id, reason);

    return { success: true };
  } catch (error) {
    console.error("Flag post error:", error);
    return { success: false, error: "Failed to flag post" };
  }
}

/**
 * Create a user report
 */
export async function createReport(input: {
  reportedUserId?: string;
  postId?: string;
  subject: string;
  comments?: string;
}): Promise<{ success: boolean; reportId?: string; error?: string }> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // If reporting a post, get the author
    let reportedUserId = input.reportedUserId;
    if (input.postId && !reportedUserId) {
      const { data: post } = await (supabase as any)
        .from("posts")
        .select("author_id")
        .eq("id", input.postId)
        .single();

      if (post) {
        reportedUserId = post.author_id;
      }
    }

    if (!reportedUserId) {
      return { success: false, error: "No user to report" };
    }

    // Can't report yourself
    if (reportedUserId === user.id) {
      return { success: false, error: "Cannot report yourself" };
    }

    const { data: report, error } = await (supabase as any)
      .from("reports")
      .insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        post_id: input.postId || null,
        subject: input.subject,
        comments: input.comments || null,
        source: "user_report",
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Create report error:", error);
      return { success: false, error: "Failed to create report" };
    }

    // Notify admins
    await notifyAdminsOfReport(report.id);

    return { success: true, reportId: report.id };
  } catch (error) {
    console.error("Create report error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Notify admins of flagged content (sends email)
 */
async function notifyAdminsOfFlaggedContent(
  postId: string,
  authorId: string,
  reason: string
): Promise<void> {
  try {
    const supabase = await createServerClient();

    // Get admins (role >= 10)
    const { data: admins } = await (supabase as any)
      .from("profiles")
      .select("id")
      .gte("role", 10);

    if (!admins || admins.length === 0) return;

    // Create in-app notification for each admin
    const notifications = admins.map((admin: any) => ({
      recipient_id: admin.id,
      actor_id: authorId,
      notification_type: "mention", // Reusing mention type for now
      post_id: postId,
      is_read: false,
    }));

    await (supabase as any).from("notifications").insert(notifications);

    // TODO: Send email notification to admins
  } catch (error) {
    console.error("Admin notification error:", error);
  }
}

/**
 * Notify admins of new report
 */
async function notifyAdminsOfReport(reportId: string): Promise<void> {
  try {
    const supabase = await createServerClient();

    // Get admins (role >= 10)
    const { data: admins } = await (supabase as any)
      .from("profiles")
      .select("id")
      .gte("role", 10);

    if (!admins || admins.length === 0) return;

    // TODO: Send email notification to admins about new report
  } catch (error) {
    console.error("Admin report notification error:", error);
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
    const supabase = await createServerClient();
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
      .in("status", ["pending", "reviewing"]);

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
