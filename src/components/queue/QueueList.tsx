"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { QueueItem } from "./QueueItem";
import { computeQueuedTimes, type QueueTimingSettings } from "@/lib/queue-schedule";

interface QueuePost {
  id: string;
  queuePosition: number;
  postType: string;
  content: any;
  isSensitive: boolean;
  createdAt: string;
  reblogCommentHtml?: string;
  originalPost?: {
    id: string;
    postType: string;
    content: any;
    author: {
      username: string;
      avatarUrl?: string;
    };
  };
}

interface QueueListProps {
  posts: QueuePost[];
  settings: QueueTimingSettings;
  onReorder: (postIds: string[]) => Promise<void>;
  onPublishNow: (postId: string) => Promise<void>;
  onRemove: (postId: string) => Promise<void>;
}

export function QueueList({
  posts,
  settings,
  onReorder,
  onPublishNow,
  onRemove,
}: QueueListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Projected publish time for each queued post (same maths as the calendar).
  const times = useMemo(() => computeQueuedTimes(posts, settings), [posts, settings]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = async () => {
    if (draggedIndex !== null && dragOverIndex !== null) {
      const newPosts = [...posts];
      const [draggedPost] = newPosts.splice(draggedIndex, 1);
      newPosts.splice(dragOverIndex, 0, draggedPost);
      await onReorder(newPosts.map((p) => p.id));
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border-b border-rule">
        <p className="slug text-meta-dim mb-4">Nothing set for tomorrow&apos;s edition</p>
        <h3 className="type-display text-ink mb-3 max-w-[18ch]">The spike is empty.</h3>
        <p className="editorial-body text-meta max-w-[52ch] mb-6">
          Add posts with “Add to queue” when you write or reblog. They go out on
          your schedule, in your timezone.
        </p>
        <Link
          href="/create"
          className="inline-flex items-center bg-accent text-white px-5 py-2.5 text-xs font-sans font-medium uppercase tracking-[0.16em] hover:opacity-[0.88] transition-opacity"
        >
          Write something
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {posts.map((post, index) => (
        <div
          key={post.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          className={`transition-transform ${
            dragOverIndex === index ? "translate-y-2" : ""
          }`}
        >
          <QueueItem
            post={post}
            displayNumber={index + 1}
            scheduledFor={times.get(post.id)}
            onPublishNow={onPublishNow}
            onRemove={onRemove}
            isDragging={draggedIndex === index}
          />
        </div>
      ))}
    </div>
  );
}
