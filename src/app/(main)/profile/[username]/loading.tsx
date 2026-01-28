import { ProfileSkeleton, FeedSkeleton } from '@/components/ui';

export default function ProfileLoading() {
  return (
    <div>
      <ProfileSkeleton />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <FeedSkeleton count={3} />
      </div>
    </div>
  );
}
