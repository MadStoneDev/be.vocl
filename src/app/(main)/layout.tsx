"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MainNav, BottomNav, LeftSidebar } from "@/components/layout";
import { ChatSidebar } from "@/components/chat";
import { CreatePostFAB } from "@/components/Post/create";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { useNotifications } from "@/hooks/useNotifications";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { checkOnboardingStatus } from "@/actions/profile";
import { ErrorBoundary } from "@/components/ui";
import { IconMessageOff, IconX, IconLoader2 } from "@tabler/icons-react";

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
  const router = useRouter();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const { profile, isLoading: authLoading, user } = useAuth();
  const { totalUnread } = useChat(profile?.id);
  const { unreadCount: notificationCount } = useNotifications(profile?.id);

  // Track online presence globally
  useOnlineStatus(profile?.id, profile?.username);

  // Check onboarding status - runs when auth state is known
  useEffect(() => {
    // Wait until auth loading is complete
    if (authLoading) return;

    // If no user, no onboarding check needed
    if (!user) {
      setOnboardingChecked(true);
      return;
    }

    const checkOnboarding = async () => {
      try {
        const timeoutPromise = new Promise<{ success: false; isComplete: true }>((resolve) =>
          setTimeout(() => resolve({ success: false, isComplete: true }), 3000)
        );

        const result = await Promise.race([checkOnboardingStatus(), timeoutPromise]);

        if (result.success && !result.isComplete) {
          router.replace("/onboarding");
          return;
        }
      } catch (error) {
        console.error("Onboarding check failed:", error);
      }

      setOnboardingChecked(true);
    };

    checkOnboarding();
  }, [user, authLoading, router]);

  // Fallback: force onboardingChecked after timeout to prevent infinite spinner
  useEffect(() => {
    if (onboardingChecked) return;

    const fallbackTimer = setTimeout(() => {
      console.warn("Onboarding check timed out, proceeding anyway");
      setOnboardingChecked(true);
    }, 5000);

    return () => clearTimeout(fallbackTimer);
  }, [onboardingChecked]);

  const toggleChat = () => setIsChatOpen(!isChatOpen);

  // Show loading while auth is loading OR while checking onboarding (but not forever)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Left Sidebar (Desktop) */}
      <LeftSidebar
        username={profile?.username}
        avatarUrl={profile?.avatarUrl}
        notificationCount={notificationCount}
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
        notificationCount={notificationCount}
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
