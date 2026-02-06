"use client";

import { InteractivePost, ImageContent, TextContent, VideoContent, AudioContent, GalleryContent } from "@/components/Post";
import type { PostStats, PostInteractions } from "@/components/Post";
import { IconLoader2 } from "@tabler/icons-react";
import { FeedSkeleton } from "@/components/ui";
import type { VideoEmbedPlatform } from "@/types/database";

interface FeedPost {
  id: string;
  author: {
    username: string;
    avatarUrl: string;
    role?: number;
  };
  authorId?: string;
  timestamp: string;
  contentType: "text" | "image" | "video" | "audio" | "gallery" | "poll" | "ask";
  content: {
    // Text content
    text?: string;
    html?: string;
    // Image content
    imageUrl?: string;
    imageUrls?: string[];
    altTexts?: string[];
    // Video content (file upload)
    videoUrl?: string;
    videoThumbnailUrl?: string;
    // Video content (embed)
    embedUrl?: string;
    embedPlatform?: VideoEmbedPlatform;
    // Audio content
    audioUrl?: string;
    albumArtUrl?: string;
    // Gallery content
    galleryItems?: Array<{
      type: "image" | "video";
      url: string;
      thumbnailUrl?: string;
    }>;
    // Caption (for media posts)
    captionHtml?: string;
  };
  rawContent?: any; // Raw content for editing
  stats: PostStats;
  interactions: PostInteractions;
  isSensitive?: boolean;
  isOwn?: boolean;
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
          authorId={post.authorId}
          timestamp={post.timestamp}
          contentType={post.contentType}
          initialStats={post.stats}
          initialInteractions={post.interactions}
          isSensitive={post.isSensitive}
          isOwn={post.isOwn}
          contentPreview={post.content.text || ""}
          imageUrl={post.content.imageUrl}
          tags={post.tags}
          content={post.rawContent}
        >
          {/* Image content */}
          {post.contentType === "image" && post.content.imageUrl && (
            <ImageContent src={post.content.imageUrl} alt="Post image" />
          )}

          {/* Text content */}
          {post.contentType === "text" && (post.content.html || post.content.text) && (
            <TextContent html={post.content.html}>{post.content.text}</TextContent>
          )}

          {/* Video content (embed or file) */}
          {post.contentType === "video" && (
            <VideoContent
              src={post.content.videoUrl}
              thumbnailUrl={post.content.videoThumbnailUrl}
              embedUrl={post.content.embedUrl}
              embedPlatform={post.content.embedPlatform}
              caption={post.content.captionHtml}
            />
          )}

          {/* Audio content */}
          {post.contentType === "audio" && post.content.audioUrl && (
            <AudioContent
              src={post.content.audioUrl}
              albumArtUrl={post.content.albumArtUrl}
              caption={post.content.captionHtml}
            />
          )}

          {/* Gallery content */}
          {post.contentType === "gallery" && post.content.imageUrls && (
            <GalleryContent
              images={post.content.imageUrls}
              caption={post.content.captionHtml}
            />
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
