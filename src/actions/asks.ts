"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimiters } from "@/lib/rate-limit";

interface AskResult {
  success: boolean;
  askId?: string;
  error?: string;
}

interface Ask {
  id: string;
  question: string;
  is_anonymous: boolean;
  status: "pending" | "answered" | "deleted";
  created_at: string;
  sender?: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

interface AskListResult {
  success: boolean;
  asks?: Ask[];
  error?: string;
}

/**
 * Send an ask to a user
 */
export async function sendAsk(
  recipientUsername: string,
  question: string,
  isAnonymous: boolean
): Promise<AskResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Rate limit: 20 asks per hour per user
    const rateLimit = rateLimiters.report(`ask:${user.id}`); // Reuse report limiter
    if (!rateLimit.allowed) {
      return { success: false, error: "You're sending too many asks. Please try again later." };
    }

    // Validate question
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      return { success: false, error: "Question cannot be empty" };
    }
    if (trimmedQuestion.length > 500) {
      return { success: false, error: "Question is too long (max 500 characters)" };
    }

    // Get recipient by username
    const { data: recipient } = await (supabase as any)
      .from("profiles")
      .select("id, allow_asks, allow_anonymous_asks")
      .eq("username", recipientUsername)
      .single();

    if (!recipient) {
      return { success: false, error: "User not found" };
    }

    // Check if asking yourself
    if (recipient.id === user.id) {
      return { success: false, error: "You cannot send asks to yourself" };
    }

    // Check if recipient allows asks
    if (!recipient.allow_asks) {
      return { success: false, error: "This user is not accepting asks" };
    }

    // Check if anonymous asks are allowed
    if (isAnonymous && !recipient.allow_anonymous_asks) {
      return { success: false, error: "This user does not accept anonymous asks" };
    }

    // Check if user is blocked by recipient
    const { data: blocked } = await (supabase as any)
      .from("blocks")
      .select("id")
      .eq("blocker_id", recipient.id)
      .eq("blocked_id", user.id)
      .single();

    if (blocked) {
      return { success: false, error: "You cannot send asks to this user" };
    }

    // Create the ask
    const { data: ask, error } = await (supabase as any)
      .from("asks")
      .insert({
        recipient_id: recipient.id,
        sender_id: isAnonymous ? null : user.id,
        question: trimmedQuestion,
        is_anonymous: isAnonymous,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Send ask error:", error);
      return { success: false, error: "Failed to send ask" };
    }

    // Create notification for recipient
    await (supabase as any).from("notifications").insert({
      recipient_id: recipient.id,
      actor_id: isAnonymous ? null : user.id,
      notification_type: "mention", // Use 'mention' for now, can add 'ask' type later
      is_read: false,
    });

    return { success: true, askId: ask.id };
  } catch (error) {
    console.error("Send ask error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get pending asks for current user (inbox)
 */
export async function getMyAsks(): Promise<AskListResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data: asks, error } = await (supabase as any)
      .from("asks")
      .select(`
        id,
        question,
        is_anonymous,
        status,
        created_at,
        sender:profiles!asks_sender_id_fkey(id, username, avatar_url)
      `)
      .eq("recipient_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get asks error:", error);
      return { success: false, error: "Failed to fetch asks" };
    }

    return { success: true, asks };
  } catch (error) {
    console.error("Get asks error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get count of pending asks
 */
export async function getPendingAskCount(): Promise<{
  success: boolean;
  count: number;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, count: 0 };
    }

    const { count, error } = await (supabase as any)
      .from("asks")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("status", "pending");

    if (error) {
      return { success: false, count: 0 };
    }

    return { success: true, count: count || 0 };
  } catch (error) {
    return { success: false, count: 0 };
  }
}

/**
 * Answer an ask (creates a post)
 */
export async function answerAsk(
  askId: string,
  answerHtml: string
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate answer
    const trimmedAnswer = answerHtml.trim();
    if (!trimmedAnswer) {
      return { success: false, error: "Answer cannot be empty" };
    }

    // Get the ask
    const { data: ask } = await (supabase as any)
      .from("asks")
      .select("*, sender:profiles!asks_sender_id_fkey(id, username)")
      .eq("id", askId)
      .eq("recipient_id", user.id)
      .eq("status", "pending")
      .single();

    if (!ask) {
      return { success: false, error: "Ask not found" };
    }

    // Create the post
    const content = {
      question: ask.question,
      answer_html: trimmedAnswer,
      asker_id: ask.is_anonymous ? null : ask.sender_id,
      asker_username: ask.is_anonymous ? "Anonymous" : ask.sender?.username,
      is_anonymous: ask.is_anonymous,
    };

    const { data: post, error: postError } = await (supabase as any)
      .from("posts")
      .insert({
        author_id: user.id,
        post_type: "ask",
        content,
        is_sensitive: false,
        status: "published",
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (postError) {
      console.error("Create ask post error:", postError);
      return { success: false, error: "Failed to create post" };
    }

    // Update ask status
    await (supabase as any)
      .from("asks")
      .update({
        status: "answered",
        answered_post_id: post.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", askId);

    // Notify the asker if not anonymous
    if (!ask.is_anonymous && ask.sender_id) {
      await (supabase as any).from("notifications").insert({
        recipient_id: ask.sender_id,
        actor_id: user.id,
        notification_type: "mention", // Can add 'ask_answered' type later
        post_id: post.id,
        is_read: false,
      });
    }

    revalidatePath("/feed");
    return { success: true, postId: post.id };
  } catch (error) {
    console.error("Answer ask error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Delete/ignore an ask
 */
export async function deleteAsk(askId: string): Promise<AskResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await (supabase as any)
      .from("asks")
      .update({
        status: "deleted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", askId)
      .eq("recipient_id", user.id);

    if (error) {
      console.error("Delete ask error:", error);
      return { success: false, error: "Failed to delete ask" };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete ask error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Check if current user can send asks to a user
 */
export async function canSendAskTo(username: string): Promise<{
  canAsk: boolean;
  allowsAnonymous: boolean;
  reason?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { canAsk: false, allowsAnonymous: false, reason: "Not logged in" };
    }

    // Get recipient settings
    const { data: recipient } = await (supabase as any)
      .from("profiles")
      .select("id, allow_asks, allow_anonymous_asks")
      .eq("username", username)
      .single();

    if (!recipient) {
      return { canAsk: false, allowsAnonymous: false, reason: "User not found" };
    }

    if (recipient.id === user.id) {
      return { canAsk: false, allowsAnonymous: false, reason: "Cannot ask yourself" };
    }

    if (!recipient.allow_asks) {
      return { canAsk: false, allowsAnonymous: false, reason: "User is not accepting asks" };
    }

    // Check if blocked
    const { data: blocked } = await (supabase as any)
      .from("blocks")
      .select("id")
      .eq("blocker_id", recipient.id)
      .eq("blocked_id", user.id)
      .single();

    if (blocked) {
      return { canAsk: false, allowsAnonymous: false, reason: "Cannot send asks to this user" };
    }

    return {
      canAsk: true,
      allowsAnonymous: recipient.allow_anonymous_asks,
    };
  } catch (error) {
    return { canAsk: false, allowsAnonymous: false, reason: "Error checking permissions" };
  }
}

/**
 * Update ask settings for current user
 */
export async function updateAskSettings(
  allowAsks: boolean,
  allowAnonymousAsks: boolean
): Promise<{ success: boolean; error?: string }> {
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
        allow_asks: allowAsks,
        allow_anonymous_asks: allowAnonymousAsks,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("Update ask settings error:", error);
      return { success: false, error: "Failed to update settings" };
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Update ask settings error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
