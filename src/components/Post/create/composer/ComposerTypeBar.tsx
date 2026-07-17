"use client";

import {
  IconFileText,
  IconPhoto,
  IconVideo,
  IconMusic,
  IconGif,
  IconChartBar,
} from "@tabler/icons-react";
import type { PostType } from "./useComposerState";

const POST_TYPES: { type: PostType; icon: typeof IconFileText; label: string }[] = [
  { type: "text", icon: IconFileText, label: "Text" },
  { type: "image", icon: IconPhoto, label: "Photo" },
  { type: "video", icon: IconVideo, label: "Video" },
  { type: "audio", icon: IconMusic, label: "Audio" },
  { type: "gif", icon: IconGif, label: "GIF" },
  { type: "poll", icon: IconChartBar, label: "Poll" },
];

/**
 * Prominent post-type selector — a Tumblr-style row at the top of the composer
 * that swaps the body. Replaces the old buried dropdown. Scrolls horizontally
 * on narrow screens. Create mode only (edit locks the type).
 */
export function ComposerTypeBar({
  postType,
  onPostTypeChange,
}: {
  postType: PostType;
  onPostTypeChange: (type: PostType) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Post type"
      className="flex items-center gap-1.5 px-4 md:px-6 py-2.5 border-b border-[var(--vocl-border)] overflow-x-auto shrink-0"
      style={{ scrollbarWidth: "none" }}
    >
      {POST_TYPES.map(({ type, icon: Icon, label }) => {
        const active = postType === type;
        return (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onPostTypeChange(type)}
            className={`flex items-center gap-2 px-3.5 h-9 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
              active
                ? "text-white border-transparent"
                : "text-foreground/70 border-[var(--vocl-border)] hover:bg-[var(--vocl-hover)] hover:text-foreground"
            }`}
            style={active ? { backgroundColor: "var(--vocl-primary)" } : undefined}
          >
            <Icon size={16} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
