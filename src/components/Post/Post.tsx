"use client";

import {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
  memo,
  createContext,
  useContext,
  type ReactNode,
} from "react";
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
  IconLoader2,
  IconMicrophone,
  IconPlayerPlay,
  IconPlayerPause,
  IconWorld,
} from "@tabler/icons-react";
import { NSFWOverlay } from "./NSFWOverlay";
import { ImageLightbox } from "./content/ImageLightbox";
import { StaffBadge, Avatar, TimeAgo } from "@/components/ui";
import { CommentVoiceRecorder } from "./create/CommentVoiceRecorder";
import { VoiceReactionsPanel } from "./VoiceReactionsPanel";

// Panel types for expanded view
type ExpandedPanel = "comments" | "likes" | "reblogs" | "voice" | null;

// =============================================================================
// Types
// =============================================================================
export type PostContentType =
  | "image"
  | "text"
  | "video"
  | "audio"
  | "gallery"
  | "poll"
  | "ask";
export interface PostAuthor {
  username: string;
  avatarUrl: string;
  role?: number;
}
export interface PostStats {
  comments: number;
  likes: number;
  reblogs: number;
  voiceReactions?: number;
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
  audioUrl?: string;
  audioDuration?: number;
}
export interface PostTag {
  id: string;
  name: string;
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
  excludeFromPublic?: boolean; // Members-only when true; public (globe) when false
  autoRevealSensitive?: boolean; // When true, sensitive content is shown without overlay (user preference)
  tags?: PostTag[]; // Tags associated with this post
  comments?: CommentData[];
  likedBy?: UserData[];
  rebloggedBy?: UserData[];
  onComment?: (content: string) => void;
  onLike?: () => void;
  onReblog?: (type: "instant" | "with-comment" | "schedule" | "queue") => void;
  onMenuClick?: (rect: DOMRect) => void;
  onShare?: () => void;
  onCommentsExpand?: () => void;
  onLikesExpand?: () => void;
  onReblogsExpand?: () => void;
  isCommentsLoading?: boolean;
  isLikesLoading?: boolean;
  isReblogsLoading?: boolean;
  contentWarning?: string;
  // Reblog metadata
  isReblog?: boolean;
  reblogCommentHtml?: string | null;
  originalAuthor?: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: number;
  } | null;
  rebloggedFromAuthor?: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: number;
  } | null;
  // Thread metadata
  threadId?: string;
  threadPosition?: number;
  threadLength?: number;
  // Article (broadsheet) mode — used on the single-post page. Drops the feed-card
  // chrome and the byline header so a bespoke article masthead can sit above.
  hideHeader?: boolean;
  bare?: boolean;
  /** Whether the viewer is signed in (gates voice-reaction recording). */
  isLoggedIn?: boolean;
  /** Hide the built-in action bar + reblog FAB + expanded panel (engagement
   *  is rendered elsewhere, e.g. the post page's top quick-view). */
  hideActions?: boolean;
  /** Small uppercase dateline shown above the byline (e.g. "Story · 4 min read",
   *  "Photo") — marks the start of each post in the single-column reader. */
  kicker?: string;
}

// =============================================================================
// Post Tags Context - allows content components to access tags and hover state
// =============================================================================
interface PostTagsContextValue {
  tags: PostTag[];
  isHovered: boolean;
}

const PostTagsContext = createContext<PostTagsContextValue | null>(null);

export function usePostTags() {
  return useContext(PostTagsContext);
}

// =============================================================================
// Sub-components
// =============================================================================
interface PostHeaderProps {
  author: PostAuthor;
  timestamp: string;
  onMenuClick?: (rect: DOMRect) => void;
  reblogFrom?: string | null;
  reblogChainFrom?: string | null;
  threadId?: string;
  threadPosition?: number;
  threadLength?: number;
  isPublic?: boolean;
}

function PostHeader({
  author,
  timestamp,
  onMenuClick,
  reblogFrom,
  reblogChainFrom,
  threadId,
  threadPosition,
  threadLength,
  isPublic,
}: PostHeaderProps) {
  return (
    <div className="flex items-center justify-between px-1 sm:px-1.5 pt-1 pb-2.5 border-b border-vocl-border z-50">
      <div className="flex items-center gap-3">
        <Link
          href={`/profile/${author.username}`}
          className="hover:opacity-90 transition-opacity"
        >
          <Avatar src={author.avatarUrl} username={author.username} size="lg" />
        </Link>
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <Link
              href={`/profile/${author.username}`}
              className="font-display text-base sm:text-lg font-normal text-foreground hover:underline"
            >
              {author.username}
            </Link>
            {author.role !== undefined && (
              <StaffBadge role={author.role} size={16} />
            )}
            {isPublic && (
              <span
                className="inline-flex text-foreground/40"
                title="Public — visible to everyone, including logged-out readers"
              >
                <IconWorld size={15} aria-label="Public post" />
              </span>
            )}
          </div>
          <span className="-mt-1 font-sans text-xs sm:text-xs text-foreground/45">
            {reblogFrom && reblogChainFrom ? (
              <>
                echoed from{" "}
                <Link
                  href={`/profile/${reblogChainFrom}`}
                  className="font-bold hover:underline"
                  style={{ color: "#F20D5E" }}
                >
                  {reblogChainFrom}
                </Link>
                {" · originally by "}
                <Link
                  href={`/profile/${reblogFrom}`}
                  className="font-bold hover:underline"
                  style={{ color: "#F20D5E" }}
                >
                  {reblogFrom}
                </Link>
                {" · "}
                <TimeAgo iso={timestamp} />
              </>
            ) : reblogFrom ? (
              <>
                echoed{" "}
                <Link
                  href={`/profile/${reblogFrom}`}
                  className="font-bold hover:underline"
                  style={{ color: "#F20D5E" }}
                >
                  {reblogFrom}
                </Link>
                {" · "}
                <TimeAgo iso={timestamp} />
              </>
            ) : (
              <TimeAgo iso={timestamp} />
            )}
            {threadId && threadPosition != null && threadLength != null && threadLength > 1 && (
              <>
                {" · "}
                <Link
                  href={`/thread/${threadId}`}
                  className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/10 text-foreground/60 text-xs hover:bg-white/20 transition-colors"
                >
                  Collection {threadPosition}/{threadLength}
                </Link>
              </>
            )}
          </span>
        </div>
      </div>
      <button
        onClick={(e) => onMenuClick?.(e.currentTarget.getBoundingClientRect())}
        className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-vocl-hover"
        aria-label="Post menu"
      >
        <IconDots size={24} className="text-foreground/55" />
      </button>
    </div>
  );
}

