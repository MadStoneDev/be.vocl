"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Accept the content promise
 */
export async function acceptContentPromise(): Promise<{
  success: boolean;
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

    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        promise_accepted_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("Accept promise error:", error);
      return { success: false, error: "Failed to save acceptance" };
    }

    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.error("Accept promise error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Check if user has accepted the promise
 */
export async function hasAcceptedPromise(): Promise<{
  success: boolean;
  accepted: boolean;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, accepted: false };
    }

    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("promise_accepted_at")
      .eq("id", user.id)
      .single();

    if (error) {
      return { success: false, accepted: false };
    }

    return {
      success: true,
      accepted: !!data?.promise_accepted_at,
    };
  } catch (error) {
    return { success: false, accepted: false };
  }
}

/**
 * Request data export
 */
export async function requestDataExport(): Promise<{
  success: boolean;
  requestId?: string;
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

    // Check for pending requests
    const { data: pendingRequest } = await (supabase as any)
      .from("data_export_requests")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["pending", "processing"])
      .single();

    if (pendingRequest) {
      return {
        success: false,
        error: "You already have a pending export request",
      };
    }

    // Create new export request
    const { data: request, error } = await (supabase as any)
      .from("data_export_requests")
      .insert({
        user_id: user.id,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Create export request error:", error);
      return { success: false, error: "Failed to create export request" };
    }

    // TODO: Trigger background job to compile data
    // For now, we'll handle this via a cron job that processes pending requests

    return { success: true, requestId: request.id };
  } catch (error) {
    console.error("Request export error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get export request status
 */
export async function getExportStatus(): Promise<{
  success: boolean;
  status?: string;
  fileUrl?: string;
  expiresAt?: string;
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

    const { data, error } = await (supabase as any)
      .from("data_export_requests")
      .select("status, file_url, expires_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return { success: true, status: "none" };
    }

    return {
      success: true,
      status: data.status,
      fileUrl: data.file_url,
      expiresAt: data.expires_at,
    };
  } catch (error) {
    return { success: false, error: "Failed to get export status" };
  }
}

/**
 * Delete (anonymize) account
 */
export async function deleteAccount(): Promise<{
  success: boolean;
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

    // Generate random suffix for anonymized username
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const deletedUsername = `deleteduser-${randomSuffix}`;
    const deletedEmail = `deleted-${randomSuffix}@deleted.vocl.local`;

    // Anonymize profile
    const { error: profileError } = await (supabase as any)
      .from("profiles")
      .update({
        username: deletedUsername,
        display_name: "Deleted User",
        avatar_url: null,
        header_url: null,
        bio: null,
        timezone: "UTC",
        show_likes: false,
        show_comments: false,
        show_followers: false,
        show_following: false,
        lock_status: "banned",
        banned_at: new Date().toISOString(),
        ban_reason: "Account deleted by user",
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Profile anonymization error:", profileError);
      return { success: false, error: "Failed to delete account" };
    }

    // Delete profile links
    await (supabase as any)
      .from("profile_links")
      .delete()
      .eq("profile_id", user.id);

    // Delete follows (both directions)
    await (supabase as any)
      .from("follows")
      .delete()
      .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`);

    // Delete likes
    await (supabase as any)
      .from("likes")
      .delete()
      .eq("user_id", user.id);

    // Delete notifications
    await (supabase as any)
      .from("notifications")
      .delete()
      .eq("recipient_id", user.id);

    // Update auth user email (requires admin client)
    // Note: This requires service role key
    const supabaseAdmin = await createClient();
    try {
      await (supabaseAdmin as any).auth.admin.updateUserById(user.id, {
        email: deletedEmail,
        email_confirm: true,
      });
    } catch (authError) {
      console.error("Auth update error (non-critical):", authError);
    }

    // Sign out the user
    await supabase.auth.signOut();

    return { success: true };
  } catch (error) {
    console.error("Delete account error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get user's lock status
 */
export async function getUserLockStatus(): Promise<{
  success: boolean;
  lockStatus?: "unlocked" | "restricted" | "banned";
  banReason?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false };
    }

    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("lock_status, ban_reason")
      .eq("id", user.id)
      .single();

    if (error) {
      return { success: false };
    }

    return {
      success: true,
      lockStatus: data.lock_status || "unlocked",
      banReason: data.ban_reason,
    };
  } catch (error) {
    return { success: false };
  }
}
