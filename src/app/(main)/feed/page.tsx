import { getFeedPosts } from "@/actions/posts";
import { hasAcceptedPromise } from "@/actions/account";
import { getUserPendingReports } from "@/actions/moderation";
import FeedClient from "./FeedClient";

export default async function FeedPage() {
  // Fetch initial data server-side in parallel - no client waterfall
  const [feedResult, promiseResult, reportsResult] = await Promise.all([
    getFeedPosts({ limit: 20, offset: 0, sortBy: "chronological" }),
    hasAcceptedPromise(),
    getUserPendingReports(),
  ]);

  const initialPosts = feedResult.success ? feedResult.posts || [] : [];
  const initialHasMore = feedResult.success ? feedResult.hasMore || false : false;
  const showPromiseBanner = promiseResult.success && !promiseResult.accepted;
  const showFlaggedBanner =
    reportsResult.success && reportsResult.hasPendingReports;

  return (
    <FeedClient
      initialPosts={initialPosts}
      initialHasMore={initialHasMore}
      showPromiseBanner={showPromiseBanner}
      showFlaggedBanner={showFlaggedBanner}
    />
  );
}