interface PostActionBarProps {
  stats: PostStats;
  interactions: PostInteractions;
  isReblogMenuOpen: boolean;
  expandedPanel: ExpandedPanel;
  voiceCount: number;
  bare?: boolean;
  onCommentClick: () => void;
  onLike?: () => void;
  onLikesClick: () => void;
  onVoiceClick: () => void;
  onReblogsClick: () => void;
  onReblogClick: () => void;
}

function PostActionBar({
  stats,
  interactions,
  isReblogMenuOpen,
  expandedPanel,
  voiceCount,
  bare,
  onCommentClick,
  onLike,
  onLikesClick,
  onVoiceClick,
  onReblogsClick,
  onReblogClick,
}: PostActionBarProps) {
  const [likeBurst, setLikeBurst] = useState(false);
  const handleLikeClick = () => {
    if (!interactions.hasLiked) {
      setLikeBurst(true);
      setTimeout(() => setLikeBurst(false), 600);
    }
    onLike?.();
  };
  return (
    <div
      className={`relative flex items-center justify-between gap-5 sm:gap-8 py-2 sm:py-3 pr-18 sm:pr-20 pl-2.5 sm:pl-5 border-t ${
        bare ? "bg-transparent border-vocl-border mt-6" : "bg-transparent border-vocl-border"
      }`}
    >
      {/* Comment button - icon AND count open panel */}
      <button
        onClick={onCommentClick}
        className="cursor-pointer flex items-center gap-1 sm:gap-2 transition-colors"
        aria-label={`View ${stats.comments} comments`}
        aria-expanded={false}
      >
        {interactions.hasCommented ? (
          <IconMessageFilled
            size={24}
            className="text-vocl-comment"
            aria-hidden="true"
          />
        ) : (
          <IconMessage
            size={24}
            className="text-foreground/55"
            aria-hidden="true"
          />
        )}
        <span
          className={`font-sans text-sm ${
            interactions.hasCommented ? "text-vocl-comment" : "text-foreground/55"
          }`}
          aria-hidden="true"
        >
          {stats.comments}
        </span>
      </button>

      {/* Like button - icon triggers like, count shows likes list */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={handleLikeClick}
          className="relative cursor-pointer transition-colors"
          aria-label={interactions.hasLiked ? "Unlike post" : "Like post"}
          aria-pressed={interactions.hasLiked}
        >
          {likeBurst && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-vocl-like animate-like-burst"
            />
          )}
          {interactions.hasLiked ? (
            <IconHeartFilled
              size={24}
              className={`text-vocl-like ${likeBurst ? "animate-like-pop" : ""}`}
              aria-hidden="true"
            />
          ) : (
            <IconHeart
              size={24}
              className="text-foreground/55"
              aria-hidden="true"
            />
          )}
        </button>
        <button
          onClick={onLikesClick}
          className={`cursor-pointer font-sans text-sm transition-colors ${
            interactions.hasLiked ? "text-vocl-like" : "text-foreground/55"
          }`}
          aria-label="View likes"
        >
          {stats.likes}
        </button>
      </div>

      {/* Voice react - mic + count, opens the voice reactions panel */}
      <button
        onClick={onVoiceClick}
        className={`flex items-center gap-1 sm:gap-2 cursor-pointer transition-colors ${
          expandedPanel === "voice" ? "text-vocl-primary" : "text-foreground/55 hover:text-vocl-primary"
        }`}
        aria-label={`${voiceCount} voice reaction${voiceCount === 1 ? "" : "s"}`}
        aria-expanded={expandedPanel === "voice"}
      >
        <IconMicrophone size={23} aria-hidden="true" />
        <span className="font-sans text-sm" aria-hidden="true">
          {voiceCount}
        </span>
      </button>

      {/* Reblog count - clickable to show reblogs list */}
      <button
        onClick={onReblogsClick}
        className={`font-sans text-sm font-medium cursor-pointer transition-colors ${
          interactions.hasReblogged ? "text-vocl-reblog" : "text-foreground/55"
        }`}
        aria-label="View echoes"
      >
        {stats.reblogs}
      </button>

      {/* Reblog button */}
      <button
        onClick={onReblogClick}
        className={`group absolute right-0 bottom-0 w-14 h-14 rounded-full ${expandedPanel ? "" : "shadow-lg shadow-vocl-primary/40"} bg-vocl-primary transition-all duration-300 ${
          isReblogMenuOpen ? "scale-105" : "hover:scale-105"
        } z-50`}
        aria-label="Echo options"
        aria-expanded={isReblogMenuOpen}
      >
        <div className="flex items-center justify-center">
          {isReblogMenuOpen ? (
            <IconBolt size={32} stroke={1.5} className="text-white" />
          ) : (
            <IconRefresh size={32} stroke={1.5} className="text-white" />
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
    { type: "schedule" as const, icon: IconCalendar, label: "Schedule echo" },
    {
      type: "with-comment" as const,
      icon: IconPencil,
      label: "Echo with comment",
    },
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
  const buttonCenterOffset = 28;

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
              transitionDelay: isOpen
                ? `${index * 60}ms`
                : `${(menuItems.length - 1 - index) * 30}ms`,
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
  onSubmit: (content: string, options?: { audioUrl?: string; audioDuration?: number }) => void;
  postId?: string;
}

function CommentsList({ comments, onSubmit, postId }: CommentsListProps) {
  const [newComment, setNewComment] = useState("");
  const [recordingMode, setRecordingMode] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (recordedAudioUrl) {
      onSubmit("", { audioUrl: recordedAudioUrl, audioDuration: recordedDuration });
      setRecordedAudioUrl(null);
      setRecordedDuration(0);
      setRecordingMode(false);
      return;
    }
    if (newComment.trim()) {
      onSubmit(newComment.trim());
      setNewComment("");
    }
  };

  return (
    <div className="flex flex-col">
      {/* Comment input */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 p-3 border-b border-vocl-border items-center"
      >
        {!recordingMode && !recordedAudioUrl && (
          <>
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              maxLength={2000}
              className={`flex-1 px-3 py-2 text-sm bg-vocl-hover rounded-full text-foreground/90 placeholder:text-foreground/45 focus:outline-none focus:ring-2 ${newComment.length >= 2000 ? "border border-vocl-like focus:ring-vocl-like" : "focus:ring-vocl-primary"}`}
            />
            {postId && (
              <button
                type="button"
                onClick={() => setRecordingMode(true)}
                className="p-2 rounded-full bg-vocl-hover text-foreground/65 hover:bg-vocl-primary/10 hover:text-vocl-primary transition-colors"
                aria-label="Record voice reply"
              >
                <IconMicrophone size={18} />
              </button>
            )}
            <button
              type="submit"
              disabled={!newComment.trim() || newComment.length > 2000}
              className="p-2 rounded-full bg-vocl-primary text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              <IconSend size={18} />
            </button>
          </>
        )}
        {recordingMode && postId && !recordedAudioUrl && (
          <div className="flex-1">
            <CommentVoiceRecorder
              postId={postId}
              onComplete={(url, duration) => {
                setRecordedAudioUrl(url);
                setRecordedDuration(duration);
                setRecordingMode(false);
              }}
              onCancel={() => setRecordingMode(false)}
            />
          </div>
        )}
        {recordedAudioUrl && (
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-vocl-primary/10 rounded-full">
            <IconMicrophone size={16} className="text-vocl-primary" />
            <span className="text-xs text-foreground/75">
              Voice reply ({recordedDuration}s)
            </span>
            <button
              type="button"
              onClick={() => {
                setRecordedAudioUrl(null);
                setRecordedDuration(0);
              }}
              className="ml-auto text-xs text-vocl-like hover:underline"
            >
              Remove
            </button>
            <button
              type="submit"
              className="p-1.5 rounded-full bg-vocl-primary text-white"
            >
              <IconSend size={14} />
            </button>
          </div>
        )}
      </form>
      {newComment.length >= 1800 && (
        <span
          className={`text-xs px-3 ${newComment.length >= 2000 ? "text-vocl-like" : "text-foreground/40"}`}
        >
          {newComment.length}/2000
        </span>
      )}

      {/* Comments list */}
      <div className="max-h-64 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-center text-foreground/45 text-sm py-6">
            No comments yet. Be the first!
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-3 p-3 border-b border-vocl-border last:border-0"
            >
              <Link
                href={`/profile/${comment.author.username}`}
                className="shrink-0 hover:opacity-90 transition-opacity"
              >
                <Avatar
                  src={comment.author.avatarUrl}
                  username={comment.author.username}
                  size="sm"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/profile/${comment.author.username}`}
                    className="font-medium text-sm text-foreground/90 hover:text-vocl-primary transition-colors"
                  >
                    {comment.author.username}
                  </Link>
                  {comment.author.role !== undefined && (
                    <StaffBadge role={comment.author.role} size={14} />
                  )}
                  <TimeAgo iso={comment.timestamp} className="text-xs text-foreground/45" />
                </div>
                {comment.content && (
                  <p className="text-sm text-foreground/65 mt-0.5">
                    {comment.content}
                  </p>
                )}
                {comment.audioUrl && (
                  <CommentAudioPlayer
                    src={comment.audioUrl}
                    duration={comment.audioDuration}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CommentAudioPlayer({ src, duration }: { src: string; duration?: number }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  return (
    <div className="mt-1.5 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-vocl-hover">
      <button
        type="button"
        onClick={() => {
          if (!audioRef.current) return;
          if (playing) {
            audioRef.current.pause();
            setPlaying(false);
          } else {
            audioRef.current.play();
            setPlaying(true);
          }
        }}
        className="w-7 h-7 rounded-full bg-vocl-primary text-white flex items-center justify-center"
      >
        {playing ? <IconPlayerPause size={14} /> : <IconPlayerPlay size={14} />}
      </button>
      <span className="text-xs text-foreground/65 font-mono">
        {duration ? `${duration}s` : "Voice"}
      </span>
      <div className="w-24 h-1 rounded-full bg-vocl-hover overflow-hidden">
        <div className="h-full bg-vocl-primary" style={{ width: `${progress}%` }} />
      </div>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (a.duration) setProgress((a.currentTime / a.duration) * 100);
        }}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        className="hidden"
      />
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
        <p className="text-center text-foreground/45 text-sm py-6">
          {emptyMessage}
        </p>
      ) : (
        users.map((user) => (
          <Link
            key={user.id}
            href={`/profile/${user.username}`}
            className="flex items-center gap-3 p-3 border-b border-vocl-border last:border-0 hover:bg-vocl-hover transition-colors"
          >
            <Avatar src={user.avatarUrl} username={user.username} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-medium text-sm text-foreground/90 hover:text-vocl-primary transition-colors">
                  {user.displayName || user.username}
                </span>
                {user.role !== undefined && (
                  <StaffBadge role={user.role} size={14} />
                )}
              </div>
              <span className="text-xs text-foreground/45">@{user.username}</span>
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
  postId: string;
  comments: CommentData[];
  likedBy: UserData[];
  rebloggedBy: UserData[];
  onCommentSubmit: (content: string, options?: { audioUrl?: string; audioDuration?: number }) => void;
  onClose: () => void;
  isLoading?: boolean;
}

function ExpandedPanel({
  type,
  postId,
  comments,
  likedBy,
  rebloggedBy,
  onCommentSubmit,
  onClose,
  isLoading = false,
}: ExpandedPanelProps) {
  if (!type) return null;

  const titles = {
    comments: "Comments",
    likes: "Liked by",
    reblogs: "Echoed by",
    voice: "Voice reactions",
  };

  return (
    <div
      className="bg-vocl-surface-dark overflow-hidden transition-all duration-300 ease-out"
      style={{ borderRadius: "0 0 20px 20px" }}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-2 bg-vocl-hover border-b border-vocl-border">
        <h3 className="font-medium text-sm text-foreground/75">{titles[type]}</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-vocl-hover transition-colors"
          aria-label="Close panel"
        >
          <IconX size={18} className="text-foreground/55" />
        </button>
      </div>

      {/* Panel content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <IconLoader2 size={24} className="animate-spin text-foreground/45" />
        </div>
      ) : (
        <>
          {type === "comments" && (
            <CommentsList comments={comments} onSubmit={onCommentSubmit} postId={postId} />
          )}
          {type === "likes" && (
            <UsersList
              users={likedBy}
              emptyMessage="No likes yet"
              actionColor="bg-vocl-like"
            />
          )}
          {type === "reblogs" && (
            <UsersList
              users={rebloggedBy}
              emptyMessage="No echoes yet"
              actionColor="bg-vocl-reblog"
            />
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// Tags Overlay Component (for image/video/gallery - absolute positioned)
// =============================================================================
interface TagsOverlayProps {
  tags: PostTag[];
  isVisible: boolean;
}

function TagsOverlay({ tags, isVisible }: TagsOverlayProps) {
  if (tags.length === 0) return null;

  return (
    <div
      className={`absolute top-0 right-0 w-1/3 py-2 px-4 z-20 transition-opacity duration-150 hidden sm:block ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex flex-row flex-wrap gap-1 justify-end">
        {tags.map((tag) => (
          <Link
            key={tag.id}
            href={`/tag/${encodeURIComponent(tag.name)}`}
            onClick={(e) => e.stopPropagation()}
            className={`px-2 py-0.5 text-xs font-medium rounded bg-black/60 text-white truncate max-w-full transition-opacity ${
              isVisible ? "opacity-90 hover:opacity-100" : "opacity-0"
            }`}
            style={{ maxWidth: "100%" }}
          >
            #{tag.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

// Tags strip shown below content on mobile/tablet for image/video/gallery posts
function MobileTagsStrip({ tags, bare }: { tags: PostTag[]; bare?: boolean }) {
  if (tags.length === 0) return null;

  if (bare) {
    return (
      <div className="sm:hidden pt-3">
        <div className="flex flex-row flex-wrap gap-2">
          {tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/tag/${encodeURIComponent(tag.name)}`}
              className="px-2.5 py-1 text-xs font-medium rounded-sm border border-vocl-border text-foreground/60 hover:text-vocl-primary hover:border-vocl-primary/50 transition-colors truncate"
              style={{ maxWidth: "150px" }}
            >
              #{tag.name}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="sm:hidden pl-2.5 pr-16 pt-2 pb-1">
      <div className="flex flex-row flex-wrap gap-1.5">
        {tags.map((tag) => (
          <Link
            key={tag.id}
            href={`/tag/${encodeURIComponent(tag.name)}`}
            className="px-2 py-1 text-xs font-medium rounded bg-vocl-hover text-foreground/65 truncate"
            style={{ maxWidth: "150px" }}
          >
            #{tag.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

// Tags for text posts - rendered at Post level after children (including link previews)
function TextPostTags({
  tags,
  isHovered,
  bare,
}: {
  tags: PostTag[];
  isHovered: boolean;
  bare?: boolean;
}) {
  if (tags.length === 0) return null;

  // Article mode: a quiet, always-visible tag line on the page (no gray box,
  // no hover-reveal), with a hairline rule above.
  if (bare) {
    return (
      <div className="mt-5 pt-4 border-t border-vocl-border">
        <div className="flex flex-row flex-wrap gap-2">
          {tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/tag/${encodeURIComponent(tag.name)}`}
              className="px-2.5 py-1 text-xs font-medium rounded-sm border border-vocl-border text-foreground/60 hover:text-vocl-primary hover:border-vocl-primary/50 transition-colors truncate"
              style={{ maxWidth: "180px" }}
            >
              #{tag.name}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pl-2.5 sm:pl-4 pr-16 sm:pr-20 pb-2.5 sm:pb-4">
      <div
        className={`overflow-hidden transition-all duration-150 ease-out ${
          isHovered ? "max-h-50" : "max-h-50 lg:max-h-0"
        }`}
      >
        <div className="flex flex-row flex-wrap gap-1.5 pt-3 border-t border-vocl-border">
          {tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/tag/${encodeURIComponent(tag.name)}`}
              className={`px-2 py-1 text-xs font-medium rounded bg-vocl-hover text-foreground/65 truncate transition-opacity ${
                isHovered
                  ? "opacity-80 hover:opacity-100"
                  : "opacity-100 lg:opacity-0"
              }`}
              style={{ maxWidth: "150px" }}
            >
              #{tag.name}
            </Link>
          ))}
        </div>
      </div>
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
  excludeFromPublic = false,
  autoRevealSensitive = false,
  tags = [],
  comments = [],
  likedBy = [],
  rebloggedBy = [],
  onComment,
  onLike,
  onReblog,
  onShare,
  onMenuClick,
  onCommentsExpand,
  onLikesExpand,
  onReblogsExpand,
  isCommentsLoading = false,
  isLikesLoading = false,
  isReblogsLoading = false,
  contentWarning,
  isReblog = false,
  reblogCommentHtml,
  originalAuthor,
  rebloggedFromAuthor,
  threadId,
  threadPosition,
  threadLength,
  hideHeader = false,
  bare = false,
  isLoggedIn = true,
  hideActions = false,
  kicker,
}: PostProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [voiceCountOverride, setVoiceCountOverride] = useState<number | null>(null);
  const [isReblogMenuOpen, setIsReblogMenuOpen] = useState(false);
  const [isContentRevealed, setIsContentRevealed] =
    useState(autoRevealSensitive);
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>(null);
  const [lastPanel, setLastPanel] = useState<ExpandedPanel>(null);
  const [isCWDismissed, setIsCWDismissed] = useState(false);

  // Sync auto-reveal when user profile loads asynchronously
  useEffect(() => {
    if (autoRevealSensitive && !isContentRevealed) {
      setIsContentRevealed(true);
    }
  }, [autoRevealSensitive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Memoized computed values
  const displayPanel = useMemo(
    () => expandedPanel || lastPanel,
    [expandedPanel, lastPanel],
  );
  const showNSFWOverlay = useMemo(
    () => isSensitive && !isContentRevealed,
    [isSensitive, isContentRevealed],
  );
  // On mobile (< 640px), use flat corners for edge-to-edge feel
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  const contentBorderRadius = "0";
  const articleBorderRadius = useMemo(
    () => (isMobile ? "0" : expandedPanel ? "30px 0 0 0" : "30px 0 40px 0"),
    [expandedPanel, isMobile],
  );

  const handleReblogClick = useCallback(() => {
    setIsReblogMenuOpen((prev) => {
      if (!prev) setIsHovered(false); // Clear hover when opening menu
      return !prev;
    });
    setExpandedPanel(null);
  }, []);

  const handleReblogSelect = useCallback(
    (type: "instant" | "with-comment" | "schedule" | "queue") => {
      setIsReblogMenuOpen(false);
      onReblog?.(type);
    },
    [onReblog],
  );

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

  const handleCommentSubmit = useCallback(
    (content: string) => {
      onComment?.(content);
    },
    [onComment],
  );

  const handleVoiceClick = useCallback(() => {
    if (expandedPanel === "voice") {
      setExpandedPanel(null);
      setTimeout(() => setLastPanel(null), 300);
    } else {
      setLastPanel("voice");
      setExpandedPanel("voice");
    }
    setIsReblogMenuOpen(false);
  }, [expandedPanel]);

  const voiceCount = voiceCountOverride ?? stats.voiceReactions ?? 0;

  const handleClosePanel = useCallback(() => {
    setExpandedPanel(null);
    setTimeout(() => setLastPanel(null), 300);
  }, []);

  const handleRevealContent = useCallback(() => {
    setIsContentRevealed(true);
  }, []);

  return (
    <div className={`w-full max-w-full ${bare ? "" : "sm:max-w-5xl"}`}>
      <article
        className={`relative ${bare ? "" : "overflow-hidden border-b border-vocl-border"}`}
        data-post-id={id}
        data-content-type={contentType}
      >
        {/* Editorial dateline — marks the start of each post in the single-column
            reader so consecutive posts don't read as one continuous piece. */}
        {!hideHeader && !bare && kicker && (
          <div className="px-1 sm:px-1.5 pt-3 type-meta uppercase tracking-wide text-vocl-primary font-semibold">
            {kicker}
          </div>
        )}

        {/* Header — always shows the post author (reblogger for reblogs) */}
        {!hideHeader && (
          <PostHeader
            author={author}
            timestamp={timestamp}
            onMenuClick={onMenuClick}
            reblogFrom={
              isReblog && originalAuthor ? originalAuthor.username : null
            }
            threadId={threadId}
            threadPosition={threadPosition}
            threadLength={threadLength}
            isPublic={!excludeFromPublic && !isSensitive}
          />
        )}

        {/* Content area with overlay */}
        <div
          className="relative"
          onMouseEnter={() => !isReblogMenuOpen && setIsHovered(true)}
          onMouseLeave={() => !isReblogMenuOpen && setIsHovered(false)}
        >
          {/* For reblogs: original author header + green border wrapper */}
          {isReblog && originalAuthor && (
            <div className={`overflow-hidden ${bare ? "" : "bg-transparent"}`}>
              {/* Original author mini-header */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-vocl-overlay">
                <Link
                  href={`/profile/${originalAuthor.username}`}
                  className="hover:opacity-90 transition-opacity"
                >
                  <Avatar
                    src={originalAuthor.avatarUrl || ""}
                    username={originalAuthor.username}
                    size="sm"
                  />
                </Link>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/profile/${originalAuthor.username}`}
                      className="font-display text-base font-normal text-white hover:text-vocl-primary transition-colors"
                    >
                      {originalAuthor.username}
                    </Link>
                    {originalAuthor.role !== undefined && (
                      <StaffBadge role={originalAuthor.role} size={14} />
                    )}
                  </div>
                  <TimeAgo iso={timestamp} className="-mt-1 font-sans text-[0.65rem] text-neutral-400" />
                </div>
              </div>

              {/* Original post content (no tags here — they go under the caption) */}
              <div className="relative overflow-hidden">
                <PostTagsContext.Provider
                  value={{ tags: [], isHovered: false }}
                >
                  {children}
                </PostTagsContext.Provider>
              </div>
            </div>
          )}

          {/* For non-reblogs: normal content */}
          {!isReblog && (
            <div
              className={`relative ${bare ? "" : "overflow-hidden"}`}
              style={bare ? undefined : { borderRadius: contentBorderRadius }}
            >
              <PostTagsContext.Provider value={{ tags: tags || [], isHovered }}>
                {children}
              </PostTagsContext.Provider>

              {(contentType === "image" ||
                contentType === "video" ||
                contentType === "gallery") &&
                tags &&
                tags.length > 0 && (
                  <TagsOverlay tags={tags} isVisible={isHovered} />
                )}
              {(contentType === "image" ||
                contentType === "video" ||
                contentType === "gallery") &&
                tags &&
                tags.length > 0 && <MobileTagsStrip tags={tags} bare={bare} />}
              {(contentType === "text" ||
                contentType === "poll" ||
                contentType === "ask") &&
                tags &&
                tags.length > 0 && (
                  <TextPostTags tags={tags} isHovered={isHovered} bare={bare} />
                )}
            </div>
          )}

          {/* NSFW overlay - shown when content is sensitive and not revealed */}
          {showNSFWOverlay && (
            <div
              style={{ borderRadius: contentBorderRadius }}
              className="overflow-hidden"
            >
              <NSFWOverlay onReveal={handleRevealContent} />
            </div>
          )}

          {/* Content Warning overlay */}
          {contentWarning && !isCWDismissed && !showNSFWOverlay && (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-vocl-overlay/95 backdrop-blur-sm"
              style={{ borderRadius: contentBorderRadius }}
            >
              <div className="text-center px-6 max-w-sm">
                <p className="text-foreground/60 text-xs uppercase tracking-wider mb-2">
                  Content Warning
                </p>
                <p className="text-foreground font-medium text-base mb-4">
                  {contentWarning}
                </p>
                <button
                  onClick={() => setIsCWDismissed(true)}
                  className="px-5 py-2 rounded-full bg-vocl-primary text-neutral-900 font-medium text-sm hover:brightness-110 transition-all"
                >
                  Show Content
                </button>
              </div>
            </div>
          )}

          {/* Dark overlay - only covers content, not header or action bar */}
          <div
            onClick={handleOverlayClick}
            className={`absolute inset-0 bg-black/60 transition-all duration-300 ${
              isReblogMenuOpen
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none opacity-0"
            } z-30`}
            aria-hidden="true"
          />

          {/* Reblog caption — shown below original content */}
          {isReblog && reblogCommentHtml && (
            <div className={bare ? "mt-4" : "px-2 pt-2.5 pb-2.5 sm:p-2 sm:pb-4"}>
              <div
                className={
                  bare
                    ? "type-meta uppercase tracking-widest text-vocl-primary font-semibold mb-1"
                    : "bg-vocl-overlay p-2 font-display text-sm text-neutral-50"
                }
              >
                {author.username}{" "}
                <span className={bare ? "text-foreground/45" : "font-sans text-xs text-neutral-400"}>
                  commented:
                </span>
              </div>
              <div
                className={
                  bare
                    ? "font-serif text-lg leading-relaxed text-foreground/90 max-w-none [&_p]:my-2 [&_a]:text-vocl-primary [&_a]:underline"
                    : "font-sans text-base leading-relaxed text-foreground/90 prose prose-sm max-w-none prose-p:my-2 prose-p:first:mt-0 prose-p:last:mb-0 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_p:empty]:before:content-['\\00a0']"
                }
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtmlWithSafeLinks(reblogCommentHtml),
                }}
              />
            </div>
          )}

          {/* Reblog tags — shown under the caption, not under the original content */}
          {isReblog && (
            <PostTagsContext.Provider value={{ tags: tags || [], isHovered }}>
              {(contentType === "image" ||
                contentType === "video" ||
                contentType === "gallery") &&
                tags &&
                tags.length > 0 && (
                  <TagsOverlay tags={tags} isVisible={isHovered} />
                )}
              {(contentType === "image" ||
                contentType === "video" ||
                contentType === "gallery") &&
                tags &&
                tags.length > 0 && <MobileTagsStrip tags={tags} bare={bare} />}
              {tags && tags.length > 0 && (
                <TextPostTags tags={tags} isHovered={isHovered} bare={bare} />
              )}
            </PostTagsContext.Provider>
          )}
        </div>

        {/* Radial FAB Menu + action bar — hidden when engagement is rendered elsewhere */}
        {!hideActions && (
          <>
            <ReblogFabMenu
              isOpen={isReblogMenuOpen}
              onSelect={handleReblogSelect}
            />

            {/* Action bar - always visible, never dimmed */}
            <PostActionBar
              stats={stats}
              interactions={interactions}
              isReblogMenuOpen={isReblogMenuOpen}
              expandedPanel={expandedPanel}
              voiceCount={voiceCount}
              bare={bare}
              onCommentClick={handleCommentClick}
              onLike={onLike}
              onLikesClick={handleLikesClick}
              onVoiceClick={handleVoiceClick}
              onReblogsClick={handleReblogsClick}
              onReblogClick={handleReblogClick}
            />
          </>
        )}

        {/* Fake Border */}
        {!bare && (
          <div
            className={`pointer-events-none absolute top-0 right-0 bottom-0 left-0 border-0 md:border-6 border-transparent z-40`}
            style={{
              borderRadius: articleBorderRadius,
            }}
          ></div>
        )}
      </article>

      {/* Expanded Panel - OUTSIDE article, below action bar */}
      {!hideActions && (
      <div
        className={`overflow-hidden ${bare ? "" : "bg-vocl-surface-dark shadow-lg"}`}
        style={{
          maxHeight: expandedPanel ? "384px" : "0px",
          opacity: expandedPanel ? 1 : 0,
          transition: "max-height 300ms ease-out, opacity 200ms ease-out",
          borderRadius: bare ? "0" : isMobile ? "0" : "0 0 20px 20px",
          marginTop: "0px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {displayPanel === "voice" ? (
          <VoiceReactionsPanel
            postId={id}
            isLoggedIn={isLoggedIn}
            onCountChange={setVoiceCountOverride}
          />
        ) : (
          displayPanel && (
            <ExpandedPanel
              type={displayPanel}
              postId={id}
              comments={comments}
              likedBy={likedBy}
              rebloggedBy={rebloggedBy}
              onCommentSubmit={handleCommentSubmit}
              onClose={handleClosePanel}
              isLoading={
                (displayPanel === "comments" && isCommentsLoading) ||
                (displayPanel === "likes" && isLikesLoading) ||
                (displayPanel === "reblogs" && isReblogsLoading)
              }
            />
          )
        )}
      </div>
      )}
    </div>
  );
});

// =============================================================================
// Content Components for different post types
// =============================================================================

interface ImageContentProps {
  src: string;
  alt: string;
  caption?: string;
  priority?: boolean;
  /** Broadsheet article mode: serif figcaption, no card box. */
  article?: boolean;
  /** Break the hero out to the full viewport. Only safe when the reading column
   *  is viewport-centered (the logged-out reading view, no sidebar). */
  fullBleed?: boolean;
}

// Clamp aspect ratio between 4:5 (portrait) and 2:1 (landscape)
const MIN_ASPECT = 2 / 3; // 0.667 — allow taller portraits to breathe
const MAX_ASPECT = 2 / 1; // 2.0

export function ImageContent({ src, alt, caption, priority, article, fullBleed }: ImageContentProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      const natural = img.naturalWidth / img.naturalHeight;
      setAspectRatio(Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, natural)));
    }
  };

  // Broadsheet article: full-bleed hero image that breaks out of the reading
  // column, capped in height, with a serif italic figcaption on the page.
  if (article) {
    return (
      <figure className="my-6">
        <div
          className={`relative cursor-pointer overflow-hidden bg-vocl-hover max-h-[78vh] ${
            fullBleed ? "left-1/2 right-1/2 -mx-[50vw] w-screen max-w-[100vw]" : "w-full"
          }`}
          style={aspectRatio ? { aspectRatio: `${aspectRatio}` } : { aspectRatio: "16 / 9" }}
          onClick={() => setLightboxOpen(true)}
        >
          <Image
            src={src}
            alt={alt}
            fill
            sizes="100vw"
            priority={!!priority}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            className="object-cover"
            onLoad={handleImageLoad}
          />
        </div>
        {caption && (
          <figcaption
            className="mx-auto max-w-2xl px-4 pt-3 font-serif italic text-sm text-foreground/55 text-center [&_*]:inline"
            dangerouslySetInnerHTML={{ __html: sanitizeHtmlWithSafeLinks(caption) }}
          />
        )}
        <ImageLightbox
          images={[src]}
          currentIndex={0}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onNavigate={() => {}}
          alt={alt}
        />
      </figure>
    );
  }

  return (
    <>
      <div
        className="relative w-full cursor-pointer overflow-hidden bg-vocl-hover"
        style={
          aspectRatio ? { aspectRatio: `${aspectRatio}` } : { aspectRatio: "1" }
        }
        onClick={() => setLightboxOpen(true)}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, 600px"
          priority={!!priority}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          className="object-cover hover:brightness-75 transition-all"
          onLoad={handleImageLoad}
        />
      </div>

      {caption && (
        <div
          className="px-2.5 pt-2.5 pb-2.5 sm:p-4 text-foreground/75 max-w-none [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_ul]:my-2 [&_ol]:my-2 [&_p:empty]:before:content-['\00a0']"
          dangerouslySetInnerHTML={{ __html: sanitizeHtmlWithSafeLinks(caption) }}
        />
      )}

      <ImageLightbox
        images={[src]}
        currentIndex={0}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={() => {}}
        alt={alt}
      />
    </>
  );
}

