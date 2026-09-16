"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import { MotionConfig } from "framer-motion";
import { IconLoader2 } from "@tabler/icons-react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ChatInput } from "./ChatInput";
import { formatDayLabel, isSameDay } from "@/lib/time";

/** Same sender within this many ms collapses into one visual group. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

type MessageRow =
  | { type: "divider"; key: string; label: string }
  | {
      type: "message";
      key: string;
      message: Message;
      isFirstInGroup: boolean;
      isLastInGroup: boolean;
    };

/**
 * Walk the ordered messages and produce render rows: date dividers between
 * different calendar days, plus per-message grouping flags (same sender within
 * GROUP_WINDOW_MS = same run).
 */
function buildRows(messages: Message[]): MessageRow[] {
  const rows: MessageRow[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prev = messages[i - 1];
    const next = messages[i + 1];

    // Date divider when the day changes (or at the very top).
    if (!prev || !isSameDay(prev.createdAt, msg.createdAt)) {
      rows.push({
        type: "divider",
        key: `divider-${msg.id}`,
        label: formatDayLabel(msg.createdAt),
      });
    }

    const sameRunAsPrev =
      !!prev &&
      prev.senderId === msg.senderId &&
      isSameDay(prev.createdAt, msg.createdAt) &&
      new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() <
        GROUP_WINDOW_MS;

    const sameRunAsNext =
      !!next &&
      next.senderId === msg.senderId &&
      isSameDay(next.createdAt, msg.createdAt) &&
      new Date(next.createdAt).getTime() - new Date(msg.createdAt).getTime() <
        GROUP_WINDOW_MS;

    rows.push({
      type: "message",
      key: msg.id,
      message: msg,
      isFirstInGroup: !sameRunAsPrev,
      isLastInGroup: !sameRunAsNext,
    });
  }

  return rows;
}

interface MessageReaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

interface ReplyContext {
  id: string;
  senderId: string;
  senderName?: string;
  preview: string;
}

interface SharedPost {
  id: string;
  postType: string;
  authorUsername: string;
  authorAvatarUrl?: string;
  excerpt: string;
  thumbnailUrl?: string;
  isSensitive: boolean;
}

interface Message {
  id: string;
  content: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio";
  mediaDuration?: number;
  senderId: string;
  isRead: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  reactions: MessageReaction[];
  replyTo?: ReplyContext;
  sharedPost?: SharedPost;
}

interface Participant {
  id: string;
  username: string;
  avatarUrl?: string;
  isOnline?: boolean;
}

interface ActiveChatProps {
  conversationId: string;
  participant: Participant;
  /** Group conversation flag + name + all other members (for groups). */
  isGroup?: boolean;
  groupName?: string | null;
  members?: Participant[];
  messages: Message[];
  currentUserId: string;
  /** The viewer's display name, shown as "You · as …" on their own entries. */
  myDisplayName?: string;
  /** Pending incoming message request — shows an Accept / Decline banner. */
  isRequest?: boolean;
  requestedByMe?: boolean;
  onAcceptRequest?: () => void;
  onDeclineRequest?: () => void;
  isTyping: boolean;
  isLoading?: boolean;
  onBack: () => void;
  onSendMessage: (content: string, mediaFile?: File, replyToId?: string) => Promise<boolean | void>;
  onSendVoice: (url: string, duration: number, replyToId?: string) => Promise<void>;
  onSendGif?: (gifUrl: string) => Promise<void>;
  onEditMessage: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onDeleteConversation?: () => void;
  onMarkAsRead?: () => void;
  onMuteNotifications?: () => void;
  onBlockUser?: () => void;
  onReportUser?: () => void;
  onTyping: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export function ActiveChat({
  conversationId,
  participant,
  isGroup = false,
  groupName,
  members,
  messages,
  currentUserId,
  myDisplayName,
  isRequest = false,
  requestedByMe = false,
  onAcceptRequest,
  onDeclineRequest,
  isTyping,
  isLoading = false,
  onBack,
  onSendMessage,
  onSendVoice,
  onSendGif,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onDeleteConversation,
  onMarkAsRead,
  onMuteNotifications,
  onBlockUser,
  onReportUser,
  onTyping,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}: ActiveChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isPrependingRef = useRef(false);
  const prevScrollHeightRef = useRef(0);
  // The message currently being replied to (shown as a banner above the input).
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    senderName: string;
    preview: string;
  } | null>(null);

