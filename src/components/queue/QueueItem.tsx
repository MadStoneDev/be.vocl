"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  IconGripVertical,
  IconTrash,
  IconSend,
  IconLoader2,
  IconRefresh,
  IconClock,
  IconPencil,
} from "@tabler/icons-react";
import { sanitizeHtmlWithSafeLinks } from "@/lib/sanitize";
import { formatQueueSlot } from "@/lib/queue-schedule";
import {
  ImageContent,
  TextContent,
  VideoContent,
  AudioContent,
  GalleryContent,
  LinkPreviewCarousel,
} from "@/components/Post";
import { PollContent, AskContent } from "@/components/Post/content";
import { LazyMount } from "@/components/ui/LazyMount";
import type { VideoEmbedPlatform } from "@/types/database";

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

interface QueueItemProps {
  post: QueuePost;
  /** Sequential position in the list (1-based) — shown instead of the raw
   *  stored queue_position, which goes sparse as earlier posts publish. */
  displayNumber?: number;
  /** Projected publish time (queued) or fixed scheduled time (scheduled). */
  scheduledFor?: Date;
  /** "queued" = auto-slotted + reorderable; "scheduled" = fixed date/time. */
  variant?: "queued" | "scheduled";
  onPublishNow: (postId: string) => Promise<void>;
  onRemove: (postId: string) => Promise<void>;
  isDragging?: boolean;
}

function renderBody(postType: string, content: any, postId: string) {
  const c = content || {};
  switch (postType) {
    case "poll":
      return <PollContent postId={postId} content={c} />;
    case "ask":
      return <AskContent content={c} />;
    case "text":
      return (
        <>
          <TextContent html={c.html}>{c.plain || c.text}</TextContent>
          {c.link_previews?.length > 0 && (
            <div className="">
              <LinkPreviewCarousel previews={c.link_previews} />
            </div>
          )}
        </>
      );
    case "image":
      return (
        <ImageContent
          src={c.urls?.[0] || c.url}
          alt="Post image"
          caption={c.caption_html}
        />
      );
    case "gallery":
      return <GalleryContent images={c.urls || []} caption={c.caption_html} />;
    case "video":
      return (
        <VideoContent
          src={c.url}
          thumbnailUrl={c.thumbnail_url}
          embedUrl={c.embed_url}
          embedPlatform={c.embed_platform as VideoEmbedPlatform}
          caption={c.caption_html}
        />
      );
    case "audio":
      return (
        <AudioContent
          src={c.url}
          albumArtUrl={c.album_art_url}
          spotifyData={c.spotify_data}
          caption={c.caption_html}
          transcript={c.transcript}
          isVoiceNote={c.is_voice_note}
        />
      );
    default:
      return null;
  }
}

export function QueueItem({
  post,
  displayNumber,
  scheduledFor,
  variant = "queued",
  onPublishNow,
  onRemove,
  isDragging,
}: QueueItemProps) {
  const isScheduled = variant === "scheduled";
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

  const isReblog = !!post.originalPost;
  const renderPostType = isReblog ? post.originalPost!.postType : post.postType;
  const renderContent = isReblog ? post.originalPost!.content : post.content;

  // State-coded top rule: ink for a fixed scheduled post, accent for the next
  // one out (queue position #1), plain otherwise.
  const topBorder = isScheduled
    ? "border-t-2 border-t-foreground"
    : displayNumber === 1
      ? "border-t-2 border-t-accent"
      : "";

  return (
    <div
      className={`group border border-rule ${topBorder} overflow-hidden transition-opacity ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {/* Header bar: drag handle + position + actions */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-rule">
        <div className="flex items-center gap-2.5">
          {!isScheduled && (
            <>
              <span className="cursor-grab active:cursor-grabbing text-meta-dim hover:text-meta">
                <IconGripVertical size={18} />
              </span>
              <span className="slug text-meta">#{displayNumber ?? post.queuePosition}</span>
            </>
          )}
          {scheduledFor && (
            <span className="inline-flex items-center gap-1 slug text-meta">
              <IconClock size={12} className="text-meta-dim" />
              {formatQueueSlot(scheduledFor)}
            </span>
          )}
          {isReblog && (
            <span className="inline-flex items-center gap-1 slug text-meta-dim">
              <IconRefresh size={12} />
              Reblog · @{post.originalPost!.author.username}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link
            href={`/create?edit=${post.id}`}
            className="inline-flex items-center gap-1.5 slug text-meta hover:text-ink transition-colors"
            title="Edit"
          >
            <IconPencil size={13} />
            Edit
          </Link>
          <button
            type="button"
            onClick={handlePublishNow}
            disabled={isPublishing || isRemoving}
            className="inline-flex items-center gap-1.5 slug text-accent hover:opacity-80 transition-opacity disabled:opacity-50"
            title="Publish now"
          >
            {isPublishing ? <IconLoader2 size={13} className="animate-spin" /> : <IconSend size={13} />}
            Post
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPublishing || isRemoving}
            className="inline-flex items-center text-meta hover:text-vocl-like transition-colors disabled:opacity-50"
            title="Remove from queue"
          >
            {isRemoving ? <IconLoader2 size={13} className="animate-spin" /> : <IconTrash size={14} />}
          </button>
        </div>
      </div>

      {/* Reblog comment (if present) */}
      {isReblog && post.reblogCommentHtml && (
        <div
          className="px-4 py-3 editorial-body !text-base text-ink-secondary border-b border-rule"
          dangerouslySetInnerHTML={{ __html: sanitizeHtmlWithSafeLinks(post.reblogCommentHtml) }}
        />
      )}

      {/* Reblog source author header (mimics feed) */}
      {isReblog && (
        <div className="flex items-center gap-2 px-4 py-2 bg-panel">
          {post.originalPost!.author.avatarUrl && (
            <div className="relative w-6 h-6 overflow-hidden">
              <Image
                src={post.originalPost!.author.avatarUrl}
                alt=""
                fill
                sizes="24px"
                className="object-cover"
              />
            </div>
          )}
          <span className="byline text-meta">@{post.originalPost!.author.username}</span>
        </div>
      )}

      {/* Body — same renderers the feed uses; lazy-mounted so a long queue
          doesn't load every image/audio player/poll query up front. */}
      <LazyMount minHeight={220}>
        {renderBody(renderPostType, renderContent, post.id)}
      </LazyMount>
    </div>
  );
}
