'use client';

import { LoadingSpinner } from './LoadingSpinner';

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = 'Loading...' }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-neutral-400">{message}</p>
    </div>
  );
}

export function FeedPageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-12 h-12 rounded-full bg-vocl-accent/20 flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
      <p className="text-sm text-neutral-400">Loading your feed...</p>
    </div>
  );
}

export function ProfilePageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-12 h-12 rounded-full bg-vocl-accent/20 flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
      <p className="text-sm text-neutral-400">Loading profile...</p>
    </div>
  );
}

export function ChatPageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-3">
      <LoadingSpinner size="md" />
      <p className="text-xs text-neutral-500">Loading messages...</p>
    </div>
  );
}
