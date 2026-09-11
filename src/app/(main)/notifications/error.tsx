'use client';

import { IconRefresh } from '@tabler/icons-react';

export default function NotificationsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <p className="kicker kicker-accent mb-3">Off the wire</p>
      <h2 className="type-display text-ink">Couldn&apos;t load notifications.</h2>
      <p className="editorial-body text-meta mt-3 mx-auto max-w-[46ch]">
        We had trouble fetching your notifications. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 bg-accent px-6 py-3 font-sans text-xs font-medium uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-[0.88]"
      >
        <IconRefresh className="w-4 h-4" />
        Refresh
      </button>
    </div>
  );
}
