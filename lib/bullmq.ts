// src/lib/bullmq.ts
import type { ConnectionOptions } from "bullmq";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not defined");
}

export const bullmqConnection: ConnectionOptions = {
  url: process.env.REDIS_URL,
};
