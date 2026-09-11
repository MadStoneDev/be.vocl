import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

interface EmptyStateProps2 extends EmptyStateProps {
  /** Small uppercase kicker above the headline (e.g. "Nothing in the mailbag"). */
  kicker?: string;
}

/**
 * Editorial empty state (design/broadsheet-foundation): a mono kicker, a Gloock
 * headline and a serif standfirst — the paper telling you a section is quiet,
 * not an icon-in-a-circle. `icon` is accepted for back-compat but no longer
 * rendered as a coloured disc.
 */
export function EmptyState({ kicker, title, description, action }: EmptyStateProps2) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {kicker && <p className="slug text-meta-dim mb-4">{kicker}</p>}
      <h3 className="type-display text-ink mb-3 max-w-[18ch]">{title}</h3>
      {description && (
        <p className="editorial-body text-meta max-w-[52ch] mb-6">{description}</p>
      )}
      {action}
    </div>
  );
}

// Pre-built empty states — editorial voice, as on the artboards.
export function EmptyFeed() {
  return (
    <EmptyState
      kicker="Nothing on the wire yet"
      title="A blank front page."
      description="Follow some voices or open a desk, and tonight's edition fills itself."
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      kicker="Notifications"
      title="No word from the wire."
      description="Likes, replies and voice reactions get filed here as they come in."
    />
  );
}

export function EmptyQueue() {
  return (
    <EmptyState
      kicker="Nothing set for tomorrow's edition"
      title="The spike is empty."
      description="Add posts with “Add to queue” when you write or reblog. They go out on your schedule."
    />
  );
}

export function EmptyMessages() {
  return (
    <EmptyState
      kicker="Messages"
      title="Nothing in the mailbag."
      description="When someone writes to you it lands here, and nowhere else."
    />
  );
}

export function EmptySearch({ query }: { query: string }) {
  return (
    <EmptyState
      kicker="Search"
      title="No matches in this edition."
      description={`Nothing filed for "${query}". Try a #section instead, or read the index on The Newsstand.`}
    />
  );
}

export function EmptyPosts() {
  return (
    <EmptyState
      kicker="Posts"
      title="Nothing in print yet."
      description="This columnist hasn't filed anything the public can read."
    />
  );
}
