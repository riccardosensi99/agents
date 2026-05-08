import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + env.RATE_LIMIT_WINDOW_MS
    });
    next();
    return;
  }

  current.count += 1;

  if (current.count > env.RATE_LIMIT_MAX) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  next();
}
