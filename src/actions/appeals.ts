"use server";

import { createServerClient } from "@/lib/supabase/server";

/**
 * Submit an appeal for a banned or restricted account
 */
export async function submitAppeal(reason: string): Promise<{
  success: boolean;
  appealId?: string;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check user's lock status and if appeals are blocked
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("lock_status, appeals_blocked")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return { success: false, error: "Profile not found" };
    }

    if (profile.lock_status === "unlocked") {
      return { success: false, error: "Your account is not restricted" };
    }

    if (profile.appeals_blocked) {
      return { success: false, error: "Your ability to submit appeals has been revoked" };
    }

    // Check for pending appeal
    const { data: pendingAppeal } = await (supabase as any)
      .from("appeals")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .single();

    if (pendingAppeal) {
      return { success: false, error: "You already have a pending appeal" };
    }

    // Create appeal
    const { data: appeal, error } = await (supabase as any)
      .from("appeals")
      .insert({
        user_id: user.id,
        reason: reason.trim(),
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Appeal submission error:", error);
      return { success: false, error: "Failed to submit appeal" };
    }

    // Notify admins via email (if email service is configured)
    // For now we'll just create a notification
    try {
      const { data: admins } = await (supabase as any)
        .from("profiles")
        .select("id")
        .gte("role", 10);

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin: { id: string }) => ({
          recipient_id: admin.id,
          notification_type: "system",
          message: `New appeal submitted by user ${user.id}`,
          created_at: new Date().toISOString(),
        }));

        // Note: You might want to add a system notification type
        // For now, this is a placeholder for admin notification logic
      }
    } catch (notifyError) {
      console.error("Admin notification error:", notifyError);
      // Non-critical, continue
    }

    return { success: true, appealId: appeal.id };
  } catch (error) {
    console.error("Submit appeal error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get current user's appeal status
 */
export async function getUserAppealStatus(): Promise<{
  success: boolean;
  status?: "none" | "pending" | "approved" | "denied" | "blocked";
  reason?: string;
  reviewNotes?: string;
  createdAt?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false };
    }

    // Check if appeals are blocked
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("appeals_blocked")
      .eq("id", user.id)
      .single();

    if (profile?.appeals_blocked) {
      return { success: true, status: "blocked" };
    }

    // Get latest appeal
    const { data: appeal, error } = await (supabase as any)
      .from("appeals")
      .select("status, reason, review_notes, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !appeal) {
      return { success: true, status: "none" };
    }

    return {
      success: true,
      status: appeal.status,
      reason: appeal.reason,
      reviewNotes: appeal.review_notes,
      createdAt: appeal.created_at,
    };
  } catch (error) {
    console.error("Get appeal status error:", error);
    return { success: false };
  }
}

/**
 * Get all appeals for a user (admin use)
 */
export async function getUserAppeals(userId: string): Promise<{
  success: boolean;
  appeals?: Array<{
    id: string;
    reason: string;
    status: string;
    reviewNotes?: string;
    createdAt: string;
    reviewedAt?: string;
  }>;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false };
    }

    // Check admin role
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role < 5) {
      return { success: false };
    }

    const { data: appeals, error } = await (supabase as any)
      .from("appeals")
      .select("id, reason, status, review_notes, created_at, reviewed_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false };
    }

    return {
      success: true,
      appeals: appeals?.map((a: any) => ({
        id: a.id,
        reason: a.reason,
        status: a.status,
        reviewNotes: a.review_notes,
        createdAt: a.created_at,
        reviewedAt: a.reviewed_at,
      })),
    };
  } catch (error) {
    return { success: false };
  }
}
