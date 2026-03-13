"use client";

import { IconArrowsExchange } from "@tabler/icons-react";

interface MutualBadgeProps {
  size?: number;
  className?: string;
}

export function MutualBadge({ size = 14, className = "" }: MutualBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs text-vocl-accent font-medium ${className}`}
      title="You follow each other"
    >
      <IconArrowsExchange size={size} />
      <span>Mutuals</span>
    </span>
  );
}
