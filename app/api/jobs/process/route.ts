import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { Worker } from "bullmq";
import { bullmqConnection, usageFlowQueueName } from "@/lib/bullmq";
import {
  processQueueJob,
  type UsageFlowJobData,
  type UsageFlowJobName,
} from "@/lib/jobs/processQueueJob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_BATCH_SIZE = 10;

function getBatchSize() {
  const raw = Number.parseInt(process.env.CRON_JOB_BATCH_SIZE ?? "", 10);

  if (Number.isNaN(raw) || raw < 1) {
    return DEFAULT_BATCH_SIZE;
  }

  return raw;
}

async function processQueuedJobs() {
  try {
    const worker = new Worker<UsageFlowJobData, unknown, UsageFlowJobName>(
      usageFlowQueueName,
      async (job) => {
        console.log(`QStash processing job: ${job.name}`, job.data);
        return processQueueJob(job);
      },
      {
        autorun: false,
        connection: bullmqConnection,
        concurrency: 1,
        name: "vercel-cron",
      }
    );

    let attempted = 0;
    let completed = 0;
    let failed = 0;

    worker.on("completed", () => {
      completed += 1;
    });

    worker.on("failed", () => {
      failed += 1;
    });

    try {
      await worker.waitUntilReady();
      await worker.startStalledCheckTimer();

      const batchSize = getBatchSize();

      for (let index = 0; index < batchSize; index += 1) {
        const token = `cron:${Date.now()}:${index}`;
        const job = await worker.getNextJob(token, { block: false });

        if (!job) {
          break;
        }

        attempted += 1;
        await worker.processJob(job, token);
      }

      console.log("Job drain finished", { attempted, completed, failed });

      return Response.json({
        success: true,
        attempted,
        completed,
        failed,
      });
    } finally {
      await worker.close();
    }
  } catch (error) {
    console.error("QStash job drain failed", error);

    return Response.json(
      { success: false, error: "Failed to process queued jobs" },
      { status: 500 }
    );
  }
}

export const POST = verifySignatureAppRouter(processQueuedJobs, {
  clockTolerance: 5,
});
