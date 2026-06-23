"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InteractivePost, ImageContent, TextContent, VideoContent, AudioContent, GalleryContent, LinkPreviewCarousel, PollContent, AskContent } from "@/components/Post";
import { getPostById } from "@/actions/posts";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, toast } from "@/components/ui";
import { TileEngagement } from "@/components/feed/frontpage/TileEngagement";
import { IconLoader2, IconArrowLeft, IconMessage, IconHeart, IconMicrophone, IconRefresh, IconShare } from "@tabler/icons-react";
import { motion, MotionConfig } from "framer-motion";
import Link from "next/link";
import { fadeUp } from "@/lib/motion";
import type { VideoEmbedPlatform } from "@/types/database";

/**
 * For logged-out visitors: let them READ the post, but funnel every interactive
 * affordance (like, reply, reblog, follow, profile/tag links, post menu) to the
 * join page. Uses capture-phase handlers so the inner control's own handler
 * never fires.
 */
function GuestInteractionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const interceptClick = useCallback(
    (e: React.MouseEvent) => {
      const el = (e.target as HTMLElement).closest("a, button, [role='button']");
      if (!el) return; // plain text / reading — allow
      e.preventDefault();
      e.stopPropagation();
      router.push("/signup");
    },
    [router]
  );

  const interceptFocus = useCallback(
    (e: React.FocusEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, [contenteditable='true']")) {
        router.push("/signup");
      }
    },
    [router]
  );

  return (
    <div onClickCapture={interceptClick} onFocusCapture={interceptFocus}>
      {children}
    </div>
  );
}

const POST_TYPE_KICKER: Record<string, string> = {
  text: "Note",
  image: "Photo",
  gallery: "Photo",
  video: "Video",
  audio: "Listen",
  poll: "Poll",
  ask: "Ask",
};

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
  tags?: Array<{ id: string; name: string }>;
}

