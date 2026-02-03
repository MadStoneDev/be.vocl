"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface MessageResult {
  success: boolean;
  messageId?: string;
  conversationId?: string;
  error?: string;
}

interface Message {
  id: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  senderId: string;
  isRead: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
}

interface Conversation {
  id: string;
  participant: {
    id: string;
    username: string;
    avatarUrl?: string;
    isOnline?: boolean;
  };
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
    isRead: boolean;
  };
  unreadCount: number;
}

/**
 * Get all conversations for current user
 * Optimized: Uses batch queries instead of N+1
 */
export async function getConversations(): Promise<{
  success: boolean;
  conversations?: Conversation[];
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

    // Get conversations where user is a participant
    const { data: participations, error: partError } = await (supabase as any)
      .from("conversation_participants")
      .select(
        `
        conversation_id,
        last_read_at,
        conversation:conversation_id (
          id,
          updated_at
        )
      `
      )
      .eq("profile_id", user.id);

    if (partError) {
      console.error("Get conversations error:", partError);
      return { success: false, error: "Failed to fetch conversations" };
    }

    if (!participations || participations.length === 0) {
      return { success: true, conversations: [] };
    }

    const conversationIds = participations.map((p: any) => p.conversation_id);

    // Batch fetch: Get all other participants for all conversations at once
    const { data: allParticipants } = await (supabase as any)
      .from("conversation_participants")
      .select(
        `
        conversation_id,
        profile:profile_id (
          id,
          username,
          avatar_url
        )
      `
      )
      .in("conversation_id", conversationIds)
      .neq("profile_id", user.id);

    // Batch fetch: Get latest message for each conversation using a subquery approach
    // We'll get all recent messages and pick the latest per conversation in JS
    const { data: allMessages } = await (supabase as any)
      .from("messages")
      .select("id, conversation_id, content, sender_id, created_at")
      .in("conversation_id", conversationIds)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    // Batch fetch: Get unread counts - get all unread messages and count in JS
    const { data: unreadMessages } = await (supabase as any)
      .from("messages")
      .select("conversation_id, created_at")
      .in("conversation_id", conversationIds)
      .neq("sender_id", user.id);

    // Build lookup maps for O(1) access
    const participantMap = new Map<string, any>();
    for (const p of allParticipants || []) {
      if (p.profile) {
        participantMap.set(p.conversation_id, p.profile);
      }
    }

    // Get latest message per conversation
    const lastMessageMap = new Map<string, any>();
    for (const msg of allMessages || []) {
      if (!lastMessageMap.has(msg.conversation_id)) {
        lastMessageMap.set(msg.conversation_id, msg);
      }
    }

    // Build last_read_at lookup
    const lastReadMap = new Map<string, string>();
    for (const p of participations) {
      lastReadMap.set(p.conversation_id, p.last_read_at || "1970-01-01");
    }

    // Count unread messages per conversation
    const unreadCountMap = new Map<string, number>();
    for (const msg of unreadMessages || []) {
      const lastRead = lastReadMap.get(msg.conversation_id) || "1970-01-01";
      if (new Date(msg.created_at) > new Date(lastRead)) {
        unreadCountMap.set(msg.conversation_id, (unreadCountMap.get(msg.conversation_id) || 0) + 1);
      }
    }

    // Build conversations array
    const conversations: Conversation[] = [];
    for (const part of participations) {
      const participant = participantMap.get(part.conversation_id);
      if (!participant) continue;

      const lastMessage = lastMessageMap.get(part.conversation_id);
      const lastReadAt = part.last_read_at;

      conversations.push({
        id: part.conversation_id,
        participant: {
          id: participant.id,
          username: participant.username,
          avatarUrl: participant.avatar_url,
          isOnline: false,
        },
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              senderId: lastMessage.sender_id,
              createdAt: formatTimeAgo(lastMessage.created_at),
              isRead: lastMessage.sender_id === user.id ||
                     (lastReadAt && new Date(lastMessage.created_at) <= new Date(lastReadAt)),
            }
          : undefined,
        unreadCount: unreadCountMap.get(part.conversation_id) || 0,
      });
    }

    // Sort by most recent message
    conversations.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return 0;
    });

    return { success: true, conversations };
  } catch (error) {
    console.error("Get conversations error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  conversationId: string,
  limit = 50,
  before?: string
): Promise<{
  success: boolean;
  messages?: Message[];
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

    // Verify user is participant
    const { data: isParticipant } = await (supabase as any)
      .from("conversation_participants")
      .select("conversation_id")
      .eq("conversation_id", conversationId)
      .eq("profile_id", user.id)
      .single();

    if (!isParticipant) {
      return { success: false, error: "Access denied" };
    }

    let query = (supabase as any)
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: "Failed to fetch messages" };
    }

    // Mark as read
    await (supabase as any)
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("profile_id", user.id);

    const messages: Message[] = (data || [])
      .reverse()
      .map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        mediaUrl: msg.media_url,
        mediaType: msg.media_type,
        senderId: msg.sender_id,
        isRead: true, // Marked as read by fetching
        isEdited: msg.is_edited,
        isDeleted: msg.is_deleted,
        createdAt: formatTime(msg.created_at),
      }));

    return { success: true, messages };
  } catch (error) {
    console.error("Get messages error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Send a message
 */
export async function sendMessage(
  conversationId: string,
  content: string,
  mediaUrl?: string,
  mediaType?: string
): Promise<MessageResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify user is participant
    const { data: isParticipant } = await (supabase as any)
      .from("conversation_participants")
      .select("conversation_id")
      .eq("conversation_id", conversationId)
      .eq("profile_id", user.id)
      .single();

    if (!isParticipant) {
      return { success: false, error: "Access denied" };
    }

    // Create message
    const { data: message, error } = await (supabase as any)
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Send message error:", error);
      return { success: false, error: "Failed to send message" };
    }

    // Update conversation timestamp
    await (supabase as any)
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    // Create notification for other participant
    const { data: otherParticipant } = await (supabase as any)
      .from("conversation_participants")
      .select("profile_id")
      .eq("conversation_id", conversationId)
      .neq("profile_id", user.id)
      .single();

    if (otherParticipant) {
      await (supabase as any).from("notifications").insert({
        recipient_id: otherParticipant.profile_id,
        actor_id: user.id,
        notification_type: "message",
        message_id: message.id,
      });
    }

    revalidatePath("/");
    return { success: true, messageId: message.id, conversationId };
  } catch (error) {
    console.error("Send message error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Start a new conversation
 * Optimized: Uses single query to find existing conversation instead of N+1
 */
export async function startConversation(
  participantId: string
): Promise<MessageResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    if (user.id === participantId) {
      return { success: false, error: "Cannot start conversation with yourself" };
    }

    // Check if conversation already exists using a single optimized query
    // Find conversations where both users are participants
    const { data: myConversations } = await (supabase as any)
      .from("conversation_participants")
      .select("conversation_id")
      .eq("profile_id", user.id);

    if (myConversations && myConversations.length > 0) {
      const myConversationIds = myConversations.map((c: any) => c.conversation_id);

      // Single query to check if target user is in any of these conversations
      const { data: sharedConversation } = await (supabase as any)
        .from("conversation_participants")
        .select("conversation_id")
        .eq("profile_id", participantId)
        .in("conversation_id", myConversationIds)
        .limit(1)
        .single();

      if (sharedConversation) {
        return { success: true, conversationId: sharedConversation.conversation_id };
      }
    }

    // Create new conversation
    const { data: conversation, error: convError } = await (supabase as any)
      .from("conversations")
      .insert({})
      .select("id")
      .single();

    if (convError) {
      return { success: false, error: "Failed to create conversation" };
    }

    // Add participants
    const { error: partError } = await (supabase as any)
      .from("conversation_participants")
      .insert([
        { conversation_id: conversation.id, profile_id: user.id },
        { conversation_id: conversation.id, profile_id: participantId },
      ]);

    if (partError) {
      return { success: false, error: "Failed to add participants" };
    }

    return { success: true, conversationId: conversation.id };
  } catch (error) {
    console.error("Start conversation error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Edit a message
 */
export async function editMessage(
  messageId: string,
  newContent: string
): Promise<MessageResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await (supabase as any)
      .from("messages")
      .update({
        content: newContent,
        is_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .eq("sender_id", user.id);

    if (error) {
      return { success: false, error: "Failed to edit message" };
    }

    return { success: true, messageId };
  } catch (error) {
    console.error("Edit message error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Delete a message (soft delete)
 */
export async function deleteMessage(messageId: string): Promise<MessageResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await (supabase as any)
      .from("messages")
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .eq("sender_id", user.id);

    if (error) {
      return { success: false, error: "Failed to delete message" };
    }

    return { success: true, messageId };
  } catch (error) {
    console.error("Delete message error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Mark conversation as read
 */
export async function markConversationAsRead(
  conversationId: string
): Promise<MessageResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await (supabase as any)
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("profile_id", user.id);

    if (error) {
      return { success: false, error: "Failed to mark as read" };
    }

    return { success: true, conversationId };
  } catch (error) {
    console.error("Mark as read error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Helper functions
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

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
