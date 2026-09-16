"use client";

import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  IconTrash,
  IconMailOpened,
  IconBellOff,
  IconBan,
  IconFlag,
} from "@tabler/icons-react";
import { TimeAgo } from "@/components/ui/TimeAgo";

interface Conversation {
  id: string;
  isGroup?: boolean;
  name?: string | null;
  participant: {
    id: string;
    username: string;
    avatarUrl?: string;
    isOnline?: boolean;
  };
  participants?: Array<{ id: string; username: string; avatarUrl?: string }>;
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
    isRead: boolean;
  };
  unreadCount: number;
  isMuted?: boolean;
  isRequest?: boolean;
  requestedByMe?: boolean;
}

interface ConversationListProps {
  conversations: Conversation[];
  searchQuery: string;
  onSelect: (conversationId: string) => void;
  onNewChat: () => void;
  /** Highlights the open thread with the accent left-rule + panel fill. */
  activeConversationId?: string;
  /** When set, the viewer's own last message is prefixed "You: ". */
  currentUserId?: string;
  onDeleteConversation?: (conversationId: string) => void;
  onMarkAsRead?: (conversationId: string) => void;
  onMuteNotifications?: (conversationId: string) => void;
  onBlockUser?: (conversationId: string) => void;
  onReportUser?: (conversationId: string) => void;
}

/**
 * Broadsheet "Correspondence" list (artboard 2A): avatar-less rows — handle +
 * mono time on one baseline, a serif preview beneath. Selected row carries a 2px
 * accent left rule + panel fill; unread is a 5×5px accent square before the
 * handle (never a numeric badge). Context menu on right-click / long-press.
 */
export function ConversationList({
  conversations,
  searchQuery,
  onSelect,
  onNewChat,
  activeConversationId,
  currentUserId,
  onDeleteConversation,
  onMarkAsRead,
  onMuteNotifications,
  onBlockUser,
  onReportUser,
}: ConversationListProps) {
  const [contextMenu, setContextMenu] = useState<{
    conversationId: string;
    x: number;
    y: number;
  } | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = useRef(false);

  const handleTouchStart = useCallback((conversationId: string, e: React.TouchEvent) => {
    longPressTriggered.current = false;
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setContextMenu({ conversationId, x, y });
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleContextMenuEvent = useCallback((conversationId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ conversationId, x: e.clientX, y: e.clientY });
  }, []);

  const filteredConversations = conversations.filter((conv) => {
    const q = searchQuery.toLowerCase();
    return (
      conv.participant.username.toLowerCase().includes(q) ||
      (conv.name ? conv.name.toLowerCase().includes(q) : false)
    );
  });

  if (filteredConversations.length === 0 && !searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="slug text-meta-dim mb-3">Correspondence</p>
        <h3 className="type-heading text-ink mb-2">Nothing in the mailbag.</h3>
        <p className="editorial-body text-meta mb-6 max-w-[32ch]">
          When someone writes to you it lands here, and nowhere else.
        </p>
        <button
          onClick={onNewChat}
          className="border border-foreground px-5 py-2.5 font-sans font-medium uppercase tracking-[0.16em] text-xs text-ink hover:bg-vocl-hover transition-colors"
        >
          Write to someone
        </button>
      </div>
    );
  }

  if (filteredConversations.length === 0 && searchQuery) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="editorial-body text-meta">No correspondents matching &quot;{searchQuery}&quot;.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Context menu — portaled to body to escape overflow clipping */}
      {contextMenu && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-[70] w-52 border border-rule bg-background py-1 text-ink"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 220),
              top: Math.min(contextMenu.y, window.innerHeight - 280),
            }}
          >
            <button
              onClick={() => {
                onMarkAsRead?.(contextMenu.conversationId);
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-meta hover:text-ink hover:bg-vocl-hover transition-colors"
            >
              <IconMailOpened size={18} /> Mark as read
            </button>
            <button
              onClick={() => {
                onMuteNotifications?.(contextMenu.conversationId);
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-meta hover:text-ink hover:bg-vocl-hover transition-colors"
            >
              <IconBellOff size={18} /> Mute notifications
            </button>
            <div className="my-1 border-t border-rule" />
            <button
              onClick={() => {
                onBlockUser?.(contextMenu.conversationId);
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-meta hover:text-vocl-like hover:bg-vocl-like/10 transition-colors"
            >
              <IconBan size={18} /> Block user
            </button>
            <button
              onClick={() => {
                onReportUser?.(contextMenu.conversationId);
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-meta hover:text-vocl-like hover:bg-vocl-like/10 transition-colors"
            >
              <IconFlag size={18} /> Report user
            </button>
            <button
              onClick={() => {
                onDeleteConversation?.(contextMenu.conversationId);
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-vocl-like hover:bg-vocl-like/10 transition-colors"
            >
              <IconTrash size={18} /> Delete conversation
            </button>
          </div>
        </>,
        document.body
      )}

      {filteredConversations.map((conversation) => {
        const isActive = conversation.id === activeConversationId;
        const isUnread = conversation.unreadCount > 0;
        const lm = conversation.lastMessage;
        const isOwnLast = !!(lm && currentUserId && lm.senderId === currentUserId);
        const title = conversation.isGroup ? conversation.name || "Group" : `@${conversation.participant.username}`;
        return (
          <button
            key={conversation.id}
            onClick={() => {
              if (longPressTriggered.current) return;
              onSelect(conversation.id);
            }}
            onContextMenu={(e) => handleContextMenuEvent(conversation.id, e)}
            onTouchStart={(e) => handleTouchStart(conversation.id, e)}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
            className={`block w-full border-b border-rule border-l-2 px-6 py-4 text-left transition-colors ${
              isActive ? "border-l-accent bg-panel" : "border-l-transparent hover:bg-vocl-hover"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 truncate text-sm font-medium text-ink">
                {isUnread && <span aria-hidden="true" className="inline-block h-[5px] w-[5px] flex-none bg-accent" />}
                <span className="truncate">{title}</span>
              </span>
              {lm && <TimeAgo iso={lm.createdAt} className="slug flex-none text-meta-dim" />}
            </div>
            {lm && (
              <p
                className={`editorial-body mt-1.5 truncate text-[0.9rem] ${
                  isUnread ? "text-ink-secondary" : "text-editorial-body"
                }`}
              >
                {isOwnLast && <span className="text-meta">You: </span>}
                {lm.content}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}

export type { Conversation };
