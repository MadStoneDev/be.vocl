'use client';

import { IconRefresh } from '@tabler/icons-react';

export default function QueueError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center flex flex-col items-center">
      <p className="slug text-meta-dim mb-4">The wire is down</p>
      <h2 className="type-display text-ink mb-3 max-w-[18ch]">
        Queue unavailable.
      </h2>
      <p className="editorial-body text-meta max-w-[52ch] mb-6">
        We couldn&apos;t load your queue. Please try again.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:opacity-[0.88] text-white text-xs font-sans font-medium uppercase tracking-[0.16em] transition-opacity"
      >
        <IconRefresh className="w-4 h-4" />
        Reload queue
      </button>
    </div>
  );
}
