/**
 * Simple in-memory rate limiter.
 * For production with multiple instances, replace with Redis-based solution.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store - cleared on server restart
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of remaining requests in the window */
  remaining: number;
  /** Time in ms until the rate limit resets */
  resetIn: number;
  /** Total limit for the window */
  limit: number;
}

/**
 * Check if a request should be rate limited.
 *
 * @param key - Unique identifier (e.g., "upload:user123" or "report:192.168.1.1")
 * @param config - Rate limit configuration
 * @returns RateLimitResult with allowed status and metadata
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No entry or expired - create new window
  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
      limit: config.maxRequests,
    };
  }

  // Within window - check count
  const resetIn = entry.resetTime - now;

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn,
      limit: config.maxRequests,
    };
  }

  // Increment and allow
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetIn,
    limit: config.maxRequests,
  };
}

/**
 * Create a rate limiter with preset configuration.
 */
export function createRateLimiter(config: RateLimitConfig) {
  return (key: string) => checkRateLimit(key, config);
}

// Preset rate limiters for common use cases
export const rateLimiters = {
  /**
   * File uploads: 50 per hour per user
   */
  upload: createRateLimiter({
    maxRequests: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
  }),

  /**
   * Report creation: 10 per hour per user
   */
  report: createRateLimiter({
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  }),

  /**
   * Message sending: 100 per minute per user
   */
  message: createRateLimiter({
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  }),

  /**
   * Auth emails: 5 per 15 minutes per email
   */
  authEmail: createRateLimiter({
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  }),

  /**
   * API general: 100 per minute per IP
   */
  api: createRateLimiter({
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  }),

  /**
   * Login attempts: 5 per 15 minutes per IP
   */
  login: createRateLimiter({
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  }),
};

/**
 * Get rate limit headers for HTTP response.
 */
export function getRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetIn / 1000).toString(),
  };
}
