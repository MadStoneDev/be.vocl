'use client';

import { IconRefresh } from '@tabler/icons-react';

export default function QueueError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">📋</div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Queue unavailable
      </h2>
      <p className="text-neutral-400 mb-6">
        We couldn&apos;t load your queue. Please try again.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-vocl-accent hover:bg-vocl-accent-hover text-white rounded-xl transition-colors"
      >
        <IconRefresh className="w-4 h-4" />
        Reload queue
      </button>
    </div>
  );
}
