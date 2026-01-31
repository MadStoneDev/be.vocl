"use server";

import { createClient } from "@/lib/supabase/server";
import { sendMentionNotification } from "@/actions/email";

/**
 * Extract @mentions from text content
 * Matches @username patterns (alphanumeric and underscores)
 */
export async function extractMentions(text: string): Promise<string[]> {
  if (!text) return [];

  // Remove HTML tags first
  const plainText = text.replace(/<[^>]*>/g, " ");

  // Match @username patterns
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const matches = plainText.match(mentionRegex);

  if (!matches) return [];

  // Remove @ prefix and dedupe
  const usernames = [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];

  return usernames;
}

/**
 * Process mentions in content and create notifications
 */
export async function processMentions(
  content: string,
  authorId: string,
  postId: string,
  type: "post" | "comment" = "post"
): Promise<{ success: boolean; mentionedCount: number }> {
  try {
    const usernames = await extractMentions(content);

    if (usernames?.length === 0) {
      return { success: true, mentionedCount: 0 };
    }

    const supabase = await createClient();

    // Look up user IDs for the mentioned usernames
    const { data: mentionedUsers, error } = await supabase
      .from("profiles")
      .select("id, username")
      .in("username", usernames);

    if (error) {
      console.error("Error looking up mentioned users:", error);
      return { success: false, mentionedCount: 0 };
    }

    if (!mentionedUsers || mentionedUsers.length === 0) {
      return { success: true, mentionedCount: 0 };
    }

    let mentionedCount = 0;

    // Create notifications for each mentioned user
    for (const user of mentionedUsers) {
      // Don't notify yourself
      if (user.id === authorId) continue;

      // Create in-app notification
      await supabase.from("notifications").insert({
        recipient_id: user.id,
        actor_id: authorId,
        notification_type: "mention",
        post_id: postId,
      });

      // Send email notification
      const contextPreview = content.replace(/<[^>]*>/g, "").slice(0, 200);
      await sendMentionNotification(authorId, user.id, postId, contextPreview);

      mentionedCount++;
    }

    return { success: true, mentionedCount };
  } catch (error) {
    console.error("Process mentions error:", error);
    return { success: false, mentionedCount: 0 };
  }
}
