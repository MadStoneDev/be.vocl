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
  IconCheck,
  IconAlertTriangle,
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
  onUnfollow?: () => void;
  onFlagPost?: () => void;
  onReportUser?: () => void;
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
  onUnfollow,
  onFlagPost,
  onReportUser,
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
        className="absolute right-2 top-14 z-50 min-w-[200px] rounded-xl bg-white shadow-xl border border-neutral-200 py-1 overflow-hidden"
        role="menu"
        aria-orientation="vertical"
      >
        {/* Copy Link */}
        <button
          onClick={handleCopyLink}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
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

        {isOwn ? (
          <>
            {/* Pin Post */}
            <button
              onClick={() => {
                onPin?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
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

            {/* Edit Post */}
            <button
              onClick={() => {
                onEdit?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
              role="menuitem"
            >
              <IconPencil size={18} />
              <span>Edit post</span>
            </button>

            {/* Divider */}
            <div className="h-px bg-neutral-200 my-1" />

            {/* Delete Post */}
            <button
              onClick={() => {
                onDelete?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-vocl-like hover:bg-red-50 transition-colors"
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
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
              role="menuitem"
            >
              <IconVolumeOff size={18} />
              <span>Mute @{authorUsername}</span>
            </button>

            {/* Unfollow User */}
            <button
              onClick={() => {
                onUnfollow?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
              role="menuitem"
            >
              <IconUserMinus size={18} />
              <span>Unfollow @{authorUsername}</span>
            </button>

            {/* Divider */}
            <div className="h-px bg-neutral-200 my-1" />

            {/* Flag Post */}
            <button
              onClick={() => {
                onFlagPost?.();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors"
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
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-vocl-like hover:bg-red-50 transition-colors"
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
