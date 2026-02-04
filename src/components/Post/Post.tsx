"use client";

import { useState, useRef, useMemo, useCallback, memo, type ReactNode } from "react";
import { sanitizeHtmlWithSafeLinks } from "@/lib/sanitize";
import Image from "next/image";
import Link from "next/link";
import {
  IconDots,
  IconMessage,
  IconMessageFilled,
  IconHeart,
  IconHeartFilled,
  IconRefresh,
  IconBolt,
  IconPencil,
  IconCalendar,
  IconHourglass,
  IconSend,
  IconX,
} from "@tabler/icons-react";
import { NSFWOverlay } from "./NSFWOverlay";
import { StaffBadge } from "@/components/ui";

// Panel types for expanded view
type ExpandedPanel = "comments" | "likes" | "reblogs" | null;

// =============================================================================
// Types
// =============================================================================
export type PostContentType = "image" | "text" | "video" | "audio" | "gallery";
export interface PostAuthor {
  username: string;
  avatarUrl: string;
  role?: number;
}
export interface PostStats {
  comments: number;
  likes: number;
  reblogs: number;
}
export interface PostInteractions {
  hasCommented: boolean;
  hasLiked: boolean;
  hasReblogged: boolean;
}
export interface CommentData {
  id: string;
  author: PostAuthor;
  content: string;
  timestamp: string;
}
export interface UserData {
  id: string;
  username: string;
  avatarUrl: string;
  displayName?: string;
  role?: number;
}
export interface PostProps {
  id: string;
  author: PostAuthor;
  timestamp: string;
  contentType: PostContentType;
  children: ReactNode; // The actual content (image, text, video, etc.)
  stats: PostStats;
  interactions: PostInteractions;
  isSensitive?: boolean; // NSFW content flag
  comments?: CommentData[];
  likedBy?: UserData[];
  rebloggedBy?: UserData[];
  onComment?: (content: string) => void;
  onLike?: () => void;
  onReblog?: (type: "instant" | "with-comment" | "schedule" | "queue") => void;
  onMenuClick?: () => void;
  onCommentsExpand?: () => void;
  onLikesExpand?: () => void;
  onReblogsExpand?: () => void;
}

// =============================================================================
// Sub-components
// =============================================================================
interface PostHeaderProps {
  author: PostAuthor;
  timestamp: string;
  onMenuClick?: () => void;
}

function PostHeader({ author, timestamp, onMenuClick }: PostHeaderProps) {
  return (
    <div
      className="flex items-center justify-between p-2 border-b border-vocl-surface-dark/20 z-50"
      style={{ backgroundColor: "#EBEBEB", borderRadius: "30px 0 0 0" }}
    >
      <div className="flex items-center gap-3">
        <Link
          href={`/profile/${author.username}`}
          className="relative h-10 sm:h-12 w-10 sm:w-12 overflow-hidden rounded-full hover:opacity-90 transition-opacity"
        >
          <Image
            src={author.avatarUrl}
            alt={author.username}
            fill
            className="object-cover"
          />
        </Link>
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <Link
              href={`/profile/${author.username}`}
              className="font-display text-base sm:text-lg font-normal text-neutral-900 hover:text-vocl-accent transition-colors"
            >
              {author.username}
            </Link>
            {author.role !== undefined && <StaffBadge role={author.role} size={16} />}
          </div>
          <span className="-mt-1 font-sans text-xs sm:text-xs text-neutral-400">{timestamp}</span>
        </div>
      </div>
      <button
        onClick={onMenuClick}
        className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-300/50"
        aria-label="Post menu"
      >
        <IconDots size={24} className="text-neutral-600" />
      </button>
    </div>
  );
}

interface PostActionBarProps {
  stats: PostStats;
  interactions: PostInteractions;
  isReblogMenuOpen: boolean;
  expandedPanel: ExpandedPanel;
  onCommentClick: () => void;
  onLike?: () => void;
  onLikesClick: () => void;
  onReblogsClick: () => void;
  onReblogClick: () => void;
}

