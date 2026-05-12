import type { NextFunction, Request, Response } from "express";
import { createClient } from "redis";
import { env } from "../config/env";

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitStore = {
  hit(key: string, windowMs: number): Bucket | Promise<Bucket>;
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
type RedisClient = ReturnType<typeof createClient>;

const redisHitScript = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return { current, ttl }
`;

class RedisRateLimitStore implements RateLimitStore {
  private client: RedisClient | null = null;
  private connectPromise: Promise<RedisClient> | null = null;
  private unavailableUntil = 0;

  constructor(
    private readonly url: string,
    private readonly fallback: MemoryRateLimitStore,
    private readonly fallbackAllowed: boolean
  ) {}

  async hit(key: string, windowMs: number) {
    const now = Date.now();

    if (this.fallbackAllowed && now < this.unavailableUntil) {
      return this.fallback.hit(key, windowMs);
    }

    try {
      const client = await this.getClient();
      const result = await client.eval(redisHitScript, {
        keys: [`rate-limit:${key}`],
        arguments: [String(windowMs)]
      });
      const [countValue, ttlValue] = Array.isArray(result) ? result : [1, windowMs];
      const ttlMs = Number(ttlValue);

      return {
        count: Number(countValue),
        resetAt: Date.now() + Math.max(Number.isFinite(ttlMs) ? ttlMs : windowMs, 1)
      };
    } catch (error) {
      this.resetConnection({ destroy: true });

      if (!this.fallbackAllowed) {
        throw error;
      }

      this.unavailableUntil = Date.now() + 30_000;
      console.warn("rate_limit.redis_unavailable_fallback_memory", {
        message: error instanceof Error ? error.message : "unknown"
      });
      return this.fallback.hit(key, windowMs);
    }
  }

  async close() {
    if (!this.client?.isOpen) {
      this.resetConnection();
      return;
    }

    const client = this.client;
    this.resetConnection();
    await client.quit().catch(() => client.destroy());
  }

  private async getClient() {
    if (this.client?.isReady) {
      return this.client;
    }

    if (!this.connectPromise) {
      const client = createClient({ url: this.url });
      client.on("error", (error) => {
        console.warn("rate_limit.redis_error", {
          message: error instanceof Error ? error.message : "unknown"
        });
      });
      this.client = client;
      this.connectPromise = client
        .connect()
        .then(() => client)
        .catch((error) => {
          this.resetConnection({ destroy: true });
          throw error;
        });
    }

    return this.connectPromise;
  }

  private resetConnection(options: { destroy?: boolean } = {}) {
    const client = this.client;
    this.connectPromise = null;
    this.client = null;

    if (options.destroy && client?.isOpen) {
      client.destroy();
    }
  }
}

const redisStore = env.REDIS_URL
  ? new RedisRateLimitStore(env.REDIS_URL, memoryStore, env.NODE_ENV !== "production")
  : null;
const activeStore: RateLimitStore = redisStore ?? memoryStore;

const defaultKeyGenerator = (req: Request) =>
  req.user?.id ?? req.ip ?? req.socket.remoteAddress ?? "unknown";

export function createRateLimit(options: RateLimitOptions) {
  const windowMs = options.windowMs ?? env.RATE_LIMIT_WINDOW_MS;
  const max = options.max ?? env.RATE_LIMIT_MAX;
  const keyGenerator = options.keyGenerator ?? defaultKeyGenerator;

  return async (req: Request, res: Response, next: NextFunction) => {
    const rawKey = keyGenerator(req);
    const key = `${options.namespace}:${rawKey}`;
    let bucket: Bucket;

    try {
      bucket = await activeStore.hit(key, windowMs);
    } catch (error) {
      console.error("rate_limit.store_unavailable", {
        namespace: options.namespace,
        method: req.method,
        path: req.originalUrl,
        message: error instanceof Error ? error.message : "unknown"
      });
      res.status(503).json({
        error: {
          code: "RATE_LIMIT_STORE_UNAVAILABLE",
          message: "Rate limit store unavailable"
        }
      });
      return;
    }

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

export async function closeRateLimitStore() {
  await redisStore?.close();
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
