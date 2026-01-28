"use client";

import { useState } from "react";
import { MainNav, BottomNav } from "@/components/layout";
import { ChatSidebar } from "@/components/chat";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const toggleChat = () => setIsChatOpen(!isChatOpen);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <MainNav
        notificationCount={0}
        messageCount={0}
        onChatToggle={toggleChat}
      />

      {/* Main Content */}
      <main id="main-content" className="pt-16 pb-20 md:pb-8" tabIndex={-1}>
        <div className="max-w-2xl mx-auto px-4">
          {children}
        </div>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <BottomNav
        notificationCount={0}
        messageCount={0}
        onChatToggle={toggleChat}
      />

      {/* Chat Sidebar */}
      <ChatSidebar isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
