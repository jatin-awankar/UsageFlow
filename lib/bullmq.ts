// src/lib/bullmq.ts
import { Queue } from "bullmq";

const redisUrl = process.env.REDIS_URL?.trim();

if (!redisUrl) {
  throw new Error("REDIS_URL is not defined");
}

export const usageFlowQueueName =
  process.env.QUEUE_NAME?.trim() || "usageflow";

export const bullmqConnection = {
  url: redisUrl,
};

export const usageFlowQueue = new Queue(usageFlowQueueName, {
  connection: bullmqConnection,
});
