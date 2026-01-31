"use client";

import { useState, useEffect, useCallback } from "react";
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
  sendNewMessage: (content: string, mediaUrl?: string, mediaType?: string) => Promise<boolean>;
  editExistingMessage: (messageId: string, newContent: string) => Promise<boolean>;
  deleteExistingMessage: (messageId: string) => Promise<boolean>;
  loadMoreMessages: () => Promise<void>;
  hasMore: boolean;
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
        (payload) => {
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

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

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

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setIsLoading(true);
      setError(null);

      const result = await getMessages(conversationId);
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
        (payload) => {
          const newMessage = payload.new as any;
          // Only add if not from current user (to avoid duplicates from optimistic updates)
          if (newMessage.sender_id !== currentUserId) {
            setMessages((prev) => [
              ...prev,
              {
                id: newMessage.id,
                content: newMessage.content,
                mediaUrl: newMessage.media_url,
                mediaType: newMessage.media_type,
                senderId: newMessage.sender_id,
                isRead: false,
                isEdited: newMessage.is_edited,
                isDeleted: newMessage.is_deleted,
                createdAt: new Date(newMessage.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              },
            ]);
            // Mark as read
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
        (payload) => {
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  const sendNewMessage = useCallback(
    async (content: string, mediaUrl?: string, mediaType?: string): Promise<boolean> => {
      if (!conversationId || !currentUserId) return false;

      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        content,
        mediaUrl,
        mediaType,
        senderId: currentUserId,
        isRead: false,
        isEdited: false,
        isDeleted: false,
        createdAt: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      const result = await sendMessage(conversationId, content, mediaUrl, mediaType);

      if (result.success && result.messageId) {
        // Update temp message with real ID
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: result.messageId! } : m))
        );
        return true;
      } else {
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return false;
      }
    },
    [conversationId, currentUserId]
  );

  const editExistingMessage = useCallback(
    async (messageId: string, newContent: string): Promise<boolean> => {
      // Optimistic update
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, content: newContent, isEdited: true } : m
        )
      );

      const result = await editMessage(messageId, newContent);

      if (!result.success) {
        // Revert on failure - would need to store original content
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
    if (!conversationId || !hasMore || isLoading) return;

    const oldestMessage = messages[0];
    if (!oldestMessage) return;

    setIsLoading(true);

    // Need to convert display time back to ISO or use a different approach
    // For now, we'll refetch with increased limit
    const result = await getMessages(conversationId, 100);

    if (result.success && result.messages) {
      setMessages(result.messages);
      setHasMore(result.messages.length >= 100);
    }

    setIsLoading(false);
  }, [conversationId, hasMore, isLoading, messages]);

  return {
    messages,
    isLoading,
    error,
    sendNewMessage,
    editExistingMessage,
    deleteExistingMessage,
    loadMoreMessages,
    hasMore,
  };
}
