/**
 * Username validation rules:
 * - 3-20 characters
 * - Lowercase letters (a-z), numbers (0-9), and underscores (_)
 * - Must start with a letter
 * - No consecutive underscores
 * - Stored as lowercase (case insensitive)
 */
const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,19}$/;

// Exact reserved usernames
export const RESERVED_USERNAMES = [
  "admin",
  "administrator",
  "mod",
  "moderator",
  "support",
  "help",
  "vocl",
  "bevocl",
  "bvocl",
  "be_vocl",
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
  "security",
  "secure",
  "verify",
  "verified",
  "real",
  "authentic",
  "trust",
  "trusted",
  "ceo",
  "founder",
  "owner",
];

// Patterns that should be blocked (usernames containing these)
const BLOCKED_PATTERNS = [
  /bevocl/i,
  /be_vocl/i,
  /bvocl/i,
  /b_vocl/i,
  /vocl_team/i,
  /voclteam/i,
  /vocl_staff/i,
  /voclstaff/i,
  /vocl_admin/i,
  /vocladmin/i,
  /vocl_support/i,
  /voclsupport/i,
  /vocl_security/i,
  /voclsecurity/i,
  /vocl_official/i,
  /voclofficial/i,
  /staff_team/i,
  /staffteam/i,
  /security_team/i,
  /securityteam/i,
  /support_team/i,
  /supportteam/i,
  /official_staff/i,
  /officialstaff/i,
  /official_team/i,
  /officialteam/i,
  /official_support/i,
  /officialsupport/i,
  /real_staff/i,
  /realstaff/i,
  /real_admin/i,
  /realadmin/i,
  /verified_staff/i,
  /verifiedstaff/i,
];

/**
 * Check if username contains blocked patterns that could impersonate staff
 */
function containsBlockedPattern(username: string): boolean {
  const normalized = username.toLowerCase();
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(normalized));
}

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

  if (containsBlockedPattern(normalized)) {
    return { valid: false, error: "This username is not allowed" };
  }

  return { valid: true };
}

/**
 * Validate timezone is a valid IANA timezone name.
 * Uses Intl.supportedValuesOf which returns all valid timezones.
 */
export function isValidTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== "string") {
    return false;
  }

  try {
    // Try to create a DateTimeFormat with the timezone
    // This will throw if the timezone is invalid
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a list of common timezones for UI selection.
 * This is a subset of all valid timezones for better UX.
 */
export const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Madrid",
  "Europe/Amsterdam",
  "Europe/Stockholm",
  "Europe/Moscow",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Perth",
  "Pacific/Auckland",
  "UTC",
];
