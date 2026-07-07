"use client";

import { useEffect, useState } from "react";
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
          <TextContent
            html={content.html}
            isEssay={content.is_essay}
            essayTitle={content.essay_title}
            readingTimeMinutes={content.reading_time_minutes}
          >
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
          transcript={content.transcript}
          isVoiceNote={content.is_voice_note ?? content.isVoiceNote}
        />
      );

    default:
      return null;
  }
}

export function ThreadPageClient({ threadId }: { threadId: string }) {
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
        <IconLoader2 size={40} className="animate-spin text-vocl-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center">
        <h1 className="type-display text-foreground mb-4">
          Collection Not Found
        </h1>
        <p className="type-body text-foreground/60 mb-6">{error}</p>
        <Link
          href="/feed"
          className="inline-flex items-center gap-2 px-4 py-2 bg-vocl-primary text-white rounded-sm hover:bg-vocl-primary-hover transition-colors"
        >
          <IconArrowLeft size={18} />
          Back to Feed
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-6 px-4">
      {/* Back-to-feed affordance */}
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-2 type-meta uppercase tracking-wide text-foreground/55 hover:text-vocl-primary mb-5 transition-colors"
      >
        <IconArrowLeft size={15} />
        Back
      </button>

      {/* Editorial masthead */}
      <header className="border-b-4 border-double border-vocl-border pb-5 mb-6">
        <span className="type-meta uppercase tracking-widest text-vocl-primary font-semibold">
          A Collection · {posts.length} {posts.length === 1 ? "part" : "parts"}
        </span>
        <h1 className="type-display-lg text-foreground mt-1">
          {(posts[0]?.content?.essay_title || "").trim() || "Untitled collection"}
        </h1>

        {posts.length > 0 &&
          posts.every((p) => p.postType === "audio") &&
          posts[0].author?.username && (
            <a
              href={`/rss/podcast/${posts[0].author.username}/${threadId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-sm border border-vocl-border text-vocl-primary type-meta font-medium hover:border-vocl-primary/50 transition-colors"
            >
              🎙 Podcast feed (RSS)
            </a>
          )}
      </header>

      {/* Thread posts */}
      {posts.length === 0 ? (
        <div className="text-center py-12 text-foreground/40">
          No posts found in this collection.
        </div>
      ) : (
        <div className="relative">
          {posts.map((post, index) => (
            <div key={post.id} className="relative">
              {/* Vertical connecting line */}
              {index < posts.length - 1 && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-full h-6 border-l-2 border-vocl-border z-10"
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
                    voiceReactions: post.voiceReactionCount,
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
