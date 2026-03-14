"use client";

import { useState, useEffect, useCallback } from "react";
import { IconX, IconSearch, IconLoader2 } from "@tabler/icons-react";
import { ConversationList, type Conversation } from "./ConversationList";
import { ActiveChat, type Message, type Participant } from "./ActiveChat";
import { NewChatModal } from "./NewChatModal";
import { useChat, useMessages } from "@/hooks/useChat";
import { useTypingPresence } from "@/hooks/useTypingPresence";
import { useAuth } from "@/hooks/useAuth";
import { useIsOnline } from "@/hooks/useOnlineStatus";
import { toast, ConfirmDialog } from "@/components/ui";
import { hideConversation } from "@/actions/messages";

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  initialConversationId?: string | null;
}

export function ChatSidebar({ isOpen, onClose, currentUserId, initialConversationId }: ChatSidebarProps) {
  const [view, setView] = useState<"list" | "chat">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Use messages hook for active conversation
  const {
    messages,
    isLoading: messagesLoading,
    sendNewMessage,
    editExistingMessage,
    deleteExistingMessage,
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
  const handleSendMessage = useCallback(async (content: string, mediaFile?: File) => {
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
            filename: mediaFile.name,
            contentType: mediaFile.type,
            folder: `messages/${activeConversation.id}`,
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

    const success = await sendNewMessage(content, mediaUrl, mediaType);
    if (!success) {
      toast.error("Failed to send message");
    }
  }, [activeConversation, sendNewMessage]);

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
  const handleSendWithTypingStop = useCallback(async (content: string, mediaFile?: File) => {
    stopTyping();
    await handleSendMessage(content, mediaFile);
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
  const handleMuteNotifications = useCallback((conversationId: string) => {
    toast.success("Notifications muted");
  }, []);

  // Handle block user
  const handleBlockUser = useCallback((conversationId: string) => {
    toast.info("Block user coming soon");
  }, []);

  // Handle report user
  const handleReportUser = useCallback((conversationId: string) => {
    toast.info("Report user coming soon");
  }, []);

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
    senderId: m.senderId,
    isRead: m.isRead,
    isEdited: m.isEdited,
    isDeleted: m.isDeleted,
    createdAt: m.createdAt,
  }));

  return (
    <>
      {/* Backdrop for mobile only */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar - slides in/out with transition */}
      <aside
        className={`fixed top-0 right-0 bottom-0 w-full md:w-96 bg-background border-l border-white/5 z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none"
        }`}
      >
        {view === "list" ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-white/5">
              <h2 className="font-semibold text-foreground">Messages</h2>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full text-foreground/60 hover:text-foreground hover:bg-white/5 transition-all"
              >
                <IconX size={20} />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-white/5">
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
                  className="w-full py-2.5 pl-10 pr-4 rounded-xl bg-vocl-surface-dark border border-white/5 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-vocl-accent transition-colors text-sm"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {conversationsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <IconLoader2 size={28} className="animate-spin text-vocl-accent" />
                </div>
              ) : conversationsError ? (
                <div className="text-center py-16 px-4">
                  <p className="text-foreground/50 text-sm">{conversationsError}</p>
                  <button
                    onClick={refreshConversations}
                    className="mt-4 px-4 py-2 rounded-xl bg-vocl-accent text-white text-sm"
                  >
                    Try again
                  </button>
                </div>
              ) : (
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
              )}
            </div>
          </>
        ) : activeConversation ? (
          <ActiveChat
            conversationId={activeConversation.id}
            participant={activeConversation.participant as Participant}
            messages={chatMessages}
            currentUserId={currentUserId || ""}
            isTyping={isParticipantTyping}
            isLoading={messagesLoading}
            onBack={handleBack}
            onSendMessage={handleSendWithTypingStop}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onDeleteConversation={() => handleDeleteConversation(activeConversation.id)}
            onMarkAsRead={() => handleMarkAsRead(activeConversation.id)}
            onMuteNotifications={() => handleMuteNotifications(activeConversation.id)}
            onBlockUser={() => handleBlockUser(activeConversation.id)}
            onReportUser={() => handleReportUser(activeConversation.id)}
            onTyping={handleTyping}
          />
        ) : null}
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
    </>
  );
}
