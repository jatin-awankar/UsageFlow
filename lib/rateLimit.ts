// lib/rateLimit.ts

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
    return { success: false, error: "Too many requests", status: 429 }
  }
}
