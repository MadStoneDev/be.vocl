"use client";

import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  IconMessagePlus,
  IconTrash,
  IconDots,
  IconMailOpened,
  IconBellOff,
  IconBan,
  IconFlag,
} from "@tabler/icons-react";

interface Conversation {
  id: string;
  participant: {
    id: string;
    username: string;
    avatarUrl?: string;
    isOnline?: boolean;
  };
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
    isRead: boolean;
  };
  unreadCount: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  searchQuery: string;
  onSelect: (conversationId: string) => void;
  onNewChat: () => void;
  onDeleteConversation?: (conversationId: string) => void;
  onMarkAsRead?: (conversationId: string) => void;
  onMuteNotifications?: (conversationId: string) => void;
  onBlockUser?: (conversationId: string) => void;
  onReportUser?: (conversationId: string) => void;
}

export function ConversationList({
  conversations,
  searchQuery,
  onSelect,
  onNewChat,
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
  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) =>
    conv.participant.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filteredConversations.length === 0 && !searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-vocl-accent/10 flex items-center justify-center mb-4">
          <IconMessagePlus size={28} className="text-vocl-accent" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No messages yet</h3>
        <p className="text-sm text-foreground/50 mb-6">
          Start a conversation with someone you follow
        </p>
        <button
          onClick={onNewChat}
          className="px-5 py-2.5 rounded-xl bg-vocl-accent text-white font-medium hover:bg-vocl-accent-hover transition-colors"
        >
          Start chatting
        </button>
      </div>
    );
  }

  if (filteredConversations.length === 0 && searchQuery) {
    return (
      <div className="py-12 px-4 text-center">
        <p className="text-sm text-foreground/50">
          No conversations matching &quot;{searchQuery}&quot;
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/5">
      {/* Context menu - portaled to body to escape overflow clipping */}
      {contextMenu && createPortal(
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-[70] w-52 py-1 rounded-xl bg-vocl-surface-dark border border-white/10 shadow-xl"
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
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-white/5 transition-colors"
            >
              <IconMailOpened size={18} />
              Mark as read
            </button>
            <button
              onClick={() => {
                onMuteNotifications?.(contextMenu.conversationId);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-white/5 transition-colors"
            >
              <IconBellOff size={18} />
              Mute notifications
            </button>
            <div className="my-1 border-t border-white/5" />
            <button
              onClick={() => {
                onBlockUser?.(contextMenu.conversationId);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-vocl-like hover:bg-vocl-like/10 transition-colors"
            >
              <IconBan size={18} />
              Block user
            </button>
            <button
              onClick={() => {
                onReportUser?.(contextMenu.conversationId);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-vocl-like hover:bg-vocl-like/10 transition-colors"
            >
              <IconFlag size={18} />
              Report user
            </button>
            <button
              onClick={() => {
                onDeleteConversation?.(contextMenu.conversationId);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-vocl-like hover:bg-vocl-like/10 transition-colors"
            >
              <IconTrash size={18} />
              Delete conversation
            </button>
          </div>
        </>,
        document.body
      )}

      {filteredConversations.map((conversation) => (
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
          className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left"
        >
          {/* Avatar with online indicator */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-full overflow-hidden">
              {conversation.participant.avatarUrl ? (
                <Image
                  src={conversation.participant.avatarUrl}
                  alt={conversation.participant.username}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-vocl-accent to-vocl-accent-hover flex items-center justify-center">
                  <span className="text-lg font-bold text-white">
                    {conversation.participant.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            {conversation.participant.isOnline && (
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-background" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-medium text-foreground truncate">
                @{conversation.participant.username}
              </span>
              {conversation.lastMessage && (
                <span className="text-xs text-foreground/40 flex-shrink-0 ml-2">
                  {conversation.lastMessage.createdAt}
                </span>
              )}
            </div>
            {conversation.lastMessage && (
              <p
                className={`text-sm truncate ${
                  conversation.lastMessage.isRead
                    ? "text-foreground/50"
                    : "text-foreground font-medium"
                }`}
              >
                {conversation.lastMessage.content}
              </p>
            )}
          </div>

          {/* Unread badge */}
          {conversation.unreadCount > 0 && (
            <div className="flex-shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-vocl-accent flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
              </span>
            </div>
          )}

          {/* Menu button */}
          <div
            className="flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setContextMenu({
                  conversationId: conversation.id,
                  x: rect.left,
                  y: rect.bottom + 4,
                });
              }}
              className="p-1.5 rounded-lg text-foreground/30 hover:text-foreground/70 hover:bg-white/5 transition-colors"
            >
              <IconDots size={16} />
            </button>
          </div>
        </button>
      ))}
    </div>
  );
}

export type { Conversation };
