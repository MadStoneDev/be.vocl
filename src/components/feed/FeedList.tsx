"use client";

import { InteractivePost, ImageContent, TextContent } from "@/components/Post";
import type { PostStats, PostInteractions } from "@/components/Post";
import { IconLoader2 } from "@tabler/icons-react";
import { FeedSkeleton } from "@/components/ui";

interface FeedPost {
  id: string;
  author: {
    username: string;
    avatarUrl: string;
  };
  timestamp: string;
  contentType: "text" | "image" | "video" | "audio" | "gallery";
  content: {
    text?: string;
    imageUrl?: string;
  };
  stats: PostStats;
  interactions: PostInteractions;
  isSensitive?: boolean;
  tags?: Array<{ id: string; name: string }>;
}

interface FeedListProps {
  posts: FeedPost[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function FeedList({
  posts,
  isLoading = false,
  isLoadingMore = false,
}: FeedListProps) {
  // Show skeleton on initial load
  if (isLoading && posts.length === 0) {
    return <FeedSkeleton count={3} />;
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-foreground/40 text-lg mb-2">Your feed is empty</p>
        <p className="text-foreground/30 text-sm">
          Follow some people or tags to see posts here!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {posts.map((post) => (
        <InteractivePost
          key={post.id}
          id={post.id}
          author={post.author}
          timestamp={post.timestamp}
          contentType={post.contentType}
          initialStats={post.stats}
          initialInteractions={post.interactions}
          isSensitive={post.isSensitive}
          contentPreview={post.content.text || ""}
          imageUrl={post.content.imageUrl}
          tags={post.tags}
        >
          {post.contentType === "image" && post.content.imageUrl && (
            <ImageContent src={post.content.imageUrl} alt="Post image" />
          )}
          {post.contentType === "text" && post.content.text && (
            <TextContent>{post.content.text}</TextContent>
          )}
        </InteractivePost>
      ))}

      {isLoadingMore && (
        <div className="flex items-center justify-center py-8">
          <IconLoader2 size={32} className="animate-spin text-vocl-accent" aria-label="Loading more posts" />
        </div>
      )}
    </div>
  );
}
