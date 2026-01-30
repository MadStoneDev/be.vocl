"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { PaddleServer, TIP_PRODUCTS, VERIFICATION_PRODUCT } from "@/lib/paddle/client";

interface PaymentResult {
  success: boolean;
  error?: string;
  transactionId?: string;
}

/**
 * Initiate a tip payment
 */
export async function initiateTip(
  recipientId: string,
  tipType: "small" | "medium" | "large",
  message?: string
): Promise<PaymentResult> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get recipient info
    const { data: recipient } = await (supabase as any)
      .from("profiles")
      .select("id, username")
      .eq("id", recipientId)
      .single();

    if (!recipient) {
      return { success: false, error: "Recipient not found" };
    }

    // Prevent self-tipping
    if (user.id === recipientId) {
      return { success: false, error: "You cannot tip yourself" };
    }

    const tipProduct = TIP_PRODUCTS[tipType];
    const transactionId = `tip_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create a pending tip record
    const { error } = await (supabase as any).from("tips").insert({
      id: transactionId,
      sender_id: user.id,
      recipient_id: recipientId,
      amount: tipProduct.amount,
      message: message?.slice(0, 280) || null,
      status: "pending",
    });

    if (error) {
      console.error("Create tip error:", error);
      return { success: false, error: "Failed to create tip" };
    }

    return {
      success: true,
      transactionId,
    };
  } catch (error) {
    console.error("Initiate tip error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Complete a tip after payment
 */
export async function completeTip(transactionId: string): Promise<PaymentResult> {
  try {
    const supabase = await createServerClient();

    // Update tip status
    const { data: tip, error } = await (supabase as any)
      .from("tips")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", transactionId)
      .eq("status", "pending")
      .select("sender_id, recipient_id, amount")
      .single();

    if (error || !tip) {
      return { success: false, error: "Tip not found or already completed" };
    }

    // Create notification for recipient
    await (supabase as any).from("notifications").insert({
      recipient_id: tip.recipient_id,
      actor_id: tip.sender_id,
      notification_type: "tip",
      is_read: false,
    });

    revalidatePath("/");
    return { success: true, transactionId };
  } catch (error) {
    console.error("Complete tip error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get tips received by a user
 */
export async function getTipsReceived(
  limit = 20,
  offset = 0
): Promise<{
  success: boolean;
  tips?: Array<{
    id: string;
    senderId: string;
    senderUsername: string;
    senderAvatarUrl?: string;
    amount: number;
    message?: string;
    createdAt: string;
  }>;
  total?: number;
  totalAmount?: number;
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

    const { data: tips, error, count } = await (supabase as any)
      .from("tips")
      .select(
        `
        id,
        sender_id,
        amount,
        message,
        created_at,
        sender:sender_id (
          username,
          avatar_url
        )
      `,
        { count: "exact" }
      )
      .eq("recipient_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { success: false, error: "Failed to fetch tips" };
    }

    // Get total amount
    const { data: totalData } = await (supabase as any)
      .from("tips")
      .select("amount")
      .eq("recipient_id", user.id)
      .eq("status", "completed");

    const totalAmount = (totalData || []).reduce(
      (sum: number, t: { amount: number }) => sum + t.amount,
      0
    );

    return {
      success: true,
      tips: (tips || []).map((tip: any) => ({
        id: tip.id,
        senderId: tip.sender_id,
        senderUsername: tip.sender?.username || "Unknown",
        senderAvatarUrl: tip.sender?.avatar_url,
        amount: tip.amount,
        message: tip.message,
        createdAt: formatTimeAgo(tip.created_at),
      })),
      total: count || 0,
      totalAmount,
    };
  } catch (error) {
    console.error("Get tips received error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Initiate verification purchase
 */
export async function initiateVerification(): Promise<PaymentResult> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if already verified
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("is_verified")
      .eq("id", user.id)
      .single();

    if (profile?.is_verified) {
      return { success: false, error: "You are already verified" };
    }

    // Check for pending verification
    const { data: pendingVerification } = await (supabase as any)
      .from("verifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .single();

    if (pendingVerification) {
      return {
        success: true,
        transactionId: pendingVerification.id,
      };
    }

    const transactionId = `verify_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create pending verification record
    const { error } = await (supabase as any).from("verifications").insert({
      id: transactionId,
      user_id: user.id,
      amount: VERIFICATION_PRODUCT.amount,
      status: "pending",
    });

    if (error) {
      console.error("Create verification error:", error);
      return { success: false, error: "Failed to create verification request" };
    }

    return {
      success: true,
      transactionId,
    };
  } catch (error) {
    console.error("Initiate verification error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Complete verification after payment
 */
export async function completeVerification(
  transactionId: string
): Promise<PaymentResult> {
  try {
    const supabase = await createServerClient();

    // Update verification status
    const { data: verification, error } = await (supabase as any)
      .from("verifications")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", transactionId)
      .eq("status", "pending")
      .select("user_id")
      .single();

    if (error || !verification) {
      return { success: false, error: "Verification not found" };
    }

    // Update user profile to verified
    await (supabase as any)
      .from("profiles")
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq("id", verification.user_id);

    revalidatePath("/profile/[username]", "page");
    revalidatePath("/settings");
    return { success: true, transactionId };
  } catch (error) {
    console.error("Complete verification error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Check if user is verified
 */
export async function checkVerificationStatus(): Promise<{
  success: boolean;
  isVerified: boolean;
  verifiedAt?: string;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, isVerified: false, error: "Unauthorized" };
    }

    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("is_verified, verified_at")
      .eq("id", user.id)
      .single();

    return {
      success: true,
      isVerified: profile?.is_verified || false,
      verifiedAt: profile?.verified_at,
    };
  } catch (error) {
    console.error("Check verification status error:", error);
    return { success: false, isVerified: false, error: "An unexpected error occurred" };
  }
}

// Helper to format time ago
function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
