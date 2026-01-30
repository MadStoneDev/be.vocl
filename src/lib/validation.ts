/**
 * Username validation rules:
 * - 3-20 characters
 * - Lowercase letters (a-z), numbers (0-9), and underscores (_)
 * - Must start with a letter
 * - No consecutive underscores
 * - Stored as lowercase (case insensitive)
 */
const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,19}$/;

export const RESERVED_USERNAMES = [
  "admin",
  "administrator",
  "mod",
  "moderator",
  "support",
  "help",
  "vocl",
  "bevocl",
  "system",
  "official",
  "staff",
  "team",
  "api",
  "www",
  "mail",
  "email",
  "root",
  "null",
  "undefined",
  "settings",
  "feed",
  "profile",
  "login",
  "signup",
  "auth",
  "terms",
  "privacy",
];

export interface UsernameValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate username format (client-side compatible)
 */
export function validateUsernameFormat(username: string): UsernameValidationResult {
  const normalized = username.toLowerCase().trim();

  if (!normalized) {
    return { valid: false, error: "Username is required" };
  }

  if (normalized.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }

  if (normalized.length > 20) {
    return { valid: false, error: "Username must be 20 characters or less" };
  }

  if (!/^[a-z]/.test(normalized)) {
    return { valid: false, error: "Username must start with a letter" };
  }

  if (/__/.test(normalized)) {
    return { valid: false, error: "Username cannot have consecutive underscores" };
  }

  if (!USERNAME_REGEX.test(normalized)) {
    return {
      valid: false,
      error: "Username can only contain lowercase letters, numbers, and underscores",
    };
  }

  if (RESERVED_USERNAMES.includes(normalized)) {
    return { valid: false, error: "This username is reserved" };
  }

  return { valid: true };
}
