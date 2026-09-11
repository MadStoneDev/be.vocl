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
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <p className="slug text-meta-dim mb-4">Profile</p>
      <h2 className="type-display text-ink mb-3">This edition isn&apos;t available.</h2>
      <p className="editorial-body text-meta max-w-[52ch] mx-auto mb-6">
        This profile couldn&apos;t be loaded. It may be private or temporarily unavailable.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-accent hover:opacity-[0.88] text-white font-sans font-medium uppercase tracking-[0.16em] text-xs transition-opacity"
        >
          <IconRefresh className="w-4 h-4" />
          Try again
        </button>
        <Link
          href="/feed"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-foreground text-foreground font-sans font-medium uppercase tracking-[0.16em] text-xs hover:bg-vocl-hover transition-colors"
        >
          <IconArrowLeft className="w-4 h-4" />
          Back to feed
        </Link>
      </div>
    </div>
  );
}
