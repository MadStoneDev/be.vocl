"use client";

import { useEffect, useCallback } from "react";
import Image from "next/image";
import { IconX } from "@tabler/icons-react";

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  avatarUrl?: string;
  username: string;
}

export function AvatarModal({ isOpen, onClose, avatarUrl, username }: AvatarModalProps) {
  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`${username}'s profile picture`}
    >
      {/* Backdrop - tap to close */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        aria-label="Close"
      >
        <IconX size={24} />
      </button>

      {/* Avatar container - tap to close */}
      <div
        className="relative z-10 w-[90vw] max-w-md aspect-square animate-in zoom-in-95 duration-200"
        onClick={onClose}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`${username}'s profile picture`}
            fill
            className="object-cover rounded-2xl shadow-2xl"
            sizes="(max-width: 768px) 90vw, 448px"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-vocl-accent to-vocl-accent-hover rounded-2xl flex items-center justify-center shadow-2xl">
            <span className="text-8xl sm:text-9xl font-bold text-white">
              {username.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
