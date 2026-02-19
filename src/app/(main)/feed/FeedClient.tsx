"use client";

import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { FeedTabs, FeedList, type FeedTab } from "@/components/feed";
import { PromiseBanner, FlaggedContentBanner } from "@/components/moderation";
import { getFeedPosts } from "@/actions/posts";
import { getPersonalizedFeed } from "@/actions/recommendations";
import type { VideoEmbedPlatform } from "@/types/database";

interface PostWithDetails {
  id: string;
  authorId: string;
  author: {
    username: string;
    displayName?: string | null;
    avatarUrl: string | null;
    role: number;
  };
  postType: string;
  content: any;
  isSensitive: boolean;
  isPinned: boolean;
  isOwn: boolean;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  reblogCount: number;
  hasLiked: boolean;
  hasCommented: boolean;
  hasReblogged: boolean;
  tags?: Array<{ id: string; name: string }>;
}

interface FeedClientProps {
  initialPosts: PostWithDetails[];
  initialHasMore: boolean;
  showPromiseBanner: boolean;
  showFlaggedBanner: boolean;
}

/** Transform server action post data into the shape FeedList expects */
function transformPost(post: PostWithDetails) {
  const postContent = post.content as any;
  let text: string | undefined;
  let html: string | undefined;
  let imageUrl: string | undefined;
  let imageUrls: string[] | undefined;
  let videoUrl: string | undefined;
  let videoThumbnailUrl: string | undefined;
  let embedUrl: string | undefined;
  let embedPlatform: VideoEmbedPlatform | undefined;
  let audioUrl: string | undefined;
  let albumArtUrl: string | undefined;
  let captionHtml: string | undefined;

  let linkPreviews: any[] | undefined;

  if (post.postType === "text") {
    text = postContent?.plain || postContent?.html?.replace(/<[^>]*>/g, "") || "";
    html = postContent?.html;
    linkPreviews = postContent?.link_previews;
  } else if (post.postType === "image") {
    imageUrl = postContent?.urls?.[0] || postContent?.url;
    captionHtml = postContent?.caption_html;
  } else if (post.postType === "gallery") {
    imageUrls = postContent?.urls;
    imageUrl = postContent?.urls?.[0];
    captionHtml = postContent?.caption_html;
  } else if (post.postType === "video") {
    videoUrl = postContent?.url;
    videoThumbnailUrl = postContent?.thumbnail_url;
    embedUrl = postContent?.embed_url;
    embedPlatform = postContent?.embed_platform;
    captionHtml = postContent?.caption_html;
  } else if (post.postType === "audio") {
    audioUrl = postContent?.url;
    albumArtUrl = postContent?.album_art_url;
    captionHtml = postContent?.caption_html;
  }

  return {
    id: post.id,
    author: {
      username: post.author.username,
      avatarUrl: post.author.avatarUrl || "",
      role: post.author.role,
    },
    authorId: post.authorId,
    timestamp: post.createdAt,
    contentType: post.postType as "text" | "image" | "video" | "audio" | "gallery",
    content: {
      text,
      html,
      imageUrl,
      imageUrls,
      videoUrl,
      videoThumbnailUrl,
      embedUrl,
      embedPlatform,
      audioUrl,
      albumArtUrl,
      captionHtml,
      linkPreviews,
    },
    rawContent: post.content,
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
    isOwn: post.isOwn,
    tags: post.tags,
  };
}

const POSTS_PER_PAGE = 20;

export default function FeedClient({
  initialPosts,
  initialHasMore,
  showPromiseBanner: initialShowPromise,
  showFlaggedBanner: initialShowFlagged,
}: FeedClientProps) {
  const [activeTab, setActiveTab] = useState<FeedTab>("chronological");
  const [showPromiseBanner, setShowPromiseBanner] = useState(initialShowPromise);
  const [showFlaggedBanner] = useState(initialShowFlagged);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["feed", activeTab],
    queryFn: async ({ pageParam = 0 }) => {
      const result =
        activeTab === "engagement"
          ? await getPersonalizedFeed({ limit: POSTS_PER_PAGE, offset: pageParam })
          : await getFeedPosts({ limit: POSTS_PER_PAGE, offset: pageParam, sortBy: activeTab });

      if (!result.success) {
        throw new Error(result.error || "Failed to load posts");
      }

      return {
        posts: result.posts || [],
        hasMore: result.hasMore || false,
        nextOffset: pageParam + POSTS_PER_PAGE,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextOffset : undefined,
    // Use SSR data as initial data for the chronological tab
    initialData:
      activeTab === "chronological"
        ? {
            pages: [
              {
                posts: initialPosts,
                hasMore: initialHasMore,
                nextOffset: POSTS_PER_PAGE,
              },
            ],
            pageParams: [0],
          }
        : undefined,
    staleTime: 2 * 60 * 1000, // 2 minutes before refetching
    refetchOnWindowFocus: false,
  });

  // Flatten all pages into a single list, transform once
  const feedListPosts = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) =>
      page.posts.map((post: PostWithDetails) => transformPost(post))
    );
  }, [data]);

  return (
    <div className="py-3 mx-auto max-w-xl">
      {/* Promise Banner - show until accepted */}
      {showPromiseBanner && (
        <PromiseBanner onAccepted={() => setShowPromiseBanner(false)} />
      )}

      {/* Flagged Content Banner - show if user has pending reports */}
      {showFlaggedBanner && <FlaggedContentBanner />}

      <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {isError && !isLoading && (
        <div className="text-center py-8">
          <p className="text-foreground/50 mb-4">
            {error instanceof Error ? error.message : "Failed to load posts"}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-vocl-accent text-white rounded-xl hover:bg-vocl-accent-hover transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      <FeedList
        posts={feedListPosts}
        isLoading={isLoading}
        isLoadingMore={isFetchingNextPage}
      />

      {/* Load more button */}
      {!isLoading && !isError && hasNextPage && feedListPosts.length > 0 && (
        <div className="flex justify-center py-6">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-6 py-2 bg-white/5 text-foreground/70 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {isFetchingNextPage ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
