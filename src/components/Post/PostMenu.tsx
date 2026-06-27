"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
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
  IconCode,
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
  /** Bounding rect of the trigger button, so the portaled menu can anchor to it. */
  anchorRect?: DOMRect | null;
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
  anchorRect,
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

  const [embedCopied, setEmbedCopied] = useState(false);

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

  const handleCopyEmbed = async () => {
    try {
      const src = `${window.location.origin}/embed/${postId}`;
      const snippet = `<iframe src="${src}" width="600" height="500" frameborder="0" scrolling="no" allowtransparency="true" style="max-width:100%;border:0"></iframe>`;
      await navigator.clipboard.writeText(snippet);
      setEmbedCopied(true);
      setTimeout(() => {
        setEmbedCopied(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Failed to copy embed:", err);
    }
  };

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  // Anchor the menu to the trigger button. Portaled to <body> so it escapes the
  // feed item's content-visibility containment (which was clipping it).
  const menuStyle: CSSProperties = anchorRect
    ? {
        position: "fixed",
        top: anchorRect.bottom + 6,
        right: Math.max(8, window.innerWidth - anchorRect.right),
      }
    : { position: "fixed", top: 64, right: 8 };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu */}
      <div
        ref={menuRef}
        style={menuStyle}
        className="z-[61] min-w-[200px] max-h-[80vh] overflow-y-auto rounded-xl bg-vocl-surface-dark shadow-xl border border-vocl-border py-1"
        role="menu"
        aria-orientation="vertical"
      >
        {/* Copy Link */}
        <button
          onClick={handleCopyLink}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-vocl-hover-strong transition-colors"
          role="menuitem"
        >
          {copied ? (
            <>
              <IconCheck size={18} className="text-vocl-primary" />
              <span className="text-vocl-primary">Link copied!</span>
            </>
          ) : (
            <>
              <IconLink size={18} />
              <span>Copy link</span>
            </>
          )}
        </button>

        {/* Embed */}
        <button
          onClick={handleCopyEmbed}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-vocl-hover-strong transition-colors"
          role="menuitem"
        >
          {embedCopied ? (
            <>
              <IconCheck size={18} className="text-vocl-primary" />
              <span className="text-vocl-primary">Embed code copied!</span>
            </>
          ) : (
            <>
              <IconCode size={18} />
              <span>Copy embed code</span>
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
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-vocl-hover-strong transition-colors"
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
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-vocl-hover-strong transition-colors"
          role="menuitem"
        >
          {isBookmarked ? (
            <>
              <IconBookmarkFilled size={18} className="text-vocl-primary" />
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
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-vocl-hover-strong transition-colors"
              role="menuitem"
            >
              {isPinned ? (
                <>
                  <IconPinFilled size={18} className="text-vocl-primary" />
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
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-vocl-hover-strong transition-colors"
              role="menuitem"
            >
              {isNotificationMuted ? (
                <>
                  <IconBell size={18} className="text-vocl-primary" />
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
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-vocl-hover-strong transition-colors"
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
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-vocl-hover-strong transition-colors"
              role="menuitem"
            >
              <IconPencil size={18} />
              <span>Edit post</span>
            </button>

            {/* Divider */}
            <div className="h-px bg-vocl-border my-1" />

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
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-vocl-hover-strong transition-colors"
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
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-vocl-hover-strong transition-colors"
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
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:bg-vocl-hover-strong transition-colors"
                    role="menuitem"
                  >
                    <IconHash size={18} />
                    <span>Mute #{tag.name}</span>
                  </button>
                ))}
              </>
            )}

            {/* Divider */}
            <div className="h-px bg-vocl-border my-1" />

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
    </>,
    document.body
  );
}
