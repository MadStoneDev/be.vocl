"use client";

import { useState, useRef, useEffect } from "react";
import {
  IconPencil,
  IconTrash,
  IconFlag,
  IconLink,
  IconPin,
  IconPinFilled,
  IconVolume,
  IconVolumeOff,
  IconUserMinus,
  IconUserPlus,
  IconCheck,
  IconAlertTriangle,
  IconBookmark,
  IconBookmarkFilled,
  IconBell,
  IconBellOff,
  IconShare,
  IconHash,
  IconMessagePlus,
} from "@tabler/icons-react";

interface PostMenuProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  isOwn: boolean;
  isPinned?: boolean;
  authorUsername?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  onMute?: () => void;
  isFollowingAuthor?: boolean;
  onFollowToggle?: () => void;
  onFlagPost?: () => void;
  onReportUser?: () => void;
  isBookmarked?: boolean;
  onBookmark?: () => void;
  isNotificationMuted?: boolean;
  onMuteNotifications?: () => void;
  onShare?: () => void;
  tags?: Array<{ id: string; name: string }>;
  onMuteTag?: (tagId: string, tagName: string) => void;
  onContinueThread?: () => void;
}

export function PostMenu({
  postId,
  isOpen,
  onClose,
  isOwn,
  isPinned = false,
  authorUsername,
  onEdit,
  onDelete,
  onPin,
  onMute,
  isFollowingAuthor = false,
  onFollowToggle,
  onFlagPost,
  onReportUser,
  isBookmarked = false,
  onBookmark,
  isNotificationMuted = false,
  onMuteNotifications,
  onShare,
  tags = [],
  onMuteTag,
  onContinueThread,
}: PostMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/post/${postId}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu */}
      <div
        ref={menuRef}
        className="absolute right-2 top-14 z-50 min-w-[200px] rounded-xl bg-vocl-surface-dark shadow-xl border border-white/10 py-1 overflow-hidden"
        role="menu"
        aria-orientation="vertical"
      >
        {/* Copy Link */}
        <button
          onClick={handleCopyLink}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 transition-colors"
          role="menuitem"
        >
          {copied ? (
            <>
              <IconCheck size={18} className="text-vocl-accent" />
              <span className="text-vocl-accent">Link copied!</span>
            </>
          ) : (
            <>
              <IconLink size={18} />
              <span>Copy link</span>
            </>
          )}
        </button>

        {/* Share */}
        {onShare && (
          <button
            onClick={() => {
              onShare();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 transition-colors"
            role="menuitem"
          >
            <IconShare size={18} />
            <span>Share</span>
          </button>
        )}

        {/* Bookmark */}
        <button
          onClick={() => {
            onBookmark?.();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 transition-colors"
          role="menuitem"
        >
          {isBookmarked ? (
            <>
              <IconBookmarkFilled size={18} className="text-vocl-accent" />
              <span>Remove bookmark</span>
            </>
          ) : (
            <>
              <IconBookmark size={18} />
              <span>Bookmark</span>
            </>
          )}
        </button>

        {isOwn ? (
          <>
            {/* Pin Post */}
            <button
              onClick={() => {
                onPin?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 transition-colors"
              role="menuitem"
            >
              {isPinned ? (
                <>
                  <IconPinFilled size={18} className="text-vocl-accent" />
                  <span>Unpin from profile</span>
                </>
              ) : (
                <>
                  <IconPin size={18} />
                  <span>Pin to profile</span>
                </>
              )}
            </button>

            {/* Mute Notifications */}
            <button
              onClick={() => {
                onMuteNotifications?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 transition-colors"
              role="menuitem"
            >
              {isNotificationMuted ? (
                <>
                  <IconBell size={18} className="text-vocl-accent" />
                  <span>Unmute notifications</span>
                </>
              ) : (
                <>
                  <IconBellOff size={18} />
                  <span>Mute notifications</span>
                </>
              )}
            </button>

            {/* Continue Thread */}
            {onContinueThread && (
              <button
                onClick={() => {
                  onContinueThread();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 transition-colors"
                role="menuitem"
              >
                <IconMessagePlus size={18} />
                <span>Continue thread</span>
              </button>
            )}

            {/* Edit Post */}
            <button
              onClick={() => {
                onEdit?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 transition-colors"
              role="menuitem"
            >
              <IconPencil size={18} />
              <span>Edit post</span>
            </button>

            {/* Divider */}
            <div className="h-px bg-white/10 my-1" />

            {/* Delete Post */}
            <button
              onClick={() => {
                onDelete?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-vocl-like hover:bg-vocl-like/10 transition-colors"
              role="menuitem"
            >
              <IconTrash size={18} />
              <span>Delete post</span>
            </button>
          </>
        ) : (
          <>
            {/* Mute User */}
            <button
              onClick={() => {
                onMute?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 transition-colors"
              role="menuitem"
            >
              <IconVolumeOff size={18} />
              <span>Mute @{authorUsername}</span>
            </button>

            {/* Follow/Unfollow User */}
            <button
              onClick={() => {
                onFollowToggle?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 transition-colors"
              role="menuitem"
            >
              {isFollowingAuthor ? (
                <>
                  <IconUserMinus size={18} />
                  <span>Unfollow @{authorUsername}</span>
                </>
              ) : (
                <>
                  <IconUserPlus size={18} />
                  <span>Follow @{authorUsername}</span>
                </>
              )}
            </button>

            {/* Mute Tags */}
            {tags.length > 0 && onMuteTag && (
              <>
                {tags.slice(0, 3).map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      onMuteTag(tag.id, tag.name);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 transition-colors"
                    role="menuitem"
                  >
                    <IconHash size={18} />
                    <span>Mute #{tag.name}</span>
                  </button>
                ))}
              </>
            )}

            {/* Divider */}
            <div className="h-px bg-white/10 my-1" />

            {/* Flag Post */}
            <button
              onClick={() => {
                onFlagPost?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-amber-500 hover:bg-amber-500/10 transition-colors"
              role="menuitem"
            >
              <IconFlag size={18} />
              <span>Flag post</span>
            </button>

            {/* Report User */}
            <button
              onClick={() => {
                onReportUser?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-vocl-like hover:bg-vocl-like/10 transition-colors"
              role="menuitem"
            >
              <IconAlertTriangle size={18} />
              <span>Report @{authorUsername}</span>
            </button>
          </>
        )}
      </div>
    </>
  );
}
