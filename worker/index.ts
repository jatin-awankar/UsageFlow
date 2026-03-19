// worker/index.ts
import "dotenv/config";

import { Worker } from "bullmq";
import { bullmqConnection, usageFlowQueueName } from "@/lib/bullmq";
import {
  processQueueJob,
  type UsageFlowJobData,
  type UsageFlowJobName,
} from "@/lib/jobs/processQueueJob";

const DEFAULT_CONCURRENCY = 5;

function getWorkerConcurrency() {
  const raw = Number.parseInt(process.env.WORKER_CONCURRENCY ?? "", 10);

  if (Number.isNaN(raw) || raw < 1) {
    return DEFAULT_CONCURRENCY;
  }

  return raw;
}

const worker = new Worker<UsageFlowJobData, unknown, UsageFlowJobName>(
  usageFlowQueueName,
  async (job) => {
    console.log(`Processing job: ${job.name}`, job.data);
    return processQueueJob(job);
  },
  {
    connection: bullmqConnection,
    concurrency: getWorkerConcurrency(),
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

let isShuttingDown = false;

async function shutdown(signal: string) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`Received ${signal}, closing worker`);

  try {
    await worker.close();
    console.log("Worker closed cleanly");
    process.exit(0);
  } catch (error) {
    console.error("Failed to close worker cleanly", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

await worker.waitUntilReady();

console.log("UsageFlow worker started", {
  queue: usageFlowQueueName,
  concurrency: getWorkerConcurrency(),
});
