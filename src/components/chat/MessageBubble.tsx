"use client";

import { useState, useMemo, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  IconCheck,
  IconChecks,
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
  /** Sender display info for grouping (incoming messages only). */
  senderName?: string;
  senderAvatarUrl?: string;
  /** First message of a same-sender run: show avatar + name. */
  isFirstInGroup?: boolean;
  /** Last message of a same-sender run: show tail corner + timestamp. */
  isLastInGroup?: boolean;
  /** Aggregated emoji reactions on this message. */
  reactions?: MessageReaction[];
  /** Quoted preview of the message this one replies to. */
  replyTo?: ReplyPreview;
  currentUserId?: string;
  onEdit?: (id: string, newContent: string) => void;
  onDelete?: (id: string) => void;
  onReply?: (id: string) => void;
  onToggleReaction?: (id: string, emoji: string) => void;
}

/** Compact play/pause + progress + duration player for voice-note messages. */
function VoiceMessagePlayer({
  src,
  duration,
  isOwn,
}: {
  src: string;
  duration?: number;
  isOwn: boolean;
}) {
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

  const trackBg = isOwn ? "bg-white/30" : "bg-foreground/15";
  const fillBg = isOwn ? "bg-white" : "bg-vocl-primary";
  const btnBg = isOwn
    ? "bg-white/25 text-white hover:bg-white/35"
    : "bg-vocl-primary text-white hover:bg-vocl-primary-hover";
  const labelColor = isOwn ? "text-white/80" : "text-foreground/70";

  return (
    <div className="flex items-center gap-2.5 min-w-[180px]">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-colors ${btnBg}`}
      >
        {playing ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
      </button>
      <div className="flex-1">
        <div className={`h-1.5 rounded-full overflow-hidden ${trackBg}`}>
          <div className={`h-full ${fillBg}`} style={{ width: `${progress}%` }} />
        </div>
      </div>
      <span className={`text-[11px] font-mono ${labelColor}`}>
        {duration ? fmt(duration) : "Voice"}
      </span>
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

export function MessageBubble({
  id,
  content,
  mediaUrl,
  mediaType,
  mediaDuration,
  isOwn,
  isRead,
  isEdited,
  isDeleted,
  createdAt,
  senderName,
  senderAvatarUrl,
  isFirstInGroup = true,
  isLastInGroup = true,
  reactions = [],
  replyTo,
  onEdit,
  onDelete,
  onReply,
  onToggleReaction,
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);

  // Extract URLs for link previews
  const urls = useMemo(() => extractUrls(content), [content]);
  const clockTime = useMemo(() => formatClockTime(createdAt), [createdAt]);

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== content) {
      onEdit?.(id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete?.(id);
    setShowMenu(false);
  };

  // Tighten spacing within a run; add a gap between runs.
  const runSpacing = isLastInGroup ? "mb-2.5" : "mb-0.5";
  // Incoming messages reserve a gutter for the avatar so the run lines up.
  const avatarGutter = isOwn ? "" : "pl-10";

  if (isDeleted) {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} ${runSpacing} ${avatarGutter}`}>
        <div className="px-4 py-2 rounded-2xl bg-vocl-hover border border-vocl-border">
          <p className="text-sm text-foreground/40 italic">Message deleted</p>
        </div>
      </div>
    );
  }

  // Corner radii: only the last bubble in a run gets the "tail".
  const tail = isOwn
    ? isLastInGroup
      ? "rounded-br-md"
      : "rounded-br-2xl"
    : isLastInGroup
      ? "rounded-bl-md"
      : "rounded-bl-2xl";

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className={`group flex ${isOwn ? "justify-end" : "justify-start"} ${runSpacing}`}
    >
      {/* Avatar gutter for incoming messages */}
      {!isOwn && (
        <div className="w-8 flex-shrink-0 mr-2 self-end">
          {isLastInGroup && (
            <div className="w-8 h-8 rounded-full overflow-hidden">
              {senderAvatarUrl ? (
                <Image
                  src={senderAvatarUrl}
                  alt={senderName || ""}
                  width={32}
                  height={32}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-vocl-primary to-vocl-primary-hover flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {(senderName || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="relative max-w-[80%]">
        {/* Sender name on the first message of an incoming run */}
        {!isOwn && isFirstInGroup && senderName && (
          <p className="text-xs font-medium text-foreground/50 mb-0.5 ml-1">
            @{senderName}
          </p>
        )}

        {/* Message bubble */}
        <div
          className={`relative px-4 py-2.5 rounded-2xl ${tail} ${
            isOwn
              ? "bg-vocl-primary text-white"
              : "bg-vocl-surface-muted text-neutral-800 dark:bg-vocl-surface-dark dark:text-foreground"
          }`}
        >
          {/* Media content */}
          {mediaUrl && mediaType === "image" && (
            <div className="relative w-full max-w-xs rounded-lg overflow-hidden mb-2">
              <Image
                src={mediaUrl}
                alt=""
                width={300}
                height={200}
                className="object-cover rounded-lg"
              />
            </div>
          )}
          {mediaUrl && mediaType === "video" && (
            <div className="relative w-full max-w-xs rounded-lg overflow-hidden mb-2">
              <video
                src={mediaUrl}
                controls
                className="w-full rounded-lg"
                preload="metadata"
              />
            </div>
          )}
          {mediaUrl && mediaType === "audio" && (
            <div className={content ? "mb-2" : ""}>
              <VoiceMessagePlayer
                src={mediaUrl}
                duration={mediaDuration}
                isOwn={isOwn}
              />
            </div>
          )}

          {/* Quoted reply preview */}
          {!isEditing && replyTo && (
            <div
              className={`mb-1.5 pl-2 border-l-2 rounded-r text-xs ${
                isOwn
                  ? "border-white/50 bg-white/10"
                  : "border-vocl-primary bg-vocl-primary/10"
              } py-1 pr-2`}
            >
              <span
                className={`block font-medium ${
                  isOwn ? "text-white/80" : "text-vocl-primary"
                }`}
              >
                {replyTo.senderName}
              </span>
              <span
                className={`block truncate ${
                  isOwn ? "text-white/70" : "text-foreground/60"
                }`}
              >
                {replyTo.preview}
              </span>
            </div>
          )}

          {/* Text content */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 rounded-lg bg-white/10 text-white text-sm resize-none focus:outline-none"
                rows={2}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 text-xs rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            content && (
              <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
            )
          )}

          {/* Link previews */}
          {!isEditing && urls.length > 0 && (
            <div className="mt-2 space-y-2">
              {urls.slice(0, 2).map((url) => (
                <LinkPreview key={url} url={url} />
              ))}
            </div>
          )}

          {/* Timestamp and status — only on the last bubble of a run, or on hover */}
          <div
            className={`flex items-center gap-1.5 mt-1 ${
              isOwn ? "justify-end" : "justify-start"
            } ${
              isLastInGroup
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 transition-opacity"
            }`}
          >
            <span
              className={`text-[10px] ${
                isOwn ? "text-white/60" : "text-foreground/40"
              }`}
            >
              {clockTime}
              {isEdited && " (edited)"}
            </span>
            {isOwn && (
              <span className="text-white/60">
                {isRead ? <IconChecks size={14} /> : <IconCheck size={14} />}
              </span>
            )}
          </div>
        </div>

        {/* Reactions chip row */}
        {reactions.length > 0 && (
          <div
            className={`flex flex-wrap gap-1 mt-1 ${
              isOwn ? "justify-end" : "justify-start"
            }`}
          >
            {reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onToggleReaction?.(id, r.emoji)}
                aria-pressed={r.reactedByMe}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                  r.reactedByMe
                    ? "bg-vocl-primary/20 border-vocl-primary/50 text-foreground"
                    : "bg-vocl-surface-muted border-vocl-border text-foreground/70 hover:bg-vocl-hover dark:bg-vocl-surface-dark"
                }`}
              >
                <span className="leading-none">{r.emoji}</span>
                <span className="leading-none tabular-nums">{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Hover toolbar: react + reply (all messages); edit/delete (own only) */}
        {!isEditing && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${
              isOwn ? "-left-20" : "-right-20"
            }`}
          >
            {/* React */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowReactionPicker((v) => !v);
                  setShowMenu(false);
                }}
                aria-label="Add reaction"
                className="p-1.5 rounded-full bg-vocl-surface-dark hover:bg-vocl-hover-strong transition-colors"
              >
                <IconMoodPlus size={14} className="text-foreground/50" />
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

            {/* Reply */}
            <button
              onClick={() => onReply?.(id)}
              aria-label="Reply"
              className="p-1.5 rounded-full bg-vocl-surface-dark hover:bg-vocl-hover-strong transition-colors"
            >
              <IconArrowBackUp size={14} className="text-foreground/50" />
            </button>

            {/* Edit/Delete menu (own messages only) */}
            {isOwn && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowMenu(!showMenu);
                    setShowReactionPicker(false);
                  }}
                  aria-label="Message options"
                  className="p-1.5 rounded-full bg-vocl-surface-dark hover:bg-vocl-hover-strong transition-colors"
                >
                  <IconDots size={14} className="text-foreground/50" />
                </button>

                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 top-8 w-32 py-1 rounded-xl bg-vocl-surface-dark border border-vocl-border shadow-xl z-50 text-foreground">
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground/70 hover:text-foreground hover:bg-vocl-hover transition-colors"
                      >
                        <IconPencil size={14} />
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-vocl-like hover:bg-vocl-like/10 transition-colors"
                      >
                        <IconTrash size={14} />
                        Delete
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
