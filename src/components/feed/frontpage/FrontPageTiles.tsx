"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { IconPlayerPlay, IconMicrophone, IconPhoto, IconChartBar, IconRefresh, IconLink, IconMessage, IconHeart, IconHeartFilled, IconPencil } from "@tabler/icons-react";
import { Avatar, TimeAgo, toast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useLike } from "@/hooks/useLike";
import { reblogPost } from "@/actions/reblogs";
import { ImageLightbox } from "@/components/Post/content/ImageLightbox";
import type { FeedPost } from "../FeedList";
import type { Prominence } from "./useFeedLayout";
import type { LinkPreviewData } from "@/types/database";

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------
function stripHtml(html?: string): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function clamp(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).replace(/\s+\S*$/, "") + "…";
}

function firstWords(s: string, words: number): string {
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length <= words) return s;
  return parts.slice(0, words).join(" ") + "…";
}

function raw(post: FeedPost): Record<string, unknown> {
  return (post.rawContent as Record<string, unknown>) ?? {};
}

function headlineOf(post: FeedPost): string {
  const c = post.content;
  switch (post.contentType) {
    case "text":
      // Only essays have a real title. Plain notes return "" so the tile renders
      // the note body once (no synthetic heading derived from the body).
      if (c.isEssay && c.essayTitle) return c.essayTitle;
      return "";
    case "ask": {
      const r = raw(post);
      return clamp((r.question as string) || stripHtml(r.question_html as string) || "An ask", 120);
    }
    case "poll": {
      const r = raw(post);
      return clamp((r.question as string) || "A poll", 120);
    }
    case "audio":
      return c.spotifyData?.name || (c.isVoiceNote ? "Voice note" : "Audio");
    case "image":
    case "gallery":
    case "video":
      return firstWords(stripHtml(c.captionHtml), 14) || `@${post.author.username}`;
    default:
      return `@${post.author.username}`;
  }
}

function standfirstOf(post: FeedPost): string {
  const c = post.content;
  if (post.contentType === "text") {
    // No JS truncation — display clamping is handled with CSS line-clamp.
    return c.text || stripHtml(c.html);
  }
  if (post.contentType === "ask") {
    return clamp(stripHtml(raw(post).answer_html as string), 200);
  }
  if (post.isReblog && post.reblogCommentHtml) {
    return clamp(stripHtml(post.reblogCommentHtml), 200);
  }
  return "";
}

function metaOf(post: FeedPost): string {
  const c = post.content;
  if (c.isEssay) return `Essay${c.readingTimeMinutes ? ` · ${c.readingTimeMinutes} min read` : ""}`;
  switch (post.contentType) {
    case "ask":
      return "Ask";
    case "poll":
      return "Poll";
    case "audio":
      return "Listen";
    case "image":
    case "gallery":
      return "Photo";
    case "video":
      return "Video";
    default:
      return "Note";
  }
}

function mediaSrc(post: FeedPost): string | null {
  const c = post.content;
  return c.imageUrl || c.imageUrls?.[0] || c.videoThumbnailUrl || c.albumArtUrl || null;
}

function hrefOf(post: FeedPost): string {
  if (post.threadId) return `/thread/${post.threadId}`;
  return `/post/${post.id}`;
}

function firstLinkPreview(post: FeedPost): LinkPreviewData | null {
  const lp = post.content.linkPreviews;
  return lp && lp.length > 0 ? lp[0] : null;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// Shared chrome
// ---------------------------------------------------------------------------
function Byline({ post }: { post: FeedPost }) {
  // The tile itself is a link to the post; these nested links (author, edit) stop
  // propagation so they navigate to their own target instead of the post.
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <div className="flex items-center gap-2 text-foreground/55 type-meta">
      <Link
        href={`/profile/${post.author.username}`}
        onClick={stop}
        className="flex items-center gap-2 hover:text-foreground/90 transition-colors"
      >
        <Avatar src={post.author.avatarUrl} username={post.author.username} size="sm" />
        <span className="font-medium text-foreground/75">{post.author.username}</span>
      </Link>
      <span aria-hidden="true">·</span>
      <TimeAgo iso={post.timestamp} />
      {post.isReblog && (
        <span className="inline-flex items-center gap-0.5 text-foreground/45">
          <IconRefresh size={13} /> echoed
        </span>
      )}
      {post.isOwn && (
        <Link
          href={`/create?edit=${post.id}`}
          onClick={stop}
          aria-label="Edit post"
          className="ml-auto inline-flex items-center gap-1 text-foreground/45 hover:text-vocl-primary transition-colors"
        >
          <IconPencil size={13} /> Edit
        </Link>
      )}
    </div>
  );
}

