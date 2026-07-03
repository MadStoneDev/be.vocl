"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { IconX, IconSearch, IconLoader2, IconMessagePlus } from "@tabler/icons-react";
import { ConversationList, type Conversation } from "./ConversationList";
import { ActiveChat, type Message, type Participant } from "./ActiveChat";
import { NewChatModal } from "./NewChatModal";
import { UserReportDialog } from "@/components/Post/UserReportDialog";
import { useChat, useMessages } from "@/hooks/useChat";
import { useTypingPresence } from "@/hooks/useTypingPresence";
import { useAuth } from "@/hooks/useAuth";
import { useIsOnline } from "@/hooks/useOnlineStatus";
import { toast, ConfirmDialog, Avatar } from "@/components/ui";
import { hideConversation, setConversationMuted, searchMessages, type MessageSearchResult } from "@/actions/messages";
import { blockUser } from "@/actions/follows";

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  initialConversationId?: string | null;
}

export function ChatSidebar({ isOpen, onClose, currentUserId, initialConversationId }: ChatSidebarProps) {
  const [view, setView] = useState<"list" | "chat">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageResults, setMessageResults] = useState<MessageSearchResult[]>([]);

  // Debounced full-text search over the user's message history.
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setMessageResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await searchMessages(q);
      if (!cancelled && res.success) setMessageResults(res.results || []);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchQuery]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [pendingBlockUserId, setPendingBlockUserId] = useState<string | null>(null);
  const [isBlocking, setIsBlocking] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ id: string; username: string } | null>(null);

  // A11y: focus trap + restore for the slide-over dialog.
  const panelRef = useRef<HTMLElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Get current user profile for username
  const { profile } = useAuth();

  // Use chat hook for conversations
  const {
    conversations: rawConversations,
    isLoading: conversationsLoading,
    error: conversationsError,
    refreshConversations,
  } = useChat(currentUserId);

  // Get participant IDs for online status check
  const participantIds = rawConversations.map((c) => c.participant.id);
  const onlineStatus = useIsOnline(participantIds);

  // Enrich conversations with online status
  const conversations = rawConversations.map((conv) => ({
    ...conv,
    participant: {
      ...conv.participant,
      isOnline: onlineStatus.get(conv.participant.id) || false,
    },
  }));

  // Only surface message hits whose conversation is in the list — otherwise the
  // row would render a blank participant and clicking it couldn't open anything.
  const visibleMessageResults = messageResults.filter((r) =>
    conversations.some((c) => c.id === r.conversationId)
  );

  // Use messages hook for active conversation
  const {
    messages,
    isLoading: messagesLoading,
    sendNewMessage,
    editExistingMessage,
    deleteExistingMessage,
    toggleReaction,
    loadMoreMessages,
    hasMore,
    isLoadingMore,
  } = useMessages(activeConversation?.id || null, currentUserId);

  // Use typing presence hook
  const { typingUsers, startTyping, stopTyping } = useTypingPresence(
    activeConversation?.id || null,
    currentUserId,
    profile?.username
  );

  // Check if the other participant is typing
  const isParticipantTyping = typingUsers.length > 0;

  // Refresh conversations when sidebar opens
  useEffect(() => {
    if (isOpen && currentUserId) {
      refreshConversations();
    }
  }, [isOpen, currentUserId, refreshConversations]);

  // A11y: Escape-to-close, focus trap, and focus restore while the panel is open.
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // Focus the panel on open so keyboard/screen-reader users land inside.
    panelRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;

      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // Wrap focus within the panel.
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus to whatever was focused before opening.
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, onClose]);

  // Auto-select initial conversation when provided and conversations are loaded
  useEffect(() => {
    if (initialConversationId && conversations.length > 0 && !activeConversation) {
      const conv = conversations.find((c) => c.id === initialConversationId);
      if (conv) {
        setActiveConversation(conv);
        setView("chat");
      }
    }
  }, [initialConversationId, conversations, activeConversation]);

  // Update active conversation's online status when it changes
  useEffect(() => {
    if (activeConversation) {
      const updatedConv = conversations.find((c) => c.id === activeConversation.id);
      if (updatedConv && updatedConv.participant.isOnline !== activeConversation.participant.isOnline) {
        setActiveConversation(updatedConv);
      }
    }
  }, [activeConversation, conversations]);

  // Handle conversation selection
  const handleSelectConversation = useCallback((conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (conversation) {
      setActiveConversation(conversation);
      setView("chat");
    }
  }, [conversations]);

  // Handle back to list
  const handleBack = useCallback(() => {
    setView("list");
    setActiveConversation(null);
  }, []);

  // Handle send message
  const handleSendMessage = useCallback(async (content: string, mediaFile?: File, replyToId?: string) => {
    if (!activeConversation) return;

    let mediaUrl: string | undefined;
    let mediaType: string | undefined;

    if (mediaFile) {
      try {
        // Validate file type
        if (!mediaFile.type.startsWith("image/") && !mediaFile.type.startsWith("video/")) {
          toast.error("Only images and videos are supported");
          return;
        }

        // Validate file size (max 25MB for chat media)
        if (mediaFile.size > 25 * 1024 * 1024) {
          toast.error("File must be less than 25MB");
          return;
        }

        // Get presigned URL for upload
        const presignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploadType: "chat-media",
            conversationId: activeConversation.id,
            // The key only needs to be unique; a random id namespaces the media
            // (it doesn't have to equal the eventual message id).
            messageId: crypto.randomUUID(),
            filename: mediaFile.name,
            contentType: mediaFile.type,
            fileSize: mediaFile.size,
          }),
        });

        if (!presignRes.ok) {
          throw new Error("Failed to get upload URL");
        }

        const { uploadUrl, publicUrl } = await presignRes.json();

        // Upload file to R2
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          body: mediaFile,
          headers: { "Content-Type": mediaFile.type },
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload file");
        }

        mediaUrl = publicUrl;
        mediaType = mediaFile.type.startsWith("image/") ? "image" : "video";
      } catch (error) {
        console.error("Media upload error:", error);
        toast.error("Failed to upload media");
        return;
      }
    }

    // Don't send empty messages (unless there's media)
    if (!content.trim() && !mediaUrl) {
      return;
    }

    const success = await sendNewMessage(content, mediaUrl, mediaType, undefined, replyToId);
    if (!success) {
      toast.error("Failed to send message");
    }
    return success;
  }, [activeConversation, sendNewMessage]);

  // Handle send voice note (already uploaded; we have a URL + duration).
  const handleSendVoice = useCallback(async (url: string, duration: number, replyToId?: string) => {
    if (!activeConversation) return;
    stopTyping();
    const success = await sendNewMessage("", url, "audio", duration, replyToId);
    if (!success) {
      toast.error("Failed to send voice message");
    }
  }, [activeConversation, sendNewMessage, stopTyping]);

  // Send a GIF as an image message (not as URL-as-text).
  const handleSendGif = useCallback(async (gifUrl: string) => {
    if (!activeConversation) return;
    const success = await sendNewMessage("", gifUrl, "image", undefined, undefined);
    if (!success) {
      toast.error("Failed to send GIF");
    }
  }, [activeConversation, sendNewMessage]);

  // Handle toggling a reaction on a message.
  const handleToggleReaction = useCallback((messageId: string, emoji: string) => {
    toggleReaction(messageId, emoji);
  }, [toggleReaction]);

  // Handle edit message
  const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
    const success = await editExistingMessage(messageId, newContent);
    if (!success) {
      toast.error("Failed to edit message");
    }
  }, [editExistingMessage]);

  // Handle delete message
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    const success = await deleteExistingMessage(messageId);
    if (!success) {
      toast.error("Failed to delete message");
    }
  }, [deleteExistingMessage]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    startTyping();
  }, [startTyping]);

  // Stop typing when message is sent
  const handleSendWithTypingStop = useCallback(async (content: string, mediaFile?: File, replyToId?: string) => {
    stopTyping();
    return await handleSendMessage(content, mediaFile, replyToId);
  }, [stopTyping, handleSendMessage]);

  // Handle new chat
  const handleNewChat = useCallback(() => {
    setShowNewChatModal(true);
  }, []);

  // Handle conversation created from new chat modal
  const handleConversationCreated = useCallback((conversationId: string) => {
    refreshConversations();
    // Find and select the new conversation after refresh
    setTimeout(() => {
      handleSelectConversation(conversationId);
    }, 500);
  }, [refreshConversations, handleSelectConversation]);

  // Handle mark as read
  const handleMarkAsRead = useCallback((conversationId: string) => {
    toast.success("Marked as read");
    refreshConversations();
  }, [refreshConversations]);

  // Handle mute notifications
  const handleMuteNotifications = useCallback(
    async (conversationId: string) => {
      const conv = conversations.find((c) => c.id === conversationId);
      const next = !conv?.isMuted;
      const res = await setConversationMuted(conversationId, next);
      if (res.success) {
        toast.success(next ? "Notifications muted" : "Notifications unmuted");
        refreshConversations();
      } else {
        toast.error(res.error || "Failed to update notifications");
      }
    },
    [conversations, refreshConversations]
  );

  // Handle block user — confirm, then block the conversation's other user.
  const handleBlockUser = useCallback((conversationId: string) => {
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) return;
    setPendingBlockUserId(conv.participant.id);
    setShowBlockConfirm(true);
  }, [conversations]);

  const confirmBlockUser = useCallback(async () => {
    if (!pendingBlockUserId) return;
    setIsBlocking(true);
    const result = await blockUser(pendingBlockUserId);
    setIsBlocking(false);
    setShowBlockConfirm(false);
    setPendingBlockUserId(null);

    if (result.success) {
      toast.success("User blocked");
      // Drop them out of the active view and refresh the list.
      setView("list");
      setActiveConversation(null);
      refreshConversations();
    } else {
      toast.error(result.error || "Failed to block user");
    }
  }, [pendingBlockUserId, refreshConversations]);

  // Handle report user — open the shared report dialog for the other user.
  const handleReportUser = useCallback((conversationId: string) => {
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) return;
    setReportTarget({ id: conv.participant.id, username: conv.participant.username });
  }, [conversations]);

  // Handle delete conversation (from list or active chat)
  const handleDeleteConversation = useCallback((conversationId: string) => {
    setPendingDeleteId(conversationId);
    setShowDeleteConfirm(true);
  }, []);

  const confirmDeleteConversation = useCallback(async () => {
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    const result = await hideConversation(pendingDeleteId);
    setIsDeleting(false);
    setShowDeleteConfirm(false);

    if (result.success) {
      toast.success("Conversation deleted");
      if (activeConversation?.id === pendingDeleteId) {
        setView("list");
        setActiveConversation(null);
      }
      refreshConversations();
    } else {
      toast.error(result.error || "Failed to delete conversation");
    }
    setPendingDeleteId(null);
  }, [pendingDeleteId, activeConversation, refreshConversations]);

  // Convert messages to ActiveChat format
  const chatMessages: Message[] = messages.map((m) => ({
    id: m.id,
    content: m.content,
    mediaUrl: m.mediaUrl,
    mediaType: m.mediaType as "image" | "video" | "audio" | undefined,
    mediaDuration: m.mediaDuration,
    senderId: m.senderId,
    isRead: m.isRead,
    isEdited: m.isEdited,
    isDeleted: m.isDeleted,
    createdAt: m.createdAt,
    reactions: m.reactions,
    replyTo: m.replyTo,
  }));

  // The conversation-list pane. Reused in both mobile (single-pane) and
  // desktop (left column) layouts. `showClose` renders the X button in the
  // header — only the mobile/desktop list header needs it.
  const listPanel = (
    <div className="flex flex-col h-full min-h-0">
      {/* Header — editorial masthead */}
      <div className="flex items-center justify-between h-16 px-4 border-b-4 border-double border-vocl-border flex-shrink-0">
        <div className="flex flex-col leading-none">
          <span className="type-meta uppercase tracking-[0.2em] text-vocl-primary font-semibold">
            Direct
          </span>
          <h2 className="type-display text-xl font-bold text-foreground">Messages</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close messages"
          className="w-8 h-8 flex items-center justify-center rounded-full text-foreground/60 hover:text-foreground hover:bg-vocl-hover transition-all"
        >
          <IconX size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-vocl-border flex-shrink-0">
        <div className="relative">
          <IconSearch
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
          />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2.5 pl-10 pr-4 rounded-sm bg-vocl-surface-muted text-neutral-800 border border-vocl-border placeholder:text-neutral-500 focus:outline-none focus:border-vocl-primary transition-colors text-sm dark:bg-vocl-surface-dark dark:text-foreground dark:placeholder:text-foreground/40"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {conversationsLoading ? (
          <div className="flex items-center justify-center py-16">
            <IconLoader2 size={28} className="animate-spin text-vocl-primary" />
          </div>
        ) : conversationsError ? (
          <div className="text-center py-16 px-4">
            <p className="text-foreground/50 text-sm">{conversationsError}</p>
            <button
              onClick={refreshConversations}
              className="mt-4 px-4 py-2 rounded-xl bg-vocl-primary text-white text-sm"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {searchQuery.trim().length >= 2 && visibleMessageResults.length > 0 && (
              <div className="border-b border-vocl-border">
                <p className="px-4 pt-3 pb-1 type-meta uppercase tracking-widest text-foreground/45 font-semibold">
                  In messages
                </p>
                {visibleMessageResults.map((r) => {
                  const conv = conversations.find((c) => c.id === r.conversationId);
                  return (
                    <button
                      key={r.messageId}
                      onClick={() => handleSelectConversation(r.conversationId)}
                      className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-vocl-hover transition-colors"
                    >
                      <Avatar
                        src={conv?.participant.avatarUrl || ""}
                        username={conv?.participant.username || "?"}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {conv?.participant.username || "Conversation"}
                        </p>
                        <p className="text-sm text-foreground/60 truncate">{r.content}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <ConversationList
              conversations={conversations}
              searchQuery={searchQuery}
              onSelect={handleSelectConversation}
              onNewChat={handleNewChat}
              onDeleteConversation={handleDeleteConversation}
              onMarkAsRead={handleMarkAsRead}
              onMuteNotifications={handleMuteNotifications}
              onBlockUser={handleBlockUser}
              onReportUser={handleReportUser}
            />
          </>
        )}
      </div>
    </div>
  );

  // The open-thread pane. `showBack` controls the mobile back arrow (handled
  // inside ActiveChat via onBack). Reused in mobile single-pane and desktop
  // right column.
  const activeChatPanel = activeConversation ? (
    <ActiveChat
      conversationId={activeConversation.id}
      participant={activeConversation.participant as Participant}
      messages={chatMessages}
      currentUserId={currentUserId || ""}
      isTyping={isParticipantTyping}
      isLoading={messagesLoading}
      onLoadMore={loadMoreMessages}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      onBack={handleBack}
      onSendMessage={handleSendWithTypingStop}
      onSendVoice={handleSendVoice}
      onSendGif={handleSendGif}
      onEditMessage={handleEditMessage}
      onDeleteMessage={handleDeleteMessage}
      onToggleReaction={handleToggleReaction}
      onDeleteConversation={() => handleDeleteConversation(activeConversation.id)}
      onMarkAsRead={() => handleMarkAsRead(activeConversation.id)}
      onMuteNotifications={() => handleMuteNotifications(activeConversation.id)}
      onBlockUser={() => handleBlockUser(activeConversation.id)}
      onReportUser={() => handleReportUser(activeConversation.id)}
      onTyping={handleTyping}
    />
  ) : null;

  // Desktop empty state shown in the right pane when nothing is selected.
  const desktopEmptyState = (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-vocl-primary/10 flex items-center justify-center mb-4">
        <IconMessagePlus size={28} className="text-vocl-primary" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        Select a conversation
      </h3>
      <p className="text-sm text-foreground/50 mb-6 max-w-xs">
        Choose a conversation from the list to start chatting, or begin a new one.
      </p>
      <button
        onClick={handleNewChat}
        className="px-5 py-2.5 rounded-xl bg-vocl-primary text-white font-medium hover:bg-vocl-primary-hover transition-colors"
      >
        New message
      </button>
    </div>
  );

  return (
    <>
      {/* Backdrop for mobile only */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar - slides in with animation.
          Mobile/tablet: full-width (md:w-96) single pane driven by `view`.
          Desktop (lg+): wider panel (680px) showing list + thread side-by-side. */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Messages"
        tabIndex={-1}
        className="fixed top-0 right-0 bottom-0 w-full md:w-96 lg:w-[680px] bg-background border-l border-vocl-border z-50 flex flex-col lg:flex-row animate-slide-in-right focus:outline-none"
      >
        {/* Mobile / tablet single-pane stack (hidden on desktop) */}
        <div className="flex flex-col h-full w-full lg:hidden">
          {view === "list" ? listPanel : activeChatPanel}
        </div>

        {/* Desktop two-pane layout (hidden below lg) */}
        <div className="hidden lg:flex w-[300px] flex-shrink-0 h-full">
          {listPanel}
        </div>
        <div className="hidden lg:flex flex-1 min-w-0 h-full border-l border-vocl-border">
          {activeChatPanel ?? desktopEmptyState}
        </div>
      </aside>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onConversationCreated={handleConversationCreated}
        currentUserId={currentUserId}
      />

      {/* Delete Conversation Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setPendingDeleteId(null);
        }}
        onConfirm={confirmDeleteConversation}
        title="Delete Conversation"
        message="This will remove the conversation from your list. The other person will still be able to see it."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Block User Confirmation */}
      <ConfirmDialog
        isOpen={showBlockConfirm}
        onClose={() => {
          setShowBlockConfirm(false);
          setPendingBlockUserId(null);
        }}
        onConfirm={confirmBlockUser}
        title="Block User"
        message="They won't be able to message you or see your content, and you won't see theirs. You can unblock them later from their profile."
        confirmText="Block"
        cancelText="Cancel"
        variant="danger"
        isLoading={isBlocking}
      />

      {/* Report User Dialog */}
      <UserReportDialog
        isOpen={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        userId={reportTarget?.id || ""}
        username={reportTarget?.username || ""}
      />
    </>
  );
}
