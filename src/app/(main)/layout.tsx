"use client";

import { useState } from "react";
import { MainNav, BottomNav, LeftSidebar } from "@/components/layout";
import { ChatSidebar } from "@/components/chat";
import { CreatePostFAB } from "@/components/Post/create";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { ErrorBoundary } from "@/components/ui";
import { IconMessageOff, IconX } from "@tabler/icons-react";

// Chat-specific error fallback
function ChatErrorFallback({ onClose }: { onClose: () => void }) {
  return (
    <aside className="fixed top-0 right-0 bottom-0 w-full md:w-96 bg-background border-l border-white/5 z-50 flex flex-col">
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/5">
        <h2 className="font-semibold text-foreground">Messages</h2>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full text-foreground/60 hover:text-foreground hover:bg-white/5 transition-all"
          aria-label="Close messages"
        >
          <IconX size={20} />
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-vocl-like/10 flex items-center justify-center mb-4">
          <IconMessageOff size={32} className="text-vocl-like" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Chat unavailable
        </h3>
        <p className="text-sm text-foreground/50 mb-4">
          Something went wrong loading messages. Please try again later.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-vocl-accent text-white rounded-xl hover:bg-vocl-accent-hover transition-colors"
        >
          Reload page
        </button>
      </div>
    </aside>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { profile } = useAuth();
  const { totalUnread } = useChat(profile?.id);

  const toggleChat = () => setIsChatOpen(!isChatOpen);

  return (
    <div className="min-h-screen bg-background">
      {/* Left Sidebar (Desktop) */}
      <LeftSidebar
        username={profile?.username}
        avatarUrl={profile?.avatarUrl}
        notificationCount={0}
        messageCount={totalUnread}
        onChatToggle={toggleChat}
      />

      {/* Top Navigation (Mobile) */}
      <MainNav
        username={profile?.username}
        avatarUrl={profile?.avatarUrl}
      />

      {/* Main Content */}
      <main
        id="main-content"
        className="pt-14 pb-20 md:pt-0 md:pb-8 md:pl-52 lg:pl-56"
        tabIndex={-1}
      >
        <div className="max-w-2xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <BottomNav
        notificationCount={0}
        messageCount={totalUnread}
        onChatToggle={toggleChat}
      />

      {/* Chat Sidebar */}
      {isChatOpen && (
        <ErrorBoundary fallback={<ChatErrorFallback onClose={() => setIsChatOpen(false)} />}>
          <ChatSidebar
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            currentUserId={profile?.id}
          />
        </ErrorBoundary>
      )}

      {/* Create Post FAB */}
      <CreatePostFAB />
    </div>
  );
}
