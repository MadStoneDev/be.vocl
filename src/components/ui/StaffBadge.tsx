"use client";

import { IconShieldCheckFilled } from "@tabler/icons-react";
import { ROLES } from "@/constants/roles";

interface StaffBadgeProps {
  role: number;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

/**
 * Staff verification badge shown next to staff member usernames
 * Role levels:
 * - 5: Junior Mod
 * - 6: Senior Mod
 * - 10: Admin
 */
export function StaffBadge({
  role,
  size = 16,
  showLabel = false,
  className = "",
}: StaffBadgeProps) {
  if (role < ROLES.JUNIOR_MOD) {
    return null;
  }

  const getRoleLabel = () => {
    if (role >= ROLES.ADMIN) return "Admin";
    if (role >= ROLES.SENIOR_MOD) return "Senior Mod";
    if (role >= ROLES.JUNIOR_MOD) return "Mod";
    return "Staff";
  };

  const getRoleColor = () => {
    if (role >= ROLES.ADMIN) return "text-red-500";
    if (role >= ROLES.SENIOR_MOD) return "text-purple-500";
    return "text-blue-500";
  };

  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      title={`${getRoleLabel()} - Official be.vocl staff`}
      aria-label={`${getRoleLabel()} - Official be.vocl staff member`}
    >
      <IconShieldCheckFilled size={size} className={getRoleColor()} />
      {showLabel && (
        <span className={`text-xs font-semibold ${getRoleColor()}`}>
          {getRoleLabel()}
        </span>
      )}
    </span>
  );
}

// Re-export isStaff from roles for convenience
export { isStaff } from "@/constants/roles";
