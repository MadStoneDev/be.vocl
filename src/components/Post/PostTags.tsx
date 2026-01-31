"use client";

import Link from "next/link";
import { IconHash } from "@tabler/icons-react";

interface PostTagsProps {
  tags: Array<{
    id: string;
    name: string;
  }>;
  maxVisible?: number;
}

export function PostTags({ tags, maxVisible = 5 }: PostTagsProps) {
  if (!tags || tags.length === 0) return null;

  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = tags.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {visibleTags.map((tag) => (
        <Link
          key={tag.id}
          href={`/search?tag=${encodeURIComponent(tag.name)}`}
          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-vocl-accent/10 text-vocl-accent text-xs font-medium hover:bg-vocl-accent/20 transition-colors"
        >
          <IconHash size={12} />
          {tag.name}
        </Link>
      ))}
      {hiddenCount > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 text-foreground/50 text-xs">
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
}
