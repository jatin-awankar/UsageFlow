import { z } from "zod";
import { processAggregation } from "@/worker/processors/aggregateUsage";
import { processInvoice } from "@/worker/processors/generateInvoice";
import { processWebhook } from "@/worker/processors/deliverWebhook";
import { processLedgerEvent } from "@/worker/processors/processLedgerEvent";

export const usageFlowJobNames = [
  "AGGREGATE_USAGE",
  "GENERATE_INVOICE",
  "DELIVER_WEBHOOK",
  "PROCESS_LEDGER_EVENT",
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
  endpointId: z.string().min(1).optional(),
  attempt: z.number().int().min(1).optional(),
});

const processLedgerEventJobSchema = z.object({ eventId: z.string().min(1) });

export type UsageFlowJobData =
  | z.infer<typeof aggregateUsageJobSchema>
  | z.infer<typeof generateInvoiceJobSchema>
  | z.infer<typeof deliverWebhookJobSchema>
  | z.infer<typeof processLedgerEventJobSchema>;

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
      {
        const data = deliverWebhookJobSchema.parse(job.data);
        return processWebhook(data.webhookEventId, data.endpointId, data.attempt);
      }
    case "PROCESS_LEDGER_EVENT":
      return processLedgerEvent(processLedgerEventJobSchema.parse(job.data).eventId);
    default:
      throw new Error(
        `Unknown queue job: ${job.name}${job.id ? ` (${job.id})` : ""}`
      );
  }
}
