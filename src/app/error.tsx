'use client';

import { useEffect } from 'react';
import { IconAlertTriangle, IconRefresh, IconHome } from '@tabler/icons-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-vocl-like/10 flex items-center justify-center">
          <IconAlertTriangle className="w-10 h-10 text-vocl-like" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">
          Something went wrong
        </h1>
        <p className="text-neutral-400 mb-8">
          We encountered an unexpected error. Please try again or return to the feed.
        </p>
        {error.digest && (
          <p className="text-xs text-neutral-500 mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-vocl-accent hover:bg-vocl-accent-hover text-white rounded-xl transition-colors"
          >
            <IconRefresh className="w-5 h-5" />
            Try again
          </button>
          <Link
            href="/feed"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 text-foreground rounded-xl transition-colors"
          >
            <IconHome className="w-5 h-5" />
            Go to Feed
          </Link>
        </div>
      </div>
    </div>
  );
}
