import { mongoDb } from './db/client';

type SlidingRateLimitEntry = {
  timestamps: number[];
};

const MAX_IN_MEMORY_ENTRIES = 10_000;
const memoryStore = new Map<string, SlidingRateLimitEntry>();

// Periodic cleanup every 60 seconds to prevent unbounded memory growth in long-running processes
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      // Remove timestamps older than 5 minutes
      entry.timestamps = entry.timestamps.filter((ts) => now - ts < 300_000);
      if (entry.timestamps.length === 0) {
        memoryStore.delete(key);
      }
    }
  }, 60_000);

  if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

/**
 * Sliding window in-memory rate limiter with bounded storage.
 * @param key Unique identifier (IP, user ID, route token)
 * @param limit Max allowed requests within the window
 * @param windowMs Window duration in milliseconds (default: 60,000ms)
 */
export function checkRateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = memoryStore.get(key);
  if (!entry) {
    // Prevent memory exhaustion: evict oldest entry if at capacity
    if (memoryStore.size >= MAX_IN_MEMORY_ENTRIES) {
      const oldestKey = memoryStore.keys().next().value;
      if (oldestKey) memoryStore.delete(oldestKey);
    }
    entry = { timestamps: [] };
    memoryStore.set(key, entry);
  }

  // Filter timestamps within current sliding window
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

  if (entry.timestamps.length >= limit) {
    const oldestInWindow = entry.timestamps[0];
    const resetSeconds = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000));
    return {
      success: false,
      remaining: 0,
      reset: resetSeconds,
    };
  }

  entry.timestamps.push(now);
  const remaining = Math.max(0, limit - entry.timestamps.length);
  const resetSeconds = Math.ceil(windowMs / 1000);

  return {
    success: true,
    remaining,
    reset: resetSeconds,
  };
}

/**
 * Distributed rate limiter backed by MongoDB for multi-instance / serverless environments.
 * Falls back gracefully to in-memory rate limiter if DB is unreachable.
 */
export async function checkDistributedRateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000
): Promise<{ success: boolean; remaining: number; reset: number }> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + windowMs);
    const collection = mongoDb.collection('rate_limits');

    // Atomic findOneAndUpdate with upsert
    const res = await collection.findOneAndUpdate(
      { key },
      {
        $inc: { count: 1 },
        $setOnInsert: { createdAt: now, expiresAt },
      },
      { upsert: true, returnDocument: 'after' }
    );

    const doc = res?.value || res;
    const count = (doc && typeof doc === 'object' && 'count' in doc) ? (doc.count as number) : 1;
    const docExpires = (doc && typeof doc === 'object' && 'expiresAt' in doc && doc.expiresAt instanceof Date)
      ? doc.expiresAt.getTime()
      : expiresAt.getTime();

    const remaining = Math.max(0, limit - count);
    const reset = Math.max(1, Math.ceil((docExpires - now.getTime()) / 1000));

    if (count > limit) {
      return { success: false, remaining: 0, reset };
    }

    return { success: true, remaining, reset };
  } catch {
    // If MongoDB is slow or unreachable, fall back to robust sliding window in-memory limiter
    return checkRateLimit(key, limit, windowMs);
  }
}
