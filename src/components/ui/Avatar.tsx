"use client";

import Image from "next/image";
import { useState } from "react";

interface AvatarProps {
  src?: string | null;
  username: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  xs: "w-6 h-6 text-xs",
  sm: "w-9 h-9 text-lg",
  md: "w-10 h-10 text-lg",
  lg: "w-12 h-12 text-xl",
  xl: "w-16 h-16 text-2xl",
  "2xl": "w-24 h-24 text-3xl",
};

const sizePx = {
  xs: 24,
  sm: 36, // Matches w-9 (36px)
  md: 40,
  lg: 48,
  xl: 64,
  "2xl": 96,
};

export function Avatar({
  src,
  username,
  size = "md",
  className = "",
  onClick,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const showFallback = !src || imageError;
  const firstLetter = username.charAt(0).toUpperCase();

  // Broadsheet: avatars are SQUARE (radius 0), never circular.
  const baseClasses = `rounded-none overflow-hidden flex-shrink-0 ${sizeClasses[size]} ${className}`;
  const clickableClasses = onClick ? "cursor-pointer hover:opacity-90" : "";

  if (showFallback) {
    return (
      <div
        className={`${baseClasses} bg-panel ${clickableClasses} flex items-center justify-center font-display text-ink transition-opacity`}
        onClick={onClick}
        role={onClick ? "button" : undefined}
      >
        {firstLetter}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${clickableClasses} relative bg-panel`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <Image
        src={src}
        alt={`@${username}`}
        // Request ~2× the display size and high quality so avatars stay crisp
        // on high-DPI screens (the CSS box still shows them at their true size).
        width={sizePx[size] * 2}
        height={sizePx[size] * 2}
        quality={90}
        className="object-cover w-full h-full"
        onError={() => setImageError(true)}
      />
    </div>
  );
}
