"use server";

import { createClient } from "@/lib/supabase/server";
import { ROLES, canModerateUser, getEscalationTargets } from "@/constants/roles";
import type { ReportSubject, ReportStatus } from "@/types/database";
import { rateLimiters } from "@/lib/rate-limit";

interface ReportResult {
  success: boolean;
  reportId?: string;
  error?: string;
}

interface ReportListResult {
  success: boolean;
  reports?: ReportWithUser[];
  error?: string;
}

interface ReportWithUser {
  id: string;
  reporter_id: string | null;
  reported_user_id: string;
  subject: ReportSubject;
  comments: string | null;
  source: string;
  status: ReportStatus;
  assigned_to: string | null;
  assigned_role: number;
  escalated_at: string | null;
  escalation_reason: string | null;
  created_at: string;
  updated_at: string;
  reporter?: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
  reported_user: {
    id: string;
    username: string;
    avatar_url: string | null;
    lock_status: string;
  };
  assigned_moderator?: {
    id: string;
    username: string;
  } | null;
}

/**
 * Report a user (for user-level issues like harassment, impersonation, etc.)
 * For post-specific issues, use flagPost instead
 */
export async function reportUser(
  userId: string,
  subject: ReportSubject,
  comments?: string
): Promise<ReportResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Rate limit: 10 reports per hour per user
    const rateLimit = rateLimiters.report(`report:${user.id}`);
    if (!rateLimit.allowed) {
      return { success: false, error: "Too many reports. Please try again later." };
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
      .in("status", ["pending", "reviewing", "escalated"])
      .single();

    if (existingReport) {
      return { success: false, error: "You have already reported this user" };
    }

    // Create report - starts at Junior Mod level
    const { data: report, error } = await (supabase as any)
      .from("reports")
      .insert({
        reporter_id: user.id,
        reported_user_id: userId,
        subject,
        comments: comments || null,
        source: "user_report",
        status: "pending",
        assigned_role: ROLES.JUNIOR_MOD,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Report error:", error);
      return { success: false, error: "Failed to submit report" };
    }

    // Notify staff
    await notifyStaffOfReport(report.id, ROLES.JUNIOR_MOD);

    return { success: true, reportId: report.id };
  } catch (error) {
    console.error("Report error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get reports for moderation (filtered by role level)
 */
export async function getReports(
  status?: ReportStatus | ReportStatus[],
  limit = 50,
  offset = 0
): Promise<ReportListResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get user's role
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role < ROLES.JUNIOR_MOD) {
      return { success: false, error: "Insufficient permissions" };
    }

    let query = (supabase as any)
      .from("reports")
      .select(`
        *,
        reporter:profiles!reports_reporter_id_fkey(id, username, avatar_url),
        reported_user:profiles!reports_reported_user_id_fkey(id, username, avatar_url, lock_status),
        assigned_moderator:profiles!reports_assigned_to_fkey(id, username)
      `)
      .lte("assigned_role", profile.role)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      if (Array.isArray(status)) {
        query = query.in("status", status);
      } else {
        query = query.eq("status", status);
      }
    }

    const { data: reports, error } = await query;

    if (error) {
      console.error("Get reports error:", error);
      return { success: false, error: "Failed to fetch reports" };
    }

    return { success: true, reports };
  } catch (error) {
    console.error("Get reports error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Assign a report to self
 */
export async function claimReport(
  reportId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get user's role
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role < ROLES.JUNIOR_MOD) {
      return { success: false, error: "Insufficient permissions" };
    }

    // Get report to check role requirement
    const { data: report } = await (supabase as any)
      .from("reports")
      .select("assigned_role, status, reported_user_id")
      .eq("id", reportId)
      .single();

    if (!report) {
      return { success: false, error: "Report not found" };
    }

    if (profile.role < report.assigned_role) {
      return { success: false, error: "This report requires a higher role level" };
    }

    if (report.status !== "pending" && report.status !== "escalated") {
      return { success: false, error: "Report is not available to claim" };
    }

    // Get reported user's role to check if mod can handle them
    const { data: reportedUser } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", report.reported_user_id)
      .single();

    if (reportedUser && !canModerateUser(profile.role, reportedUser.role)) {
      return { success: false, error: "Cannot moderate a user with equal or higher role" };
    }

    const { error } = await (supabase as any)
      .from("reports")
      .update({
        assigned_to: user.id,
        status: "reviewing",
      })
      .eq("id", reportId);

    if (error) {
      return { success: false, error: "Failed to claim report" };
    }

    return { success: true };
  } catch (error) {
    console.error("Claim report error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Resolve a report
 */
export async function resolveReport(
  reportId: string,
  resolution: "resolved_ban" | "resolved_restrict" | "resolved_dismissed",
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get user's role
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role < ROLES.JUNIOR_MOD) {
      return { success: false, error: "Insufficient permissions" };
    }

    // Get report details
    const { data: report } = await (supabase as any)
      .from("reports")
      .select("assigned_role, assigned_to, reported_user_id, status")
      .eq("id", reportId)
      .single();

    if (!report) {
      return { success: false, error: "Report not found" };
    }

    if (profile.role < report.assigned_role) {
      return { success: false, error: "This report requires a higher role level" };
    }

    // Get reported user's role
    const { data: reportedUser } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", report.reported_user_id)
      .single();

    if (reportedUser && !canModerateUser(profile.role, reportedUser.role)) {
      return { success: false, error: "Cannot moderate a user with equal or higher role" };
    }

    // Update report
    const { error } = await (supabase as any)
      .from("reports")
      .update({
        status: resolution,
        resolved_by: user.id,
        resolution_notes: notes || null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (error) {
      return { success: false, error: "Failed to resolve report" };
    }

    // Apply action to the user
    if (resolution === "resolved_ban") {
      await (supabase as any)
        .from("profiles")
        .update({
          lock_status: "banned",
          banned_at: new Date().toISOString(),
          ban_reason: notes || "Banned due to report",
        })
        .eq("id", report.reported_user_id);
    } else if (resolution === "resolved_restrict") {
      await (supabase as any)
        .from("profiles")
        .update({
          lock_status: "restricted",
        })
        .eq("id", report.reported_user_id);
    }

    return { success: true };
  } catch (error) {
    console.error("Resolve report error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Escalate a report to a higher role level
 */
export async function escalateReport(
  reportId: string,
  targetRole: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get user's role
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role < ROLES.JUNIOR_MOD) {
      return { success: false, error: "Insufficient permissions" };
    }

    // Check valid escalation targets
    const validTargets = getEscalationTargets(profile.role);
    if (!validTargets.includes(targetRole as any)) {
      return { success: false, error: "Invalid escalation target" };
    }

    // Get report
    const { data: report } = await (supabase as any)
      .from("reports")
      .select("assigned_role, status")
      .eq("id", reportId)
      .single();

    if (!report) {
      return { success: false, error: "Report not found" };
    }

    if (targetRole <= report.assigned_role) {
      return { success: false, error: "Can only escalate to a higher role" };
    }

    // Update report
    const { error } = await (supabase as any)
      .from("reports")
      .update({
        status: "escalated",
        assigned_role: targetRole,
        assigned_to: null,
        escalated_by: user.id,
        escalated_at: new Date().toISOString(),
        escalation_reason: reason,
      })
      .eq("id", reportId);

    if (error) {
      return { success: false, error: "Failed to escalate report" };
    }

    // Record escalation history
    await (supabase as any).from("escalation_history").insert({
      report_id: reportId,
      from_role: report.assigned_role,
      to_role: targetRole,
      escalated_by: user.id,
      reason,
    });

    // Notify staff at new level
    await notifyStaffOfReport(reportId, targetRole, true);

    return { success: true };
  } catch (error) {
    console.error("Escalate report error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Notify staff of a new or escalated report
 */
async function notifyStaffOfReport(
  reportId: string,
  roleLevel: number,
  isEscalation = false
): Promise<void> {
  try {
    const supabase = await createClient();

    // Get staff at or above the role level
    const { data: staff } = await (supabase as any)
      .from("profiles")
      .select("id")
      .gte("role", roleLevel);

    if (!staff || staff.length === 0) return;

    // Create in-app notifications
    const notifications = staff.map((s: any) => ({
      recipient_id: s.id,
      notification_type: "mention",
      is_read: false,
    }));

    await (supabase as any).from("notifications").insert(notifications);
  } catch (error) {
    console.error("Staff notification error:", error);
  }
}

/**
 * Get report statistics for dashboard
 */
export async function getReportStats(): Promise<{
  success: boolean;
  stats?: {
    pending: number;
    reviewing: number;
    escalated: number;
    resolvedToday: number;
  };
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

    // Get user's role
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role < ROLES.JUNIOR_MOD) {
      return { success: false, error: "Insufficient permissions" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count reports by status (filtered by role)
    const [pending, reviewing, escalated, resolvedToday] = await Promise.all([
      (supabase as any)
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .lte("assigned_role", profile.role),
      (supabase as any)
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "reviewing")
        .lte("assigned_role", profile.role),
      (supabase as any)
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "escalated")
        .lte("assigned_role", profile.role),
      (supabase as any)
        .from("reports")
        .select("*", { count: "exact", head: true })
        .in("status", ["resolved_ban", "resolved_restrict", "resolved_dismissed"])
        .gte("resolved_at", today.toISOString())
        .lte("assigned_role", profile.role),
    ]);

    return {
      success: true,
      stats: {
        pending: pending.count || 0,
        reviewing: reviewing.count || 0,
        escalated: escalated.count || 0,
        resolvedToday: resolvedToday.count || 0,
      },
    };
  } catch (error) {
    console.error("Get report stats error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get user's pending reports (for showing warning banner to reported users)
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
