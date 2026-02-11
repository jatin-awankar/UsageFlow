// worker/index.ts
import "dotenv/config";

import { Worker } from "bullmq";
import { bullmqConnection } from "@/lib/bullmq";
import { processAggregation } from "./processors/aggregateUsage";
import { processInvoice } from "./processors/generateInvoice";
import { processWebhook } from "./processors/deliverWebhook";

console.log("UsageFlow worker started");
const worker = new Worker(
  "usageflow",
  async (job) => {
    try {
      console.log(`Processing job: ${job.name}`, job.data);

      switch (job.name) {
        case "AGGREGATE_USAGE":
          return processAggregation(job.data);
        case "GENERATE_INVOICE":
          return processInvoice(job.data);
        case "DELIVER_WEBHOOK":
          return processWebhook(job.data.webhookEventId);
        default:
          console.warn("Unknown job:", job.name);
      }
    } catch (err) {
      console.error("Job failed:", job.name, err);
      return { success: false, error: err }; // IMPORTANT: let BullMQ handle retries
    }
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