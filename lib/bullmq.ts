// src/lib/bullmq.ts
import { Queue } from "bullmq";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not defined");
}

export const bullmqConnection = {
  url: process.env.REDIS_URL,
};

export const usageFlowQueue = new Queue("usageflow", {
  connection: bullmqConnection,
});
