/**
 * Error handling utilities for production safety.
 *
 * These utilities ensure that internal error details are not exposed
 * to users in production while still being logged for debugging.
 */

/**
 * Generic error message to show users when something goes wrong.
 * This prevents leaking internal details like stack traces, database errors, etc.
 */
export const GENERIC_ERROR_MESSAGE = "An unexpected error occurred. Please try again.";

/**
 * Patterns that indicate sensitive information in error messages.
 * These patterns help identify errors that should be sanitized.
 */
const SENSITIVE_PATTERNS = [
  // Database/SQL errors
  /postgres/i,
  /sql/i,
  /supabase/i,
  /relation .* does not exist/i,
  /column .* does not exist/i,
  /violates .* constraint/i,
  /duplicate key/i,

  // File system paths
  /\/usr\//i,
  /\/home\//i,
  /\/var\//i,
  /C:\\/i,
  /D:\\/i,

  // Stack traces
  /at\s+\w+\s+\(/i,
  /\.js:\d+:\d+/i,
  /\.ts:\d+:\d+/i,

  // Internal service errors
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  /internal server error/i,

  // API keys/secrets (shouldn't happen but just in case)
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
];

/**
 * Check if an error message contains sensitive information.
 */
function containsSensitiveInfo(message: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Sanitize an error message for production.
 * In development, returns the original message.
 * In production, returns a generic message if the error contains sensitive info.
 *
 * @param error - The error or error message
 * @param fallback - Optional custom fallback message
 * @returns Safe error message for users
 */
export function sanitizeErrorMessage(
  error: unknown,
  fallback: string = GENERIC_ERROR_MESSAGE
): string {
  // In development, show full error details
  if (process.env.NODE_ENV === "development") {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    return fallback;
  }

  // In production, sanitize sensitive information
  let message: string;

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  } else {
    return fallback;
  }

  // Check for sensitive information
  if (containsSensitiveInfo(message)) {
    return fallback;
  }

  // Allow through safe, user-friendly error messages
  // These are messages we've intentionally written for users
  const safePatterns = [
    /^unauthorized$/i,
    /^not found$/i,
    /^invalid/i,
    /^please/i,
    /^you (cannot|can't|must|need)/i,
    /^this (is|cannot|can't)/i,
    /^failed to/i,
    /^unable to/i,
    /^too many/i,
    /already exists/i,
    /not allowed/i,
    /permission denied/i,
  ];

  const isSafeMessage = safePatterns.some((pattern) => pattern.test(message));

  if (isSafeMessage) {
    return message;
  }

  // If we're not sure, use the fallback
  return fallback;
}

/**
 * Log an error with full details for debugging.
 * This should be called before sanitizing the error for the user.
 *
 * @param context - A description of where the error occurred
 * @param error - The error to log
 */
export function logError(context: string, error: unknown): void {
  // Always log full error details for debugging
  console.error(`[${context}]`, error);

  // In production, you might want to send to an error tracking service
  // like Sentry, LogRocket, etc.
  // if (process.env.NODE_ENV === "production" && typeof Sentry !== "undefined") {
  //   Sentry.captureException(error, { extra: { context } });
  // }
}

/**
 * Helper to handle errors in server actions.
 * Logs the full error and returns a sanitized message.
 *
 * @param context - A description of where the error occurred
 * @param error - The error that was caught
 * @param fallback - Optional custom fallback message
 * @returns Object with success: false and sanitized error message
 */
export function handleServerError(
  context: string,
  error: unknown,
  fallback?: string
): { success: false; error: string } {
  logError(context, error);
  return {
    success: false,
    error: sanitizeErrorMessage(error, fallback),
  };
}
