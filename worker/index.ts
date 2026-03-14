// worker/index.ts
import "dotenv/config";

import { Worker } from "bullmq";
import { bullmqConnection } from "@/lib/bullmq";
import {
  processQueueJob,
  type UsageFlowJobData,
  type UsageFlowJobName,
} from "@/lib/jobs/processQueueJob";

console.log("UsageFlow worker started");
const worker = new Worker<UsageFlowJobData, unknown, UsageFlowJobName>(
  "usageflow",
  async (job) => {
    console.log(`Processing job: ${job.name}`, job.data);
    return processQueueJob(job);
  },
  {
    connection: bullmqConnection,
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  console.log(`Job completed: ${job.name}`);
});

worker.on("failed", (job, err) => {
  console.error(`Job failed: ${job?.name}`, err);
});

worker.on("error", (err) => {
  console.error("Worker error:", err);
});
