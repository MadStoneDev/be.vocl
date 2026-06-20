"use client";

import {
  IconClock,
  IconTrendingUp,
  IconFlame,
  IconLayoutList,
  IconNews,
} from "@tabler/icons-react";

export type FeedTab = "chronological" | "engagement" | "trending";
export type FeedLayout = "reader" | "frontpage";

interface FeedTabsProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
  /** Reader/Front-Page layout (broadsheet). Toggle only renders when showLayoutToggle is true. */
  layout?: FeedLayout;
  onLayoutChange?: (layout: FeedLayout) => void;
  showLayoutToggle?: boolean;
}

export function FeedTabs({
  activeTab,
  onTabChange,
  layout = "reader",
  onLayoutChange,
  showLayoutToggle = false,
}: FeedTabsProps) {
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
    {
      id: "trending" as const,
      label: "Trending",
      icon: IconFlame,
      description: "What everyone is talking about",
    },
  ];

  const layoutOptions = [
    { id: "reader" as const, label: "Reader", icon: IconLayoutList, description: "Single column" },
    { id: "frontpage" as const, label: "Front Page", icon: IconNews, description: "Broadsheet layout" },
  ];

  const segmentClass = (active: boolean, activeBg: string) =>
    `flex items-center justify-center gap-2 py-3 px-4 sm:rounded-xl text-sm font-medium transition-all ${
      active ? `${activeBg} text-white shadow-lg` : "text-foreground/60 hover:text-foreground"
    }`;

  return (
    <div className="flex items-center gap-1 sm:rounded-2xl bg-vocl-surface-dark/50 p-1 mb-6">
      {/* Sort tabs (teal = "what") */}
      <div className="flex flex-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              title={tab.description}
              aria-pressed={activeTab === tab.id}
              className={`flex-1 ${segmentClass(activeTab === tab.id, "bg-vocl-accent")}`}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Layout toggle (pink = "how"), wide screens only, with a separator */}
      {showLayoutToggle && onLayoutChange && (
        <>
          <span
            aria-hidden="true"
            className="hidden lg:block w-px self-stretch my-1.5 bg-vocl-border"
          />
          <div className="hidden lg:flex">
            {layoutOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onLayoutChange(opt.id)}
                  title={opt.description}
                  aria-pressed={layout === opt.id}
                  className={segmentClass(layout === opt.id, "bg-vocl-primary")}
                >
                  <Icon size={18} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
