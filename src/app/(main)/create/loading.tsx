import { Skeleton } from '@/components/ui';

export default function CreateLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Post type selector */}
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-24 rounded-xl" />
        ))}
      </div>

      {/* Editor area */}
      <div className="bg-vocl-surface-dark rounded-2xl p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
        <div className="flex justify-end gap-2">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
