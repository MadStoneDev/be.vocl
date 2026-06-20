"use client";

import { IconBellOff } from "@tabler/icons-react";
import { NotificationItem, type NotificationType } from "./NotificationItem";

interface Notification {
  id: string;
  type: NotificationType;
  actor: {
    username: string;
    avatarUrl?: string;
  };
  content?: string;
  postPreview?: string;
  postId?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
}

/**
 * Collapse multiple same-type notifications on the same target into one row.
 * Grouping key = type + target (postId, or "follow" which has no post).
 * Single notifications and types without an obvious shared target
 * (comment/message) are left ungrouped so their content stays visible.
 */
function groupNotifications(items: Notification[]): Array<
  Notification & { otherActors?: { username: string; avatarUrl?: string }[]; groupedIds?: string[] }
> {
  const groupableTypes: ReadonlySet<NotificationType> = new Set([
    "like",
    "reblog",
    "follow",
  ]);

  const buckets = new Map<string, Notification[]>();
  const order: string[] = [];

  for (const n of items) {
    // Only group when we have a stable target (post-based) or follows.
    const canGroup =
      groupableTypes.has(n.type) &&
      (n.type === "follow" || !!n.postId);
    const key = canGroup
      ? `${n.type}::${n.postId ?? "follow"}`
      : `single::${n.id}`;
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(n);
  }

  return order.map((key) => {
    const group = buckets.get(key)!;
    const [primary, ...rest] = group;
    if (rest.length === 0) return primary;
    return {
      ...primary,
      // A group is unread if any member is unread.
      isRead: group.every((g) => g.isRead),
      otherActors: rest.map((r) => r.actor),
      groupedIds: group.map((g) => g.id),
    };
  });
}

export function NotificationList({
  notifications,
  onMarkAsRead,
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-vocl-hover flex items-center justify-center mb-4">
          <IconBellOff size={32} className="text-foreground/30" />
        </div>
        <h3 className="text-lg font-medium text-foreground/70 mb-2">
          No notifications yet
        </h3>
        <p className="text-sm text-foreground/50 max-w-sm">
          When someone interacts with your posts or follows you, you&apos;ll see it
          here.
        </p>
      </div>
    );
  }

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const date = getDateGroup(notification.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedNotifications).map(([date, items]) => (
        <div key={date}>
          {/* Date header */}
          <h3 className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-3 px-2">
            {date}
          </h3>

          {/* Notifications for this date (grouped by type + target) */}
          <div className="space-y-1">
            {groupNotifications(items).map((notification) => (
              <NotificationItem
                key={notification.id}
                {...notification}
                onMarkAsRead={onMarkAsRead}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper to group notifications by relative date
function getDateGroup(dateStr: string): string {
  // For demo purposes, just return the string
  // In production, parse the date and return "Today", "Yesterday", "This Week", etc.
  if (dateStr.includes("ago")) {
    if (dateStr.includes("h ago") || dateStr.includes("m ago") || dateStr.includes("just now")) {
      return "Today";
    }
    if (dateStr.includes("1d ago")) {
      return "Yesterday";
    }
    return "Earlier";
  }
  return "Earlier";
}

export type { Notification };
