import Link from 'next/link';
import { IconHome, IconSearch } from '@tabler/icons-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <div className="text-center max-w-md">
        <span className="type-meta uppercase tracking-[0.25em] text-vocl-primary font-semibold">
          be.vocl · Late Edition
        </span>
        <div className="type-display text-7xl sm:text-8xl font-bold text-foreground mt-2 leading-none">
          404
        </div>
        <div className="my-5 border-t-4 border-double border-vocl-border" />
        <h1 className="type-display text-2xl font-bold text-foreground mb-3">
          This story was never filed
        </h1>
        <p className="type-body text-foreground/55 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been pulled from print.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/feed"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-vocl-primary hover:bg-vocl-primary-hover text-white rounded-sm type-meta uppercase tracking-widest font-semibold transition-colors"
          >
            <IconHome className="w-5 h-5" />
            Front page
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-vocl-border hover:bg-vocl-hover text-foreground rounded-sm type-meta uppercase tracking-widest font-semibold transition-colors"
          >
            <IconSearch className="w-5 h-5" />
            Search
          </Link>
        </div>
      </div>
    </div>
  );
}