export function PostPageClient({ postId }: { postId: string }) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const isGuest = !authLoading && !isAuthenticated;

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
        <IconLoader2 size={40} className="animate-spin text-vocl-primary" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center">
        <h1 className="type-display text-foreground mb-4">Post Not Found</h1>
        <p className="type-body text-foreground/60 mb-6">
          {error || "This post may have been deleted or you don't have permission to view it."}
        </p>
        <Link
          href="/feed"
          className="inline-flex items-center gap-2 px-4 py-2 bg-vocl-primary text-white rounded-full hover:bg-vocl-primary-hover transition-colors"
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
          <>
            <TextContent
              html={content.html}
              isEssay={content.is_essay}
              essayTitle={content.essay_title}
              readingTimeMinutes={content.reading_time_minutes}
              article
            >
              {content.plain || content.text}
            </TextContent>
            {content.link_previews && content.link_previews.length > 0 && (
              <div className="mt-6">
                <LinkPreviewCarousel previews={content.link_previews} article />
              </div>
            )}
          </>
        );

      case "image":
        return (
          <ImageContent
            src={content.urls?.[0] || content.url}
            alt="Post image"
            caption={content.caption_html}
            article
            fullBleed={isGuest}
          />
        );

      case "gallery":
        return (
          <GalleryContent
            images={content.urls || []}
            caption={content.caption_html}
            article
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
            article
            fullBleed={isGuest}
          />
        );

      case "audio":
        return (
          <AudioContent
            src={content.url}
            albumArtUrl={content.album_art_url}
            spotifyData={content.spotify_data}
            caption={content.caption_html}
            transcript={content.transcript}
            isVoiceNote={content.is_voice_note}
            article
          />
        );

      case "poll":
        return <PollContent postId={post.id} content={post.content} article />;

      case "ask":
        return <AskContent content={post.content} article />;

      default:
        return null;
    }
  };

  const content = post.content || {};
  const isEssay = post.postType === "text" && content.is_essay;
  const essayTitle = isEssay ? (content.essay_title as string | undefined) : undefined;
  const kicker = isEssay ? "Essay" : POST_TYPE_KICKER[post.postType] || "Note";

  // Broadsheet headline: only where there's a real title (essay) or a question
  // (ask/poll). Plain notes & media lead with their content — no synthetic title.
  const articleHeadline =
    essayTitle ||
    (post.postType === "ask" || post.postType === "poll"
      ? (content.question as string | undefined)
      : undefined);
  const readingTime = isEssay ? (content.reading_time_minutes as number | undefined) : undefined;
  const dateline = new Date(post.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <MotionConfig reducedMotion="user">
    {/* Uniform editorial column; media breaks out full-bleed for guests. */}
    <article className="max-w-4xl mx-auto py-6 px-4">
      {/* Back affordance */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 type-meta uppercase tracking-wide text-foreground/55 hover:text-vocl-primary mb-6 transition-colors"
      >
        <IconArrowLeft size={15} />
        Back
      </button>

      {/* Broadsheet masthead: kicker · headline · byline · double rule */}
      <motion.header
        className="mb-6"
        initial="hidden"
        animate="show"
        variants={fadeUp}
      >
        <span className="type-meta uppercase tracking-[0.2em] text-vocl-primary font-semibold">
          {kicker}
          {readingTime ? ` · ${readingTime} min read` : ""}
        </span>

        {articleHeadline && (
          <h1 className="type-display-lg text-foreground mt-2 leading-[1.05]">
            {articleHeadline}
          </h1>
        )}

        {/* Byline */}
        <div className="mt-4 flex items-center gap-3">
          <Avatar
            src={post.author.avatarUrl || ""}
            username={post.author.username}
            size="md"
          />
          <div className="flex flex-col">
            <span className="type-body font-medium text-foreground leading-tight">
              {post.author.displayName || post.author.username}
            </span>
            <span className="type-meta text-foreground/50">
              @{post.author.username} · {dateline}
            </span>
          </div>
        </div>

        {/* Compact summary under the byline — counts + share. Does NOT expand
            (so it never pushes the article down); it scrolls to the full
            engagement below the post. */}
        <span className="mt-5 block h-px w-full bg-vocl-border" />
        <div className="flex items-center gap-6 py-3 type-meta text-foreground/55">
          {[
            { Icon: IconMessage, n: post.commentCount, label: "Comments" },
            { Icon: IconHeart, n: post.likeCount, label: "Likes" },
            { Icon: IconMicrophone, n: post.voiceReactionCount ?? 0, label: "Voice reactions" },
            { Icon: IconRefresh, n: post.reblogCount, label: "Reblogs" },
          ].map(({ Icon, n, label }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={() => document.getElementById("post-engagement")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center gap-1.5 hover:text-vocl-primary transition-colors"
            >
              <Icon size={16} />
              <span className="tabular-nums">{n}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Link copied");
            }}
            className="ml-auto inline-flex items-center gap-1.5 hover:text-vocl-primary transition-colors uppercase tracking-widest"
          >
            <IconShare size={15} />
            Share
          </button>
        </div>
      </motion.header>

      {/* Article body — guests can read it, but any interaction routes to join.
          Engagement lives BELOW the post (never above), so expanding lists never
          pushes the article down. */}
      {(() => {
        const postEl = (
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
              voiceReactions: post.voiceReactionCount,
            }}
            initialInteractions={{
              hasCommented: post.hasCommented,
              hasLiked: post.hasLiked,
              hasReblogged: post.hasReblogged,
            }}
            isSensitive={post.isSensitive}
            excludeFromPublic={post.excludeFromPublic}
            articleMode
            hideActions
            isOwn={post.isOwn}
            isPinned={post.isPinned}
            tags={post.tags}
            content={post.content}
          >
            {renderContent()}
          </InteractivePost>
        );
        return isGuest ? <GuestInteractionGuard>{postEl}</GuestInteractionGuard> : postEl;
      })()}

      {/* Full engagement — below the article. Expanding pushes nothing important. */}
      <div id="post-engagement" className="mt-8 scroll-mt-20">
        <TileEngagement
          postId={post.id}
          comments={post.commentCount}
          likes={post.likeCount}
          voice={post.voiceReactionCount}
          reblogs={post.reblogCount}
          hasLiked={post.hasLiked}
          hasReblogged={post.hasReblogged}
        />
      </div>
    </article>
    </MotionConfig>
  );
}
