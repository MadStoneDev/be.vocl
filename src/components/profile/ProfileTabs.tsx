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

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    const availableTabs = tabs.filter((t) => !t.isPrivate);
    const currentAvailableIndex = availableTabs.findIndex((t) => t.id === tabs[currentIndex].id);

    if (currentAvailableIndex === -1) return;

    let newIndex = currentAvailableIndex;

    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      newIndex = currentAvailableIndex > 0 ? currentAvailableIndex - 1 : availableTabs.length - 1;
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      newIndex = currentAvailableIndex < availableTabs.length - 1 ? currentAvailableIndex + 1 : 0;
    } else if (e.key === "Home") {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      newIndex = availableTabs.length - 1;
    } else {
      return;
    }

    const newTab = availableTabs[newIndex];
    onTabChange(newTab.id);
    tabRefs.current.get(newTab.id)?.focus();
  };

  return (
    <div className="relative mt-6">
      {/* Tab buttons */}
      <div className="relative flex border-b border-white/5" role="tablist" aria-label="Profile content">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = counts[tab.id];
          const tabId = `profile-tab-${tab.id}`;
          const panelId = `profile-tabpanel-${tab.id}`;

          return (
            <button
              key={tab.id}
              id={tabId}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.id, el);
              }}
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              onClick={() => !tab.isPrivate && onTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              disabled={tab.isPrivate}
              aria-disabled={tab.isPrivate}
              className={`relative flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
                tab.isPrivate
                  ? "text-foreground/20 cursor-not-allowed"
                  : isActive
                  ? "text-vocl-accent"
                  : "text-foreground/50 hover:text-foreground/70"
              }`}
            >
              {tab.isPrivate ? (
                <IconLock size={18} aria-hidden="true" />
              ) : (
                <Icon size={18} aria-hidden="true" />
              )}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sr-only sm:hidden">{tab.label}</span>
              {!tab.isPrivate && count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? "bg-vocl-accent/20 text-vocl-accent"
                      : "bg-white/10 text-foreground/50"
                  }`}
                  aria-label={`${count} ${tab.label.toLowerCase()}`}
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
