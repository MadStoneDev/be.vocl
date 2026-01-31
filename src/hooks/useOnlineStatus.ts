"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface OnlineUser {
  id: string;
  username: string;
  lastSeen: string;
}

interface UseOnlineStatusReturn {
  onlineUsers: Map<string, OnlineUser>;
  isUserOnline: (userId: string) => boolean;
  getOnlineUserIds: () => string[];
}

// Global channel for online presence across the app
let globalChannel: RealtimeChannel | null = null;
let globalOnlineUsers = new Map<string, OnlineUser>();
let subscriberCount = 0;

/**
 * Hook for tracking online users using Supabase Realtime Presence
 * Uses a global channel that's shared across all hook instances
 */
export function useOnlineStatus(
  currentUserId?: string,
  currentUsername?: string
): UseOnlineStatusReturn {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser>>(
    new Map(globalOnlineUsers)
  );
  const isInitializedRef = useRef(false);

  // Initialize the global presence channel
  useEffect(() => {
    if (!currentUserId || !currentUsername) {
      return;
    }

    const supabase = createClient();

    // Only create the channel once
    if (!globalChannel) {
      globalChannel = supabase.channel("online-users", {
        config: {
          presence: {
            key: currentUserId,
          },
        },
      });

      globalChannel
        .on("presence", { event: "sync" }, () => {
          if (!globalChannel) return;
          const state = globalChannel.presenceState();
          const newOnlineUsers = new Map<string, OnlineUser>();

          Object.entries(state).forEach(([userId, presences]) => {
            if (Array.isArray(presences) && presences.length > 0) {
              const presence = presences[0] as any;
              newOnlineUsers.set(userId, {
                id: userId,
                username: presence.username || "Unknown",
                lastSeen: presence.online_at || new Date().toISOString(),
              });
            }
          });

          globalOnlineUsers = newOnlineUsers;
          // Trigger update for all subscribers
          window.dispatchEvent(new CustomEvent("online-users-updated"));
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await globalChannel?.track({
              userId: currentUserId,
              username: currentUsername,
              online_at: new Date().toISOString(),
            });
          }
        });
    } else if (!isInitializedRef.current) {
      // If channel exists but we're a new user, track our presence
      globalChannel.track({
        userId: currentUserId,
        username: currentUsername,
        online_at: new Date().toISOString(),
      });
    }

    isInitializedRef.current = true;
    subscriberCount++;

    // Listen for updates from other instances
    const handleUpdate = () => {
      setOnlineUsers(new Map(globalOnlineUsers));
    };
    window.addEventListener("online-users-updated", handleUpdate);

    // Initial sync
    setOnlineUsers(new Map(globalOnlineUsers));

    return () => {
      window.removeEventListener("online-users-updated", handleUpdate);
      subscriberCount--;

      // Only unsubscribe when no more subscribers
      if (subscriberCount === 0 && globalChannel) {
        globalChannel.unsubscribe();
        globalChannel = null;
        globalOnlineUsers = new Map();
      }
    };
  }, [currentUserId, currentUsername]);

  const isUserOnline = useCallback(
    (userId: string) => {
      return onlineUsers.has(userId);
    },
    [onlineUsers]
  );

  const getOnlineUserIds = useCallback(() => {
    return Array.from(onlineUsers.keys());
  }, [onlineUsers]);

  return {
    onlineUsers,
    isUserOnline,
    getOnlineUserIds,
  };
}

/**
 * Lightweight hook that just checks if specific users are online
 * without setting up its own presence tracking
 */
export function useIsOnline(userIds: string[]): Map<string, boolean> {
  const [onlineStatus, setOnlineStatus] = useState<Map<string, boolean>>(
    new Map()
  );

  useEffect(() => {
    const handleUpdate = () => {
      const newStatus = new Map<string, boolean>();
      userIds.forEach((id) => {
        newStatus.set(id, globalOnlineUsers.has(id));
      });
      setOnlineStatus(newStatus);
    };

    // Initial check
    handleUpdate();

    window.addEventListener("online-users-updated", handleUpdate);
    return () => {
      window.removeEventListener("online-users-updated", handleUpdate);
    };
  }, [userIds]);

  return onlineStatus;
}
