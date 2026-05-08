import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitStore = {
  hit(key: string, windowMs: number): Bucket;
};

type RateLimitOptions = {
  namespace: string;
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: Request) => string;
};

class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, Bucket>();
  private lastPruneAt = Date.now();

  hit(key: string, windowMs: number) {
    const now = Date.now();

    if (now - this.lastPruneAt > windowMs) {
      this.prune(now);
    }

    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      const fresh = {
        count: 1,
        resetAt: now + windowMs
      };
      this.buckets.set(key, fresh);
      return fresh;
    }

    current.count += 1;
    return current;
  }

  private prune(now: number) {
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }

    this.lastPruneAt = now;
  }
}

const memoryStore = new MemoryRateLimitStore();

const defaultKeyGenerator = (req: Request) =>
  req.user?.id ?? req.ip ?? req.socket.remoteAddress ?? "unknown";

export function createRateLimit(options: RateLimitOptions) {
  const windowMs = options.windowMs ?? env.RATE_LIMIT_WINDOW_MS;
  const max = options.max ?? env.RATE_LIMIT_MAX;
  const keyGenerator = options.keyGenerator ?? defaultKeyGenerator;

  return (req: Request, res: Response, next: NextFunction) => {
    const rawKey = keyGenerator(req);
    const key = `${options.namespace}:${rawKey}`;
    const bucket = memoryStore.hit(key, windowMs);
    const remaining = Math.max(max - bucket.count, 0);
    const retryAfterSeconds = Math.max(Math.ceil((bucket.resetAt - Date.now()) / 1000), 1);

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(bucket.resetAt));

    if (bucket.count > max) {
      console.warn("rate_limit.exceeded", {
        namespace: options.namespace,
        method: req.method,
        path: req.originalUrl,
        keyType: req.user?.id ? "user" : "network",
        max,
        windowMs
      });

      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests"
        }
      });
      return;
    }

    next();
  };
}

export const generalRateLimit = createRateLimit({
  namespace: "api"
});

export const authRateLimit = createRateLimit({
  namespace: "auth",
  max: Math.min(env.RATE_LIMIT_MAX, 20)
});

export const taskRunRateLimit = createRateLimit({
  namespace: "task-run",
  max: Math.min(env.RATE_LIMIT_MAX, 30)
});

export const taskMutationRateLimit = createRateLimit({
  namespace: "task-mutation",
  max: Math.min(env.RATE_LIMIT_MAX, 60)
});
