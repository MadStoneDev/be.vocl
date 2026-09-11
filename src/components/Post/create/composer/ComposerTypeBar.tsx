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
      className="flex items-center gap-5 md:gap-6 px-4 md:px-6 py-3 border-b border-[var(--vocl-border)] shrink-0 overflow-x-auto"
      style={{ scrollbarWidth: "none" }}
    >
      {POST_TYPES.map(({ type, label }) => {
        const active = postType === type;
        return (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={active}
            data-active={active}
            title={label}
            onClick={() => onPostTypeChange(type)}
            className="section-tab whitespace-nowrap hover:text-ink transition-colors"
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
