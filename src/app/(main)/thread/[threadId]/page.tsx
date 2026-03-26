"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  IconArrowLeft,
  IconLoader2,
} from "@tabler/icons-react";
import { getPostThread } from "@/actions/post-threads";
import { InteractivePost } from "@/components/Post";
import { TextContent, ImageContent } from "@/components/Post/Post";
import { VideoContent } from "@/components/Post/content/VideoContent";
import { AudioContent } from "@/components/Post/content/AudioContent";
import { GalleryContent } from "@/components/Post/content/GalleryContent";
import { LinkPreviewCarousel } from "@/components/Post/content/LinkPreviewCarousel";
import type { VideoEmbedPlatform } from "@/types/database";

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

function renderPostContent(postType: string, content: any) {
  if (!content) return null;

  switch (postType) {
    case "text":
      return (
        <>
          <TextContent html={content.html}>
            {content.plain || content.text}
          </TextContent>
          {content.link_previews && content.link_previews.length > 0 && (
            <div className="bg-vocl-surface-muted">
              <LinkPreviewCarousel previews={content.link_previews} />
            </div>
          )}
        </>
      );

    case "image":
      return (
        <ImageContent
          src={content.urls?.[0] || content.url || content.imageUrl || content.imageUrls?.[0]}
          alt="Post image"
        />
      );

    case "gallery":
      return (
        <GalleryContent
          images={content.urls || content.imageUrls || []}
          caption={content.caption_html || content.captionHtml}
        />
      );

    case "video":
      return (
        <VideoContent
          src={content.url || content.videoUrl}
          thumbnailUrl={content.thumbnail_url || content.videoThumbnailUrl}
          embedUrl={content.embed_url || content.embedUrl}
          embedPlatform={(content.embed_platform || content.embedPlatform) as VideoEmbedPlatform}
          caption={content.caption_html || content.captionHtml}
        />
      );

    case "audio":
      return (
        <AudioContent
          src={content.url || content.audioUrl}
          albumArtUrl={content.album_art_url || content.albumArtUrl}
          spotifyData={content.spotify_data || content.spotifyData}
          caption={content.caption_html || content.captionHtml}
        />
      );

    default:
      return null;
  }
}

export default function ThreadPage() {
  const params = useParams();
  const threadId = params.threadId as string;

  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchThread() {
      setIsLoading(true);
      setError(null);

      const result = await getPostThread(threadId);

      if (result.success && result.posts) {
        setPosts(result.posts);
      } else {
        setError(result.error || "Failed to load thread");
      }

      setIsLoading(false);
    }

    if (threadId) {
      fetchThread();
    }
  }, [threadId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <IconLoader2 size={40} className="animate-spin text-vocl-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Thread Not Found
        </h1>
        <p className="text-foreground/60 mb-6">{error}</p>
        <Link
          href="/feed"
          className="inline-flex items-center gap-2 px-4 py-2 bg-vocl-accent text-white rounded-xl hover:bg-vocl-accent-hover transition-colors"
        >
          <IconArrowLeft size={18} />
          Back to Feed
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-foreground/60 hover:text-foreground transition-colors"
        >
          <IconArrowLeft size={18} />
          Back
        </button>
      </div>

      <h1 className="text-xl font-bold text-foreground mb-1">Thread</h1>
      <p className="text-sm text-foreground/50 mb-6">
        {posts.length} {posts.length === 1 ? "post" : "posts"} in this thread
      </p>

      {/* Thread posts */}
      {posts.length === 0 ? (
        <div className="text-center py-12 text-foreground/40">
          No posts found in this thread.
        </div>
      ) : (
        <div className="relative">
          {posts.map((post, index) => (
            <div key={post.id} className="relative">
              {/* Vertical connecting line */}
              {index < posts.length - 1 && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-full h-6 border-l-2 border-white/10 z-10"
                  aria-hidden="true"
                />
              )}

              <div className="relative pb-6">
                <InteractivePost
                  id={post.id}
                  author={{
                    username: post.author.username,
                    avatarUrl: post.author.avatarUrl || "",
                    role: post.author.role,
                  }}
                  authorId={post.authorId}
                  timestamp={formatRelativeTime(post.createdAt)}
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
                  isPinned={post.isPinned}
                  tags={post.tags}
                  content={post.content}
                  threadId={post.threadId}
                  threadPosition={post.threadPosition}
                  threadLength={posts.length}
                >
                  {renderPostContent(post.postType, post.content)}
                </InteractivePost>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
