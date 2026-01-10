// src/lib/redis.ts
import { Redis } from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not defined");
}

/**
 * Redis client
 * Used by:
 * - BullMQ (queues & workers)
 * - Rate limiting
 * - Caching
 */
export const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // REQUIRED for BullMQ
  enableReadyCheck: false,    // REQUIRED for Upstash
});
