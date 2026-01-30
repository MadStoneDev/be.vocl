"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { getUnreadCount } from "@/actions/notifications";

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
    const result = await getUnreadCount();
    if (result.success && result.count !== undefined) {
      setUnreadCount(result.count);
    }
    setIsLoading(false);
  }, []);

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

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

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
