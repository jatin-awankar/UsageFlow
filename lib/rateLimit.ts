// lib/rateLimit.ts

import { AppError } from "./errors";
import { redis } from "./redis";

export async function rateLimit(
  identifier: string,
  limit = 100,
  windowSeconds = 60
) {
  const key = `rate:${identifier}`;

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }

  if (count > limit) {
    throw new AppError("Too many requests", 429);
  }
}
