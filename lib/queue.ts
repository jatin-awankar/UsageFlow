// src/lib/queue.ts
import { Queue } from "bullmq";
import { bullmqConnection } from "./bullmq";

export const usageQueue = new Queue("usageflow", {
  connection: bullmqConnection,
});
