"use server";

import { createClient } from "@/lib/supabase/server";

interface ReactionResult {
  success: boolean;
  /** Whether the reaction is now present (true) or was removed (false). */
  reacted?: boolean;
  error?: string;
}

/**
 * Toggle a message reaction for the current user.
 *
 * Inserts the reaction if the user hasn't reacted with this emoji yet, deletes
 * it if they have. Respects the UNIQUE(message_id, user_id, emoji) constraint
 * and the RLS policies (INSERT/DELETE only when user_id = auth.uid() and the
 * user is a conversation member).
 */
export async function toggleMessageReaction(
  messageId: string,
  emoji: string
): Promise<ReactionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const trimmed = emoji.trim();
    if (!trimmed) {
      return { success: false, error: "Invalid emoji" };
    }

    // Is this reaction already present?
    const { data: existing } = await (supabase as any)
      .from("message_reactions")
      .select("id")
      .eq("message_id", messageId)
      .eq("user_id", user.id)
      .eq("emoji", trimmed)
      .maybeSingle();

    if (existing) {
      const { error } = await (supabase as any)
        .from("message_reactions")
        .delete()
        .eq("id", existing.id);
      if (error) {
        return { success: false, error: "Failed to remove reaction" };
      }
      return { success: true, reacted: false };
    }

    const { error } = await (supabase as any)
      .from("message_reactions")
      .insert({
        message_id: messageId,
        user_id: user.id,
        emoji: trimmed,
      });

    if (error) {
      // A unique-violation here means a concurrent insert already added it;
      // treat as success (reaction present).
      if ((error as any).code === "23505") {
        return { success: true, reacted: true };
      }
      return { success: false, error: "Failed to add reaction" };
    }

    return { success: true, reacted: true };
  } catch (error) {
    console.error("Toggle reaction error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
