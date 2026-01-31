"use server";

import { createClient } from "@/lib/supabase/server";
import { ROLES, canModerateUser, getEscalationTargets } from "@/constants/roles";
import type { FlagSubject, FlagStatus } from "@/types/database";

interface FlagResult {
  success: boolean;
  flagId?: string;
  error?: string;
}

interface FlagListResult {
  success: boolean;
  flags?: FlagWithPost[];
  error?: string;
}

interface FlagWithPost {
  id: string;
  flagger_id: string | null;
  post_id: string;
  subject: FlagSubject;
  comments: string | null;
  status: FlagStatus;
  assigned_to: string | null;
  assigned_role: number;
  escalated_at: string | null;
  escalation_reason: string | null;
  created_at: string;
  updated_at: string;
  flagger?: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
  post: {
    id: string;
    post_type: string;
    content: any;
    author: {
      id: string;
      username: string;
      avatar_url: string | null;
    };
  };
  assigned_moderator?: {
    id: string;
    username: string;
  } | null;
}

/**
 * Flag a post (user-initiated)
 */
export async function flagPost(
  postId: string,
  subject: FlagSubject,
  comments?: string
): Promise<FlagResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user already flagged this post
    const { data: existingFlag } = await (supabase as any)
      .from("flags")
      .select("id")
      .eq("flagger_id", user.id)
      .eq("post_id", postId)
      .single();

    if (existingFlag) {
      return { success: false, error: "You have already flagged this post" };
    }

    // Get post info
    const { data: post } = await (supabase as any)
      .from("posts")
      .select("author_id")
      .eq("id", postId)
      .single();

    if (!post) {
      return { success: false, error: "Post not found" };
    }

    // Can't flag your own post
    if (post.author_id === user.id) {
      return { success: false, error: "You cannot flag your own post" };
    }

    // Create flag - starts at Junior Mod level
    const { data: flag, error } = await (supabase as any)
      .from("flags")
      .insert({
        flagger_id: user.id,
        post_id: postId,
        subject,
        comments: comments || null,
        status: "pending",
        assigned_role: ROLES.JUNIOR_MOD,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Flag error:", error);
      return { success: false, error: "Failed to submit flag" };
    }

    // Notify staff at appropriate level
    await notifyStaffOfFlag(flag.id, ROLES.JUNIOR_MOD);

    return { success: true, flagId: flag.id };
  } catch (error) {
    console.error("Flag error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get flags for moderation (filtered by role level)
 */
export async function getFlags(
  status?: FlagStatus | FlagStatus[],
  limit = 50,
  offset = 0
): Promise<FlagListResult> {
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
      .from("flags")
      .select(`
        *,
        flagger:profiles!flags_flagger_id_fkey(id, username, avatar_url),
        post:posts!flags_post_id_fkey(
          id, post_type, content,
          author:profiles!posts_author_id_fkey(id, username, avatar_url)
        ),
        assigned_moderator:profiles!flags_assigned_to_fkey(id, username)
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

    const { data: flags, error } = await query;

    if (error) {
      console.error("Get flags error:", error);
      return { success: false, error: "Failed to fetch flags" };
    }

    return { success: true, flags };
  } catch (error) {
    console.error("Get flags error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Assign a flag to self
 */
export async function claimFlag(
  flagId: string
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

    // Get flag to check role requirement
    const { data: flag } = await (supabase as any)
      .from("flags")
      .select("assigned_role, status")
      .eq("id", flagId)
      .single();

    if (!flag) {
      return { success: false, error: "Flag not found" };
    }

    if (profile.role < flag.assigned_role) {
      return { success: false, error: "This flag requires a higher role level" };
    }

    if (flag.status !== "pending" && flag.status !== "escalated") {
      return { success: false, error: "Flag is not available to claim" };
    }

    const { error } = await (supabase as any)
      .from("flags")
      .update({
        assigned_to: user.id,
        status: "reviewing",
      })
      .eq("id", flagId);

    if (error) {
      return { success: false, error: "Failed to claim flag" };
    }

    return { success: true };
  } catch (error) {
    console.error("Claim flag error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Resolve a flag
 */
export async function resolveFlag(
  flagId: string,
  resolution: "resolved_removed" | "resolved_flagged" | "resolved_dismissed",
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

    // Get flag details
    const { data: flag } = await (supabase as any)
      .from("flags")
      .select("assigned_role, assigned_to, post_id, status")
      .eq("id", flagId)
      .single();

    if (!flag) {
      return { success: false, error: "Flag not found" };
    }

    if (profile.role < flag.assigned_role) {
      return { success: false, error: "This flag requires a higher role level" };
    }

    // Update flag
    const { error } = await (supabase as any)
      .from("flags")
      .update({
        status: resolution,
        resolved_by: user.id,
        resolution_notes: notes || null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", flagId);

    if (error) {
      return { success: false, error: "Failed to resolve flag" };
    }

    // If resolved_removed, update the post moderation status
    if (resolution === "resolved_removed") {
      await (supabase as any)
        .from("posts")
        .update({
          moderation_status: "removed",
          moderation_reason: notes || "Removed due to flag",
          moderated_at: new Date().toISOString(),
          moderated_by: user.id,
        })
        .eq("id", flag.post_id);
    } else if (resolution === "resolved_flagged") {
      await (supabase as any)
        .from("posts")
        .update({
          moderation_status: "flagged",
          moderation_reason: notes || "Content flagged",
          moderated_at: new Date().toISOString(),
          moderated_by: user.id,
        })
        .eq("id", flag.post_id);
    }

    return { success: true };
  } catch (error) {
    console.error("Resolve flag error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Escalate a flag to a higher role level
 */
export async function escalateFlag(
  flagId: string,
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

    // Get flag
    const { data: flag } = await (supabase as any)
      .from("flags")
      .select("assigned_role, status")
      .eq("id", flagId)
      .single();

    if (!flag) {
      return { success: false, error: "Flag not found" };
    }

    if (targetRole <= flag.assigned_role) {
      return { success: false, error: "Can only escalate to a higher role" };
    }

    // Update flag
    const { error } = await (supabase as any)
      .from("flags")
      .update({
        status: "escalated",
        assigned_role: targetRole,
        assigned_to: null, // Clear assignment so someone at higher level can claim
        escalated_by: user.id,
        escalated_at: new Date().toISOString(),
        escalation_reason: reason,
      })
      .eq("id", flagId);

    if (error) {
      return { success: false, error: "Failed to escalate flag" };
    }

    // Record escalation history
    await (supabase as any).from("escalation_history").insert({
      flag_id: flagId,
      from_role: flag.assigned_role,
      to_role: targetRole,
      escalated_by: user.id,
      reason,
    });

    // Notify staff at new level
    await notifyStaffOfFlag(flagId, targetRole, true);

    return { success: true };
  } catch (error) {
    console.error("Escalate flag error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Notify staff of a new or escalated flag
 */
async function notifyStaffOfFlag(
  flagId: string,
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
      notification_type: "mention", // Reusing for now
      is_read: false,
    }));

    await (supabase as any).from("notifications").insert(notifications);
  } catch (error) {
    console.error("Staff notification error:", error);
  }
}

/**
 * Get flag statistics for dashboard
 */
export async function getFlagStats(): Promise<{
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

    // Count flags by status (filtered by role)
    const [pending, reviewing, escalated, resolvedToday] = await Promise.all([
      (supabase as any)
        .from("flags")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .lte("assigned_role", profile.role),
      (supabase as any)
        .from("flags")
        .select("*", { count: "exact", head: true })
        .eq("status", "reviewing")
        .lte("assigned_role", profile.role),
      (supabase as any)
        .from("flags")
        .select("*", { count: "exact", head: true })
        .eq("status", "escalated")
        .lte("assigned_role", profile.role),
      (supabase as any)
        .from("flags")
        .select("*", { count: "exact", head: true })
        .in("status", ["resolved_removed", "resolved_flagged", "resolved_dismissed"])
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
    console.error("Get flag stats error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
