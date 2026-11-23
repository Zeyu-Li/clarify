type Window = { count: number; resetAt: number };

type FixedWindowRateLimiterOptions = {
  /** Requests allowed per key in each window. */
  limit: number;
  windowMs: number;
  /** Upper bound on tracked keys, so callers rotating keys can't grow memory without bound. */
  maxKeys?: number;
};

/**
 * In-memory fixed-window rate limiter. State lives in the server process, so each instance (or serverless
 * container) enforces its own limits.
 */
export class FixedWindowRateLimiter {
  private readonly windows = new Map<string, Window>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly maxKeys: number;

  constructor({ limit, windowMs, maxKeys = 10_000 }: FixedWindowRateLimiterOptions) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.maxKeys = maxKeys;
  }

  /** Records a request for `key` and returns whether it is within the limit. */
  tryConsume(key: string, now: number = Date.now()): boolean {
    const current = this.windows.get(key);
    if (current && now < current.resetAt) {
      if (current.count >= this.limit) {
        return false;
      }
      current.count++;
      return true;
    }

    if (!current && this.windows.size >= this.maxKeys) {
      this.pruneExpired(now);
      if (this.windows.size >= this.maxKeys) {
        return false;
      }
    }
    this.windows.set(key, { count: 1, resetAt: now + this.windowMs });
    return true;
  }

  private pruneExpired(now: number): void {
    for (const [key, window] of this.windows) {
      if (now >= window.resetAt) {
        this.windows.delete(key);
      }
    }
  }
}
