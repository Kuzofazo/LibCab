/**
 * API Rate Limiting Utility
 * A lightweight, in-memory rate limiter to prevent API abuse and brute-force attacks.
 * Note: In a true distributed Edge environment (like Vercel), this memory store 
 * is scoped per-instance. For strict global limits, replace this with a Redis store (e.g., Upstash).
 */

interface RateLimitConfig {
  limit: number;    // Number of requests allowed
  windowMs: number; // Time window in milliseconds
}

interface RateLimitTracker {
  count: number;
  resetTime: number;
}

const Store = new Map<string, RateLimitTracker>();

export function rateLimit(identifier: string, config: RateLimitConfig): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const tracker = Store.get(identifier);

  // Clean up expired entry or generate initial entry
  if (!tracker || tracker.resetTime < now) {
      Store.set(identifier, {
          count: 1,
          resetTime: now + config.windowMs
      });
      return { success: true, limit: config.limit, remaining: config.limit - 1, reset: now + config.windowMs };
  }

  // Increment existing inside window
  tracker.count++;

  if (tracker.count > config.limit) {
      return { 
          success: false, 
          limit: config.limit, 
          remaining: 0, 
          reset: tracker.resetTime 
      };
  }

  return {
      success: true,
      limit: config.limit,
      remaining: config.limit - tracker.count,
      reset: tracker.resetTime
  };
}
