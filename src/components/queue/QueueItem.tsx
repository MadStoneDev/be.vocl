"use client";

import { useState } from "react";
import Image from "next/image";
import {
  IconGripVertical,
  IconTrash,
  IconSend,
  IconLoader2,
  IconRefresh,
} from "@tabler/icons-react";
import { sanitizeHtmlWithSafeLinks } from "@/lib/sanitize";
import {
  ImageContent,
  TextContent,
  VideoContent,
  AudioContent,
  GalleryContent,
  LinkPreviewCarousel,
} from "@/components/Post";
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
  onPublishNow: (postId: string) => Promise<void>;
  onRemove: (postId: string) => Promise<void>;
  isDragging?: boolean;
}

function renderBody(postType: string, content: any) {
  const c = content || {};
  switch (postType) {
    case "text":
      return (
        <>
          <TextContent html={c.html}>{c.plain || c.text}</TextContent>
          {c.link_previews?.length > 0 && (
            <div className="bg-[#EBEBEB] -mt-16 pb-16">
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

  const isReblog = !!post.originalPost;
  const renderPostType = isReblog ? post.originalPost!.postType : post.postType;
  const renderContent = isReblog ? post.originalPost!.content : post.content;

  return (
    <div
      className={`group rounded-2xl bg-vocl-surface-dark border border-white/5 transition-all overflow-hidden ${
        isDragging ? "opacity-50 scale-[0.98]" : "hover:border-white/10"
      }`}
    >
      {/* Header bar: drag handle + position + actions */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="cursor-grab active:cursor-grabbing text-foreground/30 hover:text-foreground/50">
            <IconGripVertical size={18} />
          </span>
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-vocl-accent/20 text-xs font-semibold text-vocl-accent">
            {post.queuePosition}
          </span>
          {isReblog && (
            <span className="inline-flex items-center gap-1 text-xs text-foreground/50">
              <IconRefresh size={12} />
              Reblog of @{post.originalPost!.author.username}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePublishNow}
            disabled={isPublishing || isRemoving}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-vocl-accent/15 text-vocl-accent hover:bg-vocl-accent/25 text-xs font-medium transition-colors disabled:opacity-50"
            title="Publish now"
          >
            {isPublishing ? <IconLoader2 size={14} className="animate-spin" /> : <IconSend size={14} />}
            Post
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPublishing || isRemoving}
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-foreground/50 hover:text-vocl-like hover:bg-vocl-like/10 transition-colors disabled:opacity-50"
            title="Remove from queue"
          >
            {isRemoving ? <IconLoader2 size={14} className="animate-spin" /> : <IconTrash size={14} />}
          </button>
        </div>
      </div>

      {/* Reblog comment (if present) */}
      {isReblog && post.reblogCommentHtml && (
        <div
          className="px-4 py-3 text-sm text-foreground/80 border-b border-white/5"
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
                className="object-cover"
              />
            </div>
          )}
          <span className="text-xs text-foreground/70">
            @{post.originalPost!.author.username}
          </span>
        </div>
      )}

      {/* Body — same renderers the feed uses */}
      <div>{renderBody(renderPostType, renderContent)}</div>
    </div>
  );
}
