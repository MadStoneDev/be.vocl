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
      <div className="text-5xl mb-4">🔔</div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Couldn&apos;t load notifications
      </h2>
      <p className="text-neutral-400 mb-6">
        We had trouble fetching your notifications. Please try again.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-vocl-accent hover:bg-vocl-accent-hover text-white rounded-xl transition-colors"
      >
        <IconRefresh className="w-4 h-4" />
        Refresh
      </button>
    </div>
  );
}