  // Clear any pending reply when switching conversations.
  useEffect(() => {
    setReplyingTo(null);
  }, [conversationId]);

  const handleReply = (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;
    const isOwn = msg.senderId === currentUserId;
    const preview = msg.isDeleted
      ? "Deleted message"
      : msg.content
        ? msg.content.slice(0, 120)
        : msg.mediaType === "audio"
          ? "Voice message"
          : msg.mediaType === "image"
            ? "Photo"
            : msg.mediaType === "video"
              ? "Video"
              : "Attachment";
    setReplyingTo({
      id: msg.id,
      senderName: isOwn ? "yourself" : participant.username,
      preview,
    });
  };

  const handleSend = async (content: string, mediaFile?: File) => {
    const replyToId = replyingTo?.id;
    setReplyingTo(null);
    return await onSendMessage(content, mediaFile, replyToId);
  };

  const handleVoice = async (url: string, duration: number) => {
    const replyToId = replyingTo?.id;
    setReplyingTo(null);
    await onSendVoice(url, duration, replyToId);
  };

  const rows = useMemo(() => buildRows(messages), [messages]);

  // Per-sender lookup for group bubbles (name + avatar by senderId).
  const senderMap = useMemo(() => {
    const m = new Map<string, Participant>();
    for (const p of members ?? []) m.set(p.id, p);
    return m;
  }, [members]);
  const senderNameFor = (senderId: string) =>
    (isGroup ? senderMap.get(senderId)?.username : undefined) ?? participant.username;
  const senderAvatarFor = (senderId: string) =>
    (isGroup ? senderMap.get(senderId)?.avatarUrl : undefined) ?? participant.avatarUrl;

  // Scroll to the latest message. Jump instantly on the first paint of a
  // conversation, then animate smoothly for subsequent new messages so it
  // isn't jarring.
  const didInitialScroll = useRef(false);
  useEffect(() => {
    didInitialScroll.current = false;
  }, [conversationId]);
  useEffect(() => {
    if (messages.length === 0) return;
    const el = scrollContainerRef.current;
    // After prepending older messages, keep the viewport where it was instead of
    // jumping to the bottom.
    if (isPrependingRef.current && el) {
      el.scrollTop = el.scrollHeight - prevScrollHeightRef.current;
      isPrependingRef.current = false;
      return;
    }
    messagesEndRef.current?.scrollIntoView({
      behavior: didInitialScroll.current ? "smooth" : "auto",
      block: "end",
    });
    didInitialScroll.current = true;
  }, [messages]);

