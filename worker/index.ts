// worker/index.ts
import "dotenv/config";

import { Worker } from "bullmq";
import { emitPilotEvidenceTrace } from "@/lib/pilotEvidenceTrace";
import { bullmqConnection, usageFlowQueueName } from "@/lib/bullmq";
import {
  processQueueJob,
  type UsageFlowJobData,
  type UsageFlowJobName,
} from "@/lib/jobs/processQueueJob";
import { recoverLedgerIntents, recoverUnratedRatings } from "@/worker/recoverLedgerWork";
import { recoverBillingWebhooks } from "@/worker/recoverBillingWebhooks";

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
    if (job.name === "PROCESS_LEDGER_EVENT" && "pilotTrace" in job.data && job.data.pilotTrace === true && process.env.PILOT_EVIDENCE_TRACE === "true") {
      emitPilotEvidenceTrace({ stage: "worker_execution", eventId: String("eventId" in job.data ? job.data.eventId : ""), at: new Date().toISOString(), queueEnteredAt: new Date(job.timestamp).toISOString(), jobId: job.id, jobKind: "pilotTraceKind" in job.data ? job.data.pilotTraceKind : undefined });
    }
    if (process.env.PILOT_DIAGNOSTIC_QUIET_WORKER !== "true" || process.env.NODE_ENV === "production") console.log(`Processing job: ${job.name}`, job.data);
    return processQueueJob(job);
  },
  {
    connection: bullmqConnection,
    concurrency: getWorkerConcurrency(),
  }
);

worker.on("completed", (job) => {
  if (process.env.PILOT_DIAGNOSTIC_QUIET_WORKER !== "true" || process.env.NODE_ENV === "production") console.log(`Job completed: ${job.name}`);
});

worker.on("failed", (job, err) => {
  console.error(`Job failed: ${job?.name}`, err);
});

worker.on("error", (err) => {
  console.error("Worker error:", err);
});

let isShuttingDown = false;
let ledgerRecoveryRunning = false;
let ratingRecoveryRunning = false;
let webhookRecoveryRunning = false;
const recoveryTimer = setInterval(() => {
  if (isShuttingDown) return;
  if (!ledgerRecoveryRunning) {
    ledgerRecoveryRunning = true;
    void recoverLedgerIntents().catch((error) => console.error("Ledger recovery scan failed", error)).finally(() => { ledgerRecoveryRunning = false; });
  }
  if (!ratingRecoveryRunning) {
    ratingRecoveryRunning = true;
    void recoverUnratedRatings().catch((error) => console.error("Rating recovery scan failed", error)).finally(() => { ratingRecoveryRunning = false; });
  }
  if (!webhookRecoveryRunning) {
    webhookRecoveryRunning = true;
    void recoverBillingWebhooks().catch((error) => console.error("Webhook recovery scan failed", error)).finally(() => { webhookRecoveryRunning = false; });
  }
}, 1_000);

async function shutdown(signal: string) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  clearInterval(recoveryTimer);
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
ledgerRecoveryRunning = true;
ratingRecoveryRunning = true;
webhookRecoveryRunning = true;
await Promise.all([
  recoverLedgerIntents().catch((error) => console.error("Initial ledger recovery scan failed", error)).finally(() => { ledgerRecoveryRunning = false; }),
  recoverUnratedRatings().catch((error) => console.error("Initial rating recovery scan failed", error)).finally(() => { ratingRecoveryRunning = false; }),
  recoverBillingWebhooks().catch((error) => console.error("Initial webhook recovery scan failed", error)).finally(() => { webhookRecoveryRunning = false; }),
]);

console.log("UsageFlow worker started", {
  queue: usageFlowQueueName,
  concurrency: getWorkerConcurrency(),
});
