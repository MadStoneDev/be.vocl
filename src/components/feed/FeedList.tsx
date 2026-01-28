"use client";

import { Post, ImageContent, TextContent } from "@/components/Post";
import type { PostStats, PostInteractions } from "@/components/Post";
import { IconLoader2 } from "@tabler/icons-react";

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
}

interface FeedListProps {
  posts: FeedPost[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onReblog?: (postId: string, type: "instant" | "with-comment" | "schedule" | "queue") => void;
}

export function FeedList({
  posts,
  isLoading = false,
  onLike,
  onComment,
  onReblog,
}: FeedListProps) {
  if (posts.length === 0 && !isLoading) {
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
    <div className="flex flex-col gap-6">
      {posts.map((post) => (
        <Post
          key={post.id}
          id={post.id}
          author={post.author}
          timestamp={post.timestamp}
          contentType={post.contentType}
          stats={post.stats}
          interactions={post.interactions}
          isSensitive={post.isSensitive}
          onLike={() => onLike?.(post.id)}
          onComment={() => onComment?.(post.id)}
          onReblog={(type) => onReblog?.(post.id, type)}
          onMenuClick={() => console.log("Open menu for", post.id)}
        >
          {post.contentType === "image" && post.content.imageUrl && (
            <ImageContent src={post.content.imageUrl} alt="Post image" />
          )}
          {post.contentType === "text" && post.content.text && (
            <TextContent>{post.content.text}</TextContent>
          )}
        </Post>
      ))}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
        </div>
      )}
    </div>
  );
}
