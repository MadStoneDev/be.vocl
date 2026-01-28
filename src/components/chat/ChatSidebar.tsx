"use client";

import { useState, useEffect, useCallback } from "react";
import { IconX, IconSearch, IconLoader2 } from "@tabler/icons-react";
import { ConversationList, type Conversation } from "./ConversationList";
import { ActiveChat, type Message, type Participant } from "./ActiveChat";

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

// Demo data for now - will be replaced with real data from server actions
const demoConversations: Conversation[] = [
  {
    id: "conv-1",
    participant: {
      id: "user-1",
      username: "creativemind",
      avatarUrl: "https://picsum.photos/seed/user1/200",
      isOnline: true,
    },
    lastMessage: {
      content: "That sounds amazing! Let me know when you're free",
      senderId: "user-1",
      createdAt: "2m ago",
      isRead: false,
    },
    unreadCount: 2,
  },
  {
    id: "conv-2",
    participant: {
      id: "user-2",
      username: "artlover",
      avatarUrl: "https://picsum.photos/seed/user2/200",
      isOnline: false,
    },
    lastMessage: {
      content: "Thanks for sharing!",
      senderId: "current-user",
      createdAt: "1h ago",
      isRead: true,
    },
    unreadCount: 0,
  },
  {
    id: "conv-3",
    participant: {
      id: "user-3",
      username: "photographer",
      avatarUrl: "https://picsum.photos/seed/user3/200",
      isOnline: true,
    },
    lastMessage: {
      content: "Check out my new collection when you get a chance",
      senderId: "user-3",
      createdAt: "3h ago",
      isRead: true,
    },
    unreadCount: 0,
  },
];

const demoMessages: Record<string, Message[]> = {
  "conv-1": [
    {
      id: "msg-1",
      content: "Hey! I saw your latest post, it was incredible!",
      senderId: "user-1",
      isRead: true,
      isEdited: false,
      isDeleted: false,
      createdAt: "10:30 AM",
    },
    {
      id: "msg-2",
      content: "Thank you so much! I spent a lot of time on it",
      senderId: "current-user",
      isRead: true,
      isEdited: false,
      isDeleted: false,
      createdAt: "10:32 AM",
    },
    {
      id: "msg-3",
      content: "Would you be interested in collaborating on a project?",
      senderId: "user-1",
      isRead: true,
      isEdited: false,
      isDeleted: false,
      createdAt: "10:35 AM",
    },
    {
      id: "msg-4",
      content: "That sounds amazing! Let me know when you're free",
      senderId: "user-1",
      isRead: false,
      isEdited: false,
      isDeleted: false,
      createdAt: "10:36 AM",
    },
  ],
  "conv-2": [
    {
      id: "msg-5",
      content: "Your art style is so unique!",
      senderId: "user-2",
      isRead: true,
      isEdited: false,
      isDeleted: false,
      createdAt: "Yesterday",
    },
    {
      id: "msg-6",
      content: "Thanks for sharing!",
      senderId: "current-user",
      isRead: true,
      isEdited: false,
      isDeleted: false,
      createdAt: "Yesterday",
    },
  ],
};

export function ChatSidebar({ isOpen, onClose, currentUserId = "current-user" }: ChatSidebarProps) {
  const [view, setView] = useState<"list" | "chat">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  // Load conversations
  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    setConversations(demoConversations);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen, loadConversations]);

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (conversation) {
      setActiveConversation(conversation);
      setMessages(demoMessages[conversationId] || []);
      setView("chat");

      // Mark as read
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        )
      );
    }
  };

  // Handle back to list
  const handleBack = () => {
    setView("list");
    setActiveConversation(null);
    setMessages([]);
  };

  // Handle send message
  const handleSendMessage = async (content: string, _mediaFile?: File) => {
    if (!activeConversation) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      content,
      senderId: currentUserId,
      isRead: false,
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, newMessage]);

    // Update last message in conversation list
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              lastMessage: {
                content,
                senderId: currentUserId,
                createdAt: "Just now",
                isRead: true,
              },
            }
          : c
      )
    );

    // Simulate typing response after a delay
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        // Could add auto-response here for demo
      }, 2000);
    }, 1000);
  };

  // Handle edit message
  const handleEditMessage = (messageId: string, newContent: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, content: newContent, isEdited: true } : m
      )
    );
  };

  // Handle delete message
  const handleDeleteMessage = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isDeleted: true } : m))
    );
  };

  // Handle typing indicator
  const handleTyping = () => {
    // Would send typing event to server
  };

  // Handle new chat
  const handleNewChat = () => {
    // Would open a user search modal
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className="fixed top-0 right-0 bottom-0 w-full md:w-96 bg-background border-l border-white/5 z-50 flex flex-col">
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
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <IconLoader2 size={28} className="animate-spin text-vocl-accent" />
                </div>
              ) : (
                <ConversationList
                  conversations={conversations}
                  searchQuery={searchQuery}
                  onSelect={handleSelectConversation}
                  onNewChat={handleNewChat}
                />
              )}
            </div>
          </>
        ) : activeConversation ? (
          <ActiveChat
            conversationId={activeConversation.id}
            participant={activeConversation.participant as Participant}
            messages={messages}
            currentUserId={currentUserId}
            isTyping={isTyping}
            onBack={handleBack}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onTyping={handleTyping}
          />
        ) : null}
      </aside>
    </>
  );
}