function Kicker({ post }: { post: FeedPost }) {
  return (
    <span className="type-meta uppercase tracking-wide text-vocl-primary font-semibold">
      {metaOf(post)}
    </span>
  );
}

function TileShell({ post, children, className = "" }: { post: FeedPost; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={hrefOf(post)}
      className={`group block ${className}`}
      data-post-id={post.id}
    >
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Tiles
// ---------------------------------------------------------------------------
function ArticleTile({ post, prominence }: { post: FeedPost; prominence: Prominence }) {
  const headline = headlineOf(post);
  const standfirst = standfirstOf(post);
  const headlineClass =
    prominence === "lead" ? "type-display-lg" : prominence === "feature" ? "type-display" : "type-heading";
  // CSS-only clamp for grid sanity (not data truncation).
  const clampClass =
    prominence === "lead" ? "line-clamp-5" : prominence === "feature" ? "line-clamp-4" : "line-clamp-3";

  // Plain text note (no essay title): render the note ONCE in headline style — no
  // synthetic heading + body duplication.
  if (!headline) {
    return (
      <TileShell post={post} className="flex flex-col gap-2">
        <Kicker post={post} />
        <p className={`${headlineClass} ${clampClass} text-foreground group-hover:text-vocl-primary transition-colors`}>
          {standfirst}
        </p>
        <Byline post={post} />
      </TileShell>
    );
  }

  const showStandfirst = prominence !== "standard" && standfirst;

  return (
    <TileShell post={post} className="flex flex-col gap-2">
      <Kicker post={post} />
      <h3 className={`${headlineClass} text-foreground group-hover:text-vocl-primary transition-colors`}>
        {headline}
      </h3>
      {showStandfirst && (
        <p className="type-body text-foreground/65 line-clamp-3">{standfirst}</p>
      )}
      <Byline post={post} />
    </TileShell>
  );
}

function MediaTile({ post, prominence }: { post: FeedPost; prominence: Prominence }) {
  const src = mediaSrc(post);
  const [lbOpen, setLbOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);

  if (!src) return <ArticleTile post={post} prominence={prominence} />;

  const caption = stripHtml(post.content.captionHtml);
  const displayText = caption || `@${post.author.username}`;
  const alt = caption ? clamp(caption, 120) : `@${post.author.username}`;
  const aspect = prominence === "lead" ? "aspect-[16/10]" : prominence === "feature" ? "aspect-[4/3]" : "aspect-[3/2]";
  const isGallery = post.contentType === "gallery";
  const isVideo = post.contentType === "video";
  const count = post.content.imageUrls?.length ?? 0;
  // Images/galleries open the lightbox in place; video navigates to the post (to play).
  const lightboxImages = isGallery && count > 0 ? post.content.imageUrls! : [src];

  const media = (
    <div className={`relative w-full ${aspect} overflow-hidden bg-vocl-hover`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        priority={prominence === "lead"}
        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
      {isVideo && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white">
            <IconPlayerPlay size={24} />
          </span>
        </span>
      )}
      {isGallery && count > 1 && (
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-white type-meta">
          <IconPhoto size={13} /> {count}
        </span>
      )}
    </div>
  );

  return (
    <div className="group flex flex-col gap-2.5">
      {isVideo ? (
        <Link href={hrefOf(post)} className="block">
          {media}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => {
            setLbIndex(0);
            setLbOpen(true);
          }}
          className="block w-full cursor-zoom-in"
          aria-label="View image"
        >
          {media}
        </button>
      )}

      {(caption || isVideo) && (
        <Link href={hrefOf(post)} className="block">
          <p
            className={`${prominence === "lead" ? "type-body-lg" : "type-body"} text-foreground/85 group-hover:text-vocl-primary transition-colors`}
          >
            {displayText}
          </p>
        </Link>
      )}
      <Byline post={post} />

      {!isVideo && (
        <ImageLightbox
          images={lightboxImages}
          currentIndex={lbIndex}
          isOpen={lbOpen}
          onClose={() => setLbOpen(false)}
          onNavigate={setLbIndex}
          alt={alt}
        />
      )}
    </div>
  );
}

function AudioTile({ post }: { post: FeedPost; prominence: Prominence }) {
  const c = post.content;
  const art = c.albumArtUrl || c.spotifyData?.album_art || null;
  const title = c.spotifyData?.name || (c.isVoiceNote ? "Voice note" : "Audio");
  const subtitle = c.spotifyData?.artist || `@${post.author.username}`;

  return (
    <TileShell post={post} className="flex flex-col gap-2">
      <Kicker post={post} />
      <div className="flex items-center gap-3 border border-vocl-border p-3 transition-colors group-hover:border-vocl-primary/50">
        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden bg-vocl-hover">
          {art ? (
            <Image src={art} alt={title} fill className="object-cover" sizes="56px" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-foreground/40">
              <IconMicrophone size={22} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="type-body font-medium text-foreground truncate group-hover:text-vocl-primary transition-colors">
            {title}
          </p>
          <p className="type-meta text-foreground/55 truncate">{subtitle}</p>
        </div>
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-vocl-primary text-white">
          <IconPlayerPlay size={16} />
        </span>
      </div>
    </TileShell>
  );
}

function LinkTile({ post, prominence, preview }: { post: FeedPost; prominence: Prominence; preview: LinkPreviewData }) {
  const domain = preview.siteName || domainOf(preview.url);
  const headline = preview.title || headlineOf(post);
  const standfirst = preview.description || standfirstOf(post);
  const showStandfirst = prominence !== "standard" && !!standfirst;

  if (preview.image) {
    const aspect = prominence === "lead" ? "aspect-[16/10]" : prominence === "feature" ? "aspect-[4/3]" : "aspect-[3/2]";
    return (
      <TileShell post={post} className="flex flex-col gap-2.5">
        <div className={`relative w-full ${aspect} overflow-hidden bg-vocl-hover`}>
          <Image
            src={preview.image}
            alt={headline}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded bg-black/65 px-1.5 py-0.5 text-white type-meta">
            <IconLink size={12} /> {domain}
          </span>
        </div>
        <h3 className={`${prominence === "lead" ? "type-display" : "type-heading"} text-foreground group-hover:text-vocl-primary transition-colors`}>
          {headline}
        </h3>
        {showStandfirst && <p className="type-body text-foreground/65 line-clamp-2">{standfirst}</p>}
        <Byline post={post} />
      </TileShell>
    );
  }

  // No preview image — a bordered link card
  return (
    <TileShell post={post} className="flex flex-col gap-2">
      <span className="type-meta uppercase tracking-wide text-vocl-primary font-semibold inline-flex items-center gap-1">
        <IconLink size={13} /> {domain}
      </span>
      <div className="border border-vocl-border p-3 transition-colors group-hover:border-vocl-primary/50">
        <h3 className={`${prominence === "lead" ? "type-display" : "type-heading"} text-foreground group-hover:text-vocl-primary transition-colors`}>
          {headline}
        </h3>
        {showStandfirst && <p className="type-body text-foreground/65 line-clamp-3 mt-1">{standfirst}</p>}
      </div>
      <Byline post={post} />
    </TileShell>
  );
}

/**
 * Compact, editorial quick-actions row for a front-page tile: comment · like ·
 * voice react · reblog, as line icons + tabular counts. Sits outside the tile's
 * link (so it's separately clickable) and leads to the post to engage.
 */
export function TileActions({ post }: { post: FeedPost }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const href = hrefOf(post);

  // Inline like (optimistic). Comment + voice lead to the post to engage.
  const { isLiked, likeCount, handleLike } = useLike({
    postId: post.id,
    initialLiked: post.interactions?.hasLiked,
    initialCount: post.stats?.likes ?? 0,
  });
  const [reblogged, setReblogged] = useState(!!post.interactions?.hasReblogged);
  const [reblogCount, setReblogCount] = useState(post.stats?.reblogs ?? 0);
  const [, startReblog] = useTransition();

  const requireAuth = (fn: () => void) => {
    if (!isAuthenticated) {
      router.push("/signup");
      return;
    }
    fn();
  };

  const onReblog = () =>
    requireAuth(() => {
      if (reblogged) return;
      setReblogged(true);
      setReblogCount((c) => c + 1);
      startReblog(async () => {
        const res = await reblogPost(post.id, "instant");
        if (!res.success) {
          setReblogged(false);
          setReblogCount((c) => c - 1);
          toast.error(res.error || "Failed to reblog");
        } else {
          toast.success("Reblogged");
        }
      });
    });

  const base = "inline-flex items-center gap-1.5 type-meta transition-colors";

  return (
    <div className="mt-3 pt-3 border-t border-vocl-border flex items-center gap-5">
      <Link href={href} aria-label="Comment" className={`${base} text-foreground/45 hover:text-vocl-primary`}>
        <IconMessage size={16} aria-hidden="true" />
        <span className="tabular-nums">{post.stats?.comments ?? 0}</span>
      </Link>
      <button
        type="button"
        onClick={() => requireAuth(handleLike)}
        aria-label="Like"
        className={`${base} ${isLiked ? "text-vocl-like" : "text-foreground/45 hover:text-vocl-like"}`}
      >
        {isLiked ? <IconHeartFilled size={16} aria-hidden="true" /> : <IconHeart size={16} aria-hidden="true" />}
        <span className="tabular-nums">{likeCount}</span>
      </button>
      <Link href={href} aria-label="Voice react" className={`${base} text-foreground/45 hover:text-vocl-primary`}>
        <IconMicrophone size={16} aria-hidden="true" />
        <span className="tabular-nums">{post.stats?.voiceReactions ?? 0}</span>
      </Link>
      <button
        type="button"
        onClick={onReblog}
        aria-label="Reblog"
        className={`${base} ${reblogged ? "text-vocl-primary" : "text-foreground/45 hover:text-vocl-primary"}`}
      >
        <IconRefresh size={16} aria-hidden="true" />
        <span className="tabular-nums">{reblogCount}</span>
      </button>
    </div>
  );
}

export function FrontPageTile({ post, prominence }: { post: FeedPost; prominence: Prominence }) {
  switch (post.contentType) {
    case "image":
    case "gallery":
    case "video":
      return <MediaTile post={post} prominence={prominence} />;
    case "audio":
      return <AudioTile post={post} prominence={prominence} />;
    case "poll":
      return (
        <TileShell post={post} className="flex flex-col gap-2">
          <Kicker post={post} />
          <h3 className="type-heading text-foreground group-hover:text-vocl-primary transition-colors flex items-start gap-2">
            <IconChartBar size={20} className="mt-0.5 flex-shrink-0 text-vocl-primary" />
            {headlineOf(post)}
          </h3>
          <Byline post={post} />
        </TileShell>
      );
    default: {
      // A non-essay text post that's really a shared link → render it as a link card
      const preview = firstLinkPreview(post);
      if (post.contentType === "text" && !post.content.isEssay && preview) {
        return <LinkTile post={post} prominence={prominence} preview={preview} />;
      }
      return <ArticleTile post={post} prominence={prominence} />;
    }
  }
}
