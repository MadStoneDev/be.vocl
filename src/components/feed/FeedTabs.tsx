"use client";

import { IconClock, IconTrendingUp } from "@tabler/icons-react";

export type FeedTab = "chronological" | "engagement";

interface FeedTabsProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
}

export function FeedTabs({ activeTab, onTabChange }: FeedTabsProps) {
  const tabs = [
    {
      id: "chronological" as const,
      label: "Latest",
      icon: IconClock,
      description: "Most recent posts first",
    },
    {
      id: "engagement" as const,
      label: "For You",
      icon: IconTrendingUp,
      description: "Posts you might like",
    },
  ];

  return (
    <div className="flex rounded-2xl bg-vocl-surface-dark/50 p-1 mb-6">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? "bg-vocl-accent text-white shadow-lg"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            <Icon size={18} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
