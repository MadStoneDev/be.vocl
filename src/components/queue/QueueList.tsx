"use client";

import { useMemo, useState } from "react";
import { IconMoodEmpty } from "@tabler/icons-react";
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
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-vocl-hover flex items-center justify-center mb-4">
          <IconMoodEmpty size={32} className="text-foreground/30" />
        </div>
        <h3 className="type-heading font-semibold text-foreground/70 mb-2">
          Your queue is empty
        </h3>
        <p className="type-body text-foreground/50 max-w-sm">
          Add posts to your queue by clicking &quot;Add to queue&quot; when reblogging.
          They&apos;ll be published automatically based on your schedule.
        </p>
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
