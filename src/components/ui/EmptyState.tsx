import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-neutral-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-neutral-400 max-w-sm mb-6">{description}</p>
      )}
      {action}
    </div>
  );
}

// Pre-built empty states
export function EmptyFeed() {
  return (
    <EmptyState
      icon={<span className="text-3xl">📭</span>}
      title="Your feed is empty"
      description="Follow some creators to see their posts here, or create your first post!"
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon={<span className="text-3xl">🔔</span>}
      title="No notifications yet"
      description="When someone interacts with your content, you'll see it here."
    />
  );
}

export function EmptyQueue() {
  return (
    <EmptyState
      icon={<span className="text-3xl">📋</span>}
      title="Queue is empty"
      description="Reblog posts to your queue to schedule them for later."
    />
  );
}

export function EmptyMessages() {
  return (
    <EmptyState
      icon={<span className="text-3xl">💬</span>}
      title="No messages yet"
      description="Start a conversation with someone you follow."
    />
  );
}

export function EmptySearch({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<span className="text-3xl">🔍</span>}
      title="No results found"
      description={`We couldn't find anything for "${query}". Try a different search term.`}
    />
  );
}

export function EmptyPosts() {
  return (
    <EmptyState
      icon={<span className="text-3xl">✨</span>}
      title="No posts yet"
      description="This user hasn't posted anything yet."
    />
  );
}
