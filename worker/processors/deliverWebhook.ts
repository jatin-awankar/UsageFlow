// worker/processors/deliverWebhook.ts
import axios from "axios";
import { prisma } from "@/lib/prisma";
import { WebhookEventStatus } from "@/generated/prisma/enums";

export async function processWebhook({ webhookEventId }: { webhookEventId: string }) {
  const event = await prisma.webhookEvent.findUnique({
    where: { id: webhookEventId },
    include: { webhookEndpoint: true },
  });

  if (!event) return;

  try {
    const res = await axios.post(event.webhookEndpoint.url, event.payload, {
      timeout: 5000,
    });

    await prisma.webhookDelivery.create({
      data: {
        webhookEventId: event.id,
        status: "SUCCESS" as WebhookEventStatus,
        responseCode: res.status,
      },
    });
  } catch (err) {
    throw err; // BullMQ will retry
  }
}
