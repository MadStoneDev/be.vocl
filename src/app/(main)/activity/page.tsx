"use client";

import { useEffect, useState } from "react";
import {
  IconArticle,
  IconHeart,
  IconMessageCircle,
  IconRepeat,
  IconUserPlus,
  IconAt,
} from "@tabler/icons-react";
import { LoadingSpinner } from "@/components/ui";
import { getActivityStats } from "@/actions/activity";
import type { ActivityStats, ActivityItem } from "@/actions/activity";

const statCards = [
  {
    key: "totalPosts" as const,
    label: "Total Posts",
    icon: IconArticle,
    color: "text-vocl-accent",
    bg: "bg-vocl-accent/10",
  },
  {
    key: "totalLikes" as const,
    label: "Likes Received",
    icon: IconHeart,
    color: "text-vocl-like",
    bg: "bg-vocl-like/10",
  },
  {
    key: "totalComments" as const,
    label: "Comments Received",
    icon: IconMessageCircle,
    color: "text-sky-400",
    bg: "bg-sky-400/10",
  },
  {
    key: "totalReblogs" as const,
    label: "Echoes Received",
    icon: IconRepeat,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
];

function getActivityIcon(type: ActivityItem["type"]) {
  switch (type) {
    case "like":
      return { icon: IconHeart, color: "text-vocl-like", bg: "bg-vocl-like/20" };
    case "comment":
      return { icon: IconMessageCircle, color: "text-sky-400", bg: "bg-sky-400/20" };
    case "reblog":
      return { icon: IconRepeat, color: "text-emerald-400", bg: "bg-emerald-400/20" };
    case "follow":
      return { icon: IconUserPlus, color: "text-vocl-accent", bg: "bg-vocl-accent/20" };
    case "mention":
      return { icon: IconAt, color: "text-amber-400", bg: "bg-amber-400/20" };
    default:
      return { icon: IconHeart, color: "text-foreground/50", bg: "bg-white/10" };
  }
}

function getActivityDescription(item: ActivityItem): string {
  switch (item.type) {
    case "like":
      return `${item.actorUsername} liked your post`;
    case "comment":
      return `${item.actorUsername} commented on your post`;
    case "reblog":
      return `${item.actorUsername} echoed your post`;
    case "follow":
      return `${item.actorUsername} followed you`;
    case "mention":
      return `${item.actorUsername} mentioned you`;
    default:
      return `${item.actorUsername} interacted with your post`;
  }
}

export default function ActivityPage() {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      const result = await getActivityStats();
      if (result.success && result.data) {
        setStats(result.data);
      } else {
        setError(result.error || "Failed to load activity");
      }
      setLoading(false);
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="py-6 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="py-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Activity</h1>
        <div className="p-6 rounded-xl bg-vocl-surface-dark border border-white/5 text-center">
          <p className="text-foreground/50">{error || "Unable to load activity data."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">Activity</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="p-4 rounded-xl bg-vocl-surface-dark border border-white/5"
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}
                >
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${card.color}`}>
                {stats[card.key].toLocaleString()}
              </p>
              <p className="text-xs text-foreground/50 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Activity Feed */}
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Recent Activity
      </h2>

      {stats.recentActivity.length === 0 ? (
        <div className="p-6 rounded-xl bg-vocl-surface-dark border border-white/5 text-center">
          <p className="text-foreground/50">No recent activity yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {stats.recentActivity.map((item) => {
            const { icon: ActivityIcon, color, bg } = getActivityIcon(item.type);
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-vocl-surface-dark border border-white/5 hover:bg-white/5 transition-colors"
              >
                <div
                  className={`w-9 h-9 rounded-lg ${bg} flex-shrink-0 flex items-center justify-center`}
                >
                  <ActivityIcon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    {getActivityDescription(item)}
                  </p>
                  {item.content && (
                    <p className="text-xs text-foreground/40 truncate mt-0.5">
                      {item.content}
                    </p>
                  )}
                </div>
                <span className="text-xs text-foreground/30 flex-shrink-0">
                  {item.createdAt}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
