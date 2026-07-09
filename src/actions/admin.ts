"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  ROLES,
  ROLE_NAMES,
  canModerateUser,
  canAssignRole,
  getAssignableRoles,
} from "@/constants/roles";
import { logAuditEvent, getActorInfo, getTargetUserInfo } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendAccountBannedEmail,
  sendAccountRestrictedEmail,
} from "@/lib/email/send";

/**
 * Check if current user has required role level
 */
async function requireRole(minRole: number = ROLES.MODERATOR): Promise<{
  authorized: boolean;
  userId?: string;
  role?: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false };
  }

  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role < minRole) {
    return { authorized: false };
  }

  return { authorized: true, userId: user.id, role: profile.role };
}

// ============================================================================
// REPORTS
// ============================================================================

export interface ReportWithDetails {
  id: string;
  subject: string;
  comments: string | null;
  source: string;
  status: string;
  createdAt: string;
  reporter: {
    id: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  reportedUser: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  post: {
    id: string;
    content: any;
    postType: string;
  } | null;
  assignedTo: {
    id: string;
    username: string;
  } | null;
}

export async function getReports(options?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  success: boolean;
  reports?: ReportWithDetails[];
  total?: number;
  error?: string;
}> {
  const auth = await requireRole();
  if (!auth.authorized) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const supabase = await createClient();
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    let query = (supabase as any)
      .from("reports")
      .select(
        `
        id,
        subject,
        comments,
        source,
        status,
        created_at,
        reporter:reporter_id (id, username, avatar_url),
        reported_user:reported_user_id (id, username, avatar_url),
        post:post_id (id, content, post_type),
        assigned:assigned_to (id, username)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (options?.status && options.status !== "all") {
      query = query.eq("status", options.status);
    }

    const { data: reports, count, error } = await query;

    if (error) {
      console.error("Get reports error:", error);
      return { success: false, error: "Failed to fetch reports" };
    }

    const formatted: ReportWithDetails[] = (reports || []).map((r: any) => ({
      id: r.id,
      subject: r.subject,
      comments: r.comments,
      source: r.source,
      status: r.status,
      createdAt: r.created_at,
      reporter: r.reporter
        ? {
            id: r.reporter.id,
            username: r.reporter.username,
            avatarUrl: r.reporter.avatar_url,
          }
        : null,
      reportedUser: {
        id: r.reported_user.id,
        username: r.reported_user.username,
        avatarUrl: r.reported_user.avatar_url,
      },
      post: r.post
        ? {
            id: r.post.id,
            content: r.post.content,
            postType: r.post.post_type,
          }
        : null,
      assignedTo: r.assigned
        ? {
            id: r.assigned.id,
            username: r.assigned.username,
          }
        : null,
    }));

    return {
      success: true,
      reports: formatted,
      total: count || 0,
    };
  } catch (error) {
    console.error("Get reports error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function assignReport(
  reportId: string,
  assigneeId: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireRole();
  if (!auth.authorized || !auth.userId || !auth.role) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const supabase = await createClient();

    const { error } = await (supabase as any)
      .from("reports")
      .update({
        assigned_to: assigneeId,
        status: "reviewing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (error) {
      return { success: false, error: "Failed to assign report" };
    }

    // Audit log
    const [actorInfo, assigneeInfo] = await Promise.all([
      getActorInfo(auth.userId),
      getTargetUserInfo(assigneeId),
    ]);

    await logAuditEvent({
      actorId: auth.userId,
      actorUsername: actorInfo?.username || "unknown",
      actorRole: auth.role,
      action: "assign_report",
      targetReportId: reportId,
      details: {
        assignee_id: assigneeId,
        assignee_username: assigneeInfo?.username,
      },
    });

    revalidatePath("/admin/reports");
    return { success: true };
  } catch (error) {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function resolveReport(
  reportId: string,
  resolution: "resolved_ban" | "resolved_restrict" | "resolved_dismissed" | "resolved_approved",
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireRole();
  if (!auth.authorized || !auth.userId || !auth.role) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const supabase = await createClient();

    // Get report details
    const { data: report } = await (supabase as any)
      .from("reports")
      .select("reported_user_id, post_id")
      .eq("id", reportId)
      .single();

    if (!report) {
      return { success: false, error: "Report not found" };
    }

    // Get actor and target info for audit log
    const [actorInfo, targetInfo] = await Promise.all([
      getActorInfo(auth.userId),
      getTargetUserInfo(report.reported_user_id),
    ]);

    // Apply the user sanction FIRST, so we don't mark the report resolved (or
    // touch the post) if the sanction is rejected. banUser/restrictUser now
    // surface auth/DB failures instead of silently no-opping.
    if (resolution === "resolved_ban") {
      const r = await banUser(report.reported_user_id, notes || "Banned due to report");
      if (!r.success) return { success: false, error: r.error || "Failed to ban user" };
    } else if (resolution === "resolved_restrict") {
      const r = await restrictUser(report.reported_user_id);
      if (!r.success) return { success: false, error: r.error || "Failed to restrict user" };
    }

    // Mark the report resolved.
    await (supabase as any)
      .from("reports")
      .update({
        status: resolution,
        resolved_by: auth.userId,
        resolution_notes: notes || null,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    // Apply the post outcome (admin client so moderation writes always land).
    if (report.post_id) {
      const adminSupabase = createAdminClient();
      const approve = resolution === "resolved_approved" || resolution === "resolved_dismissed";

      if (approve) {
        // Approve the post — and PUBLISH it if it was held (draft) for review,
        // so approved content doesn't stay stranded and invisible.
        const { data: heldPost } = await (supabase as any)
          .from("posts")
          .select("status")
          .eq("id", report.post_id)
          .single();

        const postPatch: Record<string, any> = {
          moderation_status: "approved",
          moderation_reason: null,
        };
        if (heldPost?.status === "draft") {
          postPatch.status = "published";
          postPatch.published_at = new Date().toISOString();
        }

        await (adminSupabase as any)
          .from("posts")
          .update(postPatch)
          .eq("id", report.post_id);

        await logAuditEvent({
          actorId: auth.userId,
          actorUsername: actorInfo?.username || "unknown",
          actorRole: auth.role,
          action: "restore_post",
          targetUserId: report.reported_user_id,
          targetUserUsername: targetInfo?.username,
          targetPostId: report.post_id,
          targetReportId: reportId,
        });
      } else {
        // resolved_ban / resolved_restrict → remove the post.
        await (adminSupabase as any)
          .from("posts")
          .update({
            moderation_status: "removed",
            moderation_reason: notes || "Removed by moderation",
            moderated_at: new Date().toISOString(),
            moderated_by: auth.userId,
          })
          .eq("id", report.post_id);

        await logAuditEvent({
          actorId: auth.userId,
          actorUsername: actorInfo?.username || "unknown",
          actorRole: auth.role,
          action: "remove_post",
          targetUserId: report.reported_user_id,
          targetUserUsername: targetInfo?.username,
          targetPostId: report.post_id,
          targetReportId: reportId,
          details: { reason: notes },
        });
      }
    }

    // Audit log for report resolution
    await logAuditEvent({
      actorId: auth.userId,
      actorUsername: actorInfo?.username || "unknown",
      actorRole: auth.role,
      action: "resolve_report",
      targetUserId: report.reported_user_id,
      targetUserUsername: targetInfo?.username,
      targetReportId: reportId,
      details: { resolution, notes },
    });

    revalidatePath("/admin/reports");
    return { success: true };
  } catch (error) {
    console.error("Resolve report error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ============================================================================
// USERS
// ============================================================================

export interface UserWithDetails {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string;
  role: number;
  lockStatus: string;
  createdAt: string;
  reportCount: number;
}

export async function getUsers(options?: {
  search?: string;
  lockStatus?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  success: boolean;
  users?: UserWithDetails[];
  total?: number;
  error?: string;
}> {
  const auth = await requireRole();
  if (!auth.authorized) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const supabase = await createClient();
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    let query = (supabase as any)
      .from("profiles")
      .select("id, username, display_name, avatar_url, role, lock_status, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (options?.search) {
      query = query.ilike("username", `%${options.search}%`);
    }

    if (options?.lockStatus && options.lockStatus !== "all") {
      query = query.eq("lock_status", options.lockStatus);
    }

    const { data: users, count, error } = await query;

    if (error) {
      console.error("Get users error:", error);
      return { success: false, error: "Failed to fetch users" };
    }

    // Get report counts for each user
    const userIds = (users || []).map((u: any) => u.id);
    const { data: reportCounts } = await (supabase as any)
      .from("reports")
      .select("reported_user_id")
      .in("reported_user_id", userIds);

    const countMap = new Map<string, number>();
    (reportCounts || []).forEach((r: any) => {
      countMap.set(r.reported_user_id, (countMap.get(r.reported_user_id) || 0) + 1);
    });

    const formatted: UserWithDetails[] = (users || []).map((u: any) => ({
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      avatarUrl: u.avatar_url,
      email: "", // Not fetching email for privacy
      role: u.role || 0,
      lockStatus: u.lock_status || "unlocked",
      createdAt: u.created_at,
      reportCount: countMap.get(u.id) || 0,
    }));

    return {
      success: true,
      users: formatted,
      total: count || 0,
    };
  } catch (error) {
    console.error("Get users error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function banUser(
  userId: string,
  reason: string,
  logIp?: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireRole(10); // Require admin
  if (!auth.authorized || !auth.userId || !auth.role) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Privileged profiles columns (lock_status/banned_at/…) can only be written
    // by the service role — the security-hardening trigger rejects the session
    // client. Use the admin client and surface failures instead of swallowing them.
    const adminSupabase = createAdminClient();

    // Get actor and target info for audit log
    const [actorInfo, targetInfo] = await Promise.all([
      getActorInfo(auth.userId),
      getTargetUserInfo(userId),
    ]);

    // Update user profile
    const { error: updateError } = await (adminSupabase as any)
      .from("profiles")
      .update({
        lock_status: "banned",
        banned_at: new Date().toISOString(),
        ban_reason: reason,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Ban user update error:", updateError);
      return { success: false, error: "Failed to ban user" };
    }

    // Log IP if provided
    if (logIp) {
      await (adminSupabase as any).from("banned_ips").insert({
        ip_address: logIp,
        user_id: userId,
        reason,
        banned_by: auth.userId,
      });

      // Log IP ban separately
      await logAuditEvent({
        actorId: auth.userId,
        actorUsername: actorInfo?.username || "unknown",
        actorRole: auth.role,
        action: "ip_ban",
        targetUserId: userId,
        targetUserUsername: targetInfo?.username,
        details: { ip_address: logIp, reason },
      });
    }

    // Audit log
    await logAuditEvent({
      actorId: auth.userId,
      actorUsername: actorInfo?.username || "unknown",
      actorRole: auth.role,
      action: "ban_user",
      targetUserId: userId,
      targetUserUsername: targetInfo?.username,
      details: { reason },
    });

    // Send ban notification email
    try {
      const { data: authUser } = await adminSupabase.auth.admin.getUserById(userId);
      const email = authUser?.user?.email;
      if (email && targetInfo?.username) {
        await sendAccountBannedEmail({
          to: email,
          username: targetInfo.username,
          reason,
        });
      }
    } catch (emailError) {
      console.error("Failed to send ban notification email:", emailError);
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Ban user error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function restrictUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireRole();
  if (!auth.authorized || !auth.userId || !auth.role) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const adminSupabase = createAdminClient();

    // Get actor and target info for audit log
    const [actorInfo, targetInfo] = await Promise.all([
      getActorInfo(auth.userId),
      getTargetUserInfo(userId),
    ]);

    const { error: updateError } = await (adminSupabase as any)
      .from("profiles")
      .update({
        lock_status: "restricted",
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Restrict user update error:", updateError);
      return { success: false, error: "Failed to restrict user" };
    }

    // Audit log
    await logAuditEvent({
      actorId: auth.userId,
      actorUsername: actorInfo?.username || "unknown",
      actorRole: auth.role,
      action: "restrict_user",
      targetUserId: userId,
      targetUserUsername: targetInfo?.username,
    });

    // Send restriction notification email
    try {
      const { data: authUser } = await adminSupabase.auth.admin.getUserById(userId);
      const email = authUser?.user?.email;
      if (email && targetInfo?.username) {
        await sendAccountRestrictedEmail({
          to: email,
          username: targetInfo.username,
        });
      }
    } catch (emailError) {
      console.error("Failed to send restriction notification email:", emailError);
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Restrict user error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function unlockUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireRole();
  if (!auth.authorized || !auth.userId || !auth.role) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const adminSupabase = createAdminClient();

    // Get actor and target info for audit log
    const [actorInfo, targetInfo] = await Promise.all([
      getActorInfo(auth.userId),
      getTargetUserInfo(userId),
    ]);

    const { error: updateError } = await (adminSupabase as any)
      .from("profiles")
      .update({
        lock_status: "unlocked",
        banned_at: null,
        ban_reason: null,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Unlock user update error:", updateError);
      return { success: false, error: "Failed to unlock user" };
    }

    // Audit log
    await logAuditEvent({
      actorId: auth.userId,
      actorUsername: actorInfo?.username || "unknown",
      actorRole: auth.role,
      action: "unlock_user",
      targetUserId: userId,
      targetUserUsername: targetInfo?.username,
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Unlock user error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function setUserRole(
  userId: string,
  newRole: number
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireRole(ROLES.ADMIN); // Only admins can change roles
  if (!auth.authorized || !auth.role || !auth.userId) {
    return { success: false, error: "Unauthorized" };
  }

  // Can't change your own role
  if (userId === auth.userId) {
    return { success: false, error: "Cannot change your own role" };
  }

  // Check if admin can assign this role level
  if (!canAssignRole(auth.role, newRole)) {
    return { success: false, error: `Cannot assign role ${ROLE_NAMES[newRole as keyof typeof ROLE_NAMES] || newRole}` };
  }

  try {
    const supabase = await createClient();

    // Get target user's current role
    const { data: targetUser } = await (supabase as any)
      .from("profiles")
      .select("role, username")
      .eq("id", userId)
      .single();

    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    // Can't modify users with equal or higher role
    if (targetUser.role >= auth.role) {
      return { success: false, error: "Cannot modify a user with equal or higher role" };
    }

    const oldRole = targetUser.role;

    // Build update object
    const updateData: { role: number; invite_codes_remaining?: number } = { role: newRole };

    // Grant 3 invite codes when promoting to Trusted User (role 1) from User (role 0)
    if (oldRole < ROLES.TRUSTED_USER && newRole >= ROLES.TRUSTED_USER) {
      updateData.invite_codes_remaining = 3;
    }

    // Role is a service-role-only column (security-hardening trigger).
    const adminSupabase = createAdminClient();
    const { error: roleError } = await (adminSupabase as any)
      .from("profiles")
      .update(updateData)
      .eq("id", userId);

    if (roleError) {
      console.error("Set user role error:", roleError);
      return { success: false, error: "Failed to change role" };
    }

    // Audit log
    const actorInfo = await getActorInfo(auth.userId);
    await logAuditEvent({
      actorId: auth.userId,
      actorUsername: actorInfo?.username || "unknown",
      actorRole: auth.role,
      action: "change_role",
      targetUserId: userId,
      targetUserUsername: targetUser.username,
      details: {
        old_role: oldRole,
        new_role: newRole,
        old_role_name: ROLE_NAMES[oldRole as keyof typeof ROLE_NAMES] || "Unknown",
        new_role_name: ROLE_NAMES[newRole as keyof typeof ROLE_NAMES] || "Unknown",
        invite_codes_granted: updateData.invite_codes_remaining || 0,
      },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Set role error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get assignable roles for current user
 */
export async function getAssignableRolesForCurrentUser(): Promise<{
  success: boolean;
  roles?: { value: number; label: string }[];
  error?: string;
}> {
  const auth = await requireRole(ROLES.ADMIN);
  if (!auth.authorized || !auth.role) {
    return { success: false, error: "Unauthorized" };
  }

  return {
    success: true,
    roles: getAssignableRoles(auth.role),
  };
}

// ============================================================================
// APPEALS
// ============================================================================

export interface AppealWithDetails {
  id: string;
  reason: string;
  status: string;
  appealsBlocked: boolean;
  reviewNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
    lockStatus: string;
  };
  reviewedBy: {
    id: string;
    username: string;
  } | null;
}

export async function getAppeals(options?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  success: boolean;
  appeals?: AppealWithDetails[];
  total?: number;
  error?: string;
}> {
  const auth = await requireRole();
  if (!auth.authorized) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const supabase = await createClient();
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    let query = (supabase as any)
      .from("appeals")
      .select(
        `
        id,
        reason,
        status,
        review_notes,
        created_at,
        reviewed_at,
        user:user_id (id, username, avatar_url, lock_status, appeals_blocked),
        reviewer:reviewed_by (id, username)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (options?.status && options.status !== "all") {
      query = query.eq("status", options.status);
    }

    const { data: appeals, count, error } = await query;

    if (error) {
      console.error("Get appeals error:", error);
      return { success: false, error: "Failed to fetch appeals" };
    }

    const formatted: AppealWithDetails[] = (appeals || []).map((a: any) => ({
      id: a.id,
      reason: a.reason,
      status: a.status,
      appealsBlocked: a.user?.appeals_blocked || false,
      reviewNotes: a.review_notes,
      createdAt: a.created_at,
      reviewedAt: a.reviewed_at,
      user: {
        id: a.user.id,
        username: a.user.username,
        avatarUrl: a.user.avatar_url,
        lockStatus: a.user.lock_status,
      },
      reviewedBy: a.reviewer
        ? {
            id: a.reviewer.id,
            username: a.reviewer.username,
          }
        : null,
    }));

    return {
      success: true,
      appeals: formatted,
      total: count || 0,
    };
  } catch (error) {
    console.error("Get appeals error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function reviewAppeal(
  appealId: string,
  decision: "approved" | "denied" | "blocked",
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireRole();
  if (!auth.authorized || !auth.userId || !auth.role) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const supabase = await createClient();

    // Get appeal details
    const { data: appeal } = await (supabase as any)
      .from("appeals")
      .select("user_id")
      .eq("id", appealId)
      .single();

    if (!appeal) {
      return { success: false, error: "Appeal not found" };
    }

    // Get actor and target info for audit log
    const [actorInfo, targetInfo] = await Promise.all([
      getActorInfo(auth.userId),
      getTargetUserInfo(appeal.user_id),
    ]);

    // Update appeal
    await (supabase as any)
      .from("appeals")
      .update({
        status: decision,
        reviewed_by: auth.userId,
        review_notes: notes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", appealId);

    // If approved, unlock user
    if (decision === "approved") {
      await unlockUser(appeal.user_id);
    }

    // If blocked, update profile to block future appeals (service-role column)
    if (decision === "blocked") {
      const adminSupabase = createAdminClient();
      const { error: blockError } = await (adminSupabase as any)
        .from("profiles")
        .update({ appeals_blocked: true })
        .eq("id", appeal.user_id);
      if (blockError) {
        console.error("Block appeals error:", blockError);
        return { success: false, error: "Failed to block future appeals" };
      }
    }

    // Audit log
    await logAuditEvent({
      actorId: auth.userId,
      actorUsername: actorInfo?.username || "unknown",
      actorRole: auth.role,
      action: "review_appeal",
      targetUserId: appeal.user_id,
      targetUserUsername: targetInfo?.username,
      targetAppealId: appealId,
      details: { decision, notes },
    });

    // TODO: Send email notification to user about decision

    revalidatePath("/admin/appeals");
    return { success: true };
  } catch (error) {
    console.error("Review appeal error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ============================================================================
// STATS
// ============================================================================

export async function getAdminStats(): Promise<{
  success: boolean;
  stats?: {
    pendingReports: number;
    pendingFlags: number;
    pendingAppeals: number;
    escalatedItems: number;
    bannedUsers: number;
    restrictedUsers: number;
  };
  error?: string;
}> {
  const auth = await requireRole();
  if (!auth.authorized || !auth.role) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const supabase = await createClient();

    // Filter by role level - staff can only see items at their level or below
    const [
      { count: pendingReports },
      { count: pendingFlags },
      { count: pendingAppeals },
      { count: escalatedReports },
      { count: escalatedFlags },
      { count: bannedUsers },
      { count: restrictedUsers },
    ] = await Promise.all([
      (supabase as any)
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .lte("assigned_role", auth.role),
      (supabase as any)
        .from("flags")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .lte("assigned_role", auth.role),
      (supabase as any)
        .from("appeals")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      (supabase as any)
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "escalated")
        .lte("assigned_role", auth.role),
      (supabase as any)
        .from("flags")
        .select("*", { count: "exact", head: true })
        .eq("status", "escalated")
        .lte("assigned_role", auth.role),
      (supabase as any)
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("lock_status", "banned"),
      (supabase as any)
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("lock_status", "restricted"),
    ]);

    return {
      success: true,
      stats: {
        pendingReports: pendingReports || 0,
        pendingFlags: pendingFlags || 0,
        pendingAppeals: pendingAppeals || 0,
        escalatedItems: (escalatedReports || 0) + (escalatedFlags || 0),
        bannedUsers: bannedUsers || 0,
        restrictedUsers: restrictedUsers || 0,
      },
    };
  } catch (error) {
    console.error("Get stats error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
