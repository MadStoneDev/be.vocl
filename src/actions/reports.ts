"use server";

import { createServerClient } from "@/lib/supabase/server";

// Map old reason types to new subject types for backwards compatibility
export type ReportReason =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "violence"
  | "sexual_content"
  | "misinformation"
  | "impersonation"
  | "copyright"
  | "other";

// New subject types matching the database enum
export type ReportSubject =
  | "minor_safety"
  | "non_consensual"
  | "harassment"
  | "spam"
  | "illegal"
  | "other";

function mapReasonToSubject(reason: ReportReason): ReportSubject {
  switch (reason) {
    case "spam":
      return "spam";
    case "harassment":
    case "hate_speech":
      return "harassment";
    case "violence":
    case "sexual_content":
      return "illegal";
    case "misinformation":
    case "impersonation":
    case "copyright":
      return "other";
    default:
      return "other";
  }
}

interface ReportResult {
  success: boolean;
  reportId?: string;
  error?: string;
}

/**
 * Report a post
 */
export async function reportPost(
  postId: string,
  reason: ReportReason,
  details?: string
): Promise<ReportResult> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user already reported this post
    const { data: existingReport } = await (supabase as any)
      .from("reports")
      .select("id")
      .eq("reporter_id", user.id)
      .eq("post_id", postId)
      .single();

    if (existingReport) {
      return { success: false, error: "You have already reported this post" };
    }

    // Get post info for the report
    const { data: post } = await (supabase as any)
      .from("posts")
      .select("author_id")
      .eq("id", postId)
      .single();

    if (!post) {
      return { success: false, error: "Post not found" };
    }

    // Can't report your own post
    if (post.author_id === user.id) {
      return { success: false, error: "You cannot report your own post" };
    }

    // Create report with new schema
    const subject = mapReasonToSubject(reason);
    const { data: report, error } = await (supabase as any)
      .from("reports")
      .insert({
        reporter_id: user.id,
        post_id: postId,
        reported_user_id: post.author_id,
        subject,
        comments: details || null,
        source: "user_report",
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Report error:", error);
      return { success: false, error: "Failed to submit report" };
    }

    // Notify admins
    const { data: admins } = await (supabase as any)
      .from("profiles")
      .select("id")
      .gte("role", 10);

    if (admins && admins.length > 0) {
      const notifications = admins.map((admin: any) => ({
        recipient_id: admin.id,
        actor_id: user.id,
        notification_type: "mention",
        post_id: postId,
        is_read: false,
      }));
      await (supabase as any).from("notifications").insert(notifications);
    }

    return { success: true, reportId: report.id };
  } catch (error) {
    console.error("Report error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Report a user (for profile-level issues)
 */
export async function reportUser(
  userId: string,
  reason: ReportReason,
  details?: string
): Promise<ReportResult> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    if (userId === user.id) {
      return { success: false, error: "You cannot report yourself" };
    }

    // Check if user already reported this user
    const { data: existingReport } = await (supabase as any)
      .from("reports")
      .select("id")
      .eq("reporter_id", user.id)
      .eq("reported_user_id", userId)
      .is("post_id", null)
      .single();

    if (existingReport) {
      return { success: false, error: "You have already reported this user" };
    }

    // Create report with new schema
    const subject = mapReasonToSubject(reason);
    const { data: report, error } = await (supabase as any)
      .from("reports")
      .insert({
        reporter_id: user.id,
        reported_user_id: userId,
        subject,
        comments: details || null,
        source: "user_report",
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Report error:", error);
      return { success: false, error: "Failed to submit report" };
    }

    // Notify admins
    const { data: admins } = await (supabase as any)
      .from("profiles")
      .select("id")
      .gte("role", 10);

    if (admins && admins.length > 0) {
      const notifications = admins.map((admin: any) => ({
        recipient_id: admin.id,
        actor_id: user.id,
        notification_type: "mention",
        is_read: false,
      }));
      await (supabase as any).from("notifications").insert(notifications);
    }

    return { success: true, reportId: report.id };
  } catch (error) {
    console.error("Report error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
