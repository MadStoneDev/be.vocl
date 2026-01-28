'use client';

import Link from 'next/link';
import { IconRefresh, IconArrowLeft } from '@tabler/icons-react';

export default function ProfileError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">👤</div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Profile not available
      </h2>
      <p className="text-neutral-400 mb-6">
        This profile couldn&apos;t be loaded. It may be private or temporarily unavailable.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-vocl-accent hover:bg-vocl-accent-hover text-white rounded-xl transition-colors"
        >
          <IconRefresh className="w-4 h-4" />
          Try again
        </button>
        <Link
          href="/feed"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 text-foreground rounded-xl transition-colors"
        >
          <IconArrowLeft className="w-4 h-4" />
          Back to feed
        </Link>
      </div>
    </div>
  );
}
