"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { InteractivePost, ImageContent, TextContent, VideoContent, AudioContent, GalleryContent } from "@/components/Post";
import { getTagByName, getPostsByTag, followTag, unfollowTag } from "@/actions/tags";
import { IconLoader2, IconHash, IconPlus, IconCheck } from "@tabler/icons-react";
import type { VideoEmbedPlatform } from "@/types/database";

interface TagInfo {
  id: string;
  name: string;
  postCount: number;
  isFollowing: boolean;
}

interface PostData {
  id: string;
  authorId: string;
  author: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: number;
  };
  postType: string;
  content: any;
  isSensitive: boolean;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  reblogCount: number;
  hasLiked: boolean;
  hasCommented: boolean;
  hasReblogged: boolean;
  tags: Array<{ id: string; name: string }>;
}

export default function TagPage() {
  const params = useParams();
  const tagName = decodeURIComponent(params.name as string);

  const [tag, setTag] = useState<TagInfo | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowPending, setIsFollowPending] = useState(false);

  // Fetch tag info
  useEffect(() => {
    async function fetchTag() {
      const result = await getTagByName(tagName);
      if (result.success && result.tag) {
        setTag(result.tag);
      }
    }
    fetchTag();
  }, [tagName]);

  // Fetch posts
  const fetchPosts = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    const result = await getPostsByTag(tagName, { limit: 20, offset });

    if (result.success && result.posts) {
      if (append) {
        setPosts((prev) => [...prev, ...result.posts!]);
      } else {
        setPosts(result.posts);
      }
      setHasMore(result.hasMore || false);
    } else {
      setError(result.error || "Failed to load posts");
    }

    setIsLoading(false);
    setIsLoadingMore(false);
  }, [tagName]);

  useEffect(() => {
    fetchPosts(0, false);
  }, [fetchPosts]);

  const handleFollowToggle = async () => {
    if (!tag || isFollowPending) return;

    setIsFollowPending(true);
    const result = tag.isFollowing
      ? await unfollowTag(tag.id)
      : await followTag(tag.id);

    if (result.success) {
      setTag({ ...tag, isFollowing: !tag.isFollowing });
    }
    setIsFollowPending(false);
  };

  const renderPostContent = (post: PostData) => {
    const content = post.content;

    switch (post.postType) {
      case "text":
        return (
          <TextContent html={content.html}>
            {content.plain || content.text}
          </TextContent>
        );
      case "image":
        return (
          <ImageContent
            src={content.urls?.[0] || content.url}
            alt="Post image"
          />
        );
      case "gallery":
        return (
          <GalleryContent
            images={content.urls || []}
            caption={content.caption_html}
          />
        );
      case "video":
        return (
          <VideoContent
            src={content.url}
            thumbnailUrl={content.thumbnail_url}
            embedUrl={content.embed_url}
            embedPlatform={content.embed_platform as VideoEmbedPlatform}
            caption={content.caption_html}
          />
        );
      case "audio":
        return (
          <AudioContent
            src={content.url}
            albumArtUrl={content.album_art_url}
            caption={content.caption_html}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <IconLoader2 size={40} className="animate-spin text-vocl-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-6">
      {/* Tag Header */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-vocl-accent/20 flex items-center justify-center">
              <IconHash size={24} className="text-vocl-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">#{tagName}</h1>
              {tag && (
                <p className="text-sm text-foreground/60">
                  {tag.postCount.toLocaleString()} {tag.postCount === 1 ? "post" : "posts"}
                </p>
              )}
            </div>
          </div>

          {tag && (
            <button
              onClick={handleFollowToggle}
              disabled={isFollowPending}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                tag.isFollowing
                  ? "bg-vocl-accent text-white"
                  : "bg-white/10 text-foreground hover:bg-white/20"
              }`}
            >
              {isFollowPending ? (
                <IconLoader2 size={16} className="animate-spin" />
              ) : tag.isFollowing ? (
                <>
                  <IconCheck size={16} />
                  Following
                </>
              ) : (
                <>
                  <IconPlus size={16} />
                  Follow
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-8 px-4">
          <p className="text-foreground/50 mb-4">{error}</p>
          <button
            onClick={() => fetchPosts(0, false)}
            className="px-4 py-2 bg-vocl-accent text-white rounded-xl hover:bg-vocl-accent-hover transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && posts.length === 0 && (
        <div className="text-center py-16 px-4">
          <p className="text-foreground/40 text-lg mb-2">No posts found</p>
          <p className="text-foreground/30 text-sm">
            Be the first to post with #{tagName}!
          </p>
        </div>
      )}

      {/* Posts */}
      <div className="flex flex-col gap-5 px-4">
        {posts.map((post) => (
          <InteractivePost
            key={post.id}
            id={post.id}
            author={{
              username: post.author.username,
              avatarUrl: post.author.avatarUrl || "",
              role: post.author.role,
            }}
            authorId={post.authorId}
            timestamp={post.createdAt}
            contentType={post.postType as any}
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
            tags={post.tags}
          >
            {renderPostContent(post)}
          </InteractivePost>
        ))}
      </div>

      {/* Load More */}
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

      {isLoadingMore && (
        <div className="flex items-center justify-center py-8">
          <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
        </div>
      )}
    </div>
  );
}
