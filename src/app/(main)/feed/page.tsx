import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getFeedPosts } from "@/actions/posts";
import { hasAcceptedPromise } from "@/actions/account";
import { getUserPendingReports } from "@/actions/moderation";
import FeedClient from "./FeedClient";

export const metadata: Metadata = {
  title: "Feed",
  description: "Your personalised feed of posts from the people you follow.",
};

export default async function FeedPage() {
  // Fetch initial data server-side in parallel - no client waterfall
  const [feedResult, promiseResult, reportsResult, cookieStore] = await Promise.all([
    getFeedPosts({ limit: 20, offset: 0, sortBy: "chronological" }),
    hasAcceptedPromise(),
    getUserPendingReports(),
    cookies(),
  ]);

  // Layout preference lives in a cookie so the server renders the right
  // layout on first paint (no reader→front-page flip after hydration).
  const layoutCookie = cookieStore.get("feedLayout")?.value;
  const initialLayout =
    layoutCookie === "reader" || layoutCookie === "frontpage" ? layoutCookie : null;

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
      initialLayout={initialLayout}
    />
  );
}
