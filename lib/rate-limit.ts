type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

/**
 * In-memory sliding/fixed window rate limiter for Next.js route handlers.
 * @param key Unique identifier (IP address, user ID, etc.)
 * @param limit Max allowed requests within the window
 * @param windowMs Window duration in milliseconds (default: 60,000ms = 1 minute)
 */
export function checkRateLimit(key: string, limit = 60, windowMs = 60_000): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, reset: Math.ceil(windowMs / 1000) };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, reset: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { success: true, remaining: limit - entry.count, reset: Math.ceil((entry.resetAt - now) / 1000) };
}
