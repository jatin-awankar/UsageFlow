import { Worker } from "bullmq";
import { bullmqConnection } from "@/lib/bullmq";
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

export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const worker = new Worker<UsageFlowJobData, unknown, UsageFlowJobName>(
      "usageflow",
      async (job) => {
        console.log(`Cron processing job: ${job.name}`, job.data);
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

      console.log("Cron job finished", { attempted, completed, failed });

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
    console.error("Cron job failed", error);

    return Response.json(
      { success: false, error: "Failed to process queued jobs" },
      { status: 500 }
    );
  }
}