  // Load older messages when scrolled near the top.
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el || !onLoadMore || !hasMore || isLoadingMore) return;
    if (el.scrollTop < 80) {
      prevScrollHeightRef.current = el.scrollHeight;
      isPrependingRef.current = true;
      onLoadMore();
    }
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex flex-col h-full">
      {/* Thread header — correspondence, not chat */}
      <div className="flex items-end justify-between gap-4 px-5 md:px-10 pt-5 pb-3.5 rule-double-b">
        <div className="min-w-0">
          <button
            onClick={onBack}
            className="byline mb-2 inline-flex items-center gap-1 text-meta hover:text-accent transition-colors md:hidden"
          >
            ← Correspondence
          </button>
          <div className="kicker mb-1.5">Private correspondence · 21+</div>
          <h2 className="font-display text-[30px] leading-none text-ink truncate">
            {isGroup ? groupName || "Group" : `@${participant.username}`}
          </h2>
          <p className="mt-1.5 font-serif italic text-[15px] text-meta">
            {isGroup ? `${(members?.length ?? 0) + 1} members · all 21+ verified` : "Both 21+ verified"}
          </p>
        </div>
        <div className="flex flex-none gap-5">
          {onMuteNotifications && (
            <button onClick={onMuteNotifications} className="byline text-meta hover:text-accent transition-colors">Mute</button>
          )}
          {onBlockUser && (
            <button onClick={onBlockUser} className="byline text-meta hover:text-accent transition-colors">Block</button>
          )}
          {onReportUser && (
            <button onClick={onReportUser} className="byline text-meta hover:text-accent transition-colors">Report</button>
          )}
          {onDeleteConversation && (
            <button onClick={onDeleteConversation} className="byline text-meta hover:text-accent transition-colors">Delete thread</button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-5 md:px-10"
        role="log"
        aria-live="polite"
        aria-label={`Conversation with @${participant.username}`}
      >
        {isLoadingMore && (
          <div className="flex justify-center py-2 text-foreground/40">
            <IconLoader2 size={18} className="animate-spin" />
          </div>
        )}
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="slug text-meta-dim mb-3">A blank page</p>
            <p className="editorial-body text-meta max-w-[40ch]">
              Write the first letter to @{participant.username}.
            </p>
          </div>
        ) : (
          <>
            {rows.map((row) =>
              row.type === "divider" ? (
                <div
                  key={row.key}
                  className="py-[22px] pb-1.5 text-center font-mono text-[10px] tracking-[0.2em] text-meta-dim"
                  role="separator"
                >
                  — {row.label.toUpperCase()} —
                </div>
              ) : (
                <MessageBubble
                  key={row.key}
                  id={row.message.id}
                  content={row.message.content}
                  mediaUrl={row.message.mediaUrl}
                  mediaType={row.message.mediaType}
                  mediaDuration={row.message.mediaDuration}
                  senderId={row.message.senderId}
                  isOwn={row.message.senderId === currentUserId}
                  isRead={row.message.isRead}
                  isEdited={row.message.isEdited}
                  isDeleted={row.message.isDeleted}
                  createdAt={row.message.createdAt}
                  senderName={senderNameFor(row.message.senderId)}
                  senderAvatarUrl={senderAvatarFor(row.message.senderId)}
                  isFirstInGroup={row.isFirstInGroup}
                  isLastInGroup={row.isLastInGroup}
                  reactions={row.message.reactions}
                  replyTo={
                    row.message.replyTo
                      ? {
                          senderName:
                            row.message.replyTo.senderId === currentUserId
                              ? "You"
                              : row.message.replyTo.senderName ||
                                senderNameFor(row.message.replyTo.senderId),
                          preview: row.message.replyTo.preview,
                        }
                      : undefined
                  }
                  sharedPost={row.message.sharedPost}
                  sendingAs={
                    row.message.senderId === currentUserId ? myDisplayName : undefined
                  }
                  currentUserId={currentUserId}
                  onEdit={onEditMessage}
                  onDelete={onDeleteMessage}
                  onReply={handleReply}
                  onToggleReaction={onToggleReaction}
                />
              )
            )}
            {isTyping && <TypingIndicator username={participant.username} />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Incoming request: gate the input behind Accept / Decline. */}
      {isRequest && !requestedByMe ? (
        <div className="flex flex-col gap-3 rule-double-t px-5 md:px-10 py-4">
          <p className="editorial-body text-meta">
            <span className="text-ink">@{participant.username}</span> wants to start a
            correspondence. Accept to reply, or decline to remove it.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onAcceptRequest}
              className="bg-accent px-5 py-2.5 font-sans text-xs font-medium uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-[0.88]"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={onDeclineRequest}
              className="border border-rule px-5 py-2.5 font-sans text-xs font-medium uppercase tracking-[0.16em] text-meta transition-colors hover:text-ink hover:bg-vocl-hover"
            >
              Decline
            </button>
          </div>
        </div>
      ) : (
        <>
          {isRequest && requestedByMe && (
            <div className="rule-double-t px-5 md:px-10 pt-3 pb-1">
              <p className="slug text-meta-dim">
                Request pending · they haven&apos;t accepted yet
              </p>
            </div>
          )}
          <ChatInput
            conversationId={conversationId}
            onSend={handleSend}
            onSendGif={onSendGif}
            onSendVoice={handleVoice}
            onTyping={onTyping}
            placeholder={`Write to @${participant.username}…`}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
          />
        </>
      )}
    </div>
    </MotionConfig>
  );
}

export type { Message, Participant };
