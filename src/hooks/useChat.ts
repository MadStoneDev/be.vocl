"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getConversations,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markConversationAsRead,
  startConversation,
} from "@/actions/messages";
import { toggleMessageReaction } from "@/actions/message-reactions";

interface Participant {
  id: string;
  username: string;
  avatarUrl?: string;
  isOnline?: boolean;
}

interface LastMessage {
  content: string;
  senderId: string;
  createdAt: string;
  isRead: boolean;
}

interface Conversation {
  id: string;
  participant: Participant;
  lastMessage?: LastMessage;
  unreadCount: number;
  isMuted?: boolean;
}

interface MessageReaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

interface ReplyContext {
  id: string;
  senderId: string;
  senderName?: string;
  preview: string;
}

interface Message {
  id: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaDuration?: number;
  senderId: string;
  isRead: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  reactions: MessageReaction[];
  replyTo?: ReplyContext;
}

interface UseChatReturn {
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  totalUnread: number;
  refreshConversations: () => Promise<void>;
  startNewConversation: (participantId: string) => Promise<string | null>;
}

interface UseMessagesReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendNewMessage: (
    content: string,
    mediaUrl?: string,
    mediaType?: string,
    mediaDuration?: number,
    replyToId?: string
  ) => Promise<boolean>;
  editExistingMessage: (messageId: string, newContent: string) => Promise<boolean>;
  deleteExistingMessage: (messageId: string) => Promise<boolean>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  hasMore: boolean;
  isLoadingMore: boolean;
}

/**
 * Hook for managing conversations list
 */
export function useChat(currentUserId?: string): UseChatReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getConversations();
      if (result.success && result.conversations) {
        setConversations(result.conversations);
      } else {
        console.error("Get conversations error:", result.error);
        setError(result.error || "Failed to load conversations");
      }
    } catch (err) {
      console.error("Get conversations exception:", err);
      setError("Failed to load conversations");
    }

    setIsLoading(false);
  }, []);

  // Initial load
  useEffect(() => {
    if (currentUserId) {
      refreshConversations();
    }
  }, [currentUserId, refreshConversations]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!currentUserId) return;

    const supabase = createClient();

    // Subscribe to new messages for all conversations the user is in
    const channel = supabase
      .channel("chat-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload: any) => {
          // Refresh conversations when a new message arrives
          refreshConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, refreshConversations]);

  const startNewConversation = useCallback(async (participantId: string): Promise<string | null> => {
    const result = await startConversation(participantId);
    if (result.success && result.conversationId) {
      await refreshConversations();
      return result.conversationId;
    }
    return null;
  }, [refreshConversations]);

  const totalUnread = conversations.reduce(
    (sum, c) => sum + (c.isMuted ? 0 : c.unreadCount),
    0
  );

  return {
    conversations,
    isLoading,
    error,
    totalUnread,
    refreshConversations,
    startNewConversation,
  };
}

/**
 * Hook for managing messages in a conversation
 */
