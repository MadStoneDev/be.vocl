"use client";

import { useState, useRef, useEffect } from "react";
import {
  IconGridDots,
  IconHeart,
  IconMessage,
  IconLock,
} from "@tabler/icons-react";

type TabId = "posts" | "likes" | "comments";

interface Tab {
  id: TabId;
  label: string;
  icon: typeof IconGridDots;
  isPrivate?: boolean;
}

interface ProfileTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  showLikes: boolean;
  showComments: boolean;
  counts: {
    posts: number;
    likes: number;
    comments: number;
  };
}

export function ProfileTabs({
  activeTab,
  onTabChange,
  showLikes,
  showComments,
  counts,
}: ProfileTabsProps) {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<Map<TabId, HTMLButtonElement>>(new Map());

  const tabs: Tab[] = [
    { id: "posts", label: "Posts", icon: IconGridDots },
    { id: "likes", label: "Likes", icon: IconHeart, isPrivate: !showLikes },
    { id: "comments", label: "Comments", icon: IconMessage, isPrivate: !showComments },
  ];

  // Update indicator position when active tab changes
  useEffect(() => {
    const activeTabEl = tabRefs.current.get(activeTab);
    if (activeTabEl) {
      const containerRect = activeTabEl.parentElement?.getBoundingClientRect();
      const tabRect = activeTabEl.getBoundingClientRect();
      if (containerRect) {
        setIndicatorStyle({
          left: tabRect.left - containerRect.left,
          width: tabRect.width,
        });
      }
    }
  }, [activeTab]);

  const formatCount = (num: number): string => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <div className="relative mt-6">
      {/* Tab buttons */}
      <div className="relative flex border-b border-white/5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = counts[tab.id];

          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.id, el);
              }}
              onClick={() => !tab.isPrivate && onTabChange(tab.id)}
              disabled={tab.isPrivate}
              className={`relative flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
                tab.isPrivate
                  ? "text-foreground/20 cursor-not-allowed"
                  : isActive
                  ? "text-vocl-accent"
                  : "text-foreground/50 hover:text-foreground/70"
              }`}
            >
              {tab.isPrivate ? (
                <IconLock size={18} />
              ) : (
                <Icon size={18} />
              )}
              <span className="hidden sm:inline">{tab.label}</span>
              {!tab.isPrivate && count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? "bg-vocl-accent/20 text-vocl-accent"
                      : "bg-white/10 text-foreground/50"
                  }`}
                >
                  {formatCount(count)}
                </span>
              )}
            </button>
          );
        })}

        {/* Animated indicator */}
        <div
          className="absolute bottom-0 h-0.5 bg-vocl-accent rounded-full transition-all duration-300 ease-out"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />
      </div>
    </div>
  );
}

export type { TabId };
