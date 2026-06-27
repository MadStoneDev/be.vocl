"use client";

import { useState, useEffect, useCallback } from "react";
import {
  IconBell,
  IconLoader2,
  IconCheck,
  IconTrash,
} from "@tabler/icons-react";
import { NotificationList, type Notification } from "@/components/notifications";
import { ConfirmDialog, toast, PullToRefresh } from "@/components/ui";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
} from "@/actions/notifications";

type FilterTab = "all" | "mentions" | "follows";

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "mentions", label: "Mentions" },
  { id: "follows", label: "Follows" },
];

export default function NotificationsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "mentions") return n.type === "mention";
    if (activeFilter === "follows") return n.type === "follow";
    return true;
  });

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getNotifications();
      if (result.success) {
        setNotifications(result.notifications || []);
        setUnreadCount(result.unreadCount || 0);
      } else {
        toast.error("Failed to load notifications");
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
    } else {
      toast.error("Failed to clear notifications");
    }
    setIsClearing(false);
    setShowClearConfirm(false);
  };

  return (
    <PullToRefresh onRefresh={fetchNotifications}>
      <title>Activity | be.vocl</title>
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header — editorial masthead */}
      <div className="flex items-end justify-between mb-5 border-b-4 border-double border-vocl-border pb-4">
        <div>
          <span className="type-meta uppercase tracking-[0.2em] text-vocl-primary font-semibold">
            Recent
          </span>
          <h1 className="type-display text-3xl font-bold text-foreground leading-none mt-1 flex items-center gap-3">
            <IconBell size={28} className="text-vocl-primary flex-shrink-0" />
            Activity
          </h1>
          {unreadCount > 0 && (
            <p className="type-meta uppercase tracking-widest text-foreground/50 mt-1.5">
              {unreadCount} unread
            </p>
          )}
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 px-3 py-2 rounded-sm text-sm text-foreground/60 hover:text-foreground hover:bg-vocl-hover transition-colors"
              >
                <IconCheck size={16} />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={isClearing}
              className="flex items-center gap-2 px-3 py-2 rounded-sm text-sm text-vocl-like/70 hover:text-vocl-like hover:bg-vocl-like/10 transition-colors disabled:opacity-50"
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

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2" role="tablist" aria-label="Filter notifications">
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-4 py-2 rounded-sm text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-vocl-primary text-white"
                  : "bg-vocl-hover text-foreground/70 hover:bg-vocl-hover-strong hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <IconLoader2 size={32} className="animate-spin text-vocl-primary" />
        </div>
      ) : (
        <NotificationList
          notifications={filteredNotifications}
          onMarkAsRead={handleMarkAsRead}
        />
      )}

      {/* Clear All Confirmation */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearAll}
        title="Clear All Notifications"
        message="Are you sure you want to clear all notifications? This action cannot be undone."
        confirmText="Clear all"
        cancelText="Cancel"
        variant="danger"
        isLoading={isClearing}
      />
    </div>
    </PullToRefresh>
  );
}
