"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { MainNav, BottomNav, LeftSidebar, CommandPalette, OPEN_CHAT_EVENT } from "@/components/layout";
import { KeyboardShortcuts } from "@/components/layout/KeyboardShortcuts";
import { ChatSidebar } from "@/components/chat";
import { ConversationUrlOpener } from "@/components/chat/ConversationUrlOpener";
import { CreatePostFAB } from "@/components/Post/create";
import { SecurityWarningModal } from "@/components/auth/SecurityWarningModal";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { useNotifications } from "@/hooks/useNotifications";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { checkOnboardingStatus } from "@/actions/profile";
import { ErrorBoundary } from "@/components/ui";
import { IconMessageOff, IconX } from "@tabler/icons-react";

// Chat-specific error fallback
function ChatErrorFallback({ onClose }: { onClose: () => void }) {
  return (
    <aside className="fixed top-0 right-0 bottom-0 w-full md:w-96 lg:w-[680px] bg-background border-l border-vocl-border z-50 flex flex-col">
      <div className="flex items-center justify-between h-16 px-4 border-b border-vocl-border">
        <h2 className="font-semibold text-foreground">Messages</h2>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full text-foreground/60 hover:text-foreground hover:bg-vocl-hover transition-all"
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
          className="px-4 py-2 bg-vocl-primary text-white rounded-xl hover:bg-vocl-primary-hover transition-colors"
        >
          Reload page
        </button>
      </div>
    </aside>
  );
}

/**
 * The authenticated app chrome: left sidebar, mobile nav, chat, FAB, command
 * palette, etc. Rendered only for logged-in users — the (main) server layout
 * gates this so logged-out visitors get a clean, chrome-free reading view.
 */
export function AppChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialConversationId, setInitialConversationId] = useState<string | null>(null);

  // All hooks run immediately - they return default/empty values while loading
  const { profile, user, isLoading: authLoading } = useAuth();
  const { totalUnread } = useChat(profile?.id);
  const { unreadCount: notificationCount } = useNotifications(profile?.id);

  // Track online presence
  useOnlineStatus(profile?.id, profile?.username);

  // Update page title with unread count
  useEffect(() => {
    const total = (notificationCount || 0) + (totalUnread || 0);
    document.title = total > 0 ? `(${total}) be.vocl` : "be.vocl";
  }, [notificationCount, totalUnread]);

  // Redirect banned users to account-status page
  useEffect(() => {
    if (authLoading || !profile) return;

    if (profile.lockStatus === "banned") {
      router.replace("/account-status");
    }
  }, [profile, authLoading, router]);

  // Check onboarding status - runs when auth state is known
  useEffect(() => {
    if (authLoading || !user) return;

    const checkOnboarding = async () => {
      try {
        const timeoutPromise = new Promise<{ success: false; isComplete: true }>((resolve) =>
          setTimeout(() => resolve({ success: false, isComplete: true }), 3000)
        );

        const result = await Promise.race([checkOnboardingStatus(), timeoutPromise]);

        if (result.success && !result.isComplete) {
          router.replace("/onboarding");
        }
      } catch (error) {
        console.error("Onboarding check failed:", error);
      }
    };

    checkOnboarding();
  }, [user, authLoading, router]);

  // Open chat sidebar in response to an openConversation event
  // (dispatched e.g. from a profile's Message action)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ conversationId: string }>).detail;
      if (!detail?.conversationId) return;
      setInitialConversationId(detail.conversationId);
      setIsChatOpen(true);
    };
    window.addEventListener("vocl:open-conversation", handler);
    return () => window.removeEventListener("vocl:open-conversation", handler);
  }, []);

  // Open the chat sidebar when the command palette (or anything) requests it.
  useEffect(() => {
    const handler = () => setIsChatOpen(true);
    window.addEventListener(OPEN_CHAT_EVENT, handler);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, handler);
  }, []);

  const toggleChat = () => setIsChatOpen(!isChatOpen);

  // Render everything immediately - components handle their own loading states
  // No blocking on auth - children render right away with their skeletons
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <ConversationUrlOpener />
      </Suspense>
      {/* Left Sidebar (Desktop) - shows skeleton for profile while loading */}
      <LeftSidebar
        username={profile?.username}
        avatarUrl={profile?.avatarUrl}
        notificationCount={notificationCount}
        messageCount={totalUnread}
        onChatToggle={toggleChat}
        isLoading={authLoading}
        role={profile?.role}
        collapsed={isChatOpen}
      />

      {/* Top Navigation (Mobile) */}
      <MainNav
        username={profile?.username}
        avatarUrl={profile?.avatarUrl}
        role={profile?.role}
      />

      {/* Main Content - renders children immediately */}
      <main
        id="main-content"
        className={`pt-12 pb-14 md:pt-0 md:pb-8 transition-all duration-300 ease-in-out ${
          isChatOpen ? "md:pl-16 md:pr-96 lg:pr-[680px]" : "md:pl-52 lg:pl-56"
        }`}
        tabIndex={-1}
      >
        <div className="max-w-2xl mx-auto sm:px-4 pb-4">
          {children}
        </div>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <BottomNav
        notificationCount={notificationCount}
        messageCount={totalUnread}
        onChatToggle={toggleChat}
      />

      {/* Chat Sidebar - only mount when open to avoid hook side effects blocking navigation */}
      {isChatOpen && (
        <ErrorBoundary fallback={<ChatErrorFallback onClose={() => setIsChatOpen(false)} />}>
          <ChatSidebar
            isOpen={isChatOpen}
            onClose={() => {
              setIsChatOpen(false);
              setInitialConversationId(null);
            }}
            currentUserId={profile?.id}
            initialConversationId={initialConversationId}
          />
        </ErrorBoundary>
      )}

      {/* Create Post FAB */}
      <CreatePostFAB />

      {/* Security Warning Modal - shown once after first login */}
      <SecurityWarningModal isAuthenticated={!!user && !authLoading} />

      {/* Command palette (Cmd/Ctrl+K) */}
      <CommandPalette username={profile?.username} onOpenChat={toggleChat} />

      {/* Global keyboard shortcuts */}
      <KeyboardShortcuts />
    </div>
  );
}
