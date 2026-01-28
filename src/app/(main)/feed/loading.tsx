import { FeedSkeleton } from '@/components/ui';

export default function FeedLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex gap-2 mb-6">
        <div className="h-10 w-32 bg-white/5 rounded-lg animate-pulse" />
        <div className="h-10 w-32 bg-white/5 rounded-lg animate-pulse" />
      </div>
      <FeedSkeleton count={4} />
    </div>
  );
}
