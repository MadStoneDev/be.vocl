"use client";

import { IconRosetteDiscountCheckFilled } from "@tabler/icons-react";

interface VerificationBadgeProps {
  size?: number;
  className?: string;
}

export function VerificationBadge({
  size = 16,
  className = "",
}: VerificationBadgeProps) {
  return (
    <span
      className={`inline-flex items-center ${className}`}
      title="Verified"
      aria-label="Verified user"
    >
      <IconRosetteDiscountCheckFilled
        size={size}
        className="text-vocl-accent"
      />
    </span>
  );
}
