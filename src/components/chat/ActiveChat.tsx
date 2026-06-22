"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { MotionConfig } from "framer-motion";
import {
  IconArrowLeft,
  IconDots,
  IconTrash,
  IconMailOpened,
  IconBellOff,
  IconBan,
  IconFlag,
} from "@tabler/icons-react";
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
  messages: Message[];
  currentUserId: string;
  isTyping: boolean;
  isLoading?: boolean;
  onBack: () => void;
  onSendMessage: (content: string, mediaFile?: File, replyToId?: string) => Promise<void>;
  onSendVoice: (url: string, duration: number, replyToId?: string) => Promise<void>;
  onEditMessage: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onDeleteConversation?: () => void;
  onMarkAsRead?: () => void;
  onMuteNotifications?: () => void;
  onBlockUser?: () => void;
  onReportUser?: () => void;
  onTyping: () => void;
}

export function ActiveChat({
  conversationId,
  participant,
  messages,
  currentUserId,
  isTyping,
  isLoading = false,
  onBack,
  onSendMessage,
  onSendVoice,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onDeleteConversation,
  onMarkAsRead,
  onMuteNotifications,
  onBlockUser,
  onReportUser,
  onTyping,
}: ActiveChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(false);
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
    await onSendMessage(content, mediaFile, replyToId);
  };

  const handleVoice = async (url: string, duration: number) => {
    const replyToId = replyingTo?.id;
    setReplyingTo(null);
    await onSendVoice(url, duration, replyToId);
  };

  const rows = useMemo(() => buildRows(messages), [messages]);

  // Scroll to the latest message. Jump instantly on the first paint of a
  // conversation, then animate smoothly for subsequent new messages so it
  // isn't jarring.
  const didInitialScroll = useRef(false);
  useEffect(() => {
    didInitialScroll.current = false;
  }, [conversationId]);
  useEffect(() => {
    if (messages.length === 0) return;
    messagesEndRef.current?.scrollIntoView({
      behavior: didInitialScroll.current ? "smooth" : "auto",
      block: "end",
    });
    didInitialScroll.current = true;
  }, [messages]);

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-vocl-border">
        <button
          onClick={onBack}
          aria-label="Back to conversations"
          className="p-2 -ml-2 rounded-xl text-foreground/60 hover:text-foreground hover:bg-vocl-hover transition-colors"
        >
          <IconArrowLeft size={20} />
        </button>

        {/* Participant info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden">
              {participant.avatarUrl ? (
                <Image
                  src={participant.avatarUrl}
                  alt={participant.username}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-vocl-primary to-vocl-primary-hover flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {participant.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            {participant.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="type-heading text-foreground truncate leading-tight">
              @{participant.username}
            </p>
            <p className="type-meta uppercase tracking-widest text-foreground/40">
              {participant.isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Conversation options"
            aria-haspopup="menu"
            aria-expanded={showMenu}
            className="p-2 rounded-xl text-foreground/60 hover:text-foreground hover:bg-vocl-hover transition-colors"
          >
            <IconDots size={20} />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-52 py-1 rounded-xl bg-vocl-surface-dark border border-vocl-border shadow-xl z-50 text-foreground">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onMarkAsRead?.();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-vocl-hover transition-colors"
                >
                  <IconMailOpened size={18} />
                  Mark as read
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onMuteNotifications?.();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-vocl-hover transition-colors"
                >
                  <IconBellOff size={18} />
                  Mute notifications
                </button>
                <div className="my-1 border-t border-vocl-border" />
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onBlockUser?.();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-vocl-like hover:bg-vocl-like/10 transition-colors"
                >
                  <IconBan size={18} />
                  Block user
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onReportUser?.();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-vocl-like hover:bg-vocl-like/10 transition-colors"
                >
                  <IconFlag size={18} />
                  Report user
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDeleteConversation?.();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-vocl-like hover:bg-vocl-like/10 transition-colors"
                >
                  <IconTrash size={18} />
                  Delete conversation
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4"
        role="log"
        aria-live="polite"
        aria-label={`Conversation with @${participant.username}`}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full overflow-hidden mb-4">
              {participant.avatarUrl ? (
                <Image
                  src={participant.avatarUrl}
                  alt={participant.username}
                  width={64}
                  height={64}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-vocl-primary to-vocl-primary-hover flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {participant.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <p className="text-foreground/50 text-sm">
              Start your conversation with @{participant.username}
            </p>
          </div>
        ) : (
          <>
            {rows.map((row) =>
              row.type === "divider" ? (
                <div
                  key={row.key}
                  className="flex items-center justify-center my-4"
                  role="separator"
                >
                  <span className="px-3 py-1 rounded-full bg-vocl-surface-muted text-foreground/50 text-[11px] font-medium dark:bg-vocl-surface-dark">
                    {row.label}
                  </span>
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
                  senderName={participant.username}
                  senderAvatarUrl={participant.avatarUrl}
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
                                participant.username,
                          preview: row.message.replyTo.preview,
                        }
                      : undefined
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

      {/* Input */}
      <ChatInput
        conversationId={conversationId}
        onSend={handleSend}
        onSendVoice={handleVoice}
        onTyping={onTyping}
        placeholder={`Message @${participant.username}`}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </div>
    </MotionConfig>
  );
}

export type { Message, Participant };
