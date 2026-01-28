import { type HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-white/5 rounded ${className}`}
      {...props}
    />
  );
}

export function PostSkeleton() {
  return (
    <div className="bg-vocl-surface-dark rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-6 px-4 py-3 border-t border-white/5">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div>
      {/* Banner */}
      <Skeleton className="w-full h-48 rounded-none" />

      {/* Profile info */}
      <div className="px-6 -mt-16 relative">
        <Skeleton className="w-32 h-32 rounded-full border-4 border-background" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-3/4 max-w-md" />
        </div>
      </div>
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex gap-2 p-2">
      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-48 rounded-xl" />
      </div>
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}
