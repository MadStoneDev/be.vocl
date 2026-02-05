"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================================================
// TYPES
// ============================================================================

interface InviteCode {
  id: string;
  code: string;
  creatorId: string | null;
  creatorUsername: string | null;
  maxUses: number | null;
  uses: number;
  expiresAt: string | null;
  isRevoked: boolean;
  note: string | null;
  createdAt: string;
}

interface InviteCodeUse {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  usedAt: string;
}

interface InviteResult {
  success: boolean;
  code?: string;
  error?: string;
}

// ============================================================================
// CODE GENERATION
// ============================================================================

/**
 * Generate a random invite code string
 * Format: VOCL-XXXX-XXXX
 */
function generateCodeString(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No confusing chars
  let code = "VOCL-";

  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += "-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

/**
 * Generate a new invite code (for users)
 */
export async function generateInviteCode(options?: {
  maxUses?: number;
  expiresInDays?: number;
  note?: string;
}): Promise<InviteResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user has codes remaining
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("invite_codes_remaining, role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return { success: false, error: "Profile not found" };
    }

    // Staff (role >= 5) can always generate codes
    const isStaff = profile.role >= 5;

    // Trusted Users (role >= 1) can generate codes if they have remaining
    const isTrustedUser = profile.role >= 1;

    if (!isStaff && !isTrustedUser) {
      return { success: false, error: "You need to be a Trusted User to generate invite codes" };
    }

    if (!isStaff && profile.invite_codes_remaining <= 0) {
      return { success: false, error: "You have no invite codes remaining" };
    }

    // Generate unique code
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = generateCodeString();
      const { data: existing } = await (supabase as any)
        .from("invite_codes")
        .select("id")
        .eq("code", code)
        .single();

      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return { success: false, error: "Failed to generate unique code" };
    }

    // Calculate expiration
    let expiresAt: string | null = null;
    if (options?.expiresInDays) {
      const date = new Date();
      date.setDate(date.getDate() + options.expiresInDays);
      expiresAt = date.toISOString();
    }

    // Create the code
    const { error: insertError } = await (supabase as any)
      .from("invite_codes")
      .insert({
        code,
        creator_id: user.id,
        max_uses: options?.maxUses ?? 1, // Default to single-use
        expires_at: expiresAt,
        note: options?.note || null,
      });

    if (insertError) {
      console.error("Create invite code error:", insertError);
      return { success: false, error: "Failed to create invite code" };
    }

    // Decrement user's remaining codes (unless staff)
    if (!isStaff) {
      await (supabase as any)
        .from("profiles")
        .update({
          invite_codes_remaining: profile.invite_codes_remaining - 1,
        })
        .eq("id", user.id);
    }

    revalidatePath("/settings/invites");
    return { success: true, code };
  } catch (error) {
    console.error("Generate invite code error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Generate invite code as admin (with more options)
 */
export async function adminGenerateInviteCode(options: {
  maxUses?: number;
  expiresInDays?: number;
  note?: string;
  quantity?: number;
}): Promise<{ success: boolean; codes?: string[]; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check staff role
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role < 5) {
      return { success: false, error: "Unauthorized" };
    }

    const quantity = Math.min(options.quantity || 1, 100); // Max 100 at a time
    const codes: string[] = [];

    // Calculate expiration
    let expiresAt: string | null = null;
    if (options.expiresInDays) {
      const date = new Date();
      date.setDate(date.getDate() + options.expiresInDays);
      expiresAt = date.toISOString();
    }

    for (let i = 0; i < quantity; i++) {
      // Generate unique code
      let code: string;
      let attempts = 0;

      do {
        code = generateCodeString();
        const { data: existing } = await (supabase as any)
          .from("invite_codes")
          .select("id")
          .eq("code", code)
          .single();

        if (!existing) break;
        attempts++;
      } while (attempts < 10);

      if (attempts >= 10) continue; // Skip if can't generate unique

      // Create the code
      const { error: insertError } = await (supabase as any)
        .from("invite_codes")
        .insert({
          code,
          creator_id: user.id,
          max_uses: options.maxUses || null, // null = unlimited
          expires_at: expiresAt,
          note: options.note || null,
        });

      if (!insertError) {
        codes.push(code);
      }
    }

    revalidatePath("/admin/invites");
    return { success: true, codes };
  } catch (error) {
    console.error("Admin generate invite codes error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ============================================================================
// CODE VALIDATION
// ============================================================================

/**
 * Validate an invite code (for signup)
 */
export async function validateInviteCode(code: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const normalizedCode = code.toUpperCase().trim();

    const { data: inviteCode } = await (supabase as any)
      .from("invite_codes")
      .select("id, max_uses, uses, expires_at, is_revoked")
      .eq("code", normalizedCode)
      .single();

    if (!inviteCode) {
      return { valid: false, error: "Invalid invite code" };
    }

    if (inviteCode.is_revoked) {
      return { valid: false, error: "This invite code has been revoked" };
    }

    if (inviteCode.expires_at && new Date(inviteCode.expires_at) < new Date()) {
      return { valid: false, error: "This invite code has expired" };
    }

    if (inviteCode.max_uses !== null && inviteCode.uses >= inviteCode.max_uses) {
      return { valid: false, error: "This invite code has reached its maximum uses" };
    }

    return { valid: true };
  } catch (error) {
    console.error("Validate invite code error:", error);
    return { valid: false, error: "Failed to validate code" };
  }
}

/**
 * Use an invite code (called after successful registration)
 */
export async function useInviteCode(
  code: string,
  userId: string
): Promise<InviteResult> {
  try {
    const supabase = await createClient();
    const normalizedCode = code.toUpperCase().trim();

    // Use the database function for atomic operation
    const { data, error } = await (supabase as any).rpc("use_invite_code", {
      p_code: normalizedCode,
      p_user_id: userId,
    });

    if (error) {
      console.error("Use invite code error:", error);
      return { success: false, error: "Failed to use invite code" };
    }

    if (!data.success) {
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (error) {
    console.error("Use invite code error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ============================================================================
// CODE MANAGEMENT
// ============================================================================

/**
 * Get user's own invite codes
 */
export async function getMyInviteCodes(): Promise<{
  success: boolean;
  codes?: InviteCode[];
  codesRemaining?: number;
  canGenerateCodes?: boolean;
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

    // Get profile with remaining codes
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("invite_codes_remaining, role")
      .eq("id", user.id)
      .single();

    // Get user's codes
    const { data: codes, error } = await (supabase as any)
      .from("invite_codes")
      .select("*")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get my invite codes error:", error);
      return { success: false, error: "Failed to fetch invite codes" };
    }

    const formattedCodes: InviteCode[] = (codes || []).map((c: any) => ({
      id: c.id,
      code: c.code,
      creatorId: c.creator_id,
      creatorUsername: null,
      maxUses: c.max_uses,
      uses: c.uses,
      expiresAt: c.expires_at,
      isRevoked: c.is_revoked,
      note: c.note,
      createdAt: c.created_at,
    }));

    // Determine codes remaining based on role
    let codesRemaining = 0;
    if (profile?.role >= 5) {
      codesRemaining = -1; // Unlimited for staff
    } else if (profile?.role >= 1) {
      codesRemaining = profile.invite_codes_remaining || 0; // Trusted Users
    }
    // Regular users (role 0) always get 0

    return {
      success: true,
      codes: formattedCodes,
      codesRemaining,
      canGenerateCodes: profile?.role >= 1, // Trusted User or higher
    };
  } catch (error) {
    console.error("Get my invite codes error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get who used a specific code
 */
export async function getCodeUses(codeId: string): Promise<{
  success: boolean;
  uses?: InviteCodeUse[];
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

    const { data: uses, error } = await (supabase as any)
      .from("invite_code_uses")
      .select(`
        id,
        used_at,
        user:user_id (id, username, display_name, avatar_url)
      `)
      .eq("code_id", codeId)
      .order("used_at", { ascending: false });

    if (error) {
      console.error("Get code uses error:", error);
      return { success: false, error: "Failed to fetch code uses" };
    }

    const formattedUses: InviteCodeUse[] = (uses || []).map((u: any) => ({
      id: u.id,
      userId: u.user.id,
      username: u.user.username,
      displayName: u.user.display_name,
      avatarUrl: u.user.avatar_url,
      usedAt: u.used_at,
    }));

    return { success: true, uses: formattedUses };
  } catch (error) {
    console.error("Get code uses error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Revoke an invite code
 */
export async function revokeInviteCode(codeId: string): Promise<InviteResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get user role
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isStaff = profile?.role >= 5;

    // Get the code
    const { data: code } = await (supabase as any)
      .from("invite_codes")
      .select("creator_id")
      .eq("id", codeId)
      .single();

    if (!code) {
      return { success: false, error: "Code not found" };
    }

    // Check permission (own code or staff)
    if (code.creator_id !== user.id && !isStaff) {
      return { success: false, error: "Unauthorized" };
    }

    // Revoke the code
    const { error: updateError } = await (supabase as any)
      .from("invite_codes")
      .update({
        is_revoked: true,
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
      })
      .eq("id", codeId);

    if (updateError) {
      console.error("Revoke invite code error:", updateError);
      return { success: false, error: "Failed to revoke code" };
    }

    revalidatePath("/settings/invites");
    revalidatePath("/admin/invites");
    return { success: true };
  } catch (error) {
    console.error("Revoke invite code error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/**
 * Get all invite codes (admin)
 */
export async function adminGetAllInviteCodes(options?: {
  limit?: number;
  offset?: number;
  showRevoked?: boolean;
}): Promise<{
  success: boolean;
  codes?: InviteCode[];
  total?: number;
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

    // Check staff role
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role < 5) {
      return { success: false, error: "Unauthorized" };
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    let query = (supabase as any)
      .from("invite_codes")
      .select(
        `
        *,
        creator:creator_id (username)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (!options?.showRevoked) {
      query = query.eq("is_revoked", false);
    }

    const { data: codes, count, error } = await query;

    if (error) {
      console.error("Admin get codes error:", error);
      return { success: false, error: "Failed to fetch codes" };
    }

    const formattedCodes: InviteCode[] = (codes || []).map((c: any) => ({
      id: c.id,
      code: c.code,
      creatorId: c.creator_id,
      creatorUsername: c.creator?.username || null,
      maxUses: c.max_uses,
      uses: c.uses,
      expiresAt: c.expires_at,
      isRevoked: c.is_revoked,
      note: c.note,
      createdAt: c.created_at,
    }));

    return { success: true, codes: formattedCodes, total: count || 0 };
  } catch (error) {
    console.error("Admin get codes error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get invite stats (admin)
 */
export async function adminGetInviteStats(): Promise<{
  success: boolean;
  stats?: {
    totalCodes: number;
    activeCodes: number;
    totalUses: number;
    usersWithCodes: number;
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

    // Check staff role
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role < 5) {
      return { success: false, error: "Unauthorized" };
    }

    const [
      { count: totalCodes },
      { count: activeCodes },
      { count: totalUses },
      { count: usersWithCodes },
    ] = await Promise.all([
      (supabase as any)
        .from("invite_codes")
        .select("*", { count: "exact", head: true }),
      (supabase as any)
        .from("invite_codes")
        .select("*", { count: "exact", head: true })
        .eq("is_revoked", false),
      (supabase as any)
        .from("invite_code_uses")
        .select("*", { count: "exact", head: true }),
      (supabase as any)
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gt("invite_codes_remaining", 0),
    ]);

    return {
      success: true,
      stats: {
        totalCodes: totalCodes || 0,
        activeCodes: activeCodes || 0,
        totalUses: totalUses || 0,
        usersWithCodes: usersWithCodes || 0,
      },
    };
  } catch (error) {
    console.error("Admin get invite stats error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Grant additional invite codes to a user (admin)
 */
export async function adminGrantInviteCodes(
  userId: string,
  amount: number
): Promise<InviteResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check admin role
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role < 10) {
      return { success: false, error: "Unauthorized" };
    }

    // Update target user's invite codes
    const { error: updateError } = await (supabase as any).rpc(
      "increment_invite_codes",
      { user_id: userId, amount }
    );

    // Fallback if function doesn't exist
    if (updateError) {
      const { data: targetProfile } = await (supabase as any)
        .from("profiles")
        .select("invite_codes_remaining")
        .eq("id", userId)
        .single();

      if (!targetProfile) {
        return { success: false, error: "User not found" };
      }

      await (supabase as any)
        .from("profiles")
        .update({
          invite_codes_remaining: (targetProfile.invite_codes_remaining || 0) + amount,
        })
        .eq("id", userId);
    }

    revalidatePath("/admin/invites");
    return { success: true };
  } catch (error) {
    console.error("Admin grant invite codes error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
