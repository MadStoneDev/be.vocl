"use client";

import { useState, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  IconDots,
  IconPencil,
  IconTrash,
  IconArrowBackUp,
  IconMoodPlus,
  IconPlayerPlay,
  IconPlayerPause,
} from "@tabler/icons-react";
import { LinkPreview, extractUrls } from "./LinkPreview";
import { EmojiPicker } from "./EmojiPicker";
import { fadeUp } from "@/lib/motion";
import { formatClockTime } from "@/lib/time";

interface MessageReaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

interface ReplyPreview {
  senderName: string;
  preview: string;
}

/** A post embedded in a message (resolved for display). */
interface SharedPost {
  id: string;
  postType: string;
  authorUsername: string;
  authorAvatarUrl?: string;
  excerpt: string;
  thumbnailUrl?: string;
  isSensitive: boolean;
}

interface MessageBubbleProps {
  id: string;
  content: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio";
  mediaDuration?: number;
  senderId: string;
  isOwn: boolean;
  isRead: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  /** Raw ISO 8601 timestamp. */
  createdAt: string;
  senderName?: string;
  senderAvatarUrl?: string;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  reactions?: MessageReaction[];
  replyTo?: ReplyPreview;
  /** A post shared into this message, if any. */
  sharedPost?: SharedPost;
  currentUserId?: string;
  /** Pen name the viewer is writing under, shown on their own entries. */
  sendingAs?: string;
  onEdit?: (id: string, newContent: string) => void;
  onDelete?: (id: string) => void;
  onReply?: (id: string) => void;
  onToggleReaction?: (id: string, emoji: string) => void;
}

/** Play/pause + progress + duration for a voice-note message — broadsheet flat. */
function VoiceMessagePlayer({ src, duration }: { src: string; duration?: number }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play();
      setPlaying(true);
    }
  };

  return (
    <div className="flex min-w-[200px] max-w-[320px] items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center bg-accent text-white transition-opacity hover:opacity-[0.88]"
      >
        {playing ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
      </button>
      <div className="h-[3px] flex-1 bg-rule">
        <div className="h-[3px] bg-accent" style={{ width: `${progress}%` }} />
      </div>
      <span className="slug text-meta-dim">{duration ? fmt(duration) : "VOICE"}</span>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (a.duration) setProgress((a.currentTime / a.duration) * 100);
        }}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        className="hidden"
      />
    </div>
  );
}

/**
 * A single message as a dated CORRESPONDENCE entry (artboard 2A): a mono time
 * gutter + an uppercase sender line + Source Serif body — never a chat bubble.
 * The viewer's own entries indent behind a hairline (no alignment flip, no
 * accent tint). All actions (edit / delete / reply / react / media) preserved.
 */
