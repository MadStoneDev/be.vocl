import { NotificationSkeleton } from '@/components/ui';

export default function NotificationsLoading() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-0 bg-background/80 backdrop-blur-lg border-b border-white/5 px-4 py-4">
        <div className="h-7 w-32 bg-white/5 rounded animate-pulse" />
      </div>
      <div className="divide-y divide-white/5">
        {Array.from({ length: 8 }).map((_, i) => (
          <NotificationSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
