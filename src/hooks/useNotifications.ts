"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseNotificationsReturn {
  unreadCount: number;
  isLoading: boolean;
  refreshUnreadCount: () => Promise<void>;
}

/**
 * Hook for managing notification unread count
 */
export function useNotifications(currentUserId?: string): UseNotificationsReturn {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUnreadCount = useCallback(async () => {
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }
    // Direct client count query rather than a server action. Next serializes
    // server actions, so this badge was queuing behind every other action fired
    // on page load (~450ms each). A client-side count (RLS-scoped to the user)
    // runs in parallel with the rest.
    const supabase = createClient();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", currentUserId)
      .eq("is_read", false);
    setUnreadCount(count ?? 0);
    setIsLoading(false);
  }, [currentUserId]);

  // Initial load
  useEffect(() => {
    if (currentUserId) {
      refreshUnreadCount();
    } else {
      setIsLoading(false);
    }
  }, [currentUserId, refreshUnreadCount]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!currentUserId) return;

    const supabase = createClient();

    // Subscribe to new notifications for this user
    const channel = supabase
      .channel("notification-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${currentUserId}`,
        },
        () => {
          // Refresh count when a new notification arrives
          refreshUnreadCount();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${currentUserId}`,
        },
        () => {
          // Refresh count when notifications are marked as read
          refreshUnreadCount();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${currentUserId}`,
        },
        () => {
          // Refresh count when notifications are deleted
          refreshUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, refreshUnreadCount]);

  return {
    unreadCount,
    isLoading,
    refreshUnreadCount,
  };
}
