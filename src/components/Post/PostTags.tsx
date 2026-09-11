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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
      {visibleTags.map((tag) => (
        <Link
          key={tag.id}
          href={`/search?tag=${encodeURIComponent(tag.name)}`}
          className="inline-flex items-center gap-0.5 slug text-meta hover:text-accent transition-colors"
        >
          <IconHash size={11} />
          {tag.name}
        </Link>
      ))}
      {hiddenCount > 0 && (
        <span className="slug text-meta-dim">+{hiddenCount} more</span>
      )}
    </div>
  );
}
