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
    color: "text-vocl-primary",
    bg: "bg-vocl-primary/10",
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
      return { icon: IconUserPlus, color: "text-vocl-primary", bg: "bg-vocl-primary/20" };
    case "mention":
      return { icon: IconAt, color: "text-amber-400", bg: "bg-amber-400/20" };
    default:
      return { icon: IconHeart, color: "text-foreground/50", bg: "bg-vocl-hover-strong" };
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

type ActivityFilter = "all" | ActivityItem["type"];

const filterTabs: { key: ActivityFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "like", label: "Likes" },
  { key: "comment", label: "Comments" },
  { key: "reblog", label: "Echoes" },
  { key: "follow", label: "Follows" },
  { key: "mention", label: "Mentions" },
];

export default function ActivityPage() {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActivityFilter>("all");

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
      <div className="py-8 max-w-2xl mx-auto">
        <header className="mb-6 border-b border-rule pb-5">
          <p className="kicker kicker-accent">Your account</p>
          <h1 className="type-display text-ink mt-2">Activity</h1>
        </header>
        <div className="border-y border-rule py-12 text-center">
          <p className="editorial-body text-meta">{error || "Unable to load activity data."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <title>Activity | be.vocl</title>
      <header className="mb-8 border-b border-rule pb-5">
        <p className="kicker kicker-accent">Your account</p>
        <h1 className="type-display text-ink mt-2">Activity</h1>
        <p className="editorial-deck text-meta mt-2">
          Who&apos;s been reading, liking and echoing your work.
        </p>
      </header>

      {/* Overview — ruled figures */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-rule rule-double-b mb-8">
        {statCards.map((card, i) => (
          <div key={card.key} className={`py-4 px-4 ${i > 0 ? "border-l border-rule" : ""}`}>
            <p className="font-display text-3xl leading-none text-ink tabular-nums">
              {stats[card.key].toLocaleString()}
            </p>
            <p className="byline text-meta mt-2">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity Feed */}
      <div className="slug text-meta border-b border-rule pb-3 mb-4">Recent activity</div>

      <div className="flex gap-6 mb-6 overflow-x-auto border-b border-rule">
        {filterTabs.map((tab) => {
          const count =
            tab.key === "all"
              ? stats.recentActivity.length
              : stats.recentActivity.filter((i) => i.type === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              data-active={filter === tab.key}
              className="section-tab whitespace-nowrap hover:text-ink transition-colors"
            >
              {tab.label}
              {count > 0 && <span className="ml-1.5 text-meta-dim">{count}</span>}
            </button>
          );
        })}
      </div>

      {(() => {
        const filtered =
          filter === "all"
            ? stats.recentActivity
            : stats.recentActivity.filter((i) => i.type === filter);
        if (filtered.length === 0) {
          return (
            <div className="border-y border-rule py-12 text-center">
              <p className="editorial-body text-meta">
                {filter === "all"
                  ? "No recent activity yet."
                  : `No ${filterTabs.find((t) => t.key === filter)?.label.toLowerCase()} yet.`}
              </p>
            </div>
          );
        }
        return (
          <div className="border-t border-rule">
            {filtered.map((item) => {
            const { icon: ActivityIcon } = getActivityIcon(item.type);
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 py-3.5 border-b border-rule hover:bg-vocl-hover transition-colors"
              >
                <ActivityIcon className="w-4 h-4 text-meta flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">
                    {getActivityDescription(item)}
                  </p>
                  {item.content && (
                    <p className="editorial-caption not-italic text-meta-dim truncate mt-0.5">
                      {item.content}
                    </p>
                  )}
                </div>
                <span className="slug text-meta-dim flex-shrink-0">
                  {item.createdAt}
                </span>
              </div>
            );
          })}
          </div>
        );
      })()}
    </div>
  );
}
