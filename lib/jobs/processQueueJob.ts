import { z } from "zod";
import { processAggregation } from "@/worker/processors/aggregateUsage";
import { processInvoice } from "@/worker/processors/generateInvoice";
import { processWebhook } from "@/worker/processors/deliverWebhook";

export const usageFlowJobNames = [
  "AGGREGATE_USAGE",
  "GENERATE_INVOICE",
  "DELIVER_WEBHOOK",
] as const;

export type UsageFlowJobName = (typeof usageFlowJobNames)[number];

const aggregateUsageJobSchema = z.object({
  orgId: z.string().min(1),
  subscriptionId: z.string().min(1),
});

const generateInvoiceJobSchema = z.object({
  subscriptionId: z.string().min(1),
});

const deliverWebhookJobSchema = z.object({
  webhookEventId: z.string().min(1),
});

export type UsageFlowJobData =
  | z.infer<typeof aggregateUsageJobSchema>
  | z.infer<typeof generateInvoiceJobSchema>
  | z.infer<typeof deliverWebhookJobSchema>;

export type QueueJobInput = {
  name: string;
  data: unknown;
  id?: string;
};

export async function processQueueJob(job: QueueJobInput) {
  switch (job.name) {
    case "AGGREGATE_USAGE":
      return processAggregation(aggregateUsageJobSchema.parse(job.data));
    case "GENERATE_INVOICE":
      return processInvoice(generateInvoiceJobSchema.parse(job.data));
    case "DELIVER_WEBHOOK":
      return processWebhook(
        deliverWebhookJobSchema.parse(job.data).webhookEventId
      );
    default:
      throw new Error(
        `Unknown queue job: ${job.name}${job.id ? ` (${job.id})` : ""}`
      );
  }
}
