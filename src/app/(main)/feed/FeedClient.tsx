"use client";

import { useMemo, useState, useEffect, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useInfiniteQuery } from "@tanstack/react-query";
import { FeedTabs, FeedList, WhoToFollow, type FeedTab } from "@/components/feed";

// SSR stays on so the broadsheet HTML is in the first paint (no blank frame
// while the chunk loads); the skeleton only shows on a client-side switch.
const FrontPageGrid = dynamic(
  () => import("@/components/feed/frontpage").then((m) => m.FrontPageGrid),
  { loading: () => <FeedSkeleton count={3} /> },
);
import { PromiseBanner, FlaggedContentBanner } from "@/components/moderation";
import { PullToRefresh, FeedSkeleton } from "@/components/ui";
import { OnThisDayCard } from "@/components/feed/OnThisDayCard";
import { getFeedPosts } from "@/actions/posts";
import { getPersonalizedFeed, getTrendingFeed } from "@/actions/recommendations";
import { updateFeedLayout } from "@/actions/profile";
import { useAuth } from "@/hooks/useAuth";
import { useSwipe } from "@/hooks/useSwipe";
import type { VideoEmbedPlatform, PostType } from "@/types/database";

// Tab order for swipe navigation (matches FeedTabs display order).
const TAB_ORDER: FeedTab[] = ["chronological", "engagement", "trending"];

// Viewport width as an external store: null during SSR + hydration (so the
// first client render matches the server HTML and CSS picks the visible
// layout), the real value immediately after.
const WIDE_QUERY = "(min-width: 1024px)";
function subscribeWide(onChange: () => void) {
  const mql = window.matchMedia(WIDE_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}
const getWideSnapshot = () => window.matchMedia(WIDE_QUERY).matches;
const getServerWideSnapshot = () => null;

function persistLayoutCookie(next: "reader" | "frontpage") {
  document.cookie = `feedLayout=${next}; path=/; max-age=31536000; samesite=lax`;
}

interface PostWithDetails {
  id: string;
  authorId: string;
  author: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: number;
  };
  postType: PostType;
  content: any;
  isSensitive: boolean;
  excludeFromPublic?: boolean;
  isPinned: boolean;
  isOwn: boolean;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  reblogCount: number;
  voiceReactionCount?: number;
  hasLiked: boolean;
  hasCommented: boolean;
  hasReblogged: boolean;
  hasBookmarked?: boolean;
  isFollowingAuthor?: boolean;
  tags?: Array<{ id: string; name: string }>;
  isReblog?: boolean;
  reblogCommentHtml?: string | null;
  originalAuthor?: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: number;
  } | null;
  rebloggedFromAuthor?: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: number;
  } | null;
  threadId?: string | null;
  threadPosition?: number | null;
  threadLength?: number;
}

interface FeedClientProps {
  initialPosts: PostWithDetails[];
  initialHasMore: boolean;
  showPromiseBanner: boolean;
  showFlaggedBanner: boolean;
  /** Layout preference from the feedLayout cookie, so SSR matches first paint. */
  initialLayout: "reader" | "frontpage" | null;
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
  let spotifyData: any;
  let captionHtml: string | undefined;
  let transcript: string | undefined;
  let isVoiceNote: boolean | undefined;
  let isEssay: boolean | undefined;
  let essayTitle: string | undefined;
  let readingTimeMinutes: number | undefined;

  let linkPreviews: any[] | undefined;

  if (post.postType === "text") {
    text = postContent?.plain || postContent?.html?.replace(/<[^>]*>/g, "") || "";
    html = postContent?.html;
    linkPreviews = postContent?.link_previews;
    isEssay = !!postContent?.is_essay;
    essayTitle = postContent?.essay_title;
    readingTimeMinutes = postContent?.reading_time_minutes;
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
    spotifyData = postContent?.spotify_data;
    transcript = postContent?.transcript;
    isVoiceNote = !!postContent?.is_voice_note;
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
      spotifyData,
      captionHtml,
      transcript,
      isVoiceNote,
      isEssay,
      essayTitle,
      readingTimeMinutes,
      linkPreviews,
    },
    rawContent: post.content,
    stats: {
      comments: post.commentCount,
      likes: post.likeCount,
      reblogs: post.reblogCount,
      voiceReactions: post.voiceReactionCount,
    },
    interactions: {
      hasCommented: post.hasCommented,
      hasLiked: post.hasLiked,
      hasReblogged: post.hasReblogged,
    },
    isSensitive: post.isSensitive,
    excludeFromPublic: post.excludeFromPublic,
    isOwn: post.isOwn,
    isFollowingAuthor: post.isFollowingAuthor || false,
    isBookmarked: post.hasBookmarked || false,
    tags: post.tags,
    isReblog: post.isReblog || false,
    reblogCommentHtml: post.reblogCommentHtml || null,
    originalAuthor: post.originalAuthor || null,
    rebloggedFromAuthor: post.rebloggedFromAuthor || null,
    threadId: post.threadId || null,
    threadPosition: post.threadPosition || null,
    threadLength: post.threadLength,
  };
}