export function useMessages(
  conversationId: string | null,
  currentUserId?: string
): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Mirror of the loaded message ids so the reactions realtime handler (which
  // can't filter on conversation_id, since message_reactions has none) can
  // cheaply ignore events for messages not in this conversation.
  const messageIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    messageIdsRef.current = new Set(messages.map((m) => m.id));
  }, [messages]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      setIsLoading(true);
      setError(null);

      const result = await getMessages(conversationId);
      // Bail if the conversation changed (or we unmounted) while awaiting, so a
      // stale fetch can't overwrite a newer conversation's messages.
      if (cancelled) return;
      if (result.success && result.messages) {
        setMessages(result.messages);
        setHasMore(result.messages.length >= 50);
      } else {
        setError(result.error || "Failed to load messages");
      }

      setIsLoading(false);
    };

    loadMessages();

    // Mark conversation as read
    markConversationAsRead(conversationId);

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Real-time subscription for this conversation
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          const newMessage = payload.new as any;
          const mapped: Message = {
            id: newMessage.id,
            content: newMessage.content,
            mediaUrl: newMessage.media_url,
            mediaType: newMessage.media_type,
            mediaDuration: newMessage.media_duration ?? undefined,
            senderId: newMessage.sender_id,
            isRead: false,
            isEdited: newMessage.is_edited,
            isDeleted: newMessage.is_deleted,
            // Carry the raw ISO timestamp; components format it.
            createdAt: newMessage.created_at,
            reactions: [],
            // Reply preview for realtime inserts is resolved lazily; the
            // sender's own optimistic copy carries it, and a full reload
            // (on conversation open) backfills it for receivers.
            replyTo: undefined,
          };
          // Dedup by id so realtime echoes / multi-tab inserts don't append twice.
          setMessages((prev) =>
            prev.some((m) => m.id === mapped.id) ? prev : [...prev, mapped]
          );
          // Mark as read only for messages we didn't send.
          if (newMessage.sender_id !== currentUserId) {
            markConversationAsRead(conversationId);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          const updatedMessage = payload.new as any;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updatedMessage.id
                ? {
                    ...m,
                    content: updatedMessage.content,
                    isEdited: updatedMessage.is_edited,
                    isDeleted: updatedMessage.is_deleted,
                  }
                : m
            )
          );
        }
      )
      // Read receipts: when the OTHER participant's last_read_at advances, mark
      // our sent messages up to that timestamp as read.
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_participants",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          const row = payload.new as any;
          if (!row || row.profile_id === currentUserId || !row.last_read_at) return;
          const readAt = new Date(row.last_read_at).getTime();
          setMessages((prev) =>
            prev.map((m) =>
              m.senderId === currentUserId &&
              !m.isRead &&
              new Date(m.createdAt).getTime() <= readAt
                ? { ...m, isRead: true }
                : m
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  // Real-time subscription for reactions on this conversation's messages.
  // message_reactions has no conversation_id column, so we subscribe to all
  // INSERT/DELETE events and ignore any that don't target a loaded message.
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const supabase = createClient();

    const applyDelta = (messageId: string, emoji: string, userId: string, delta: 1 | -1) => {
      if (!messageIdsRef.current.has(messageId)) return;
      // The actor's own toggle is already reflected optimistically; skip the
      // echo so we don't double-count.
      const byMe = userId === currentUserId;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = m.reactions || [];
          const idx = reactions.findIndex((r) => r.emoji === emoji);
          if (delta === 1) {
            if (idx === -1) {
              return {
                ...m,
                reactions: [...reactions, { emoji, count: 1, reactedByMe: byMe }],
              };
            }
            const cur = reactions[idx];
            // Avoid double-counting our own optimistic add.
            if (byMe && cur.reactedByMe) return m;
            const next = [...reactions];
            next[idx] = {
              ...cur,
              count: cur.count + 1,
              reactedByMe: cur.reactedByMe || byMe,
            };
            return { ...m, reactions: next };
          } else {
            if (idx === -1) return m;
            const cur = reactions[idx];
            // Our own optimistic removal already dropped the count.
            if (byMe && !cur.reactedByMe) return m;
            const newCount = cur.count - 1;
            const next = [...reactions];
            if (newCount <= 0) {
              next.splice(idx, 1);
            } else {
              next[idx] = {
                ...cur,
                count: newCount,
                reactedByMe: byMe ? false : cur.reactedByMe,
              };
            }
            return { ...m, reactions: next };
          }
        })
      );
    };

    const channel = supabase
      .channel(`conversation-reactions-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reactions" },
        (payload: any) => {
          const r = payload.new;
          if (r?.message_id && r?.emoji) {
            applyDelta(r.message_id, r.emoji, r.user_id, 1);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "message_reactions" },
        (payload: any) => {
          const r = payload.old;
          // DELETE old record requires REPLICA IDENTITY FULL to include emoji;
          // apply the delta when we have enough to identify the reaction.
          if (r?.message_id && r?.emoji) {
            applyDelta(r.message_id, r.emoji, r.user_id, -1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  const sendNewMessage = useCallback(
    async (
      content: string,
      mediaUrl?: string,
      mediaType?: string,
      mediaDuration?: number,
      replyToId?: string
    ): Promise<boolean> => {
      if (!conversationId || !currentUserId) return false;

      // Build the optimistic reply preview from a message we already have.
      let replyTo: ReplyContext | undefined;
      if (replyToId) {
        const target = messages.find((m) => m.id === replyToId);
        if (target) {
          replyTo = {
            id: target.id,
            senderId: target.senderId,
            preview: target.isDeleted
              ? "Deleted message"
              : target.content
                ? target.content.slice(0, 120)
                : target.mediaType === "audio"
                  ? "Voice message"
                  : target.mediaType === "image"
                    ? "Photo"
                    : target.mediaType === "video"
                      ? "Video"
                      : "Attachment",
          };
        }
      }

      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        content,
        mediaUrl,
        mediaType,
        mediaDuration,
        senderId: currentUserId,
        isRead: false,
        isEdited: false,
        isDeleted: false,
        // Raw ISO timestamp so the bubble can render a real relative/clock time.
        createdAt: new Date().toISOString(),
        reactions: [],
        replyTo,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      const result = await sendMessage(
        conversationId,
        content,
        mediaUrl,
        mediaType,
        mediaDuration,
        replyToId
      );

      if (result.success && result.messageId) {
        // Confirm the optimistic message by replacing its temp id with the real
        // id. If the realtime INSERT already added the real message, drop the
        // temp instead of creating a duplicate.
        setMessages((prev) => {
          const realId = result.messageId!;
          const alreadyHasReal = prev.some((m) => m.id === realId);
          if (alreadyHasReal) {
            return prev.filter((m) => m.id !== tempId);
          }
          return prev.map((m) => (m.id === tempId ? { ...m, id: realId } : m));
        });
        return true;
      } else {
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return false;
      }
    },
    [conversationId, currentUserId, messages]
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string): Promise<void> => {
      // Capture prior state for revert.
      let prior: MessageReaction[] | null = null;

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          prior = m.reactions;
          const reactions = m.reactions || [];
          const idx = reactions.findIndex((r) => r.emoji === emoji);
          if (idx === -1) {
            // Add a new reaction by me.
            return {
              ...m,
              reactions: [...reactions, { emoji, count: 1, reactedByMe: true }],
            };
          }
          const cur = reactions[idx];
          const next = [...reactions];
          if (cur.reactedByMe) {
            // Remove my reaction.
            const newCount = cur.count - 1;
            if (newCount <= 0) {
              next.splice(idx, 1);
            } else {
              next[idx] = { ...cur, count: newCount, reactedByMe: false };
            }
          } else {
            // Add my reaction to an existing emoji.
            next[idx] = { ...cur, count: cur.count + 1, reactedByMe: true };
          }
          return { ...m, reactions: next };
        })
      );

      const result = await toggleMessageReaction(messageId, emoji);

      if (!result.success) {
        // Revert on failure.
        const restored = prior;
        if (restored) {
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, reactions: restored } : m))
          );
        }
      }
    },
    []
  );

  const editExistingMessage = useCallback(
    async (messageId: string, newContent: string): Promise<boolean> => {
      // Capture the prior state so we can restore it if the edit fails.
      const priorRef: { value: { content: string; isEdited: boolean } | null } = {
        value: null,
      };

      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          priorRef.value = { content: m.content, isEdited: m.isEdited };
          return { ...m, content: newContent, isEdited: true };
        })
      );

      const result = await editMessage(messageId, newContent);

      if (!result.success) {
        // Revert the optimistic edit back to its original content/isEdited.
        const restored = priorRef.value;
        if (restored) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? { ...m, content: restored.content, isEdited: restored.isEdited }
                : m
            )
          );
        }
        return false;
      }

      return true;
    },
    []
  );

  const deleteExistingMessage = useCallback(async (messageId: string): Promise<boolean> => {
    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isDeleted: true } : m))
    );

    const result = await deleteMessage(messageId);

    if (!result.success) {
      // Revert on failure
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isDeleted: false } : m))
      );
      return false;
    }

    return true;
  }, []);

  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || !hasMore || isLoadingMore) return;

    const oldestMessage = messages[0];
    if (!oldestMessage) return;

    setIsLoadingMore(true);

    // Page backwards using the oldest loaded message's timestamp as the cursor.
    const result = await getMessages(conversationId, 50, oldestMessage.createdAt);

    if (result.success && result.messages) {
      const older = result.messages;
      setMessages((prev) => {
        const existing = new Set(prev.map((m) => m.id));
        const fresh = older.filter((m) => !existing.has(m.id));
        return [...fresh, ...prev];
      });
      setHasMore(older.length >= 50);
    }

    setIsLoadingMore(false);
  }, [conversationId, hasMore, isLoadingMore, messages]);

  return {
    messages,
    isLoading,
    error,
    sendNewMessage,
    editExistingMessage,
    deleteExistingMessage,
    toggleReaction,
    loadMoreMessages,
    hasMore,
    isLoadingMore,
  };
}
