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
 * that swaps the body. Replaces the old buried dropdown. On mobile the tabs are
 * icon-only and share the width equally (no horizontal scroll); labels return at
 * md. Create mode only (edit locks the type).
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
      className="flex items-center gap-1 md:gap-1.5 px-4 md:px-6 py-2.5 border-b border-[var(--vocl-border)] shrink-0 md:overflow-x-auto"
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
            aria-label={label}
            title={label}
            onClick={() => onPostTypeChange(type)}
            className={`flex flex-1 md:flex-none items-center justify-center md:justify-start gap-2 px-0 md:px-3.5 h-9 rounded-full type-body font-medium whitespace-nowrap transition-colors border ${
              active
                ? "text-white border-transparent"
                : "text-foreground/70 border-[var(--vocl-border)] hover:bg-[var(--vocl-hover)] hover:text-foreground"
            }`}
            style={active ? { backgroundColor: "var(--vocl-primary)" } : undefined}
          >
            <Icon size={16} />
            <span className="hidden md:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