const POSTS_PER_PAGE = 20;

export default function FeedClient({
  initialPosts,
  initialHasMore,
  showPromiseBanner: initialShowPromise,
  showFlaggedBanner: initialShowFlagged,
  initialLayout,
}: FeedClientProps) {
  const [activeTab, setActiveTab] = useState<FeedTab>("chronological");
  const [showPromiseBanner, setShowPromiseBanner] = useState(initialShowPromise);
  const [showFlaggedBanner] = useState(initialShowFlagged);

  // Feed layout: Reader (single column) vs Front Page (broadsheet, wide screens only).
  // Precedence: explicit choice (cookie / localStorage / toggle) > profile
  // preference > Front Page default. The cookie (via initialLayout) lets SSR
  // render the chosen layout outright — no reader→front-page flip after
  // hydration; while isWide is still null, CSS breakpoints pick the visible one.
  const [explicitLayout, setExplicitLayout] = useState<"reader" | "frontpage" | null>(
    initialLayout,
  );
  const { profile } = useAuth();
  const layout = explicitLayout ?? profile?.feedLayout ?? "frontpage";
  const isWide = useSyncExternalStore(subscribeWide, getWideSnapshot, getServerWideSnapshot);

  // Migration: pre-cookie users kept the preference only in localStorage, which
  // can't be read until after hydration (SSR HTML must match first paint).
  useEffect(() => {
    if (initialLayout !== null) return;
    try {
      const stored = localStorage.getItem("feedLayout");
      if (stored === "frontpage" || stored === "reader") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time post-hydration read of an external store
        setExplicitLayout(stored);
        persistLayoutCookie(stored);
      }
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }, [initialLayout]);

  const changeLayout = (next: "reader" | "frontpage") => {
    setExplicitLayout(next);
    persistLayoutCookie(next);
    try {
      localStorage.setItem("feedLayout", next);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
    // Persist to profile (fire-and-forget)
    void updateFeedLayout(next);
  };

  // Swipe between feed tabs (Latest ↔ For You ↔ Trending) on touch devices.
  const goTab = (dir: 1 | -1) => {
    const i = TAB_ORDER.indexOf(activeTab);
    const next = TAB_ORDER[Math.min(TAB_ORDER.length - 1, Math.max(0, i + dir))];
    if (next !== activeTab) setActiveTab(next);
  };
  const feedSwipe = useSwipe({
    onSwipeLeft: () => goTab(1),
    onSwipeRight: () => goTab(-1),
  });

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
          : activeTab === "trending"
            ? await getTrendingFeed({ limit: POSTS_PER_PAGE, offset: pageParam })
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
      page.posts.map((post) => transformPost(post as PostWithDetails))
    );
  }, [data]);

  return (
    <PullToRefresh onRefresh={refetch}>
    <div className="py-1 sm:py-3 mx-auto max-w-5xl">
      {/* Promise Banner - show until accepted */}
      {showPromiseBanner && (
        <PromiseBanner onAccepted={() => setShowPromiseBanner(false)} />
      )}

      {/* Flagged Content Banner - show if user has pending reports */}
      {showFlaggedBanner && <FlaggedContentBanner />}

      {/* Toggle is always in the markup; FeedTabs hides it below lg via CSS,
          so it's in the SSR HTML and doesn't pop in (squeezing the sort tabs)
          after hydration. */}
      <FeedTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        layout={layout}
        onLayoutChange={changeLayout}
        showLayoutToggle
      />

      <OnThisDayCard />

      {/* WhoToFollow is rendered inside FeedList for "For You" tab */}

      {isError && !isLoading && (
        <div className="text-center py-8">
          <p className="text-foreground/50 mb-4">
            {error instanceof Error ? error.message : "Failed to load posts"}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-vocl-primary text-white rounded-xl hover:bg-vocl-primary-hover transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      <div {...feedSwipe}>
        {layout === "frontpage" && isWide === null ? (
          // SSR + first paint: the server can't know the viewport, so render
          // both layouts and let the lg breakpoint pick — no post-hydration
          // swap. Collapses to a single tree once isWide is measured.
          <>
            <div className="hidden lg:block">
              <FrontPageGrid
                posts={feedListPosts}
                isLoading={isLoading}
                isLoadingMore={isFetchingNextPage}
              />
            </div>
            <div className="lg:hidden">
              <FeedList
                posts={feedListPosts}
                isLoading={isLoading}
                isLoadingMore={isFetchingNextPage}
                showWhoToFollow={activeTab === "engagement"}
              />
            </div>
          </>
        ) : layout === "frontpage" && isWide ? (
          <FrontPageGrid
            posts={feedListPosts}
            isLoading={isLoading}
            isLoadingMore={isFetchingNextPage}
          />
        ) : (
          <FeedList
            posts={feedListPosts}
            isLoading={isLoading}
            isLoadingMore={isFetchingNextPage}
            showWhoToFollow={activeTab === "engagement"}
          />
        )}
      </div>

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
    </PullToRefresh>
  );
}