export function MessageBubble({
  id,
  content,
  mediaUrl,
  mediaType,
  mediaDuration,
  isOwn,
  isEdited,
  isDeleted,
  createdAt,
  senderName,
  reactions = [],
  replyTo,
  sharedPost,
  sendingAs,
  onEdit,
  onDelete,
  onReply,
  onToggleReaction,
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);

  const urls = useMemo(() => extractUrls(content), [content]);
  const clockTime = useMemo(() => formatClockTime(createdAt), [createdAt]);

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== content) onEdit?.(id, editContent.trim());
    setIsEditing(false);
  };
  const handleDelete = () => {
    onDelete?.(id);
    setShowMenu(false);
  };

  const senderLine = isOwn ? (sendingAs ? `You · as ${sendingAs}` : "You") : `@${senderName}`;
  const bodyColor = isOwn ? "text-ink-secondary" : "text-ink";
  const bodyMax = isOwn ? "max-w-[58ch]" : "max-w-[62ch]";

  // Row: mono time gutter + body. "You" indents 88px behind a hairline.
  const rowClass = `group flex gap-6 border-b border-rule py-[18px] ${
    isOwn ? "-ml-px border-l border-rule pl-[88px]" : ""
  }`;

  if (isDeleted) {
    return (
      <div className={rowClass}>
        <div className="w-24 flex-none pt-1 font-mono text-[10px] tracking-[0.14em] text-meta-dim">{clockTime}</div>
        <div className="min-w-0 flex-1">
          <div className="byline mb-2 text-meta">{senderLine}</div>
          <p className="font-serif text-[17px] italic leading-[1.7] text-meta-dim">Message withdrawn.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className={rowClass}>
      <div className="w-24 flex-none pt-1 font-mono text-[10px] tracking-[0.14em] text-meta-dim">
        {clockTime}
        {isEdited && " · edited"}
      </div>

      <div className="relative min-w-0 flex-1">
        <div className="byline mb-2 text-meta">{senderLine}</div>

        {/* Media */}
        {mediaUrl && mediaType === "image" && (
          <div className="relative mb-2 w-full max-w-xs overflow-hidden">
            <Image src={mediaUrl} alt="" width={300} height={200} className="object-cover" />
          </div>
        )}
        {mediaUrl && mediaType === "video" && (
          <div className="relative mb-2 w-full max-w-xs overflow-hidden">
            <video src={mediaUrl} controls className="w-full" preload="metadata" />
          </div>
        )}
        {mediaUrl && mediaType === "audio" && (
          <div className={content ? "mb-2.5" : ""}>
            <VoiceMessagePlayer src={mediaUrl} duration={mediaDuration} />
          </div>
        )}

        {/* Quoted reply */}
        {!isEditing && replyTo && (
          <div className="mb-2.5 border-l-2 border-rule py-1 pl-3">
            <span className="byline block text-meta">{replyTo.senderName}</span>
            <span className="block truncate font-serif text-[0.95rem] text-editorial-body">{replyTo.preview}</span>
          </div>
        )}

        {/* Body / editor */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full resize-none border border-rule bg-panel p-2 font-serif text-[17px] text-ink focus:outline-none focus:border-foreground"
              rows={2}
              autoFocus
            />
            <div className="flex justify-end gap-4">
              <button onClick={() => setIsEditing(false)} className="slug text-meta hover:text-ink transition-colors">Cancel</button>
              <button onClick={handleSaveEdit} className="slug text-accent transition-opacity hover:opacity-[0.88]">Save</button>
            </div>
          </div>
        ) : (
          content && <p className={`font-serif text-[17px] leading-[1.7] ${bodyColor} ${bodyMax} whitespace-pre-wrap break-words`}>{content}</p>
        )}

        {/* Shared post — a flat clipping, not a card */}
        {!isEditing && sharedPost && (
          <Link
            href={`/post/${sharedPost.id}`}
            className={`mt-2.5 flex gap-3 border border-rule p-3 transition-colors hover:bg-vocl-hover ${bodyMax}`}
          >
            {sharedPost.thumbnailUrl && !sharedPost.isSensitive && (
              <span className="relative h-16 w-16 flex-none overflow-hidden bg-panel">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sharedPost.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="slug block text-meta-dim">
                Shared post · @{sharedPost.authorUsername}
              </span>
              <span className="mt-1 block font-serif text-[15px] leading-[1.55] text-ink line-clamp-3">
                {sharedPost.isSensitive
                  ? "Sensitive post — open to view."
                  : sharedPost.excerpt || `A ${sharedPost.postType} post`}
              </span>
            </span>
          </Link>
        )}

        {/* Link previews */}
        {!isEditing && urls.length > 0 && (
          <div className="mt-2 space-y-2">
            {urls.slice(0, 2).map((url) => (
              <LinkPreview key={url} url={url} />
            ))}
          </div>
        )}

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onToggleReaction?.(id, r.emoji)}
                aria-pressed={r.reactedByMe}
                className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-xs transition-colors ${
                  r.reactedByMe ? "border-accent text-ink" : "border-rule text-meta hover:text-ink"
                }`}
              >
                <span className="leading-none">{r.emoji}</span>
                <span className="leading-none tabular-nums">{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Hover toolbar */}
        {!isEditing && (
          <div className="absolute right-0 top-0 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="relative">
              <button
                onClick={() => {
                  setShowReactionPicker((v) => !v);
                  setShowMenu(false);
                }}
                aria-label="Add reaction"
                className="border border-rule bg-panel p-1.5 text-meta hover:text-ink transition-colors"
              >
                <IconMoodPlus size={14} />
              </button>
              <EmojiPicker
                isOpen={showReactionPicker}
                onClose={() => setShowReactionPicker(false)}
                onSelect={(emoji) => {
                  onToggleReaction?.(id, emoji);
                  setShowReactionPicker(false);
                }}
              />
            </div>
            <button
              onClick={() => onReply?.(id)}
              aria-label="Reply"
              className="border border-rule bg-panel p-1.5 text-meta hover:text-ink transition-colors"
            >
              <IconArrowBackUp size={14} />
            </button>
            {isOwn && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowMenu(!showMenu);
                    setShowReactionPicker(false);
                  }}
                  aria-label="Message options"
                  className="border border-rule bg-panel p-1.5 text-meta hover:text-ink transition-colors"
                >
                  <IconDots size={14} />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-8 z-50 w-32 border border-rule bg-background py-1 text-ink">
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setShowMenu(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-meta hover:text-ink hover:bg-vocl-hover transition-colors"
                      >
                        <IconPencil size={14} /> Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-vocl-like hover:bg-vocl-like/10 transition-colors"
                      >
                        <IconTrash size={14} /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
