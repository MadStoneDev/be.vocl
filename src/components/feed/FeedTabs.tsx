"use client";

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
    { id: "chronological" as const, label: "Latest", description: "Most recent posts first" },
    { id: "engagement" as const, label: "For You", description: "Posts you might like" },
    { id: "trending" as const, label: "Trending", description: "What everyone is talking about" },
  ];

  const layoutOptions = [
    { id: "reader" as const, label: "Reader", description: "Single column" },
    { id: "frontpage" as const, label: "Front Page", description: "Broadsheet layout" },
  ];

  // Broadsheet section tabs: uppercase Plex Sans, 2px accent underline when
  // active, never pills. Rules, not fills. The row carries a 1px top rule and a
  // 3px double bottom rule to seat it in the masthead.
  return (
    <div className="flex items-center justify-between gap-6 py-3 mb-6 border-t border-rule rule-double-b overflow-x-auto">
      {/* Sort tabs */}
      <div className="flex gap-6 sm:gap-7 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            title={tab.description}
            aria-pressed={activeTab === tab.id}
            data-active={activeTab === tab.id}
            className="section-tab whitespace-nowrap hover:text-ink transition-colors"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Layout toggle (Front Page / Reader), wide screens only */}
      {showLayoutToggle && onLayoutChange && (
        <div className="hidden lg:flex items-center gap-4 flex-shrink-0">
          {layoutOptions.map((opt, i) => (
            <span key={opt.id} className="flex items-center gap-4">
              {i > 0 && <span aria-hidden="true" className="text-rule">|</span>}
              <button
                type="button"
                onClick={() => onLayoutChange(opt.id)}
                title={opt.description}
                aria-pressed={layout === opt.id}
                className={`slug whitespace-nowrap transition-colors ${
                  layout === opt.id ? "text-ink" : "hover:text-ink"
                }`}
              >
                {opt.label}
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
