// worker/index.ts
import "dotenv/config";

import { Worker } from "bullmq";
import { bullmqConnection } from "@/lib/bullmq";
import { processAggregation } from "./processors/aggregateUsage";
import { processInvoice } from "./processors/generateInvoice";
import { processWebhook } from "./processors/deliverWebhook";

console.log("🚀 UsageFlow worker started");

new Worker(
  "usageflow",
  async (job) => {
    console.log(`📦 Processing job: ${job.name}`, job.data);

    switch (job.name) {
      case "AGGREGATE_USAGE":
        return processAggregation(job.data);
      case "GENERATE_INVOICE":
        return processInvoice(job.data);
      case "DELIVER_WEBHOOK":
        return processWebhook(job.data);
      default:
        console.warn("⚠️ Unknown job:", job.name);
    }
  },
  {
    connection: bullmqConnection,
    concurrency: 5,
  }
);
