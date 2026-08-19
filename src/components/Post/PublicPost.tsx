import {
  InteractivePost,
  ImageContent,
  TextContent,
  VideoContent,
  AudioContent,
  GalleryContent,
  PollContent,
} from "@/components/Post";
import { sanitizeHtmlWithSafeLinks } from "@/lib/sanitize";
import type { VideoEmbedPlatform } from "@/types/database";

/**
 * Server-rendered public view of a single post. The content components are
 * passed as server-rendered children of InteractivePost, so the actual post
 * text/media lands in the initial HTML (crawlable by search + answer engines),
 * while InteractivePost still hydrates for likes/comments (prompting login for
 * logged-out visitors). Shared by the public profile feed and the public post
 * page so they render identically and can't drift.
 */

export interface PublicPostData {
  id: string;
  author_id: string;
  post_type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  is_sensitive: boolean;
  created_at: string;
  like_count: number;
  comment_count: number;
  reblog_count: number;
  tags: Array<{ id: string; name: string }>;
}

export interface PublicPostAuthor {
  username: string;
  avatar_url: string | null;
  role: number;
}

export function renderPublicPost(post: PublicPostData, author: PublicPostAuthor) {
  const contentType = post.post_type as
    | "text"
    | "image"
    | "video"
    | "audio"
    | "gallery"
    | "poll"
    | "ask";

  const contentPreview =
    post.content?.plain ||
    post.content?.caption_html?.replace(/<[^>]*>/g, "") ||
    "";
  const imageUrl =
    post.content?.urls?.[0] || post.content?.thumbnail_url || undefined;

  return (
    <InteractivePost
      key={post.id}
      id={post.id}
      author={{
        username: author.username,
        avatarUrl: author.avatar_url || "",
        role: author.role,
      }}
      authorId={post.author_id}
      timestamp={formatRelativeTime(post.created_at)}
      contentType={contentType}
      initialStats={{
        comments: post.comment_count,
        likes: post.like_count,
        reblogs: post.reblog_count,
      }}
      initialInteractions={{
        hasCommented: false,
        hasLiked: false,
        hasReblogged: false,
      }}
      isSensitive={post.is_sensitive}
      isOwn={false}
      contentPreview={contentPreview}
      imageUrl={imageUrl}
      tags={post.tags}
      content={post.content}
    >
      {contentType === "image" && post.content?.urls?.[0] && (
        <ImageContent
          src={post.content.urls[0]}
          alt={post.content?.alt_texts?.[0] || `Image post by @${author.username}`}
          caption={post.content?.caption_html}
        />
      )}
      {contentType === "text" && post.content?.html && (
        <TextContent>
          <div
            dangerouslySetInnerHTML={{
              __html: sanitizeHtmlWithSafeLinks(post.content.html),
            }}
          />
        </TextContent>
      )}
      {contentType === "text" && post.content?.plain && !post.content?.html && (
        <TextContent>{post.content.plain}</TextContent>
      )}
      {contentType === "video" && (
        <VideoContent
          src={post.content?.url}
          thumbnailUrl={post.content?.thumbnail_url}
          embedUrl={post.content?.embed_url}
          embedPlatform={post.content?.embed_platform as VideoEmbedPlatform}
          caption={post.content?.caption_html}
        />
      )}
      {contentType === "audio" &&
        (post.content?.url || post.content?.spotify_data) && (
          <AudioContent
            src={post.content?.url}
            albumArtUrl={post.content?.album_art_url}
            spotifyData={post.content?.spotify_data}
            caption={post.content?.caption_html}
            transcript={post.content?.transcript}
            isVoiceNote={post.content?.is_voice_note}
          />
        )}
      {contentType === "gallery" && post.content?.urls && (
        <GalleryContent
          images={post.content.urls}
          caption={post.content?.caption_html}
        />
      )}
      {contentType === "poll" && post.content?.options && (
        <PollContent postId={post.id} content={post.content} />
      )}
    </InteractivePost>
  );
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
