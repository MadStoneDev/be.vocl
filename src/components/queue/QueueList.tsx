"use client";

import { useState } from "react";
import { IconMoodEmpty } from "@tabler/icons-react";
import { QueueItem } from "./QueueItem";

interface QueuePost {
  id: string;
  queuePosition: number;
  reblogCommentHtml?: string;
  originalPost?: {
    id: string;
    content: any;
    author: {
      username: string;
      avatarUrl?: string;
    };
  };
}

interface QueueListProps {
  posts: QueuePost[];
  onReorder: (postIds: string[]) => Promise<void>;
  onPublishNow: (postId: string) => Promise<void>;
  onRemove: (postId: string) => Promise<void>;
}

export function QueueList({
  posts,
  onReorder,
  onPublishNow,
  onRemove,
}: QueueListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <IconMoodEmpty size={32} className="text-foreground/30" />
        </div>
        <h3 className="text-lg font-medium text-foreground/70 mb-2">
          Your queue is empty
        </h3>
        <p className="text-sm text-foreground/50 max-w-sm">
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
            onPublishNow={onPublishNow}
            onRemove={onRemove}
            isDragging={draggedIndex === index}
          />
        </div>
      ))}
    </div>
  );
}
