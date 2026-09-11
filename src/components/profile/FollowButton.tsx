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
    sm: "px-3 py-1.5 text-[11px] gap-1.5",
    md: "px-4 py-2 text-xs gap-2",
    lg: "px-5 py-2.5 text-xs gap-2",
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
        className={`flex items-center justify-center border transition-colors disabled:opacity-50 ${
          sizeClasses[size]
        } ${
          isFollowing
            ? isHovering
              ? "border-vocl-like text-vocl-like"
              : "border-vocl-border text-meta"
            : "border-accent text-accent hover:bg-accent/10"
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
      className={`flex items-center justify-center font-sans font-medium uppercase tracking-[0.16em] transition-opacity disabled:opacity-50 ${
        sizeClasses[size]
      } ${
        isFollowing
          ? isHovering
            ? "border border-vocl-like text-vocl-like"
            : "border border-foreground text-foreground hover:bg-vocl-hover"
          : "bg-accent text-white hover:opacity-[0.88]"
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
