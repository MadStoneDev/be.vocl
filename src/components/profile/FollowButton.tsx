"use client";

import { useState } from "react";
import { IconUserPlus, IconUserMinus, IconLoader2 } from "@tabler/icons-react";

interface FollowButtonProps {
  isFollowing: boolean;
  onFollow: () => Promise<void>;
  onUnfollow: () => Promise<void>;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "minimal";
}

export function FollowButton({
  isFollowing,
  onFollow,
  onUnfollow,
  size = "md",
  variant = "default",
}: FollowButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      if (isFollowing) {
        await onUnfollow();
      } else {
        await onFollow();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-base gap-2",
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  if (variant === "minimal") {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={`flex items-center justify-center rounded-full transition-all disabled:opacity-50 ${
          sizeClasses[size]
        } ${
          isFollowing
            ? isHovering
              ? "bg-vocl-like/20 text-vocl-like"
              : "bg-vocl-hover-strong text-foreground/70"
            : "bg-vocl-primary/20 text-vocl-primary hover:bg-vocl-primary/30"
        }`}
      >
        {isLoading ? (
          <IconLoader2 size={iconSizes[size]} className="animate-spin" />
        ) : isFollowing ? (
          isHovering ? (
            <IconUserMinus size={iconSizes[size]} />
          ) : (
            <IconUserMinus size={iconSizes[size]} />
          )
        ) : (
          <IconUserPlus size={iconSizes[size]} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`flex items-center justify-center rounded-xl font-semibold transition-all disabled:opacity-50 ${
        sizeClasses[size]
      } ${
        isFollowing
          ? isHovering
            ? "bg-vocl-like/20 text-vocl-like border border-vocl-like/30"
            : "bg-vocl-hover-strong text-foreground border border-vocl-border hover:border-vocl-like/30"
          : "bg-vocl-primary text-white hover:bg-vocl-primary-hover shadow-lg shadow-vocl-primary/25"
      }`}
    >
      {isLoading ? (
        <IconLoader2 size={iconSizes[size]} className="animate-spin" />
      ) : isFollowing ? (
        <>
          <IconUserMinus size={iconSizes[size]} />
          <span>{isHovering ? "Unfollow" : "Following"}</span>
        </>
      ) : (
        <>
          <IconUserPlus size={iconSizes[size]} />
          <span>Follow</span>
        </>
      )}
    </button>
  );
}
