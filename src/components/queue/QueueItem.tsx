"use client";

import { useState } from "react";
import Image from "next/image";
import {
  IconGripVertical,
  IconTrash,
  IconSend,
  IconLoader2,
} from "@tabler/icons-react";

interface QueueItemProps {
  post: {
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
  };
  onPublishNow: (postId: string) => Promise<void>;
  onRemove: (postId: string) => Promise<void>;
  isDragging?: boolean;
}

export function QueueItem({
  post,
  onPublishNow,
  onRemove,
  isDragging,
}: QueueItemProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handlePublishNow = async () => {
    setIsPublishing(true);
    try {
      await onPublishNow(post.id);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await onRemove(post.id);
    } finally {
      setIsRemoving(false);
    }
  };

  // Get preview content
  const getPreviewText = () => {
    if (post.originalPost?.content?.text) {
      return post.originalPost.content.text.slice(0, 100);
    }
    return "Reblogged post";
  };

  return (
    <div
      className={`group flex items-start gap-3 p-4 rounded-xl bg-vocl-surface-dark border border-white/5 transition-all ${
        isDragging ? "opacity-50 scale-[0.98]" : "hover:border-white/10"
      }`}
    >
      {/* Drag handle */}
      <div className="flex-shrink-0 pt-1 cursor-grab active:cursor-grabbing text-foreground/30 hover:text-foreground/50">
        <IconGripVertical size={20} />
      </div>

      {/* Position badge */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-vocl-accent/20 flex items-center justify-center">
        <span className="text-sm font-semibold text-vocl-accent">
          {post.queuePosition}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Original post author */}
        {post.originalPost && (
          <div className="flex items-center gap-2 mb-2">
            {post.originalPost.author.avatarUrl && (
              <div className="relative w-5 h-5 rounded-full overflow-hidden">
                <Image
                  src={post.originalPost.author.avatarUrl}
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <span className="text-sm text-foreground/60">
              Reblog from @{post.originalPost.author.username}
            </span>
          </div>
        )}

        {/* Preview text */}
        <p className="text-sm text-foreground/80 line-clamp-2">
          {getPreviewText()}
        </p>

        {/* Reblog comment */}
        {post.reblogCommentHtml && (
          <div
            className="mt-2 text-xs text-foreground/50 line-clamp-1"
            dangerouslySetInnerHTML={{ __html: post.reblogCommentHtml }}
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={handlePublishNow}
          disabled={isPublishing || isRemoving}
          className="p-2 rounded-lg text-vocl-accent hover:bg-vocl-accent/10 transition-colors disabled:opacity-50"
          title="Publish now"
        >
          {isPublishing ? (
            <IconLoader2 size={18} className="animate-spin" />
          ) : (
            <IconSend size={18} />
          )}
        </button>
        <button
          type="button"
          onClick={handleRemove}
          disabled={isPublishing || isRemoving}
          className="p-2 rounded-lg text-vocl-like hover:bg-vocl-like/10 transition-colors disabled:opacity-50"
          title="Remove from queue"
        >
          {isRemoving ? (
            <IconLoader2 size={18} className="animate-spin" />
          ) : (
            <IconTrash size={18} />
          )}
        </button>
      </div>
    </div>
  );
}
