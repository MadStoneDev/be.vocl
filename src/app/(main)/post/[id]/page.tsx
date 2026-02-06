"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { InteractivePost, ImageContent, TextContent, VideoContent, AudioContent, GalleryContent } from "@/components/Post";
import { getPostById } from "@/actions/posts";
import { IconLoader2, IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import type { VideoEmbedPlatform } from "@/types/database";

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

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [post, setPost] = useState<PostData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPost() {
      setIsLoading(true);
      setError(null);

      const result = await getPostById(postId);

      if (result.success && result.post) {
        setPost(result.post as PostData);
      } else {
        setError(result.error || "Post not found");
      }

      setIsLoading(false);
    }

    if (postId) {
      fetchPost();
    }
  }, [postId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <IconLoader2 size={40} className="animate-spin text-vocl-accent" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Post Not Found</h1>
        <p className="text-foreground/60 mb-6">
          {error || "This post may have been deleted or you don't have permission to view it."}
        </p>
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

  // Prepare content based on post type
  const renderContent = () => {
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

  return (
    <div className="max-w-xl mx-auto py-6 px-4">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-foreground/60 hover:text-foreground mb-4 transition-colors"
      >
        <IconArrowLeft size={18} />
        Back
      </button>

      {/* Post */}
      <InteractivePost
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
        isOwn={post.isOwn}
        isPinned={post.isPinned}
        tags={post.tags}
        content={post.content}
      >
        {renderContent()}
      </InteractivePost>
    </div>
  );
}