function PostActionBar({
  stats,
  interactions,
  isReblogMenuOpen,
  expandedPanel,
  onCommentClick,
  onLike,
  onLikesClick,
  onReblogsClick,
  onReblogClick,
}: PostActionBarProps) {
  return (
    <div
      className={`absolute right-0 bottom-0 left-0 flex items-center justify-between pt-2.5 pr-20 pb-3 sm:pb-4 pl-3 sm:pl-5`}
      style={{ backgroundColor: "rgba(19, 19, 19, 0.9)", borderRadius: "0 0 40px 0" }}
    >
      {/* Comment button - icon AND count open panel */}
      <button
        onClick={onCommentClick}
        className="cursor-pointer flex items-center gap-1 sm:gap-2 transition-colors"
        aria-label={`View ${stats.comments} comments`}
        aria-expanded={false}
      >
        {interactions.hasCommented ? (
          <IconMessageFilled size={24} className="text-vocl-comment" aria-hidden="true" />
        ) : (
          <IconMessage size={24} className="text-neutral-400" aria-hidden="true" />
        )}
        <span
          className={`font-sans text-sm ${
            interactions.hasCommented ? "text-vocl-comment" : "text-neutral-400"
          }`}
          aria-hidden="true"
        >
          {stats.comments}
        </span>
      </button>

      {/* Like button - icon triggers like, count shows likes list */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={onLike}
          className="cursor-pointer transition-colors"
          aria-label={interactions.hasLiked ? "Unlike post" : "Like post"}
          aria-pressed={interactions.hasLiked}
        >
          {interactions.hasLiked ? (
            <IconHeartFilled size={24} className="text-vocl-like" aria-hidden="true" />
          ) : (
            <IconHeart size={24} className="text-neutral-400" aria-hidden="true" />
          )}
        </button>
        <button
          onClick={onLikesClick}
          className={`cursor-pointer font-sans text-sm transition-colors ${
            interactions.hasLiked ? "text-vocl-like" : "text-neutral-400"
          }`}
          aria-label="View likes"
        >
          {stats.likes}
        </button>
      </div>

      {/* Reblog count - clickable to show reblogs list */}
      <button
        onClick={onReblogsClick}
        className={`font-sans text-sm font-medium cursor-pointer transition-colors ${
          interactions.hasReblogged ? "text-vocl-reblog" : "text-neutral-400"
        }`}
        aria-label="View reblogs"
      >
        {stats.reblogs}
      </button>

      {/* Reblog button */}
      <button
          onClick={onReblogClick}
          className={`absolute right-0 bottom-0 w-18 sm:w-18 h-18 sm:h-18 rounded-full ${expandedPanel ? "" : "shadow-lg shadow-vocl-surface-dark/50"} transition-all duration-300 ${
              isReblogMenuOpen
                  ? "bg-vocl-accent scale-105"
                  : "bg-vocl-accent hover:scale-105"
          } z-50`}
          aria-label="Reblog options"
          aria-expanded={isReblogMenuOpen}
      >
        <div className="hidden sm:flex items-center justify-center">
          {isReblogMenuOpen ? (
              <IconBolt size={55} stroke={1.5} className={`text-neutral-900`} />
          ) : (
              <IconRefresh size={55} stroke={1.5} className={`text-neutral-900`} />
          )}
        </div>

        <div className="flex sm:hidden items-center justify-center">
          {isReblogMenuOpen ? (
              <IconBolt size={50} stroke={1.5} className="text-neutral-900" />
          ) : (
              <IconRefresh size={50} stroke={1.5} className="text-neutral-900" />
          )}
        </div>
      </button>
    </div>
  );
}

interface ReblogFabMenuProps {
  isOpen: boolean;
  onSelect: (type: "instant" | "with-comment" | "schedule" | "queue") => void;
}

function ReblogFabMenu({ isOpen, onSelect }: ReblogFabMenuProps) {
  const menuItems = [
    { type: "queue" as const, icon: IconHourglass, label: "Add to queue" },
    { type: "schedule" as const, icon: IconCalendar, label: "Schedule reblog" },
    { type: "with-comment" as const, icon: IconPencil, label: "Reblog with comment" },
  ];

  // Radial menu: items fan out in an arc from the reblog button (bottom-right corner)
  // Angles: 90° = straight up, 180° = straight left
  // Full quarter-circle arc for maximum spread
  const startAngle = 180;
  const endAngle = 270;
  const angleStep = (endAngle - startAngle) / (menuItems.length - 1);

  // Radius from center of reblog button to center of menu items
  // Reblog button is 72px (mobile) / 80px (desktop), so radius should clear the button
  const radius = 75; // pixels

  // Reblog button center offset from bottom-right corner
  // Mobile: w-18 (72px) / 2 = 36px, Desktop: w-20 (80px) / 2 = 40px
  // Using mobile value, desktop will be slightly off but acceptable
  const buttonCenterOffset = 36;

  return (
    <>
      {menuItems.map((item, index) => {
        const Icon = item.icon;
        const angle = startAngle + index * angleStep;
        const angleRad = (angle * Math.PI) / 180;

        // Calculate position relative to reblog button center
        const x = Math.cos(angleRad) * radius;
        const y = Math.sin(angleRad) * radius;

        return (
          <button
            key={item.type}
            onClick={() => onSelect(item.type)}
            className={`absolute z-40 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-300 ease-out hover:scale-110 ${
              isOpen ? "pointer-events-auto" : "pointer-events-none"
            }`}
            style={{
              // Position from bottom-right, offset by button center, then by calculated x/y
              bottom: buttonCenterOffset - y - 22, // 22 = half of button size (44px / 2)
              right: buttonCenterOffset - x - 22,
              transitionDelay: isOpen ? `${index * 60}ms` : `${(menuItems.length - 1 - index) * 30}ms`,
              transform: isOpen ? "scale(1)" : "scale(0)",
              opacity: isOpen ? 1 : 0,
            }}
            aria-label={item.label}
          >
            <Icon size={22} className="text-neutral-700 sm:hidden" />
            <Icon size={24} className="text-neutral-700 hidden sm:block" />
          </button>
        );
      })}
    </>
  );
}

// =============================================================================
// Expandable Panel Components
// =============================================================================

interface CommentsListProps {
  comments: CommentData[];
  onSubmit: (content: string) => void;
}

function CommentsList({ comments, onSubmit }: CommentsListProps) {
  const [newComment, setNewComment] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onSubmit(newComment.trim());
      setNewComment("");
    }
  };

  return (
    <div className="flex flex-col">
      {/* Comment input */}
      <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-b border-neutral-200">
        <input
          ref={inputRef}
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 px-3 py-2 text-sm bg-neutral-100 rounded-full text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-vocl-accent"
        />
        <button
          type="submit"
          disabled={!newComment.trim()}
          className="p-2 rounded-full bg-vocl-accent text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          <IconSend size={18} />
        </button>
      </form>

      {/* Comments list */}
      <div className="max-h-64 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-center text-neutral-400 text-sm py-6">No comments yet. Be the first!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 p-3 border-b border-neutral-100 last:border-0">
              <Link
                href={`/profile/${comment.author.username}`}
                className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full hover:opacity-90 transition-opacity"
              >
                <Image
                  src={comment.author.avatarUrl}
                  alt={comment.author.username}
                  fill
                  className="object-cover"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/profile/${comment.author.username}`}
                    className="font-medium text-sm text-neutral-800 hover:text-vocl-accent transition-colors"
                  >
                    {comment.author.username}
                  </Link>
                  {comment.author.role !== undefined && <StaffBadge role={comment.author.role} size={14} />}
                  <span className="text-xs text-neutral-400">{comment.timestamp}</span>
                </div>
                <p className="text-sm text-neutral-600 mt-0.5">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface UsersListProps {
  users: UserData[];
  emptyMessage: string;
  actionColor: string;
}

function UsersList({ users, emptyMessage, actionColor }: UsersListProps) {
  return (
    <div className="max-h-64 overflow-y-auto">
      {users.length === 0 ? (
        <p className="text-center text-neutral-400 text-sm py-6">{emptyMessage}</p>
      ) : (
        users.map((user) => (
          <Link
            key={user.id}
            href={`/profile/${user.username}`}
            className="flex items-center gap-3 p-3 border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors"
          >
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
              <Image
                src={user.avatarUrl}
                alt={user.username}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-medium text-sm text-neutral-800 hover:text-vocl-accent transition-colors">{user.displayName || user.username}</span>
                {user.role !== undefined && <StaffBadge role={user.role} size={14} />}
              </div>
              <span className="text-xs text-neutral-400">@{user.username}</span>
            </div>
            <div className={`w-2 h-2 rounded-full ${actionColor}`} />
          </Link>
        ))
      )}
    </div>
  );
}

interface ExpandedPanelProps {
  type: ExpandedPanel;
  comments: CommentData[];
  likedBy: UserData[];
  rebloggedBy: UserData[];
  onCommentSubmit: (content: string) => void;
  onClose: () => void;
}

function ExpandedPanel({ type, comments, likedBy, rebloggedBy, onCommentSubmit, onClose }: ExpandedPanelProps) {
  if (!type) return null;

  const titles = {
    comments: "Comments",
    likes: "Liked by",
    reblogs: "Reblogged by",
  };

  return (
    <div
      className="bg-vocl-surface overflow-hidden transition-all duration-300 ease-out"
      style={{ borderRadius: "0 0 20px 20px" }}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-50 border-b border-neutral-200">
        <h3 className="font-medium text-sm text-neutral-700">{titles[type]}</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-neutral-200 transition-colors"
          aria-label="Close panel"
        >
          <IconX size={18} className="text-neutral-500" />
        </button>
      </div>

      {/* Panel content */}
      {type === "comments" && (
        <CommentsList comments={comments} onSubmit={onCommentSubmit} />
      )}
      {type === "likes" && (
        <UsersList users={likedBy} emptyMessage="No likes yet" actionColor="bg-vocl-like" />
      )}
      {type === "reblogs" && (
        <UsersList users={rebloggedBy} emptyMessage="No reblogs yet" actionColor="bg-vocl-reblog" />
      )}
    </div>
  );
}

// =============================================================================
// Main Post Component (Memoized for performance)
// =============================================================================
export const Post = memo(function Post({
  id,
  author,
  timestamp,
  contentType,
  children,
  stats,
  interactions,
  isSensitive = false,
  comments = [],
  likedBy = [],
  rebloggedBy = [],
  onComment,
  onLike,
  onReblog,
  onMenuClick,
  onCommentsExpand,
  onLikesExpand,
  onReblogsExpand,
}: PostProps) {
  const [isReblogMenuOpen, setIsReblogMenuOpen] = useState(false);
  const [isContentRevealed, setIsContentRevealed] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>(null);
  const [lastPanel, setLastPanel] = useState<ExpandedPanel>(null);

  // Memoized computed values
  const displayPanel = useMemo(() => expandedPanel || lastPanel, [expandedPanel, lastPanel]);
  const showNSFWOverlay = useMemo(() => isSensitive && !isContentRevealed, [isSensitive, isContentRevealed]);
  const contentBorderRadius = useMemo(() => expandedPanel ? "0" : "0 0 40px 0", [expandedPanel]);
  const articleBorderRadius = useMemo(() => expandedPanel ? "30px 0 0 0" : "30px 0 40px 0", [expandedPanel]);

  const handleReblogClick = useCallback(() => {
    setIsReblogMenuOpen(prev => !prev);
    setExpandedPanel(null);
  }, []);

  const handleReblogSelect = useCallback((type: "instant" | "with-comment" | "schedule" | "queue") => {
    setIsReblogMenuOpen(false);
    onReblog?.(type);
  }, [onReblog]);

  const handleOverlayClick = useCallback(() => {
    if (isReblogMenuOpen) {
      setIsReblogMenuOpen(false);
    }
  }, [isReblogMenuOpen]);

  const handleCommentClick = useCallback(() => {
    if (expandedPanel === "comments") {
      setExpandedPanel(null);
      setTimeout(() => setLastPanel(null), 300);
    } else {
      setLastPanel("comments");
      setExpandedPanel("comments");
      onCommentsExpand?.();
    }
    setIsReblogMenuOpen(false);
  }, [expandedPanel, onCommentsExpand]);

  const handleLikesClick = useCallback(() => {
    if (expandedPanel === "likes") {
      setExpandedPanel(null);
      setTimeout(() => setLastPanel(null), 300);
    } else {
      setLastPanel("likes");
      setExpandedPanel("likes");
      onLikesExpand?.();
    }
    setIsReblogMenuOpen(false);
  }, [expandedPanel, onLikesExpand]);

  const handleReblogsClick = useCallback(() => {
    if (expandedPanel === "reblogs") {
      setExpandedPanel(null);
      setTimeout(() => setLastPanel(null), 300);
    } else {
      setLastPanel("reblogs");
      setExpandedPanel("reblogs");
      onReblogsExpand?.();
    }
    setIsReblogMenuOpen(false);
  }, [expandedPanel, onReblogsExpand]);

  const handleCommentSubmit = useCallback((content: string) => {
    onComment?.(content);
  }, [onComment]);

  const handleClosePanel = useCallback(() => {
    setExpandedPanel(null);
    setTimeout(() => setLastPanel(null), 300);
  }, []);

  const handleRevealContent = useCallback(() => {
    setIsContentRevealed(true);
  }, []);

  return (
    <div className="w-full max-w-full sm:max-w-sm">
      <article
        className="relative shadow-xl overflow-hidden"
        data-post-id={id}
        data-content-type={contentType}
      >
        {/* Header - always visible, never dimmed */}
        <PostHeader
          author={author}
          timestamp={timestamp}
          onMenuClick={onMenuClick}
        />

        {/* Content area with overlay */}
        <div className="relative">
          {/* The actual content */}
          <div className="relative overflow-hidden" style={{
            borderRadius: contentBorderRadius
          }}>{children}</div>

          {/* NSFW overlay - shown when content is sensitive and not revealed */}
          {showNSFWOverlay && (
            <div style={{ borderRadius: "0 0 40px 0" }} className="overflow-hidden">
              <NSFWOverlay onReveal={handleRevealContent} />
            </div>
          )}

          {/* Dark overlay - only covers content, not header or action bar */}
          <div
            onClick={handleOverlayClick}
            className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
              isReblogMenuOpen
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none opacity-0"
            } z-30`}
            aria-hidden="true"
          />
        </div>

        {/* Radial FAB Menu - positioned relative to article (around reblog button) */}
        <ReblogFabMenu isOpen={isReblogMenuOpen} onSelect={handleReblogSelect} />

        {/* Action bar - always visible, never dimmed */}
        <PostActionBar
          stats={stats}
          interactions={interactions}
          isReblogMenuOpen={isReblogMenuOpen}
          expandedPanel={expandedPanel}
          onCommentClick={handleCommentClick}
          onLike={onLike}
          onLikesClick={handleLikesClick}
          onReblogsClick={handleReblogsClick}
          onReblogClick={handleReblogClick}
        />

        {/* Fake Border */}
        <div className={`pointer-events-none absolute top-0 right-0 bottom-0 left-0 border sm:border-6 border-[#EBEBEB] z-40`} style={{
          borderRadius: articleBorderRadius,
        }}></div>
      </article>

      {/* Expanded Panel - OUTSIDE article, below action bar */}
      <div
        className="overflow-hidden bg-vocl-surface shadow-lg"
        style={{
          maxHeight: expandedPanel ? "384px" : "0px",
          opacity: expandedPanel ? 1 : 0,
          transition: "max-height 300ms ease-out, opacity 200ms ease-out",
          borderRadius: "0 0 20px 20px",
          marginTop: "0px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {displayPanel && (
          <ExpandedPanel
            type={displayPanel}
            comments={comments}
            likedBy={likedBy}
            rebloggedBy={rebloggedBy}
            onCommentSubmit={handleCommentSubmit}
            onClose={handleClosePanel}
          />
        )}
      </div>
    </div>
  );
});

// =============================================================================
// Content Components for different post types
// =============================================================================

interface ImageContentProps {
  src: string;
  alt: string;
}

export function ImageContent({ src, alt }: ImageContentProps) {
  return (
    <div className="relative aspect-square w-full">
      <Image src={src} alt={alt} fill className="object-cover" />
    </div>
  );
}

interface TextContentProps {
  children?: ReactNode;
  html?: string;
}

export function TextContent({ children, html }: TextContentProps) {
  return (
    <div className="p-3 sm:p-4 pb-18.5 sm:pb-18.5 bg-[#EBEBEB]">
      {html ? (
        <div
          className="font-sans text-sm sm:text-base font-light leading-relaxed text-neutral-700 prose prose-sm max-w-none prose-p:my-2 prose-p:first:mt-0 prose-p:last:mb-0"
          dangerouslySetInnerHTML={{ __html: sanitizeHtmlWithSafeLinks(html) }}
        />
      ) : (
        <div className="font-sans text-sm sm:text-base font-light leading-relaxed text-neutral-700 whitespace-pre-wrap">
          {children}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Export
// Note: VideoContent, AudioContent, and GalleryContent are implemented in
// ./content/ directory and exported from the Post index
// =============================================================================

export default Post;
