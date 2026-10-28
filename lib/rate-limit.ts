import { mongoDb } from './db/client';
import { logger } from './observability/logger';

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

let rateLimitIndexesPromise: Promise<void> | null = null;

const DISTRIBUTED_TIMEOUT_MS = 2_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Rate-limit store timed out')), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Creates the indexes required by the distributed limiter once per process.
 * The TTL index is required: it prevents the collection from growing forever.
 */
function ensureRateLimitIndexes(): Promise<void> {
  if (!rateLimitIndexesPromise) {
    rateLimitIndexesPromise = (async () => {
      const collection = mongoDb.collection('rate_limits');
      await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      try {
        await collection.createIndex({ key: 1 }, { unique: true });
      } catch {
        // Duplicate keys may exist from older builds. Lookups still work.
      }
    })().catch((error) => {
      // Index creation is best-effort; never disable the limiter because of it.
      rateLimitIndexesPromise = null;
      logger.warn('rate_limit.index_setup_skipped', { error });
    });
  }

  return rateLimitIndexesPromise;
}

/**
 * Distributed fixed-window rate limiter backed by MongoDB for multi-instance /
 * serverless environments. The window is reset atomically once it expires, so
 * keys can never get permanently stuck at the limit.
 *
 * Falls back gracefully to the in-memory limiter if the DB is unreachable.
 */
export async function checkDistributedRateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000
): Promise<{ success: boolean; remaining: number; reset: number }> {
  try {
    const now = new Date();
    const windowExpiresAt = new Date(now.getTime() + windowMs);
    const collection = mongoDb.collection('rate_limits');

    const isExpired = {
      $or: [
        { $eq: [{ $type: '$expiresAt' }, 'missing'] },
        { $lte: ['$expiresAt', now] },
      ],
    };

    // Single atomic pipeline update: reset an expired window, otherwise increment.
    // Bounded by a timeout so a slow/unreachable DB cannot stall the request.
    const res = await withTimeout(
      (async () => {
        await ensureRateLimitIndexes();
        return collection.findOneAndUpdate(
          { key },
          [
            {
              $set: {
                count: {
                  $cond: [isExpired, 1, { $add: [{ $ifNull: ['$count', 0] }, 1] }],
                },
                createdAt: { $ifNull: ['$createdAt', now] },
                expiresAt: {
                  $cond: [isExpired, windowExpiresAt, '$expiresAt'],
                },
              },
            },
          ],
          { upsert: true, returnDocument: 'after' }
        );
      })(),
      DISTRIBUTED_TIMEOUT_MS
    );

    // MongoDB driver v6+ returns the document directly; older versions wrap it.
    const doc = (res as { value?: Record<string, unknown> } | null)?.value ?? res;
    const count =
      doc && typeof doc === 'object' && typeof (doc as { count?: unknown }).count === 'number'
        ? (doc as { count: number }).count
        : 1;
    const docExpires =
      doc &&
      typeof doc === 'object' &&
      (doc as { expiresAt?: unknown }).expiresAt instanceof Date
        ? ((doc as { expiresAt: Date }).expiresAt.getTime())
        : windowExpiresAt.getTime();

    const remaining = Math.max(0, limit - count);
    const reset = Math.max(1, Math.ceil((docExpires - now.getTime()) / 1000));

    return { success: count <= limit, remaining, reset };
  } catch {
    // If MongoDB is slow or unreachable, fall back to the in-memory limiter.
    return checkRateLimit(key, limit, windowMs);
  }
}
