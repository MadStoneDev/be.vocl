"use client";

import { useState, useEffect, useCallback } from "react";
import {
  IconBell,
  IconLoader2,
  IconCheck,
  IconTrash,
} from "@tabler/icons-react";
import { NotificationList, type Notification } from "@/components/notifications";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
} from "@/actions/notifications";

export default function NotificationsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isClearing, setIsClearing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getNotifications();
      if (result.success) {
        setNotifications(result.notifications || []);
        setUnreadCount(result.unreadCount || 0);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    await markAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    await markAllAsRead();
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    const result = await clearAllNotifications();
    if (result.success) {
      setNotifications([]);
      setUnreadCount(0);
    }
    setIsClearing(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-vocl-accent/20 flex items-center justify-center">
            <IconBell size={24} className="text-vocl-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-foreground/50">
                {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors"
              >
                <IconCheck size={16} />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}
            <button
              onClick={handleClearAll}
              disabled={isClearing}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-vocl-like/70 hover:text-vocl-like hover:bg-vocl-like/10 transition-colors disabled:opacity-50"
            >
              {isClearing ? (
                <IconLoader2 size={16} className="animate-spin" />
              ) : (
                <IconTrash size={16} />
              )}
              <span className="hidden sm:inline">Clear all</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter tabs - optional future enhancement */}
      {/* <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {["All", "Follows", "Likes", "Comments", "Reblogs"].map((filter) => (
          <button
            key={filter}
            className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap bg-white/5 text-foreground/70 hover:bg-white/10 hover:text-foreground transition-colors"
          >
            {filter}
          </button>
        ))}
      </div> */}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
        </div>
      ) : (
        <NotificationList
          notifications={notifications}
          onMarkAsRead={handleMarkAsRead}
        />
      )}
    </div>
  );
}
