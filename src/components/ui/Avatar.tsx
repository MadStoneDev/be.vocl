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
  sm: 36,  // Matches w-9 (36px)
  md: 40,
  lg: 48,
  xl: 64,
  "2xl": 96,
};

// Generate a consistent color based on username
function getAvatarColor(username: string): string {
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
  ];

  // Simple hash based on username
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

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
  const bgColor = getAvatarColor(username);

  const baseClasses = `rounded-full overflow-hidden flex-shrink-0 ${sizeClasses[size]} ${className}`;
  const clickableClasses = onClick ? "cursor-pointer hover:opacity-90" : "";

  if (showFallback) {
    return (
      <div
        className={`${baseClasses} bg-background hover:bg-vocl-accent ${clickableClasses} flex items-center justify-center font-semibold text-white transition-all`}
        onClick={onClick}
        role={onClick ? "button" : undefined}
      >
        {firstLetter}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${clickableClasses} relative bg-vocl-surface-dark`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <Image
        src={src}
        alt={`@${username}`}
        width={sizePx[size]}
        height={sizePx[size]}
        className="object-cover w-full h-full"
        onError={() => setImageError(true)}
      />
    </div>
  );
}
