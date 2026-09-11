"use client";

import { useRef } from "react";
import { IconLock } from "@tabler/icons-react";

type TabId = "posts" | "likes" | "comments" | "followers" | "following";

interface Tab {
  id: TabId;
  label: string;
  isPrivate?: boolean;
}

interface ProfileTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  showLikes: boolean;
  showComments: boolean;
  showFollowers: boolean;
  showFollowing: boolean;
  counts: {
    posts: number;
    likes: number;
    comments: number;
    followers: number;
    following: number;
  };
}

/**
 * Broadsheet profile tabs (artboard 03): LEFT-ALIGNED text tabs, each with its
 * own 2px accent underline when active, seated on a 3px double rule. Never
 * pills, no icons (a lock marks a private tab).
 */
export function ProfileTabs({
  activeTab,
  onTabChange,
  showLikes,
  showComments,
  showFollowers,
  showFollowing,
  counts,
}: ProfileTabsProps) {
  const tabRefs = useRef<Map<TabId, HTMLButtonElement>>(new Map());

  const tabs: Tab[] = [
    { id: "posts", label: "Posts" },
    { id: "likes", label: "Likes", isPrivate: !showLikes },
    { id: "comments", label: "Comments", isPrivate: !showComments },
    { id: "followers", label: "Followers", isPrivate: !showFollowers },
    { id: "following", label: "Following", isPrivate: !showFollowing },
  ];

  const formatCount = (num: number): string =>
    num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num.toString();

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
    <div
      role="tablist"
      aria-label="Profile content"
      className="mt-6 flex gap-6 sm:gap-7 overflow-x-auto border-t border-rule rule-double-b py-3"
    >
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;
        const count = counts[tab.id];
        return (
          <button
            key={tab.id}
            id={`profile-tab-${tab.id}`}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el);
            }}
            role="tab"
            aria-selected={isActive}
            aria-controls={`profile-tabpanel-${tab.id}`}
            data-active={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => !tab.isPrivate && onTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            disabled={tab.isPrivate}
            aria-disabled={tab.isPrivate}
            className={`section-tab inline-flex items-center gap-1.5 whitespace-nowrap ${
              tab.isPrivate ? "cursor-not-allowed !text-meta-dim" : "hover:text-ink"
            }`}
          >
            {tab.isPrivate && <IconLock size={12} aria-hidden="true" />}
            <span>{tab.label}</span>
            {!tab.isPrivate && count > 0 && (
              <span className="slug text-meta-dim tabular-nums" aria-label={`${count} ${tab.label.toLowerCase()}`}>
                {formatCount(count)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export type { TabId };
