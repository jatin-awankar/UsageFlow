"use server";

import { usageFlowQueue } from "@/lib/bullmq";
import prisma from "@/lib/prisma";

export async function createWebhookEvent(
    orgId: string,
    type: string,
    payload: unknown,
) {
    const event = prisma.webhookEvent.create({
        data: {
            orgId,
            type,
            payload: payload as string,
        },
    });

    await usageFlowQueue.add(
        "DELIVER_WEBHOOK",
        { webhookEventId: (await event).id },
        {
            attempts: 5,
            backoff: {
                type: "exponential",
                delay: 5000,
            },
        }
    );

    return event;
}
