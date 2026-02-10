"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface TypingUser {
  userId: string;
  username: string;
}

interface UseTypingPresenceReturn {
  typingUsers: TypingUser[];
  startTyping: () => void;
  stopTyping: () => void;
}

/**
 * Hook for managing typing indicators using Supabase Realtime Presence
 */
export function useTypingPresence(
  conversationId: string | null,
  currentUserId?: string,
  currentUsername?: string
): UseTypingPresenceReturn {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Initialize presence channel
  useEffect(() => {
    if (!conversationId || !currentUserId || !currentUsername) {
      setTypingUsers([]);
      return;
    }

    const supabase = createClient();

    // Create a presence channel for this conversation
    const channel = supabase.channel(`typing:${conversationId}`, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    channelRef.current = channel;

    // Handle presence sync
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const typing: TypingUser[] = [];

        // Extract typing users from presence state
        Object.entries(state).forEach(([userId, presences]) => {
          if (userId !== currentUserId && Array.isArray(presences)) {
            const presence = presences[0] as any;
            if (presence?.isTyping) {
              typing.push({
                userId: userId,
                username: presence.username || "Someone",
              });
            }
          }
        });

        setTypingUsers(typing);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }: { key: string; newPresences: any[] }) => {
        // Handle user joining
        if (key !== currentUserId && newPresences?.[0]) {
          const presence = newPresences[0] as any;
          if (presence?.isTyping) {
            setTypingUsers((prev) => {
              if (prev.some((u) => u.userId === key)) return prev;
              return [
                ...prev,
                { userId: key, username: presence.username || "Someone" },
              ];
            });
          }
        }
      })
      .on("presence", { event: "leave" }, ({ key }: { key: string }) => {
        // Handle user leaving
        setTypingUsers((prev) => prev.filter((u) => u.userId !== key));
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          // Track our initial presence (not typing)
          await channel.track({
            userId: currentUserId,
            username: currentUsername,
            isTyping: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      channel.unsubscribe();
    };
  }, [conversationId, currentUserId, currentUsername]);

  // Start typing - broadcast to others
  const startTyping = useCallback(async () => {
    if (!channelRef.current || !currentUserId || !currentUsername) return;

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Only broadcast if not already typing
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      await channelRef.current.track({
        userId: currentUserId,
        username: currentUsername,
        isTyping: true,
        online_at: new Date().toISOString(),
      });
    }

    // Auto-stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [currentUserId, currentUsername]);

  // Stop typing - broadcast to others
  const stopTyping = useCallback(async () => {
    if (!channelRef.current || !currentUserId || !currentUsername) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (isTypingRef.current) {
      isTypingRef.current = false;
      await channelRef.current.track({
        userId: currentUserId,
        username: currentUsername,
        isTyping: false,
        online_at: new Date().toISOString(),
      });
    }
  }, [currentUserId, currentUsername]);

  return {
    typingUsers,
    startTyping,
    stopTyping,
  };
}
