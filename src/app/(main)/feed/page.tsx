"use client";

import { useState, useEffect, useCallback } from "react";
import { FeedTabs, FeedList, type FeedTab } from "@/components/feed";
import { PromiseBanner, FlaggedContentBanner } from "@/components/moderation";
import { getFeedPosts } from "@/actions/posts";
import { getPersonalizedFeed } from "@/actions/recommendations";
import { hasAcceptedPromise } from "@/actions/account";
import { getUserPendingReports } from "@/actions/moderation";

interface FeedPost {
  id: string;
  authorId: string;
  author: {
    username: string;
    avatarUrl: string;
  };
  timestamp: string;
  contentType: "text" | "image" | "video" | "audio" | "gallery";
  content: {
    text?: string;
    imageUrl?: string;
    urls?: string[];
    html?: string;
    plain?: string;
    url?: string;
    thumbnail_url?: string;
    album_art_url?: string;
    caption_html?: string;
  };
  stats: { comments: number; likes: number; reblogs: number };
  interactions: { hasCommented: boolean; hasLiked: boolean; hasReblogged: boolean };
  isSensitive?: boolean;
  tags?: Array<{ id: string; name: string }>;
}

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState<FeedTab>("chronological");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPromiseBanner, setShowPromiseBanner] = useState(false);
  const [showFlaggedBanner, setShowFlaggedBanner] = useState(false);

  // Check promise and report status
  useEffect(() => {
    const checkStatus = async () => {
      const [promiseResult, reportsResult] = await Promise.all([
        hasAcceptedPromise(),
        getUserPendingReports(),
      ]);

      if (promiseResult.success && !promiseResult.accepted) {
        setShowPromiseBanner(true);
      }

      if (reportsResult.success && reportsResult.hasPendingReports) {
        setShowFlaggedBanner(true);
      }
    };

    checkStatus();
  }, []);

  // Fetch posts
  const fetchPosts = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    // Use personalized feed for "For You" tab, regular feed for chronological
    const result = activeTab === "engagement"
      ? await getPersonalizedFeed({ limit: 20, offset })
      : await getFeedPosts({ limit: 20, offset, sortBy: activeTab });

    if (result.success && result.posts) {
      // Transform posts to FeedList format
      const transformedPosts: FeedPost[] = result.posts.map((post) => {
        // Determine content based on post type
        let content: FeedPost["content"] = {};
        const postContent = post.content as any;

        if (post.postType === "text") {
          content = {
            text: postContent?.plain || postContent?.html?.replace(/<[^>]*>/g, "") || "",
            html: postContent?.html,
          };
        } else if (post.postType === "image") {
          content = {
            imageUrl: postContent?.urls?.[0] || postContent?.url,
            caption_html: postContent?.caption_html,
          };
        } else if (post.postType === "gallery") {
          content = {
            urls: postContent?.urls,
            imageUrl: postContent?.urls?.[0],
            caption_html: postContent?.caption_html,
          };
        } else if (post.postType === "video") {
          content = {
            url: postContent?.url,
            thumbnail_url: postContent?.thumbnail_url,
            caption_html: postContent?.caption_html,
          };
        } else if (post.postType === "audio") {
          content = {
            url: postContent?.url,
            album_art_url: postContent?.album_art_url,
            caption_html: postContent?.caption_html,
          };
        }

        return {
          id: post.id,
          authorId: post.authorId,
          author: {
            username: post.author.username,
            avatarUrl: post.author.avatarUrl || "https://via.placeholder.com/100",
          },
          timestamp: post.createdAt,
          contentType: post.postType as FeedPost["contentType"],
          content,
          stats: {
            comments: post.commentCount,
            likes: post.likeCount,
            reblogs: post.reblogCount,
          },
          interactions: {
            hasCommented: post.hasCommented,
            hasLiked: post.hasLiked,
            hasReblogged: post.hasReblogged,
          },
          isSensitive: post.isSensitive,
          tags: post.tags,
        };
      });

      if (append) {
        setPosts((prev) => [...prev, ...transformedPosts]);
      } else {
        setPosts(transformedPosts);
      }
      setHasMore(result.hasMore || false);
    } else {
      setError(result.error || "Failed to load posts");
    }

    setIsLoading(false);
    setIsLoadingMore(false);
  }, [activeTab]);

  // Initial fetch
  useEffect(() => {
    fetchPosts(0, false);
  }, [fetchPosts]);

  // Posts are already sorted server-side
  // - Chronological: sorted by created_at desc
  // - For You: sorted by personalization score
  const sortedPosts = posts;

  // Transform for FeedList (it expects slightly different format)
  const feedListPosts = sortedPosts.map((post) => ({
    id: post.id,
    author: post.author,
    timestamp: post.timestamp,
    contentType: post.contentType,
    content: {
      text: post.content.text || post.content.html?.replace(/<[^>]*>/g, ""),
      imageUrl: post.content.imageUrl,
    },
    stats: post.stats,
    interactions: post.interactions,
    isSensitive: post.isSensitive,
    tags: post.tags,
  }));

  return (
    <div className="py-3 mx-auto max-w-sm">
      {/* Promise Banner - show until accepted */}
      {showPromiseBanner && (
        <PromiseBanner onAccepted={() => setShowPromiseBanner(false)} />
      )}

      {/* Flagged Content Banner - show if user has pending reports */}
      {showFlaggedBanner && <FlaggedContentBanner />}

      <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {error && !isLoading && (
        <div className="text-center py-8">
          <p className="text-foreground/50 mb-4">{error}</p>
          <button
            onClick={() => fetchPosts(0, false)}
            className="px-4 py-2 bg-vocl-accent text-white rounded-xl hover:bg-vocl-accent-hover transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      <FeedList
        posts={feedListPosts}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
      />

      {/* Load more button */}
      {!isLoading && !error && hasMore && posts.length > 0 && (
        <div className="flex justify-center py-6">
          <button
            onClick={() => fetchPosts(posts.length, true)}
            disabled={isLoadingMore}
            className="px-6 py-2 bg-white/5 text-foreground/70 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
