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

  return (
    <div
      className={`group rounded-2xl bg-vocl-surface-dark border border-vocl-border transition-all overflow-hidden ${
        isDragging ? "opacity-50 scale-[0.98]" : "hover:border-vocl-border"
      }`}
    >
      {/* Header bar: drag handle + position + actions */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-vocl-border">
        <div className="flex items-center gap-2">
          {!isScheduled && (
            <>
              <span className="cursor-grab active:cursor-grabbing text-foreground/30 hover:text-foreground/50">
                <IconGripVertical size={18} />
              </span>
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-vocl-primary/20 type-meta font-semibold text-vocl-primary">
                {displayNumber ?? post.queuePosition}
              </span>
            </>
          )}
          {scheduledFor && (
            <span className="inline-flex items-center gap-1 type-meta font-medium text-foreground/60">
              <IconClock size={13} className="text-foreground/40" />
              {formatQueueSlot(scheduledFor)}
            </span>
          )}
          {isReblog && (
            <span className="inline-flex items-center gap-1 type-meta text-foreground/50">
              <IconRefresh size={12} />
              Reblog of @{post.originalPost!.author.username}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/create?edit=${post.id}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-vocl-hover text-foreground/70 hover:text-foreground hover:bg-vocl-hover-strong type-meta font-medium transition-colors"
            title="Edit"
          >
            <IconPencil size={14} />
            Edit
          </Link>
          <button
            type="button"
            onClick={handlePublishNow}
            disabled={isPublishing || isRemoving}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-vocl-primary/15 text-vocl-primary hover:bg-vocl-primary/25 type-meta font-medium transition-colors disabled:opacity-50"
            title="Publish now"
          >
            {isPublishing ? <IconLoader2 size={14} className="animate-spin" /> : <IconSend size={14} />}
            Post
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPublishing || isRemoving}
            className="w-8 h-8 inline-flex items-center justify-center rounded-xl text-foreground/50 hover:text-vocl-like hover:bg-vocl-like/10 transition-colors disabled:opacity-50"
            title="Remove from queue"
          >
            {isRemoving ? <IconLoader2 size={14} className="animate-spin" /> : <IconTrash size={14} />}
          </button>
        </div>
      </div>

      {/* Reblog comment (if present) */}
      {isReblog && post.reblogCommentHtml && (
        <div
          className="px-4 py-3 type-body text-foreground/80 border-b border-vocl-border"
          dangerouslySetInnerHTML={{ __html: sanitizeHtmlWithSafeLinks(post.reblogCommentHtml) }}
        />
      )}

      {/* Reblog source author header (mimics feed) */}
      {isReblog && (
        <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.02]">
          {post.originalPost!.author.avatarUrl && (
            <div className="relative w-6 h-6 rounded-full overflow-hidden">
              <Image
                src={post.originalPost!.author.avatarUrl}
                alt=""
                fill
                sizes="24px"
                className="object-cover"
              />
            </div>
          )}
          <span className="type-meta text-foreground/70">
            @{post.originalPost!.author.username}
          </span>
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
