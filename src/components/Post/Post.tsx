"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
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
} from "@tabler/icons-react";
import { NSFWOverlay } from "./NSFWOverlay";

// =============================================================================
// Types
// =============================================================================
export type PostContentType = "image" | "text" | "video" | "audio" | "gallery";
export interface PostAuthor {
  username: string;
  avatarUrl: string;
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
export interface PostProps {
  id: string;
  author: PostAuthor;
  timestamp: string;
  contentType: PostContentType;
  children: ReactNode; // The actual content (image, text, video, etc.)
  stats: PostStats;
  interactions: PostInteractions;
  isSensitive?: boolean; // NSFW content flag
  onComment?: () => void;
  onLike?: () => void;
  onReblog?: (type: "instant" | "with-comment" | "schedule" | "queue") => void;
  onMenuClick?: () => void;
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
      className="flex items-center justify-between p-3 sm:p-4 z-50"
      style={{ backgroundColor: "#EBEBEB", borderRadius: "45px 45px 0 0" }}
    >
      <div className="flex items-center gap-3">
        <div className="relative h-14 sm:h-16 w-14 sm:w-16 overflow-hidden rounded-full">
          <Image
            src={author.avatarUrl}
            alt={author.username}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex flex-col">
          <span className="font-display text-base sm:text-lg font-normal text-neutral-900">
            {author.username}
          </span>
          <span className="-mt-1 font-sans text-xs sm:text-sm text-neutral-400">{timestamp}</span>
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
  onComment?: () => void;
  onLike?: () => void;
  onReblogClick: () => void;
}

function PostActionBar({
  stats,
  interactions,
  isReblogMenuOpen,
  onComment,
  onLike,
  onReblogClick,
}: PostActionBarProps) {
  return (
    <div
      className={`absolute right-0 bottom-0 left-0 flex items-center justify-between pt-3 sm:pt-2.5 pr-21 sm:pr-22 pb-5 sm:pb-5 pl-6 sm:pl-8`}
      style={{ backgroundColor: "rgba(19, 19, 19, 0.9)", borderRadius: "0 0 50px 50px" }}
    >
      {/* Comment button */}
      <button
        onClick={onComment}
        className={`cursor-pointer flex items-center gap-1 sm:gap-2 transition-colors`}
        aria-label={`${stats.comments} comments`}
      >
        {interactions.hasCommented ? (
          <IconMessageFilled size={24} className="text-vocl-comment" />
        ) : (
          <IconMessage size={24} className="text-neutral-400" />
        )}
        <span
          className={`font-sans text-sm ${
            interactions.hasCommented ? "text-vocl-comment" : "text-neutral-400"
          }`}
        >
          {stats.comments}
        </span>
      </button>

      {/* Like button */}
      <button
        onClick={onLike}
        className={`cursor-pointer flex items-center gap-1 sm:gap-2 transition-colors`}
        aria-label={`${stats.likes} likes`}
      >
        {interactions.hasLiked ? (
          <IconHeartFilled size={24} className="text-vocl-like" />
        ) : (
          <IconHeart size={24} className="text-neutral-400" />
        )}
        <span
          className={`font-sans text-sm ${
            interactions.hasLiked ? "text-vocl-like" : "text-neutral-400"
          }`}
        >
          {stats.likes}
        </span>
      </button>

      {/* Reblog count */}
        <span className={`font-sans text-sm font-medium ${interactions.hasReblogged ? "text-vocl-reblog" : "text-neutral-400"}`}>
            {stats.reblogs}
          </span>

      {/* Reblog button */}
      <button
          onClick={onReblogClick}
          className={`absolute right-0 bottom-0 w-18 sm:w-20 h-18 sm:h-20 rounded-full shadow-lg transition-all duration-300 ${
              isReblogMenuOpen
                  ? "bg-vocl-accent scale-105"
                  : "bg-vocl-accent hover:scale-105"
          } z-50`}
          aria-label="Reblog options"
          aria-expanded={isReblogMenuOpen}
      >
        <div className="hidden sm:flex items-center justify-center">
          {isReblogMenuOpen ? (
              <IconBolt size={60} stroke={1.5} className="text-neutral-900" />
          ) : (
              <IconRefresh size={60} stroke={1.5} className="text-neutral-900" />
          )}
        </div>

        <div className="flex sm:hidden items-center justify-center">
          {isReblogMenuOpen ? (
              <IconBolt size={55} stroke={1.5} className="text-neutral-900" />
          ) : (
              <IconRefresh size={55} stroke={1.5} className="text-neutral-900" />
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
// Main Post Component
// =============================================================================
export function Post({
  id,
  author,
  timestamp,
  contentType,
  children,
  stats,
  interactions,
  isSensitive = false,
  onComment,
  onLike,
  onReblog,
  onMenuClick,
}: PostProps) {
  const [isReblogMenuOpen, setIsReblogMenuOpen] = useState(false);
  const [isContentRevealed, setIsContentRevealed] = useState(false);

  // Determine if NSFW overlay should be shown
  const showNSFWOverlay = isSensitive && !isContentRevealed;

  const handleReblogClick = () => {
    setIsReblogMenuOpen(!isReblogMenuOpen);
  };

  const handleReblogSelect = (type: "instant" | "with-comment" | "schedule" | "queue") => {
    setIsReblogMenuOpen(false);
    onReblog?.(type);
  };

  const handleOverlayClick = () => {
    if (isReblogMenuOpen) {
      setIsReblogMenuOpen(false);
    }
  };

  return (
    <article
      className="relative w-full max-w-full sm:max-w-sm shadow-xl overflow-hidden"
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
          borderRadius: "0 0 50px 50px"
        }}>{children}</div>

        {/* NSFW overlay - shown when content is sensitive and not revealed */}
        {showNSFWOverlay && (
          <div style={{ borderRadius: "0 0 42px 42px" }} className="overflow-hidden">
            <NSFWOverlay onReveal={() => setIsContentRevealed(true)} />
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
        onComment={onComment}
        onLike={onLike}
        onReblogClick={handleReblogClick}
      />
      
      {/* Fake Border */}
      <div className={`pointer-events-none absolute top-0 right-0 bottom-0 left-0 border-8 sm:border-10 border-[#EBEBEB] z-40`} style={{
        borderRadius: "50px",
      }}></div>
    </article>
  );
}

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
  children: ReactNode;
}

export function TextContent({ children }: TextContentProps) {
  return (
    <div className="p-4 pb-22 bg-[#EBEBEB]">
      <div className="font-sans text-base leading-relaxed  text-neutral-700">
        {children}
      </div>
    </div>
  );
}

// TODO: Implement VideoContent component for video posts
// TODO: Implement AudioContent component for audio posts
// TODO: Implement GalleryContent component for multi-image posts

// =============================================================================
// Export
// =============================================================================

export default Post;
