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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <div className="text-center max-w-md">
        <span className="type-meta uppercase tracking-[0.25em] text-vocl-like font-semibold">
          be.vocl · Stop Press
        </span>
        <h1 className="type-display text-3xl font-bold text-foreground mt-2 leading-tight">
          Something went wrong
        </h1>
        <div className="my-5 border-t-4 border-double border-vocl-border" />
        <p className="type-body text-foreground/55 mb-6">
          We hit an unexpected error. Please try again or return to the front page.
        </p>
        {error.digest && (
          <p className="text-xs text-foreground/40 mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-vocl-primary hover:bg-vocl-primary-hover text-white rounded-sm type-meta uppercase tracking-widest font-semibold transition-colors"
          >
            <IconRefresh className="w-5 h-5" />
            Try again
          </button>
          <Link
            href="/feed"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-vocl-border hover:bg-vocl-hover text-foreground rounded-sm type-meta uppercase tracking-widest font-semibold transition-colors"
          >
            <IconHome className="w-5 h-5" />
            Front page
          </Link>
        </div>
      </div>
    </div>
  );
}
