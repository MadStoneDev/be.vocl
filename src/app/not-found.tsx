import Link from 'next/link';
import { IconHome, IconSearch } from '@tabler/icons-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-8xl mb-6">404</div>
        <h1 className="text-2xl font-bold text-foreground mb-3">
          Page not found
        </h1>
        <p className="text-neutral-400 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/feed"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-vocl-accent hover:bg-vocl-accent-hover text-white rounded-xl transition-colors"
          >
            <IconHome className="w-5 h-5" />
            Go to Feed
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 text-foreground rounded-xl transition-colors"
          >
            <IconSearch className="w-5 h-5" />
            Search
          </Link>
        </div>
      </div>
    </div>
  );
}
