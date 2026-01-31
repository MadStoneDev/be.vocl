/**
 * Role hierarchy for be.vocl
 * Higher numbers = more permissions
 */

export const ROLES = {
  USER: 0,
  TRUSTED_USER: 1,
  JUNIOR_MOD: 3,
  MODERATOR: 5,
  SENIOR_MOD: 7,
  ADMIN: 10,
} as const;

export type RoleLevel = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_NAMES: Record<RoleLevel, string> = {
  [ROLES.USER]: "User",
  [ROLES.TRUSTED_USER]: "Trusted User",
  [ROLES.JUNIOR_MOD]: "Junior Moderator",
  [ROLES.MODERATOR]: "Moderator",
  [ROLES.SENIOR_MOD]: "Senior Moderator",
  [ROLES.ADMIN]: "Administrator",
};

export const ROLE_COLORS: Record<RoleLevel, string> = {
  [ROLES.USER]: "text-gray-500",
  [ROLES.TRUSTED_USER]: "text-blue-500",
  [ROLES.JUNIOR_MOD]: "text-green-500",
  [ROLES.MODERATOR]: "text-yellow-500",
  [ROLES.SENIOR_MOD]: "text-orange-500",
  [ROLES.ADMIN]: "text-red-500",
};

/**
 * Check if a role can moderate (Junior Mod or higher)
 */
export function canModerate(role: number): boolean {
  return role >= ROLES.JUNIOR_MOD;
}

/**
 * Check if a role is staff (Junior Mod or higher)
 */
export function isStaff(role: number): boolean {
  return role >= ROLES.JUNIOR_MOD;
}

/**
 * Check if a role can access admin dashboard (Moderator or higher)
 */
export function canAccessAdmin(role: number): boolean {
  return role >= ROLES.MODERATOR;
}

/**
 * Check if a role can manage other users' roles
 * Only Admins can change roles
 */
export function canManageRoles(role: number): boolean {
  return role >= ROLES.ADMIN;
}

/**
 * Check if a role can be assigned by the given assigner role
 * Admins can assign any role below their own
 */
export function canAssignRole(assignerRole: number, targetRole: number): boolean {
  return assignerRole >= ROLES.ADMIN && targetRole < assignerRole;
}

/**
 * Check if a role can moderate a user with the given role
 * Can only moderate users with lower roles
 */
export function canModerateUser(moderatorRole: number, targetRole: number): boolean {
  return canModerate(moderatorRole) && moderatorRole > targetRole;
}

/**
 * Get the next escalation level for a role
 * Returns null if already at max or can't escalate
 */
export function getEscalationLevel(currentRole: number): RoleLevel | null {
  if (currentRole >= ROLES.SENIOR_MOD) return null; // Senior mods escalate to admin
  if (currentRole >= ROLES.MODERATOR) return ROLES.SENIOR_MOD;
  if (currentRole >= ROLES.JUNIOR_MOD) return ROLES.MODERATOR;
  return null; // Users can't escalate
}

/**
 * Get all roles that can handle an escalation from the given role
 */
export function getEscalationTargets(fromRole: number): RoleLevel[] {
  const targets: RoleLevel[] = [];
  if (fromRole < ROLES.MODERATOR) targets.push(ROLES.MODERATOR);
  if (fromRole < ROLES.SENIOR_MOD) targets.push(ROLES.SENIOR_MOD);
  if (fromRole < ROLES.ADMIN) targets.push(ROLES.ADMIN);
  return targets;
}

/**
 * Number of posts required to auto-promote to Trusted User
 */
export const TRUSTED_USER_POST_THRESHOLD = 10;

/**
 * Get role level from a number, clamped to valid values
 */
export function getRoleLevel(role: number): RoleLevel {
  if (role >= ROLES.ADMIN) return ROLES.ADMIN;
  if (role >= ROLES.SENIOR_MOD) return ROLES.SENIOR_MOD;
  if (role >= ROLES.MODERATOR) return ROLES.MODERATOR;
  if (role >= ROLES.JUNIOR_MOD) return ROLES.JUNIOR_MOD;
  if (role >= ROLES.TRUSTED_USER) return ROLES.TRUSTED_USER;
  return ROLES.USER;
}

/**
 * Get all role levels as an array for dropdowns
 */
export function getAllRoles(): { value: RoleLevel; label: string }[] {
  return [
    { value: ROLES.USER, label: ROLE_NAMES[ROLES.USER] },
    { value: ROLES.TRUSTED_USER, label: ROLE_NAMES[ROLES.TRUSTED_USER] },
    { value: ROLES.JUNIOR_MOD, label: ROLE_NAMES[ROLES.JUNIOR_MOD] },
    { value: ROLES.MODERATOR, label: ROLE_NAMES[ROLES.MODERATOR] },
    { value: ROLES.SENIOR_MOD, label: ROLE_NAMES[ROLES.SENIOR_MOD] },
    { value: ROLES.ADMIN, label: ROLE_NAMES[ROLES.ADMIN] },
  ];
}

/**
 * Get roles that can be assigned by a given role
 */
export function getAssignableRoles(assignerRole: number): { value: RoleLevel; label: string }[] {
  if (!canManageRoles(assignerRole)) return [];
  return getAllRoles().filter((r) => r.value < assignerRole);
}