interface TextContentProps {
  children?: ReactNode;
  html?: string;
  isEssay?: boolean;
  essayTitle?: string;
  readingTimeMinutes?: number;
  /** Broadsheet article mode: boxless serif body + drop cap, on the page. */
  article?: boolean;
}

export function TextContent({ children, html, isEssay, essayTitle, readingTimeMinutes, article }: TextContentProps) {
  // Broadsheet article: the body flows directly on the page in serif, with a
  // drop cap on the opening paragraph. No card/box — title is in the masthead.
  if (article) {
    const body =
      "font-serif text-lg sm:text-xl leading-[1.75] text-foreground/90 max-w-none " +
      "[&_p]:mb-5 [&_a]:text-vocl-primary [&_a]:underline [&_a]:underline-offset-2 " +
      "[&_strong]:text-foreground [&_strong]:font-semibold [&_em]:italic " +
      "[&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3 " +
      "[&_h3]:font-display [&_h3]:text-xl [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 " +
      "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-5 " +
      "[&_blockquote]:border-l-4 [&_blockquote]:border-vocl-primary [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-foreground/70 [&_blockquote]:my-6 " +
      "[&_p:empty]:min-h-[1em]";
    const dropcap =
      "[&>p:first-of-type]:first-letter:float-left [&>p:first-of-type]:first-letter:font-display " +
      "[&>p:first-of-type]:first-letter:text-[3.4rem] [&>p:first-of-type]:first-letter:leading-[0.8] " +
      "[&>p:first-of-type]:first-letter:pr-2 [&>p:first-of-type]:first-letter:mt-1 " +
      "[&>p:first-of-type]:first-letter:font-bold [&>p:first-of-type]:first-letter:text-vocl-primary";
    return html ? (
      <div
        className={`${body} ${dropcap}`}
        dangerouslySetInnerHTML={{ __html: sanitizeHtmlWithSafeLinks(html) }}
      />
    ) : (
      <div className={`${body} whitespace-pre-wrap`}>{children}</div>
    );
  }

  const postTags = usePostTags();
  const tags = postTags?.tags || [];
  const isHovered = postTags?.isHovered || false;

  if (isEssay) {
    return (
      <div className="px-3 pt-4 pb-4 sm:px-6 sm:py-6">
        {(essayTitle || readingTimeMinutes) && (
          <div className="mb-4 pb-3 border-b border-vocl-border">
            {essayTitle && (
              <h2 className="font-display text-2xl sm:text-3xl text-foreground mb-1.5 leading-tight">
                {essayTitle}
              </h2>
            )}
            <p className="text-xs text-foreground/55 inline-flex items-center gap-1.5">
              <span className="font-medium text-vocl-primary">Story</span>
              {readingTimeMinutes ? <span>· {readingTimeMinutes} min read</span> : null}
            </p>
          </div>
        )}
        {html ? (
          <div
            className="font-serif text-base sm:text-lg leading-relaxed text-foreground/90 max-w-none [&_p]:my-4 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_ul]:my-4 [&_ol]:my-4 [&_li]:my-1.5 [&_blockquote]:border-l-4 [&_blockquote]:border-vocl-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4 [&_p:empty]:min-h-[1em] [&_p:empty]:before:content-['\00a0']"
            dangerouslySetInnerHTML={{ __html: sanitizeHtmlWithSafeLinks(html) }}
          />
        ) : (
          <div className="font-serif text-base sm:text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-2.5 pt-2.5 pb-2.5 sm:p-4">
      {html ? (
        <div
          className="font-sans text-base leading-relaxed text-foreground/90 max-w-none [&_p]:my-3 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_ul]:my-3 [&_ol]:my-3 [&_li]:my-1 [&_p:empty]:min-h-[1em] [&_p:empty]:before:content-['\00a0']"
          dangerouslySetInnerHTML={{ __html: sanitizeHtmlWithSafeLinks(html) }}
        />
      ) : (
        <div className="font-sans text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
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
