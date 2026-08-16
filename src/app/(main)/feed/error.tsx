'use client';

import { IconRefresh } from '@tabler/icons-react';
import { isDeploymentSkew } from '@/lib/deploymentSkew';
import { DeploymentSkewNotice } from '@/components/ui/DeploymentSkewNotice';

export default function FeedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Stale-deployment errors surface here too when a feed action goes stale.
  if (isDeploymentSkew(error)) {
    return <DeploymentSkewNotice />;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">😵</div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Couldn&apos;t load your feed
      </h2>
      <p className="text-neutral-400 mb-6">
        Something went wrong while fetching posts. This might be a temporary issue.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-vocl-primary hover:bg-vocl-primary-hover text-white rounded-xl transition-colors"
      >
        <IconRefresh className="w-4 h-4" />
        Try again
      </button>
    </div>
  );
}
