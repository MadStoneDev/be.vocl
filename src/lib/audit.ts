import { createClient } from "@/lib/supabase/server";

export type AuditAction =
  | "ban_user"
  | "restrict_user"
  | "unlock_user"
  | "change_role"
  | "resolve_report"
  | "resolve_flag"
  | "review_appeal"
  | "assign_report"
  | "assign_flag"
  | "remove_post"
  | "restore_post"
  | "delete_post"
  | "ip_ban";

interface AuditLogEntry {
  actorId: string;
  actorUsername: string;
  actorRole: number;
  action: AuditAction;
  targetUserId?: string;
  targetUserUsername?: string;
  targetPostId?: string;
  targetReportId?: string;
  targetFlagId?: string;
  targetAppealId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Log an admin action for audit purposes
 * This should be called after any sensitive admin action
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = await createClient();

    await (supabase as any).from("audit_logs").insert({
      actor_id: entry.actorId,
      actor_username: entry.actorUsername,
      actor_role: entry.actorRole,
      action: entry.action,
      target_user_id: entry.targetUserId || null,
      target_user_username: entry.targetUserUsername || null,
      target_post_id: entry.targetPostId || null,
      target_report_id: entry.targetReportId || null,
      target_flag_id: entry.targetFlagId || null,
      target_appeal_id: entry.targetAppealId || null,
      details: entry.details || {},
      ip_address: entry.ipAddress || null,
    });
  } catch (error) {
    // Don't let audit logging failures break the main action
    // But do log it for debugging
    console.error("Failed to log audit event:", error, entry);
  }
}

/**
 * Helper to get actor info for audit logging
 */
export async function getActorInfo(userId: string): Promise<{
  username: string;
  role: number;
} | null> {
  try {
    const supabase = await createClient();
    const { data } = await (supabase as any)
      .from("profiles")
      .select("username, role")
      .eq("id", userId)
      .single();

    return data ? { username: data.username, role: data.role } : null;
  } catch {
    return null;
  }
}

/**
 * Helper to get target user info for audit logging
 */
export async function getTargetUserInfo(userId: string): Promise<{
  username: string;
} | null> {
  try {
    const supabase = await createClient();
    const { data } = await (supabase as any)
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();

    return data ? { username: data.username } : null;
  } catch {
    return null;
  }
}
