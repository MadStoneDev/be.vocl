"use client";

import { useState, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { IconBookmark, IconLoader2 } from "@tabler/icons-react";
import {
  InteractivePost,
  ImageContent,
  TextContent,
  VideoContent,
  AudioContent,
  GalleryContent,
} from "@/components/Post";
import { FeedSkeleton } from "@/components/ui";
import { getBookmarksByUser } from "@/actions/bookmarks";
import type { VideoEmbedPlatform } from "@/types/database";

const BOOKMARKS_PER_PAGE = 20;

export default function BookmarksPage() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["bookmarks"],
    queryFn: async ({ pageParam = 0 }) => {
      const result = await getBookmarksByUser(BOOKMARKS_PER_PAGE, pageParam);
      if (!result.success) {
        throw new Error(result.error || "Failed to load bookmarks");
      }
      return {
        bookmarks: result.bookmarks || [],
        hasMore: result.hasMore || false,
        nextOffset: pageParam + BOOKMARKS_PER_PAGE,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextOffset : undefined,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const posts = data?.pages.flatMap((page) => page.bookmarks) || [];

  return (
    <div className="max-w-xl mx-auto py-3 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-vocl-accent/20 flex items-center justify-center">
          <IconBookmark size={24} className="text-vocl-accent" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Bookmarks</h1>
      </div>

      {/* Loading */}
      {isLoading && <FeedSkeleton count={3} />}

      {/* Empty state */}
      {!isLoading && posts.length === 0 && (
        <div className="text-center py-16">
          <IconBookmark size={48} className="mx-auto text-foreground/20 mb-4" />
          <p className="text-foreground/40 text-lg mb-2">No bookmarks yet</p>
          <p className="text-foreground/30 text-sm">
            Bookmark posts to save them for later.
          </p>
        </div>
      )}

      {/* Bookmarked posts */}
      {posts.length > 0 && (
        <div className="flex flex-col gap-5">
          {posts.map((post: any) => {
            const postContent = post.content as any;

            return (
              <InteractivePost
                key={post.id}
                id={post.id}
                author={post.author}
                authorId={post.authorId}
                timestamp={post.createdAt}
                contentType={post.postType}
                initialStats={{
                  comments: post.commentCount,
                  likes: post.likeCount,
                  reblogs: post.reblogCount,
                }}
                initialInteractions={{
                  hasCommented: post.hasCommented,
                  hasLiked: post.hasLiked,
                  hasReblogged: post.hasReblogged,
                }}
                isSensitive={post.isSensitive}
                isOwn={post.isOwn}
                tags={post.tags}
                content={post.content}
                initialBookmarked={true}
              >
                {post.postType === "image" && postContent?.urls?.[0] && (
                  <ImageContent src={postContent.urls[0]} alt="Post image" />
                )}
                {post.postType === "text" && (postContent?.html || postContent?.plain) && (
                  <TextContent html={postContent.html}>{postContent.plain}</TextContent>
                )}
                {post.postType === "video" && (
                  <VideoContent
                    src={postContent?.url}
                    thumbnailUrl={postContent?.thumbnail_url}
                    embedUrl={postContent?.embed_url}
                    embedPlatform={postContent?.embed_platform as VideoEmbedPlatform}
                    caption={postContent?.caption_html}
                  />
                )}
                {post.postType === "audio" && (postContent?.url || postContent?.spotify_data) && (
                  <AudioContent
                    src={postContent?.url}
                    albumArtUrl={postContent?.album_art_url}
                    spotifyData={postContent?.spotify_data}
                    caption={postContent?.caption_html}
                  />
                )}
                {post.postType === "gallery" && postContent?.urls && (
                  <GalleryContent
                    images={postContent.urls}
                    caption={postContent.caption_html}
                  />
                )}
              </InteractivePost>
            );
          })}

          {/* Load more */}
          {hasNextPage && (
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

          {isFetchingNextPage && (
            <div className="flex items-center justify-center py-8">
              <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
