'use client';

import { useEffect } from 'react';
import { IconRefresh, IconHome } from '@tabler/icons-react';
import Link from 'next/link';

/**
 * Deployment skew: the browser tab is running an older (or newer) build than the
 * server, so a hashed Server Action ID no longer resolves ("Failed to find Server
 * Action …"). Nothing is actually broken — a full reload pulls the current bundle
 * whose action IDs match the running server.
 */
function isDeploymentSkew(error: Error & { digest?: string }): boolean {
  const haystack = `${error?.message ?? ''} ${error?.digest ?? ''}`;
  return (
    haystack.includes('Failed to find Server Action') ||
    haystack.includes('older or newer deployment')
  );
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const skew = isDeploymentSkew(error);

  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  // A full reload (not reset()) is required for skew — reset() re-renders the
  // same stale bundle and would just hit the error again.
  const hardReload = () => window.location.reload();

  if (skew) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
        <div className="text-center max-w-md">
          <span className="type-meta uppercase tracking-[0.25em] text-vocl-primary font-semibold">
            be.vocl · New edition
          </span>
          <h1 className="type-display text-3xl font-bold text-foreground mt-2 leading-tight">
            A fresh edition just dropped
          </h1>
          <div className="my-5 border-t-4 border-double border-vocl-border" />
          <p className="type-body text-foreground/55 mb-6">
            be.vocl was updated while this page was open, so that last action
            didn&apos;t go through. Reload to pick up the latest — you&apos;ll stay
            signed in and can try again.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={hardReload}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-vocl-primary hover:bg-vocl-primary-hover text-white rounded-sm type-meta uppercase tracking-widest font-semibold transition-colors"
            >
              <IconRefresh className="w-5 h-5" />
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }

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
