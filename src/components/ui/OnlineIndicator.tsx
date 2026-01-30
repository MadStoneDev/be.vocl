"use client";

import { cn } from "@/lib/utils";

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  showOffline?: boolean;
}

/**
 * A small dot indicator showing online/offline status
 */
export function OnlineIndicator({
  isOnline,
  size = "md",
  className,
  showOffline = false,
}: OnlineIndicatorProps) {
  // Don't render if offline and showOffline is false
  if (!isOnline && !showOffline) {
    return null;
  }

  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
  };

  return (
    <span
      className={cn(
        "rounded-full border-2 border-background",
        sizeClasses[size],
        isOnline ? "bg-green-500" : "bg-gray-400",
        className
      )}
      title={isOnline ? "Online" : "Offline"}
    />
  );
}
